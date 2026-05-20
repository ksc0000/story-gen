/**
 * P3-5: Provider-aware error classification helper.
 *
 * Provides more precise error detection than the shared classifyError() in
 * generation-event-logger.ts by recognizing additional provider-specific patterns
 * before falling back to the shared taxonomy.
 *
 * IMPORTANT: No new ErrorCategory or ErrorCode values are introduced.
 * All classifications map to the existing P2 taxonomy:
 *   - safety_or_policy / E005
 *   - timeout / TIMEOUT
 *   - quota / QUOTA_EXCEEDED
 *   - provider_error / PROVIDER_5XX
 *   - provider_error / PROVIDER_4XX
 *   - network / NETWORK_ERROR
 *   - unknown / UNKNOWN
 *
 * Patterns added beyond the shared classifyError():
 *   - "content_policy" (underscore) → E005     (shared checks "content policy" with space)
 *   - "moderation"                  → E005     (both Replicate and OpenAI)
 *   - "insufficient_quota"          → QUOTA_EXCEEDED (OpenAI specific)
 *   - "timed out"                   → TIMEOUT  (shared checks "timeout")
 *   - ECONNRESET                    → NETWORK_ERROR
 *   - ETIMEDOUT                     → NETWORK_ERROR (TCP timeout ≠ generation timeout)
 *   - "overloaded"                  → PROVIDER_5XX
 *   - "provider unavailable"        → PROVIDER_5XX
 *   - "invalid input"               → PROVIDER_4XX
 *   - "invalid request"             → PROVIDER_4XX
 *   - "bad request"                 → PROVIDER_4XX
 *
 * Design constraints:
 *   - Must not depend on provider API clients (Replicate, OpenAI).
 *   - Must not import Firebase or Cloud Functions.
 *   - Must not emit any logs.
 *   - Preserves existing P2 taxonomy exactly.
 *   - Falls back to shared classifyError() for anything not matched here.
 */

import { classifyError } from "./generation-event-logger";
import type { ErrorCode, NormalizedErrorInfo } from "./generation-event-logger";

// -------------------------------------------------------------------------
// Retryable determination
// -------------------------------------------------------------------------

/**
 * Returns true when a given ErrorCode indicates that a retry is likely to succeed.
 * Centralizes retryable logic to keep both adapters consistent.
 */
export function isProviderErrorRetryable(errorCode: ErrorCode): boolean {
  return (
    errorCode === "PROVIDER_5XX" ||
    errorCode === "NETWORK_ERROR" ||
    errorCode === "TIMEOUT"
  );
}

// -------------------------------------------------------------------------
// Extended classification
// -------------------------------------------------------------------------

/**
 * Classify an error with provider-specific pattern awareness.
 *
 * Checks additional patterns (beyond the shared classifyError) that are
 * common to Replicate and OpenAI provider errors. Falls back to the
 * shared classifyError() from generation-event-logger.ts for anything
 * not matched here, ensuring taxonomy consistency.
 *
 * Priority order:
 *   1. ImageTimeoutError by .name   → TIMEOUT
 *   2. Safety / content policy      → E005
 *   3. Quota / rate limit           → QUOTA_EXCEEDED
 *   4. Network connectivity         → NETWORK_ERROR  (ECONNRESET, ETIMEDOUT before generic timeout)
 *   5. Timeout                      → TIMEOUT
 *   6. Provider 5xx                 → PROVIDER_5XX
 *   7. Provider 4xx                 → PROVIDER_4XX
 *   8. Fallback to shared taxonomy
 *
 * Note on ETIMEDOUT: this is a TCP-level connection timeout (Node.js ETIMEDOUT
 * error code) and is classified as NETWORK_ERROR, not the generation-level TIMEOUT.
 * The generation-level ImageTimeoutError is handled separately in step 1.
 */
export function classifyProviderError(error: unknown): NormalizedErrorInfo {
  // 1. ImageTimeoutError identified by .name (avoids importing replicate.ts)
  if (error instanceof Error && error.name === "ImageTimeoutError") {
    return { errorCategory: "timeout", errorCode: "TIMEOUT" };
  }

  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (error === null || error === undefined) {
    return classifyError(error);
  } else {
    return classifyError(error);
  }

  const lower = message.toLowerCase();

  // 2. Safety / content policy patterns
  //    Shared: "content policy", "safety policy", "safety filter", "e005"
  //    Extended: "content_policy" (underscore), "moderation"
  if (
    lower.includes("e005") ||
    lower.includes("content policy") ||
    lower.includes("content_policy") ||
    lower.includes("safety policy") ||
    lower.includes("safety filter") ||
    lower.includes("moderation")
  ) {
    return { errorCategory: "safety_or_policy", errorCode: "E005" };
  }

  // 3. Quota / rate limit patterns
  //    Shared: "429", "rate limit", "monthly", "quota"
  //    Extended: "insufficient_quota"
  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("monthly") ||
    lower.includes("quota") ||
    lower.includes("insufficient_quota")
  ) {
    return { errorCategory: "quota", errorCode: "QUOTA_EXCEEDED" };
  }

  // 4. Network connectivity errors (before generic timeout)
  //    Shared: "fetch failed", "econnrefused", "enotfound", "network error", "network socket"
  //    Extended: "econnreset", "etimedout" (TCP timeout), "enotconn"
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("network error") ||
    lower.includes("network socket") ||
    lower.includes("enotconn")
  ) {
    return { errorCategory: "network", errorCode: "NETWORK_ERROR" };
  }

  // 5. Generation-level timeout
  //    Shared: "image_timeout", "timeout", "deadline exceeded"
  //    Extended: "timed out" (separate from "timeout")
  if (
    lower.includes("image_timeout") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline exceeded")
  ) {
    return { errorCategory: "timeout", errorCode: "TIMEOUT" };
  }

  // 6. Provider 5xx errors
  //    Shared: 500/502/503/504/529, "internal server error", "bad gateway", "service unavailable"
  //    Extended: "overloaded", "provider unavailable"
  if (
    /\b(500|502|503|504|529)\b/.test(message) ||
    lower.includes("internal server error") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("provider unavailable")
  ) {
    return { errorCategory: "provider_error", errorCode: "PROVIDER_5XX" };
  }

  // 7. Provider 4xx errors
  //    Shared: 400/401/403/404/408/409/410/422/423/424
  //    Extended: "invalid input", "invalid request", "bad request"
  if (
    /\b(400|401|403|404|408|409|410|422|423|424)\b/.test(message) ||
    lower.includes("invalid input") ||
    lower.includes("invalid request") ||
    lower.includes("bad request")
  ) {
    return { errorCategory: "provider_error", errorCode: "PROVIDER_4XX" };
  }

  // 8. Fall back to shared taxonomy for anything not matched above.
  //    Covers: firestore, validation, and any remaining provider keywords.
  return classifyError(error);
}
