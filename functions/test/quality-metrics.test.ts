import { describe, it, expect } from "vitest";
import { computeQualityMetrics, EMPTY_QUALITY_TREND } from "../src/lib/quality-metrics";

describe("computeQualityMetrics", () => {
  it("returns EMPTY_QUALITY_TREND for empty books", () => {
    const result = computeQualityMetrics([]);
    expect(result).toEqual(EMPTY_QUALITY_TREND);
  });

  it("computes averages correctly", () => {
    const books = [
      {
        id: "b1",
        overallQualityScore: 4,
        storyQualityScore: 5,
        illustrationQualityScore: 3,
        characterConsistencyScore: 4,
        personalizationScore: 4,
        safetyScore: 5,
        qualityReviewedAtMs: Date.now(),
      },
      {
        id: "b2",
        overallQualityScore: 2,
        storyQualityScore: 2,
        illustrationQualityScore: 2,
        characterConsistencyScore: 2,
        personalizationScore: 2,
        safetyScore: 2,
        qualityReviewedAtMs: Date.now() + 1000,
      },
    ];
    const result = computeQualityMetrics(books);

    expect(result.totalReviewed).toBe(2);
    expect(result.avgOverall).toBe(3);
    expect(result.avgStory).toBe(3.5);
    expect(result.avgIllustration).toBe(2.5);
    expect(result.avgCharacterConsistency).toBe(3);
    expect(result.avgPersonalization).toBe(3);
    expect(result.avgSafety).toBe(3.5);
  });

  it("computes score distribution correctly", () => {
    const books = [
      { id: "b1", overallQualityScore: 4.6, qualityReviewedAtMs: Date.now() }, // rounds to 5
      { id: "b2", overallQualityScore: 4.4, qualityReviewedAtMs: Date.now() }, // rounds to 4
      { id: "b3", overallQualityScore: 4.0, qualityReviewedAtMs: Date.now() }, // rounds to 4
      { id: "b4", overallQualityScore: 1.2, qualityReviewedAtMs: Date.now() }, // rounds to 1
    ];
    const result = computeQualityMetrics(books);

    expect(result.scoreDistribution[1]).toBe(1);
    expect(result.scoreDistribution[2]).toBe(0);
    expect(result.scoreDistribution[3]).toBe(0);
    expect(result.scoreDistribution[4]).toBe(2);
    expect(result.scoreDistribution[5]).toBe(1);
  });

  it("detects regressions correctly", () => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    // Previous week (align to a Monday to be safe, but buildWeeklyBuckets does it)
    const prevWeekMs = now - weekMs;

    const books = [
      // Previous week: Avg 4.0
      { id: "p1", overallQualityScore: 4, qualityReviewedAtMs: prevWeekMs },
      { id: "p2", overallQualityScore: 4, qualityReviewedAtMs: prevWeekMs },
      // Current week: Avg 3.0 (25% drop from 4.0)
      { id: "c1", overallQualityScore: 3, qualityReviewedAtMs: now },
      { id: "c2", overallQualityScore: 3, qualityReviewedAtMs: now },
    ];

    const result = computeQualityMetrics(books);
    expect(result.buckets.length).toBe(2);
    expect(result.regressions.length).toBeGreaterThan(0);
    const overallReg = result.regressions.find(r => r.axis === "overall");
    expect(overallReg).toBeDefined();
    expect(overallReg?.dropPct).toBe(25);
  });

  it("does not report regression for minor drops", () => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const prevWeekMs = now - weekMs;

    const books = [
      { id: "p1", overallQualityScore: 4, qualityReviewedAtMs: prevWeekMs },
      { id: "p2", overallQualityScore: 4, qualityReviewedAtMs: prevWeekMs },
      { id: "c1", overallQualityScore: 3.8, qualityReviewedAtMs: now },
      { id: "c2", overallQualityScore: 3.8, qualityReviewedAtMs: now },
    ];

    const result = computeQualityMetrics(books);
    expect(result.regressions.length).toBe(0);
  });
});
