import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useChildren } from "../use-children";
import { onSnapshot, collection, type CollectionReference, type QuerySnapshot } from "firebase/firestore";
import * as demoModule from "@/lib/demo";
import { db } from "@/lib/firebase";

// Mock dependencies
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("@/lib/demo", () => ({
  isDemoMode: false,
}));

describe("useChildren", () => {
  const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorMock.mockClear();
  });

  it("should return demo child when in demo mode", async () => {
    // Mock the property getter for isDemoMode
    Object.defineProperty(demoModule, 'isDemoMode', { get: () => true, configurable: true });

    const { result } = renderHook(() => useChildren("user-123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.children).toHaveLength(1);
    expect(result.current.children[0].id).toBe("demo-child-001");
    expect(result.current.activeChild?.id).toBe("demo-child-001");
    expect(result.current.error).toBeNull();
    expect(onSnapshot).not.toHaveBeenCalled();

    // Restore the property getter
    Object.defineProperty(demoModule, 'isDemoMode', { get: () => false, configurable: true });
  });

  it("should return empty array and loading false when userId is undefined", async () => {
    const { result } = renderHook(() => useChildren(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.children).toEqual([]);
    expect(result.current.activeChild).toBeNull();
    expect(result.current.error).toBeNull();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should fetch children from firestore, filter active, and sort by createdAt", async () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(collection).mockReturnValueOnce({} as unknown as CollectionReference); // Mocking CollectionReference

    const mockDocs = [
      {
        id: "child-2",
        data: () => ({ active: true, createdAt: { toMillis: () => 2000 } }),
      },
      {
        id: "child-3",
        data: () => ({ active: false, createdAt: { toMillis: () => 3000 } }), // Inactive
      },
      {
        id: "child-1",
        data: () => ({ active: true, createdAt: { toMillis: () => 1000 } }),
      },
      {
        id: "child-4",
        data: () => ({ active: true }), // No createdAt, defaults to 0
      },
    ];

    vi.mocked(onSnapshot).mockImplementation((_ref, onNext) => {
      (onNext as (snapshot: QuerySnapshot) => void)({ docs: mockDocs } as unknown as QuerySnapshot);
      return mockUnsubscribe;
    });

    const { result, unmount } = renderHook(() => useChildren("user-123"));

    expect(collection).toHaveBeenCalledWith(db, "users", "user-123", "children");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.children).toHaveLength(3);
    // Sort order: child-4 (0), child-1 (1000), child-2 (2000)
    expect(result.current.children[0].id).toBe("child-4");
    expect(result.current.children[1].id).toBe("child-1");
    expect(result.current.children[2].id).toBe("child-2");

    expect(result.current.activeChild?.id).toBe("child-4");
    expect(result.current.error).toBeNull();

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should handle error from firestore gracefully", async () => {
    const mockError = new Error("Firestore error");
    const mockUnsubscribe = vi.fn();
    vi.mocked(collection).mockReturnValueOnce({} as unknown as CollectionReference);

    vi.mocked(onSnapshot).mockImplementation((_ref, _onNext, onError) => {
      (onError as ((error: Error) => void) | undefined)?.(mockError);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useChildren("user-123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.children).toEqual([]);
    expect(result.current.activeChild).toBeNull();
    expect(result.current.error).toBe(mockError);
    expect(consoleErrorMock).toHaveBeenCalledWith("Failed to load children:", mockError);
  });
});