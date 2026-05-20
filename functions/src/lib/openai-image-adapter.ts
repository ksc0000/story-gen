/**
 * P3-4: OpenAIImageAdapter — thin wrapper making OpenAIImageClient conform to ImageProvider.
 *
 * This adapter is NOT yet wired into generate-book.ts (as of P3-4).
 * Production routing continues to use createImageClient() → OpenAIImageClient directly.
 *
 * Design constraints:
 *  - This adapter supports ONLY "openai_image_candidate" profile.
 *    All other profiles throw — they belong to ReplicateImageAdapter.
 *  - Candidate gate is NOT part of this adapter. It remains in generate-book.ts.
 *  - Fallback ordering is NOT part of this adapter.
 *  - Adapter does NOT emit raw prompt text, child names, or story text to structured logs.
 *  - generateImage requires an OpenAIStorageUploader to produce a persisted URL.
 *    The default uploader throws — production upload wiring happens in P3-7+.
 *
 * Note on resolveModelLabel:
 *  The OpenAI candidate path uses two different model labels depending on whether
 *  reference images are present (Images API vs Responses API). The interface-level
 *  resolveModelLabel(profile) cannot know this, so it returns the text-to-image
 *  default: "openai/gpt-image-1-mini". The accurate per-request label is returned
 *  inside ImageGenerationResult.modelLabel from generateImage().
 *
 * Migration status:
 *  P3-4  COMPLETE — adapter created, not yet wired to production generation path.
 *  P3-5  NEXT     — move provider error classification into each adapter.
 *  P3-7  FUTURE   — wire storage uploader and swap createImageClient() to use adapters.
 */

import type { ImageModelProfile } from "./types";
import type {
  ImageGenerationFailure,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
  ImageProviderCapabilities,
} from "./image-provider";
import { classifyProviderError, isProviderErrorRetryable } from "./provider-error-classifier";
import {
  OpenAIImageClient,
  OPENAI_IMAGE_CANDIDATE_PROFILE,
  resolveOpenAIModelLabel,
} from "./openai-image";

// -------------------------------------------------------------------------
// Storage uploader callback type
// -------------------------------------------------------------------------

/**
 * Callback that uploads a generated image buffer to persistent storage and returns a URL.
 * Injected at construction time. Defaults to a stub that throws (not yet wired in P3-4).
 * Production implementation uploads to Cloud Storage and returns the public URL.
 *
 * Privacy: the uploader must not include the prompt or any PII in the returned URL.
 */
export type OpenAIStorageUploader = (
  buffer: Buffer,
  profile: ImageModelProfile
) => Promise<string>;

// -------------------------------------------------------------------------
// Static capabilities for OpenAI candidate path
// -------------------------------------------------------------------------

/**
 * Capability descriptor for the OpenAI candidate generation path.
 *
 * supportsImageToImage = true:
 *   The Responses API path accepts reference image URLs via input_images.
 *   This is used for character photo reference consistency (T6-43).
 *
 * supportsReferenceImages = true:
 *   inputImageUrls are forwarded to gpt-4o via Responses API when present.
 */
const OPENAI_CAPABILITIES: ImageProviderCapabilities = {
  supportsTextToImage: true,
  supportsImageToImage: true,
  supportsReferenceImages: true,
  supportsDetailedGuidance: true,
} as const;

// -------------------------------------------------------------------------
// Adapter
// -------------------------------------------------------------------------

/**
 * OpenAIImageAdapter wraps OpenAIImageClient behind the ImageProvider interface.
 * Supports ONLY the "openai_image_candidate" profile.
 *
 * Constructor parameters:
 * @param apiKey    — OpenAI API key (forwarded to OpenAIImageClient).
 * @param uploader  — Optional callback that persists the generated image buffer and
 *                    returns a URL. Defaults to a stub that throws until wired in P3-7.
 *
 * The adapter is intentionally not used in production until generate-book.ts is updated
 * in P3-7 to use the adapter routing layer.
 */
export class OpenAIImageAdapter implements ImageProvider {
  readonly providerId = "openai" as const;
  readonly capabilities: ImageProviderCapabilities = OPENAI_CAPABILITIES;

  private readonly apiKey: string;
  private readonly uploader: OpenAIStorageUploader;

