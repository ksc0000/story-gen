import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { usePublicBooks } from "../use-public-books";
import { loadAllDemoBooks } from "@/lib/demo";

vi.mock("@/lib/demo", () => ({
  isDemoMode: true,
  loadAllDemoBooks: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

describe("usePublicBooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns demo books in demo mode", async () => {
    const mockDemoBooks = [
      { id: "1", title: "Book 1", pages: [{ imageUrl: "url1" }], status: "completed" },
      { id: "2", title: "Book 2", pages: [{ imageUrl: "url2" }], status: "completed" },
    ];
    (loadAllDemoBooks as Mock).mockReturnValue(mockDemoBooks);

    const { result } = renderHook(() => usePublicBooks(1));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0].title).toBe("Book 1");
    expect(result.current.books[0].coverImageUrl).toBe("url1");
  });
});
