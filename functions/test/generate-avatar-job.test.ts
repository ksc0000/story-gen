import { describe, expect, it, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import { onAvatarJobCreated } from "../src/generate-avatar-job";
import { processAvatarGeneration } from "../src/lib/avatar-generation";

vi.mock("firebase-admin", () => {
  const update = vi.fn().mockResolvedValue({} as admin.firestore.WriteResult);
  const doc = vi.fn(() => ({ update }));
  const collection = vi.fn(() => ({ doc }));
  const db = { collection, doc };
  return {
    firestore: Object.assign(vi.fn(() => db), {
      FieldValue: {
        serverTimestamp: vi.fn(() => "mock-timestamp"),
      },
    }),
    storage: vi.fn(() => ({
      bucket: vi.fn(() => ({
        file: vi.fn(() => ({
          save: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
  };
});

// Separate mock for processAvatarGeneration
vi.mock("../src/lib/avatar-generation", () => ({
  processAvatarGeneration: vi.fn(),
  normalizeSensitiveError: vi.fn((err: any) => err.message),
}));

describe("onAvatarJobCreated trigger", () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (admin.firestore as any).mockReturnValue(mockDb);
  });

  it("processes a pending job successfully", async () => {
    const jobId = "test-job-id";
    const jobData = {
      userId: "user-123",
      childId: "child-456",
      status: "pending",
      request: { variantStyle: "soft_watercolor" },
    };

    const mockEvent = {
      params: { jobId },
      data: {
        data: () => jobData,
      },
    };

    const mockResult = {
      batchId: "batch-789",
      attemptNumber: 1,
      candidates: [{ generationId: "gen-1", imageUrl: "http://example.com/image.png" }],
    };

    (processAvatarGeneration as any).mockResolvedValue(mockResult);

    // @ts-ignore
    await onAvatarJobCreated.run(mockEvent);

    // Check status updates
    expect(mockDb.collection).toHaveBeenCalledWith("childAvatarGenerationJobs");
    expect(mockDb.doc).toHaveBeenCalledWith(jobId);
    expect(mockDb.update).toHaveBeenCalledWith({
      status: "generating",
      updatedAt: "mock-timestamp",
    });

    expect(processAvatarGeneration).toHaveBeenCalled();

    expect(mockDb.update).toHaveBeenCalledWith({
      status: "completed",
      result: {
        batchId: mockResult.batchId,
        attemptNumber: mockResult.attemptNumber,
        candidates: mockResult.candidates,
      },
      updatedAt: "mock-timestamp",
    });
  });

  it("handles failure and sets status to failed", async () => {
    const jobId = "test-job-id";
    const jobData = {
      userId: "user-123",
      childId: "child-456",
      status: "pending",
      request: {},
    };

    const mockEvent = {
      params: { jobId },
      data: {
        data: () => jobData,
      },
    };

    (processAvatarGeneration as any).mockRejectedValue(new Error("Generation failed"));

    // @ts-ignore
    await onAvatarJobCreated.run(mockEvent);

    expect(mockDb.update).toHaveBeenCalledWith({
      status: "failed",
      error: {
        message: "Generation failed",
        code: "internal",
      },
      updatedAt: "mock-timestamp",
    });
  });

  it("skips if job is not pending", async () => {
    const jobId = "test-job-id";
    const jobData = {
      userId: "user-123",
      childId: "child-456",
      status: "completed", // Already completed
      request: {},
    };

    const mockEvent = {
      params: { jobId },
      data: {
        data: () => jobData,
      },
    };

    // @ts-ignore
    await onAvatarJobCreated.run(mockEvent);

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(processAvatarGeneration).not.toHaveBeenCalled();
  });
});
