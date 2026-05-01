import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBookGeneration, shouldUseCharacterReferenceForPage } from "../src/generate-book";
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
        textTemplatesByAge: {
          baby_toddler: "{childName}、{place}へ しゅっぱつ。",
          preschool_3_4: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
          early_reader_5_6:
            "{childName}は、{familyMembers}といっしょに{place}へでかけました。どんな どうぶつに あえるのか、わくわくしています。",
          general_child: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
        },
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

  it("uses age-specific fixed template text when the age band matches", async () => {
    deps.getTemplate.mockResolvedValue(fixedTemplate);
    const ageSpecificBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      input: {
        childName: "ゆうた",
        childAge: 2,
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed-age", ageSpecificBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-fixed-age",
      expect.objectContaining({
        pageNumber: 0,
        text: "ゆうた、上野動物園へ しゅっぱつ。",
      })
    );
  });

  it("falls back to general_child fixed template text when the age band is missing", async () => {
    deps.getTemplate.mockResolvedValue({
      ...fixedTemplate,
      fixedStory: {
        titleTemplate: fixedTemplate.fixedStory!.titleTemplate,
        pages: [
          {
            textTemplate: "{childName}は{place}へいきました。",
            textTemplatesByAge: {
              general_child: "{childName}は、みんなで{place}へでかけました。",
            },
            imagePromptTemplate: "A child arriving at a friendly zoo with family",
          },
        ],
      },
    });
    const generalFallbackBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      input: {
        childName: "ゆうた",
        childAge: 8,
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed-general", generalFallbackBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-fixed-general",
      expect.objectContaining({
        pageNumber: 0,
        text: "ゆうたは、みんなで上野動物園へでかけました。",
      })
    );
  });

  it("falls back to the original textTemplate when age-specific text is unavailable", async () => {
    deps.getTemplate.mockResolvedValue({
      ...fixedTemplate,
      fixedStory: {
        titleTemplate: fixedTemplate.fixedStory!.titleTemplate,
        pages: [
          {
            textTemplate: "{childName}は、{place}へいきました。",
            imagePromptTemplate: "A child arriving at a friendly zoo with family",
          },
        ],
      },
    });
    const defaultFallbackBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      input: {
        childName: "ゆうた",
        childAge: 8,
        place: "上野動物園",
      },
    };

    await processBookGeneration("book-fixed-default", defaultFallbackBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-fixed-default",
      expect.objectContaining({
        pageNumber: 0,
        text: "ゆうたは、上野動物園へいきました。",
      })
    );
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

  it("uses references only on the cover for cover_only mode", async () => {
    const coverOnlyBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      productPlan: "free",
      childProfileSnapshot: {
        displayName: "ゆうた",
        personality: {},
        visualProfile: {
          version: 1,
          approvedImageUrl: "https://example.com/approved.png",
          referenceImageUrl: "https://example.com/reference.png",
        },
      },
      characterConsistencyMode: "cover_only",
      input: {
        childName: "ゆうた",
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };
    deps.getTemplate.mockResolvedValue(fixedTemplate);

    await processBookGeneration("book-cover-only", coverOnlyBook, deps);

    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: expect.arrayContaining([
          "https://example.com/reference.png",
          "https://example.com/approved.png",
        ]),
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: [],
      })
    );
  });

  it("uses references on cover, emotional peak, and ending for key_pages mode", async () => {
    deps.llmClient.generateStory.mockResolvedValue({
      ...mockStory,
      pages: [
        { text: "1", imagePrompt: "page1" },
        { text: "2", imagePrompt: "page2" },
        { text: "3", imagePrompt: "page3" },
        { text: "4", imagePrompt: "page4" },
        { text: "5", imagePrompt: "page5" },
      ],
    });
    const keyPagesBook: BookData = {
      ...baseBookData,
      childProfileSnapshot: {
        displayName: "ゆうた",
        personality: {},
        visualProfile: {
          version: 1,
          approvedImageUrl: "https://example.com/approved.png",
        },
      },
      characterConsistencyMode: "key_pages",
    };

    await processBookGeneration("book-key-pages", keyPagesBook, deps);

    const calls = deps.imageClient.generateImage.mock.calls.map(([, options]) => options.inputImageUrls);
    expect(calls[0]).toEqual(expect.arrayContaining(["https://example.com/approved.png"]));
    expect(calls[1]).toEqual([]);
    expect(calls[2]).toEqual([]);
    expect(calls[3]).toEqual(expect.arrayContaining(["https://example.com/approved.png"]));
    expect(calls[4]).toEqual(expect.arrayContaining(["https://example.com/approved.png"]));
  });

  it("uses references on every page for all_pages mode", async () => {
    const allPagesBook: BookData = {
      ...baseBookData,
      childProfileSnapshot: {
        displayName: "ゆうた",
        personality: {},
        visualProfile: {
          version: 1,
          approvedImageUrl: "https://example.com/approved.png",
        },
      },
      characterConsistencyMode: "all_pages",
    };

    await processBookGeneration("book-all-pages", allPagesBook, deps);

    const calls = deps.imageClient.generateImage.mock.calls.map(([, options]) => options.inputImageUrls);
    expect(calls.every((urls) => Array.isArray(urls) && urls.length > 0)).toBe(true);
  });

  it("keeps fixed templates working with key_pages reference mode", async () => {
    deps.getTemplate.mockResolvedValue(fixedTemplate);
    const fixedBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      childProfileSnapshot: {
        displayName: "ゆうた",
        personality: {},
        visualProfile: {
          version: 1,
          approvedImageUrl: "https://example.com/approved.png",
        },
      },
      characterConsistencyMode: "key_pages",
      input: {
        childName: "ゆうた",
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed-key-pages", fixedBook, deps);

    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-fixed-key-pages", "completed");
  });
});

describe("shouldUseCharacterReferenceForPage", () => {
  it("uses references only for cover types in cover_only mode", () => {
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 0,
        totalPages: 4,
        imagePurpose: "book_cover",
        characterConsistencyMode: "cover_only",
      })
    ).toBe(true);
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 1,
        totalPages: 4,
        imagePurpose: "book_page",
        characterConsistencyMode: "cover_only",
      })
    ).toBe(false);
  });

  it("uses references on cover, emotional peak, and final page in key_pages mode", () => {
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 0,
        totalPages: 5,
        imagePurpose: "book_cover",
        characterConsistencyMode: "key_pages",
      })
    ).toBe(true);
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 3,
        totalPages: 5,
        imagePurpose: "book_page",
        characterConsistencyMode: "key_pages",
      })
    ).toBe(true);
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 4,
        totalPages: 5,
        imagePurpose: "book_page",
        characterConsistencyMode: "key_pages",
      })
    ).toBe(true);
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 1,
        totalPages: 5,
        imagePurpose: "book_page",
        characterConsistencyMode: "key_pages",
      })
    ).toBe(false);
  });

  it("uses references on every page in all_pages mode", () => {
    expect(
      shouldUseCharacterReferenceForPage({
        pageIndex: 2,
        totalPages: 5,
        imagePurpose: "book_page",
        characterConsistencyMode: "all_pages",
      })
    ).toBe(true);
  });
});
