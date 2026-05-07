import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { deriveBookMetrics } from "./regenerate-page-image";
import {
  DEFAULT_STALE_CONFIG,
  findStaleBooks,
  findStalePages,
  buildStalePagePatch,
} from "./lib/stale-detection";
import type { StaleBookCandidate, StalePageCandidate, StaleCleanupSummary } from "./lib/stale-detection";
import type { BookData, PageData } from "./lib/types";

export const cleanupStaleGeneration = onSchedule(
  { schedule: "30 3 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" },
  // 毎日 03:30 JST
  async () => {
    const db = getFirestore();
    const nowMs = Date.now();
    const config = DEFAULT_STALE_CONFIG;

    logger.info("Starting stale generation cleanup", { config });

    // ------------------------------------------------------------------
    // 1. Find stale "generating" books
    // ------------------------------------------------------------------
    const booksSnap = await db
      .collection("books")
      .where("status", "==", "generating")
      .limit(config.maxBooks)
      .get();

    const bookCandidates: StaleBookCandidate[] = booksSnap.docs.map((d) => {
      const data = d.data() as BookData;
      return {
        id: d.id,
        status: data.status,
        updatedAtMs: data.updatedAtMs,
      };
    });

    const staleBooks = findStaleBooks(bookCandidates, nowMs, config);

    // ------------------------------------------------------------------
    // 2. Find stale "generating" pages across stale books
    // ------------------------------------------------------------------
    const allStalePages: StalePageCandidate[] = [];

    for (const book of staleBooks) {
      const pagesSnap = await db
        .collection("books")
        .doc(book.id)
        .collection("pages")
        .where("status", "==", "generating")
        .get();

      for (const pageDoc of pagesSnap.docs) {
        const data = pageDoc.data() as PageData;
        allStalePages.push({
          id: pageDoc.id,
          bookId: book.id,
          pageNumber: data.pageNumber,
          status: data.status,
          imageGenerationStartedAtMs: data.imageGenerationStartedAtMs,
          imageRegenerationStartedAtMs: data.imageRegenerationStartedAtMs,
        });
      }
    }

    const stalePages = findStalePages(allStalePages, nowMs, config);

    // ------------------------------------------------------------------
    // 3. Fix stale pages → image_failed
    // ------------------------------------------------------------------
    const pagePatch = buildStalePagePatch(nowMs);
    let updatedPages = 0;

    for (const page of stalePages) {
      try {
        await db
          .collection("books")
          .doc(page.bookId)
          .collection("pages")
          .doc(page.id)
          .update({
            ...pagePatch,
            lastStaleCleanupAt: FieldValue.serverTimestamp(),
          });
        updatedPages++;
        logger.info("Fixed stale page", {
          bookId: page.bookId,
          pageId: page.id,
          pageNumber: page.pageNumber,
        });
      } catch (err) {
        logger.error("Failed to fix stale page", {
          bookId: page.bookId,
          pageId: page.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ------------------------------------------------------------------
    // 4. Recalculate book metrics for each stale book
    // ------------------------------------------------------------------
    let updatedBooks = 0;
    let skippedBooks = 0;

    for (const book of staleBooks) {
      try {
        const bookRef = db.collection("books").doc(book.id);
        const allPagesSnap = await bookRef.collection("pages").get();
        const pages = allPagesSnap.docs.map((d) => d.data() as PageData);
        const metrics = deriveBookMetrics(pages);

        await bookRef.update({
          status: metrics.bookStatus,
          imageSuccessCount: metrics.imageSuccessCount,
          imageFailureCount: metrics.imageFailureCount,
          totalImageCount: metrics.totalImageCount,
          failedPageNumbers: metrics.failedPageNumbers,
          generationReliabilityStatus: metrics.generationReliabilityStatus,
          staleCleanupApplied: true,
          lastStaleCleanupAt: FieldValue.serverTimestamp(),
          lastStaleCleanupAtMs: nowMs,
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtMs: nowMs,
        });

        updatedBooks++;
        logger.info("Recalculated stale book metrics", {
          bookId: book.id,
          newStatus: metrics.bookStatus,
          imageSuccessCount: metrics.imageSuccessCount,
          imageFailureCount: metrics.imageFailureCount,
        });
      } catch (err) {
        skippedBooks++;
        logger.error("Failed to recalculate stale book metrics", {
          bookId: book.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ------------------------------------------------------------------
    // 5. Save cleanup summary
    // ------------------------------------------------------------------
    const summary: StaleCleanupSummary = {
      checkedBooks: bookCandidates.length,
      updatedBooks,
      updatedPages,
      skippedBooks,
    };

    await db.collection("adminMetrics").doc("staleCleanup").set(
      {
        lastRunAt: FieldValue.serverTimestamp(),
        lastRunAtMs: nowMs,
        lastSummary: summary,
      },
      { merge: true },
    );

    logger.info("Stale generation cleanup complete", summary);
  },
);
