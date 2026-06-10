import { describe, expect, it, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import { onAvatarJobCreated, onCharacterProfileUpdated } from "../src/generate-avatar-job";
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
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        visualProfile: { version: 1 },
      }),
    }),
    add: vi.fn().mockResolvedValue({ id: "new-job-id" }),
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
      candidates: [{ generationId: "gen-1", imageUrl: "http://example.com/image.png", prompt: "test prompt" }],
      characterBible: "test bible",
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

describe("onCharacterProfileUpdated trigger", () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        visualProfile: { version: 1 },
      }),
    }),
    add: vi.fn().mockResolvedValue({ id: "new-job-id" }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (admin.firestore as any).mockReturnValue(mockDb);
  });

  it("creates a job when referenceImageUrl changes", async () => {
    const characterId = "char-123";
    const beforeData = {
      userId: "user-123",
      visualProfile: { referenceImageUrl: "old-url", approvedImageUrl: "old-url" },
    };
    const afterData = {
      userId: "user-123",
      visualProfile: { referenceImageUrl: "new-url", approvedImageUrl: "old-url" },
    };

    const mockEvent = {
      params: { characterId },
      data: {
        before: { data: () => beforeData },
        after: { data: () => afterData },
      },
    };

    // @ts-ignore
    await onCharacterProfileUpdated.run(mockEvent);

    expect(mockDb.collection).toHaveBeenCalledWith("childAvatarGenerationJobs");
    expect(mockDb.add).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-123",
      characterId: "char-123",
      status: "pending",
    }));
  });

  it("skips when referenceImageUrl is the same as approvedImageUrl (likely our own update)", async () => {
    const characterId = "char-123";
    const beforeData = {
      userId: "user-123",
      visualProfile: { referenceImageUrl: "old-url", approvedImageUrl: "old-url" },
    };
    const afterData = {
      userId: "user-123",
      visualProfile: { referenceImageUrl: "new-url", approvedImageUrl: "new-url" },
    };

    const mockEvent = {
      params: { characterId },
      data: {
        before: { data: () => beforeData },
        after: { data: () => afterData },
      },
    };

    // @ts-ignore
    await onCharacterProfileUpdated.run(mockEvent);

    expect(mockDb.add).not.toHaveBeenCalled();
  });

  it("skips when referenceImageUrl has not changed", async () => {
    const characterId = "char-123";
    const data = {
      userId: "user-123",
      visualProfile: { referenceImageUrl: "same-url", approvedImageUrl: "same-url" },
    };

    const mockEvent = {
      params: { characterId },
      data: {
        before: { data: () => data },
        after: { data: () => data },
      },
    };

    // @ts-ignore
    await onCharacterProfileUpdated.run(mockEvent);

    expect(mockDb.add).not.toHaveBeenCalled();
  });
});
