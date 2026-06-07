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
  QualityReviewForm,
} from "@/lib/quality-review";
import type { PageDoc, Timestamp } from "@/lib/types";

describe("quality-review.ts utility functions", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns default form values", () => {
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
    it("parses valid scores", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("returns null for invalid scores", () => {
      expect(parseQualityScore("")).toBeNull();
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates average score correctly", () => {
      expect(
        calculateOverallQualityScore({
          storyScore: 4,
          illustrationScore: 5,
          characterConsistencyScore: 4,
          personalizationScore: 3,
          safetyScore: 5,
        })
      ).toBe(4.2); // (4+5+4+3+5)/5 = 21/5 = 4.2
    });

    it("rounds to one decimal place", () => {
      expect(
        calculateOverallQualityScore({
          storyScore: 3,
          illustrationScore: 3,
          characterConsistencyScore: 4,
          personalizationScore: 4,
          safetyScore: 4,
        })
      ).toBe(3.6); // 18/5 = 3.6
    });
  });

  describe("splitTextareaLines", () => {
    it("splits by newline and trims whitespace", () => {
      const input = " line 1 \nline 2\n  \nline 3\n\n";
      expect(splitTextareaLines(input)).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("returns empty array for empty string", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("formats a valid number to string", () => {
      expect(formatQualityScore(4.2)).toBe("4.2");
      expect(formatQualityScore(5)).toBe("5");
    });

    it("returns an em dash for undefined or null", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore()).toBe("—");
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
    it("returns correct badge classes", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    it("returns null for a valid form", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "5",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "Looks good",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBeNull();
    });

    it("returns error for missing score", () => {
      const form: QualityReviewForm = normalizeQualityReviewForm();
      form.storyScore = "";
      expect(validateQualityReviewForm(form)).toBe("Story Score を入力してください");
    });

    it("returns error for invalid score", () => {
      const form: QualityReviewForm = normalizeQualityReviewForm();
      form.storyScore = "4";
      form.illustrationScore = "6";
      expect(validateQualityReviewForm(form)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns error if reviewReason is too long", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "5",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "a".repeat(1001),
        flaggedIssues: "",
        recommendedFixes: "",
      };
      expect(validateQualityReviewForm(form)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("builds a correct payload", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "5",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "approved",
        reviewReason: " Looks good  ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1",
      };
      const mockTimestamp = { seconds: 123, nanoseconds: 0 } as Timestamp;
      const now = Date.now();

      const payload = buildQualityReviewPayload({
        form,
        bookId: "book-123",
        reviewerId: "reviewer-abc",
        now,
        serverTimestamp: mockTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-123",
        reviewerType: "human",
        reviewerId: "reviewer-abc",
        storyScore: 4,
        illustrationScore: 5,
        characterConsistencyScore: 3,
        personalizationScore: 4,
        safetyScore: 5,
        overallScore: 4.2, // (4+5+3+4+5)/5
        status: "approved",
        reviewReason: "Looks good", // trimmed
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1"],
        rubricVersion: "phase2-quality-v1",
        createdAt: mockTimestamp,
        createdAtMs: now,
        updatedAt: mockTimestamp,
        updatedAtMs: now,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("builds a correct summary payload", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "5",
        characterConsistencyScore: "3",
        personalizationScore: "4",
        safetyScore: "5",
        status: "approved",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      const mockTimestamp = { seconds: 123, nanoseconds: 0 } as Timestamp;
      const now = Date.now();

      const payload = buildQualitySummaryPayload({
        reviewId: "review-789",
        form,
        now,
        serverTimestamp: mockTimestamp,
      });

      expect(payload).toEqual({
        latestQualityReviewId: "review-789",
        qualityReviewStatus: "approved",
        storyQualityScore: 4,
        illustrationQualityScore: 5,
        characterConsistencyScore: 3,
        personalizationScore: 4,
        safetyScore: 5,
        overallQualityScore: 4.2,
        qualityReviewedAt: mockTimestamp,
        qualityReviewedAtMs: now,
        qualityReviewerType: "human",
      });
    });
  });

  describe("getPageHighlightLevel", () => {
    const defaultPage: PageDoc = {
      pageNumber: 0,
      text: "test",
      imageUrl: "url",
      imagePrompt: "prompt",
      status: "completed",
    } as PageDoc;

    it("returns none when intent is null", () => {
      expect(getPageHighlightLevel(null, defaultPage)).toBe("none");
    });

    it("handles review_image_regeneration", () => {
      expect(getPageHighlightLevel("review_image_regeneration", defaultPage)).toBe("subtle");

      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, status: "image_failed" })).toBe("strong");
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, status: "fallback_completed" })).toBe("strong");
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, imageDurationMs: 120_001 })).toBe("strong");
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, imageFallbackUsed: true })).toBe("strong");
    });

    it("handles review_character_consistency", () => {
      expect(getPageHighlightLevel("review_character_consistency", defaultPage)).toBe("subtle");

      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage, appearingCharacterIds: ["char1"] })).toBe("strong");
      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage, usedCharacterReference: true })).toBe("strong");
      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage, focusCharacterId: "char1" })).toBe("strong");
    });

    it("handles prepare_story_rewrite and require_human_safety_review", () => {
      expect(getPageHighlightLevel("prepare_story_rewrite", defaultPage)).toBe("subtle");
      expect(getPageHighlightLevel("require_human_safety_review", defaultPage)).toBe("subtle");
    });

    it("handles default case", () => {
      expect(getPageHighlightLevel("confirm_approval", defaultPage)).toBe("none");
    });
  });

  describe("getSectionHighlights", () => {
    it("returns none when intent is null", () => {
      expect(getSectionHighlights(null)).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      });
    });

    it("handles intents correctly", () => {
      expect(getSectionHighlights("review_image_regeneration")).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: true,
      });

      expect(getSectionHighlights("review_character_consistency")).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: true,
      });

      expect(getSectionHighlights("prepare_story_rewrite")).toEqual({
        bookDetail: true,
        inputAndProfile: false,
        storyText: true,
        pages: false,
      });

      expect(getSectionHighlights("review_personalization_inputs")).toEqual({
        bookDetail: true,
        inputAndProfile: true,
        storyText: false,
        pages: false,
      });

      expect(getSectionHighlights("require_human_safety_review")).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: true,
        pages: true,
      });

      expect(getSectionHighlights("confirm_approval")).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      });
    });
  });
});
