import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookViewer } from "@/components/book-viewer";
import type { PageDoc } from "@/lib/types";
import type { ReactNode, HTMLAttributes } from "react";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
        // Filter out framer-motion specific props that might cause warnings
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
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function makePage(pageNumber: number): PageDoc {
  return {
    pageNumber,
    text: `Page ${pageNumber + 1} text`,
    imageUrl: `https://example.com/page${pageNumber}.png`,
    status: "completed",
  } as PageDoc;
}

const mockPages = [makePage(0), makePage(1), makePage(2)];

describe("BookViewer Keyboard Navigation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
    document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
  });

  const expectPage = (num: number) => {
    const text = `Page ${num} text`;
    const elements = screen.getAllByText(text);
    expect(elements.length).toBeGreaterThan(0);
  };

  it("navigates with arrow keys", () => {
    render(<BookViewer pages={mockPages} title="Test" />);
    expectPage(1);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectPage(2);

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expectPage(3);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expectPage(2);

    fireEvent.keyDown(window, { key: "ArrowUp" });
    expectPage(1);
  });

  it("respects boundaries", () => {
    render(<BookViewer pages={mockPages} title="Test" />);
    expectPage(1);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expectPage(1);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectPage(3);
  });

  it("ignores keys when input is focused", () => {
    render(
      <div>
        <input data-testid="input" />
        <BookViewer pages={mockPages} title="Test" />
      </div>
    );
    const input = screen.getByTestId("input");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expectPage(1);
  });

  it("ignores keys when dialog is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);

    render(<BookViewer pages={mockPages} title="Test" />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectPage(1);

    document.body.removeChild(dialog);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectPage(2);
  });

  it("ignores keys when aria-modal element is open", () => {
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);

    render(<BookViewer pages={mockPages} title="Test" />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectPage(1);

    document.body.removeChild(modal);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expectPage(2);
  });
});
