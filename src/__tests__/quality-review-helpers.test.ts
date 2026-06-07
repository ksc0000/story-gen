import { describe, it, expect, beforeEach } from "vitest";
import {
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
import type { QualityReviewForm, Timestamp } from "@/lib/types";

describe("quality-review helpers", () => {
  describe("parseQualityScore", () => {
    it("returns valid scores as numbers", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("returns null for invalid inputs", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("1.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
      expect(parseQualityScore(" ")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates the average correctly and rounds to 1 decimal place", () => {
      expect(
        calculateOverallQualityScore({
          storyScore: 5,
          illustrationScore: 5,
          characterConsistencyScore: 5,
          personalizationScore: 5,
          safetyScore: 5,
        })
      ).toBe(5);

      expect(
        calculateOverallQualityScore({
          storyScore: 1,
          illustrationScore: 1,
          characterConsistencyScore: 1,
          personalizationScore: 1,
          safetyScore: 1,
        })
      ).toBe(1);

      // (5+4+4+5+4)/5 = 22/5 = 4.4
      expect(
        calculateOverallQualityScore({
          storyScore: 5,
          illustrationScore: 4,
          characterConsistencyScore: 4,
          personalizationScore: 5,
          safetyScore: 4,
        })
      ).toBe(4.4);

      // (3+3+3+4+4)/5 = 17/5 = 3.4
      expect(
        calculateOverallQualityScore({
          storyScore: 3,
          illustrationScore: 3,
          characterConsistencyScore: 3,
          personalizationScore: 4,
          safetyScore: 4,
        })
      ).toBe(3.4);
    });
  });

  describe("splitTextareaLines", () => {
    it("splits strings by newline and removes empty lines", () => {
      expect(splitTextareaLines("line 1\nline 2\n\nline 3")).toEqual([
        "line 1",
        "line 2",
        "line 3",
      ]);
    });

    it("trims whitespace from lines", () => {
      expect(splitTextareaLines(" line 1 \n  line 2  ")).toEqual([
        "line 1",
        "line 2",
      ]);
    });

    it("handles empty input", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n  ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("formats numbers as strings", () => {
      expect(formatQualityScore(5)).toBe("5");
      expect(formatQualityScore(3.5)).toBe("3.5");
      expect(formatQualityScore(0)).toBe("0");
    });

    it("returns '—' for null or undefined", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as unknown as number)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("returns the correct label for known statuses", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
    });

    it("returns 'Not reviewed' for unknown statuses", () => {
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel("unknown" as any)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("returns the correct badge class for known statuses", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe(
        "bg-emerald-100 text-emerald-800"
      );
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe(
        "bg-blue-100 text-blue-800"
      );
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe(
        "bg-rose-100 text-rose-800"
      );
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe(
        "bg-gray-100 text-gray-600"
      );
    });

    it("returns default badge class for unknown statuses", () => {
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe(
        "bg-gray-100 text-gray-600"
      );
      expect(getQualityReviewStatusBadgeClass("unknown" as any)).toBe(
        "bg-gray-100 text-gray-600"
      );
    });
  });

  describe("validateQualityReviewForm", () => {
    let validForm: QualityReviewForm;

    beforeEach(() => {
      validForm = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "4",
        personalizationScore: "5",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "Looks good",
        flaggedIssues: "",
        recommendedFixes: "",
      };
    });

    it("returns null for a valid form", () => {
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("returns error if a score is missing", () => {
      validForm.storyScore = "";
      expect(validateQualityReviewForm(validForm)).toBe("Story Score を入力してください");
    });

    it("returns error if a score is invalid", () => {
      validForm.illustrationScore = "6";
      expect(validateQualityReviewForm(validForm)).toBe("Illustration Score は 1〜5 の整数で入力してください");

      validForm.illustrationScore = "abc";
      expect(validateQualityReviewForm(validForm)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns error if reviewReason exceeds 1000 characters", () => {
      validForm.reviewReason = "a".repeat(1001);
      expect(validateQualityReviewForm(validForm)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("builds correct payload from inputs", () => {
      const form = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "needs_fix" as const,
        reviewReason: " Some reason  ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1\n\nfix 2",
      };

      const now = 1234567890;
      const serverTimestamp = { seconds: 1234, nanoseconds: 5678 } as Timestamp;

      const payload = buildQualityReviewPayload({
        form,
        bookId: "book-1",
        reviewerId: "reviewer-1",
        now,
        serverTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-1",
        reviewerType: "human",
        reviewerId: "reviewer-1",
        storyScore: 5,
        illustrationScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 4,
        safetyScore: 5,
        // (5+4+3+4+5)/5 = 21/5 = 4.2
        overallScore: 4.2,
        status: "needs_fix",
        reviewReason: "Some reason",
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1", "fix 2"],
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
      const form = {
        storyScore: "4",
        illustrationScore: "5",
        characterConsistencyScore: "4",
        personalizationScore: "5",
        safetyScore: "5",
        status: "approved" as const,
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };

      const now = 9876543210;
      const serverTimestamp = { seconds: 9876, nanoseconds: 5432 } as Timestamp;

      const summaryPayload = buildQualitySummaryPayload({
        reviewId: "review-123",
        form,
        now,
        serverTimestamp,
      });

      expect(summaryPayload).toEqual({
        latestQualityReviewId: "review-123",
        qualityReviewStatus: "approved",
        storyQualityScore: 4,
        illustrationQualityScore: 5,
        characterConsistencyScore: 4,
        personalizationScore: 5,
        safetyScore: 5,
        // (4+5+4+5+5)/5 = 23/5 = 4.6
        overallQualityScore: 4.6,
        qualityReviewedAt: serverTimestamp,
        qualityReviewedAtMs: now,
        qualityReviewerType: "human",
      });
    });
  });
});
