import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeSloMetrics } from "./slo-metrics";
import type { BookData, PageData } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SnapshotConfig {
  source: string;
  window: string;
  sampleSize: number;
}

export interface SnapshotResult {
  saved: boolean;
  totalBooks: number;
  totalPages: number;
  bookReadableRate: number;
  bookHardFailedRate: number;
  imageP95Ms: number;
  pageImageFailureRate: number;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers (testable)                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the Firestore document payload from computed metrics.
 * Pure function — no side effects.
 */
export function buildSnapshotDoc(
  metrics: ReturnType<typeof computeSloMetrics>,
  config: SnapshotConfig,
  nowMs: number,
) {
  return {
    ...metrics,
    source: config.source,
    createdAtMs: nowMs,
    createdBy: "system",
    bookCount: metrics.totalBooks,
    pageCount: metrics.totalPages,
    sampleSize: config.sampleSize,
    sampleUnit: "books",
    window: config.window,
  };
}

/* ------------------------------------------------------------------ */
/*  Shared snapshot runner (side-effectful)                             */
/* ------------------------------------------------------------------ */

/**
 * Fetch recent books, compute SLO metrics, and save a snapshot document
 * to adminMetrics/sloSnapshots/items.
 *
 * Used by both daily and weekly scheduled functions.
 */
export async function saveSloSnapshot(config: SnapshotConfig): Promise<SnapshotResult> {
  const db = getFirestore();

  logger.info(`Starting ${config.window} SLO snapshot`, {
    source: config.source,
    sampleSize: config.sampleSize,
  });

  // 1. Fetch recent books
  const booksSnap = await db
    .collection("books")
    .orderBy("createdAt", "desc")
    .limit(config.sampleSize)
    .get();

  if (booksSnap.empty) {
    logger.info("No books found, skipping snapshot");
    return { saved: false, totalBooks: 0, totalPages: 0, bookReadableRate: 0, bookHardFailedRate: 0, imageP95Ms: 0, pageImageFailureRate: 0 };
  }

  const books = booksSnap.docs.map((d) => ({
    id: d.id,
    status: (d.data() as BookData).status,
  }));

  // 2. Batch-load pages for all books
  const pagesMap = new Map<string, Array<Pick<PageData, "status" | "imageDurationMs" | "imageTimeoutCount" | "imageFallbackUsed" | "imageFailureReason" | "regenerationAttemptCount">>>();

  for (const book of books) {
    const pagesSnap = await db
      .collection("books")
      .doc(book.id)
      .collection("pages")
      .get();
    pagesMap.set(
      book.id,
      pagesSnap.docs.map((d) => {
        const data = d.data() as PageData;
        return {
          status: data.status,
          imageDurationMs: data.imageDurationMs,
          imageTimeoutCount: data.imageTimeoutCount,
          imageFallbackUsed: data.imageFallbackUsed,
          imageFailureReason: data.imageFailureReason,
          regenerationAttemptCount: data.regenerationAttemptCount,
        };
      }),
    );
  }

  // 3. Compute metrics
  const metrics = computeSloMetrics(books, pagesMap);

  // 4. Save snapshot
  const doc = buildSnapshotDoc(metrics, config, Date.now());
  await db
    .collection("adminMetrics")
    .doc("sloSnapshots")
    .collection("items")
    .add({
      ...doc,
      createdAt: FieldValue.serverTimestamp(),
    });

  logger.info(`${config.window} SLO snapshot saved`, {
    source: config.source,
    totalBooks: metrics.totalBooks,
    totalPages: metrics.totalPages,
    bookReadableRate: metrics.bookReadableRate.toFixed(1),
    bookHardFailedRate: metrics.bookHardFailedRate.toFixed(1),
    imageP95Ms: Math.round(metrics.imageP95Ms),
    pageImageFailureRate: metrics.pageImageFailureRate.toFixed(1),
  });

  return {
    saved: true,
    totalBooks: metrics.totalBooks,
    totalPages: metrics.totalPages,
    bookReadableRate: metrics.bookReadableRate,
    bookHardFailedRate: metrics.bookHardFailedRate,
    imageP95Ms: metrics.imageP95Ms,
    pageImageFailureRate: metrics.pageImageFailureRate,
  };
}
