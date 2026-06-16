/**
 * P2-2/P2-3/P4-2: Structured generation event logging and normalized error taxonomy.
 *
 * Provides typed event shapes and a thin emit helper for Firebase Functions logger.
 * Events appear as structured JSON in Cloud Logging and are intended for SLO measurement
 * and trend analysis only — NOT for alerting or real-time monitoring.
 *
 * Privacy rules (enforced by type signatures, not runtime checks):
 *  - Raw userId is NEVER included. Use `userPresent: boolean` instead.
 *  - Raw prompts, child names, and story text are NEVER included.
 *  - bookId and templateId are safe (system-generated identifiers).
 *
 * Error taxonomy (P2-3):
 *  `classifyError` accepts unknown inputs (Error objects, strings, undefined).
 *  `categorizeError` is kept for backward compatibility (string-only, P2-2).
 *  When classification is ambiguous both functions return "unknown" / "UNKNOWN" — safe default.
 *  E005 is the Replicate content-sensitivity rejection code for flux-2-pro (imagination×crayon).
 *
 * Story JSON failure taxonomy (P4-2):
 *  `classifyStoryJsonFailure` classifies story schema/parse errors into fine-grained categories.
 *  Used to populate `storyJsonFailureCategory` on `book_early_failed` events so that
 *  `malformed_json`, `field_type_mismatch`, and `schema_structural` failures are separately
 *  countable in the SLO report — distinct from image generation failures.
 */

import * as logger from "firebase-functions/logger";
import type { BookStatus, CreationMode, ImageModelProfile } from "./types";
import { PROFILE_PROVIDER_MAP } from "./image-provider";

// -------------------------------------------------------------------------
// Error taxonomy
// -------------------------------------------------------------------------

/**
 * Coarse error categories for image and story generation failures.
 *
 * | Category          | Description |
 * |-------------------|-------------|
 * | timeout           | ImageTimeoutError or deadline exceeded |
 * | safety_or_policy  | E005 or content safety rejection |
 * | provider_error    | Replicate / OpenAI API error not covered by other categories |
 * | validation        | Input validation, schema validation, or quality gate failure |
 * | quota             | Monthly generation quota exceeded |
 * | firestore         | Firestore read/write error |
 * | network           | Network connectivity error (ECONNREFUSED, ENOTFOUND, fetch failed) |
 * | unknown           | Default when classification is ambiguous |
 */
export type ErrorCategory =
  | "timeout"
  | "safety_or_policy"
  | "provider_error"
  | "validation"
  | "quota"
  | "firestore"
  | "network"
  | "unknown";

/**
 * Normalized error codes for machine-readable SLO aggregation.
 *
 * | Code                  | Meaning |
 * |-----------------------|---------|
 * | E005                  | Replicate content-sensitivity rejection (flux-2-pro, imagination×crayon) |
 * | TIMEOUT               | ImageTimeoutError or deadline exceeded |
 * | PROVIDER_5XX          | Provider returned HTTP 5xx (500, 502, 503, 529) |
 * | PROVIDER_4XX          | Provider returned HTTP 4xx (non-quota, non-E005) |
 * | QUOTA_EXCEEDED        | Rate limit or monthly generation quota exceeded |
 * | VALIDATION_FAILED     | Input/schema/quality gate validation failure |
 * | FIRESTORE_WRITE_FAILED| Firestore operation error |
 * | NETWORK_ERROR         | Network connectivity error |
 * | UNKNOWN               | Default when classification is ambiguous |
 */
export type ErrorCode =
  | "E005"
  | "TIMEOUT"
  | "PROVIDER_5XX"
  | "PROVIDER_4XX"
  | "QUOTA_EXCEEDED"
  | "VALIDATION_FAILED"
  | "FIRESTORE_WRITE_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

/**
 * P4-2: Fine-grained story JSON / schema validation failure categories.
 *
 * Used to populate `storyJsonFailureCategory` on `book_early_failed` events so that
 * pre-image story failures can be sub-classified in the SLO report.
 *
 * | Category          | Description |
 * |-------------------|-------------|
 * | malformed_json    | LLM output could not be parsed as JSON (markdown fencing, truncated, etc.) |
 * | schema_structural | JSON parsed but required fields are absent or structurally wrong |
 * | field_type_mismatch | Field present but wrong type (array where string expected, null, etc.) |
 * | field_value_invalid | Type correct but value fails enum or allowed-set check |
 * | provider_error    | Gemini API returned an error (non-retryable, classified separately from story_generation) |
 * | timeout           | Story generation exceeded time budget (no explicit timeout today — reserved) |
 * | unknown           | Classification not possible from available error signals |
 */
