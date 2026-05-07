"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBookCompletion = exports.regeneratePageImage = void 0;
exports.buildRegenerationSuccessPatch = buildRegenerationSuccessPatch;
exports.deriveBookMetrics = deriveBookMetrics;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const crypto_1 = require("crypto");
const replicate_1 = require("./lib/replicate");
const replicateApiToken = (0, params_1.defineSecret)("REPLICATE_API_TOKEN");
const IMAGE_GENERATION_TIMEOUT_MS = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? "120000");
const STORAGE_BUCKET = "story-gen-8a769.firebasestorage.app";
function buildRegenerationSuccessPatch(params) {
    const { newPageStatus, imageUrl, durationMs, attemptCount, usedProfile, timeoutCount, fallbackUsed, primaryProfile, deleteSentinel: del, serverTimestampSentinel, nowMs, } = params;
    return {
        status: newPageStatus,
        imageUrl,
        imageDurationMs: durationMs,
        imageAttemptCount: attemptCount,
        imageModelProfile: usedProfile,
        imageFailureReason: del,
        imageRetryable: del,
        imageTimeoutCount: timeoutCount > 0 ? timeoutCount : del,
        imageFallbackUsed: fallbackUsed ? true : del,
        fallbackFromModelProfile: fallbackUsed ? primaryProfile : del,
        imageRegeneratedAt: serverTimestampSentinel,
        imageRegeneratedAtMs: nowMs,
    };
}
exports.regeneratePageImage = (0, https_1.onCall)({ secrets: [replicateApiToken] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const uid = request.auth.uid;
    const isAdmin = request.auth.token?.admin === true;
    const { bookId, pageId, pageNumber } = request.data;
    if (!bookId)
        throw new https_1.HttpsError("invalid-argument", "bookId は必須です。");
    if (pageId === undefined && pageNumber === undefined) {
        throw new https_1.HttpsError("invalid-argument", "pageId または pageNumber は必須です。");
    }
    const db = admin.firestore();
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists)
        throw new https_1.HttpsError("not-found", "絵本が見つかりません。");
    const bookData = bookSnap.data();
    if (!isAdmin && bookData.userId !== uid) {
        throw new https_1.HttpsError("permission-denied", "この操作を実行する権限がありません。");
    }
    const resolvedPageId = pageId ?? `page-${pageNumber}`;
    const pageRef = bookRef.collection("pages").doc(resolvedPageId);
    const pageSnap = await pageRef.get();
    if (!pageSnap.exists)
        throw new https_1.HttpsError("not-found", "ページが見つかりません。");
    const pageData = pageSnap.data();
    const allowedStatuses = ["image_failed", "fallback_completed"];
    if (isAdmin)
        allowedStatuses.push("completed");
    if (!allowedStatuses.includes(pageData.status)) {
        throw new https_1.HttpsError("failed-precondition", `ページステータス "${pageData.status}" は再生成できません。`);
    }
    const startMs = Date.now();
    await pageRef.update({
        status: "generating",
        imageRegenerationStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        imageRegenerationStartedAtMs: startMs,
        regenerationAttemptCount: admin.firestore.FieldValue.increment(1),
        regenerationTriggeredBy: isAdmin ? "admin" : "owner",
    });
    const imageClient = new replicate_1.ReplicateImageClient(replicateApiToken.value());
    const primaryProfile = (pageData.imageModelProfile ?? "pro_consistent");
    const inputImageUrls = (pageData.inputImageRefs ?? []).map((ref) => ref.url);
    const fallbackProfiles = (0, replicate_1.resolveImageFallbackProfiles)(primaryProfile);
    let imageBuffer;
    let usedProfile = primaryProfile;
    let fallbackUsed = false;
    let attemptCount = 0;
    let timeoutCount = 0;
    let failureReason;
    let success = false;
    outer: for (const profile of fallbackProfiles) {
        const maxRetries = 2;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            attemptCount++;
            try {
                imageBuffer = await (0, replicate_1.withImageTimeout)(imageClient.generateImage(pageData.imagePrompt, {
                    purpose: pageData.imagePurpose,
                    imageQualityTier: pageData.imageQualityTier,
                    imageModelProfile: profile,
                    inputImageUrls,
                }), IMAGE_GENERATION_TIMEOUT_MS);
                usedProfile = profile;
                fallbackUsed = profile !== primaryProfile;
                success = true;
                break outer;
            }
            catch (err) {
                if (err instanceof replicate_1.ImageTimeoutError) {
                    timeoutCount++;
                    failureReason = "image_timeout";
                    logger.warn("Regeneration timeout", { bookId, pageId: resolvedPageId, profile, attempt });
                    break;
                }
                failureReason = err instanceof Error ? err.message : "unknown";
                logger.warn("Regeneration attempt failed", {
                    bookId,
                    pageId: resolvedPageId,
                    profile,
                    attempt,
                    error: failureReason,
                });
                if (attempt < maxRetries - 1)
                    continue;
                break;
            }
        }
    }
    const durationMs = Date.now() - startMs;
    if (!success || !imageBuffer) {
        const failurePatch = {
            status: "image_failed",
            imageFailureReason: failureReason ?? "unknown",
            imageRetryable: true,
            imageDurationMs: durationMs,
            imageAttemptCount: attemptCount,
            lastRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastRegeneratedAtMs: Date.now(),
            lastRegenerationSucceeded: false,
        };
        if (timeoutCount > 0)
            failurePatch.imageTimeoutCount = timeoutCount;
        await pageRef.update(failurePatch);
        // Write regeneration history entry
        const historyEntry = {
            attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
            attemptedAtMs: Date.now(),
            attemptedBy: uid,
            triggeredBy: isAdmin ? "admin" : "owner",
            beforeStatus: pageData.status,
            afterStatus: "image_failed",
            beforeImageUrl: pageData.imageUrl ?? null,
            imageModelProfile: primaryProfile,
            fallbackUsed: false,
            durationMs,
            failureReason: failureReason ?? "unknown",
            success: false,
        };
        await pageRef.collection("regenerationHistory").add(historyEntry);
        await recalculateBookMetrics(bookId, bookRef);
        throw new https_1.HttpsError("internal", `画像生成に失敗しました: ${failureReason}`);
    }
    const storage = admin.storage();
    const bucket = storage.bucket(STORAGE_BUCKET);
    const filename = `books/${bookId}/page-${pageData.pageNumber}-regen-${Date.now()}.png`;
    const file = bucket.file(filename);
    const downloadToken = (0, crypto_1.randomUUID)();
    await file.save(imageBuffer, {
        contentType: "image/png",
        metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
    });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
    const newPageStatus = fallbackUsed ? "fallback_completed" : "completed";
    const successPatch = buildRegenerationSuccessPatch({
        newPageStatus,
        imageUrl,
        durationMs,
        attemptCount,
        usedProfile,
        timeoutCount,
        fallbackUsed,
        primaryProfile,
        deleteSentinel: admin.firestore.FieldValue.delete(),
        serverTimestampSentinel: admin.firestore.FieldValue.serverTimestamp(),
        nowMs: Date.now(),
    });
    await pageRef.update(successPatch);
    // Write regeneration history entry
    const historyEntry = {
        attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptedAtMs: Date.now(),
        attemptedBy: uid,
        triggeredBy: isAdmin ? "admin" : "owner",
        beforeStatus: pageData.status,
        afterStatus: newPageStatus,
        beforeImageUrl: pageData.imageUrl ?? null,
        afterImageUrl: imageUrl,
        imageModelProfile: usedProfile,
        fallbackUsed,
        durationMs,
        success: true,
    };
    await pageRef.collection("regenerationHistory").add(historyEntry);
    // Update page-level regeneration metadata
    await pageRef.update({
        lastRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastRegeneratedAtMs: Date.now(),
        lastRegenerationSucceeded: true,
    });
    if (pageData.pageNumber === 0) {
        await bookRef.update({ coverImageUrl: imageUrl });
    }
    await recalculateBookMetrics(bookId, bookRef);
    logger.info("Page image regenerated", {
        bookId,
        pageId: resolvedPageId,
        pageNumber: pageData.pageNumber,
        usedProfile,
        fallbackUsed,
        durationMs,
        triggeredBy: isAdmin ? "admin" : "owner",
    });
    return { success: true, pageStatus: newPageStatus, imageUrl };
});
/**
 * Pure function to derive book status from page statuses.
 * Considers intermediate statuses (generating, pending) as incomplete.
 */
