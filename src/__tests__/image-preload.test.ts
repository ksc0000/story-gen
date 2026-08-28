import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  preloadImage,
  getReadingItemImageUrl,
  preloadNextReadingItemImage,
  clearPreloadCache,
} from "@/lib/image-preload";
import type { ReadingItem } from "@/components/book-viewer";

describe("image-preload utility", () => {
  beforeEach(() => {
    clearPreloadCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearPreloadCache();
  });

  describe("getReadingItemImageUrl", () => {
    it("returns null for null or undefined item", () => {
      expect(getReadingItemImageUrl(null)).toBeNull();
      expect(getReadingItemImageUrl(undefined)).toBeNull();
    });

    it("returns cover imageUrl for cover_title_spread item", () => {
      const item: ReadingItem = {
        kind: "cover_title_spread",
        imageUrl: "https://example.com/cover.jpg",
        title: "Test Book",
      };
      expect(getReadingItemImageUrl(item)).toBe("https://example.com/cover.jpg");
    });

    it("returns story page imageUrl for story_page item", () => {
      const item: ReadingItem = {
        kind: "story_page",
        storyPageIndex: 0,
        page: {
          pageNumber: 0,
          text: "Sample page",
          imageUrl: "https://example.com/page1.jpg",
          status: "completed",
        },
      };
      expect(getReadingItemImageUrl(item)).toBe("https://example.com/page1.jpg");
    });

    it("returns null if story page imageUrl is missing", () => {
      const item: ReadingItem = {
        kind: "story_page",
        storyPageIndex: 0,
        page: {
          pageNumber: 0,
          text: "Sample page without image",
          status: "generating",
        },
      };
      expect(getReadingItemImageUrl(item)).toBeNull();
    });
  });

  describe("preloadImage", () => {
    it("returns false for null, undefined, or empty string", async () => {
      expect(await preloadImage(null)).toBe(false);
      expect(await preloadImage(undefined)).toBe(false);
      expect(await preloadImage("")).toBe(false);
    });

    it("creates Image with decoding='async' and resolves true on load", async () => {
      const OriginalImage = globalThis.Image;

      // Mock Image constructor
      class MockImage {
        decoding = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = "";

        get src() {
          return this._src;
        }

        set src(val: string) {
          this._src = val;
          // Trigger onload asynchronously
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }

      globalThis.Image = MockImage as unknown as typeof Image;

      const promise = preloadImage("https://example.com/test.png");
      const result = await promise;

      expect(result).toBe(true);

      globalThis.Image = OriginalImage;
    });

    it("resolves false on image load error", async () => {
      const OriginalImage = globalThis.Image;

      class MockErrorImage {
        decoding = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = "";

        get src() {
          return this._src;
        }

        set src(val: string) {
          this._src = val;
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      }

      globalThis.Image = MockErrorImage as unknown as typeof Image;

      const result = await preloadImage("https://example.com/error.png");
      expect(result).toBe(false);

      globalThis.Image = OriginalImage;
    });

    it("uses cache and resolves immediately for already preloaded URLs", async () => {
      let imageInstantiations = 0;
      const OriginalImage = globalThis.Image;

      class MockImage {
        decoding = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = "";

        constructor() {
          imageInstantiations++;
        }

        get src() {
          return this._src;
        }

        set src(val: string) {
          this._src = val;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }

      globalThis.Image = MockImage as unknown as typeof Image;

      await preloadImage("https://example.com/cached.png");
      expect(imageInstantiations).toBe(1);

      // Second preload should hit cache and not instantiate new Image
      const secondResult = await preloadImage("https://example.com/cached.png");
      expect(secondResult).toBe(true);
      expect(imageInstantiations).toBe(1);

      globalThis.Image = OriginalImage;
    });
  });

  describe("preloadNextReadingItemImage", () => {
    it("preloads the next item image URL (currentIndex + 1)", async () => {
      const items: ReadingItem[] = [
        {
          kind: "cover_title_spread",
          imageUrl: "https://example.com/cover.png",
          title: "Cover Title",
        },
        {
          kind: "story_page",
          storyPageIndex: 0,
          page: {
            pageNumber: 0,
            text: "Page 1",
            imageUrl: "https://example.com/page1.png",
            status: "completed",
          },
        },
      ];

      const OriginalImage = globalThis.Image;
      let preloadedSrc = "";

      class MockImage {
        decoding = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(val: string) {
          preloadedSrc = val;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }

      globalThis.Image = MockImage as unknown as typeof Image;

      const result = await preloadNextReadingItemImage(items, 0);
      expect(result).toBe(true);
      expect(preloadedSrc).toBe("https://example.com/page1.png");

      globalThis.Image = OriginalImage;
    });

    it("returns false if next index is out of bounds", async () => {
      const items: ReadingItem[] = [
        {
          kind: "cover_title_spread",
          imageUrl: "https://example.com/cover.png",
          title: "Cover Title",
        },
      ];

      const result = await preloadNextReadingItemImage(items, 0);
      expect(result).toBe(false);
    });
  });
});
