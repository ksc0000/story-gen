import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
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
 * Build a deterministic snapshot key for idempotent writes.
 * Uses JST (UTC+9) date to derive the key.
 *
 * - daily  → "daily-2026-05-07"
 * - weekly → "weekly-2026-W19"
 */
export function buildSnapshotKey(window: string, nowMs: number): string {
  // JST = UTC + 9h
  const jstDate = new Date(nowMs + 9 * 60 * 60 * 1000);
  const yyyy = jstDate.getUTCFullYear();
  const mm = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jstDate.getUTCDate()).padStart(2, "0");

  if (window === "weekly") {
    const { year: isoYear, week } = getISOYearWeek(jstDate);
    return `weekly-${isoYear}-W${String(week).padStart(2, "0")}`;
  }
  return `daily-${yyyy}-${mm}-${dd}`;
}

/**
 * Calculate ISO 8601 week number and week-year from a Date (interpreted as UTC).
 */
function getISOYearWeek(d: Date): { year: number; week: number } {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: isoYear, week };
}

/** 集計ウィンドウの長さ（ms）。ここに無い window は「全期間」扱い。 */
const WINDOW_DURATION_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Resolve the inclusive start of the aggregation window.
 *
 * Returns `null` for an unknown window, which means "no time filter"
 * (the historical behaviour, kept for ad-hoc/manual snapshots).
 *
 * NOTE: これが無いと daily も weekly も「直近 sampleSize 冊」を見るだけになり、
 * 毎日まったく同じ値が保存されてトレンド／リグレッション検知が機能しない。
 */
export function resolveWindowStartMs(
  window: string,
  nowMs: number,
): number | null {
  const durationMs = WINDOW_DURATION_MS[window];
  return durationMs === undefined ? null : nowMs - durationMs;
}

/**
 * Build the Firestore document payload from computed metrics.
 * Pure function — no side effects.
 * Does NOT include createdAtMs/updatedAtMs — use buildSnapshotWritePayload for that.
 */
export function buildSnapshotDoc(
  metrics: ReturnType<typeof computeSloMetrics>,
  config: SnapshotConfig,
  nowMs: number,
) {
  const snapshotKey = buildSnapshotKey(config.window, nowMs);
  const windowStartMs = resolveWindowStartMs(config.window, nowMs);
  return {
    ...metrics,
    snapshotKey,
    source: config.source,
    createdBy: "system",
    bookCount: metrics.totalBooks,
    pageCount: metrics.totalPages,
    sampleSize: config.sampleSize,
    sampleUnit: "books",
    window: config.window,
    // 集計対象期間（null = 全期間）。トレンド表示時にどの範囲の値かを判別するため。
    windowStartMs,
    windowEndMs: nowMs,
  };
}

/**
 * Build the final write payload with correct timestamp semantics.
 * - New doc: sets both createdAtMs and updatedAtMs to nowMs.
 * - Existing doc: preserves existing createdAtMs, updates updatedAtMs.
 * Pure function — no side effects.
 */
export function buildSnapshotWritePayload(
  doc: ReturnType<typeof buildSnapshotDoc>,
  nowMs: number,
  existingCreatedAtMs: number | undefined,
) {
  return {
    ...doc,
    createdAtMs: existingCreatedAtMs ?? nowMs,
    updatedAtMs: nowMs,
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
export async function saveSloSnapshot(
  config: SnapshotConfig,
): Promise<SnapshotResult> {
  const db = getFirestore();
  const nowMs = Date.now();

  logger.info(`Starting ${config.window} SLO snapshot`, {
    source: config.source,
    sampleSize: config.sampleSize,
  });

  // 1. Fetch books created inside the aggregation window.
  //    Inequality + orderBy on the same field → single-field index is enough.
  const windowStartMs = resolveWindowStartMs(config.window, nowMs);
  let booksQuery: FirebaseFirestore.Query = db
    .collection("books")
    .orderBy("createdAt", "desc");
  if (windowStartMs !== null) {
    booksQuery = booksQuery.where(
      "createdAt",
      ">=",
      Timestamp.fromMillis(windowStartMs),
    );
  }
  const booksSnap = await booksQuery.limit(config.sampleSize).get();

  if (booksSnap.empty) {
    logger.info("No books in window, skipping snapshot", {
      window: config.window,
      windowStartMs,
    });
    return {
      saved: false,
      totalBooks: 0,
      totalPages: 0,
      bookReadableRate: 0,
      bookHardFailedRate: 0,
      imageP95Ms: 0,
      pageImageFailureRate: 0,
    };
  }

  const books = booksSnap.docs.map((d) => {
    const data = d.data() as BookData;
    return {
      id: d.id,
      status: data.status,
      hasCoverPage: data.hasCoverPage,
      coverStatus: data.coverStatus,
      coverImageModelProfile: data.coverImageModelProfile,
    };
  });

  // 2. Batch-load pages for all books concurrently
  const pagesMap = new Map<
    string,
    Array<
      Pick<
        PageData,
        | "status"
        | "imageModel"
        | "imageModelProfile"
        | "replicateModel"
        | "imageQualityTier"
        | "imageDurationMs"
        | "imageTimeoutCount"
        | "imageFallbackUsed"
        | "imageFailureReason"
        | "regenerationAttemptCount"
      >
    >
  >();

  const chunkSize = 10;
  for (let i = 0; i < books.length; i += chunkSize) {
    const chunk = books.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (book) => {
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
              imageModel: data.imageModel,
              imageModelProfile: data.imageModelProfile,
              replicateModel: data.replicateModel,
              imageQualityTier: data.imageQualityTier,
              imageDurationMs: data.imageDurationMs,
              imageTimeoutCount: data.imageTimeoutCount,
              imageFallbackUsed: data.imageFallbackUsed,
              imageFailureReason: data.imageFailureReason,
              regenerationAttemptCount: data.regenerationAttemptCount,
            };
          }),
        );
      }),
    );
  }

  // 3. Compute metrics
  const metrics = computeSloMetrics(books, pagesMap);

  // 4. Save snapshot (idempotent: deterministic doc ID via snapshotKey)
  const doc = buildSnapshotDoc(metrics, config, nowMs);
  const itemsRef = db
    .collection("adminMetrics")
    .doc("sloSnapshots")
    .collection("items");
  const docRef = itemsRef.doc(doc.snapshotKey);

  // Preserve createdAt/createdAtMs on re-execution (at-least-once)
  const existingSnap = await docRef.get();
  const existingCreatedAtMs = existingSnap.exists
    ? ((existingSnap.data() as Record<string, unknown>).createdAtMs as
        | number
        | undefined)
    : undefined;
  const isNew = !existingSnap.exists;

  const payload = buildSnapshotWritePayload(doc, nowMs, existingCreatedAtMs);
  await docRef.set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );

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