export type StoryJsonFailureCategory =
  | "malformed_json"
  | "schema_structural"
  | "field_type_mismatch"
  | "field_value_invalid"
  | "provider_error"
  | "timeout"
  | "unknown";

/**
 * Normalized error classification result returned by `classifyError`.
 */
export interface NormalizedErrorInfo {
  errorCategory: ErrorCategory;
  errorCode: ErrorCode;
}

/**
 * Image provider family — inferred from imageModelProfile.
 * Used to distinguish Replicate vs OpenAI failures in SLO logs.
 */
export type ImageProvider = "replicate" | "openai";

// -------------------------------------------------------------------------
// Event types
// -------------------------------------------------------------------------

/**
 * Candidate gate outcome for a single generation request.
 * "pass"           — candidate profile was requested and allowed (user enrolled).
 * "blocked"        — candidate profile was requested but stripped (user not enrolled).
 * "not_applicable" — no candidate profile was requested.
 */
export type CandidateDecision = "pass" | "blocked" | "not_applicable";

/**
 * Fired once when a book generation begins, immediately after the candidate gate check.
 * Emitted from the `generateBook` Cloud Function trigger (not from processBookGeneration).
 */
export interface GenerationStartedEvent {
  eventName: "generation_started";
  bookId: string;
  /** True when a userId was present on the book document. Raw userId is intentionally omitted. */
  userPresent: boolean;
  templateId?: string;
  requestedImageModelProfile?: ImageModelProfile;
  resolvedImageModelProfile?: ImageModelProfile;
  candidateRequested: boolean;
  candidateAllowed: boolean;
  candidateDecision: CandidateDecision;
}

/**
 * Fired when a book reaches a terminal status after image generation completes (step 9).
 * Covers all three terminal statuses: completed, partial_completed, and failed (all-pages-failed).
 * Early-exit failures (Gemini, validation) emit BookEarlyFailedEvent instead.
 *
 * P4-2 addition:
 *  - `storyDurationMs`: wall time spent in story generation in milliseconds.
 *    Enables per-phase latency breakdown: story generation vs image generation.
 */
export interface BookOutcomeEvent {
  eventName: "book_outcome";
  bookId: string;
  userPresent: boolean;
  templateId?: string;
  creationMode?: CreationMode;
  resolvedImageModelProfile?: ImageModelProfile;
  bookStatus: BookStatus;
  totalPages: number;
  completedPages: number;
  failedPages: number;
  fallbackPages: number;
  timedOutPages: number;
  durationMs: number;
  /** P4-2: Story generation wall time in ms (from Gemini call start to completion). */
  storyDurationMs?: number;
}

/**
 * Fired when a book fails before image generation begins (validation, story gen, quality gate).
 * Does NOT include raw error messages — use `failureStage` + `errorCategory` for classification.
 *
 * P4-2 additions:
 *  - `storyJsonFailureCategory`: present when `failureStage = "schema_validation"`; classifies
 *    the specific JSON parse / schema failure type for SLO sub-aggregation.
 *  - `storyDurationMs`: wall time spent in story generation (including retries) before the
 *    failure, in milliseconds. Enables story latency analysis separate from image latency.
 */
export interface BookEarlyFailedEvent {
  eventName: "book_early_failed";
  bookId: string;
  userPresent: boolean;
  templateId?: string;
  creationMode?: CreationMode;
  failureStage: string;
  failureProvider: string;
  errorCategory: ErrorCategory;
  retryable: boolean;
  /** P4-2: Fine-grained JSON failure category. Only present when failureStage = "schema_validation". */
  storyJsonFailureCategory?: StoryJsonFailureCategory;
  /** P4-2: Story generation wall time in ms (from Gemini call start to failure). */
  storyDurationMs?: number;
  /**
   * P4-5: Number of outer story generation attempts made before the final failure.
   * Present only when a schema repair retry was attempted (ENABLE_SCHEMA_REPAIR_RETRY=true)
   * and all attempts failed. Value 2 means both the initial attempt and the retry failed.
   */
  storyGenerationAttempts?: number;
  /**
   * P4-12d: Privacy-safe structural diagnostics for responseSchema JSON parse failures.
   * Present only when ENABLE_RESPONSE_SCHEMA=true and story JSON parsing failed.
   * Contains only numeric/boolean metadata — NEVER raw text, substrings, or PII.
   */
  storyJsonParseDiagnostics?: Record<string, unknown>;
}

