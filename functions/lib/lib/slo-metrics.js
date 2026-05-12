"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_SLO = void 0;
exports.computePercentile = computePercentile;
exports.computeSloMetrics = computeSloMetrics;
exports.EMPTY_SLO = {
    totalBooks: 0,
    completedBooks: 0,
    partialCompletedBooks: 0,
    failedBooks: 0,
    bookReadableRate: 0,
    bookHardFailedRate: 0,
    totalPages: 0,
    imageFailedPages: 0,
    pageImageFailureRate: 0,
    fallbackPages: 0,
    fallbackRate: 0,
    timeoutPages: 0,
    timeoutRate: 0,
    imageP50Ms: 0,
    imageP90Ms: 0,
    imageP95Ms: 0,
    regenerationCount: 0,
    regenerationSuccessCount: 0,
    regenerationSuccessRate: 0,
};
/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function computePercentile(sorted, p) {
    if (sorted.length === 0)
        return 0;
    const i = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi)
        return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
/**
 * Detect whether a page experienced a timeout.
 * Mirrors the logic in src/lib/admin-slo-metrics.ts.
 */
function isTimeoutPage(page) {
    if ((page.imageTimeoutCount ?? 0) > 0)
        return true;
    // Future-proof: accept imageDeadlineExceeded
    if (page["imageDeadlineExceeded"] === true)
        return true;
    const reason = page.imageFailureReason;
    if (reason && /timeout|deadline/i.test(reason))
        return true;
    return false;
}
/* ------------------------------------------------------------------ */
/*  Main computation                                                   */
/* ------------------------------------------------------------------ */
/**
 * Pure function to compute SLO metrics from books and their pages.
 * Equivalent to the frontend computeSloMetrics in src/lib/admin-slo-metrics.ts.
 */
function computeSloMetrics(books, pagesMap) {
    const terminalBooks = books.filter((b) => b.status === "completed" || b.status === "partial_completed" || b.status === "failed");
    const totalBooks = terminalBooks.length;
    if (totalBooks === 0)
        return exports.EMPTY_SLO;
    const completedBooks = terminalBooks.filter((b) => b.status === "completed").length;
    const partialCompletedBooks = terminalBooks.filter((b) => b.status === "partial_completed").length;
    const failedBooks = terminalBooks.filter((b) => b.status === "failed").length;
    const bookReadableRate = ((completedBooks + partialCompletedBooks) / totalBooks) * 100;
    const bookHardFailedRate = (failedBooks / totalBooks) * 100;
    const allPages = [];
    for (const book of terminalBooks) {
        const bp = pagesMap.get(book.id);
        if (bp)
            allPages.push(...bp);
    }
    const totalPages = allPages.length;
    const imageFailedPages = allPages.filter((p) => p.status === "image_failed").length;
    const pageImageFailureRate = totalPages > 0 ? (imageFailedPages / totalPages) * 100 : 0;
    const fallbackPages = allPages.filter((p) => p.imageFallbackUsed === true).length;
    const fallbackRate = totalPages > 0 ? (fallbackPages / totalPages) * 100 : 0;
    const timeoutPages = allPages.filter(isTimeoutPage).length;
    const timeoutRate = totalPages > 0 ? (timeoutPages / totalPages) * 100 : 0;
    const durations = allPages
        .map((p) => p.imageDurationMs)
        .filter((d) => typeof d === "number" && d > 0)
        .sort((a, b) => a - b);
    const imageP50Ms = computePercentile(durations, 50);
    const imageP90Ms = computePercentile(durations, 90);
    const imageP95Ms = computePercentile(durations, 95);
    const regeneratedPages = allPages.filter((p) => (p.regenerationAttemptCount ?? 0) > 0);
    const regenerationCount = regeneratedPages.length;
    const regenerationSuccessCount = regeneratedPages.filter((p) => p.status === "completed" || p.status === "fallback_completed").length;
    const regenerationSuccessRate = regenerationCount > 0 ? (regenerationSuccessCount / regenerationCount) * 100 : 0;
    return {
        totalBooks,
        completedBooks,
        partialCompletedBooks,
        failedBooks,
        bookReadableRate,
        bookHardFailedRate,
        totalPages,
        imageFailedPages,
        pageImageFailureRate,
        fallbackPages,
        fallbackRate,
        timeoutPages,
        timeoutRate,
        imageP50Ms,
        imageP90Ms,
        imageP95Ms,
        regenerationCount,
        regenerationSuccessCount,
        regenerationSuccessRate,
    };
}
//# sourceMappingURL=slo-metrics.js.map