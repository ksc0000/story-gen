import type { ComponentPropsWithoutRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookPreviewDialog } from "@/components/book-preview-dialog";
import type { BookDoc } from "@/lib/types";

vi.mock("next/image", () => ({
  default: (props: ComponentPropsWithoutRef<"img"> & { fill?: boolean; priority?: boolean }) => {
    const { fill, priority, ...imgProps } = props;
    void fill;
    void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={imgProps.alt ?? ""} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

describe("BookPreviewDialog", () => {
  const mockCompletedBook: BookDoc & { id: string } = {
    id: "book-completed-1",
    userId: "user-1",
    title: "きらきら星のぼうけん",
    status: "completed",
    coverImageUrl: "https://example.com/cover.jpg",
    createdAt: null,
    updatedAt: null,
  };

  const mockGeneratingBook: BookDoc & { id: string } = {
    id: "book-generating-2",
    userId: "user-1",
    title: "魔法の森のなぞ",
    status: "generating",
    createdAt: null,
    updatedAt: null,
  };

  it("returns null when book is null", () => {
    const { container } = render(<BookPreviewDialog book={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title, CTA, and cover link for completed book", () => {
    const onClose = vi.fn();
    render(<BookPreviewDialog book={mockCompletedBook} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("きらきら星のぼうけん")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2); // Top CTA link and Cover image link

    expect(links[0]).toHaveAttribute("href", "/book?id=book-completed-1");
    expect(links[0]).toHaveTextContent("絵本を読む");

    expect(links[1]).toHaveAttribute("href", "/book?id=book-completed-1");
    expect(links[1]).toHaveAttribute("aria-label", "きらきら星のぼうけんの表紙 (絵本を読む)");
  });

  it("renders appropriate status and label for generating book", () => {
    render(<BookPreviewDialog book={mockGeneratingBook} onClose={() => {}} />);

    expect(screen.getByText("魔法の森のなぞ")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/generating?id=book-generating-2");
    expect(links[0]).toHaveTextContent("生成状況を見る");

    expect(links[1]).toHaveAttribute("href", "/generating?id=book-generating-2");
    expect(links[1]).toHaveAttribute("aria-label", "魔法の森のなぞの表紙 (生成状況を見る)");
    expect(screen.getByText("生成中...")).toBeInTheDocument();
  });

  it("calls onClose when top CTA link is clicked", () => {
    const onClose = vi.fn();
    render(<BookPreviewDialog book={mockCompletedBook} onClose={onClose} />);

    const links = screen.getAllByRole("link");
    fireEvent.click(links[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cover image link is clicked", () => {
    const onClose = vi.fn();
    render(<BookPreviewDialog book={mockCompletedBook} onClose={onClose} />);

    const links = screen.getAllByRole("link");
    fireEvent.click(links[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button (X) is clicked", () => {
    const onClose = vi.fn();
    render(<BookPreviewDialog book={mockCompletedBook} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: "閉じる" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key press", () => {
    const onClose = vi.fn();
    render(<BookPreviewDialog book={mockCompletedBook} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked, but not when content panel is clicked", () => {
    const onClose = vi.fn();
    render(<BookPreviewDialog book={mockCompletedBook} onClose={onClose} />);

    const dialogBackdrop = screen.getByRole("dialog");
    const contentTitle = screen.getByText("きらきら星のぼうけん");

    fireEvent.click(contentTitle);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialogBackdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
