import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GenerationProgress } from "@/components/generation-progress";
import type { BookDoc, PageDoc } from "@/lib/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    circle: ({ ...props }: any) => (
      <circle {...props} />
    ),
  },
  useReducedMotion: () => false,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" aria-valuenow={value} />
  ),
}));

vi.mock("@/lib/motion", () => ({
  pulseVariants: {},
}));

function makeBook(pageCount: number): BookDoc {
  return { pageCount } as unknown as BookDoc;
}

function makePage(pageNumber: number, overrides: Partial<PageDoc> = {}): PageDoc {
  return {
    pageNumber,
    text: `Page ${pageNumber}`,
    imageUrl: `https://example.com/page${pageNumber}.png`,
    imagePrompt: "prompt",
    status: "completed",
    ...overrides,
  } as PageDoc;
}

describe("GenerationProgress — progress count", () => {
  it("counts completed pages", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "completed" }),
      makePage(2, { status: "completed" }),
    ];
    render(<GenerationProgress book={makeBook(3)} pages={pages} />);
    expect(screen.getAllByText("3")).toHaveLength(2); // One in ring, one in status text
  });

  it("counts fallback_completed pages", () => {
    const pages = [
      makePage(0, { status: "fallback_completed" }),
      makePage(1, { status: "fallback_completed" }),
      makePage(2, { status: "fallback_completed" }),
    ];
    render(<GenerationProgress book={makeBook(3)} pages={pages} />);
    expect(screen.getAllByText("3")).toHaveLength(2);
  });

  it("counts mixed completed and fallback_completed — reproduces feedback #2 (1 completed + 7 fallback)", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "fallback_completed" }),
      makePage(2, { status: "fallback_completed" }),
      makePage(3, { status: "fallback_completed" }),
      makePage(4, { status: "fallback_completed" }),
      makePage(5, { status: "fallback_completed" }),
      makePage(6, { status: "fallback_completed" }),
      makePage(7, { status: "fallback_completed" }),
    ];
    render(<GenerationProgress book={makeBook(8)} pages={pages} />);
    expect(screen.getAllByText("8")).toHaveLength(2);
  });

  it("does not count image_failed pages", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "fallback_completed" }),
      makePage(2, { status: "image_failed" }),
    ];
    render(<GenerationProgress book={makeBook(3)} pages={pages} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    // 3 might appear twice: total and also in the grid circles
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("does not count generating pages", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "generating" }),
    ];
    render(<GenerationProgress book={makeBook(2)} pages={pages} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });
});

describe("GenerationProgress — thumbnail rendering", () => {
  it("renders image for completed page", () => {
    const pages = [makePage(0, { status: "completed", imageUrl: "https://example.com/p0.png" })];
    render(<GenerationProgress book={makeBook(1)} pages={pages} />);
    expect(screen.getByAltText("ページ 1")).toHaveAttribute("src", "https://example.com/p0.png");
  });

  it("renders image for fallback_completed page", () => {
    const pages = [makePage(0, { status: "fallback_completed", imageUrl: "https://example.com/p0.png" })];
    render(<GenerationProgress book={makeBook(1)} pages={pages} />);
    expect(screen.getByAltText("ページ 1")).toHaveAttribute("src", "https://example.com/p0.png");
  });

  it("does not render image for image_failed page — shows placeholder", () => {
    const pages = [makePage(0, { status: "image_failed", imageUrl: "https://example.com/p0.png" })];
    render(<GenerationProgress book={makeBook(1)} pages={pages} />);
    expect(screen.queryByAltText("ページ 1")).not.toBeInTheDocument();
  });

  it("does not render image for failed page — shows × marker", () => {
    const pages = [makePage(0, { status: "failed", imageUrl: "https://example.com/p0.png" })];
    render(<GenerationProgress book={makeBook(1)} pages={pages} />);
    expect(screen.queryByAltText("ページ 1")).not.toBeInTheDocument();
    expect(screen.getByText("×")).toBeInTheDocument();
  });

  it("does not render image for generating page — shows in-progress text", () => {
    const pages = [makePage(0, { status: "generating", imageUrl: "https://example.com/p0.png" })];
    render(<GenerationProgress book={makeBook(1)} pages={pages} />);
    expect(screen.queryByAltText("ページ 1")).not.toBeInTheDocument();
    expect(screen.getByText("描いています...")).toBeInTheDocument();
  });
});
