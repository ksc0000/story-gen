import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeSloMetrics } from "./lib/slo-metrics";
import type { BookData, PageData } from "./lib/types";

const SAMPLE_SIZE = 200;

export const saveDailySloSnapshot = onSchedule(
  { schedule: "0 18 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" },
  // 18:00 UTC = 03:00 JST
  async () => {
    const db = getFirestore();

    logger.info("Starting daily SLO snapshot", { sampleSize: SAMPLE_SIZE });

    // 1. Fetch recent books
    const booksSnap = await db
      .collection("books")
      .orderBy("createdAt", "desc")
      .limit(SAMPLE_SIZE)
      .get();

    if (booksSnap.empty) {
      logger.info("No books found, skipping snapshot");
      return;
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
    await db
      .collection("adminMetrics")
      .doc("sloSnapshots")
      .collection("items")
      .add({
        ...metrics,
        source: "scheduled-daily-slo",
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        createdBy: "system",
        bookCount: metrics.totalBooks,
        pageCount: metrics.totalPages,
        sampleSize: SAMPLE_SIZE,
        sampleUnit: "books",
        window: "daily",
      });

    logger.info("Daily SLO snapshot saved", {
      totalBooks: metrics.totalBooks,
      totalPages: metrics.totalPages,
      bookReadableRate: metrics.bookReadableRate.toFixed(1),
      bookHardFailedRate: metrics.bookHardFailedRate.toFixed(1),
      imageP95Ms: Math.round(metrics.imageP95Ms),
      pageImageFailureRate: metrics.pageImageFailureRate.toFixed(1),
    });
  },
);
