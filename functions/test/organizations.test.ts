import { describe, it, expect } from "vitest";
import { generateInviteCode, normalizeInviteCode, validateOrgName } from "../src/organizations";

describe("organizations helpers", () => {
  describe("generateInviteCode", () => {
    it("produces a code of the requested length from the safe alphabet", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      // 紛らわしい文字（0/O/1/I/L）を含まない
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
    });
    it("honors a custom length", () => {
      expect(generateInviteCode(10)).toHaveLength(10);
    });
  });

  describe("normalizeInviteCode", () => {
    it("uppercases and strips spaces/hyphens", () => {
      expect(normalizeInviteCode(" ab-cd 23 ")).toBe("ABCD23");
    });
    it("handles empty input", () => {
      expect(normalizeInviteCode("")).toBe("");
    });
  });

  describe("validateOrgName", () => {
    it("returns the trimmed name for valid input", () => {
      expect(validateOrgName("  ひまわり保育園 ")).toBe("ひまわり保育園");
    });
    it("throws for empty or non-string", () => {
      expect(() => validateOrgName("")).toThrow();
      expect(() => validateOrgName("   ")).toThrow();
      expect(() => validateOrgName(undefined)).toThrow();
      expect(() => validateOrgName(123)).toThrow();
    });
    it("throws for an overly long name", () => {
      expect(() => validateOrgName("あ".repeat(61))).toThrow();
    });
  });
});