function deriveBookMetrics(pages) {
    const totalImageCount = pages.length;
    const successPages = pages.filter((p) => p.status === "completed" || p.status === "fallback_completed");
    const failedPages = pages.filter((p) => p.status === "image_failed" || p.status === "failed");
    const pendingPages = pages.filter((p) => p.status === "generating" || p.status === "pending");
    const imageSuccessCount = successPages.length;
    const imageFailureCount = failedPages.length;
    const failedPageNumbers = failedPages.map((p) => p.pageNumber).sort((a, b) => a - b);
    const pendingPageNumbers = pendingPages.map((p) => p.pageNumber).sort((a, b) => a - b);
    const incompleteCount = imageFailureCount + pendingPages.length;
    const generationReliabilityStatus = incompleteCount === 0 ? "ok" : imageSuccessCount > 0 ? "partial" : "failed";
    const bookStatus = incompleteCount === 0
        ? "completed"
        : imageSuccessCount > 0
            ? "partial_completed"
            : "failed";
    return {
        imageSuccessCount,
        imageFailureCount,
        totalImageCount,
        failedPageNumbers,
        pendingPageNumbers,
        generationReliabilityStatus,
        bookStatus,
    };
}
async function recalculateBookMetrics(bookId, bookRef) {
    const pagesSnap = await bookRef.collection("pages").get();
    const pages = pagesSnap.docs.map((d) => d.data());
    const bookSnap = await bookRef.get();
    const previousStatus = bookSnap.data()?.status;
    const metrics = deriveBookMetrics(pages);
    const updateData = {
        imageSuccessCount: metrics.imageSuccessCount,
        imageFailureCount: metrics.imageFailureCount,
        totalImageCount: metrics.totalImageCount,
        failedPageNumbers: metrics.failedPageNumbers,
        generationReliabilityStatus: metrics.generationReliabilityStatus,
        status: metrics.bookStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtMs: Date.now(),
        lastCompletionCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastCompletionCheckedAtMs: Date.now(),
    };
    // Track recovery from partial_completed to completed
    if (previousStatus === "partial_completed" && metrics.bookStatus === "completed") {
        updateData.recoveredFromPartialCompleted = true;
        updateData.recoveredAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.recoveredAtMs = Date.now();
        logger.info("Book recovered from partial_completed to completed", { bookId });
    }
    await bookRef.update(updateData);
    logger.info("Book metrics recalculated after regeneration", {
        bookId,
        imageSuccessCount: metrics.imageSuccessCount,
        imageFailureCount: metrics.imageFailureCount,
        bookStatus: metrics.bookStatus,
        generationReliabilityStatus: metrics.generationReliabilityStatus,
        recoveredFromPartialCompleted: previousStatus === "partial_completed" && metrics.bookStatus === "completed",
    });
}
/**
 * Admin-only callable to re-check a book's completion status.
 * Useful when pages were fixed but book status was not updated.
 */
exports.checkBookCompletion = (0, https_1.onCall)({}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    if (request.auth.token?.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "管理者権限が必要です。");
    }
    const { bookId } = request.data;
    if (!bookId)
        throw new https_1.HttpsError("invalid-argument", "bookId は必須です。");
    const db = admin.firestore();
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists)
        throw new https_1.HttpsError("not-found", "絵本が見つかりません。");
    const previousStatus = bookSnap.data().status;
    await recalculateBookMetrics(bookId, bookRef);
    const updatedSnap = await bookRef.get();
    const newStatus = updatedSnap.data().status;
    return {
        bookStatus: newStatus,
        recovered: previousStatus === "partial_completed" && newStatus === "completed",
    };
});
//# sourceMappingURL=regenerate-page-image.js.map