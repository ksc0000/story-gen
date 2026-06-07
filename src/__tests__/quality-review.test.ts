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
import type { QualityReviewForm, QualityReviewStatus } from "@/lib/quality-review";
import type { Timestamp } from "@/lib/types";

describe("Quality Review Helpers", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns an empty normalized form with 'reviewed' status", () => {
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
    it("parses valid numeric strings between 1 and 5", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("5")).toBe(5);
      expect(parseQualityScore("3")).toBe(3);
    });

    it("returns null for non-integer strings", () => {
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
    });

    it("returns null for out of bounds numbers", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("-1")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates the exact average and rounds to 1 decimal place", () => {
      const result = calculateOverallQualityScore({
        storyScore: 4,
        illustrationScore: 4,
        characterConsistencyScore: 4,
        personalizationScore: 3,
        safetyScore: 4,
      });
      // (4+4+4+3+4) = 19 / 5 = 3.8
      expect(result).toBe(3.8);
    });

    it("rounds 3.75 to 3.8", () => {
      const result = calculateOverallQualityScore({
        storyScore: 4,
        illustrationScore: 4,
        characterConsistencyScore: 4,
        personalizationScore: 4,
        safetyScore: 3,
      });
      // (4+4+4+4+3) = 19 / 5 = 3.8
      expect(result).toBe(3.8);
    });
  });

  describe("splitTextareaLines", () => {
    it("splits by newline and trims whitespace", () => {
      const result = splitTextareaLines(" line 1 \nline 2\n \n line 3 ");
      expect(result).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("returns an empty array for an empty or purely whitespace string", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n  \n")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("formats null or undefined as '—'", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as any)).toBe("—");
    });

    it("formats valid numbers to strings", () => {
      expect(formatQualityScore(0)).toBe("0");
      expect(formatQualityScore(4.5)).toBe("4.5");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("returns matching labels for statuses", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
    });

    it("returns 'Not reviewed' as default", () => {
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel("unknown" as any)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("returns matching classes for statuses", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
    });

    it("returns 'not_reviewed' classes as default", () => {
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    const validForm = {
      storyScore: "5",
      illustrationScore: "4",
      characterConsistencyScore: "4",
      personalizationScore: "5",
      safetyScore: "5",
      status: "reviewed" as QualityReviewStatus,
      reviewReason: "Looks good",
      flaggedIssues: "",
      recommendedFixes: "",
    };

    it("returns null for a valid form", () => {
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("returns an error if a score is missing", () => {
      const form = { ...validForm, storyScore: "" };
      expect(validateQualityReviewForm(form)).toBe("Story Score を入力してください");
    });

    it("returns an error if a score is invalid", () => {
      const form = { ...validForm, illustrationScore: "6" };
      expect(validateQualityReviewForm(form)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns an error if reviewReason exceeds 1000 characters", () => {
      const form = { ...validForm, reviewReason: "A".repeat(1001) };
      expect(validateQualityReviewForm(form)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("builds the full payload with correct overall score and mapped fields", () => {
      const form = {
        storyScore: "4",
        illustrationScore: "5",
        characterConsistencyScore: "5",
        personalizationScore: "4",
        safetyScore: "4",
        status: "approved" as QualityReviewStatus,
        reviewReason: "  Good job  ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1",
      };

      const serverTimestamp = { seconds: 100, nanoseconds: 0 } as Timestamp;
      const now = 100000;

      const payload = buildQualityReviewPayload({
        form,
        bookId: "b1",
        reviewerId: "r1",
        now,
        serverTimestamp,
      });

      // (4+5+5+4+4) = 22 / 5 = 4.4
      expect(payload.overallScore).toBe(4.4);
      expect(payload.bookId).toBe("b1");
      expect(payload.reviewerType).toBe("human");
      expect(payload.reviewerId).toBe("r1");
      expect(payload.storyScore).toBe(4);
      expect(payload.illustrationScore).toBe(5);
      expect(payload.characterConsistencyScore).toBe(5);
      expect(payload.personalizationScore).toBe(4);
      expect(payload.safetyScore).toBe(4);
      expect(payload.status).toBe("approved");
      expect(payload.reviewReason).toBe("Good job");
      expect(payload.flaggedIssues).toEqual(["issue 1", "issue 2"]);
      expect(payload.recommendedFixes).toEqual(["fix 1"]);
      expect(payload.rubricVersion).toBe(QUALITY_RUBRIC_VERSION);
      expect(payload.createdAt).toBe(serverTimestamp);
      expect(payload.createdAtMs).toBe(now);
      expect(payload.updatedAt).toBe(serverTimestamp);
      expect(payload.updatedAtMs).toBe(now);
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("builds the summary payload for the book document", () => {
      const form = {
        storyScore: "3",
        illustrationScore: "3",
        characterConsistencyScore: "4",
        personalizationScore: "4",
        safetyScore: "5",
        status: "needs_fix" as QualityReviewStatus,
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };

      const serverTimestamp = { seconds: 200, nanoseconds: 0 } as Timestamp;
      const now = 200000;

      const payload = buildQualitySummaryPayload({
        reviewId: "rev1",
        form,
        now,
        serverTimestamp,
      });

      // (3+3+4+4+5) = 19 / 5 = 3.8
      expect(payload.overallQualityScore).toBe(3.8);
      expect(payload.latestQualityReviewId).toBe("rev1");
      expect(payload.qualityReviewStatus).toBe("needs_fix");
      expect(payload.storyQualityScore).toBe(3);
      expect(payload.illustrationQualityScore).toBe(3);
      expect(payload.characterConsistencyScore).toBe(4);
      expect(payload.personalizationScore).toBe(4);
      expect(payload.safetyScore).toBe(5);
      expect(payload.qualityReviewedAt).toBe(serverTimestamp);
      expect(payload.qualityReviewedAtMs).toBe(now);
      expect(payload.qualityReviewerType).toBe("human");
    });
  });
});
