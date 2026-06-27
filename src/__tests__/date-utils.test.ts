import { describe, it, expect } from "vitest";
import { formatDateSafe, toMillisSafe } from "@/lib/date-utils";

describe("toMillisSafe", () => {
  it("parses numbers, Dates, and ISO strings", () => {
    const ms = Date.UTC(2026, 0, 2, 3, 4, 5);
    expect(toMillisSafe(ms)).toBe(ms);
    expect(toMillisSafe(new Date(ms))).toBe(ms);
    expect(toMillisSafe(new Date(ms).toISOString())).toBe(ms);
  });

  it("parses Firestore-style timestamp objects (seconds/_seconds)", () => {
    expect(toMillisSafe({ seconds: 100, nanoseconds: 0 })).toBe(100_000);
    expect(toMillisSafe({ _seconds: 100, _nanoseconds: 0 })).toBe(100_000);
  });

  it("returns null for the broken serverTimestamp sentinel", () => {
    // Regression: an old stripUndefined() persisted unresolved FieldValue
    // sentinels as plain objects. These must be treated as "no date", not
    // rendered as 日付不明-causing garbage that blocks the createdAtMs fallback.
    expect(toMillisSafe({ _methodName: "serverTimestamp" })).toBeNull();
    expect(toMillisSafe(null)).toBeNull();
    expect(toMillisSafe(undefined)).toBeNull();
  });
});

describe("formatDateSafe", () => {
  it("formats a valid millis value", () => {
    expect(formatDateSafe(new Date(2026, 3, 30).getTime())).toBe("2026/4/30");
  });

  it("returns 日付不明 for the broken sentinel and nullish values", () => {
    expect(formatDateSafe({ _methodName: "serverTimestamp" })).toBe("日付不明");
    expect(formatDateSafe(null)).toBe("日付不明");
  });
});
