import { describe, it, expect } from "vitest";
import { computeSloMetrics, computePercentile, EMPTY_SLO } from "../src/lib/slo-metrics";

describe("computePercentile", () => {
  it("returns 0 for empty array", () => {
    expect(computePercentile([], 50)).toBe(0);
  });

  it("returns exact value for single element", () => {
    expect(computePercentile([100], 50)).toBe(100);
    expect(computePercentile([100], 95)).toBe(100);
  });

  it("computes p50 for sorted array", () => {
    const sorted = [1000, 2000, 3000, 4000, 5000];
    expect(computePercentile(sorted, 50)).toBe(3000);
  });

  it("interpolates for p95", () => {
    const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const p95 = computePercentile(sorted, 95);
    expect(p95).toBeGreaterThan(90);
    expect(p95).toBeLessThanOrEqual(100);
  });
});

describe("computeSloMetrics", () => {
  it("returns EMPTY_SLO for empty books", () => {
    const result = computeSloMetrics([], new Map());
    expect(result).toEqual(EMPTY_SLO);
  });

  it("ignores generating books (non-terminal)", () => {
    const books = [{ id: "b1", status: "generating" as const }];
    const result = computeSloMetrics(books, new Map());
    expect(result).toEqual(EMPTY_SLO);
  });

  it("computes 100% readable rate when all books completed", () => {
    const books = [
      { id: "b1", status: "completed" as const },
      { id: "b2", status: "completed" as const },
    ];
    const pagesMap = new Map<string, Array<{ status: "completed"; imageDurationMs: number }>>([
      ["b1", [{ status: "completed", imageDurationMs: 5000 }]],
      ["b2", [{ status: "completed", imageDurationMs: 8000 }]],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.totalBooks).toBe(2);
    expect(result.bookReadableRate).toBe(100);
    expect(result.bookHardFailedRate).toBe(0);
    expect(result.imageFailedPages).toBe(0);
  });

  it("counts partial_completed as readable", () => {
    const books = [
      { id: "b1", status: "completed" as const },
      { id: "b2", status: "partial_completed" as const },
    ];
    const pagesMap = new Map([
      ["b1", [{ status: "completed" as const }]],
      ["b2", [{ status: "completed" as const }, { status: "image_failed" as const }]],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.bookReadableRate).toBe(100);
    expect(result.bookHardFailedRate).toBe(0);
    expect(result.imageFailedPages).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.pageImageFailureRate).toBeCloseTo(33.33, 1);
  });

  it("computes hard failed rate", () => {
    const books = [
      { id: "b1", status: "completed" as const },
      { id: "b2", status: "failed" as const },
    ];
    const pagesMap = new Map([
      ["b1", [{ status: "completed" as const }]],
      ["b2", [{ status: "image_failed" as const }]],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.bookReadableRate).toBe(50);
    expect(result.bookHardFailedRate).toBe(50);
    expect(result.failedBooks).toBe(1);
  });

  it("computes fallback rate", () => {
    const books = [{ id: "b1", status: "completed" as const }];
    const pagesMap = new Map([
      [
        "b1",
        [
          { status: "completed" as const, imageFallbackUsed: false },
          { status: "fallback_completed" as const, imageFallbackUsed: true },
        ],
      ],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.fallbackPages).toBe(1);
    expect(result.fallbackRate).toBe(50);
  });

  it("detects timeout pages via imageTimeoutCount", () => {
    const books = [{ id: "b1", status: "completed" as const }];
    const pagesMap = new Map([
      [
        "b1",
        [
          { status: "completed" as const, imageTimeoutCount: 0 },
          { status: "fallback_completed" as const, imageTimeoutCount: 1 },
        ],
      ],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.timeoutPages).toBe(1);
    expect(result.timeoutRate).toBe(50);
  });

  it("detects timeout pages via imageFailureReason", () => {
    const books = [{ id: "b1", status: "partial_completed" as const }];
    const pagesMap = new Map([
      [
        "b1",
        [
          { status: "completed" as const },
          { status: "image_failed" as const, imageFailureReason: "image_timeout" },
        ],
      ],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.timeoutPages).toBe(1);
  });

  it("computes regeneration success rate", () => {
    const books = [{ id: "b1", status: "completed" as const }];
    const pagesMap = new Map([
      [
        "b1",
        [
          { status: "completed" as const, regenerationAttemptCount: 1 },
          { status: "completed" as const, regenerationAttemptCount: 2 },
          { status: "image_failed" as const, regenerationAttemptCount: 1 },
          { status: "completed" as const },
        ],
      ],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.regenerationCount).toBe(3);
    expect(result.regenerationSuccessCount).toBe(2);
    expect(result.regenerationSuccessRate).toBeCloseTo(66.67, 1);
  });

  it("computes image duration percentiles", () => {
    const books = [{ id: "b1", status: "completed" as const }];
    const pagesMap = new Map([
      [
        "b1",
        [
          { status: "completed" as const, imageDurationMs: 10000 },
          { status: "completed" as const, imageDurationMs: 20000 },
          { status: "completed" as const, imageDurationMs: 30000 },
          { status: "completed" as const, imageDurationMs: 40000 },
        ],
      ],
    ]);
    const result = computeSloMetrics(books, pagesMap);

    expect(result.imageP50Ms).toBeGreaterThan(0);
    expect(result.imageP90Ms).toBeGreaterThan(result.imageP50Ms);
    expect(result.imageP95Ms).toBeGreaterThanOrEqual(result.imageP90Ms);
  });
});
