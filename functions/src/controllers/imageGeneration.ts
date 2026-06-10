import * as logger from "firebase-functions/logger";
import {
  ImageModelProfile,
  CoverStatus,
  ImageQualityTier,
  ImageClient,
} from "../lib/types";
import {
  resolveImageModelProfile,
  resolveImageFallbackProfiles,
} from "../lib/image-model-policy";
import {
  withImageTimeout,
  ImageTimeoutError,
} from "../lib/replicate";
import {
  createImageAdapter,
  resolveImageProviderId,
} from "../lib/image-adapter-factory";
import {
  makeCoverUploader,
  CoverImageUploadFn,
} from "../lib/image-storage-uploader";

const IMAGE_GENERATION_TIMEOUT_MS = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? "120000");

export interface CoverImageResult {
  success: boolean;
  coverStatus: CoverStatus;
  imageUrl?: string;
  imageBuffer?: Buffer;
  usedProfile?: ImageModelProfile;
  primaryProfile?: ImageModelProfile;
  fallbackUsed: boolean;
  attemptCount: number;
  durationMs: number;
  failureReason?: string;
}

/**
 * Refactored generateCoverImage to use ImageProvider adapters.
 * Unified logic for both generate-book and regenerate-cover-image.
 */
export async function generateCoverImageWithFallback(params: {
  coverImagePrompt: string;
  bookId: string;
  imageQualityTier: ImageQualityTier;
  imageModelProfile?: ImageModelProfile;
  inputImageUrls?: string[];
  replicateApiToken?: string;
  openaiApiKey?: string;
  imageClient?: ImageClient;
  uploadCoverImage?: CoverImageUploadFn;
}): Promise<CoverImageResult> {
  const primaryProfile = resolveImageModelProfile({
    purpose: "book_cover",
    imageQualityTier: params.imageQualityTier,
    imageModelProfile: params.imageModelProfile,
  });
  const fallbackProfiles = resolveImageFallbackProfiles(primaryProfile);
  const startMs = Date.now();
  let totalAttempts = 0;
  let lastFailureReason: string | undefined;

  for (const profile of fallbackProfiles) {
    const maxRetries = 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      totalAttempts++;
      try {
        const pid = resolveImageProviderId(profile);
        const hasToken = pid === "replicate" ? !!params.replicateApiToken : !!params.openaiApiKey;

        if (hasToken && params.uploadCoverImage) {
          const uploader = makeCoverUploader({
            bookId: params.bookId,
            uploadCoverImage: params.uploadCoverImage,
          });

          const adapter = createImageAdapter({
            imageModelProfile: profile,
            replicateApiToken: params.replicateApiToken || "",
            openaiApiKey: params.openaiApiKey || "",
            replicateUploader: uploader,
            openaiUploader: uploader,
          });

          const result = await withImageTimeout(
            adapter.generateImage({
              prompt: params.coverImagePrompt,
              imageModelProfile: profile,
              inputImageUrls: params.inputImageUrls,
              metadata: {
                bookId: params.bookId,
              },
            }),
            IMAGE_GENERATION_TIMEOUT_MS
          );

          return {
            success: true,
            coverStatus: "completed",
            imageUrl: result.imageUrl,
            usedProfile: profile,
            primaryProfile,
            fallbackUsed: profile !== primaryProfile,
            attemptCount: totalAttempts,
            durationMs: Date.now() - startMs,
          };
        }

        // Legacy path fallback (primarily for test environments without adapter tokens)
        if (params.imageClient) {
          const buffer = await withImageTimeout(
            params.imageClient.generateImage(params.coverImagePrompt, {
              purpose: "book_cover",
              imageQualityTier: params.imageQualityTier,
              imageModelProfile: profile,
              inputImageUrls: params.inputImageUrls,
            }),
            IMAGE_GENERATION_TIMEOUT_MS
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
        }

        throw new Error(`No adapter token or imageClient available for profile ${profile}`);
      } catch (err) {
        if (err instanceof ImageTimeoutError) {
          lastFailureReason = "image_timeout";
          logger.warn("Cover image generation timeout", {
            bookId: params.bookId,
            profile,
            attempt,
            timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
          });
          break;
        }

        const retryAfterMs = getRetryAfterMs(err);
        lastFailureReason = err instanceof Error ? err.message : "unknown";
        logger.warn("Cover image generation attempt failed", {
          bookId: params.bookId,
          profile,
          attempt,
          error: lastFailureReason,
        });
        if (attempt < maxRetries - 1) {
          if (retryAfterMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 30_000)));
          } else {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
          continue;
        }
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

/**
 * Extract retry-after hint from provider error if present.
 */
function getRetryAfterMs(err: unknown): number {
  if (!err || typeof err !== "object") return 0;

  const response = (err as { response?: { headers?: { get?: (name: string) => string | null } } }).response;
  const retryAfterHeader = response?.headers?.get?.("retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const fallback = (err as { retry_after?: number }).retry_after;
  if (typeof fallback === "number" && fallback > 0) {
    return fallback * 1000;
  }

  return 0;
}
