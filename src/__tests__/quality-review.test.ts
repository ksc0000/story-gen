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
  getPageHighlightLevel,
  getSectionHighlights,
  type QualityReviewForm
} from "@/lib/quality-review";
import type { PageDoc } from "@/lib/types";

describe("quality-review", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns an empty form with reviewed status", () => {
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
    it("parses valid integers from 1 to 5", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("returns null for invalid numbers", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates the correct average", () => {
      expect(calculateOverallQualityScore({
        storyScore: 5,
        illustrationScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 2,
        safetyScore: 1,
      })).toBe(3);
      expect(calculateOverallQualityScore({
        storyScore: 5,
        illustrationScore: 5,
        characterConsistencyScore: 5,
        personalizationScore: 5,
        safetyScore: 4,
      })).toBe(4.8);
    });
  });

  describe("splitTextareaLines", () => {
    it("splits strings and trims whitespace", () => {
      expect(splitTextareaLines("  a \n b  \n\n c  ")).toEqual(["a", "b", "c"]);
    });
  });

  describe("formatQualityScore", () => {
    it("formats the score appropriately", () => {
      expect(formatQualityScore(3.5)).toBe("3.5");
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as any)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("returns appropriate labels", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("returns appropriate badge classes", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    const validForm: QualityReviewForm = {
      storyScore: "5",
      illustrationScore: "4",
      characterConsistencyScore: "5",
      personalizationScore: "4",
      safetyScore: "5",
      status: "reviewed",
      reviewReason: "Looks good",
      flaggedIssues: "",
      recommendedFixes: "",
    };

    it("returns null for a valid form", () => {
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("returns error if a score is missing", () => {
      expect(validateQualityReviewForm({ ...validForm, storyScore: "" }))
        .toBe("Story Score を入力してください");
    });

    it("returns error if a score is invalid", () => {
      expect(validateQualityReviewForm({ ...validForm, illustrationScore: "6" }))
        .toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns error if reviewReason is too long", () => {
      const longReason = "a".repeat(1001);
      expect(validateQualityReviewForm({ ...validForm, reviewReason: longReason }))
        .toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("builds the correct payload", () => {
      const form: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "5",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: " Looks good ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1",
      };

      const payload = buildQualityReviewPayload({
        form,
        bookId: "b1",
        reviewerId: "r1",
        now: 12345,
        serverTimestamp: "ts" as any,
      });

      expect(payload).toEqual({
        bookId: "b1",
        reviewerType: "human",
        reviewerId: "r1",
        storyScore: 5,
        illustrationScore: 4,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
        overallScore: 4.6,
        status: "reviewed",
        reviewReason: "Looks good",
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1"],
        rubricVersion: "phase2-quality-v1",
        createdAt: "ts",
        createdAtMs: 12345,
        updatedAt: "ts",
        updatedAtMs: 12345,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("builds the correct summary payload", () => {
      const form: QualityReviewForm = {
        storyScore: "5",
        illustrationScore: "4",
        characterConsistencyScore: "5",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };

      const payload = buildQualitySummaryPayload({
        reviewId: "rev1",
        form,
        now: 12345,
        serverTimestamp: "ts" as any,
      });

      expect(payload).toEqual({
        latestQualityReviewId: "rev1",
        qualityReviewStatus: "reviewed",
        storyQualityScore: 5,
        illustrationQualityScore: 4,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
        overallQualityScore: 4.6,
        qualityReviewedAtMs: 12345,
        qualityReviewedAt: "ts",
        qualityReviewerType: "human",
      });
    });
  });

  describe("getPageHighlightLevel", () => {
    it("returns none if intent is null", () => {
      expect(getPageHighlightLevel(null, {} as PageDoc)).toBe("none");
    });

    describe("review_image_regeneration", () => {
      it("returns strong for failed, fallback, or slow pages", () => {
        expect(getPageHighlightLevel("review_image_regeneration", { status: "image_failed" } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel("review_image_regeneration", { status: "fallback_completed" } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel("review_image_regeneration", { imageDurationMs: 120001 } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel("review_image_regeneration", { imageFallbackUsed: true } as PageDoc)).toBe("strong");
      });

      it("returns subtle for normal pages", () => {
        expect(getPageHighlightLevel("review_image_regeneration", { status: "completed", imageDurationMs: 100 } as PageDoc)).toBe("subtle");
      });
    });

    describe("review_character_consistency", () => {
      it("returns strong for pages with characters", () => {
        expect(getPageHighlightLevel("review_character_consistency", { appearingCharacterIds: ["c1"] } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel("review_character_consistency", { usedCharacterReference: true } as PageDoc)).toBe("strong");
        expect(getPageHighlightLevel("review_character_consistency", { focusCharacterId: "c2" } as PageDoc)).toBe("strong");
      });

      it("returns subtle for pages without characters", () => {
        expect(getPageHighlightLevel("review_character_consistency", {} as PageDoc)).toBe("subtle");
      });
    });

    describe("other intents", () => {
      it("returns subtle for prepare_story_rewrite and require_human_safety_review", () => {
        expect(getPageHighlightLevel("prepare_story_rewrite", {} as PageDoc)).toBe("subtle");
        expect(getPageHighlightLevel("require_human_safety_review", {} as PageDoc)).toBe("subtle");
      });

      it("returns none for default", () => {
        expect(getPageHighlightLevel("review_personalization_inputs", {} as PageDoc)).toBe("none");
        expect(getPageHighlightLevel("confirm_approval", {} as PageDoc)).toBe("none");
      });
    });
  });

  describe("getSectionHighlights", () => {
    it("returns false for all sections if intent is null", () => {
      expect(getSectionHighlights(null)).toEqual({ bookDetail: false, inputAndProfile: false, storyText: false, pages: false });
    });

    it("returns correct highlights for review_image_regeneration", () => {
      expect(getSectionHighlights("review_image_regeneration")).toEqual({ bookDetail: false, inputAndProfile: false, storyText: false, pages: true });
    });

    it("returns correct highlights for review_character_consistency", () => {
      expect(getSectionHighlights("review_character_consistency")).toEqual({ bookDetail: false, inputAndProfile: false, storyText: false, pages: true });
    });

    it("returns correct highlights for prepare_story_rewrite", () => {
      expect(getSectionHighlights("prepare_story_rewrite")).toEqual({ bookDetail: true, inputAndProfile: false, storyText: true, pages: false });
    });

    it("returns correct highlights for review_personalization_inputs", () => {
      expect(getSectionHighlights("review_personalization_inputs")).toEqual({ bookDetail: true, inputAndProfile: true, storyText: false, pages: false });
    });

    it("returns correct highlights for require_human_safety_review", () => {
      expect(getSectionHighlights("require_human_safety_review")).toEqual({ bookDetail: false, inputAndProfile: false, storyText: true, pages: true });
    });

    it("returns correct highlights for confirm_approval", () => {
      expect(getSectionHighlights("confirm_approval")).toEqual({ bookDetail: false, inputAndProfile: false, storyText: false, pages: false });
    });
  });
});
