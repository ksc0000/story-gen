import { describe, it, expect, vi } from "vitest";
import { buildBookPushContent, sendBookCompletionPush } from "../src/lib/push-notifications";
import type { Firestore } from "firebase-admin/firestore";
import type { Messaging } from "firebase-admin/messaging";

describe("buildBookPushContent", () => {
  it("completed: タイトル入りの完成通知と /book リンク", () => {
    const c = buildBookPushContent("completed", "abc123", "たっちゃんの てぶくろ");
    expect(c.title).toContain("できました");
    expect(c.body).toContain("たっちゃんの てぶくろ");
    expect(c.link).toBe("https://ehoria.app/book/?id=abc123");
  });

  it("partial_completed: 作り直せる旨を含む", () => {
    const c = buildBookPushContent("partial_completed", "abc123", "タイトル");
    expect(c.body).toContain("作り直せます");
    expect(c.link).toContain("/book/");
  });

  it("failed: 再試行を促し /generating へリンク", () => {
    const c = buildBookPushContent("failed", "abc123", undefined);
    expect(c.title).toContain("うまくいきませんでした");
    expect(c.link).toBe("https://ehoria.app/generating/?id=abc123");
  });
});

function buildFakes(params: {
  bookExists?: boolean;
  userId?: string | null;
  tokens?: string[];
  sendResponses?: Array<{ success: boolean; errorCode?: string }>;
}) {
  const tokens = params.tokens ?? [];
  const deleted: string[] = [];

  const tokenDocs = tokens.map((t) => ({ id: t }));
  const db = {
    collection: vi.fn((name: string) => {
      if (name === "books") {
        return {
          doc: () => ({
            get: async () => ({
              exists: params.bookExists !== false,
              data: () => ({
                userId: params.userId === undefined ? "user-1" : params.userId,
                title: "テスト絵本",
              }),
            }),
          }),
        };
      }
      // users
      return {
        doc: () => ({
          collection: () => ({
            get: async () => ({ docs: tokenDocs }),
            doc: (tokenId: string) => ({
              delete: async () => {
                deleted.push(tokenId);
              },
            }),
          }),
        }),
      };
    }),
  } as unknown as Firestore;

  const sendEachForMulticast = vi.fn(async () => ({
    successCount: (params.sendResponses ?? []).filter((r) => r.success).length,
    failureCount: (params.sendResponses ?? []).filter((r) => !r.success).length,
    responses: (params.sendResponses ?? []).map((r) => ({
      success: r.success,
      error: r.success ? undefined : { code: r.errorCode ?? "messaging/internal-error" },
    })),
  }));
  const messaging = { sendEachForMulticast } as unknown as Messaging;

  return { db, messaging, sendEachForMulticast, deleted };
}

describe("sendBookCompletionPush", () => {
  it("トークンがあれば data メッセージで全端末へ送信する", async () => {
    const { db, messaging, sendEachForMulticast } = buildFakes({
      tokens: ["tok-a", "tok-b"],
      sendResponses: [{ success: true }, { success: true }],
    });
    await sendBookCompletionPush({ db, messaging, bookId: "b1", status: "completed" });

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    const arg = sendEachForMulticast.mock.calls[0][0] as {
      tokens: string[];
      data: Record<string, string>;
    };
    expect(arg.tokens).toEqual(["tok-a", "tok-b"]);
    expect(arg.data.title).toContain("できました");
    expect(arg.data.link).toContain("/book/?id=b1");
  });

  it("トークンが無ければ送信しない", async () => {
    const { db, messaging, sendEachForMulticast } = buildFakes({ tokens: [] });
    await sendBookCompletionPush({ db, messaging, bookId: "b1", status: "completed" });
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it("unregistered エラーのトークンは削除する", async () => {
    const { db, messaging, deleted } = buildFakes({
      tokens: ["tok-live", "tok-dead"],
      sendResponses: [
        { success: true },
        { success: false, errorCode: "messaging/registration-token-not-registered" },
      ],
    });
    await sendBookCompletionPush({ db, messaging, bookId: "b1", status: "completed" });
    expect(deleted).toEqual(["tok-dead"]);
  });

  it("book が存在しない/userId 無しなら何もしない", async () => {
    const a = buildFakes({ bookExists: false, tokens: ["t"] });
    await sendBookCompletionPush({ db: a.db, messaging: a.messaging, bookId: "x", status: "failed" });
    expect(a.sendEachForMulticast).not.toHaveBeenCalled();

    const b = buildFakes({ userId: null, tokens: ["t"] });
    await sendBookCompletionPush({ db: b.db, messaging: b.messaging, bookId: "x", status: "failed" });
    expect(b.sendEachForMulticast).not.toHaveBeenCalled();
  });
});
