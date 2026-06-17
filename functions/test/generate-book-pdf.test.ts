import { describe, it, expect, vi, beforeEach } from "vitest";
import { processGenerateBookPdf } from "../src/generate-book-pdf";
import { HttpsError } from "firebase-functions/v2/https";

// Mock puppeteer
vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setViewport: vi.fn().mockResolvedValue(undefined),
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from("fake-pdf-content")),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("processGenerateBookPdf", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBookRef = {
    get: vi.fn(),
    update: vi.fn(),
    collection: vi.fn(),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb = {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockBookRef),
    }),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFile = {
    save: vi.fn().mockResolvedValue(undefined),
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBucket = {
    file: vi.fn().mockReturnValue(mockFile),
    name: "test-bucket",
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockStorage = {
    bucket: vi.fn().mockReturnValue(mockBucket),
  } as any;

  const mockAuth = { uid: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully generates a PDF for a premium user with a completed book", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        productPlan: "premium_paid",
        status: "completed",
        title: "Test Book",
        coverImageUrl: "https://example.com/cover.png",
      }),
    });

    const mockPages = [
      { pageNumber: 0, text: "Page 1", imageUrl: "https://example.com/1.png" },
      { pageNumber: 1, text: "Page 2", imageUrl: "https://example.com/2.png" },
    ];

    mockBookRef.collection.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: mockPages.map(p => ({ data: () => p })),
        }),
      }),
    });

    const result = await processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage);

    expect(result.success).toBe(true);
    expect(result.pdfUrl).toContain("book-123%2Foutputs%2Fbook.pdf");
    expect(mockBookRef.update).toHaveBeenCalledWith(expect.objectContaining({
      pdfStatus: "processing",
    }));
    expect(mockBookRef.update).toHaveBeenCalledWith(expect.objectContaining({
      pdfStatus: "completed",
      pdfUrl: expect.any(String),
    }));
    expect(mockFile.save).toHaveBeenCalled();
  });

  it("throws permission-denied if user is not the owner", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "other-user",
      }),
    });

    await expect(processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage)).rejects.toThrow(
      new HttpsError("permission-denied", "この絵本のPDFを作成する権限がありません")
    );
  });

  it("throws permission-denied if user is on free plan and not a single purchase", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        productPlan: "free",
        isSinglePurchase: false,
      }),
    });

    await expect(processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage)).rejects.toThrow(
      new HttpsError("permission-denied", "PDFのダウンロードは有料プランまたは単品購入限定の機能です")
    );
  });

  it("successfully generates a PDF for a free user with a single purchase", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        productPlan: "free",
        isSinglePurchase: true,
        status: "completed",
        title: "Test Book",
      }),
    });

    mockBookRef.collection.mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [] }),
      }),
    });

    const result = await processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage);
    expect(result.success).toBe(true);
  });

  it("throws failed-precondition if book generation is not finished", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        productPlan: "premium_paid",
        status: "generating",
      }),
    });

    await expect(processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage)).rejects.toThrow(
      new HttpsError("failed-precondition", "絵本の生成が完了してからPDFを作成してください")
    );
  });

  it("updates status to failed if an error occurs during generation", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        productPlan: "premium_paid",
        status: "completed",
        title: "Test Book",
      }),
    });

    mockBookRef.collection.mockImplementation(() => {
        throw new Error("Unexpected error");
    });

    await expect(processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage)).rejects.toThrow(
      new HttpsError("internal", "PDFの生成中にエラーが発生しました")
    );

    expect(mockBookRef.update).toHaveBeenCalledWith(expect.objectContaining({
      pdfStatus: "failed",
      pdfError: "Unexpected error",
    }));
  });

  it("throws already-exists if PDF generation is already in progress", async () => {
    mockBookRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        pdfStatus: "processing",
      }),
    });

    await expect(processGenerateBookPdf("book-123", mockAuth, mockDb, mockStorage)).rejects.toThrow(
      new HttpsError("already-exists", "現在PDFを作成中です。しばらくお待ちください。")
    );
  });
});
