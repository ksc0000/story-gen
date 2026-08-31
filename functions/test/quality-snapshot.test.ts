import { describe, it, expect } from "vitest";
import {
  buildQualitySnapshotDoc,
  buildQualitySnapshotWritePayload,
} from "../src/lib/quality-snapshot";
import { computeQualityMetrics } from "../src/lib/quality-metrics";

describe("buildQualitySnapshotDoc", () => {
  const books = [
    {
      id: "b1",
      overallQualityScore: 4,
      storyQualityScore: 4,
      illustrationQualityScore: 4,
      characterConsistencyScore: 4,
      personalizationScore: 4,
      safetyScore: 5,
      qualityReviewedAtMs: Date.UTC(2026, 4, 1),
    },
    {
      id: "b2",
      overallQualityScore: 3,
      storyQualityScore: 3,
      illustrationQualityScore: 3,
      characterConsistencyScore: 3,
      personalizationScore: 3,
      safetyScore: 5,
      qualityReviewedAtMs: Date.UTC(2026, 4, 2),
    },
  ];
  const metrics = computeQualityMetrics(books);

  it("builds weekly snapshot doc with correct fields", () => {
    const config = { source: "scheduled-weekly-quality", window: "weekly" as const, sampleSize: 500 };
    // 2026-05-07 03:00 JST = 2026-05-06 18:00 UTC
    const nowMs = Date.UTC(2026, 4, 6, 18, 0, 0);
    const doc = buildQualitySnapshotDoc(metrics, config, nowMs);

    expect(doc.source).toBe("scheduled-weekly-quality");
    expect(doc.window).toBe("weekly");
    expect(doc.sampleSize).toBe(500);
    expect(doc.sampleUnit).toBe("reviewed_books");
    expect(doc.createdBy).toBe("system");
    expect(doc.snapshotKey).toBe("weekly-2026-W19");
    expect(doc.totalReviewed).toBe(2);
    expect(doc.windowEndMs).toBe(nowMs);
    expect(doc.windowStartMs).toBe(nowMs - 7 * 24 * 60 * 60 * 1000);
    // createdAtMs / updatedAtMs are NOT in buildQualitySnapshotDoc
    expect(doc).not.toHaveProperty("createdAtMs");
    expect(doc).not.toHaveProperty("updatedAtMs");
  });

  it("carries through the computed quality metrics", () => {
    const config = { source: "admin-manual", window: "weekly" as const, sampleSize: 500 };
    const doc = buildQualitySnapshotDoc(metrics, config, 1700000000000);

    expect(doc.avgOverall).toBe(metrics.avgOverall);
    expect(doc.avgStory).toBe(metrics.avgStory);
    expect(doc.avgSafety).toBe(metrics.avgSafety);
    expect(doc.regressions).toEqual(metrics.regressions);
  });
});

describe("buildQualitySnapshotWritePayload", () => {
  const config = { source: "scheduled-weekly-quality", window: "weekly" as const, sampleSize: 500 };
  const nowMs = Date.UTC(2026, 4, 6, 18, 0, 0);
  const emptyMetrics = computeQualityMetrics([]);
  const doc = buildQualitySnapshotDoc(emptyMetrics, config, nowMs);

  it("sets both createdAtMs and updatedAtMs on a new doc", () => {
    const payload = buildQualitySnapshotWritePayload(doc, nowMs, undefined);

    expect(payload.createdAtMs).toBe(nowMs);
    expect(payload.updatedAtMs).toBe(nowMs);
    expect(payload.snapshotKey).toBe("weekly-2026-W19");
  });

  it("preserves existing createdAtMs and only bumps updatedAtMs on re-run", () => {
    const originalCreatedAtMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    const rerunNowMs = nowMs + 60000;
    const payload = buildQualitySnapshotWritePayload(doc, rerunNowMs, originalCreatedAtMs);

    expect(payload.createdAtMs).toBe(originalCreatedAtMs);
    expect(payload.updatedAtMs).toBe(rerunNowMs);
  });

  it("carries through all doc fields", () => {
    const payload = buildQualitySnapshotWritePayload(doc, nowMs, undefined);

    expect(payload.source).toBe("scheduled-weekly-quality");
    expect(payload.window).toBe("weekly");
    expect(payload.sampleSize).toBe(500);
    expect(payload.sampleUnit).toBe("reviewed_books");
  });
});
