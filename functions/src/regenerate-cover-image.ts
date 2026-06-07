import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { randomUUID } from "crypto";
import {
  ReplicateImageClient,
  resolveImageModelProfile,
  resolveImageFallbackProfiles,
  withImageTimeout,
  ImageTimeoutError,
} from "./lib/replicate";
import { buildCoverImagePrompt, buildFinalCharacterBible } from "./lib/prompt-builder";
import { getAgeReadingProfile } from "./lib/age-reading-profile";
import type { ImageModelProfile, CoverStatus, BookData } from "./lib/types";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");
const IMAGE_GENERATION_TIMEOUT_MS = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? "120000");
const STORAGE_BUCKET = "story-gen-8a769.firebasestorage.app";

/* ------------------------------------------------------------------ */
/*  Cover image generation (same logic as generate-book.ts)            */
/* ------------------------------------------------------------------ */

interface CoverImageResult {
  success: boolean;
  coverStatus: CoverStatus;
  imageBuffer?: Buffer;
  usedProfile?: ImageModelProfile;
  primaryProfile?: ImageModelProfile;
  fallbackUsed: boolean;
  attemptCount: number;
  durationMs: number;
  failureReason?: string;
}

interface GenerateCoverImageParams {
  bookData: BookData;
  imageClient: { generateImage: (prompt: string, opts: Record<string, unknown>) => Promise<Buffer> };
}

