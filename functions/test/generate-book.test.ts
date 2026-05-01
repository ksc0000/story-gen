import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBookGeneration } from "../src/generate-book";
import type { BookData, TemplateData, GeneratedStory } from "../src/lib/types";

const mockTemplate: TemplateData = {
  name: "おたんじょうび", description: "誕生日", icon: "🎂", order: 1,
  creationMode: "guided_ai", priceTier: "take", storyCostLevel: "standard",
  systemPrompt: "誕生日テーマで物語を作って", active: true,
  sampleImageUrl: "/images/templates/animals.png",
};

const fixedTemplate: TemplateData = {
  name: "はじめてのどうぶつえん",
  description: "固定テンプレート",
  icon: "🦁",
  order: 2,
  active: true,
  creationMode: "fixed_template",
  priceTier: "ume",
  storyCostLevel: "none",
  systemPrompt: "固定テンプレート",
  fixedStory: {
    titleTemplate: "{childName}とはじめてのどうぶつえん",
    pages: [
      {
        textTemplate: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
        imagePromptTemplate: "A child arriving at a friendly zoo with family",
      },
      {
        textTemplate: "{parentMessage}",
        imagePromptTemplate: "A warm family memory ending scene",
      },
    ],
  },
};

const mockStory: GeneratedStory = {
  title: "ゆうたくんのたんじょうび",
  characterBible: "A consistent boy with short black hair and blue overalls",
  styleBible: "Soft watercolor picture book style with warm paper texture",
  pages: [
    { text: "きょうはたんじょうびです。", imagePrompt: "A birthday party" },
    { text: "ケーキをたべました。", imagePrompt: "A child eating cake" },
  ],
};

const mockImageBuffer = Buffer.from("fake-png-data");

function createMockDeps() {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    getUserPlan: vi.fn().mockResolvedValue("free" as const),
    llmClient: { generateStory: vi.fn().mockResolvedValue(mockStory) },
    imageClient: { generateImage: vi.fn().mockResolvedValue(mockImageBuffer) },
    uploadImage: vi.fn().mockResolvedValue("https://storage.example.com/image.png"),
    updateBookTitle: vi.fn().mockResolvedValue(undefined),
    updateBookCoverImage: vi.fn().mockResolvedValue(undefined),
    writePage: vi.fn().mockResolvedValue(undefined),
    updateBookProgress: vi.fn().mockResolvedValue(undefined),
    updateBookStatus: vi.fn().mockResolvedValue(undefined),
    updateBookFailure: vi.fn().mockResolvedValue(undefined),
    getUserMonthlyCount: vi.fn().mockResolvedValue(0),
    incrementMonthlyCount: vi.fn().mockResolvedValue(undefined),
  };
}

const baseBookData: BookData = {
  userId: "user123", title: "", theme: "birthday", style: "watercolor",
  pageCount: 4, status: "generating", progress: 0, input: { childName: "ゆうた" },
  createdAt: {} as FirebaseFirestore.Timestamp, expiresAt: null,
};

