"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STALE_CONFIG = void 0;
exports.isStaleBook = isStaleBook;
exports.isStalePage = isStalePage;
exports.findStaleBooks = findStaleBooks;
exports.findStalePages = findStalePages;
exports.buildStalePagePatch = buildStalePagePatch;
exports.extractBookIdFromPagePath = extractBookIdFromPagePath;
exports.buildCleanupRunKey = buildCleanupRunKey;
exports.DEFAULT_STALE_CONFIG = {
    staleThresholdMs: 30 * 60 * 1000, // 30 minutes
    maxBooks: 50,
    maxPages: 200,
};
/* ------------------------------------------------------------------ */
/*  Pure detection functions (testable)                                */
/* ------------------------------------------------------------------ */
/**
 * Determine if a "generating" book is stale based on updatedAtMs.
 */
function isStaleBook(book, nowMs, thresholdMs) {
    if (book.status !== "generating")
        return false;
    if (book.updatedAtMs == null)
        return true; // missing timestamp = stale
    return nowMs - book.updatedAtMs >= thresholdMs;
}
/**
 * Determine if a "generating" page is stale.
 * Checks imageRegenerationStartedAtMs first (for regeneration),
 * then imageGenerationStartedAtMs (for initial generation).
 */
function isStalePage(page, nowMs, thresholdMs) {
    if (page.status !== "generating")
        return false;
    const startedAtMs = page.imageRegenerationStartedAtMs ?? page.imageGenerationStartedAtMs;
    if (startedAtMs == null)
        return true; // missing timestamp = stale
    return nowMs - startedAtMs >= thresholdMs;
}
/**
 * Filter books to find stale candidates (pure).
 */
function findStaleBooks(books, nowMs, config) {
    return books
        .filter((b) => isStaleBook(b, nowMs, config.staleThresholdMs))
        .slice(0, config.maxBooks);
}
/**
 * Filter pages to find stale candidates (pure).
 */
function findStalePages(pages, nowMs, config) {
    return pages
        .filter((p) => isStalePage(p, nowMs, config.staleThresholdMs))
        .slice(0, config.maxPages);
}
/**
 * Build the Firestore update patch for a stale page.
 */
function buildStalePagePatch(nowMs) {
    return {
        status: "image_failed",
        imageFailureReason: "stale_generation_timeout",
        imageRetryable: true,
        lastStaleCleanupAtMs: nowMs,
    };
}
/**
 * Extract bookId from a collection group page document path.
 * Path format: books/{bookId}/pages/{pageId}
 */
function extractBookIdFromPagePath(path) {
    const match = /^books\/([^/]+)\/pages\/[^/]+$/.exec(path);
    return match ? match[1] : null;
}
/**
 * Build a deterministic run key for cleanup history.
 * Uses JST (UTC+9) date/time. Format: daily-YYYY-MM-DD-HHmm
 */
function buildCleanupRunKey(nowMs) {
    const jst = new Date(nowMs + 9 * 60 * 60 * 1000);
    const yyyy = jst.getUTCFullYear();
    const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(jst.getUTCDate()).padStart(2, "0");
    const hh = String(jst.getUTCHours()).padStart(2, "0");
    const min = String(jst.getUTCMinutes()).padStart(2, "0");
    return `daily-${yyyy}-${mm}-${dd}-${hh}${min}`;
}
//# sourceMappingURL=stale-detection.js.map