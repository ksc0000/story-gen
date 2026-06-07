import { describe, it, expect } from "vitest";
import { getPageHighlightLevel, getSectionHighlights } from "@/lib/quality-review";
import type { PageDoc } from "@/lib/types";

describe("quality-review-highlights", () => {
  describe("getPageHighlightLevel", () => {
    const defaultPage: PageDoc = {
      pageNumber: 0,
      status: "completed",
      imageDurationMs: 50000,
      imageFallbackUsed: false,
      appearingCharacterIds: [],
      usedCharacterReference: false,
      focusCharacterId: null,
      createdAt: null as any,
      createdAtMs: 0,
      updatedAt: null as any,
      updatedAtMs: 0,
    } as PageDoc;

    it("returns 'none' if intent is null", () => {
      expect(getPageHighlightLevel(null, defaultPage)).toBe("none");
    });

    it("handles 'review_image_regeneration' intent", () => {
      // Normal page is subtle
      expect(getPageHighlightLevel("review_image_regeneration", defaultPage)).toBe("subtle");

      // Failed or fallback pages are strong
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, status: "image_failed" })).toBe("strong");
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, status: "fallback_completed" })).toBe("strong");
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, imageFallbackUsed: true })).toBe("strong");

      // Slow pages > 120s are strong
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, imageDurationMs: 120001 })).toBe("strong");
    });

    it("handles 'review_character_consistency' intent", () => {
      // Normal page with no characters is subtle
      expect(getPageHighlightLevel("review_character_consistency", defaultPage)).toBe("subtle");

      // Pages with characters are strong
      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage, appearingCharacterIds: ["char1"] })).toBe("strong");
      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage, usedCharacterReference: true })).toBe("strong");
      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage, focusCharacterId: "char1" })).toBe("strong");
    });

    it("handles 'prepare_story_rewrite' and 'require_human_safety_review' returning 'subtle'", () => {
      expect(getPageHighlightLevel("prepare_story_rewrite", defaultPage)).toBe("subtle");
      expect(getPageHighlightLevel("require_human_safety_review", defaultPage)).toBe("subtle");
    });

    it("handles other intents returning 'none'", () => {
      expect(getPageHighlightLevel("confirm_approval", defaultPage)).toBe("none");
      expect(getPageHighlightLevel("review_personalization_inputs", defaultPage)).toBe("none");
    });
  });

  describe("getSectionHighlights", () => {
    it("returns all false when intent is null or confirm_approval", () => {
      const none = { bookDetail: false, inputAndProfile: false, storyText: false, pages: false };
      expect(getSectionHighlights(null)).toEqual(none);
      expect(getSectionHighlights("confirm_approval")).toEqual(none);
    });

    it("returns correct highlights for different intents", () => {
      expect(getSectionHighlights("review_image_regeneration")).toEqual({
        bookDetail: false, inputAndProfile: false, storyText: false, pages: true
      });
      expect(getSectionHighlights("review_character_consistency")).toEqual({
        bookDetail: false, inputAndProfile: false, storyText: false, pages: true
      });
      expect(getSectionHighlights("prepare_story_rewrite")).toEqual({
        bookDetail: true, inputAndProfile: false, storyText: true, pages: false
      });
      expect(getSectionHighlights("review_personalization_inputs")).toEqual({
        bookDetail: true, inputAndProfile: true, storyText: false, pages: false
      });
      expect(getSectionHighlights("require_human_safety_review")).toEqual({
        bookDetail: false, inputAndProfile: false, storyText: true, pages: true
      });
    });
  });
});
