import { describe, it, expect, vi, beforeEach } from "vitest";
import { processUpdateBookTitle } from "../src/update-book-title";
import { HttpsError } from "firebase-functions/v2/https";

describe("processUpdateBookTitle", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb = {
    collection: vi.fn(),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBookRef = {
    get: vi.fn(),
    update: vi.fn(),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockAuth = {
    uid: "user-123",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue(mockBookRef),
    });
  });

  it("successfully updates a book title when the user is the owner", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123", title: "Old Title" }),
    });
    mockBookRef.update.mockResolvedValue(undefined);

    const result = await processUpdateBookTitle("book-123", "New Title", mockAuth, mockDb);

    expect(result).toEqual({ success: true, bookId: "book-123", newTitle: "New Title" });
    expect(mockBookRef.update).toHaveBeenCalledWith({
      title: "New Title",
      updatedAt: expect.anything(),
    });
  });

  it("throws not-found when the book does not exist", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: false,
    });

    await expect(processUpdateBookTitle("book-123", "New Title", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("not-found", "指定された絵本が見つかりません")
    );
  });

  it("throws permission-denied when the user is not the owner", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "other-user", title: "Old Title" }),
    });

    await expect(processUpdateBookTitle("book-123", "New Title", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("permission-denied", "この絵本のタイトルを編集する権限がありません")
    );
  });

  it("throws invalid-argument when the new title is empty", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123", title: "Old Title" }),
    });

    await expect(processUpdateBookTitle("book-123", "   ", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("invalid-argument", "タイトルを入力してください")
    );
  });

  it("throws invalid-argument when the new title is too long", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123", title: "Old Title" }),
    });

    const longTitle = "a".repeat(101);
    await expect(processUpdateBookTitle("book-123", longTitle, mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("invalid-argument", "タイトルは100文字以内で入力してください")
    );
  });

  it("throws internal error when update fails", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123", title: "Old Title" }),
    });
    mockBookRef.update.mockRejectedValue(new Error("Firestore error"));

    await expect(processUpdateBookTitle("book-123", "New Title", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("internal", "タイトルの更新中にエラーが発生しました")
    );
  });
});
