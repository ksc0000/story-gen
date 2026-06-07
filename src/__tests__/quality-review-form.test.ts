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
} from "@/lib/quality-review";
import type { Timestamp, QualityReviewerType } from "@/lib/types";

describe("Quality Review Form Helpers", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns the default initial state", () => {
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
    it("correctly parses valid scores", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("returns null for invalid scores", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates average and rounds to 1 decimal place", () => {
      const score = calculateOverallQualityScore({
        storyScore: 3,
        illustrationScore: 4,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
      });
      // (3+4+5+4+5)/5 = 21/5 = 4.2
      expect(score).toBe(4.2);
    });

    it("rounds correctly", () => {
      const score = calculateOverallQualityScore({
        storyScore: 3,
        illustrationScore: 3,
        characterConsistencyScore: 3,
        personalizationScore: 4,
        safetyScore: 4,
      });
      // (3+3+3+4+4)/5 = 17/5 = 3.4
      expect(score).toBe(3.4);
    });
  });

  describe("splitTextareaLines", () => {
    it("splits strings by lines, trims, and removes empty lines", () => {
      const input = "  line 1  \n\nline 2\n  \nline 3";
      expect(splitTextareaLines(input)).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("returns empty array for empty or whitespace-only strings", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n   ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("returns stringified numbers", () => {
      expect(formatQualityScore(3)).toBe("3");
      expect(formatQualityScore(4.5)).toBe("4.5");
    });

    it("returns '—' for nullish values", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as any)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("returns correct labels", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("returns correct classes", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    it("returns null for valid form", () => {
      const form = normalizeQualityReviewForm();
      form.storyScore = "4";
      form.illustrationScore = "4";
      form.characterConsistencyScore = "4";
      form.personalizationScore = "4";
      form.safetyScore = "4";
      form.reviewReason = "Looks good";

      expect(validateQualityReviewForm(form)).toBeNull();
    });

    it("returns error if a score is missing", () => {
      const form = normalizeQualityReviewForm();
      form.storyScore = "4";
      form.illustrationScore = "4";
      form.characterConsistencyScore = "4";
      form.personalizationScore = "4";
      // safetyScore is missing

      expect(validateQualityReviewForm(form)).toBe("Safety Score を入力してください");
    });

    it("returns error if a score is invalid", () => {
      const form = normalizeQualityReviewForm();
      form.storyScore = "4";
      form.illustrationScore = "6"; // Invalid
      form.characterConsistencyScore = "4";
      form.personalizationScore = "4";
      form.safetyScore = "4";

      expect(validateQualityReviewForm(form)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns error if reviewReason exceeds 1000 characters", () => {
      const form = normalizeQualityReviewForm();
      form.storyScore = "4";
      form.illustrationScore = "4";
      form.characterConsistencyScore = "4";
      form.personalizationScore = "4";
      form.safetyScore = "4";
      form.reviewReason = "a".repeat(1001);

      expect(validateQualityReviewForm(form)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("builds correct payload", () => {
      const form = normalizeQualityReviewForm();
      form.storyScore = "3";
      form.illustrationScore = "4";
      form.characterConsistencyScore = "5";
      form.personalizationScore = "4";
      form.safetyScore = "5";
      form.status = "approved";
      form.reviewReason = " Test reason ";
      form.flaggedIssues = "Issue 1\nIssue 2";
      form.recommendedFixes = "Fix 1\n\nFix 2";

      const serverTimestamp = { seconds: 123, nanoseconds: 0 } as Timestamp;
      const now = 123000;

      const payload = buildQualityReviewPayload({
        form,
        bookId: "book-123",
        reviewerId: "reviewer-1",
        now,
        serverTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-123",
        reviewerType: "human",
        reviewerId: "reviewer-1",
        storyScore: 3,
        illustrationScore: 4,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
        overallScore: 4.2,
        status: "approved",
        reviewReason: "Test reason",
        flaggedIssues: ["Issue 1", "Issue 2"],
        recommendedFixes: ["Fix 1", "Fix 2"],
        rubricVersion: QUALITY_RUBRIC_VERSION,
        createdAt: serverTimestamp,
        createdAtMs: now,
        updatedAt: serverTimestamp,
        updatedAtMs: now,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("builds correct summary payload", () => {
      const form = normalizeQualityReviewForm();
      form.storyScore = "3";
      form.illustrationScore = "4";
      form.characterConsistencyScore = "5";
      form.personalizationScore = "4";
      form.safetyScore = "5";
      form.status = "approved";

      const serverTimestamp = { seconds: 123, nanoseconds: 0 } as Timestamp;
      const now = 123000;

      const payload = buildQualitySummaryPayload({
        reviewId: "review-123",
        form,
        now,
        serverTimestamp,
      });

      expect(payload).toEqual({
        latestQualityReviewId: "review-123",
        qualityReviewStatus: "approved",
        storyQualityScore: 3,
        illustrationQualityScore: 4,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
        overallQualityScore: 4.2,
        qualityReviewedAt: serverTimestamp,
        qualityReviewedAtMs: now,
        qualityReviewerType: "human",
      });
    });
  });
});
