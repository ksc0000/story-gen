import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitAppFeedback } from "../src/submit-app-feedback";
import * as admin from "firebase-admin";

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (options: any, handler: any) => handler,
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock("firebase-admin", () => ({
  firestore: Object.assign(vi.fn(), {
    Timestamp: {
      now: vi.fn(() => ({
        toMillis: () => 123456789,
      })),
    },
  }),
}));

describe("submitAppFeedback", () => {
  const mockAdd = vi.fn();
  const mockDb = {
    collection: vi.fn().mockReturnValue({
      add: mockAdd,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (admin.firestore as any).mockReturnValue(mockDb);
  });

  it("successfully saves feedback when authenticated and text is valid", async () => {
    const mockRequest = {
      auth: {
        uid: "user-123",
        token: {
          name: "Test User",
          email: "test@example.com",
        },
      },
      data: { text: "Great app!" },
      rawRequest: {
        headers: {
          "user-agent": "test-agent",
        },
      },
    } as any;

    const result = await (submitAppFeedback as any)(mockRequest);

    expect(result).toEqual({ success: true });
    expect(mockDb.collection).toHaveBeenCalledWith("appFeedback");
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-123",
      userName: "Test User",
      userEmail: "test@example.com",
      text: "Great app!",
      userAgent: "test-agent",
      createdAtMs: 123456789,
    }));
  });

  it("throws unauthenticated if no auth", async () => {
    const mockRequest = {
      data: { text: "Hello" },
    } as any;

    await expect((submitAppFeedback as any)(mockRequest)).rejects.toThrow("フィードバックを送信するにはログインが必要です");
  });

  it("throws invalid-argument if text is empty", async () => {
    const mockRequest = {
      auth: { uid: "user-123", token: {} },
      data: { text: "   " },
    } as any;

    await expect((submitAppFeedback as any)(mockRequest)).rejects.toThrow("フィードバック内容を入力してください");
  });

  it("throws invalid-argument if text is too long", async () => {
    const mockRequest = {
      auth: { uid: "user-123", token: {} },
      data: { text: "a".repeat(5001) },
    } as any;

    await expect((submitAppFeedback as any)(mockRequest)).rejects.toThrow("フィードバックは5000文字以内で入力してください");
  });
});
