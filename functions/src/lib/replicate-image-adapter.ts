/**
 * P3-3: ReplicateImageAdapter — thin wrapper making ReplicateImageClient conform to ImageProvider.
 *
 * This adapter is NOT yet wired into generate-book.ts (as of P3-3).
 * Production routing continues to use createImageClient() → ReplicateImageClient directly.
 *
 * Design constraints:
 *  - Candidate gate is NOT part of this adapter. It remains in generate-book.ts.
 *  - Fallback ordering (resolveImageFallbackProfiles) is NOT part of this adapter.
 *  - Adapter does NOT emit raw prompt text, child names, or story text to structured logs.
 *  - generateImage requires a ReplicateStorageUploader to produce a persisted URL.
 *    The default uploader throws — production upload wiring happens in P3-7+.
 *
 * Migration status:
 *  P3-3  COMPLETE — adapter created, not yet wired to production generation path.
 *  P3-4  NEXT     — OpenAIImageAdapter for the candidate-only OpenAI path.
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
import { ReplicateImageClient, resolveReplicateModel } from "./replicate";

// -------------------------------------------------------------------------
// Storage uploader callback type
// -------------------------------------------------------------------------

/**
 * Callback that uploads a generated image buffer to persistent storage and returns a URL.
 * Injected at construction time. Defaults to a stub that throws (not yet wired in P3-3).
 * Production implementation uploads to Cloud Storage and returns the public URL.
 *
 * Privacy: the uploader must not include the prompt or any PII in the returned URL.
 */
export type ReplicateStorageUploader = (
  buffer: Buffer,
  profile: ImageModelProfile
) => Promise<string>;

// -------------------------------------------------------------------------
// Static capabilities for Replicate FLUX path
// -------------------------------------------------------------------------

/**
 * Capability descriptor for the current Replicate FLUX generation path.
 *
 * supportsImageToImage = false:
 *   FLUX Klein / Pro accept reference URLs as composition hints, but they
 *   are not true image-to-image editing. The images parameter is guidance, not instruction.
 *
 * supportsReferenceImages = true:
 *   inputImageUrls are forwarded as images / input_images / image_prompt depending on model.
 */
const REPLICATE_CAPABILITIES: ImageProviderCapabilities = {
  supportsTextToImage: true,
  supportsImageToImage: false,
  supportsReferenceImages: true,
  supportsDetailedGuidance: true,
} as const;

// -------------------------------------------------------------------------
// Adapter
// -------------------------------------------------------------------------

/**
 * ReplicateImageAdapter wraps ReplicateImageClient behind the ImageProvider interface.
 *
 * Constructor parameters:
 * @param apiToken   — Replicate API token (forwarded to ReplicateImageClient).
 * @param uploader   — Optional callback that persists the generated image buffer and
 *                     returns a URL. Defaults to a stub that throws until wired in P3-7.
 *
 * The adapter is intentionally not used in production until generate-book.ts is updated
 * in P3-7 to use the adapter routing layer.
 */
export class ReplicateImageAdapter implements ImageProvider {
  readonly providerId = "replicate" as const;
  readonly capabilities: ImageProviderCapabilities = REPLICATE_CAPABILITIES;

  private readonly apiToken: string;
  private readonly uploader: ReplicateStorageUploader;

  constructor(
    apiToken: string,
    uploader: ReplicateStorageUploader = async (_buffer, _profile) => {
      throw new Error(
        "ReplicateImageAdapter: storage uploader not configured. " +
          "Wire the Cloud Storage upload callback before calling generateImage (P3-7)."
      );
    }
  ) {
    this.apiToken = apiToken;
    this.uploader = uploader;
  }

  /**
   * Generate an image using Replicate and return an ImageGenerationResult.
   *
   * Internally creates a ReplicateImageClient, calls generateImageWithMetadata,
   * then calls the storage uploader to obtain a persisted URL.
   *
   * Privacy: `request.prompt` is forwarded to the Replicate API only.
   *          It must not be included in structured logs.
   *
   * Note: this method is not called in production as of P3-3 (no production wiring yet).
   * Unit tests use a mock uploader; live smoke belongs to P3-9.
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const client = new ReplicateImageClient(this.apiToken);
    const result = await client.generateImageWithMetadata(request.prompt, {
      inputImageUrls: request.inputImageUrls,
      imageModelProfile: request.imageModelProfile,
    });
    const imageUrl = await this.uploader(result.buffer, result.modelProfile);
    return {
      imageUrl,
      providerId: "replicate",
      modelLabel: result.model,
      profile: result.modelProfile,
      durationMs: result.durationMs,
      fallbackUsed: false,
    };
  }

  /**
   * Classify an unknown error into a normalized ImageGenerationFailure.
   *
   * P3-5: Uses classifyProviderError() which extends the shared taxonomy with
   * Replicate-specific patterns (ECONNRESET, ETIMEDOUT, overloaded, content_policy,
   * moderation, invalid input). Falls back to shared classifyError() for anything
   * not matched. Taxonomy values (ErrorCategory/ErrorCode) are unchanged from P2.
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
      providerId: "replicate",
      profile: context.profile,
      errorCategory,
      errorCode,
      retryable,
      safeMessage,
    };
  }

  /**
   * Return the Firestore-safe model label string for a given Replicate profile.
   * Delegates to resolveReplicateModel() to preserve existing label behavior.
   *
   * Throws for openai_image_candidate — that profile belongs to OpenAIImageAdapter.
   */
  resolveModelLabel(profile: ImageModelProfile): string {
    if (profile === "kontext_max") {
      return "black-forest-labs/flux-kontext-max";
    }
    if (
      profile === "openai_image_candidate" ||
      profile === "openai_mini" ||
      profile === "openai_standard"
    ) {
      throw new Error(
        `ReplicateImageAdapter does not support ${profile}. ` +
          "Use OpenAIImageAdapter for this profile (P3-4)."
      );
    }
    return resolveReplicateModel({ imageModelProfile: profile });
  }

  /**
   * Validate that required configuration is present.
   * Throws if apiToken is empty — safe to call during adapter construction.
   */
  validateConfig(): void {
    if (!this.apiToken) {
      throw new Error("ReplicateImageAdapter: apiToken must not be empty");
    }
  }
}
