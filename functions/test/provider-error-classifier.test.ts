/**
 * P3-5: Tests for provider-error-classifier.ts
 *
 * Verifies that classifyProviderError() correctly classifies:
 *  - All patterns from the shared classifyError() taxonomy (regression)
 *  - NEW patterns added in P3-5 beyond the shared taxonomy
 *
 * Also verifies isProviderErrorRetryable() behavior.
 *
 * No provider API clients, Firebase, or network calls are used.
 */

import { describe, it, expect } from "vitest";
import { classifyProviderError, isProviderErrorRetryable } from "../src/lib/provider-error-classifier";
import { ImageTimeoutError } from "../src/lib/replicate";

// -------------------------------------------------------------------------
// classifyProviderError — patterns preserved from shared taxonomy (regression)
// -------------------------------------------------------------------------

describe("classifyProviderError — shared taxonomy regression", () => {
  it("ImageTimeoutError by name → TIMEOUT", () => {
    const err = new ImageTimeoutError("timed out after 120000ms");
    const result = classifyProviderError(err);
    expect(result.errorCode).toBe("TIMEOUT");
    expect(result.errorCategory).toBe("timeout");
  });

  it("'timeout' in message → TIMEOUT", () => {
    expect(classifyProviderError(new Error("request timeout"))).toMatchObject({
      errorCode: "TIMEOUT", errorCategory: "timeout",
    });
  });

  it("'deadline exceeded' → TIMEOUT", () => {
    expect(classifyProviderError(new Error("deadline exceeded after 30s"))).toMatchObject({
      errorCode: "TIMEOUT", errorCategory: "timeout",
    });
  });

  it("E005 in message → E005 / safety_or_policy", () => {
    expect(classifyProviderError(new Error("E005: content rejected"))).toMatchObject({
      errorCode: "E005", errorCategory: "safety_or_policy",
    });
  });

  it("'content policy' → E005", () => {
    expect(classifyProviderError(new Error("Rejected: content policy violation"))).toMatchObject({
      errorCode: "E005",
    });
  });

  it("'safety policy' → E005", () => {
    expect(classifyProviderError(new Error("safety policy rejection"))).toMatchObject({
      errorCode: "E005",
    });
  });

  it("'safety filter' → E005", () => {
    expect(classifyProviderError(new Error("safety filter blocked this request"))).toMatchObject({
      errorCode: "E005",
    });
  });

  it("429 → QUOTA_EXCEEDED", () => {
    expect(classifyProviderError(new Error("HTTP 429 Too Many Requests"))).toMatchObject({
      errorCode: "QUOTA_EXCEEDED", errorCategory: "quota",
    });
  });

  it("'rate limit' → QUOTA_EXCEEDED", () => {
    expect(classifyProviderError(new Error("rate limit exceeded"))).toMatchObject({
      errorCode: "QUOTA_EXCEEDED",
    });
  });

  it("503 → PROVIDER_5XX", () => {
    expect(classifyProviderError(new Error("HTTP 503 service unavailable"))).toMatchObject({
      errorCode: "PROVIDER_5XX", errorCategory: "provider_error",
    });
  });

  it("500 → PROVIDER_5XX", () => {
    expect(classifyProviderError(new Error("500 internal server error"))).toMatchObject({
      errorCode: "PROVIDER_5XX",
    });
  });

  it("400 → PROVIDER_4XX", () => {
    expect(classifyProviderError(new Error("400 bad request"))).toMatchObject({
      errorCode: "PROVIDER_4XX", errorCategory: "provider_error",
    });
  });

  it("404 → PROVIDER_4XX", () => {
    expect(classifyProviderError(new Error("resource not found: 404"))).toMatchObject({
      errorCode: "PROVIDER_4XX",
    });
  });

  it("'fetch failed' → NETWORK_ERROR", () => {
    expect(classifyProviderError(new Error("fetch failed: connection refused"))).toMatchObject({
      errorCode: "NETWORK_ERROR", errorCategory: "network",
    });
  });

  it("ENOTFOUND → NETWORK_ERROR", () => {
    expect(classifyProviderError(new Error("ENOTFOUND api.replicate.com"))).toMatchObject({
      errorCode: "NETWORK_ERROR",
    });
  });

  it("ECONNREFUSED → NETWORK_ERROR", () => {
    expect(classifyProviderError(new Error("ECONNREFUSED 127.0.0.1:443"))).toMatchObject({
      errorCode: "NETWORK_ERROR",
    });
  });

  it("unknown → UNKNOWN", () => {
    expect(classifyProviderError(new Error("something unexpected"))).toMatchObject({
      errorCode: "UNKNOWN", errorCategory: "unknown",
    });
  });

  it("undefined → UNKNOWN", () => {
    expect(classifyProviderError(undefined)).toMatchObject({ errorCode: "UNKNOWN" });
  });

  it("null → UNKNOWN", () => {
    expect(classifyProviderError(null)).toMatchObject({ errorCode: "UNKNOWN" });
  });

  it("string error → classified correctly", () => {
    expect(classifyProviderError("503 service unavailable")).toMatchObject({
      errorCode: "PROVIDER_5XX",
    });
  });
});

// -------------------------------------------------------------------------
// classifyProviderError — NEW patterns added in P3-5
// -------------------------------------------------------------------------

