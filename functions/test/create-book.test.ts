import { describe, it, expect, vi, beforeEach } from "vitest";

const addMock = vi.fn();
const collectionMock = vi.fn(() => ({ add: addMock }));

vi.mock("firebase-admin", () => ({
  firestore: Object.assign(
    () => ({ collection: collectionMock }),
    {
      FieldValue: { serverTimestamp: () => "__serverTimestamp__" },
      Timestamp: { fromMillis: (ms: number) => ({ __ts: ms }) },
    }
  ),
}));
vi.mock("firebase-functions/v2", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("firebase-functions/v2/https", () => ({
  onCall: (_opts: unknown, handler: unknown) => handler,
  HttpsError: class extends Error {
    code: string;
    constructor(code: string, message: string) { super(message); this.code = code; }
  },
}));

const { createBook } = await import("../src/create-book");
// onCall をハンドラそのものに差し替えているので直接呼べる
const call = createBook as unknown as (req: {
  auth?: { uid: string };
  data?: unknown;
}) => Promise<{ bookId: string }>;

const validPayload = { theme: "animals", pageCount: 4, creationMode: "guided_ai" };

describe("createBook callable", () => {
  beforeEach(() => {
    addMock.mockReset();
    addMock.mockResolvedValue({ id: "book_generated_id" });
    collectionMock.mockClear();
  });

  it("未ログインは unauthenticated で拒否する", async () => {
    await expect(call({ data: validPayload })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("ペイロードが object でなければ invalid-argument", async () => {
    await expect(call({ auth: { uid: "u1" }, data: "nope" })).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(call({ auth: { uid: "u1" }, data: [1, 2] })).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(call({ auth: { uid: "u1" } })).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("theme が無ければ invalid-argument", async () => {
    await expect(call({ auth: { uid: "u1" }, data: { pageCount: 4 } })).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("成功時は books に追加して bookId を返す", async () => {
    const res = await call({ auth: { uid: "u1" }, data: validPayload });
    expect(res).toEqual({ bookId: "book_generated_id" });
    expect(collectionMock).toHaveBeenCalledWith("books");
    const written = addMock.mock.calls[0][0];
    expect(written.theme).toBe("animals");
    expect(written.pageCount).toBe(4);
  });

  it("userId は必ず認証済み uid で上書きされる（なりすまし防止）", async () => {
    await call({ auth: { uid: "real_user" }, data: { ...validPayload, userId: "victim_user" } });
    expect(addMock.mock.calls[0][0].userId).toBe("real_user");
  });

  it("サーバー権威フィールドはクライアント申告を採用しない", async () => {
    await call({
      auth: { uid: "u1" },
      data: {
        ...validPayload,
        status: "completed",
        progress: 100,
        public: true,
        favorite: true,
        title: "偽のタイトル",
        createdAtSource: "client_create",
        expiresAt: { __ts: 0 },
        orgId: "someone-elses-org",
      },
    });
    const w = addMock.mock.calls[0][0];
    expect(w.status).toBe("generating");
    expect(w.progress).toBe(0);
    expect(w.title).toBe("");
    expect(w.createdAtSource).toBe("server_create");
    expect(w.public).toBeUndefined();
    expect(w.favorite).toBeUndefined();
    expect(w.orgId).toBeUndefined();
    expect(w.expiresAt).not.toEqual({ __ts: 0 });
  });

  it("undefined を含むネストは除去される（Firestoreが受け付けないため）", async () => {
    await call({
      auth: { uid: "u1" },
      data: { ...validPayload, input: { childName: "はる", storyRequest: undefined }, extra: undefined },
    });
    const w = addMock.mock.calls[0][0];
    expect(w.input).toEqual({ childName: "はる" });
    expect("extra" in w).toBe(false);
  });

  it("プラン等の申告は保持する（正規化は generate-book.ts が担当）", async () => {
    await call({ auth: { uid: "u1" }, data: { ...validPayload, productPlan: "premium_paid", imageQualityTier: "high" } });
    const w = addMock.mock.calls[0][0];
    expect(w.productPlan).toBe("premium_paid");
    expect(w.imageQualityTier).toBe("high");
  });

  it("Firestore 書き込み失敗は internal に変換する", async () => {
    addMock.mockRejectedValue(new Error("boom"));
    await expect(call({ auth: { uid: "u1" }, data: validPayload })).rejects.toMatchObject({ code: "internal" });
  });
});
