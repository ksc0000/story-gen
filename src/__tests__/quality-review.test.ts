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
  buildQualityReviewPayload,
  buildQualitySummaryPayload,
  QUALITY_RUBRIC_VERSION,
  type QualityReviewForm
} from "@/lib/quality-review";
import type { Timestamp } from "@/lib/types";

describe("quality-review", () => {
  describe("normalizeQualityReviewForm", () => {
    it("should return the expected initial empty state", () => {
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
    it("should parse valid scores as numbers", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("should return null for invalid types or out of range strings", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("should average 5 scores and round to 1 decimal place", () => {
      const score = calculateOverallQualityScore({
        storyScore: 1 as any,
        illustrationScore: 2 as any,
        characterConsistencyScore: 3 as any,
        personalizationScore: 4 as any,
        safetyScore: 4 as any,
      });
      // (1 + 2 + 3 + 4 + 4) / 5 = 14 / 5 = 2.8
      expect(score).toBe(2.8);
    });

    it("should handle exact numbers correctly", () => {
      const score = calculateOverallQualityScore({
        storyScore: 3 as any,
        illustrationScore: 3 as any,
        characterConsistencyScore: 3 as any,
        personalizationScore: 3 as any,
        safetyScore: 3 as any,
      });
      expect(score).toBe(3);
    });
  });

  describe("splitTextareaLines", () => {
    it("should split a multi-line string and filter/trim correctly", () => {
      const result = splitTextareaLines(" line 1 \n\nline 2\n   \nline 3");
      expect(result).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("should handle empty strings", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("should format numbers correctly", () => {
      expect(formatQualityScore(4)).toBe("4");
      expect(formatQualityScore(0)).toBe("0");
    });

    it("should handle null and undefined", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as any)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("should map statuses correctly", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
    });

    it("should default to Not reviewed", () => {
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel("unknown" as any)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("should map statuses correctly", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
    });

    it("should default to default classes", () => {
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass("unknown" as any)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    const validForm: QualityReviewForm = {
      storyScore: "5",
      illustrationScore: "4",
      characterConsistencyScore: "3",
      personalizationScore: "4",
      safetyScore: "5",
      status: "reviewed",
      reviewReason: "test reason",
      flaggedIssues: "issue 1",
      recommendedFixes: "fix 1",
    };

    it("should return null for a valid form", () => {
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("should catch missing score fields", () => {
      expect(validateQualityReviewForm({ ...validForm, storyScore: "" }))
        .toBe("Story Score を入力してください");
    });

    it("should catch invalid score string", () => {
      expect(validateQualityReviewForm({ ...validForm, illustrationScore: "6" }))
        .toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("should catch review reason length > 1000", () => {
      const longReason = "a".repeat(1001);
      expect(validateQualityReviewForm({ ...validForm, reviewReason: longReason }))
        .toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("should correctly map form to payload object", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "4",
        characterConsistencyScore: "4",
        personalizationScore: "4",
        safetyScore: "4",
        status: "approved",
        reviewReason: " good ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1",
      };

      const serverTimestamp = { seconds: 1234, nanoseconds: 0 } as Timestamp;

      const payload = buildQualityReviewPayload({
        form,
        bookId: "book-1",
        reviewerId: "reviewer-1",
        now: 1000,
        serverTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-1",
        reviewerType: "human",
        reviewerId: "reviewer-1",
        storyScore: 4,
        illustrationScore: 4,
        characterConsistencyScore: 4,
        personalizationScore: 4,
        safetyScore: 4,
        overallScore: 4,
        status: "approved",
        reviewReason: "good",
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1"],
        rubricVersion: QUALITY_RUBRIC_VERSION,
        createdAt: serverTimestamp,
        createdAtMs: 1000,
        updatedAt: serverTimestamp,
        updatedAtMs: 1000,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("should correctly map form to summary object", () => {
      const form: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "5",
        safetyScore: "5",
        status: "needs_fix",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };

      const serverTimestamp = { seconds: 1234, nanoseconds: 0 } as Timestamp;

      const summary = buildQualitySummaryPayload({
        reviewId: "review-1",
        form,
        now: 2000,
        serverTimestamp,
      });

      expect(summary).toEqual({
        latestQualityReviewId: "review-1",
        qualityReviewStatus: "needs_fix",
        storyQualityScore: 5,
        illustrationQualityScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 5,
        safetyScore: 5,
        overallQualityScore: 4.4, // (5+4+3+5+5)/5 = 22/5 = 4.4
        qualityReviewedAt: serverTimestamp,
        qualityReviewedAtMs: 2000,
        qualityReviewerType: "human",
      });
    });
  });
});
