import { describe, it, expect } from "vitest";
import { buildSnapshotDoc } from "../src/lib/slo-snapshot";
import { EMPTY_SLO } from "../src/lib/slo-metrics";

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
    const doc = buildSnapshotDoc(baseMetrics, config, 1700000000000);

    expect(doc.source).toBe("scheduled-daily-slo");
    expect(doc.window).toBe("daily");
    expect(doc.sampleSize).toBe(200);
    expect(doc.sampleUnit).toBe("books");
    expect(doc.createdBy).toBe("system");
    expect(doc.createdAtMs).toBe(1700000000000);
    expect(doc.bookCount).toBe(10);
    expect(doc.pageCount).toBe(40);
  });

  it("builds weekly snapshot doc with correct fields", () => {
    const config = { source: "scheduled-weekly-slo", window: "weekly", sampleSize: 200 };
    const doc = buildSnapshotDoc(baseMetrics, config, 1700000000000);

    expect(doc.source).toBe("scheduled-weekly-slo");
    expect(doc.window).toBe("weekly");
    expect(doc.sampleSize).toBe(200);
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
