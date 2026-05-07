import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { deriveBookMetrics } from "./regenerate-page-image";
import {
  DEFAULT_STALE_CONFIG,
  findStalePages,
  buildStalePagePatch,
  extractBookIdFromPagePath,
  buildCleanupRunKey,
} from "./lib/stale-detection";
import type { StalePageCandidate, StaleCleanupSummary } from "./lib/stale-detection";
import type { PageData } from "./lib/types";

export const cleanupStaleGeneration = onSchedule(
  { schedule: "30 3 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" },
  // 毎日 03:30 JST
  async () => {
    const db = getFirestore();
    const nowMs = Date.now();
    const config = DEFAULT_STALE_CONFIG;

    logger.info("Starting stale generation cleanup", { config });

    // ------------------------------------------------------------------
    // 1. Collection group query: find all "generating" pages across books
    // ------------------------------------------------------------------
    const pagesSnap = await db
      .collectionGroup("pages")
      .where("status", "==", "generating")
      .limit(config.maxPages)
      .get();

    const pageCandidates: StalePageCandidate[] = [];
    for (const pageDoc of pagesSnap.docs) {
      const bookId = extractBookIdFromPagePath(pageDoc.ref.path);
      if (!bookId) {
        logger.warn("Could not extract bookId from page path", { path: pageDoc.ref.path });
        continue;
      }
      const data = pageDoc.data() as PageData;
      pageCandidates.push({
        id: pageDoc.id,
        bookId,
        pageNumber: data.pageNumber,
        status: data.status,
        imageGenerationStartedAtMs: data.imageGenerationStartedAtMs,
        imageRegenerationStartedAtMs: data.imageRegenerationStartedAtMs,
      });
    }

    const stalePages = findStalePages(pageCandidates, nowMs, config);

    logger.info("Stale page detection complete", {
      checkedPages: pageCandidates.length,
      stalePages: stalePages.length,
    });

    // ------------------------------------------------------------------
    // 2. Fix stale pages → image_failed
    // ------------------------------------------------------------------
    const pagePatch = buildStalePagePatch(nowMs);
    let updatedPages = 0;
    let skippedPages = 0;
    const affectedBookIds = new Set<string>();

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
        affectedBookIds.add(page.bookId);
        logger.info("Fixed stale page", {
          bookId: page.bookId,
          pageId: page.id,
          pageNumber: page.pageNumber,
        });
      } catch (err) {
        skippedPages++;
        logger.error("Failed to fix stale page", {
          bookId: page.bookId,
          pageId: page.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ------------------------------------------------------------------
    // 3. Recalculate book metrics for each affected book
    // ------------------------------------------------------------------
    let updatedBooks = 0;
    let skippedBooks = 0;
    const uniqueBookIds = [...affectedBookIds].slice(0, config.maxBooks);

    for (const bookId of uniqueBookIds) {
      try {
        const bookRef = db.collection("books").doc(bookId);
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
          bookId,
          newStatus: metrics.bookStatus,
          imageSuccessCount: metrics.imageSuccessCount,
          imageFailureCount: metrics.imageFailureCount,
        });
      } catch (err) {
        skippedBooks++;
        logger.error("Failed to recalculate stale book metrics", {
          bookId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ------------------------------------------------------------------
    // 4. Save cleanup summary (latest + history)
    // ------------------------------------------------------------------
    const summary: StaleCleanupSummary = {
      checkedPages: pageCandidates.length,
      checkedBooks: affectedBookIds.size,
      updatedBooks,
      updatedPages,
      skippedBooks,
      skippedPages,
    };

    const runKey = buildCleanupRunKey(nowMs);
    const staleCleanupRef = db.collection("adminMetrics").doc("staleCleanup");

    await staleCleanupRef.set(
      {
        lastRunAt: FieldValue.serverTimestamp(),
        lastRunAtMs: nowMs,
        lastSummary: summary,
      },
      { merge: true },
    );

    await staleCleanupRef.collection("runs").doc(runKey).set({
      ...summary,
      runKey,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
    });

    logger.info("Stale generation cleanup complete", { ...summary, runKey });
  },
);
