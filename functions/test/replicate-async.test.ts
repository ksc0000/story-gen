import { describe, expect, it, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import Replicate from "replicate";
import { ReplicateImageClient, REPLICATE_PREDICTIONS_COLLECTION } from "../src/lib/replicate";

vi.mock("replicate", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      predictions: {
        create: vi.fn().mockResolvedValue({ id: "pred-123" }),
      },
    })),
  };
});

vi.mock("firebase-admin", () => {
  const update = vi.fn().mockResolvedValue({} as admin.firestore.WriteResult);
  const set = vi.fn().mockResolvedValue({} as admin.firestore.WriteResult);
  const doc = vi.fn(() => ({ update, set, get: vi.fn() }));
  const collection = vi.fn(() => ({ doc }));
  const db = { collection, doc };
  return {
    firestore: Object.assign(vi.fn(() => db), {
      FieldValue: {
        serverTimestamp: vi.fn(() => "mock-timestamp"),
      },
    }),
  };
});

describe("ReplicateImageClient async support", () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue({}),
  } as unknown as FirebaseFirestore.Firestore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPrediction starts a prediction and records it in Firestore", async () => {
    const client = new ReplicateImageClient("test-token");

    const predictionId = await client.createPrediction({
      prompt: "a cute cat",
      targetId: "book-123",
      targetType: "book_page",
      db: mockDb,
      webhookUrl: "https://example.com/webhook",
    });

    expect(predictionId).toBe("pred-123");

    expect(mockDb.collection).toHaveBeenCalledWith(REPLICATE_PREDICTIONS_COLLECTION);
    expect(mockDb.doc).toHaveBeenCalledWith("pred-123");
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pred-123",
        status: "starting",
        targetId: "book-123",
        targetType: "book_page",
      }),
      { merge: true }
    );
  });
});
