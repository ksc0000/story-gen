import { describe, it, expect } from "vitest";
import { jstDayKey, jstDayStartMs } from "../src/lib/daily-metrics";

/* ------------------------------------------------------------------ */
/*  jstDayKey                                                          */
/* ------------------------------------------------------------------ */
describe("jstDayKey", () => {
  it("converts a UTC midnight timestamp to the same-day JST key (JST is ahead of UTC)", () => {
    // 2026-05-07T00:00:00Z -> 2026-05-07T09:00:00+09:00
    expect(jstDayKey(Date.UTC(2026, 4, 7, 0, 0, 0))).toBe("2026-05-07");
  });

  it("rolls over to the next JST day for a UTC time in the last 9 hours of the day", () => {
    // 2026-05-07T15:30:00Z -> 2026-05-08T00:30:00+09:00
    expect(jstDayKey(Date.UTC(2026, 4, 7, 15, 30, 0))).toBe("2026-05-08");
  });

  it("does not roll over for a UTC time just before the JST day boundary", () => {
    // 2026-05-07T14:59:59Z -> 2026-05-07T23:59:59+09:00
    expect(jstDayKey(Date.UTC(2026, 4, 7, 14, 59, 59))).toBe("2026-05-07");
  });

  it("handles month boundaries correctly", () => {
    // 2026-05-31T15:00:00Z -> 2026-06-01T00:00:00+09:00
    expect(jstDayKey(Date.UTC(2026, 4, 31, 15, 0, 0))).toBe("2026-06-01");
  });

  it("handles year boundaries correctly", () => {
    // 2025-12-31T15:00:00Z -> 2026-01-01T00:00:00+09:00
    expect(jstDayKey(Date.UTC(2025, 11, 31, 15, 0, 0))).toBe("2026-01-01");
  });

  it("pads single-digit month and day with a leading zero", () => {
    expect(jstDayKey(Date.UTC(2026, 0, 5, 0, 0, 0))).toBe("2026-01-05");
  });
});

/* ------------------------------------------------------------------ */
/*  jstDayStartMs                                                      */
/* ------------------------------------------------------------------ */
describe("jstDayStartMs", () => {
  it("returns the epoch ms for 00:00 JST, expressed as the equivalent UTC instant", () => {
    // 2026-05-07T00:00:00+09:00 -> 2026-05-06T15:00:00Z
    expect(jstDayStartMs("2026-05-07")).toBe(Date.UTC(2026, 4, 6, 15, 0, 0));
  });

  it("handles month boundaries correctly", () => {
    // 2026-06-01T00:00:00+09:00 -> 2026-05-31T15:00:00Z
    expect(jstDayStartMs("2026-06-01")).toBe(Date.UTC(2026, 4, 31, 15, 0, 0));
  });

  it("handles year boundaries correctly", () => {
    // 2026-01-01T00:00:00+09:00 -> 2025-12-31T15:00:00Z
    expect(jstDayStartMs("2026-01-01")).toBe(Date.UTC(2025, 11, 31, 15, 0, 0));
  });
});

/* ------------------------------------------------------------------ */
/*  round-trip consistency                                             */
/* ------------------------------------------------------------------ */
describe("jstDayKey / jstDayStartMs round-trip", () => {
  it("jstDayKey(jstDayStartMs(key)) returns the same key for arbitrary dates", () => {
    const keys = ["2026-01-01", "2026-02-28", "2026-05-07", "2026-08-28", "2026-12-31"];
    for (const key of keys) {
      expect(jstDayKey(jstDayStartMs(key))).toBe(key);
    }
  });

  it("jstDayStartMs marks the exact start of the JST day — one ms earlier belongs to the previous day", () => {
    const dayStart = jstDayStartMs("2026-05-07");
    expect(jstDayKey(dayStart)).toBe("2026-05-07");
    expect(jstDayKey(dayStart - 1)).toBe("2026-05-06");
  });
});
