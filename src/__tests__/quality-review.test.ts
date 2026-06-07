import { describe, it, expect } from "vitest";
import {
  getPageHighlightLevel,
  getSectionHighlights,
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
} from "@/lib/quality-review";
import type { PageDoc, QualityReviewForm, Timestamp } from "@/lib/types";

function makePage(overrides: Partial<PageDoc> = {}): PageDoc {
  return {
    pageNumber: 0,
    text: "テスト",
    imageUrl: "https://example.com/img.png",
    imagePrompt: "prompt",
    status: "completed",
    ...overrides,
  } as PageDoc;
}

function makeForm(overrides: Partial<QualityReviewForm> = {}): QualityReviewForm {
  return {
    storyScore: "4",
    illustrationScore: "4",
    characterConsistencyScore: "4",
    personalizationScore: "4",
    safetyScore: "4",
    status: "reviewed",
    reviewReason: "test reason",
    flaggedIssues: "issue 1\nissue 2",
    recommendedFixes: "fix 1",
    ...overrides,
  };
}

describe("getPageHighlightLevel", () => {
  it("returns 'none' if intent is null", () => {
    expect(getPageHighlightLevel(null, makePage())).toBe("none");
  });

  describe("intent: review_image_regeneration", () => {
    it("returns 'strong' for image_failed", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ status: "image_failed" }))).toBe("strong");
    });
    it("returns 'strong' for fallback_completed", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ status: "fallback_completed" }))).toBe("strong");
    });
    it("returns 'strong' for slow image generation (>120s)", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ imageDurationMs: 120_001 }))).toBe("strong");
    });
    it("returns 'strong' if imageFallbackUsed is true", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ imageFallbackUsed: true }))).toBe("strong");
    });
    it("returns 'subtle' for completed fast images without fallback", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ status: "completed", imageDurationMs: 100 }))).toBe("subtle");
    });
  });

  describe("intent: review_character_consistency", () => {
    it("returns 'strong' if appearingCharacterIds has items", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({ appearingCharacterIds: ["char-1"] }))).toBe("strong");
    });
    it("returns 'strong' if usedCharacterReference is true", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({ usedCharacterReference: true }))).toBe("strong");
    });
    it("returns 'strong' if focusCharacterId is present", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({ focusCharacterId: "char-1" }))).toBe("strong");
    });
    it("returns 'subtle' if no character info is present", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({
        appearingCharacterIds: [],
        usedCharacterReference: false,
      }))).toBe("subtle");
    });
  });

  describe("other intents", () => {
    it("returns 'subtle' for prepare_story_rewrite", () => {
      expect(getPageHighlightLevel("prepare_story_rewrite", makePage())).toBe("subtle");
    });
    it("returns 'subtle' for require_human_safety_review", () => {
      expect(getPageHighlightLevel("require_human_safety_review", makePage())).toBe("subtle");
    });
    it("returns 'none' for confirm_approval", () => {
      expect(getPageHighlightLevel("confirm_approval", makePage())).toBe("none");
    });
    it("returns 'none' for review_personalization_inputs", () => {
      expect(getPageHighlightLevel("review_personalization_inputs", makePage())).toBe("none");
    });
  });
});

describe("getSectionHighlights", () => {
  it("returns all false for null intent", () => {
    const highlights = getSectionHighlights(null);
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });

  it("highlights pages for review_image_regeneration", () => {
    const highlights = getSectionHighlights("review_image_regeneration");
    expect(highlights.pages).toBe(true);
    expect(highlights.storyText).toBe(false);
  });

  it("highlights pages for review_character_consistency", () => {
    const highlights = getSectionHighlights("review_character_consistency");
    expect(highlights.pages).toBe(true);
    expect(highlights.storyText).toBe(false);
  });

  it("highlights storyText and bookDetail for prepare_story_rewrite", () => {
    const highlights = getSectionHighlights("prepare_story_rewrite");
    expect(highlights.storyText).toBe(true);
    expect(highlights.bookDetail).toBe(true);
    expect(highlights.pages).toBe(false);
  });

  it("highlights inputAndProfile and bookDetail for review_personalization_inputs", () => {
    const highlights = getSectionHighlights("review_personalization_inputs");
    expect(highlights.inputAndProfile).toBe(true);
    expect(highlights.bookDetail).toBe(true);
    expect(highlights.pages).toBe(false);
  });

  it("highlights storyText and pages for require_human_safety_review", () => {
    const highlights = getSectionHighlights("require_human_safety_review");
    expect(highlights.storyText).toBe(true);
    expect(highlights.pages).toBe(true);
    expect(highlights.bookDetail).toBe(false);
  });

  it("returns all false for confirm_approval", () => {
    const highlights = getSectionHighlights("confirm_approval");
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });
});

