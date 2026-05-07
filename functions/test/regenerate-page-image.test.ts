import { describe, it, expect } from "vitest";
import { buildRegenerationSuccessPatch, deriveBookMetrics } from "../src/regenerate-page-image";

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

describe("deriveBookMetrics", () => {
  it("returns completed when all pages are completed or fallback_completed", () => {
    const pages = [
      { status: "completed" as const, pageNumber: 0 },
      { status: "completed" as const, pageNumber: 1 },
      { status: "fallback_completed" as const, pageNumber: 2 },
      { status: "completed" as const, pageNumber: 3 },
    ];
    const result = deriveBookMetrics(pages);

    expect(result.bookStatus).toBe("completed");
    expect(result.generationReliabilityStatus).toBe("ok");
    expect(result.imageSuccessCount).toBe(4);
    expect(result.imageFailureCount).toBe(0);
    expect(result.failedPageNumbers).toEqual([]);
    expect(result.pendingPageNumbers).toEqual([]);
  });

  it("returns partial_completed when some pages are image_failed", () => {
    const pages = [
      { status: "completed" as const, pageNumber: 0 },
      { status: "image_failed" as const, pageNumber: 1 },
      { status: "completed" as const, pageNumber: 2 },
      { status: "completed" as const, pageNumber: 3 },
    ];
    const result = deriveBookMetrics(pages);

    expect(result.bookStatus).toBe("partial_completed");
    expect(result.generationReliabilityStatus).toBe("partial");
    expect(result.imageSuccessCount).toBe(3);
    expect(result.imageFailureCount).toBe(1);
    expect(result.failedPageNumbers).toEqual([1]);
  });

  it("returns partial_completed when pages are still generating", () => {
    const pages = [
      { status: "completed" as const, pageNumber: 0 },
      { status: "generating" as const, pageNumber: 1 },
      { status: "completed" as const, pageNumber: 2 },
      { status: "completed" as const, pageNumber: 3 },
    ];
    const result = deriveBookMetrics(pages);

    expect(result.bookStatus).toBe("partial_completed");
    expect(result.pendingPageNumbers).toEqual([1]);
  });

  it("returns failed when all pages are image_failed", () => {
    const pages = [
      { status: "image_failed" as const, pageNumber: 0 },
      { status: "image_failed" as const, pageNumber: 1 },
      { status: "image_failed" as const, pageNumber: 2 },
      { status: "image_failed" as const, pageNumber: 3 },
    ];
    const result = deriveBookMetrics(pages);

    expect(result.bookStatus).toBe("failed");
    expect(result.generationReliabilityStatus).toBe("failed");
    expect(result.imageSuccessCount).toBe(0);
    expect(result.imageFailureCount).toBe(4);
  });

  it("transitions from partial to completed when failed page is regenerated", () => {
    // Simulate: page 1 was image_failed, now all completed
    const pages = [
      { status: "completed" as const, pageNumber: 0 },
      { status: "fallback_completed" as const, pageNumber: 1 },
      { status: "completed" as const, pageNumber: 2 },
      { status: "completed" as const, pageNumber: 3 },
    ];
    const result = deriveBookMetrics(pages);

    expect(result.bookStatus).toBe("completed");
    expect(result.generationReliabilityStatus).toBe("ok");
    expect(result.imageFailureCount).toBe(0);
    expect(result.failedPageNumbers).toEqual([]);
  });

  it("handles empty pages array", () => {
    const result = deriveBookMetrics([]);

    expect(result.totalImageCount).toBe(0);
    expect(result.bookStatus).toBe("completed");
    expect(result.generationReliabilityStatus).toBe("ok");
  });
});
