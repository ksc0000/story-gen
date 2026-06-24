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

/**
 * Returns true when ENABLE_GPT_IMAGE_2 is "true". Master flag for the full
 * cutover of image generation to gpt-image-2 across all tiers/purposes:
 *   - Free            → gpt-image-2 low
 *   - Standard/Premium subscription → gpt-image-2 medium
 *   - Single purchase (+ enterprise, when added) → gpt-image-2 high
 *   - child_avatar    → gpt-image-2 high (master reference)
 * Default OFF (legacy flux/klein routing). Flip the env var to activate the
 * cutover after style verification; a kill-switch back to legacy is just unsetting it.
 * Module-private — not exported.
 */
function isGptImage2Enabled(): boolean {
  return process.env.ENABLE_GPT_IMAGE_2 === "true";
}

/**
 * プラン設定（plans.ts）が本に焼く既定の flux 系プロファイル。gpt-image-2 全面切替時は
 * これらを「明示 override」ではなく既定値とみなしてティアルーティングに委ねる。
 */
const LEGACY_FLUX_DEFAULT_PROFILES = new Set<ImageModelProfile>([
  "pro_consistent",
  "kontext_max",
  "kontext_reference",
  "klein_base",
  "klein_fast",
]);

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
  /** 単品購入（ai_guided / photo_story）はサブスクと違い1冊あたり高収益のため high 品質。 */
  isSinglePurchase?: boolean;
}): ImageModelProfile {
  const gptImage2 = isGptImage2Enabled();

  if (params.purpose === "child_avatar" || params.purpose === "child_avatar_revision") {
    // 基準像は最重要なので常に high。
    return gptImage2 ? "openai_gpt_image_2" : "pro_consistent";
  }

  if (params.imageModelProfile) {
    // gpt-image-2 全面切替時は、プラン設定由来のレガシー flux 既定プロファイル
    // （pro_consistent / kontext_max 等）を無視してティアルーティングに回す。
    // これをしないと本に焼かれた旧プロファイルが切替をバイパスしてしまう。
    // 本物の非レガシー override（診断/明示 gpt-image-2 指定）はそのまま尊重する。
    const isLegacyFluxDefault = LEGACY_FLUX_DEFAULT_PROFILES.has(params.imageModelProfile);
    if (!(gptImage2 && isLegacyFluxDefault)) {
      return params.imageModelProfile;
    }
  }

  if (gptImage2) {
    // 全面刷新ルーティング（収益モデルで品質を出し分ける）。
    if (params.isSinglePurchase) {
      return "openai_gpt_image_2"; // 単品購入 = high
    }
    if (params.imageQualityTier === "premium" || params.imageQualityTier === "standard") {
      return "openai_gpt_image_2_medium"; // サブスク = medium
    }
    return "openai_gpt_image_2_low"; // free / light = low
  }

  // レガシー（flux/klein）ルーティング。
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
    case "openai_gpt_image_2":
      // high gpt-image-2 → fall back to flux-2-pro, then klein_fast last resort.
      return ["openai_gpt_image_2", "pro_consistent", "klein_fast"];
    case "openai_gpt_image_2_medium":
      return ["openai_gpt_image_2_medium", "pro_consistent", "klein_fast"];
    case "openai_gpt_image_2_low":
      return ["openai_gpt_image_2_low", "klein_fast"];
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
  return profile === "pro_consistent" || profile === "openai_standard" || profile === "openai_mini" || profile === "kontext_max" || profile === "openai_gpt_image_2" || profile === "openai_gpt_image_2_medium" || profile === "openai_gpt_image_2_low";
}
