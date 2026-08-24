import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as firestore from "firebase-admin/firestore";
import { computeAndSaveDailyMetrics, jstDayKey } from "../src/lib/daily-metrics";

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
}));

const DAY_MS = 24 * 60 * 60 * 1000;
/** 2026-05-07 03:05 JST — the time the scheduled job actually runs. */
const NOW = Date.UTC(2026, 4, 6, 18, 5, 0);

/** Captures every itemsRef.doc(id).set(payload) call. */
type Written = { id: string; payload: Record<string, unknown> };

function mockDb(written: Written[], existing: Record<string, unknown> = {}) {
  const emptySnap = { empty: true, docs: [] as unknown[] };
  const usersSnap = {
    empty: false,
    docs: [
      { data: () => ({ createdAtMs: NOW - 30 * DAY_MS, productPlan: "standard_paid" }) },
      { data: () => ({ createdAtMs: NOW - 30 * DAY_MS, productPlan: "premium_paid" }) },
      { data: () => ({ createdAtMs: NOW - 30 * DAY_MS, productPlan: "free" }) },
    ],
  };

  const db = {
    collection: (name: string) => {
      if (name === "users") return { get: async () => usersSnap };
      if (name === "books" || name === "processedStripeSessions") {
        const stage: Record<string, unknown> = { get: async () => emptySnap };
        stage.where = () => stage;
        return stage;
      }
      if (name === "adminMetrics") {
        return {
          doc: () => ({
            collection: () => ({
              doc: (id: string) => ({
                get: async () => ({
                  exists: existing[id] !== undefined,
                  data: () => existing[id],
                }),
                set: async (payload: Record<string, unknown>) => {
                  written.push({ id, payload });
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };
  (firestore.getFirestore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(db);
}

describe("computeAndSaveDailyMetrics — current-value fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });
  afterEach(() => vi.restoreAllMocks());

  it("writes paid breakdown / MRR only for the latest day", async () => {
    const written: Written[] = [];
    mockDb(written);

    const today = jstDayKey(NOW);
    const yesterday = jstDayKey(NOW - DAY_MS);
    await computeAndSaveDailyMetrics({
      startDayKey: yesterday,
      endDayKey: today,
      source: "scheduled-daily-metrics",
    });

    expect(written.map((w) => w.id)).toEqual([yesterday, today]);

    const latest = written.find((w) => w.id === today)!.payload;
    expect(latest.paidUsersStandard).toBe(1);
    expect(latest.paidUsersPremium).toBe(1);
    expect(latest.estimatedMrrJpy).toBeGreaterThan(0);
  });

  it("leaves a past day's paid breakdown / MRR untouched instead of zeroing it", async () => {
    const written: Written[] = [];
    const yesterday = jstDayKey(NOW - DAY_MS);
    // Yesterday's doc already holds the value recorded when it *was* the latest day.
    mockDb(written, {
      [yesterday]: { createdAtMs: NOW - DAY_MS, estimatedMrrJpy: 4460 },
    });

    await computeAndSaveDailyMetrics({
      startDayKey: yesterday,
      endDayKey: jstDayKey(NOW),
      source: "scheduled-daily-metrics",
    });

    const past = written.find((w) => w.id === yesterday)!.payload;
    // Omitted from the merge payload → Firestore keeps the stored 4460.
    expect(past).not.toHaveProperty("paidUsersStandard");
    expect(past).not.toHaveProperty("paidUsersPremium");
    expect(past).not.toHaveProperty("estimatedMrrJpy");
    // The back-fillable metrics are still recomputed for that day.
    expect(past.date).toBe(yesterday);
    expect(past).toHaveProperty("booksCreated");
  });
});
