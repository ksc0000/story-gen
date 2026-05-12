"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStaleGeneration = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const firestore_1 = require("firebase-admin/firestore");
const regenerate_page_image_1 = require("./regenerate-page-image");
const stale_detection_1 = require("./lib/stale-detection");
exports.cleanupStaleGeneration = (0, scheduler_1.onSchedule)({ schedule: "30 3 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" }, 
// 毎日 03:30 JST
async () => {
    const db = (0, firestore_1.getFirestore)();
    const nowMs = Date.now();
    const config = stale_detection_1.DEFAULT_STALE_CONFIG;
    v2_1.logger.info("Starting stale generation cleanup", { config });
    // ------------------------------------------------------------------
    // 1. Collection group query: find all "generating" pages across books
    // ------------------------------------------------------------------
    const pagesSnap = await db
        .collectionGroup("pages")
        .where("status", "==", "generating")
        .limit(config.maxPages)
        .get();
    const pageCandidates = [];
    for (const pageDoc of pagesSnap.docs) {
        const bookId = (0, stale_detection_1.extractBookIdFromPagePath)(pageDoc.ref.path);
        if (!bookId) {
            v2_1.logger.warn("Could not extract bookId from page path", { path: pageDoc.ref.path });
            continue;
        }
        const data = pageDoc.data();
        pageCandidates.push({
            id: pageDoc.id,
            bookId,
            pageNumber: data.pageNumber,
            status: data.status,
            imageGenerationStartedAtMs: data.imageGenerationStartedAtMs,
            imageRegenerationStartedAtMs: data.imageRegenerationStartedAtMs,
        });
    }
    const stalePages = (0, stale_detection_1.findStalePages)(pageCandidates, nowMs, config);
    v2_1.logger.info("Stale page detection complete", {
        checkedPages: pageCandidates.length,
        stalePages: stalePages.length,
    });
    // ------------------------------------------------------------------
    // 2. Fix stale pages → image_failed
    // ------------------------------------------------------------------
    const pagePatch = (0, stale_detection_1.buildStalePagePatch)(nowMs);
    let updatedPages = 0;
    let skippedPages = 0;
    const affectedBookIds = new Set();
    for (const page of stalePages) {
        try {
            await db
                .collection("books")
                .doc(page.bookId)
                .collection("pages")
                .doc(page.id)
                .update({
                ...pagePatch,
                lastStaleCleanupAt: firestore_1.FieldValue.serverTimestamp(),
            });
            updatedPages++;
            affectedBookIds.add(page.bookId);
            v2_1.logger.info("Fixed stale page", {
                bookId: page.bookId,
                pageId: page.id,
                pageNumber: page.pageNumber,
            });
        }
        catch (err) {
            skippedPages++;
            v2_1.logger.error("Failed to fix stale page", {
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
            const pages = allPagesSnap.docs.map((d) => d.data());
            const metrics = (0, regenerate_page_image_1.deriveBookMetrics)(pages);
            await bookRef.update({
                status: metrics.bookStatus,
                imageSuccessCount: metrics.imageSuccessCount,
                imageFailureCount: metrics.imageFailureCount,
                totalImageCount: metrics.totalImageCount,
                failedPageNumbers: metrics.failedPageNumbers,
                generationReliabilityStatus: metrics.generationReliabilityStatus,
                staleCleanupApplied: true,
                lastStaleCleanupAt: firestore_1.FieldValue.serverTimestamp(),
                lastStaleCleanupAtMs: nowMs,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAtMs: nowMs,
            });
            updatedBooks++;
            v2_1.logger.info("Recalculated stale book metrics", {
                bookId,
                newStatus: metrics.bookStatus,
                imageSuccessCount: metrics.imageSuccessCount,
                imageFailureCount: metrics.imageFailureCount,
            });
        }
        catch (err) {
            skippedBooks++;
            v2_1.logger.error("Failed to recalculate stale book metrics", {
                bookId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    // ------------------------------------------------------------------
    // 4. Save cleanup summary (latest + history)
    // ------------------------------------------------------------------
    const summary = {
        checkedPages: pageCandidates.length,
        checkedBooks: affectedBookIds.size,
        updatedBooks,
        updatedPages,
        skippedBooks,
        skippedPages,
    };
    const runKey = (0, stale_detection_1.buildCleanupRunKey)(nowMs);
    const staleCleanupRef = db.collection("adminMetrics").doc("staleCleanup");
    await staleCleanupRef.set({
        lastRunAt: firestore_1.FieldValue.serverTimestamp(),
        lastRunAtMs: nowMs,
        lastSummary: summary,
    }, { merge: true });
    await staleCleanupRef.collection("runs").doc(runKey).set({
        ...summary,
        runKey,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
    });
    v2_1.logger.info("Stale generation cleanup complete", { ...summary, runKey });
});
//# sourceMappingURL=cleanup-stale-generation.js.map