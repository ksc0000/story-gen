import { describe, it, expect, vi, beforeEach } from "vitest";
import { processUpdatePageText } from "../src/update-page-text";

describe("processUpdatePageText", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPageRef = { get: vi.fn(), update: vi.fn() } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBookRef = {
    get: vi.fn(),
    update: vi.fn(),
    collection: vi.fn(() => ({ doc: vi.fn(() => mockPageRef) })),
  } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb = { collection: vi.fn(() => ({ doc: vi.fn(() => mockBookRef) })) } as any;
  const auth = { uid: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBookRef.collection = vi.fn(() => ({ doc: vi.fn(() => mockPageRef) }));
    mockDb.collection = vi.fn(() => ({ doc: vi.fn(() => mockBookRef) }));
  });

  it("updates page text for the owner and flags textEditedByUser", async () => {
    mockBookRef.get.mockResolvedValue({ exists: true, data: () => ({ userId: "user-1" }) });
    mockPageRef.get.mockResolvedValue({ exists: true });
    mockPageRef.update.mockResolvedValue(undefined);
    mockBookRef.update.mockResolvedValue(undefined);

    const result = await processUpdatePageText("book-1", 2, "  あたらしい ほんぶん  ", auth, mockDb);

    expect(result).toMatchObject({ success: true, bookId: "book-1", pageNumber: 2, text: "あたらしい ほんぶん" });
    expect(mockPageRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ text: "あたらしい ほんぶん", textEditedByUser: true })
    );
  });

  it("rejects when the requester is not the owner", async () => {
    mockBookRef.get.mockResolvedValue({ exists: true, data: () => ({ userId: "someone-else" }) });
    await expect(processUpdatePageText("book-1", 0, "text", auth, mockDb)).rejects.toThrow(/権限/);
  });

  it("rejects empty text", async () => {
    mockBookRef.get.mockResolvedValue({ exists: true, data: () => ({ userId: "user-1" }) });
    await expect(processUpdatePageText("book-1", 0, "   ", auth, mockDb)).rejects.toThrow(/本文を入力/);
  });

  it("rejects text over the length limit", async () => {
    mockBookRef.get.mockResolvedValue({ exists: true, data: () => ({ userId: "user-1" }) });
    await expect(
      processUpdatePageText("book-1", 0, "あ".repeat(301), auth, mockDb)
    ).rejects.toThrow(/300文字以内/);
  });

  it("rejects when the page does not exist", async () => {
    mockBookRef.get.mockResolvedValue({ exists: true, data: () => ({ userId: "user-1" }) });
    mockPageRef.get.mockResolvedValue({ exists: false });
    await expect(processUpdatePageText("book-1", 9, "text", auth, mockDb)).rejects.toThrow(/ページが見つかりません/);
  });
});