async function generateCoverImage(params: GenerateCoverImageParams): Promise<CoverImageResult> {
  const { bookData } = params;
  const primaryProfile = resolveImageModelProfile({
    purpose: "book_cover",
    imageQualityTier: bookData.imageQualityTier,
    imageModelProfile: bookData.imageModelProfile,
  });
  const fallbackProfiles = resolveImageFallbackProfiles(primaryProfile);
  const startMs = Date.now();
  let totalAttempts = 0;
  let lastFailureReason: string | undefined;

  const readingProfile = getAgeReadingProfile(bookData.input.childAge);
  const finalCharacterBible = buildFinalCharacterBible({
    storyCharacterBible: bookData.characterBible || "",
    childProfileSnapshot: bookData.childProfileSnapshot,
    characterUsage: bookData.characterUsage,
    childAge: bookData.input.childAge,
  });

  const fullCoverPrompt = buildCoverImagePrompt(
    bookData.coverImagePrompt || "",
    bookData.style,
    finalCharacterBible,
    bookData.styleBible,
    {
      cast: bookData.storyCast,
      childProfileBasePrompt: bookData.childProfileSnapshot?.visualProfile.basePrompt,
      imageModelProfile: bookData.imageModelProfile,
      imageQualityTier: bookData.imageQualityTier,
      ageBand: readingProfile.ageBand,
      categoryGroupId: bookData.categoryGroupId,
    }
  );

  for (const profile of fallbackProfiles) {
    const maxRetries = 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      totalAttempts++;
      try {
        const buffer = await withImageTimeout(
          params.imageClient.generateImage(fullCoverPrompt, {
            purpose: "book_cover",
            imageQualityTier: bookData.imageQualityTier,
            imageModelProfile: profile,
          }),
          IMAGE_GENERATION_TIMEOUT_MS,
        );
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
      } catch (err) {
        if (err instanceof ImageTimeoutError) {
          lastFailureReason = "image_timeout";
          logger.warn("Cover regen timeout", {
            bookId: "(regen)",
            profile,
            attempt,
            timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
          });
          break;
        }
        lastFailureReason = err instanceof Error ? err.message : "unknown";
        logger.warn("Cover regen attempt failed", {
          bookId: "(regen)",
          profile,
          attempt,
          error: lastFailureReason,
        });
        if (attempt < maxRetries - 1) continue;
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

export function buildCoverRegenerationSuccessPatch(params: {
  coverImageUrl: string;
  usedProfile: ImageModelProfile;
  durationMs: number;
  fallbackUsed: boolean;
  serverTimestamp: unknown;
  nowMs: number;
}): Record<string, unknown> {
  return {
    coverStatus: "completed" as CoverStatus,
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
export function hasValidExistingCover(bookData: {
  hasCoverPage?: boolean;
  readingStructureVersion?: string;
  coverStatus?: string;
  coverImageUrl?: string;
}): boolean {
  return (
    bookData.hasCoverPage === true &&
    bookData.readingStructureVersion === "v2_cover_title_story" &&
    bookData.coverStatus === "completed" &&
    typeof bookData.coverImageUrl === "string" &&
    bookData.coverImageUrl.length > 0
  );
}

export function buildCoverRegenerationFailurePatch(params: {
  failureReason: string;
  usedProfile?: ImageModelProfile;
  durationMs?: number;
  fallbackUsed?: boolean;
  hadValidCover?: boolean;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    coverFailureReason: params.failureReason,
  };

  if (params.hadValidCover) {
    // Preserve existing cover for Reader UI display
    patch.coverStatus = "completed" as CoverStatus;
    // hasCoverPage, readingStructureVersion, coverImageUrl are NOT overwritten
  } else {
    patch.coverStatus = "failed" as CoverStatus;
    patch.hasCoverPage = false;
    patch.readingStructureVersion = "v1_pages_only";
  }

  if (params.usedProfile !== undefined) patch.coverImageModelProfile = params.usedProfile;
  if (params.durationMs !== undefined) patch.coverImageDurationMs = params.durationMs;
  if (params.fallbackUsed !== undefined) patch.coverImageFallbackUsed = params.fallbackUsed;
  return patch;
}

/* ------------------------------------------------------------------ */
/*  Callable function                                                  */
/* ------------------------------------------------------------------ */

interface RegenerateCoverImageRequest {
  bookId: string;
}

interface RegenerateCoverImageResponse {
  success: boolean;
  coverStatus: CoverStatus;
  coverImageUrl?: string;
}

export const regenerateCoverImage = onCall<RegenerateCoverImageRequest, Promise<RegenerateCoverImageResponse>>(
  { secrets: [replicateApiToken] },
  async (request) => {
    /* ---------- Auth ---------- */
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    const isAdmin = request.auth.token?.admin === true;
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin 権限が必要です。");
    }

    /* ---------- Input validation ---------- */
    const { bookId } = request.data;
    if (!bookId) {
      throw new HttpsError("invalid-argument", "bookId は必須です。");
    }

    /* ---------- Fetch book ---------- */
    const db = admin.firestore();
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) {
      throw new HttpsError("not-found", "絵本が見つかりません。");
    }
    const bookData = bookSnap.data() as BookData;
    const coverImagePrompt = bookData.coverImagePrompt;
    if (!coverImagePrompt) {
      throw new HttpsError("failed-precondition", "coverImagePrompt が設定されていません。");
    }

    /* ---------- Check if book already has a valid cover ---------- */
    const hadValidCover = hasValidExistingCover(bookData);

    /* ---------- Mark generating ---------- */
    await bookRef.update({
      coverStatus: "generating" as CoverStatus,
      coverFailureReason: null,
    });

    /* ---------- Generate cover image ---------- */
    const imageClient = new ReplicateImageClient(replicateApiToken.value());
    let coverResult: CoverImageResult;
    try {
      coverResult = await generateCoverImage({
        bookData,
        imageClient,
      });
    } catch (err) {
      logger.error("Cover regeneration unexpected error", {
        bookId,
        error: err instanceof Error ? err.message : String(err),
      });
      await bookRef.update(
        buildCoverRegenerationFailurePatch({ failureReason: "unexpected_error", hadValidCover }),
      );
      throw new HttpsError("internal", "カバー画像の再生成に失敗しました。");
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
      throw new HttpsError("internal", `カバー画像の再生成に失敗しました: ${coverResult.failureReason}`);
    }

    /* ---------- Upload to Storage ---------- */
    let coverImageUrl: string;
    try {
      const storage = admin.storage();
      const bucket = storage.bucket(STORAGE_BUCKET);
      const filename = `books/${bookId}/cover-regen-${Date.now()}.png`;
      const file = bucket.file(filename);
      const downloadToken = randomUUID();
      await file.save(coverResult.imageBuffer, {
        contentType: "image/png",
        metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
      });
      coverImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
    } catch (uploadErr) {
      logger.error("Cover regen upload failed", {
        bookId,
        error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
      });
      await bookRef.update(
        buildCoverRegenerationFailurePatch({
          failureReason: "upload_failed",
          usedProfile: coverResult.usedProfile,
          durationMs: coverResult.durationMs,
          fallbackUsed: coverResult.fallbackUsed,
          hadValidCover,
        }),
      );
      throw new HttpsError("internal", "カバー画像のアップロードに失敗しました。");
    }

    /* ---------- Success: update BookDoc ---------- */
    const successPatch = buildCoverRegenerationSuccessPatch({
      coverImageUrl,
      usedProfile: coverResult.usedProfile!,
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
  },
);
