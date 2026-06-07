import { validateQualityReviewForm, buildQualityReviewPayload, buildQualitySummaryPayload, QUALITY_RUBRIC_VERSION } from "@/lib/quality-review";
import { splitTextareaLines, formatQualityScore, getQualityReviewStatusLabel, getQualityReviewStatusBadgeClass } from "@/lib/quality-review";
import { describe, it, expect } from "vitest";
import {
  normalizeQualityReviewForm,
  parseQualityScore,
  calculateOverallQualityScore,
} from "@/lib/quality-review";

describe("quality-review-helpers", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns default values", () => {
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
    it("parses valid integer strings correctly", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("returns null for invalid strings or out of range values", () => {
      expect(parseQualityScore("")).toBe(null);
      expect(parseQualityScore("0")).toBe(null);
      expect(parseQualityScore("6")).toBe(null);
      expect(parseQualityScore("3.5")).toBe(null);
      expect(parseQualityScore("abc")).toBe(null);
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates the average correctly and rounds to 1 decimal", () => {
      // (1 + 1 + 1 + 1 + 1) / 5 = 1
      expect(calculateOverallQualityScore({
        storyScore: 1,
        illustrationScore: 1,
        characterConsistencyScore: 1,
        personalizationScore: 1,
        safetyScore: 1,
      })).toBe(1);

      // (5 + 5 + 5 + 5 + 5) / 5 = 5
      expect(calculateOverallQualityScore({
        storyScore: 5,
        illustrationScore: 5,
        characterConsistencyScore: 5,
        personalizationScore: 5,
        safetyScore: 5,
      })).toBe(5);

      // (5 + 4 + 3 + 2 + 1) / 5 = 3
      expect(calculateOverallQualityScore({
        storyScore: 5,
        illustrationScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 2,
        safetyScore: 1,
      })).toBe(3);

      // (4 + 4 + 4 + 4 + 3) / 5 = 19 / 5 = 3.8
      expect(calculateOverallQualityScore({
        storyScore: 4,
        illustrationScore: 4,
        characterConsistencyScore: 4,
        personalizationScore: 4,
        safetyScore: 3,
      })).toBe(3.8);

      // (4 + 4 + 4 + 3 + 3) / 5 = 18 / 5 = 3.6
      expect(calculateOverallQualityScore({
        storyScore: 4,
        illustrationScore: 4,
        characterConsistencyScore: 4,
        personalizationScore: 3,
        safetyScore: 3,
      })).toBe(3.6);
    });
  });
});

describe("string manipulation and mappings", () => {
  describe("splitTextareaLines", () => {
    it("splits lines, trims them, and removes empty lines", () => {
      expect(splitTextareaLines("  line 1  \n\nline 2\n  ")).toEqual(["line 1", "line 2"]);
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines(" \n \n ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("formats score numbers as strings and handles null/undefined", () => {
      expect(formatQualityScore(3.5)).toBe("3.5");
      expect(formatQualityScore(4)).toBe("4");
      expect(formatQualityScore(undefined)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("maps status values correctly", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("maps status values to CSS classes correctly", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    });
  });
});

describe("form validation and payloads", () => {
  describe("validateQualityReviewForm", () => {
    it("returns null for a valid form", () => {
      const form = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "5",
        safetyScore: "5",
        status: "reviewed" as const,
        reviewReason: "Looks good",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBe(null);
    });

    it("returns error message if a score is missing or invalid", () => {
      const form = {
        storyScore: "5",
        illustrationScore: "", // Missing
        characterConsistencyScore: "3",
        personalizationScore: "5",
        safetyScore: "5",
        status: "reviewed" as const,
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBe("Illustration Score を入力してください");

      form.illustrationScore = "6"; // Invalid out of range
      expect(validateQualityReviewForm(form)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns error message if reviewReason exceeds 1000 characters", () => {
      const form = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "5",
        safetyScore: "5",
        status: "reviewed" as const,
        reviewReason: "A".repeat(1001),
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("builds correct payload from inputs", () => {
      const form = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "2",
        safetyScore: "1",
        status: "reviewed" as const,
        reviewReason: "Some reason  ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1",
      };
      const mockTimestamp = {} as any; // Mock Firebase Timestamp
      const payload = buildQualityReviewPayload({
        form,
        bookId: "book-123",
        reviewerId: "user-456",
        now: 1000,
        serverTimestamp: mockTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-123",
        reviewerType: "human",
        reviewerId: "user-456",
        storyScore: 5,
        illustrationScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 2,
        safetyScore: 1,
        overallScore: 3, // (5+4+3+2+1)/5 = 3
        status: "reviewed",
        reviewReason: "Some reason",
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1"],
        rubricVersion: QUALITY_RUBRIC_VERSION,
        createdAt: mockTimestamp,
        createdAtMs: 1000,
        updatedAt: mockTimestamp,
        updatedAtMs: 1000,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("builds correct summary payload", () => {
      const form = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "2",
        safetyScore: "1",
        status: "approved" as const,
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      const mockTimestamp = {} as any;
      const payload = buildQualitySummaryPayload({
        reviewId: "rev-789",
        form,
        now: 2000,
        serverTimestamp: mockTimestamp,
      });

      expect(payload).toEqual({
        latestQualityReviewId: "rev-789",
        qualityReviewStatus: "approved",
        storyQualityScore: 5,
        illustrationQualityScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 2,
        safetyScore: 1,
        overallQualityScore: 3,
        qualityReviewedAt: mockTimestamp,
        qualityReviewedAtMs: 2000,
        qualityReviewerType: "human",
      });
    });
  });
});
