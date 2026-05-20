/**
 * P3-2: Provider-neutral image provider type definitions.
 *
 * This file contains ONLY type definitions and a compile-time provider profile map.
 * No runtime routing, no provider selection, no fallback logic lives here.
 *
 * Design constraints (from docs/PHASE3_IMAGE_PROVIDER_ABSTRACTION_PLAN.md):
 *  - Candidate gate is NOT part of ImageProvider.
 *  - Production routing (which profile -> which provider) is NOT part of ImageProvider.
 *  - Fallback ordering is NOT part of ImageProvider.
 *  - Raw prompt / child name / story text / userId must NEVER be emitted to structured logs.
 *    The `prompt` field on ImageGenerationRequest is for provider input only.
 *
 * Migration status:
 *  P3-2  COMPLETE — type definitions added here; no production code wired yet.
 *  P3-3  NEXT     — ReplicateImageAdapter wraps replicate.ts behind this interface.
 *  P3-4  FUTURE   — OpenAIImageAdapter wraps openai-image.ts (candidate-only).
 */

import type { ImageModelProfile } from "./types";
import type { ErrorCategory, ErrorCode } from "./generation-event-logger";

// -------------------------------------------------------------------------
// Provider identity
// -------------------------------------------------------------------------

/**
 * Stable identifier for an image generation provider.
 * Matches the `ImageProvider` type already used in generation-event-logger.ts.
 * Kept as a distinct alias here so adapters import from this module going forward.
 */
export type ImageProviderId = "replicate" | "openai";

// -------------------------------------------------------------------------
// Capability descriptor
// -------------------------------------------------------------------------

/**
 * Static capability declaration for a provider implementation.
 * Used to guide request construction and to avoid sending unsupported fields.
 */
export interface ImageProviderCapabilities {
  /** Provider accepts a text prompt and generates an image from scratch. */
  supportsTextToImage: boolean;
  /** Provider accepts an input image and produces a variation / edit. */
  supportsImageToImage: boolean;
  /**
   * Provider accepts reference images (character photos) for visual consistency.
   * When false, inputImageUrls should be omitted even if supplied.
   */
  supportsReferenceImages: boolean;
  /**
   * Provider benefits from detailed stylistic guidance in the prompt.
   * When false, verbose style instructions may be trimmed.
   */
  supportsDetailedGuidance: boolean;
}

// -------------------------------------------------------------------------
// Metadata (no PII)
// -------------------------------------------------------------------------

/**
 * Opaque per-request context passed through to the provider and logged for SLO tracking.
 *
 * Privacy rules — strictly enforced:
 *  - NO raw userId, childName, userName, parentName.
 *  - NO raw prompt text, story text, or any LLM-generated narrative content.
 *  - bookId and templateId are system-generated identifiers — safe to log.
 *  - candidateRequested / candidateAllowed record gate state, not identity.
 */
export interface ImageGenerationMetadata {
  /** System-generated book document ID. Safe to log. */
  bookId?: string;
  /** Zero-based index of the page within the book. */
  pageIndex?: number;
  /** Template identifier when applicable. Safe to log. */
  templateId?: string;
  /** Coarse creation mode ("fixed_template" | "guided_ai" | "original_ai"). */
  generationMode?: string;
  /** Whether the caller requested a candidate profile. */
  candidateRequested?: boolean;
  /** Whether the candidate gate allowed it. */
  candidateAllowed?: boolean;
}

// -------------------------------------------------------------------------
// Request
// -------------------------------------------------------------------------

/**
 * Provider-neutral input for a single image generation call.
 *
 * IMPORTANT: `prompt` is for provider input only.
 * It must NEVER be written to structured Cloud Logging events
 * (see generation-event-logger.ts privacy rules).
 */
export interface ImageGenerationRequest {
  /**
   * Full image generation prompt assembled by the prompt-builder.
   * Must not be emitted to structured logs.
   */
  prompt: string;
  /** Optional negative prompt (provider support varies). */
  negativePrompt?: string;
  /**
   * Target aspect ratio expressed as "W:H" (e.g. "4:3").
   * Providers map this to their own size/ratio parameter.
   */
  aspectRatio?: string;
  /** Explicit pixel width — used when aspectRatio is not sufficient. */
  width?: number;
  /** Explicit pixel height — used when aspectRatio is not sufficient. */
  height?: number;
  /**
   * Optional character-reference image URLs for visual consistency.
   * Only used when the provider's capabilities.supportsReferenceImages is true.
   * Must not include style-card preview images.
   */
  inputImageUrls?: string[];
  /** Resolved image model profile for this request. */
  imageModelProfile: ImageModelProfile;
  /**
   * Per-request timeout in milliseconds.
   * Providers must honour this; callers use withImageTimeout from replicate.ts for now.
   */
  timeoutMs?: number;
  /** Non-PII context for logging and debugging. */
  metadata?: ImageGenerationMetadata;
}

