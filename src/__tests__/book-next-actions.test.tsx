import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookNextActions } from "@/components/book-next-actions";
import type { BookDoc } from "@/lib/types";

// BookNextActions が参照するのは id/public/status など一部のみ。
// BookDoc 全体を組むとテストの意図が埋もれるため部分フィクスチャとする。
const mockBookPrivate = {
  id: "book-1",
  userId: "user-1",
  title: "テスト絵本",
  theme: "adventure",
  status: "completed",
  pageCount: 4,
  createdAt: {} as unknown as BookDoc["createdAt"],
  updatedAt: {} as unknown as BookDoc["updatedAt"],
  public: false,
} as unknown as BookDoc & { id: string };

const mockBookPublic = {
  ...mockBookPrivate,
  public: true,
};

describe("BookNextActions", () => {
  it("renders 'Web公開して共有' when book is private and calls onToggleShare on click", () => {
    const handleToggleShare = vi.fn();
    const handleCopyLink = vi.fn();

    render(
      <BookNextActions
        bookId="book-1"
        book={mockBookPrivate}
        isDemoMode={false}
        onToggleShare={handleToggleShare}
        onCopyLink={handleCopyLink}
        isSharing={false}
      />
    );

    const shareButton = screen.getByRole("button", { name: /Web公開して共有/i });
    expect(shareButton).toBeDefined();

    fireEvent.click(shareButton);
    expect(handleToggleShare).toHaveBeenCalledTimes(1);
    expect(handleCopyLink).not.toHaveBeenCalled();
  });

  it("renders 'リンクをコピー' when book is public and calls onCopyLink on click", () => {
    const handleToggleShare = vi.fn();
    const handleCopyLink = vi.fn();

    render(
      <BookNextActions
        bookId="book-1"
        book={mockBookPublic}
        isDemoMode={false}
        onToggleShare={handleToggleShare}
        onCopyLink={handleCopyLink}
        isSharing={false}
      />
    );

    const copyButton = screen.getByRole("button", { name: /リンクをコピー/i });
    expect(copyButton).toBeDefined();

    fireEvent.click(copyButton);
    expect(handleCopyLink).toHaveBeenCalledTimes(1);
    expect(handleToggleShare).not.toHaveBeenCalled();
  });
});
