import { describe, it, expect } from "vitest";
import { getPageHighlightLevel, getSectionHighlights, QualityRecommendationIntent } from "@/lib/quality-review";
import type { PageDoc } from "@/lib/types";

function makePage(overrides: Partial<PageDoc> = {}): PageDoc {
  return {
    pageNumber: 0,
    text: "テストテキスト",
    imageUrl: "https://example.com/img.png",
    imagePrompt: "prompt",
    status: "completed",
    ...overrides,
  } as PageDoc;
}

describe("getPageHighlightLevel", () => {
  it("returns none when intent is null", () => {
    const page = makePage();
    expect(getPageHighlightLevel(null, page)).toBe("none");
  });

  describe("review_image_regeneration", () => {
    const intent: QualityRecommendationIntent = "review_image_regeneration";

    it("returns strong for image_failed status", () => {
      const page = makePage({ status: "image_failed" });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns strong for fallback_completed status", () => {
      const page = makePage({ status: "fallback_completed" });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns strong for imageFallbackUsed", () => {
      const page = makePage({ status: "completed", imageFallbackUsed: true });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns strong for slow image duration", () => {
      const page = makePage({ status: "completed", imageDurationMs: 120_001 });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns subtle for normal completed page", () => {
      const page = makePage({ status: "completed", imageDurationMs: 50_000 });
      expect(getPageHighlightLevel(intent, page)).toBe("subtle");
    });
  });

  describe("review_character_consistency", () => {
    const intent: QualityRecommendationIntent = "review_character_consistency";

    it("returns strong if appearingCharacterIds has items", () => {
      const page = makePage({ appearingCharacterIds: ["char1"] });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns strong if usedCharacterReference is true", () => {
      const page = makePage({ usedCharacterReference: true });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns strong if focusCharacterId is set", () => {
      const page = makePage({ focusCharacterId: "char1" });
      expect(getPageHighlightLevel(intent, page)).toBe("strong");
    });

    it("returns subtle if no character info is present", () => {
      const page = makePage();
      expect(getPageHighlightLevel(intent, page)).toBe("subtle");
    });
  });

  describe("other intents", () => {
    it("returns subtle for prepare_story_rewrite", () => {
      const page = makePage();
      expect(getPageHighlightLevel("prepare_story_rewrite", page)).toBe("subtle");
    });

    it("returns subtle for require_human_safety_review", () => {
      const page = makePage();
      expect(getPageHighlightLevel("require_human_safety_review", page)).toBe("subtle");
    });

    it("returns none for confirm_approval", () => {
      const page = makePage();
      expect(getPageHighlightLevel("confirm_approval", page)).toBe("none");
    });

    it("returns none for review_personalization_inputs", () => {
      const page = makePage();
      expect(getPageHighlightLevel("review_personalization_inputs", page)).toBe("none");
    });
  });
});

describe("getSectionHighlights", () => {
  it("returns all false when intent is null", () => {
    expect(getSectionHighlights(null)).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });

  it("highlights correctly for review_image_regeneration", () => {
    expect(getSectionHighlights("review_image_regeneration")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });
  });

  it("highlights correctly for review_character_consistency", () => {
    expect(getSectionHighlights("review_character_consistency")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });
  });

  it("highlights correctly for prepare_story_rewrite", () => {
    expect(getSectionHighlights("prepare_story_rewrite")).toEqual({
      bookDetail: true,
      inputAndProfile: false,
      storyText: true,
      pages: false,
    });
  });

  it("highlights correctly for review_personalization_inputs", () => {
    expect(getSectionHighlights("review_personalization_inputs")).toEqual({
      bookDetail: true,
      inputAndProfile: true,
      storyText: false,
      pages: false,
    });
  });

  it("highlights correctly for require_human_safety_review", () => {
    expect(getSectionHighlights("require_human_safety_review")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: true,
      pages: true,
    });
  });

  it("highlights correctly for confirm_approval", () => {
    expect(getSectionHighlights("confirm_approval")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });
});
