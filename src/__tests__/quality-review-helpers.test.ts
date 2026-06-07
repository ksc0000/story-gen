import { describe, it, expect } from "vitest";
import {
  formatQualityScore,
  getQualityReviewStatusLabel,
  getPageHighlightLevel,
  getSectionHighlights,
} from "@/lib/quality-review";
import type { PageDoc, QualityReviewStatus } from "@/lib/types";

describe("formatQualityScore", () => {
  it("returns string representation of a valid number", () => {
    expect(formatQualityScore(4.5)).toBe("4.5");
    expect(formatQualityScore(3)).toBe("3");
    expect(formatQualityScore(0)).toBe("0");
  });

  it("returns '—' when value is undefined", () => {
    expect(formatQualityScore(undefined)).toBe("—");
  });

  it("returns '—' when value is null", () => {
    expect(formatQualityScore(null as unknown as number)).toBe("—");
  });
});

describe("getQualityReviewStatusLabel", () => {
  it("returns correct labels for valid statuses", () => {
    expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
    expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
    expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
    expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
  });

  it("returns 'Not reviewed' for unknown status", () => {
    expect(getQualityReviewStatusLabel("unknown" as QualityReviewStatus)).toBe("Not reviewed");
  });

  it("returns 'Not reviewed' for undefined status", () => {
    expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
  });
});

describe("getPageHighlightLevel", () => {
  function makePage(overrides: Partial<PageDoc> = {}): PageDoc {
    return {
      pageNumber: 0,
      text: "test",
      imageUrl: "https://example.com/img.png",
      imagePrompt: "prompt",
      status: "completed",
      ...overrides,
    } as PageDoc;
  }

  it("returns 'none' for null intent", () => {
    expect(getPageHighlightLevel(null, makePage())).toBe("none");
  });

  describe("intent: review_image_regeneration", () => {
    it("returns 'strong' for failed image", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ status: "image_failed" }))).toBe("strong");
    });

    it("returns 'strong' for fallback completed", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ status: "fallback_completed" }))).toBe("strong");
    });

    it("returns 'strong' when fallback used flag is true", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ imageFallbackUsed: true }))).toBe("strong");
    });

    it("returns 'strong' for slow image generation (> 120s)", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ imageDurationMs: 120001 }))).toBe("strong");
    });

    it("returns 'subtle' for normal completed page", () => {
      expect(getPageHighlightLevel("review_image_regeneration", makePage({ status: "completed", imageDurationMs: 60000 }))).toBe("subtle");
    });
  });

  describe("intent: review_character_consistency", () => {
    it("returns 'strong' when character appears", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({ appearingCharacterIds: ["char1"] }))).toBe("strong");
    });

    it("returns 'strong' when usedCharacterReference is true", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({ usedCharacterReference: true }))).toBe("strong");
    });

    it("returns 'strong' when focusCharacterId is set", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage({ focusCharacterId: "char1" }))).toBe("strong");
    });

    it("returns 'subtle' when no character info exists", () => {
      expect(getPageHighlightLevel("review_character_consistency", makePage())).toBe("subtle");
    });
  });

  describe("intent: prepare_story_rewrite", () => {
    it("returns 'subtle' for any page", () => {
      expect(getPageHighlightLevel("prepare_story_rewrite", makePage({ status: "image_failed" }))).toBe("subtle");
      expect(getPageHighlightLevel("prepare_story_rewrite", makePage())).toBe("subtle");
    });
  });

  describe("intent: require_human_safety_review", () => {
    it("returns 'subtle' for any page", () => {
      expect(getPageHighlightLevel("require_human_safety_review", makePage({ status: "image_failed" }))).toBe("subtle");
      expect(getPageHighlightLevel("require_human_safety_review", makePage())).toBe("subtle");
    });
  });

  describe("intent: others", () => {
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
    expect(getSectionHighlights(null)).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });

  it("returns correct flags for review_image_regeneration", () => {
    expect(getSectionHighlights("review_image_regeneration")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });
  });

  it("returns correct flags for review_character_consistency", () => {
    expect(getSectionHighlights("review_character_consistency")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });
  });

  it("returns correct flags for prepare_story_rewrite", () => {
    expect(getSectionHighlights("prepare_story_rewrite")).toEqual({
      bookDetail: true,
      inputAndProfile: false,
      storyText: true,
      pages: false,
    });
  });

  it("returns correct flags for review_personalization_inputs", () => {
    expect(getSectionHighlights("review_personalization_inputs")).toEqual({
      bookDetail: true,
      inputAndProfile: true,
      storyText: false,
      pages: false,
    });
  });

  it("returns correct flags for require_human_safety_review", () => {
    expect(getSectionHighlights("require_human_safety_review")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: true,
      pages: true,
    });
  });

  it("returns correct flags for confirm_approval", () => {
    expect(getSectionHighlights("confirm_approval")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });
});