/**
 * Fired when a single page image (or cover) is successfully generated.
 * Used for usage monitoring and provider cost comparison.
 */
export interface PageImageSucceededEvent {
  eventName: "page_image_succeeded";
  bookId: string;
  /** 0-indexed for pages. -1 is conventionally used for book cover. */
  pageIndex: number;
  /** The final tried profile that succeeded. */
  imageModelProfile: ImageModelProfile;
  /** The actual model string used (e.g. "black-forest-labs/flux-2-pro"). */
  imageModel: string;
  provider: ImageProvider;
  durationMs: number;
  attemptCount: number;
  /** True when a fallback profile was attempted and succeeded. */
  fallbackUsed: boolean;
}

/**
 * Fired when all fallback profiles are exhausted for a single page image.
 * Does NOT include the prompt text.
 */
export interface PageImageFailedEvent {
  eventName: "page_image_failed";
  bookId: string;
  pageIndex: number;
  /** The originally requested profile (primary). */
  primaryProfile: ImageModelProfile;
  /** The final tried profile (may equal primaryProfile when no fallback was attempted). */
  imageModelProfile: ImageModelProfile;
  provider: ImageProvider;
  /** Always true when emitted from generatePageImageWithFallback (all profiles exhausted). */
  isFinalFallbackFailure: boolean;
  /** True when a fallback profile was attempted. */
  fallbackUsed: boolean;
  attemptCount: number;
  timeoutCount: number;
  durationMs: number;
  /** Raw failure reason string, truncated to 120 chars. Prompts are never the reason. */
  failureReason?: string;
  errorCategory: ErrorCategory;
  errorCode: ErrorCode;
}

/**
 * Fired when prompt completeness analysis is performed for a book.
 * Summarizes how well the generated prompts capture intended story elements.
 */
export interface PromptAnalysisEvent {
  eventName: "prompt_analysis";
  bookId: string;
  templateId?: string;
  averageCompletenessScore: number;
  /** Number of pages where at least one appearing character was missing from the prompt. */
  pagesWithMissingCharacters: number;
  /** Number of pages where the visual motif (if applicable) was missing from the prompt. */
  pagesWithMissingMotifs: number;
  /** Number of pages where the hidden detail (if applicable) was missing from the prompt. */
  pagesWithMissingHiddenDetails: number;
  /** Number of pages where the page visual role keywords were missing from the prompt. */
  pagesWithMissingVisualRoles: number;
  /** Number of pages where the composition hint was missing from the prompt. */
  pagesWithMissingCompositionHints: number;
}

export type GenerationEvent =
  | GenerationStartedEvent
  | BookOutcomeEvent
  | BookEarlyFailedEvent
  | PageImageSucceededEvent
  | PageImageFailedEvent
  | PromptAnalysisEvent;

// -------------------------------------------------------------------------
// Error categorization
// -------------------------------------------------------------------------

/**
 * Categorize a generation error by its reason string on a best-effort basis.
 * Kept for backward compatibility (P2-2). Prefer `classifyError` for new call sites.
 *
 * Limitations:
 * - Accepts string input only; does not handle Error objects.
 * - Classification is keyword-based and may not be perfect.
 * - When in doubt, returns "unknown" (safe default).
 */
export function categorizeError(reason: string | undefined): ErrorCategory {
  if (!reason) return "unknown";
  const lower = reason.toLowerCase();

  // image_timeout is the literal reason set by the ImageTimeoutError path
  if (lower.includes("image_timeout") || lower.includes("timeout") || lower.includes("deadline exceeded")) {
    return "timeout";
  }

  // E005 is the Replicate content-sensitivity rejection code for flux-2-pro.
  if (
    lower.includes("e005") ||
    lower.includes("content policy") ||
    lower.includes("safety policy") ||
    lower.includes("safety filter")
  ) {
    return "safety_or_policy";
  }

  if (lower.includes("monthly") || lower.includes("quota") || lower.includes("rate limit")) {
    return "quota";
  }

  if (lower.includes("firestore")) {
    return "firestore";
  }

  if (lower.includes("schema") || lower.includes("validation") || lower.includes("parse error")) {
    return "validation";
  }

  if (lower.includes("fetch failed") || lower.includes("econnrefused") || lower.includes("enotfound") || lower.includes("network")) {
    return "network";
  }

  // Replicate/OpenAI HTTP errors not covered above
  if (
    lower.includes("replicate") ||
    lower.includes("openai") ||
    lower.includes("api error") ||
    lower.includes("http error")
  ) {
    return "provider_error";
  }

  return "unknown";
}

