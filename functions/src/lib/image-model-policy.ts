/**
 * P3-8: Provider-neutral image model policy functions.
 *
 * These functions define HOW the system resolves image model profiles and
 * fallback chains, independent of any specific provider SDK.
 *
 * Previously these lived in replicate.ts only because Replicate was the
 * historical default provider. They are now extracted here so:
 *  - Both adapters (Replicate, OpenAI) can reference the same policy.
 *  - Future providers can be added without touching replicate.ts.
 *  - Tests can import policy without pulling in Replicate SDK.
 *
 * replicate.ts re-exports everything from this module for backward
 * compatibility — existing imports from replicate.ts continue to work.
 *
 * Design constraints:
 *  - No Replicate SDK imports.
 *  - No OpenAI SDK imports.
 *  - No Firebase imports.
 *  - Candidate gate logic belongs at the caller level (generate-book.ts), not here.
 *    This module only exposes isCandidateProfile() for classification purposes.
 *  - Fallback order is policy: changing it requires an explicit PR with test updates.
 */

import type { ImageModelProfile, ImagePurpose, ImageQualityTier } from "./types";

// -------------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------------

/**
 * Returns true when the ENABLE_KLEIN_BASE environment variable is "true".
 * Used to gate klein_base in standard-tier routing.
 * Module-private — not exported.
 */
function isKleinBaseEnabled(): boolean {
  return process.env.ENABLE_KLEIN_BASE === "true";
}

// -------------------------------------------------------------------------
// Candidate profile registry
// -------------------------------------------------------------------------

/**
 * Candidate profiles that require explicit user-level enrollment before production use.
 * These profiles are NOT part of the default production routing.
 * T6-59: Used by the controlled exposure gate in the generateBook Cloud Function.
 *
 * P3-8: Moved from replicate.ts. replicate.ts re-exports this constant.
 */
export const CANDIDATE_IMAGE_PROFILES: readonly ImageModelProfile[] = [
  "openai_image_candidate", // T6-43: OpenAI Image path (E005 resolution candidate)
  "flux11_pro_candidate",   // T6-37: FLUX 1.1 pro diagnostic candidate
] as const;

/**
 * Returns true if the given profile is a candidate profile requiring user enrollment.
 * Candidate profiles are not accessible to users by default.
 * T6-59: Gate check — if true, user must have generationOverride.allowCandidateProfile === true.
 *
 * P3-8: Moved from replicate.ts. replicate.ts re-exports this function.
 */
export function isCandidateProfile(profile: ImageModelProfile | undefined): boolean {
  return profile !== undefined && CANDIDATE_IMAGE_PROFILES.includes(profile);
}

// -------------------------------------------------------------------------
// Profile resolution
// -------------------------------------------------------------------------

/**
 * Resolve the canonical ImageModelProfile to use for a given generation request.
 *
 * Priority order:
 *  1. child_avatar / child_avatar_revision → pro_consistent (always high-quality)
 *  2. Explicit imageModelProfile override → use as-is
 *  3. premium quality tier → pro_consistent
 *  4. standard quality tier + klein_base enabled → klein_base
 *  5. Default → klein_fast
 *
 * P3-8: Moved from replicate.ts. replicate.ts re-exports this function.
 */
export function resolveImageModelProfile(params: {
  purpose?: ImagePurpose;
  imageQualityTier?: ImageQualityTier;
  imageModelProfile?: ImageModelProfile;
}): ImageModelProfile {
  if (params.purpose === "child_avatar" || params.purpose === "child_avatar_revision") {
    return "pro_consistent";
  }

  if (params.imageModelProfile) {
    return params.imageModelProfile;
  }

  if (params.imageQualityTier === "premium") {
    return "pro_consistent";
  }

  if (params.imageQualityTier === "standard" && isKleinBaseEnabled()) {
    return "klein_base";
  }

  return "klein_fast";
}

// -------------------------------------------------------------------------
// Fallback chain
// -------------------------------------------------------------------------

/**
 * Return the ordered fallback chain for a given primary profile.
 *
 * Rules:
 *  - First element is always the requested profile.
 *  - Subsequent elements are attempted in order when the previous fails.
 *  - klein_fast appears as the last-resort fallback for most Replicate profiles.
 *  - openai_image_candidate has NO Replicate fallback — if it fails, the page fails.
 *  - Candidate profiles (flux11_pro_candidate) fall back to klein_fast only.
 *
 * IMPORTANT: Changing this function changes production fallback behavior.
 * Always add tests before changing the order.
 *
 * P3-8: Moved from replicate.ts. replicate.ts re-exports this function.
 */
export function resolveImageFallbackProfiles(profile: ImageModelProfile): ImageModelProfile[] {
  switch (profile) {
    case "openai_standard":
      return ["openai_standard", "klein_fast"];
    case "openai_mini":
      return ["openai_mini", "klein_fast"];
    case "kontext_max":
      return ["kontext_max", "klein_fast"];
    case "pro_consistent":
      return ["pro_consistent", "klein_fast"];
    case "klein_base":
      return ["klein_base", "klein_fast"];
    case "kontext_reference":
      return ["kontext_reference", "klein_fast"];
    case "flux11_pro_candidate": // T6-37: diagnostic only
      return ["flux11_pro_candidate", "klein_fast"];
    case "openai_image_candidate": // T6-43: no Replicate fallback — OpenAI only
      return ["openai_image_candidate"];
    case "klein_fast":
    default:
      return ["klein_fast"];
  }
}

/**
 * Returns true if the given profile should use the 3-step "safer retry" mechanism.
 * P5-4a: Promoted pro_consistent to use safer_retry by default.
 *
 * P3-8: replicate.ts re-exports this function.
 */
export function isSaferRetryEnabled(profile: ImageModelProfile): boolean {
  return profile === "pro_consistent" || profile === "openai_standard" || profile === "openai_mini" || profile === "kontext_max";
}