  constructor(
    apiKey: string,
    uploader: OpenAIStorageUploader = async (_buffer, _profile) => {
      throw new Error(
        "OpenAIImageAdapter: storage uploader not configured. " +
          "Wire the Cloud Storage upload callback before calling generateImage (P3-7)."
      );
    }
  ) {
    this.apiKey = apiKey;
    this.uploader = uploader;
  }

  /**
   * Generate an image using the OpenAI candidate path and return an ImageGenerationResult.
   *
   * Accepts only "openai_image_candidate" profile.
   * Internally creates an OpenAIImageClient, calls generateImage (which selects
   * Images API vs Responses API based on inputImageUrls), then calls the storage
   * uploader to obtain a persisted URL.
   *
   * The modelLabel in the result is computed accurately from the actual API path chosen:
   *  - With reference images: "openai/gpt-4o"   (Responses API)
   *  - Without reference images: "openai/gpt-image-1-mini" (Images API)
   *
   * Privacy: `request.prompt` is forwarded to the OpenAI API only.
   *          It must not be included in structured logs.
   *
   * Note: this method is not called in production as of P3-4 (no production wiring yet).
   * Unit tests use a mock uploader; live smoke belongs to P3-9.
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    if (request.imageModelProfile !== "openai_image_candidate") {
      throw new Error(
        `OpenAIImageAdapter supports only openai_image_candidate. ` +
          `Received: "${request.imageModelProfile}". Use ReplicateImageAdapter for this profile.`
      );
    }

    const startMs = Date.now();
    const client = new OpenAIImageClient(this.apiKey, OPENAI_IMAGE_CANDIDATE_PROFILE);
    const inputImageUrls = request.inputImageUrls ?? [];

    const buffer = await client.generateImage(request.prompt, {
      inputImageUrls,
      imageModelProfile: request.imageModelProfile,
    });

    const imageUrl = await this.uploader(buffer, request.imageModelProfile);
    const hasReferenceImages = inputImageUrls.length > 0;

    return {
      imageUrl,
      providerId: "openai",
      modelLabel: resolveOpenAIModelLabel(hasReferenceImages),
      profile: request.imageModelProfile,
      durationMs: Date.now() - startMs,
      fallbackUsed: false,
    };
  }

  /**
   * Classify an unknown error into a normalized ImageGenerationFailure.
   *
   * P3-5: Uses classifyProviderError() which extends the shared taxonomy with
   * OpenAI-specific patterns (insufficient_quota, moderation, content_policy,
   * ECONNRESET, ETIMEDOUT, overloaded, invalid request). Falls back to shared
   * classifyError() for anything not matched. Taxonomy values are unchanged from P2.
   *
   * Privacy: safeMessage is truncated to 120 chars. Prompt text is never included.
   */
  classifyError(
    error: unknown,
    context: { profile: ImageModelProfile }
  ): ImageGenerationFailure {
    const { errorCategory, errorCode } = classifyProviderError(error);
    const retryable = isProviderErrorRetryable(errorCode);

    let safeMessage: string | undefined;
    if (error instanceof Error) {
      // Truncate to 120 chars. Never include raw prompt or child names.
      safeMessage = error.message.slice(0, 120);
    }

    return {
      providerId: "openai",
      profile: context.profile,
      errorCategory,
      errorCode,
      retryable,
      safeMessage,
    };
  }

  /**
   * Return the default Firestore-safe model label for the openai_image_candidate profile.
   *
   * Returns the text-to-image path label ("openai/gpt-image-1-mini") as a static default.
   * When reference images are present, the accurate label is returned in
   * ImageGenerationResult.modelLabel from generateImage() instead.
   *
   * Throws for any non-OpenAI profile.
   */
  resolveModelLabel(profile: ImageModelProfile): string {
    if (profile !== "openai_image_candidate") {
      throw new Error(
        `OpenAIImageAdapter supports only openai_image_candidate. ` +
          `Received: "${profile}". Use ReplicateImageAdapter for Replicate profiles.`
      );
    }
    // Static default: text-to-image path. generateImage() returns the accurate label per request.
    return resolveOpenAIModelLabel(false);
  }

  /**
   * Validate that required configuration is present.
   * Throws if apiKey is empty — safe to call during adapter construction.
   */
  validateConfig(): void {
    if (!this.apiKey) {
      throw new Error("OpenAIImageAdapter: apiKey must not be empty");
    }
  }
}
