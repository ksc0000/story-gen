import { describe, it, expect } from "vitest";
import { getPageHighlightLevel, getSectionHighlights } from "@/lib/quality-review";
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

describe("getSectionHighlights", () => {
  it("intent が null の場合は全て false", () => {
    const highlights = getSectionHighlights(null);
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });

  it("review_image_regeneration の場合は pages が true", () => {
    const highlights = getSectionHighlights("review_image_regeneration");
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });
  });

  it("review_character_consistency の場合は pages が true", () => {
    const highlights = getSectionHighlights("review_character_consistency");
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });
  });

  it("prepare_story_rewrite の場合は storyText と bookDetail が true", () => {
    const highlights = getSectionHighlights("prepare_story_rewrite");
    expect(highlights).toEqual({
      bookDetail: true,
      inputAndProfile: false,
      storyText: true,
      pages: false,
    });
  });

  it("review_personalization_inputs の場合は inputAndProfile と bookDetail が true", () => {
    const highlights = getSectionHighlights("review_personalization_inputs");
    expect(highlights).toEqual({
      bookDetail: true,
      inputAndProfile: true,
      storyText: false,
      pages: false,
    });
  });

  it("require_human_safety_review の場合は storyText と pages が true", () => {
    const highlights = getSectionHighlights("require_human_safety_review");
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: true,
      pages: true,
    });
  });

  it("confirm_approval の場合は全て false", () => {
    const highlights = getSectionHighlights("confirm_approval");
    expect(highlights).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });
});

describe("getPageHighlightLevel", () => {
  it("intent が null の場合は none", () => {
    expect(getPageHighlightLevel(null, makePage())).toBe("none");
  });

  describe("intent = review_image_regeneration", () => {
    it("status が image_failed の場合は strong", () => {
      const page = makePage({ status: "image_failed" });
      expect(getPageHighlightLevel("review_image_regeneration", page)).toBe("strong");
    });

    it("status が fallback_completed の場合は strong", () => {
      const page = makePage({ status: "fallback_completed" });
      expect(getPageHighlightLevel("review_image_regeneration", page)).toBe("strong");
    });

    it("imageDurationMs が 120000 より大きい場合は strong", () => {
      const page = makePage({ imageDurationMs: 120001 });
      expect(getPageHighlightLevel("review_image_regeneration", page)).toBe("strong");
    });

    it("imageFallbackUsed が true の場合は strong", () => {
      const page = makePage({ imageFallbackUsed: true });
      expect(getPageHighlightLevel("review_image_regeneration", page)).toBe("strong");
    });

    it("通常ページの場合は subtle", () => {
      const page = makePage({ status: "completed", imageDurationMs: 5000 });
      expect(getPageHighlightLevel("review_image_regeneration", page)).toBe("subtle");
    });
  });

  describe("intent = review_character_consistency", () => {
    it("appearingCharacterIds が 1 以上の場合は strong", () => {
      const page = makePage({ appearingCharacterIds: ["char1"] });
      expect(getPageHighlightLevel("review_character_consistency", page)).toBe("strong");
    });

    it("usedCharacterReference が true の場合は strong", () => {
      const page = makePage({ usedCharacterReference: true });
      expect(getPageHighlightLevel("review_character_consistency", page)).toBe("strong");
    });

    it("focusCharacterId が設定されている場合は strong", () => {
      const page = makePage({ focusCharacterId: "char1" });
      expect(getPageHighlightLevel("review_character_consistency", page)).toBe("strong");
    });

    it("通常ページの場合は subtle", () => {
      const page = makePage({ appearingCharacterIds: [] });
      expect(getPageHighlightLevel("review_character_consistency", page)).toBe("subtle");
    });
  });

  describe("intent = prepare_story_rewrite", () => {
    it("全てのページで subtle", () => {
      const page = makePage({ status: "image_failed" }); // 問題があっても subtle
      expect(getPageHighlightLevel("prepare_story_rewrite", page)).toBe("subtle");
    });
  });

  describe("intent = require_human_safety_review", () => {
    it("全てのページで subtle", () => {
      const page = makePage({ focusCharacterId: "char1" }); // キャラクターがいても subtle
      expect(getPageHighlightLevel("require_human_safety_review", page)).toBe("subtle");
    });
  });

  describe("その他の intent", () => {
    it("confirm_approval の場合は none", () => {
      expect(getPageHighlightLevel("confirm_approval", makePage())).toBe("none");
    });

    it("review_personalization_inputs の場合は none", () => {
      expect(getPageHighlightLevel("review_personalization_inputs", makePage())).toBe("none");
    });
  });
});
