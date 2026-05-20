/**
 * P3-10: ImageProvider adapter factory.
 *
 * Returns the correct ImageProvider adapter for a given ImageModelProfile,
 * using PROFILE_PROVIDER_MAP as the single source of truth for routing.
 *
 * Design constraints:
 *  - THIS FACTORY IS NOT WIRED TO PRODUCTION as of P3-10.
 *    generate-book.ts continues to use createImageClient() unchanged.
 *  - The factory does NOT enforce the candidate gate.
 *    Callers are responsible for calling gateImageModelProfile() (or equivalent)
 *    BEFORE passing a profile to this factory.
 *  - No Firestore writes, no network calls, no environment variable reads.
 *  - validateConfig() is NOT called during construction.
 *    This keeps the factory testable with dummy credentials and avoids
 *    hard failures in test environments where provider SDKs are not configured.
 *  - Uploader injection is optional; adapters default to a stub that throws
 *    at generateImage() time if not wired (see P3-11 for uploader abstraction).
 *
 * Migration status:
 *  P3-10  COMPLETE — factory created, NOT wired to production generation path.
 *  P3-11  NEXT     — storage uploader abstraction (makePageUploader closure).
 *  P3-13  FUTURE   — wire Replicate path to this factory (feature-flagged).
 *  P3-14  FUTURE   — wire OpenAI candidate path to this factory (enrolled only).
 */

import type { ImageModelProfile } from "./types";
import type { ImageProvider, ImageProviderId } from "./image-provider";
import { PROFILE_PROVIDER_MAP } from "./image-provider";
import { ReplicateImageAdapter } from "./replicate-image-adapter";
import type { ReplicateStorageUploader } from "./replicate-image-adapter";
import { OpenAIImageAdapter } from "./openai-image-adapter";
import type { OpenAIStorageUploader } from "./openai-image-adapter";

// -------------------------------------------------------------------------
// Factory params
// -------------------------------------------------------------------------

/**
 * Parameters for createImageAdapter().
 *
 * replicateApiToken / openaiApiKey are forwarded to the respective adapter
 * constructors. Dummy strings are acceptable in test environments — no
 * validation occurs at construction time.
 *
 * replicateUploader / openaiUploader are optional; adapters default to a
 * stub uploader that throws. Wire real uploaders in P3-11.
 *
 * Do NOT include allowCandidateProfile here. The factory is not a gate.
 * Caller must gate the profile before calling createImageAdapter().
 */
export interface ImageAdapterFactoryParams {
  /** The resolved (already-gated) image model profile for this request. */
  imageModelProfile: ImageModelProfile;
  /** Replicate API token. Forwarded verbatim to ReplicateImageAdapter. */
  replicateApiToken: string;
  /** OpenAI API key. Forwarded verbatim to OpenAIImageAdapter. */
  openaiApiKey: string;
  /**
   * Optional storage uploader for the Replicate adapter.
   * If omitted, the adapter's default stub uploader is used (throws at generateImage time).
   */
  replicateUploader?: ReplicateStorageUploader;
  /**
   * Optional storage uploader for the OpenAI adapter.
   * If omitted, the adapter's default stub uploader is used (throws at generateImage time).
   */
  openaiUploader?: OpenAIStorageUploader;
}

// -------------------------------------------------------------------------
// resolveImageProviderId
// -------------------------------------------------------------------------

/**
 * Return the ImageProviderId that owns the given profile.
 *
 * Delegates to PROFILE_PROVIDER_MAP, which is the single source of truth
 * for profile → provider attribution (P3-7).
 *
 * @throws {Error} if profile is not present in PROFILE_PROVIDER_MAP.
 */
export function resolveImageProviderId(profile: ImageModelProfile): ImageProviderId {
  const providerId = PROFILE_PROVIDER_MAP[profile];
  if (providerId == null) {
    throw new Error(
      `resolveImageProviderId: unknown ImageModelProfile "${profile}". ` +
        `Add it to PROFILE_PROVIDER_MAP in image-provider.ts.`
    );
  }
  return providerId;
}

// -------------------------------------------------------------------------
// createImageAdapter
// -------------------------------------------------------------------------

/**
 * Factory that creates and returns the correct ImageProvider adapter
 * for the given ImageModelProfile.
 *
 * Safety notes:
 *  - Call gateImageModelProfile() (generate-book.ts) BEFORE this function.
 *    The factory does not evaluate candidate enrollment.
 *  - openai_image_candidate returns OpenAIImageAdapter unconditionally.
 *    This is correct: gating is the caller's responsibility.
 *  - No network calls occur during construction.
 *  - validateConfig() is NOT called — test safely with dummy credentials.
 *
 * NOT called from production code in P3-10.
 */
export function createImageAdapter(params: ImageAdapterFactoryParams): ImageProvider {
  const providerId = resolveImageProviderId(params.imageModelProfile);

  if (providerId === "replicate") {
    return new ReplicateImageAdapter(params.replicateApiToken, params.replicateUploader);
  }

  if (providerId === "openai") {
    return new OpenAIImageAdapter(params.openaiApiKey, params.openaiUploader);
  }

  // TypeScript exhaustiveness guard — should never be reached at runtime
  // because PROFILE_PROVIDER_MAP only contains "replicate" | "openai".
  throw new Error(
    `createImageAdapter: unhandled providerId "${providerId as string}" ` +
      `for profile "${params.imageModelProfile}".`
  );
}
