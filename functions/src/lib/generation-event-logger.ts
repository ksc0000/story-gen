/**
 * P2-2/P2-3: Structured generation event logging and normalized error taxonomy.
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
 */

import * as logger from "firebase-functions/logger";
import type { BookStatus, CreationMode, ImageModelProfile } from "./types";

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
}

/**
 * Fired when a book fails before image generation begins (validation, story gen, quality gate).
 * Does NOT include raw error messages — use `failureStage` + `errorCategory` for classification.
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

export type GenerationEvent =
  | GenerationStartedEvent
  | BookOutcomeEvent
  | BookEarlyFailedEvent
  | PageImageFailedEvent;

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
 * Derive the provider family from an imageModelProfile.
 * Only `openai_image_candidate` uses OpenAI; all other profiles use Replicate.
 */
export function resolveProviderFromProfile(profile: ImageModelProfile): ImageProvider {
  return profile === "openai_image_candidate" ? "openai" : "replicate";
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