describe("processBookGeneration", () => {
  let deps: ReturnType<typeof createMockDeps>;
  beforeEach(() => { deps = createMockDeps(); });

  it("generates a complete book successfully", async () => {
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.getTemplate).toHaveBeenCalledWith("birthday");
    expect(deps.llmClient.generateStory).toHaveBeenCalledOnce();
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    expect(deps.imageClient.generateImage).toHaveBeenCalledWith(
      expect.stringContaining("Character consistency"),
      expect.objectContaining({
        inputImageUrls: expect.arrayContaining([
          "https://story-gen-8a769.web.app/images/styles/soft_watercolor.png",
          "https://story-gen-8a769.web.app/images/templates/animals.png",
        ]),
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenCalledWith(
      expect.stringContaining("Style consistency"),
      expect.any(Object)
    );
    expect(deps.uploadImage).toHaveBeenCalledTimes(2);
    expect(deps.writePage).toHaveBeenCalledTimes(2);
    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({
        imageModel: "black-forest-labs/flux-2-klein-9b",
        imageQualityTier: "standard",
        imagePurpose: "book_cover",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({
        imageModel: "black-forest-labs/flux-2-klein-9b",
        imageQualityTier: "standard",
        imagePurpose: "book_page",
      })
    );
    expect(deps.updateBookTitle).toHaveBeenCalledWith("book123", "ゆうたくんのたんじょうび");
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "completed");
    expect(deps.incrementMonthlyCount).toHaveBeenCalledWith("user123");
  });

  it("keeps calling the LLM for guided_ai templates", async () => {
    deps.getTemplate.mockResolvedValue(mockTemplate);
    await processBookGeneration("book-guided", baseBookData, deps);
    expect(deps.llmClient.generateStory).toHaveBeenCalledOnce();
  });

  it("sets book status to failed when LLM fails", async () => {
    deps.llmClient.generateStory.mockRejectedValue(new Error("LLM error"));
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "failed");
  });

  it("rejects when free user exceeds monthly quota", async () => {
    deps.getUserMonthlyCount.mockResolvedValue(3);
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "failed");
    expect(deps.llmClient.generateStory).not.toHaveBeenCalled();
  });

  it("retries image generation up to 2 times on failure", async () => {
    deps.imageClient.generateImage
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(mockImageBuffer);
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(4); // 3 for first page + 1 for second
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "completed");
  });

  it("stops the book as soon as a page image fails after 3 attempts", async () => {
    deps.imageClient.generateImage
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockRejectedValueOnce(new Error("fail 3"))
      .mockResolvedValue(mockImageBuffer);
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.writePage).toHaveBeenCalledWith("book123", expect.objectContaining({ pageNumber: 0, status: "failed" }));
    expect(deps.writePage).toHaveBeenCalledTimes(1);
    expect(deps.uploadImage).not.toHaveBeenCalled();
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "failed");
    expect(deps.incrementMonthlyCount).not.toHaveBeenCalled();
  });

  it("validates input and rejects NG words", async () => {
    const badBook: BookData = { ...baseBookData, input: { childName: "殺す" } };
    await processBookGeneration("book123", badBook, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "failed");
    expect(deps.llmClient.generateStory).not.toHaveBeenCalled();
  });

  it("skips LLM story generation for fixed templates", async () => {
    deps.getTemplate.mockResolvedValue(fixedTemplate);
    const fixedBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      input: {
        childName: "ゆうた",
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed", fixedBook, deps);

    expect(deps.llmClient.generateStory).not.toHaveBeenCalled();
    expect(deps.updateBookTitle).toHaveBeenCalledWith("book-fixed", "ゆうたとはじめてのどうぶつえん");
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-fixed",
      expect.objectContaining({
        pageNumber: 0,
        text: "ゆうたは、ママとパパといっしょに上野動物園へでかけました。",
      })
    );
    expect(deps.writePage).toHaveBeenCalledTimes(fixedTemplate.fixedStory!.pages.length);
    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("A child arriving at a friendly zoo with family"),
      expect.any(Object)
    );
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-fixed", "completed");
  });

  it("uses premium model metadata when imageQualityTier is premium", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid",
      imageQualityTier: "premium",
    };

    await processBookGeneration("book-premium", premiumBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-premium",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "premium",
        imagePurpose: "book_page",
      })
    );
  });

  it("normalizes free fixed-template books back to light quality even if premium was sent", async () => {
    deps.getTemplate.mockResolvedValue(fixedTemplate);
    const freeBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      productPlan: "free",
      imageQualityTier: "premium",
      pageCount: 12,
      input: {
        childName: "ゆうた",
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-free", freeBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-free",
      expect.objectContaining({
        pageNumber: 0,
        imageModel: "black-forest-labs/flux-2-klein-9b",
        imageQualityTier: "light",
        imagePurpose: "book_cover",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-free",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-klein-9b",
        imageQualityTier: "light",
        imagePurpose: "book_page",
      })
    );
  });

  it("keeps light_paid books on klein for both cover and pages", async () => {
    const lightPaidBook: BookData = {
      ...baseBookData,
      productPlan: "light_paid",
      imageQualityTier: "premium",
      pageCount: 8,
    };

    await processBookGeneration("book-light-paid", lightPaidBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-light-paid",
      expect.objectContaining({
        pageNumber: 0,
        imageModel: "black-forest-labs/flux-2-klein-9b",
        imageQualityTier: "light",
        imagePurpose: "book_cover",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-light-paid",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-klein-9b",
        imageQualityTier: "light",
        imagePurpose: "book_page",
      })
    );
  });

  it("keeps premium_paid books on pro for both cover and pages", async () => {
    const premiumPaidBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid",
      pageCount: 4,
    };

    await processBookGeneration("book-premium-paid", premiumPaidBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-premium-paid",
      expect.objectContaining({
        pageNumber: 0,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "premium",
        imagePurpose: "book_cover",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-premium-paid",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "premium",
        imagePurpose: "book_page",
      })
    );
  });
});
