import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CinematicViewer } from "@/components/cinematic-viewer";
import type { ReadingItem } from "@/components/book-viewer";
import type { ReactNode, HTMLAttributes } from "react";

vi.mock("framer-motion", () => ({
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
    img: ({ src, alt, ...props }: { src?: string; alt?: string; [key: string]: unknown }) => {
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
      return <img src={src} alt={alt} {...(validProps as HTMLAttributes<HTMLImageElement>)} />;
    },
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockItems: ReadingItem[] = [
  {
    kind: "story_page",
    storyPageIndex: 0,
    page: {
      pageNumber: 0,
      text: "テスト本文1",
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
});
