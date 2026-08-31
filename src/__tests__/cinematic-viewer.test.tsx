import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CinematicViewer, getAutoplayIntervalMs, AUTOPLAY_BASE_MS, AUTOPLAY_COVER_MS, AUTOPLAY_MIN_MS, AUTOPLAY_MAX_MS } from "@/components/cinematic-viewer";
import type { ReadingItem } from "@/components/book-viewer";
import type { ReactNode, HTMLAttributes } from "react";

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
      p: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
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
        return <p {...(validProps as HTMLAttributes<HTMLParagraphElement>)}>{children}</p>;
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

const mockItems: ReadingItem[] = [
  {
    kind: "story_page",
    storyPageIndex: 0,
    page: {
      pageNumber: 0,
      text: "テスト本文1",
      imagePrompt: "a watercolor scene of a child playing",
      imageUrl: "https://example.com/1.png",
      status: "completed",
    },
  },
  {
    kind: "story_page",
    storyPageIndex: 1,
    page: {
      pageNumber: 1,
      text: "テスト本文2",
      imagePrompt: "a watercolor scene of a child sleeping",
      imageUrl: "https://example.com/2.png",
      status: "completed",
    },
  },
];

describe("CinematicViewer UI and safe area tests", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("includes top safe area inset padding in top bar container", () => {
    const handleClose = vi.fn();
    render(<CinematicViewer items={mockItems} title="テストタイトル" onClose={handleClose} />);

    const closeBtn = screen.getByRole("button", { name: "閉じる" });
    const topBar = closeBtn.closest("div.absolute.left-0.right-0.top-0");
    expect(topBar).not.toBeNull();
    expect(topBar?.className).toContain("pt-[calc(env(safe-area-inset-top,0px)+12px)]");
  });

  it("toggles controls visibility on background tap/click", () => {
    const handleClose = vi.fn();
    const { container } = render(<CinematicViewer items={mockItems} title="テストタイトル" onClose={handleClose} />);

    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();

    // Click background container
    fireEvent.click(container.firstChild as HTMLElement);
    expect(screen.queryByRole("button", { name: "閉じる" })).toBeNull();

    // Click again to bring controls back
    fireEvent.click(container.firstChild as HTMLElement);
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  it("toggles text contrast in portrait mode using SunMoon button", () => {
    const handleClose = vi.fn();
    render(<CinematicViewer items={mockItems} title="テストタイトル" onClose={handleClose} />);

    const contrastBtn = screen.getByRole("button", { name: "文字の明暗を切り替え" });
    expect(contrastBtn).toBeInTheDocument();

    const textEl = screen.getByText("テスト本文1");
    expect(textEl.className).toContain("text-white");

    fireEvent.click(contrastBtn);
    expect(textEl.className).toContain("text-gray-900");
  });

  it("renders image with decoding='async' and loading skeleton indicator", () => {
    const handleClose = vi.fn();
    render(<CinematicViewer items={mockItems} title="テストタイトル" onClose={handleClose} />);

    expect(screen.getByText("絵を準備中...")).toBeInTheDocument();

    const images = document.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].getAttribute("decoding")).toBe("async");
  });

  it("handles image error and displays retry button", () => {
    const handleClose = vi.fn();
    render(<CinematicViewer items={mockItems} title="テストタイトル" onClose={handleClose} />);

    const images = document.querySelectorAll("img");
    fireEvent.error(images[0]);

    expect(screen.getByText("画像を読み込めませんでした")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "再試行" });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(screen.getByText("絵を準備中...")).toBeInTheDocument();
  });
});

describe("getAutoplayIntervalMs calculation logic", () => {
  it("returns cover fixed interval (4500ms) for cover title spread or undefined item", () => {
    expect(getAutoplayIntervalMs()).toBe(AUTOPLAY_COVER_MS);
    expect(getAutoplayIntervalMs({ kind: "cover_title_spread", imageUrl: "https://example.com/cover.png", title: "テスト絵本" })).toBe(AUTOPLAY_COVER_MS);
  });

  it("clamps short text (<= 9 chars) to minimum interval (3000ms)", () => {
    // 0 chars: base 2500 -> clamped to 3000
    const emptyItem: ReadingItem = {
      kind: "story_page",
      storyPageIndex: 0,
      page: { pageNumber: 0, text: "", status: "completed", imageUrl: "https://example.com/p.png", imagePrompt: "a gentle watercolor scene" },
    };
    expect(getAutoplayIntervalMs(emptyItem)).toBe(AUTOPLAY_MIN_MS);

    // 9 chars: 2500 + 9 * 55 = 2995ms -> clamped to 3000ms
    const shortItem: ReadingItem = {
      kind: "story_page",
      storyPageIndex: 0,
      page: { pageNumber: 0, text: "あいうえおかきくけ", status: "completed", imageUrl: "https://example.com/p.png", imagePrompt: "a gentle watercolor scene" },
    };
    expect(getAutoplayIntervalMs(shortItem)).toBe(AUTOPLAY_MIN_MS);
  });

  it("calculates expected interval for short-medium text (~30 chars)", () => {
    // 30 chars: 2500 + 30 * 55 = 4150ms
    const text30 = "あ".repeat(30);
    const item30: ReadingItem = {
      kind: "story_page",
      storyPageIndex: 0,
      page: { pageNumber: 0, text: text30, status: "completed", imageUrl: "https://example.com/p.png", imagePrompt: "a gentle watercolor scene" },
    };
    expect(getAutoplayIntervalMs(item30)).toBe(4150);
  });

  it("calculates expected interval for medium text (100 chars)", () => {
    // 100 chars: 2500 + 100 * 55 = 8000ms
    const text100 = "あ".repeat(100);
    const item100: ReadingItem = {
      kind: "story_page",
      storyPageIndex: 0,
      page: { pageNumber: 0, text: text100, status: "completed", imageUrl: "https://example.com/p.png", imagePrompt: "a gentle watercolor scene" },
    };
    expect(getAutoplayIntervalMs(item100)).toBe(8000);
  });

  it("clamps long text (>= 137 chars) to maximum interval (10000ms)", () => {
    // 150 chars: 2500 + 150 * 55 = 10750ms -> clamped to 10000ms
    const text150 = "あ".repeat(150);
    const item150: ReadingItem = {
      kind: "story_page",
      storyPageIndex: 0,
      page: { pageNumber: 0, text: text150, status: "completed", imageUrl: "https://example.com/p.png", imagePrompt: "a gentle watercolor scene" },
    };
    expect(getAutoplayIntervalMs(item150)).toBe(AUTOPLAY_MAX_MS);
  });
});
