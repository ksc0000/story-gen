import { describe, expect, it, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { replicateWebhook } from "../src/controllers/replicate-webhook";
import { REPLICATE_PREDICTIONS_COLLECTION } from "../src/lib/replicate";

vi.mock("firebase-functions/params", () => ({
  defineSecret: vi.fn(() => ({ value: () => "whsec_dGVzdC1zZWNyZXQ=" })), // Base64 for "test-secret"
}));

vi.mock("firebase-admin", () => {
  const set = vi.fn().mockResolvedValue({});
  const get = vi.fn().mockResolvedValue({
    exists: true,
    data: () => ({ targetId: "target-123", targetType: "book_page" }),
  });
  const doc = vi.fn(() => ({ set, get }));
  const collection = vi.fn(() => ({ doc }));
  const db = { collection, doc };
  return {
    firestore: Object.assign(vi.fn(() => db), {
      FieldValue: {
        serverTimestamp: vi.fn(() => "mock-timestamp"),
      },
      Timestamp: {
        fromDate: vi.fn((date) => ({ toDate: () => date })),
      },
    }),
  };
});

describe("replicateWebhook", () => {
  const mockDb = admin.firestore();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a successful prediction webhook with valid signature", async () => {
    const body = { id: "pred-123", status: "succeeded", output: ["url1"], completed_at: "2023-01-01T00:00:00Z" };
    const rawBody = Buffer.from(JSON.stringify(body));
    const id = "wh-123";
    const timestamp = "123456789";
    const secret = "dGVzdC1zZWNyZXQ="; // "test-secret"

    const signedContent = `${id}.${timestamp}.${rawBody.toString("utf-8")}`;
    const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64"));
    hmac.update(signedContent);
    const signature = hmac.digest("base64");

    const req = {
      method: "POST",
      headers: {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
      },
      rawBody,
      body,
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // @ts-ignore
    await replicateWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockDb.collection).toHaveBeenCalledWith(REPLICATE_PREDICTIONS_COLLECTION);
    expect(mockDb.doc).toHaveBeenCalledWith("pred-123");
    expect(mockDb.doc("pred-123").set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pred-123",
        status: "succeeded",
        output: ["url1"],
      }),
      { merge: true }
    );
  });

  it("returns 401 for invalid signature", async () => {
    const body = { id: "pred-123", status: "succeeded" };
    const req = {
      method: "POST",
      headers: {
        "webhook-id": "wh-123",
        "webhook-timestamp": "123456789",
        "webhook-signature": "v1,invalid-sig",
      },
      rawBody: Buffer.from(JSON.stringify(body)),
      body,
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // @ts-ignore
    await replicateWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 405 for non-POST requests", async () => {
    const req = { method: "GET" };
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // @ts-ignore
    await replicateWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
