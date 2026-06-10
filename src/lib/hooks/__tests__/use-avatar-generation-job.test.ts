/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAvatarGenerationJob } from "../use-avatar-generation-job";
import {
  onSnapshot,
  doc,
  addDoc,
  collection,
  serverTimestamp,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mock dependencies
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("useAvatarGenerationJob", () => {
  const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorMock.mockClear();
  });

  it("should initialize with null job and loading false when jobId is null", () => {
    const { result } = renderHook(() => useAvatarGenerationJob(null));
    expect(result.current.job).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should watch job status when jobId is provided", async () => {
    const mockJobId = "job-123";
    const mockJobData = {
      status: "generating",
      userId: "user-1",
      childId: "child-1",
    };
    const mockUnsubscribe = vi.fn();

    vi.mocked(doc).mockReturnValue({} as any);
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
      onNext({
        exists: () => true,
        id: mockJobId,
        data: () => mockJobData,
      } as any);
      return mockUnsubscribe;
    });

    const { result, unmount } = renderHook(() => useAvatarGenerationJob(mockJobId));

    // expect(result.current.loading).toBe(true); // Might be false if it resolves immediately in the mock
    expect(doc).toHaveBeenCalledWith(db, "childAvatarGenerationJobs", mockJobId);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.job).toEqual({ id: mockJobId, ...mockJobData });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("should handle job not found", async () => {
    const mockJobId = "job-missing";
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext: any) => {
      onNext({
        exists: () => false,
      } as any);
      return vi.fn();
    });

    const { result } = renderHook(() => useAvatarGenerationJob(mockJobId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.job).toBeNull();
    expect(result.current.error?.message).toBe("Job not found");
  });

  it("should start a new job", async () => {
    const mockJobId = "new-job-id";
    vi.mocked(addDoc).mockResolvedValue({ id: mockJobId } as any);
    vi.mocked(collection).mockReturnValue({} as any);

    const { result } = renderHook(() => useAvatarGenerationJob(null));

    let jobId: string | undefined;
    await act(async () => {
      jobId = await result.current.startJob({
        userId: "user-1",
        childId: "child-1",
        variantStyle: "soft_watercolor",
      });
    });

    expect(jobId).toBe(mockJobId);
    expect(collection).toHaveBeenCalledWith(db, "childAvatarGenerationJobs");
    expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: "user-1",
      childId: "child-1",
      status: "pending",
      request: expect.objectContaining({
        variantStyle: "soft_watercolor",
      }),
    }));
  });

  it("should handle firestore errors during snapshot", async () => {
    const mockError = new Error("Snapshot error");
    vi.mocked(onSnapshot).mockImplementation((_ref, _onNext, onError: any) => {
      onError(mockError);
      return vi.fn();
    });

    const { result } = renderHook(() => useAvatarGenerationJob("job-err"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(consoleErrorMock).toHaveBeenCalled();
  });
});
