import { describe, it, expect, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import { isRateLimited } from "../src/lib/rate-limit";

vi.mock("firebase-admin", () => {
  return {
    firestore: {
      FieldValue: {
        serverTimestamp: vi.fn(() => "mock-timestamp"),
      },
    },
  };
});

describe("isRateLimited", () => {
  let mockDb: any;
  let mockTransaction: any;
  let mockDoc: any;
  let mockDocRef: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      exists: false,
      data: vi.fn(() => ({})),
    };

    mockDocRef = {
      id: "test_user_test_action",
    };

    mockTransaction = {
      get: vi.fn(() => Promise.resolve(mockDoc)),
      set: vi.fn(),
    };

    mockDb = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => mockDocRef),
      })),
      runTransaction: vi.fn((cb) => cb(mockTransaction)),
    };
  });

  it("allows request when no previous record exists", async () => {
    mockDoc.exists = false;
    mockDoc.data.mockReturnValue(undefined);

    const limited = await isRateLimited(mockDb, "user1", "action1", {
      maxRequests: 2,
      windowSeconds: 60,
    });

    expect(limited).toBe(false);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        userId: "user1",
        action: "action1",
        timestamps: [expect.any(Number)],
      }),
      { merge: true }
    );
  });

  it("blocks request when limit is reached", async () => {
    const now = Date.now();
    mockDoc.exists = true;
    mockDoc.data.mockReturnValue({
      timestamps: [now - 1000, now - 2000],
    });

    const limited = await isRateLimited(mockDb, "user1", "action1", {
      maxRequests: 2,
      windowSeconds: 60,
    });

    expect(limited).toBe(true);
    expect(mockTransaction.set).not.toHaveBeenCalled();
  });

  it("allows request when timestamps are outside window", async () => {
    const now = Date.now();
    mockDoc.exists = true;
    // Window is 60s, timestamps are 70s and 80s old
    mockDoc.data.mockReturnValue({
      timestamps: [now - 70000, now - 80000],
    });

    const limited = await isRateLimited(mockDb, "user1", "action1", {
      maxRequests: 2,
      windowSeconds: 60,
    });

    expect(limited).toBe(false);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        timestamps: [expect.any(Number)],
      }),
      { merge: true }
    );
  });

  it("bypasses rate limit for admins", async () => {
    const now = Date.now();
    mockDoc.exists = true;
    mockDoc.data.mockReturnValue({
      timestamps: [now - 1000, now - 2000],
    });

    const limited = await isRateLimited(
      mockDb,
      "admin1",
      "action1",
      { maxRequests: 2, windowSeconds: 60 },
      true
    );

    expect(limited).toBe(false);
    expect(mockDb.runTransaction).not.toHaveBeenCalled();
  });

  it("fails safe (allows) when transaction fails", async () => {
    mockDb.runTransaction.mockRejectedValue(new Error("Firestore error"));

    const limited = await isRateLimited(mockDb, "user1", "action1", {
      maxRequests: 2,
      windowSeconds: 60,
    });

    expect(limited).toBe(false);
  });
});
