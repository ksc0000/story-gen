import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookCard } from "@/components/bookshelf/book-card";
import { Timestamp } from "firebase/firestore";
import type { BookDoc } from "@/lib/types";

vi.mock("next/image", () => ({
  default: (props: ComponentPropsWithoutRef<"img"> & { fill?: boolean }) => {
    const { fill, ...imgProps } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={imgProps.alt ?? ""} />;
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover: _wh, whileTap: _wt, ...props }: ComponentPropsWithoutRef<"div"> & { whileHover?: unknown; whileTap?: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMotionValue: () => ({
    get: () => 0,
    set: () => {},
  }),
  useTransform: () => ({
    get: () => 0,
  }),
  useSpring: () => ({
    get: () => 0,
  }),
}));

describe("BookCard", () => {
  const mockBook: BookDoc & { id: string } = {
    id: "book-1",
    userId: "user-1",
    title: "Test Book",
    status: "completed",
    coverImageUrl: "https://example.com/cover.jpg",
    createdAt: Timestamp.fromDate(new Date("2024-01-01")),
    theme: "adventure",
    style: "watercolor",
    pageCount: 8,
    input: { childName: "Child" },
    expiresAt: null,
  };

  it("renders book title and creation date", () => {
    render(<BookCard book={mockBook} />);

    expect(screen.getByText("Test Book")).toBeInTheDocument();
    expect(screen.getByText("2024/1/1")).toBeInTheDocument();
  });

  it("renders cover image if available", () => {
    render(<BookCard book={mockBook} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("renders placeholder when cover image is missing", () => {
    const bookNoCover = { ...mockBook, coverImageUrl: undefined };
    render(<BookCard book={bookNoCover} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/images/icons/book.webp");
  });

  it("shows generating state when status is generating", () => {
    const generatingBook = {
      ...mockBook,
      status: "generating" as const,
      title: "",
      coverImageUrl: undefined,
    };
    render(<BookCard book={generatingBook} />);

    expect(screen.getAllByText("生成中...").length).toBeGreaterThan(0);
  });

  it("links to correct reader URL for completed book", () => {
    render(<BookCard book={mockBook} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/book?id=book-1");
  });

  it("links to generating URL for generating book", () => {
    const generatingBook = { ...mockBook, status: "generating" as const };
    render(<BookCard book={generatingBook} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/generating?id=book-1");
  });
});
