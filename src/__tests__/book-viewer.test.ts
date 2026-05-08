import { describe, it, expect } from "vitest";
import { buildReadingItems, SWIPE_OFFSET_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from "@/components/book-viewer";
import type { PageDoc } from "@/lib/types";

function makePage(pageNumber: number, overrides?: Partial<PageDoc>): PageDoc {
  return {
    pageNumber,
    text: `Page ${pageNumber} text`,
    imageUrl: `https://example.com/page${pageNumber}.png`,
    imagePrompt: "prompt",
    status: "completed",
    ...overrides,
  } as PageDoc;
}

const basePages: PageDoc[] = [makePage(0), makePage(1), makePage(2)];

describe("buildReadingItems", () => {
  describe("v1 (no cover)", () => {
    it("returns only story pages when hasCoverPage is undefined", () => {
      const items = buildReadingItems({ pages: basePages, title: "テスト絵本" });
      expect(items).toHaveLength(3);
      expect(items.every((i) => i.kind === "story_page")).toBe(true);
    });

    it("returns only story pages when hasCoverPage is false", () => {
      const items = buildReadingItems({
        pages: basePages,
        title: "テスト絵本",
        hasCoverPage: false,
        coverStatus: "failed",
        coverImageUrl: undefined,
      });
      expect(items).toHaveLength(3);
      expect(items[0].kind).toBe("story_page");
    });

    it("returns only story pages when coverStatus is not completed", () => {
      const items = buildReadingItems({
        pages: basePages,
        title: "テスト絵本",
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverStatus: "generating",
        coverImageUrl: "https://example.com/cover.png",
      });
      expect(items).toHaveLength(3);
      expect(items[0].kind).toBe("story_page");
    });

    it("returns only story pages when readingStructureVersion is undefined", () => {
      const items = buildReadingItems({
        pages: basePages,
        title: "テスト絵本",
        hasCoverPage: true,
        coverStatus: "completed",
        coverImageUrl: "https://example.com/cover.png",
      });
      expect(items).toHaveLength(3);
      expect(items[0].kind).toBe("story_page");
    });

    it("returns only story pages when readingStructureVersion is v1_pages_only", () => {
      const items = buildReadingItems({
        pages: basePages,
        title: "テスト絵本",
        hasCoverPage: true,
        readingStructureVersion: "v1_pages_only",
        coverStatus: "completed",
        coverImageUrl: "https://example.com/cover.png",
      });
      expect(items).toHaveLength(3);
      expect(items[0].kind).toBe("story_page");
    });

    it("returns only story pages when coverImageUrl is empty", () => {
      const items = buildReadingItems({
        pages: basePages,
        title: "テスト絵本",
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverStatus: "completed",
        coverImageUrl: "",
      });
      expect(items).toHaveLength(3);
      expect(items[0].kind).toBe("story_page");
    });

    it("returns only story pages when coverImageUrl is undefined", () => {
      const items = buildReadingItems({
        pages: basePages,
        title: "テスト絵本",
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverStatus: "completed",
      });
      expect(items).toHaveLength(3);
      expect(items[0].kind).toBe("story_page");
    });
  });

  describe("v2 (with cover)", () => {
    const v2Props = {
      pages: basePages,
      title: "テスト絵本",
      hasCoverPage: true as const,
      coverStatus: "completed" as const,
      coverImageUrl: "https://example.com/cover.png",
      readingStructureVersion: "v2_cover_title_story" as const,
      titleSpreadText: "むかしむかし…",
      openingNarration: "ある日のこと",
    };

    it("returns cover + title spread + story pages", () => {
      const items = buildReadingItems(v2Props);
      expect(items).toHaveLength(5); // cover + title + 3 pages
      expect(items[0].kind).toBe("cover");
      expect(items[1].kind).toBe("title_spread");
      expect(items[2].kind).toBe("story_page");
      expect(items[3].kind).toBe("story_page");
      expect(items[4].kind).toBe("story_page");
    });

    it("cover item has correct imageUrl and title", () => {
      const items = buildReadingItems(v2Props);
      const cover = items[0];
      expect(cover.kind).toBe("cover");
      if (cover.kind === "cover") {
        expect(cover.imageUrl).toBe("https://example.com/cover.png");
        expect(cover.title).toBe("テスト絵本");
      }
    });

    it("title spread item carries titleSpreadText and openingNarration", () => {
      const items = buildReadingItems(v2Props);
      const ts = items[1];
      expect(ts.kind).toBe("title_spread");
      if (ts.kind === "title_spread") {
        expect(ts.title).toBe("テスト絵本");
        expect(ts.titleSpreadText).toBe("むかしむかし…");
        expect(ts.openingNarration).toBe("ある日のこと");
      }
    });

    it("story page items preserve storyPageIndex (0-based)", () => {
      const items = buildReadingItems(v2Props);
      const storyItems = items.filter((i) => i.kind === "story_page");
      expect(storyItems).toHaveLength(3);
      storyItems.forEach((si, idx) => {
        if (si.kind === "story_page") {
          expect(si.storyPageIndex).toBe(idx);
          expect(si.page.pageNumber).toBe(idx);
        }
      });
    });

    it("title spread without optional text still renders", () => {
      const items = buildReadingItems({
        ...v2Props,
        titleSpreadText: undefined,
        openingNarration: undefined,
      });
      expect(items).toHaveLength(5);
      const ts = items[1];
      if (ts.kind === "title_spread") {
        expect(ts.titleSpreadText).toBeUndefined();
        expect(ts.openingNarration).toBeUndefined();
      }
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no pages and no cover", () => {
      const items = buildReadingItems({ pages: [], title: "空の絵本" });
      expect(items).toHaveLength(0);
    });

    it("returns cover + title spread when no pages but cover exists", () => {
      const items = buildReadingItems({
        pages: [],
        title: "カバーのみ",
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverStatus: "completed",
        coverImageUrl: "https://example.com/cover.png",
      });
      expect(items).toHaveLength(2);
      expect(items[0].kind).toBe("cover");
      expect(items[1].kind).toBe("title_spread");
    });
  });
});

describe("swipe thresholds", () => {
  it("SWIPE_OFFSET_THRESHOLD is a positive number", () => {
    expect(SWIPE_OFFSET_THRESHOLD).toBeGreaterThan(0);
    expect(typeof SWIPE_OFFSET_THRESHOLD).toBe("number");
  });

  it("SWIPE_VELOCITY_THRESHOLD is a positive number", () => {
    expect(SWIPE_VELOCITY_THRESHOLD).toBeGreaterThan(0);
    expect(typeof SWIPE_VELOCITY_THRESHOLD).toBe("number");
  });

  it("offset threshold is less than velocity threshold", () => {
    expect(SWIPE_OFFSET_THRESHOLD).toBeLessThan(SWIPE_VELOCITY_THRESHOLD);
  });
});
