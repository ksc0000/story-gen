import { describe, it, expect } from "vitest";
import { computeKgiMetrics } from "@/lib/admin-kgi-metrics";

// 2026-09-15 12:00 JST
const NOW = Date.UTC(2026, 8, 15, 3, 0, 0);
const sep = (day: number) => Date.UTC(2026, 8, day, 3, 0, 0);
const aug = (day: number) => Date.UTC(2026, 7, day, 3, 0, 0);

describe("computeKgiMetrics", () => {
  it("定着家庭 = 当月 2 冊以上かつ 1 冊読了", () => {
    const m = computeKgiMetrics({
      nowMs: NOW,
      users: [
        { uid: "a", createdAtMs: aug(1) },
        { uid: "b", createdAtMs: aug(1) },
        { uid: "c", createdAtMs: sep(10) },
      ],
      books: [
        { userId: "a", createdAtMs: sep(2), status: "completed", readCompletedCount: 1 },
        { userId: "a", createdAtMs: sep(5), status: "completed" },
        { userId: "b", createdAtMs: sep(3), status: "completed" },
        { userId: "b", createdAtMs: sep(4), status: "failed" },
        { userId: "c", createdAtMs: sep(10) + 2 * 60 * 60 * 1000, status: "partial_completed" },
      ],
    });
    expect(m.monthKey).toBe("2026-09");
    expect(m.activeHouseholds).toBe(3);
    expect(m.retainedHouseholds).toBe(1); // a のみ
    expect(m.secondBookRate).toBe(33.3); // a / (a,b,c)
    expect(m.readThroughRate).toBe(25); // 完成 4 冊中 1 冊読了
    expect(m.newHouseholds).toBe(1); // c
    expect(m.firstBookWithin24hRate).toBe(100); // c は 2 時間後に完成
  });

  it("翌月再訪率 = 前月に作った家庭のうち当月アクティブ", () => {
    const m = computeKgiMetrics({
      nowMs: NOW,
      users: [
        { uid: "p", createdAtMs: aug(1), lastActiveAtMs: sep(3) },
        { uid: "q", createdAtMs: aug(1), lastActiveAtMs: aug(20) },
      ],
      books: [
        { userId: "p", createdAtMs: aug(10), status: "completed" },
        { userId: "q", createdAtMs: aug(11), status: "completed" },
      ],
    });
    expect(m.returnRate).toBe(50);
  });

  it("母数 0 は null", () => {
    const m = computeKgiMetrics({ nowMs: NOW, users: [], books: [] });
    expect(m.readThroughRate).toBeNull();
    expect(m.firstBookWithin24hRate).toBeNull();
    expect(m.returnRate).toBeNull();
    expect(m.retainedHouseholds).toBe(0);
  });
});
