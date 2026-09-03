import { describe, it, expect } from "vitest";
import { currentUsageYearMonth } from "@/lib/monthly-usage";

describe("currentUsageYearMonth", () => {
  it("サーバ（UTC）と同じ YYYY-MM キーを作る", () => {
    expect(currentUsageYearMonth(new Date("2026-09-03T00:59:00Z"))).toBe("2026-09");
    expect(currentUsageYearMonth(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01");
  });
  it("月末の JST 深夜（UTC ではまだ前月）はサーバと同じく前月扱い", () => {
    // 2026-10-01 05:00 JST = 2026-09-30 20:00 UTC
    expect(currentUsageYearMonth(new Date("2026-09-30T20:00:00Z"))).toBe("2026-09");
  });
});
