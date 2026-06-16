import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDeleteChildProfile } from "../src/delete-child-profile";
import { HttpsError } from "firebase-functions/v2/https";

describe("processDeleteChildProfile", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb = {
    collection: vi.fn(),
    recursiveDelete: vi.fn(),
    batch: vi.fn(),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockStorage = {
    bucket: vi.fn().mockReturnValue({
      deleteFiles: vi.fn().mockResolvedValue(undefined),
    }),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockChildRef = {
    get: vi.fn(),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockAuth = {
    uid: "user-123",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "users") {
        return {
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue(mockChildRef),
            }),
          }),
        };
      }
      if (name === "childAvatarGenerationJobs") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
        };
      }
      return {};
    });
  });

  it("successfully deletes a child profile and its assets", async () => {
    mockChildRef.get.mockResolvedValue({
      exists: true,
    });
    mockDb.recursiveDelete.mockResolvedValue(undefined);

    const result = await processDeleteChildProfile("child-123", mockAuth, mockDb, mockStorage);

    expect(result).toEqual({ success: true, childId: "child-123" });
    expect(mockStorage.bucket().deleteFiles).toHaveBeenCalledWith({
      prefix: "users/user-123/children/child-123/",
    });
    expect(mockDb.recursiveDelete).toHaveBeenCalledWith(mockChildRef);
  });

  it("deletes associated jobs if they exist", async () => {
    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockDb.batch.mockReturnValue(mockBatch);
    mockChildRef.get.mockResolvedValue({ exists: true });

    const mockJobDoc = { ref: "job-ref" };
    mockDb.collection.mockImplementation((name: string) => {
        if (name === "users") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue(mockChildRef),
              }),
            }),
          };
        }
        if (name === "childAvatarGenerationJobs") {
          return {
            where: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: [mockJobDoc],
            }),
          };
        }
        return {};
      });

    await processDeleteChildProfile("child-123", mockAuth, mockDb, mockStorage);

    expect(mockBatch.delete).toHaveBeenCalledWith("job-ref");
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it("throws not-found when the child profile does not exist", async () => {
    mockChildRef.get.mockResolvedValue({
      exists: false,
    });

    await expect(processDeleteChildProfile("child-123", mockAuth, mockDb, mockStorage)).rejects.toThrow(
      new HttpsError("not-found", "指定された子どもプロフィールが見つかりません")
    );
  });
});
