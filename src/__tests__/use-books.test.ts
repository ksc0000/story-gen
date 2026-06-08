import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { collection, doc, getDoc, onSnapshot, query, where, orderBy, type Query, type DocumentReference, type QuerySnapshot, type DocumentSnapshot } from "firebase/firestore";

// Mock the demo functions
vi.mock("@/lib/demo", () => ({
  isDemoMode: false,
  loadAllDemoBooks: vi.fn(),
}));

// Mock the firebase firestore functions
vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  };
});

// Mock the firebase instance
vi.mock("@/lib/firebase", () => {
  return {
    db: {},
  };
});

describe("useBooks hook", () => {
  let isDemoModeMock: boolean;

  beforeEach(() => {
    isDemoModeMock = false;
    vi.mocked(collection).mockClear();
    vi.mocked(doc).mockClear();
    vi.mocked(getDoc).mockClear();
    vi.mocked(onSnapshot).mockClear();
    vi.mocked(query).mockClear();
    vi.mocked(where).mockClear();
    vi.mocked(orderBy).mockClear();

    // Reset the mock implementation of demo module using the local variable
    vi.doMock("@/lib/demo", () => ({
      get isDemoMode() { return isDemoModeMock; },
      loadAllDemoBooks: vi.fn(() => [
        {
          id: "demo-1",
          title: "Demo Book 1",
          status: "completed",
          pages: [{ imageUrl: "http://demo.com/image.png" }],
        },
      ]),
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should return demo books immediately when in demo mode", async () => {
    isDemoModeMock = true;

    // We need to re-import to use the updated doMock
    const { useBooks } = await import("@/lib/hooks/use-books");

    const { result } = renderHook(() => useBooks("user123"));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0].id).toBe("demo-1");
    expect(result.current.books[0].coverImageUrl).toBe("http://demo.com/image.png");

    // In demo mode, it should not subscribe to firebase
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should return empty array and not load if userId is undefined", async () => {
    const { useBooks } = await import("@/lib/hooks/use-books");
    const { result } = renderHook(() => useBooks(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.books).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should fetch books using onSnapshot and set them", async () => {
    const { useBooks } = await import("@/lib/hooks/use-books");

    // Mock the onSnapshot implementation to immediately call the success callback
    const unsubscribeMock = vi.fn();
    vi.mocked(query).mockReturnValue("mockQuery" as unknown as Query);

    vi.mocked(onSnapshot).mockImplementation(((ref: Query, onNext: (snapshot: QuerySnapshot) => void) => {
      // Simulate the main query on books collection
      if ((ref as unknown as string) === "mockQuery") {
        const mockSnapshot = {
          docs: [
            { id: "book1", data: () => ({ title: "Book 1", status: "completed", coverImageUrl: "http://example.com/cover1.jpg" }) },
            { id: "book2", data: () => ({ title: "Book 2", status: "completed", coverImageUrl: "http://example.com/cover2.jpg" }) }
          ]
        };
        // Use setImmediate to let the hook mount first
        setImmediate(() => {
          onNext(mockSnapshot as unknown as QuerySnapshot);
        });
      }
      return unsubscribeMock;
    }) as unknown as typeof onSnapshot);

    const { result } = renderHook(() => useBooks("user123"));

    expect(result.current.loading).toBe(true);

    // Wait for the asynchronous state updates to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.books).toHaveLength(2);
    expect(result.current.books[0].id).toBe("book1");
    expect(result.current.books[0].title).toBe("Book 1");
    expect(result.current.books[1].id).toBe("book2");
  });

  it("should handle firestore errors", async () => {
    const { useBooks } = await import("@/lib/hooks/use-books");

    const unsubscribeMock = vi.fn();
    const mockError = new Error("Permission denied");

    vi.mocked(onSnapshot).mockImplementation(((ref: Query, onNext: (snapshot: QuerySnapshot) => void, onError?: (error: Error) => void) => {
      setImmediate(() => {
        if (onError) {
          onError(mockError);
        }
      });
      return unsubscribeMock;
    }) as unknown as typeof onSnapshot);

    const { result } = renderHook(() => useBooks("user123"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.books).toEqual([]);
  });

  it("should fetch cover image from page-0 if coverImageUrl is missing", async () => {
    const { useBooks } = await import("@/lib/hooks/use-books");

    const booksUnsubscribeMock = vi.fn();

    vi.mocked(onSnapshot).mockImplementation(((ref: Query, onNext: (snapshot: QuerySnapshot) => void) => {
      // Simulate the main query on books collection
      if (vi.mocked(query).mock.results.length > 0 && ref === vi.mocked(query).mock.results[0].value) {
        const mockSnapshot = {
          docs: [
            { id: "book1", data: () => ({ title: "Book 1", status: "completed" /* No coverImageUrl */ }) }
          ]
        };
        setImmediate(() => {
          (onNext as (snapshot: QuerySnapshot) => void)(mockSnapshot as unknown as QuerySnapshot);
        });
        return booksUnsubscribeMock;
      }
      return vi.fn();
    }) as unknown as typeof onSnapshot);

    // Mock getDoc for the page
    const mockPageSnapshot = {
      exists: () => true,
      data: () => ({ imageUrl: "http://example.com/page0.jpg" })
    };
    vi.mocked(getDoc).mockResolvedValue(mockPageSnapshot as unknown as DocumentSnapshot);

    // Provide mock values for the refs
    vi.mocked(query).mockReturnValue("mockQuery" as unknown as Query);
    vi.mocked(doc).mockReturnValue("mockDoc" as unknown as DocumentReference);

    const { result } = renderHook(() => useBooks("user123"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0].coverImageUrl).toBe("http://example.com/page0.jpg");

    // Ensure onSnapshot was called once (for the query) and getDoc was called once (for page-0)
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(getDoc).toHaveBeenCalledTimes(1);
  });

  it("should clean up listeners on unmount", async () => {
    const { useBooks } = await import("@/lib/hooks/use-books");

    const unsubscribeMock = vi.fn();

    vi.mocked(query).mockReturnValue("mockQuery" as unknown as Query);

    vi.mocked(onSnapshot).mockImplementation(((ref: Query, onNext: (snapshot: QuerySnapshot) => void) => {
      if ((ref as unknown as string) === "mockQuery") {
        const mockSnapshot = {
          docs: [
            { id: "book1", data: () => ({ title: "Book 1", status: "completed" }) }
          ]
        };
        setImmediate(() => {
          (onNext as (snapshot: QuerySnapshot) => void)(mockSnapshot as unknown as QuerySnapshot);
        });
        return unsubscribeMock;
      }
      return vi.fn();
    }) as unknown as typeof onSnapshot);

    const { unmount } = renderHook(() => useBooks("user123"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
