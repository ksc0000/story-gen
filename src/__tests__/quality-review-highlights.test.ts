import { describe, it, expect } from "vitest";
import { getPageHighlightLevel, getSectionHighlights } from "@/lib/quality-review";
import type { PageDoc } from "@/lib/types";
import type { QualityRecommendationIntent } from "@/lib/quality-review";

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

describe("quality-review highlights", () => {
  describe("getPageHighlightLevel", () => {
    it("returns 'none' for null intent", () => {
      expect(getPageHighlightLevel(null, makePage())).toBe("none");
    });

    describe("intent: review_image_regeneration", () => {
      const intent: QualityRecommendationIntent = "review_image_regeneration";

      it("returns 'strong' for image_failed status", () => {
        const page = makePage({ status: "image_failed" });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'strong' for fallback_completed status", () => {
        const page = makePage({ status: "fallback_completed" });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'strong' for high imageDurationMs", () => {
        const page = makePage({ imageDurationMs: 120_001 });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'strong' when imageFallbackUsed is true", () => {
        const page = makePage({ imageFallbackUsed: true });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'subtle' for normal completed page", () => {
        const page = makePage({ status: "completed", imageDurationMs: 50_000, imageFallbackUsed: false });
        expect(getPageHighlightLevel(intent, page)).toBe("subtle");
      });
    });

    describe("intent: review_character_consistency", () => {
      const intent: QualityRecommendationIntent = "review_character_consistency";

      it("returns 'strong' when appearingCharacterIds is not empty", () => {
        const page = makePage({ appearingCharacterIds: ["char-1"] });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'strong' when usedCharacterReference is true", () => {
        const page = makePage({ usedCharacterReference: true });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'strong' when focusCharacterId is present", () => {
        const page = makePage({ focusCharacterId: "char-2" });
        expect(getPageHighlightLevel(intent, page)).toBe("strong");
      });

      it("returns 'subtle' otherwise", () => {
        const page = makePage({
          appearingCharacterIds: [],
          usedCharacterReference: false,
        });
        expect(getPageHighlightLevel(intent, page)).toBe("subtle");
      });
    });

    describe("other intents", () => {
      it("returns 'subtle' for prepare_story_rewrite", () => {
        expect(getPageHighlightLevel("prepare_story_rewrite", makePage())).toBe("subtle");
      });

      it("returns 'subtle' for require_human_safety_review", () => {
        expect(getPageHighlightLevel("require_human_safety_review", makePage())).toBe("subtle");
      });

      it("returns 'none' for default intents like confirm_approval", () => {
        expect(getPageHighlightLevel("confirm_approval", makePage())).toBe("none");
      });
    });
  });

  describe("getSectionHighlights", () => {
    it("returns all false for null intent", () => {
      const result = getSectionHighlights(null);
      expect(result).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      });
    });

    it("returns correct highlights for review_image_regeneration", () => {
      const result = getSectionHighlights("review_image_regeneration");
      expect(result).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: true,
      });
    });

    it("returns correct highlights for review_character_consistency", () => {
      const result = getSectionHighlights("review_character_consistency");
      expect(result).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: true,
      });
    });

    it("returns correct highlights for prepare_story_rewrite", () => {
      const result = getSectionHighlights("prepare_story_rewrite");
      expect(result).toEqual({
        bookDetail: true,
        inputAndProfile: false,
        storyText: true,
        pages: false,
      });
    });

    it("returns correct highlights for review_personalization_inputs", () => {
      const result = getSectionHighlights("review_personalization_inputs");
      expect(result).toEqual({
        bookDetail: true,
        inputAndProfile: true,
        storyText: false,
        pages: false,
      });
    });

    it("returns correct highlights for require_human_safety_review", () => {
      const result = getSectionHighlights("require_human_safety_review");
      expect(result).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: true,
        pages: true,
      });
    });

    it("returns correct highlights for confirm_approval", () => {
      const result = getSectionHighlights("confirm_approval");
      expect(result).toEqual({
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      });
    });
  });
});