/**
 * Classify an unknown error (Error object, string, or other value) into a
 * normalized { errorCategory, errorCode } pair for machine-readable SLO aggregation.
 *
 * Accepts any input type:
 * - Error objects: inspects `.name` and `.message`
 * - Strings: treated as the error message directly
 * - Other / undefined: returns UNKNOWN
 *
 * Error code mapping:
 * - ImageTimeoutError (by name) or "image_timeout" message → TIMEOUT
 * - E005 / content policy in message → E005
 * - HTTP 429 or rate limit keywords → QUOTA_EXCEEDED
 * - HTTP 5xx keywords → PROVIDER_5XX
 * - HTTP 4xx keywords → PROVIDER_4XX
 * - Network connectivity keywords → NETWORK_ERROR
 * - Firestore keywords → FIRESTORE_WRITE_FAILED
 * - Schema / validation keywords → VALIDATION_FAILED
 * - Anything else → UNKNOWN
 *
 * Limitation: free-form message parsing; may not catch all provider-specific codes.
 * P2-3 documents this limitation; P2-4+ can add structured error codes if needed.
 */
export function classifyError(err: unknown): NormalizedErrorInfo {
  // ImageTimeoutError is identified by its `.name` property (avoids importing replicate.ts)
  if (err instanceof Error && err.name === "ImageTimeoutError") {
    return { errorCategory: "timeout", errorCode: "TIMEOUT" };
  }

  // Extract a message string from any input type
  let message: string;
  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "string") {
    message = err;
  } else if (err === undefined || err === null) {
    return { errorCategory: "unknown", errorCode: "UNKNOWN" };
  } else {
    // Last resort: try toString but don't trust it for classification
    message = String(err);
  }

  const lower = message.toLowerCase();

  // Timeout
  if (lower.includes("image_timeout") || lower.includes("timeout") || lower.includes("deadline exceeded")) {
    return { errorCategory: "timeout", errorCode: "TIMEOUT" };
  }

  // E005 / safety — check before HTTP status codes
  if (
    lower.includes("e005") ||
    lower.includes("content policy") ||
    lower.includes("safety policy") ||
    lower.includes("safety filter")
  ) {
    return { errorCategory: "safety_or_policy", errorCode: "E005" };
  }

  // HTTP 429 / quota
  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("monthly") ||
    lower.includes("quota")
  ) {
    return { errorCategory: "quota", errorCode: "QUOTA_EXCEEDED" };
  }

  // HTTP 5xx — detect from embedded status code or keywords
  if (
    /\b(500|502|503|504|529)\b/.test(message) ||
    lower.includes("internal server error") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable")
  ) {
    return { errorCategory: "provider_error", errorCode: "PROVIDER_5XX" };
  }

  // HTTP 4xx (non-quota, non-safety)
  if (/\b(400|401|403|404|408|409|410|422|423|424)\b/.test(message)) {
    return { errorCategory: "provider_error", errorCode: "PROVIDER_4XX" };
  }

  // Network connectivity errors
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("network error") ||
    lower.includes("network socket")
  ) {
    return { errorCategory: "network", errorCode: "NETWORK_ERROR" };
  }

  // Firestore
  if (lower.includes("firestore")) {
    return { errorCategory: "firestore", errorCode: "FIRESTORE_WRITE_FAILED" };
  }

  // Validation / schema
  if (lower.includes("schema") || lower.includes("validation") || lower.includes("parse error")) {
    return { errorCategory: "validation", errorCode: "VALIDATION_FAILED" };
  }

  return { errorCategory: "unknown", errorCode: "UNKNOWN" };
}