describe("classifyProviderError — P3-5 extended patterns", () => {
  // Safety / content policy extensions
  it("'content_policy' (underscore) → E005", () => {
    expect(classifyProviderError(new Error("Error: content_policy violation"))).toMatchObject({
      errorCode: "E005", errorCategory: "safety_or_policy",
    });
  });

  it("'moderation' → E005 / safety_or_policy", () => {
    expect(classifyProviderError(new Error("moderation check failed"))).toMatchObject({
      errorCode: "E005", errorCategory: "safety_or_policy",
    });
  });

  it("OpenAI moderation message → E005", () => {
    expect(classifyProviderError(new Error("Request blocked by moderation system"))).toMatchObject({
      errorCode: "E005",
    });
  });

  // Quota / rate limit extensions
  it("'insufficient_quota' → QUOTA_EXCEEDED", () => {
    expect(classifyProviderError(new Error("You exceeded your current quota: insufficient_quota"))).toMatchObject({
      errorCode: "QUOTA_EXCEEDED", errorCategory: "quota",
    });
  });

  // Network extensions
  it("ECONNRESET → NETWORK_ERROR", () => {
    expect(classifyProviderError(new Error("read ECONNRESET"))).toMatchObject({
      errorCode: "NETWORK_ERROR", errorCategory: "network",
    });
  });

  it("ETIMEDOUT (TCP timeout) → NETWORK_ERROR (not TIMEOUT)", () => {
    const result = classifyProviderError(new Error("connect ETIMEDOUT 104.18.0.1:443"));
    expect(result.errorCode).toBe("NETWORK_ERROR");
    expect(result.errorCategory).toBe("network");
    // Must NOT be classified as generation-level TIMEOUT
    expect(result.errorCode).not.toBe("TIMEOUT");
  });

  // Timeout extensions
  it("'timed out' (without 'timeout' word) → TIMEOUT", () => {
    expect(classifyProviderError(new Error("request timed out after 30 seconds"))).toMatchObject({
      errorCode: "TIMEOUT", errorCategory: "timeout",
    });
  });

  // Provider 5xx extensions
  it("'overloaded' → PROVIDER_5XX", () => {
    expect(classifyProviderError(new Error("Model is overloaded, please try again"))).toMatchObject({
      errorCode: "PROVIDER_5XX", errorCategory: "provider_error",
    });
  });

  it("'provider unavailable' → PROVIDER_5XX", () => {
    expect(classifyProviderError(new Error("provider unavailable at this time"))).toMatchObject({
      errorCode: "PROVIDER_5XX", errorCategory: "provider_error",
    });
  });

  // Provider 4xx extensions
  it("'invalid input' → PROVIDER_4XX", () => {
    expect(classifyProviderError(new Error("invalid input: prompt exceeds max tokens"))).toMatchObject({
      errorCode: "PROVIDER_4XX", errorCategory: "provider_error",
    });
  });

  it("'invalid request' → PROVIDER_4XX", () => {
    expect(classifyProviderError(new Error("invalid request: missing required field"))).toMatchObject({
      errorCode: "PROVIDER_4XX", errorCategory: "provider_error",
    });
  });

  it("'bad request' → PROVIDER_4XX (not confused with 'bad gateway')", () => {
    expect(classifyProviderError(new Error("bad request: malformed parameters"))).toMatchObject({
      errorCode: "PROVIDER_4XX",
    });
    // Ensure 'bad gateway' is still PROVIDER_5XX
    expect(classifyProviderError(new Error("502 bad gateway"))).toMatchObject({
      errorCode: "PROVIDER_5XX",
    });
  });
});

// -------------------------------------------------------------------------
// ETIMEDOUT precedence: network before timeout
// -------------------------------------------------------------------------

describe("classifyProviderError — ETIMEDOUT vs TIMEOUT precedence", () => {
  it("ETIMEDOUT string does not match the 'timeout' text check (no false positive)", () => {
    // "ETIMEDOUT" lowercased = "etimedout" — does NOT contain "timeout" substring
    expect("etimedout".includes("timeout")).toBe(false);
  });

  it("ETIMEDOUT is classified as NETWORK_ERROR even though 'timed' appears in message", () => {
    const result = classifyProviderError(new Error("connection ETIMEDOUT after 30s"));
    expect(result.errorCode).toBe("NETWORK_ERROR");
  });

  it("ImageTimeoutError still classified as TIMEOUT even with ETIMEDOUT in message", () => {
    const err = new ImageTimeoutError("ETIMEDOUT");
    const result = classifyProviderError(err);
    // ImageTimeoutError by .name takes priority
    expect(result.errorCode).toBe("TIMEOUT");
  });
});

// -------------------------------------------------------------------------
// isProviderErrorRetryable
// -------------------------------------------------------------------------

describe("isProviderErrorRetryable", () => {
  it("TIMEOUT → retryable", () => {
    expect(isProviderErrorRetryable("TIMEOUT")).toBe(true);
  });

  it("PROVIDER_5XX → retryable", () => {
    expect(isProviderErrorRetryable("PROVIDER_5XX")).toBe(true);
  });

  it("NETWORK_ERROR → retryable", () => {
    expect(isProviderErrorRetryable("NETWORK_ERROR")).toBe(true);
  });

  it("PROVIDER_4XX → not retryable", () => {
    expect(isProviderErrorRetryable("PROVIDER_4XX")).toBe(false);
  });

  it("E005 → not retryable", () => {
    expect(isProviderErrorRetryable("E005")).toBe(false);
  });

  it("QUOTA_EXCEEDED → not retryable", () => {
    expect(isProviderErrorRetryable("QUOTA_EXCEEDED")).toBe(false);
  });

  it("UNKNOWN → not retryable", () => {
    expect(isProviderErrorRetryable("UNKNOWN")).toBe(false);
  });

  it("VALIDATION_FAILED → not retryable", () => {
    expect(isProviderErrorRetryable("VALIDATION_FAILED")).toBe(false);
  });

  it("FIRESTORE_WRITE_FAILED → not retryable", () => {
    expect(isProviderErrorRetryable("FIRESTORE_WRITE_FAILED")).toBe(false);
  });
});
