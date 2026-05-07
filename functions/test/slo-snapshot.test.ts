import { describe, it, expect } from "vitest";
import { buildSnapshotDoc, buildSnapshotKey } from "../src/lib/slo-snapshot";
import { EMPTY_SLO } from "../src/lib/slo-metrics";

describe("buildSnapshotKey", () => {
  it("generates daily key in JST", () => {
    // 2026-05-07 03:00 JST = 2026-05-06 18:00 UTC
    const jst3am = Date.UTC(2026, 4, 6, 18, 0, 0);
    expect(buildSnapshotKey("daily", jst3am)).toBe("daily-2026-05-07");
  });

  it("generates daily key near midnight JST boundary", () => {
    // 2026-05-07 23:59 JST = 2026-05-07 14:59 UTC
    const jst2359 = Date.UTC(2026, 4, 7, 14, 59, 0);
    expect(buildSnapshotKey("daily", jst2359)).toBe("daily-2026-05-07");
  });

  it("generates weekly key with ISO week number", () => {
    // 2026-05-07 (Thursday) is ISO week 19
    const jst3am = Date.UTC(2026, 4, 6, 18, 0, 0);
    expect(buildSnapshotKey("weekly", jst3am)).toBe("weekly-2026-W19");
  });

  it("generates weekly key for week 1 of next year", () => {
    // 2025-12-29 (Monday) is ISO week 1 of 2026
    const dec29 = Date.UTC(2025, 11, 28, 18, 0, 0); // JST 2025-12-29 03:00
    expect(buildSnapshotKey("weekly", dec29)).toBe("weekly-2026-W01");
  });

  it("pads single-digit month and day", () => {
    // 2026-01-05 03:00 JST = 2026-01-04 18:00 UTC
    const jan5 = Date.UTC(2026, 0, 4, 18, 0, 0);
    expect(buildSnapshotKey("daily", jan5)).toBe("daily-2026-01-05");
  });
});

describe("buildSnapshotDoc", () => {
  const baseMetrics = {
    ...EMPTY_SLO,
    totalBooks: 10,
    completedBooks: 8,
    partialCompletedBooks: 1,
    failedBooks: 1,
    bookReadableRate: 90,
    bookHardFailedRate: 10,
    totalPages: 40,
    imageFailedPages: 2,
    pageImageFailureRate: 5,
    imageP50Ms: 5000,
    imageP90Ms: 10000,
    imageP95Ms: 12000,
  };

  it("builds daily snapshot doc with correct fields", () => {
    const config = { source: "scheduled-daily-slo", window: "daily", sampleSize: 200 };
    // 2026-05-07 03:00 JST = 2026-05-06 18:00 UTC
    const nowMs = Date.UTC(2026, 4, 6, 18, 0, 0);
    const doc = buildSnapshotDoc(baseMetrics, config, nowMs);

    expect(doc.source).toBe("scheduled-daily-slo");
    expect(doc.window).toBe("daily");
    expect(doc.sampleSize).toBe(200);
    expect(doc.sampleUnit).toBe("books");
    expect(doc.createdBy).toBe("system");
    expect(doc.createdAtMs).toBe(nowMs);
    expect(doc.updatedAtMs).toBe(nowMs);
    expect(doc.bookCount).toBe(10);
    expect(doc.pageCount).toBe(40);
    expect(doc.snapshotKey).toBe("daily-2026-05-07");
  });

  it("builds weekly snapshot doc with correct fields", () => {
    const config = { source: "scheduled-weekly-slo", window: "weekly", sampleSize: 200 };
    const nowMs = Date.UTC(2026, 4, 6, 18, 0, 0);
    const doc = buildSnapshotDoc(baseMetrics, config, nowMs);

    expect(doc.source).toBe("scheduled-weekly-slo");
    expect(doc.window).toBe("weekly");
    expect(doc.sampleSize).toBe(200);
    expect(doc.snapshotKey).toBe("weekly-2026-W19");
  });

  it("preserves all SLO metrics in the doc", () => {
    const config = { source: "scheduled-daily-slo", window: "daily", sampleSize: 100 };
    const doc = buildSnapshotDoc(baseMetrics, config, 1700000000000);

    expect(doc.bookReadableRate).toBe(90);
    expect(doc.bookHardFailedRate).toBe(10);
    expect(doc.totalBooks).toBe(10);
    expect(doc.totalPages).toBe(40);
    expect(doc.imageP95Ms).toBe(12000);
    expect(doc.pageImageFailureRate).toBe(5);
  });

  it("handles empty metrics", () => {
    const config = { source: "scheduled-daily-slo", window: "daily", sampleSize: 200 };
    const doc = buildSnapshotDoc(EMPTY_SLO, config, 1700000000000);

    expect(doc.totalBooks).toBe(0);
    expect(doc.bookCount).toBe(0);
    expect(doc.pageCount).toBe(0);
    expect(doc.source).toBe("scheduled-daily-slo");
  });
});
