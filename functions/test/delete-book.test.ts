import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDeleteBook } from "../src/delete-book";
import { HttpsError } from "firebase-functions/v2/https";

describe("processDeleteBook", () => {
  const mockDb = {
    collection: vi.fn(),
    recursiveDelete: vi.fn(),
  } as any;

  const mockBookRef = {
    get: vi.fn(),
  } as any;

  const mockAuth = {
    uid: "user-123",
    token: { admin: false },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue(mockBookRef),
    });
  });

  it("successfully deletes a book when the user is the owner", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123" }),
    });
    mockDb.recursiveDelete.mockResolvedValue(undefined);

    const result = await processDeleteBook("book-123", mockAuth, mockDb);

    expect(result).toEqual({ success: true, bookId: "book-123" });
    expect(mockDb.recursiveDelete).toHaveBeenCalledWith(mockBookRef);
  });

  it("successfully deletes a book when the user is an admin", async () => {
    const adminAuth = { uid: "admin-456", token: { admin: true } } as any;
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123" }),
    });
    mockDb.recursiveDelete.mockResolvedValue(undefined);

    const result = await processDeleteBook("book-123", adminAuth, mockDb);

    expect(result).toEqual({ success: true, bookId: "book-123" });
    expect(mockDb.recursiveDelete).toHaveBeenCalledWith(mockBookRef);
  });

  it("throws not-found when the book does not exist", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: false,
    });

    await expect(processDeleteBook("book-123", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("not-found", "指定された絵本が見つかりません")
    );
  });

  it("throws permission-denied when the user is not the owner or an admin", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "other-user" }),
    });

    await expect(processDeleteBook("book-123", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("permission-denied", "この絵本を削除する権限がありません")
    );
  });

  it("throws internal error when recursiveDelete fails", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-123" }),
    });
    mockDb.recursiveDelete.mockRejectedValue(new Error("Firestore error"));

    await expect(processDeleteBook("book-123", mockAuth, mockDb)).rejects.toThrow(
      new HttpsError("internal", "絵本の削除中にエラーが発生しました")
    );
  });
});
