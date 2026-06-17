import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDeleteUserAccount } from "../src/delete-user-account";
import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

vi.mock("firebase-admin", () => ({
  auth: vi.fn().mockReturnValue({
    deleteUser: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("processDeleteUserAccount", () => {
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
  const mockStripe = {
    subscriptions: {
      cancel: vi.fn().mockResolvedValue(undefined),
    },
    customers: {
      del: vi.fn().mockResolvedValue(undefined),
    },
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockUserRef = {
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
          doc: vi.fn().mockReturnValue(mockUserRef),
        };
      }
      // Default empty query results for books, companions, jobs
      return {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      };
    });
  });

  it("successfully deletes a user account and all its associated data", async () => {
    mockUserRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        stripeSubscriptionId: "sub-123",
        stripeCustomerId: "cus-123",
      }),
    });
    mockDb.recursiveDelete.mockResolvedValue(undefined);

    const result = await processDeleteUserAccount(mockAuth, mockDb, mockStorage, mockStripe);

    expect(result).toEqual({ success: true });
    expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith("sub-123");
    expect(mockStripe.customers.del).toHaveBeenCalledWith("cus-123");
    expect(mockStorage.bucket().deleteFiles).toHaveBeenCalledWith({
      prefix: "users/user-123/",
    });
    expect(mockDb.recursiveDelete).toHaveBeenCalledWith(mockUserRef);
    expect(admin.auth().deleteUser).toHaveBeenCalledWith("user-123");
  });

  it("handles missing Stripe info gracefully", async () => {
    mockUserRef.get.mockResolvedValue({
      exists: true,
      data: () => ({}),
    });
    mockDb.recursiveDelete.mockResolvedValue(undefined);

    await processDeleteUserAccount(mockAuth, mockDb, mockStorage, mockStripe);

    expect(mockStripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(mockStripe.customers.del).not.toHaveBeenCalled();
  });

  it("deletes books, qualityTasks, and companions if they exist", async () => {
    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockDb.batch.mockReturnValue(mockBatch);
    mockUserRef.get.mockResolvedValue({
      exists: true,
      data: () => ({}),
    });

    const mockBookDoc = { id: "book-123", ref: "book-ref" };
    const mockTaskDoc = { ref: "task-ref" };
    const mockCompanionDoc = { ref: "companion-ref" };

    mockDb.collection.mockImplementation((name: string) => {
      if (name === "users") return { doc: vi.fn().mockReturnValue(mockUserRef) };
      if (name === "books") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: false, docs: [mockBookDoc] }),
        };
      }
      if (name === "qualityTasks") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: false, docs: [mockTaskDoc] }),
        };
      }
      if (name === "companions") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: false, docs: [mockCompanionDoc] }),
        };
      }
      return {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      };
    });

    await processDeleteUserAccount(mockAuth, mockDb, mockStorage, mockStripe);

    expect(mockDb.recursiveDelete).toHaveBeenCalledWith("book-ref");
    expect(mockBatch.delete).toHaveBeenCalledWith("task-ref");
    expect(mockBatch.delete).toHaveBeenCalledWith("companion-ref");
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it("throws not-found when the user doc does not exist", async () => {
    mockUserRef.get.mockResolvedValue({
      exists: false,
    });

    await expect(processDeleteUserAccount(mockAuth, mockDb, mockStorage, mockStripe)).rejects.toThrow(
      new HttpsError("not-found", "ユーザーが見つかりません")
    );
  });
});
