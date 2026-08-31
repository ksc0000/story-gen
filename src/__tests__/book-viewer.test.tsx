import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookViewer, buildReadingItems, SWIPE_OFFSET_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from "@/components/book-viewer";
import type { PageDoc } from "@/lib/types";
import type { ReactNode, HTMLAttributes } from "react";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    motion: {
      div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
        const {
          animate: _animate,
          exit: _exit,
          initial: _initial,
          variants: _variants,
          transition: _transition,
          custom: _custom,
          drag: _drag,
          dragConstraints: _dragConstraints,
          dragElastic: _dragElastic,
          onDragEnd: _onDragEnd,
          ...validProps
        } = props;
        void _animate;
        void _exit;
        void _initial;
        void _variants;
        void _transition;
        void _custom;
        void _drag;
        void _dragConstraints;
        void _dragElastic;
        void _onDragEnd;
        return <div {...(validProps as HTMLAttributes<HTMLDivElement>)}>{children}</div>;
      },
      // eslint-disable-next-line react/display-name
      img: React.forwardRef<HTMLImageElement, { src?: string; alt?: string; [key: string]: unknown }>(
        ({ src, alt, ...props }, ref) => {
          const {
            animate: _animate,
            exit: _exit,
            initial: _initial,
            variants: _variants,
            transition: _transition,
            custom: _custom,
            ...validProps
          } = props;
          void _animate;
          void _exit;
          void _initial;
          void _variants;
          void _transition;
          void _custom;
          // eslint-disable-next-line @next/next/no-img-element
          return <img ref={ref} src={src as string | undefined} alt={(alt as string) ?? ""} {...(validProps as HTMLAttributes<HTMLImageElement>)} />;
        }
      ),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

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

    it("returns single cover-title sheet + story pages", () => {
      const items = buildReadingItems(v2Props);
      expect(items).toHaveLength(4); // cover+title + 3 pages
      expect(items[0].kind).toBe("cover_title_spread");
      expect(items[1].kind).toBe("story_page");
      expect(items[2].kind).toBe("story_page");
      expect(items[3].kind).toBe("story_page");
    });

    it("cover-title sheet item has correct imageUrl and title", () => {
      const items = buildReadingItems(v2Props);
      const cover = items[0];
      expect(cover.kind).toBe("cover_title_spread");
      if (cover.kind === "cover_title_spread") {
        expect(cover.imageUrl).toBe("https://example.com/cover.png");
        expect(cover.title).toBe("テスト絵本");
      }
    });

    it("cover-title sheet carries titleSpreadText and openingNarration", () => {
      const items = buildReadingItems(v2Props);
      const ts = items[0];
      expect(ts.kind).toBe("cover_title_spread");
      if (ts.kind === "cover_title_spread") {
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
      expect(items).toHaveLength(4);
      const ts = items[0];
      if (ts.kind === "cover_title_spread") {
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

    it("returns a single cover-title sheet when no pages but cover exists", () => {
      const items = buildReadingItems({
        pages: [],
        title: "カバーのみ",
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverStatus: "completed",
        coverImageUrl: "https://example.com/cover.png",
      });
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe("cover_title_spread");
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

describe("BookViewer image loading, skeleton, error retry, and decoding='async'", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading skeleton ('絵を準備中...') and img with decoding='async'", () => {
    render(<BookViewer pages={basePages} title="テスト絵本" />);

    // Skeleton indicator present while loading
    const skeletons = screen.getAllByText("絵を準備中...");
    expect(skeletons.length).toBeGreaterThan(0);

    // img has decoding="async" attribute
    const images = document.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => {
      expect(img.getAttribute("decoding")).toBe("async");
    });
  });

  it("shows error fallback with retry button when image load fails", () => {
    render(<BookViewer pages={basePages} title="テスト絵本" />);

    const images = document.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);

    // Trigger onError on the image
    fireEvent.error(images[0]);

    // Error message and retry button appear
    const errorMsg = screen.getAllByText("画像を読み込めませんでした");
    expect(errorMsg.length).toBeGreaterThan(0);

    const retryBtn = screen.getAllByRole("button", { name: "再試行" });
    expect(retryBtn.length).toBeGreaterThan(0);

    // Clicking retry resets to loading state
    fireEvent.click(retryBtn[0]);
    expect(screen.getAllByText("絵を準備中...").length).toBeGreaterThan(0);
  });
});
