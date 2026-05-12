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
exports.regenerateCoverImage = void 0;
exports.buildCoverRegenerationSuccessPatch = buildCoverRegenerationSuccessPatch;
exports.hasValidExistingCover = hasValidExistingCover;
exports.buildCoverRegenerationFailurePatch = buildCoverRegenerationFailurePatch;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const crypto_1 = require("crypto");
const replicate_1 = require("./lib/replicate");
const replicateApiToken = (0, params_1.defineSecret)("REPLICATE_API_TOKEN");
const IMAGE_GENERATION_TIMEOUT_MS = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? "120000");
const STORAGE_BUCKET = "story-gen-8a769.firebasestorage.app";
async function generateCoverImage(params) {
    const primaryProfile = (0, replicate_1.resolveImageModelProfile)({
        purpose: "book_cover",
        imageQualityTier: params.imageQualityTier,
        imageModelProfile: params.imageModelProfile,
    });
    const fallbackProfiles = (0, replicate_1.resolveImageFallbackProfiles)(primaryProfile);
    const startMs = Date.now();
    let totalAttempts = 0;
    let lastFailureReason;
    for (const profile of fallbackProfiles) {
        const maxRetries = 2;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            totalAttempts++;
            try {
                const buffer = await (0, replicate_1.withImageTimeout)(params.imageClient.generateImage(params.coverImagePrompt, {
                    purpose: "book_cover",
                    imageQualityTier: params.imageQualityTier,
                    imageModelProfile: profile,
                }), IMAGE_GENERATION_TIMEOUT_MS);
                return {
                    success: true,
                    coverStatus: "completed",
                    imageBuffer: buffer,
                    usedProfile: profile,
                    primaryProfile,
                    fallbackUsed: profile !== primaryProfile,
                    attemptCount: totalAttempts,
                    durationMs: Date.now() - startMs,
                };
            }
            catch (err) {
                if (err instanceof replicate_1.ImageTimeoutError) {
                    lastFailureReason = "image_timeout";
                    logger.warn("Cover regen timeout", {
                        bookId: params.bookId,
                        profile,
                        attempt,
                        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
                    });
                    break;
                }
                lastFailureReason = err instanceof Error ? err.message : "unknown";
                logger.warn("Cover regen attempt failed", {
                    bookId: params.bookId,
                    profile,
                    attempt,
                    error: lastFailureReason,
                });
                if (attempt < maxRetries - 1)
                    continue;
                break;
            }
        }
    }
    return {
        success: false,
        coverStatus: "failed",
        primaryProfile,
        fallbackUsed: fallbackProfiles.length > 1,
        attemptCount: totalAttempts,
        durationMs: Date.now() - startMs,
        failureReason: lastFailureReason,
    };
}
/* ------------------------------------------------------------------ */
/*  Build Firestore patches (exported for tests)                       */
/* ------------------------------------------------------------------ */
function buildCoverRegenerationSuccessPatch(params) {
    return {
        coverStatus: "completed",
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverImageUrl: params.coverImageUrl,
        coverGeneratedAt: params.serverTimestamp,
        coverGeneratedAtMs: params.nowMs,
        coverImageModelProfile: params.usedProfile,
        coverImageDurationMs: params.durationMs,
        coverImageFallbackUsed: params.fallbackUsed,
        coverFailureReason: null,
    };
}
/** Check if a book already has a valid, displayable cover. */
function hasValidExistingCover(bookData) {
    return (bookData.hasCoverPage === true &&
        bookData.readingStructureVersion === "v2_cover_title_story" &&
        bookData.coverStatus === "completed" &&
        typeof bookData.coverImageUrl === "string" &&
        bookData.coverImageUrl.length > 0);
}
function buildCoverRegenerationFailurePatch(params) {
    const patch = {
        coverFailureReason: params.failureReason,
    };
    if (params.hadValidCover) {
        // Preserve existing cover for Reader UI display
        patch.coverStatus = "completed";
        // hasCoverPage, readingStructureVersion, coverImageUrl are NOT overwritten
    }
    else {
        patch.coverStatus = "failed";
        patch.hasCoverPage = false;
        patch.readingStructureVersion = "v1_pages_only";
    }
    if (params.usedProfile !== undefined)
        patch.coverImageModelProfile = params.usedProfile;
    if (params.durationMs !== undefined)
        patch.coverImageDurationMs = params.durationMs;
    if (params.fallbackUsed !== undefined)
        patch.coverImageFallbackUsed = params.fallbackUsed;
    return patch;
}
exports.regenerateCoverImage = (0, https_1.onCall)({ secrets: [replicateApiToken] }, async (request) => {
    /* ---------- Auth ---------- */
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const isAdmin = request.auth.token?.admin === true;
    if (!isAdmin) {
        throw new https_1.HttpsError("permission-denied", "Admin 権限が必要です。");
    }
    /* ---------- Input validation ---------- */
    const { bookId } = request.data;
    if (!bookId) {
        throw new https_1.HttpsError("invalid-argument", "bookId は必須です。");
    }
    /* ---------- Fetch book ---------- */
    const db = admin.firestore();
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) {
        throw new https_1.HttpsError("not-found", "絵本が見つかりません。");
    }
    const bookData = bookSnap.data();
    const coverImagePrompt = bookData.coverImagePrompt;
    if (!coverImagePrompt) {
        throw new https_1.HttpsError("failed-precondition", "coverImagePrompt が設定されていません。");
    }
    /* ---------- Check if book already has a valid cover ---------- */
    const hadValidCover = hasValidExistingCover(bookData);
    /* ---------- Mark generating ---------- */
    await bookRef.update({
        coverStatus: "generating",
        coverFailureReason: null,
    });
    /* ---------- Generate cover image ---------- */
    const imageClient = new replicate_1.ReplicateImageClient(replicateApiToken.value());
    let coverResult;
    try {
        coverResult = await generateCoverImage({
            coverImagePrompt,
            imageClient,
            bookId,
            imageQualityTier: bookData.imageQualityTier ?? "light",
            imageModelProfile: bookData.imageModelProfile,
        });
    }
    catch (err) {
        logger.error("Cover regeneration unexpected error", {
            bookId,
            error: err instanceof Error ? err.message : String(err),
        });
        await bookRef.update(buildCoverRegenerationFailurePatch({ failureReason: "unexpected_error", hadValidCover }));
        throw new https_1.HttpsError("internal", "カバー画像の再生成に失敗しました。");
    }
    /* ---------- Handle generation failure ---------- */
    if (!coverResult.success || !coverResult.imageBuffer) {
        const failurePatch = buildCoverRegenerationFailurePatch({
            failureReason: coverResult.failureReason ?? "cover_regeneration_failed",
            usedProfile: coverResult.primaryProfile,
            durationMs: coverResult.durationMs,
            fallbackUsed: coverResult.fallbackUsed,
            hadValidCover,
        });
        await bookRef.update(failurePatch);
        logger.warn("Cover regeneration failed", { bookId, reason: coverResult.failureReason });
        throw new https_1.HttpsError("internal", `カバー画像の再生成に失敗しました: ${coverResult.failureReason}`);
    }
    /* ---------- Upload to Storage ---------- */
    let coverImageUrl;
    try {
        const storage = admin.storage();
        const bucket = storage.bucket(STORAGE_BUCKET);
        const filename = `books/${bookId}/cover-regen-${Date.now()}.png`;
        const file = bucket.file(filename);
        const downloadToken = (0, crypto_1.randomUUID)();
        await file.save(coverResult.imageBuffer, {
            contentType: "image/png",
            metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
        });
        coverImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
    }
    catch (uploadErr) {
        logger.error("Cover regen upload failed", {
            bookId,
            error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
        });
        await bookRef.update(buildCoverRegenerationFailurePatch({
            failureReason: "upload_failed",
            usedProfile: coverResult.usedProfile,
            durationMs: coverResult.durationMs,
            fallbackUsed: coverResult.fallbackUsed,
            hadValidCover,
        }));
        throw new https_1.HttpsError("internal", "カバー画像のアップロードに失敗しました。");
    }
    /* ---------- Success: update BookDoc ---------- */
    const successPatch = buildCoverRegenerationSuccessPatch({
        coverImageUrl,
        usedProfile: coverResult.usedProfile,
        durationMs: coverResult.durationMs,
        fallbackUsed: coverResult.fallbackUsed,
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        nowMs: Date.now(),
    });
    await bookRef.update(successPatch);
    logger.info("Cover image regenerated", {
        bookId,
        usedProfile: coverResult.usedProfile,
        fallbackUsed: coverResult.fallbackUsed,
        durationMs: coverResult.durationMs,
    });
    return { success: true, coverStatus: "completed", coverImageUrl };
});
//# sourceMappingURL=regenerate-cover-image.js.map