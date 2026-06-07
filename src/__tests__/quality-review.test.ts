import { describe, it, expect } from "vitest";
import {
  parseQualityScore,
  calculateOverallQualityScore,
  normalizeQualityReviewForm,
  splitTextareaLines,
  formatQualityScore,
  getQualityReviewStatusLabel,
  getQualityReviewStatusBadgeClass,
  validateQualityReviewForm,
  buildQualityReviewPayload,
  buildQualitySummaryPayload,
  getPageHighlightLevel,
  getSectionHighlights,
  QualityReviewForm,
} from "@/lib/quality-review";
import type { PageDoc, QualityReviewStatus } from "@/lib/types";

describe("quality-review core score functions", () => {
  describe("parseQualityScore", () => {
    it("should parse valid scores from 1 to 5", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("should return null for scores out of range", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("-1")).toBeNull();
    });

    it("should return null for non-integer or invalid values", () => {
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
      expect(parseQualityScore(" ")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("should correctly calculate and round the average score", () => {
      expect(
        calculateOverallQualityScore({
          storyScore: 5,
          illustrationScore: 5,
          characterConsistencyScore: 5,
          personalizationScore: 5,
          safetyScore: 5,
        })
      ).toBe(5.0);

      expect(
        calculateOverallQualityScore({
          storyScore: 1,
          illustrationScore: 1,
          characterConsistencyScore: 1,
          personalizationScore: 1,
          safetyScore: 1,
        })
      ).toBe(1.0);

      expect(
        calculateOverallQualityScore({
          storyScore: 5,
          illustrationScore: 4,
          characterConsistencyScore: 3,
          personalizationScore: 2,
          safetyScore: 1,
        })
      ).toBe(3.0);

      expect(
        calculateOverallQualityScore({
          storyScore: 4,
          illustrationScore: 4,
          characterConsistencyScore: 4,
          personalizationScore: 4,
          safetyScore: 5,
        })
      ).toBe(4.2);

      expect(
        calculateOverallQualityScore({
          storyScore: 3,
          illustrationScore: 3,
          characterConsistencyScore: 3,
          personalizationScore: 3,
          safetyScore: 4,
        })
      ).toBe(3.2);

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

  describe("normalizeQualityReviewForm", () => {
    it("should return a form with default empty values and 'reviewed' status", () => {
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

  describe("splitTextareaLines", () => {
    it("should split on newlines, trim, and filter out empty lines", () => {
      const text = "  line 1  \n\nline 2\n   \nline 3";
      expect(splitTextareaLines(text)).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("should return an empty array for empty or whitespace-only strings", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n  ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("should format numbers as strings", () => {
      expect(formatQualityScore(5)).toBe("5");
      expect(formatQualityScore(3.2)).toBe("3.2");
      expect(formatQualityScore(0)).toBe("0");
    });

    it("should return '—' for null or undefined", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as unknown as number)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("should return correct labels for valid statuses", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
    });

    it("should return 'Not reviewed' for undefined or unknown statuses", () => {
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel("unknown_status" as QualityReviewStatus)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("should return correct badge classes for valid statuses", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
    });

    it("should return a default gray badge class for 'not_reviewed' or unknown statuses", () => {
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass("unknown_status" as QualityReviewStatus)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    it("should return null for a valid form", () => {
      const validForm: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "looks good",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("should return an error if a score is missing", () => {
      const form: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "", // Missing
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBe("Illustration Score を入力してください");
    });

    it("should return an error if a score is invalid", () => {
      const form: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "6", // Invalid
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("should return an error if reviewReason exceeds 1000 characters", () => {
      const validForm: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "a".repeat(1001),
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(validForm)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("should build a complete quality review payload without ID", () => {
      const nowMs = 1234567890;
      const mockTimestamp = { seconds: 1234567, nanoseconds: 890000 } as any;

      const payload = buildQualityReviewPayload({
        form: {
          storyScore: "4",
          illustrationScore: "5",
          characterConsistencyScore: "4",
          personalizationScore: "5",
          safetyScore: "5",
          status: "approved",
          reviewReason: "  Great book  ",
          flaggedIssues: "issue 1\nissue 2",
          recommendedFixes: "fix 1",
        },
        bookId: "book-123",
        reviewerId: "reviewer-123",
        now: nowMs,
        serverTimestamp: mockTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-123",
        reviewerType: "human",
        reviewerId: "reviewer-123",
        storyScore: 4,
        illustrationScore: 5,
        characterConsistencyScore: 4,
        personalizationScore: 5,
        safetyScore: 5,
        overallScore: 4.6,
        status: "approved",
        reviewReason: "Great book",
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1"],
        rubricVersion: "phase2-quality-v1",
        createdAt: mockTimestamp,
        createdAtMs: nowMs,
        updatedAt: mockTimestamp,
        updatedAtMs: nowMs,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("should build a summary payload for book doc updates", () => {
      const nowMs = 1234567890;
      const mockTimestamp = { seconds: 1234567, nanoseconds: 890000 } as any;

      const payload = buildQualitySummaryPayload({
        reviewId: "review-123",
        form: {
          storyScore: "3",
          illustrationScore: "4",
          characterConsistencyScore: "3",
          personalizationScore: "4",
          safetyScore: "5",
          status: "needs_fix",
          reviewReason: "",
          flaggedIssues: "",
          recommendedFixes: "",
        },
        now: nowMs,
        serverTimestamp: mockTimestamp,
      });

      expect(payload).toEqual({
        latestQualityReviewId: "review-123",
        qualityReviewStatus: "needs_fix",
        storyQualityScore: 3,
        illustrationQualityScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 4,
        safetyScore: 5,
        overallQualityScore: 3.8,
        qualityReviewedAt: mockTimestamp,
        qualityReviewedAtMs: nowMs,
        qualityReviewerType: "human",
      });
    });
  });

  describe("getPageHighlightLevel", () => {
    it("should return 'none' if intent is null", () => {
      expect(getPageHighlightLevel(null, {} as PageDoc)).toBe("none");
    });

    describe("intent: review_image_regeneration", () => {
      const intent = "review_image_regeneration";

      it("should return 'strong' for image_failed", () => {
        expect(getPageHighlightLevel(intent, { status: "image_failed" } as PageDoc)).toBe("strong");
      });

      it("should return 'strong' for fallback_completed or imageFallbackUsed", () => {
        expect(getPageHighlightLevel(intent, { status: "fallback_completed" } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel(intent, { imageFallbackUsed: true } as PageDoc)).toBe("strong");
      });

      it("should return 'strong' for slow image generation (> 120s)", () => {
        expect(getPageHighlightLevel(intent, { imageDurationMs: 120_001 } as PageDoc)).toBe("strong");
      });

      it("should return 'subtle' for normal pages", () => {
        expect(getPageHighlightLevel(intent, { status: "completed", imageDurationMs: 10_000 } as PageDoc)).toBe("subtle");
      });
    });

    describe("intent: review_character_consistency", () => {
      const intent = "review_character_consistency";

      it("should return 'strong' if characters are appearing", () => {
        expect(getPageHighlightLevel(intent, { appearingCharacterIds: ["char1"] } as PageDoc)).toBe("strong");
      });

      it("should return 'strong' if reference used or focus character set", () => {
        expect(getPageHighlightLevel(intent, { usedCharacterReference: true } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel(intent, { focusCharacterId: "char1" } as PageDoc)).toBe("strong");
      });

      it("should return 'subtle' if no character involvement", () => {
        expect(getPageHighlightLevel(intent, {} as PageDoc)).toBe("subtle");
      });
    });

    describe("other intents", () => {
      it("should return 'subtle' for rewrite and safety intents", () => {
        expect(getPageHighlightLevel("prepare_story_rewrite", {} as PageDoc)).toBe("subtle");
        expect(getPageHighlightLevel("require_human_safety_review", {} as PageDoc)).toBe("subtle");
      });

      it("should return 'none' for other intents", () => {
        expect(getPageHighlightLevel("confirm_approval", {} as PageDoc)).toBe("none");
        expect(getPageHighlightLevel("review_personalization_inputs", {} as PageDoc)).toBe("none");
      });
    });
  });

  describe("getSectionHighlights", () => {
    it("should return all false if intent is null", () => {
      expect(getSectionHighlights(null)).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      });
    });

    it("should highlight pages for image and character intents", () => {
      expect(getSectionHighlights("review_image_regeneration").pages).toBe(true);
      expect(getSectionHighlights("review_character_consistency").pages).toBe(true);
    });

    it("should highlight storyText and bookDetail for rewrite intent", () => {
      const highlights = getSectionHighlights("prepare_story_rewrite");
      expect(highlights.storyText).toBe(true);
      expect(highlights.bookDetail).toBe(true);
      expect(highlights.pages).toBe(false);
    });

    it("should highlight inputAndProfile and bookDetail for personalization intent", () => {
      const highlights = getSectionHighlights("review_personalization_inputs");
      expect(highlights.inputAndProfile).toBe(true);
      expect(highlights.bookDetail).toBe(true);
      expect(highlights.pages).toBe(false);
    });

    it("should highlight storyText and pages for safety intent", () => {
      const highlights = getSectionHighlights("require_human_safety_review");
      expect(highlights.storyText).toBe(true);
      expect(highlights.pages).toBe(true);
      expect(highlights.bookDetail).toBe(false);
    });

    it("should highlight nothing for confirm_approval intent", () => {
      expect(getSectionHighlights("confirm_approval")).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      });
    });
  });
});