/**
 * P4-2: Classify a story JSON / schema validation error into a StoryJsonFailureCategory.
 *
 * Called only for errors that have already been confirmed to be story JSON failures
 * (e.g. after isStorySchemaValidationError returned true in generate-book.ts).
 *
 * Classification is based on keyword matching against error messages produced by
 * GeminiClient.generateStory() and the story schema validation layer.
 * Returns "unknown" for unrecognized messages — never throws.
 *
 * Privacy rule: this function inspects error *messages* only (field names, type names,
 * structural keywords). It must never receive or log raw LLM output, prompt text,
 * child names, or story content.
 *
 * Priority order (first match wins):
 *  1. malformed_json   — JSON.parse failure or LLM response wrapping
 *  2. field_type_mismatch — field present but wrong type
 *  3. field_value_invalid — type correct but value fails enum check
 *  4. schema_structural   — required field absent or wrong structural shape
 *  5. unknown             — catch-all
 */
export function classifyStoryJsonFailure(err: unknown): StoryJsonFailureCategory {
  if (!(err instanceof Error)) return "unknown";
  const message = err.message;
  const lower = message.toLowerCase();

  // 1. JSON.parse failure — Gemini output could not be parsed as JSON at all
  if (
    message.includes("Failed to parse LLM JSON response") ||
    message.includes("LLM response") ||
    lower.includes("json.parse") ||
    lower.includes("unexpected token") ||
    lower.includes("unexpected end of")
  ) {
    return "malformed_json";
  }

  // 2. Field type mismatch — field is present but has the wrong type
  //    Observed: "'mainQuestObject' must be a string when provided"
  if (
    lower.includes("must be a string") ||
    lower.includes("must be an array") ||
    lower.includes("must be a number") ||
    lower.includes("must be a boolean") ||
    lower.includes("must be an object") ||
    lower.includes("expected string") ||
    lower.includes("expected number") ||
    lower.includes("not a string") ||
    lower.includes("not an array")
  ) {
    return "field_type_mismatch";
  }

  // 3. Field value invalid — type is correct but value does not match allowed set
  //    Observed: "pageVisualRole" errors (enum check)
  if (
    message.includes("pageVisualRole") ||
    lower.includes("must be one of") ||
    lower.includes("invalid value") ||
    lower.includes("invalid enum")
  ) {
    return "field_value_invalid";
  }

  // 4. Schema structural — required field missing or wrong structural shape
  //    Observed: "Each page must ...", "narrativeDevice ..."
  if (
    message.includes("Each page must") ||
    message.includes("narrativeDevice") ||
    lower.includes("missing required") ||
    lower.includes("is required") ||
    lower.includes("is missing") ||
    lower.includes("must be present") ||
    lower.includes("must have property") ||
    lower.includes("must have key")
  ) {
    return "schema_structural";
  }

  return "unknown";
}

/**
 * Derive the provider family from an imageModelProfile.
 *
 * P3-7: Delegates to PROFILE_PROVIDER_MAP from image-provider.ts so there is a
 * single source of truth for profile → provider attribution.
 * Emitted values are unchanged: Replicate profiles → "replicate", openai_image_candidate → "openai".
 *
 * Falls back to "replicate" for any profile not present in the map (defensive default).
 */
export function resolveProviderFromProfile(profile: ImageModelProfile): ImageProvider {
  return PROFILE_PROVIDER_MAP[profile] ?? "replicate";
}

// -------------------------------------------------------------------------
// Emit helper
// -------------------------------------------------------------------------

/**
 * Emit a structured generation event via Firebase Functions logger.
 * Severity: info (non-alertable; for SLO trend analysis only).
 *
 * All events are logged under the label "generation_event" so they can be
 * queried in Cloud Logging with:
 *   jsonPayload.message = "generation_event"
 */
export function logGenerationEvent(event: GenerationEvent): void {
  logger.info("generation_event", event);
}

/**
 * Specifically log prompt analysis diagnostics.
 */
export function logPromptAnalysis(event: PromptAnalysisEvent): void {
  logGenerationEvent(event);
}

/**
 * Classify a failure reason string into a coarse category for "Safer Retry" logging.
 * Returns one of "safety_rejection" (E005/flagged), "timeout", or "other".
 * Never logs raw error text — only the classified string is emitted.
 */
export function classifyFallbackReasonClass(
  failureReason: string | undefined
): "safety_rejection" | "timeout" | "other" {
  if (!failureReason) return "other";
  const lower = failureReason.toLowerCase();
  if (lower.includes("e005") || lower.includes("flagged") || lower.includes("sensitive")) {
    return "safety_rejection";
  }
  if (failureReason === "image_timeout" || lower.includes("timeout")) {
    return "timeout";
  }
  return "other";
}
