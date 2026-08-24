import { describe, it, expect, vi, beforeEach } from "vitest";
import * as firestore from "firebase-admin/firestore";
import {
  resolveWindowStartMs,
  buildSnapshotDoc,
  saveSloSnapshot,
} from "../src/lib/slo-snapshot";
import { saveQualitySnapshot } from "../src/lib/quality-snapshot";
import { EMPTY_SLO } from "../src/lib/slo-metrics";

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
  FieldValue: { serverTimestamp: vi.fn() },
  Timestamp: { fromMillis: (ms: number) => ({ __ms: ms }) },
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 4, 6, 18, 0, 0); // 2026-05-07 03:00 JST

/* ------------------------------------------------------------------ */
/*  resolveWindowStartMs                                               */
/* ------------------------------------------------------------------ */
describe("resolveWindowStartMs", () => {
  it("returns now - 24h for the daily window", () => {
    expect(resolveWindowStartMs("daily", NOW)).toBe(NOW - DAY_MS);
  });

  it("returns now - 7d for the weekly window", () => {
    expect(resolveWindowStartMs("weekly", NOW)).toBe(NOW - 7 * DAY_MS);
  });

  it("returns null (= no time filter) for an unknown window", () => {
    expect(resolveWindowStartMs("all-time", NOW)).toBeNull();
    expect(resolveWindowStartMs("", NOW)).toBeNull();
  });

  it("gives daily and weekly different starts so the two snapshots differ", () => {
    expect(resolveWindowStartMs("daily", NOW)).not.toBe(
      resolveWindowStartMs("weekly", NOW),
    );
  });
});

/* ------------------------------------------------------------------ */
/*  buildSnapshotDoc records the window it covers                      */
/* ------------------------------------------------------------------ */
describe("buildSnapshotDoc window bounds", () => {
  it("records windowStartMs / windowEndMs for a daily snapshot", () => {
    const doc = buildSnapshotDoc(
      EMPTY_SLO,
      { source: "scheduled-daily-slo", window: "daily", sampleSize: 200 },
      NOW,
    );
    expect(doc.windowStartMs).toBe(NOW - DAY_MS);
    expect(doc.windowEndMs).toBe(NOW);
  });

  it("records a null windowStartMs for an unwindowed snapshot", () => {
    const doc = buildSnapshotDoc(
      EMPTY_SLO,
      { source: "admin-manual", window: "all-time", sampleSize: 200 },
      NOW,
    );
    expect(doc.windowStartMs).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  The scheduled runners actually apply the window to the query       */
/* ------------------------------------------------------------------ */
describe("saveSloSnapshot query window", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Wires a books collection whose query chain records its where() calls. */
  function mockDb(whereCalls: unknown[][]) {
    const stage: Record<string, unknown> = {
      limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
    };
    stage.where = (...args: unknown[]) => {
      whereCalls.push(args);
      return stage;
    };
    const db = {
      collection: (name: string) => {
        if (name === "books") return { orderBy: () => stage };
        throw new Error(`unexpected collection ${name}`);
      },
    };
    (firestore.getFirestore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(db);
  }

  it("filters books to the last 24h for the daily window", async () => {
    const whereCalls: unknown[][] = [];
    mockDb(whereCalls);
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    const result = await saveSloSnapshot({
      source: "test",
      window: "daily",
      sampleSize: 200,
    });

    expect(whereCalls).toHaveLength(1);
    expect(whereCalls[0][0]).toBe("createdAt");
    expect(whereCalls[0][1]).toBe(">=");
    expect(whereCalls[0][2]).toEqual({ __ms: NOW - DAY_MS });
    // No books in the window → nothing is written.
    expect(result.saved).toBe(false);
  });

  it("filters books to the last 7d for the weekly window", async () => {
    const whereCalls: unknown[][] = [];
    mockDb(whereCalls);
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await saveSloSnapshot({ source: "test", window: "weekly", sampleSize: 200 });

    expect(whereCalls[0][2]).toEqual({ __ms: NOW - 7 * DAY_MS });
  });

  it("applies no time filter for an unknown window", async () => {
    const whereCalls: unknown[][] = [];
    mockDb(whereCalls);
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await saveSloSnapshot({ source: "test", window: "all-time", sampleSize: 200 });

    expect(whereCalls).toHaveLength(0);
  });
});

describe("saveQualitySnapshot query window", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters reviewed books to the last 7d", async () => {
    const whereCalls: unknown[][] = [];
    const stage: Record<string, unknown> = {
      limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
    };
    stage.where = (...args: unknown[]) => {
      whereCalls.push(args);
      return stage;
    };
    (firestore.getFirestore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      collection: () => ({ orderBy: () => stage }),
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    const result = await saveQualitySnapshot({
      source: "test",
      window: "weekly",
      sampleSize: 500,
    });

    expect(whereCalls).toHaveLength(1);
    expect(whereCalls[0]).toEqual([
      "qualityReviewedAtMs",
      ">=",
      NOW - 7 * DAY_MS,
    ]);
    expect(result.saved).toBe(false);
  });
});
