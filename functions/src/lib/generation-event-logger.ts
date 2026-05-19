/**
 * P2-2: Structured generation event logging.
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
 * Error taxonomy note:
 *  `categorizeError` classifies free-form reason strings on a best-effort basis.
 *  When classification is ambiguous the function returns "unknown" — this is intentional.
 *  E005 is a Replicate content-sensitivity rejection code for flux-2-pro (imagination×crayon).
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
 * | safety_or_policy  | E005 or Replicate/OpenAI content safety rejection |
 * | provider_error    | Replicate / OpenAI API error not covered by other categories |
 * | validation        | Input validation, schema validation, or quality gate failure |
 * | quota             | Monthly generation quota exceeded |
 * | firestore         | Firestore read/write error |
 * | unknown           | Default when classification is ambiguous |
 */
export type ErrorCategory =
  | "timeout"
  | "safety_or_policy"
  | "provider_error"
  | "validation"
  | "quota"
  | "firestore"
  | "unknown";

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
  imageModelProfile: ImageModelProfile;
  attemptCount: number;
  timeoutCount: number;
  durationMs: number;
  /** Raw failure reason string, truncated to 120 chars. Prompts are never the reason. */
  failureReason?: string;
  errorCategory: ErrorCategory;
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
 *
 * Limitations:
 * - Reason strings are free-form; classification is keyword-based and may not be perfect.
 * - When in doubt, returns "unknown" (safe default).
 * - E005 must appear literally in the reason string to be classified as safety_or_policy.
 *   If the Replicate SDK changes its error format, this may miss E005 events.
 */
export function categorizeError(reason: string | undefined): ErrorCategory {
  if (!reason) return "unknown";
  const lower = reason.toLowerCase();

  // image_timeout is the literal reason set by the ImageTimeoutError path
  if (lower.includes("image_timeout") || lower.includes("timeout") || lower.includes("deadline exceeded")) {
    return "timeout";
  }

  // E005 is the Replicate content-sensitivity rejection code for flux-2-pro.
  // Also catch generic safety/content/policy keywords.
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