// -------------------------------------------------------------------------
// Result
// -------------------------------------------------------------------------

/**
 * Successful result returned by a provider's generateImage() call.
 */
export interface ImageGenerationResult {
  /** Public URL of the generated image (Cloud Storage or provider CDN URL). */
  imageUrl: string;
  /** Which provider produced this result. */
  providerId: ImageProviderId;
  /** Human-readable model label stored in Firestore page metadata. */
  modelLabel: string;
  /** The profile that was actually used to produce this result. */
  profile: ImageModelProfile;
  /** Wall-clock duration of the generation call in milliseconds. */
  durationMs?: number;
  /** True when a fallback profile was used instead of the primary. */
  fallbackUsed?: boolean;
}

// -------------------------------------------------------------------------
// Failure
// -------------------------------------------------------------------------

/**
 * Normalized failure descriptor returned by classifyError() on an adapter.
 * Compatible with the error taxonomy in generation-event-logger.ts.
 */
export interface ImageGenerationFailure {
  /** Which provider raised this failure. */
  providerId: ImageProviderId;
  /** The profile that was in use when the failure occurred. */
  profile: ImageModelProfile;
  /** Coarse error category for SLO aggregation. */
  errorCategory: ErrorCategory;
  /** Machine-readable error code for dashboards and alerting. */
  errorCode: ErrorCode;
  /** Whether a retry is likely to succeed. */
  retryable?: boolean;
  /** Wall-clock duration before failure in milliseconds. */
  durationMs?: number;
  /**
   * Optional human-readable summary — must never contain prompt text,
   * child names, or any PII. Truncate to ≤120 chars before logging.
   */
  safeMessage?: string;
}

// -------------------------------------------------------------------------
// Interface
// -------------------------------------------------------------------------

/**
 * Provider-neutral interface for image generation adapters.
 *
 * Adapters (P3-3 ReplicateImageAdapter, P3-4 OpenAIImageAdapter) implement this.
 * Candidate gate, routing policy, and fallback ordering remain OUTSIDE this interface.
 *
 * Lifecycle:
 *  1. Caller resolves which adapter to use (P3-3+ routing layer, not yet wired in P3-2).
 *  2. Caller calls generateImage(request) — adapter handles provider API details.
 *  3. On error, caller may call classifyError(err) to get a normalized failure descriptor.
 *  4. Caller calls resolveModelLabel(profile) to obtain the Firestore page metadata label.
 */
export interface ImageProvider {
  /** Stable provider identifier. */
  readonly providerId: ImageProviderId;
  /** Static capability declaration — must not change at runtime. */
  readonly capabilities: ImageProviderCapabilities;
  /**
   * Generate a single image.
   * Throws on failure — callers should catch and call classifyError.
   */
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  /**
   * Classify an unknown error thrown by generateImage() into a normalized failure descriptor.
   * Must not re-throw. Must return a valid ImageGenerationFailure for any input.
   */
  classifyError(error: unknown, context: { profile: ImageModelProfile }): ImageGenerationFailure;
  /**
   * Return the Firestore-safe model label string for a given profile.
   * Example: "black-forest-labs/flux-2-pro", "openai/gpt-4o", "openai/gpt-image-1-mini".
   */
  resolveModelLabel(profile: ImageModelProfile): string;
  /**
   * Optional: validate that required environment variables / SDK clients are present.
   * Called during adapter construction, not per-request.
   */
  validateConfig?(): void;
}

// -------------------------------------------------------------------------
// Profile → Provider mapping (type-level constant, not imported by production code yet)
// -------------------------------------------------------------------------

/**
 * Canonical mapping from each ImageModelProfile to its owning provider.
 *
 * P3-7: This is now the single source of truth for profile → provider attribution.
 * `resolveProviderFromProfile()` in generation-event-logger.ts delegates to this map.
 *
 * IMPORTANT:
 *  - When adding a new ImageModelProfile to types.ts, add it here too.
 *  - Page image generation routing is handled by PROFILE_PROVIDER_MAP in
 *    generatePageImageWithFallback (generate-book.ts). (P3-15)
 *  - Cover image and character reference generation still use the legacy imageClient path.
 *  - This mapping must stay consistent with CANDIDATE_IMAGE_PROFILES in replicate.ts.
 */
export const PROFILE_PROVIDER_MAP: Record<ImageModelProfile, ImageProviderId> = {
  klein_fast:            "replicate",
  klein_base:            "replicate",
  pro_consistent:        "replicate",
  kontext_reference:     "replicate",
  flux11_pro_candidate:  "replicate",
  openai_image_candidate:"openai",
} as const;
