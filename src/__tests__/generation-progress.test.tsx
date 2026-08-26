import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GenerationProgress } from "@/components/generation-progress";
import {
  getGenerationStages,
  getEstimatedTimeText,
  formatElapsedTime,
  getOverallProgressPercent,
} from "@/lib/generation-progress-utils";
import type { BookDoc, PageDoc } from "@/lib/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    circle: (props: React.SVGProps<SVGCircleElement>) => (
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

function makeBook(pageCount: number, overrides: Partial<BookDoc> = {}): BookDoc {
  return { pageCount, ...overrides } as unknown as BookDoc;
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

describe("generation-progress-utils", () => {
  it("formats estimated time text correctly by page count", () => {
    expect(getEstimatedTimeText(4)).toBe("約1分〜1分30秒");
    expect(getEstimatedTimeText(8)).toBe("約2分〜3分");
    expect(getEstimatedTimeText(12)).toBe("約3分30秒〜4分30秒");
  });

  it("formats elapsed time correctly", () => {
    expect(formatElapsedTime(0)).toBe("0秒");
    expect(formatElapsedTime(45)).toBe("45秒");
    expect(formatElapsedTime(65)).toBe("1分05秒");
    expect(formatElapsedTime(140)).toBe("2分20秒");
  });

  it("computes 4 stages correctly across generation lifecycle", () => {
    // Stage 0: Story creation
    const { stages: stages0, currentStageIndex: idx0 } = getGenerationStages(
      makeBook(4),
      []
    );
    expect(idx0).toBe(0);
    expect(stages0[0].status).toBe("current");
    expect(stages0[0].isIndeterminate).toBe(true);

    // Stage 1: Cover generation
    const { stages: stages1, currentStageIndex: idx1 } = getGenerationStages(
      makeBook(4, { title: "Title", coverStatus: "generating" }),
      [makePage(0, { status: "generating" })]
    );
    expect(idx1).toBe(1);
    expect(stages1[1].status).toBe("current");
    expect(stages1[1].isIndeterminate).toBe(true);

    // Stage 2: Page images generation
    const { stages: stages2, currentStageIndex: idx2 } = getGenerationStages(
      makeBook(4, { title: "Title", coverStatus: "completed" }),
      [makePage(0, { status: "completed" }), makePage(1, { status: "generating" })]
    );
    expect(idx2).toBe(2);
    expect(stages2[2].status).toBe("current");
    expect(stages2[2].detail).toBe("1/4");

    // Stage 3: Finishing
    const { stages: stages3, currentStageIndex: idx3 } = getGenerationStages(
      makeBook(4, { title: "Title", coverStatus: "completed" }),
      [
        makePage(0, { status: "completed" }),
        makePage(1, { status: "completed" }),
        makePage(2, { status: "completed" }),
        makePage(3, { status: "completed" }),
      ]
    );
    expect(idx3).toBe(3);
    expect(stages3[3].status).toBe("current");
  });

  it("computes smooth progress percentages", () => {
    expect(getOverallProgressPercent(makeBook(4), [])).toBe(15);
    expect(
      getOverallProgressPercent(makeBook(4, { coverStatus: "generating" }), [
        makePage(0, { status: "generating" }),
      ])
    ).toBe(30);
    expect(
      getOverallProgressPercent(makeBook(4, { coverStatus: "completed" }), [
        makePage(0, { status: "completed" }),
        makePage(1, { status: "completed" }),
        makePage(2, { status: "generating" }),
        makePage(3, { status: "generating" }),
      ])
    ).toBe(60);
  });
});

describe("GenerationProgress — 4-stage display and accessibility", () => {
  it("renders the 4 stages headers", () => {
    render(<GenerationProgress book={makeBook(4)} pages={[]} />);
    expect(screen.getByText("ストーリー作成")).toBeInTheDocument();
    expect(screen.getByText("表紙")).toBeInTheDocument();
    expect(screen.getByText("ページ画像")).toBeInTheDocument();
    expect(screen.getByText("仕上げ")).toBeInTheDocument();
  });

  it("displays estimated time and elapsed time banner", () => {
    render(<GenerationProgress book={makeBook(4)} pages={[]} />);
    expect(screen.getByText("所要目安: 約1分〜1分30秒")).toBeInTheDocument();
    expect(screen.getByText(/経過時間:/)).toBeInTheDocument();
  });

  it("contains aria-live='polite' on status container", () => {
    const { container } = render(<GenerationProgress book={makeBook(4)} pages={[]} />);
    const ariaLiveElement = container.querySelector('[aria-live="polite"]');
    expect(ariaLiveElement).toBeInTheDocument();
  });
});

describe("GenerationProgress — progress count", () => {
  it("counts completed pages", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "completed" }),
      makePage(2, { status: "completed" }),
    ];
    render(<GenerationProgress book={makeBook(3, { coverStatus: "completed" })} pages={pages} />);
    expect(screen.getAllByText("3")).toHaveLength(2); // One in ring, one in status text
  });

  it("counts fallback_completed pages", () => {
    const pages = [
      makePage(0, { status: "fallback_completed" }),
      makePage(1, { status: "fallback_completed" }),
      makePage(2, { status: "fallback_completed" }),
    ];
    render(<GenerationProgress book={makeBook(3, { coverStatus: "completed" })} pages={pages} />);
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
    render(<GenerationProgress book={makeBook(8, { coverStatus: "completed" })} pages={pages} />);
    expect(screen.getAllByText("8")).toHaveLength(2);
  });

  it("does not count image_failed pages", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "fallback_completed" }),
      makePage(2, { status: "image_failed" }),
    ];
    render(<GenerationProgress book={makeBook(3, { coverStatus: "completed" })} pages={pages} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    // 3 might appear twice: total and also in the grid circles
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("does not count generating pages", () => {
    const pages = [
      makePage(0, { status: "completed" }),
      makePage(1, { status: "generating" }),
    ];
    render(<GenerationProgress book={makeBook(2, { coverStatus: "completed" })} pages={pages} />);
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
