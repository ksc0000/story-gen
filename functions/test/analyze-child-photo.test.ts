import { describe, it, expect } from "vitest";
import { coerceAge, coerceGender, validateInput } from "../src/analyze-child-photo";

describe("analyzeChildPhoto helpers", () => {
  describe("coerceAge", () => {
    it("accepts a plausible age and rounds it", () => {
      expect(coerceAge(4)).toBe(4);
      expect(coerceAge("6")).toBe(6);
      expect(coerceAge(3.6)).toBe(4);
    });
    it("returns null for out-of-range or invalid values", () => {
      expect(coerceAge(-1)).toBeNull();
      expect(coerceAge(99)).toBeNull();
      expect(coerceAge("たぶん4歳")).toBeNull();
      expect(coerceAge(null)).toBeNull();
      expect(coerceAge(undefined)).toBeNull();
    });
  });

  describe("coerceGender", () => {
    it("passes through allowed values", () => {
      expect(coerceGender("boy")).toBe("boy");
      expect(coerceGender("girl")).toBe("girl");
      expect(coerceGender("neutral")).toBe("neutral");
      expect(coerceGender("unspecified")).toBe("unspecified");
    });
    it("falls back to unspecified for anything else", () => {
      expect(coerceGender("male")).toBe("unspecified");
      expect(coerceGender("")).toBe("unspecified");
      expect(coerceGender(42)).toBe("unspecified");
      expect(coerceGender(undefined)).toBe("unspecified");
    });
  });

  describe("validateInput", () => {
    it("accepts a valid small base64 jpeg", () => {
      expect(() => validateInput({ imageBase64: "abc123", mimeType: "image/jpeg" })).not.toThrow();
    });
    it("rejects missing image", () => {
      expect(() => validateInput({ imageBase64: "", mimeType: "image/jpeg" })).toThrow();
    });
    it("rejects an unsupported mime type", () => {
      expect(() => validateInput({ imageBase64: "abc", mimeType: "image/gif" })).toThrow();
    });
    it("rejects an oversized image", () => {
      expect(() =>
        validateInput({ imageBase64: "a".repeat(8_000_001), mimeType: "image/png" })
      ).toThrow();
    });
  });
});
