import { describe, it, expect } from "vitest";
import {
  currentYearMonthJst,
  MAX_STUDENTS_PER_RUN,
  ORG_MONTHLY_BOOK_CAP,
} from "../src/bulk-generate";

describe("bulk-generate helpers", () => {
  it("caps are the agreed safety limits", () => {
    expect(MAX_STUDENTS_PER_RUN).toBe(40);
    expect(ORG_MONTHLY_BOOK_CAP).toBe(100);
  });

  describe("currentYearMonthJst", () => {
    it("formats YYYY-MM in JST", () => {
      // 2026-01-31 20:00 UTC → JST 2026-02-01 05:00 → 2026-02
      expect(currentYearMonthJst(new Date("2026-01-31T20:00:00Z"))).toBe("2026-02");
      // 2026-07-02 00:00 UTC → JST 09:00 same day → 2026-07
      expect(currentYearMonthJst(new Date("2026-07-02T00:00:00Z"))).toBe("2026-07");
    });
    it("pads single-digit months", () => {
      expect(currentYearMonthJst(new Date("2026-03-15T00:00:00Z"))).toBe("2026-03");
    });
  });
});