describe("utility functions", () => {
  describe("normalizeQualityReviewForm", () => {
    it("returns empty strings for scores and 'reviewed' for status", () => {
      const form = normalizeQualityReviewForm();
      expect(form.storyScore).toBe("");
      expect(form.status).toBe("reviewed");
    });
  });

  describe("parseQualityScore", () => {
    it("parses valid integers 1-5", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("5")).toBe(5);
    });
    it("returns null for invalid inputs", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("3.5")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("calculates average correctly", () => {
      const score = calculateOverallQualityScore({
        storyScore: 5,
        illustrationScore: 4,
        characterConsistencyScore: 3,
        personalizationScore: 4,
        safetyScore: 5,
      });
      // (5+4+3+4+5)/5 = 21/5 = 4.2
      expect(score).toBe(4.2);
    });
    it("rounds to one decimal place", () => {
      const score = calculateOverallQualityScore({
        storyScore: 1,
        illustrationScore: 2,
        characterConsistencyScore: 2,
        personalizationScore: 2,
        safetyScore: 2,
      });
      // (1+2+2+2+2)/5 = 9/5 = 1.8
      expect(score).toBe(1.8);
    });
  });

  describe("splitTextareaLines", () => {
    it("splits by newline and trims", () => {
      expect(splitTextareaLines(" line 1 \nline 2\n\n line 3")).toEqual(["line 1", "line 2", "line 3"]);
    });
    it("handles empty string", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n  ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("formats number to string", () => {
      expect(formatQualityScore(4.5)).toBe("4.5");
      expect(formatQualityScore(3)).toBe("3");
    });
    it("returns em dash for undefined or null", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      expect(formatQualityScore(null as unknown as number)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("returns correct labels", () => {
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("returns correct badge classes", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toContain("emerald");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toContain("rose");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toContain("blue");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toContain("gray");
      expect(getQualityReviewStatusBadgeClass(undefined)).toContain("gray");
    });
  });
});

describe("payload and validation functions", () => {
  describe("validateQualityReviewForm", () => {
    it("returns null for valid form", () => {
      expect(validateQualityReviewForm(makeForm())).toBeNull();
    });

    it("returns error if a score field is missing", () => {
      const form = makeForm({ storyScore: "" });
      expect(validateQualityReviewForm(form)).toBe("Story Score を入力してください");
    });

    it("returns error if a score field is invalid", () => {
      const form = makeForm({ illustrationScore: "6" });
      expect(validateQualityReviewForm(form)).toBe("Illustration Score は 1〜5 の整数で入力してください");
    });

    it("returns error if reviewReason is over 1000 chars", () => {
      const form = makeForm({ reviewReason: "a".repeat(1001) });
      expect(validateQualityReviewForm(form)).toBe("Review Reason は 1000 文字以内にしてください");
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("constructs payload correctly", () => {
      const form = makeForm({
        storyScore: "4",
        illustrationScore: "3",
        characterConsistencyScore: "5",
        personalizationScore: "4",
        safetyScore: "5",
        status: "approved",
        reviewReason: "looks good",
        flaggedIssues: "issue A",
        recommendedFixes: "fix B",
      });
      const now = 12345;
      const ts = { seconds: 12, nanoseconds: 34 } as Timestamp;
      const payload = buildQualityReviewPayload({
        form,
        bookId: "b1",
        reviewerId: "u1",
        now,
        serverTimestamp: ts,
      });

      expect(payload.bookId).toBe("b1");
      expect(payload.reviewerType).toBe("human");
      expect(payload.reviewerId).toBe("u1");
      expect(payload.storyScore).toBe(4);
      expect(payload.illustrationScore).toBe(3);
      expect(payload.overallScore).toBe(4.2); // 21/5
      expect(payload.status).toBe("approved");
      expect(payload.reviewReason).toBe("looks good");
      expect(payload.flaggedIssues).toEqual(["issue A"]);
      expect(payload.recommendedFixes).toEqual(["fix B"]);
      expect(payload.createdAt).toBe(ts);
      expect(payload.createdAtMs).toBe(now);
      expect(payload.rubricVersion).toBeDefined();
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("constructs summary payload correctly", () => {
      const form = makeForm({
        storyScore: "4",
        illustrationScore: "4",
        characterConsistencyScore: "4",
        personalizationScore: "4",
        safetyScore: "4",
        status: "needs_fix",
      });
      const now = 54321;
      const ts = { seconds: 54, nanoseconds: 32 } as Timestamp;
      const payload = buildQualitySummaryPayload({
        reviewId: "r1",
        form,
        now,
        serverTimestamp: ts,
      });

      expect(payload.latestQualityReviewId).toBe("r1");
      expect(payload.qualityReviewStatus).toBe("needs_fix");
      expect(payload.storyQualityScore).toBe(4);
      expect(payload.overallQualityScore).toBe(4);
      expect(payload.qualityReviewedAt).toBe(ts);
      expect(payload.qualityReviewedAtMs).toBe(now);
      expect(payload.qualityReviewerType).toBe("human");
    });
  });
});
