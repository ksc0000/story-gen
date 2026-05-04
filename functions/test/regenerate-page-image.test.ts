import { describe, it, expect } from "vitest";
import { buildRegenerationSuccessPatch } from "../src/regenerate-page-image";

const DEL = "DELETE_SENTINEL";
const TS = "SERVER_TIMESTAMP_SENTINEL";
const NOW_MS = 1_700_000_000_000;

function patch(overrides: Partial<Parameters<typeof buildRegenerationSuccessPatch>[0]> = {}) {
  return buildRegenerationSuccessPatch({
    newPageStatus: "completed",
    imageUrl: "https://example.com/img.png",
    durationMs: 5000,
    attemptCount: 1,
    usedProfile: "pro_consistent",
    timeoutCount: 0,
    fallbackUsed: false,
    primaryProfile: "pro_consistent",
    deleteSentinel: DEL,
    serverTimestampSentinel: TS,
    nowMs: NOW_MS,
    ...overrides,
  });
}

describe("buildRegenerationSuccessPatch", () => {
  it("clears failure fields when previous page had image_failed with timeout", () => {
    const result = patch({ timeoutCount: 0, fallbackUsed: false });

    expect(result.imageFailureReason).toBe(DEL);
    expect(result.imageRetryable).toBe(DEL);
    expect(result.imageTimeoutCount).toBe(DEL);
    expect(result.imageFallbackUsed).toBe(DEL);
    expect(result.fallbackFromModelProfile).toBe(DEL);
  });

  it("clears imageFallbackUsed and fallbackFromModelProfile when regeneration succeeds without fallback", () => {
    const result = patch({
      newPageStatus: "completed",
      usedProfile: "pro_consistent",
      fallbackUsed: false,
      primaryProfile: "pro_consistent",
    });

    expect(result.status).toBe("completed");
    expect(result.imageModelProfile).toBe("pro_consistent");
    expect(result.imageFallbackUsed).toBe(DEL);
    expect(result.fallbackFromModelProfile).toBe(DEL);
    expect(result.imageFailureReason).toBe(DEL);
    expect(result.imageRetryable).toBe(DEL);
  });

  it("saves imageFallbackUsed=true and fallbackFromModelProfile when fallback was used", () => {
    const result = patch({
      newPageStatus: "fallback_completed",
      usedProfile: "klein_fast",
      fallbackUsed: true,
      primaryProfile: "pro_consistent",
    });

    expect(result.status).toBe("fallback_completed");
    expect(result.imageModelProfile).toBe("klein_fast");
    expect(result.imageFallbackUsed).toBe(true);
    expect(result.fallbackFromModelProfile).toBe("pro_consistent");
    expect(result.imageFailureReason).toBe(DEL);
    expect(result.imageRetryable).toBe(DEL);
  });

  it("saves imageTimeoutCount when timeout occurred before fallback succeeded", () => {
    const result = patch({
      newPageStatus: "fallback_completed",
      usedProfile: "klein_fast",
      fallbackUsed: true,
      primaryProfile: "pro_consistent",
      timeoutCount: 1,
    });

    expect(result.imageTimeoutCount).toBe(1);
    expect(result.imageFallbackUsed).toBe(true);
    expect(result.fallbackFromModelProfile).toBe("pro_consistent");
    expect(result.imageFailureReason).toBe(DEL);
  });

  it("includes imageRegeneratedAt sentinel and nowMs", () => {
    const result = patch();

    expect(result.imageRegeneratedAt).toBe(TS);
    expect(result.imageRegeneratedAtMs).toBe(NOW_MS);
  });

  it("sets core image fields from params", () => {
    const result = patch({ durationMs: 12345, attemptCount: 3, imageUrl: "https://example.com/x.png" });

    expect(result.imageDurationMs).toBe(12345);
    expect(result.imageAttemptCount).toBe(3);
    expect(result.imageUrl).toBe("https://example.com/x.png");
  });
});
