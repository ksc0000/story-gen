import { describe, it, expect } from "vitest";
import {
  normalizeQualityReviewForm,
  parseQualityScore,
  calculateOverallQualityScore,
  splitTextareaLines,
  formatQualityScore,
  getQualityReviewStatusLabel,
  getQualityReviewStatusBadgeClass,
  validateQualityReviewForm,
  type QualityReviewForm,
} from "@/lib/quality-review";

describe("quality-review helpers", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns empty strings for scores and review fields, and sets status to reviewed", () => {
      const form = normalizeQualityReviewForm();
      expect(form).toEqual({
        storyScore: "",
        illustrationScore: "",
        characterConsistencyScore: "",
        personalizationScore: "",
        safetyScore: "",
        status: "reviewed",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      });
    });
  });

  describe("parseQualityScore", () => {
    it("parses valid integer strings between 1 and 5", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("returns null for values out of bounds", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("-1")).toBeNull();
    });

    it("returns null for non-integer or invalid strings", () => {
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates the average correctly and rounds to 1 decimal place", () => {
      const scores = {
        storyScore: 4 as const,
        illustrationScore: 3 as const,
        characterConsistencyScore: 5 as const,
        personalizationScore: 4 as const,
        safetyScore: 5 as const,
      };
      // Sum = 21, Avg = 4.2
      expect(calculateOverallQualityScore(scores)).toBe(4.2);

      const lowScores = {
        storyScore: 1 as const,
        illustrationScore: 2 as const,
        characterConsistencyScore: 2 as const,
        personalizationScore: 1 as const,
        safetyScore: 1 as const,
      };
      // Sum = 7, Avg = 1.4
      expect(calculateOverallQualityScore(lowScores)).toBe(1.4);

      const mixedScores = {
        storyScore: 3 as const,
        illustrationScore: 3 as const,
        characterConsistencyScore: 4 as const,
        personalizationScore: 3 as const,
        safetyScore: 4 as const,
      };
      // Sum = 17, Avg = 3.4
      expect(calculateOverallQualityScore(mixedScores)).toBe(3.4);
    });
  });

  describe("splitTextareaLines", () => {
    it("splits by newline and trims whitespace, ignoring empty lines", () => {
      const input = "  line 1  \n\nline 2\n  \nline 3";
      expect(splitTextareaLines(input)).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("returns an empty array for empty string or only whitespace", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n  ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("returns the number as string if value is provided", () => {
      expect(formatQualityScore(4.5)).toBe("4.5");
      expect(formatQualityScore(3)).toBe("3");
    });

    it("returns '—' if value is null or undefined", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      // @ts-expect-error null check
      expect(formatQualityScore(null)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("returns the correct label for each status", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
    });

    it("defaults to 'Not reviewed'", () => {
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
      // @ts-expect-error type test
      expect(getQualityReviewStatusLabel("unknown")).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("returns the correct CSS class for each status", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe(
        "bg-emerald-100 text-emerald-800",
      );
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe(
        "bg-blue-100 text-blue-800",
      );
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe(
        "bg-rose-100 text-rose-800",
      );
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe(
        "bg-gray-100 text-gray-600",
      );
    });

    it("defaults to gray classes", () => {
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe(
        "bg-gray-100 text-gray-600",
      );
      // @ts-expect-error type test
      expect(getQualityReviewStatusBadgeClass("unknown")).toBe(
        "bg-gray-100 text-gray-600",
      );
    });
  });

  describe("validateQualityReviewForm", () => {
    const validForm: QualityReviewForm = {
      storyScore: "4",
      illustrationScore: "3",
      characterConsistencyScore: "5",
      personalizationScore: "4",
      safetyScore: "5",
      status: "reviewed",
      reviewReason: "test",
      flaggedIssues: "",
      recommendedFixes: "",
    };

    it("returns null for a valid form", () => {
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("returns an error message if a score is missing", () => {
      const form = { ...validForm, storyScore: "" };
      expect(validateQualityReviewForm(form)).toBe(
        "Story Score を入力してください",
      );
    });

    it("returns an error message if a score is invalid", () => {
      const form = { ...validForm, personalizationScore: "6" };
      expect(validateQualityReviewForm(form)).toBe(
        "Personalization Score は 1〜5 の整数で入力してください",
      );

      const form2 = { ...validForm, illustrationScore: "abc" };
      expect(validateQualityReviewForm(form2)).toBe(
        "Illustration Score は 1〜5 の整数で入力してください",
      );
    });

    it("returns an error message if reviewReason exceeds 1000 characters", () => {
      const longReason = "a".repeat(1001);
      const form = { ...validForm, reviewReason: longReason };
      expect(validateQualityReviewForm(form)).toBe(
        "Review Reason は 1000 文字以内にしてください",
      );
    });
  });
});
