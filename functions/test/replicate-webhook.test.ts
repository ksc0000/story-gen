import { describe, it, expect, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Mock firebase-admin
vi.mock("firebase-admin", () => {
  const mockFirestore = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return {
    initializeApp: vi.fn(),
    firestore: vi.fn(() => mockFirestore),
    FieldValue: {
      serverTimestamp: vi.fn(() => "mock-timestamp"),
      delete: vi.fn(() => "mock-delete"),
    },
  };
});

// Mock firebase-functions
vi.mock("firebase-functions/v2/https", () => ({
  onRequest: vi.fn((options, handler) => handler),
}));
vi.mock("firebase-functions/params", () => ({
  defineSecret: vi.fn(() => ({ value: () => Buffer.from("v1_secret_key_long_enough_to_be_base64_safe").toString("base64") })),
}));
vi.mock("firebase-functions/logger", () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

import { replicateWebhook } from "../src/replicate-webhook";

describe("replicateWebhook", () => {
  let mockRes: any;
  let mockReq: any;
  const rawSecret = "v1_secret_key_long_enough_to_be_base64_safe";
  const secret = Buffer.from(rawSecret).toString("base64");

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    (admin.firestore() as any).update.mockResolvedValue({});
    (admin.firestore() as any).collection().doc().update.mockResolvedValue({});
  });

  const createSignedRequest = (payload: any) => {
    const body = JSON.stringify(payload);
    const id = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedContent = `${id}.${timestamp}.${body}`;
    const secretBytes = Buffer.from(secret, "base64");
    const computedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    return {
      get: vi.fn((name: string) => {
        if (name === "webhook-id") return id;
        if (name === "webhook-timestamp") return timestamp;
        if (name === "webhook-signature") return `v1,${computedSignature}`;
        return null;
      }),
      rawBody: Buffer.from(body),
      body: payload,
    };
  };

  it("should return 401 if headers are missing", async () => {
    mockReq = { get: vi.fn(() => null) };
    await (replicateWebhook as any)(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it("should return 200 and update Firestore on success", async () => {
    const payload = {
      id: "pred_123",
      status: "succeeded",
      output: ["https://example.com/image.png"],
      completed_at: "2024-01-01T00:00:00Z",
    };
    mockReq = createSignedRequest(payload);

    const mockDoc = {
      exists: true,
      data: () => ({
        id: "pred_123",
        targetId: "book_123",
        targetType: "book_cover",
      }),
    };

    const db = admin.firestore();
    (db.doc("pred_123").get as any).mockResolvedValue(mockDoc);

    await (replicateWebhook as any)(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(db.doc("pred_123").update).toHaveBeenCalled();
  });

  it("should return 401 for invalid signature", async () => {
    const payload = { id: "pred_123" };
    mockReq = createSignedRequest(payload);
    // Tamper with signature
    mockReq.get = vi.fn((name: string) => {
        if (name === "webhook-id") return "msg_123";
        if (name === "webhook-timestamp") return "1234567";
        if (name === "webhook-signature") return "v1,invalid";
        return null;
    });

    await (replicateWebhook as any)(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
