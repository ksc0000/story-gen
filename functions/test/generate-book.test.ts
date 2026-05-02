import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBookGeneration, shouldUseCharacterReferenceForPage } from "../src/generate-book";
import type { BookData, TemplateData, GeneratedStory } from "../src/lib/types";

function hasUndefinedDeep(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some((item) => hasUndefinedDeep(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasUndefinedDeep(item));
  }
  return false;
}

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
  title: "ゆうたとひかりのほし",
  characterBible: "A consistent boy with short black hair and blue overalls",
  styleBible: "Soft watercolor picture book style with warm paper texture",
  storyGoal: "ゆうたが ひかりのともだちと いっしょに 小さな星のかけらを さがす",
  mainQuestObject: "星のかけら",
  forbiddenQuestObjects: ["すいか", "食べもの", "べつのおもちゃ"],
  storyModel: "gemini-2.5-flash-lite",
  storyModelFallbackUsed: false,
  storyGenerationAttempts: 1,
  cast: [
    {
      characterId: "magic_friend_01",
      displayName: "ひかりのともだち",
      role: "magical_friend",
      visualBible: "small glowing golden spirit child with a tiny purple top hat",
      signatureItems: ["tiny purple top hat", "gold star necklace"],
      doNotChange: ["Do not remove the tiny purple top hat"],
      approvedImageUrl: "https://example.com/magic-friend.png",
    },
  ],
  narrativeDevice: {
    repeatedPhrase: "だいじょうぶ、いっしょにいるよ",
    visualMotif: "yellow star",
    setup: "はじめに見つけた小さな星",
    payoff: "最後にもう一度星が光る",
      hiddenDetails: ["small bird", "blue cup"],
    },
    pages: [
      {
      text: "こうえんの すなばで、ゆうたは きょうも みどりの きょうりゅうを あそばせていました。すると すなの なかで、小さな 星のかけらが きらりと ひかりました。ゆうたは なんだろうと おもって、そっと すなを よけました。",
      imagePrompt: "A warm wide sandbox scene with a child, a glowing tiny star shard, family-friendly park details, and a small yellow star motif",
      pageVisualRole: "opening_establishing",
      compositionHint: "wide establishing shot",
      visualMotifUsage: "yellow star glow near the sand",
      hiddenDetail: "small bird near the hedge",
      appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
      focusCharacterId: "child_protagonist",
    },
    {
      text: "ひかりの ともだちは、その 星のかけらを なくして こまっていました。ゆうたは びっくりしたけれど、いっしょに さがそうと やさしく うなずきました。ふたりは きらきらの あとを たどりはじめました。",
      imagePrompt: "A medium storybook shot of a child meeting a magical glowing friend in a sandbox, following a tiny star trail with rich but not cluttered park details",
      pageVisualRole: "action",
      compositionHint: "medium shot with action",
      visualMotifUsage: "yellow star trail on the sand",
      hiddenDetail: "tiny blue cup near the sandbox edge",
      appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
      focusCharacterId: "magic_friend_01",
    },
  ],
};

const mockImageBuffer = Buffer.from("fake-png-data");

function createMockDeps() {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    getUserPlan: vi.fn().mockResolvedValue("free" as const),
    llmClient: {
      generateStory: vi.fn().mockResolvedValue(mockStory),
      rewriteStoryText: vi.fn().mockResolvedValue({
        pages: mockStory.pages.map((page) => ({ text: page.text })),
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      }),
    },
    imageClient: { generateImage: vi.fn().mockResolvedValue(mockImageBuffer) },
    uploadImage: vi.fn().mockResolvedValue("https://storage.example.com/image.png"),
    updateBookTitle: vi.fn().mockResolvedValue(undefined),
    updateBookCoverImage: vi.fn().mockResolvedValue(undefined),
    writePage: vi.fn().mockResolvedValue(undefined),
    updateBookProgress: vi.fn().mockResolvedValue(undefined),
    updateBookStatus: vi.fn().mockResolvedValue(undefined),
    updateBookFailure: vi.fn().mockResolvedValue(undefined),
    updateBookFailureMetadata: vi.fn().mockResolvedValue(undefined),
    updateBookStoryQualityReport: vi.fn().mockResolvedValue(undefined),
    updateBookStoryGenerationMetadata: vi.fn().mockResolvedValue(undefined),
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
        imageModelProfile: "pro_consistent",
        inputImageUrls: expect.arrayContaining([
          "https://story-gen-8a769.web.app/images/styles/soft_watercolor.png",
          "https://story-gen-8a769.web.app/images/templates/animals.png",
          "https://example.com/magic-friend.png",
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
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_cover",
        imageModelProfile: "pro_consistent",
        inputImageUrlsCount: expect.any(Number),
        inputReferenceCount: expect.any(Number),
        usedCharacterReference: true,
        characterConsistencyMode: "all_pages",
        pageVisualRole: "opening_establishing",
        appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
        focusCharacterId: "child_protagonist",
        textCharCount: expect.any(Number),
        textSentenceCount: expect.any(Number),
        textQualityWarnings: expect.any(Array),
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_page",
        imageModelProfile: "pro_consistent",
        inputImageUrlsCount: expect.any(Number),
        usedCharacterReference: true,
        characterConsistencyMode: "all_pages",
        pageVisualRole: "action",
        appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
        focusCharacterId: "magic_friend_01",
        textCharCount: expect.any(Number),
        textSentenceCount: expect.any(Number),
        textQualityWarnings: expect.any(Array),
      })
    );
    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({
        storyModel: expect.any(String),
        storyCast: expect.any(Array),
        storyGoal: mockStory.storyGoal,
        mainQuestObject: mockStory.mainQuestObject,
        forbiddenQuestObjects: mockStory.forbiddenQuestObjects,
      })
    );
    expect(deps.updateBookTitle).toHaveBeenCalledWith("book123", "ゆうたとひかりのほし");
    expect(deps.updateBookStoryQualityReport).toHaveBeenCalledOnce();
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "completed");
    expect(deps.incrementMonthlyCount).toHaveBeenCalledWith("user123");
  });

  it("retries guided_ai story generation once when the first story is too thin", async () => {
    deps.llmClient.generateStory
      .mockResolvedValueOnce({
        ...mockStory,
        narrativeDevice: undefined,
        pages: [
          { text: "たのしいね。", imagePrompt: "short image prompt", compositionHint: undefined },
          { text: "うれしいね。", imagePrompt: "short image prompt", compositionHint: undefined },
        ],
      })
      .mockResolvedValueOnce(mockStory);

    await processBookGeneration("book-retry", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStoryQualityReport).toHaveBeenCalledOnce();
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-retry", "completed");
  });

  it("uses rewriteStoryText for premium_paid books and stores rewrite metadata", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid",
      input: { childName: "ゆうた", childAge: 4 },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce({
      ...mockStory,
      pages: [
        { ...mockStory.pages[0], text: "ころころ こりころ。" },
        { ...mockStory.pages[1], text: "ふわふわ ふわりん。" },
      ],
    });
    deps.llmClient.rewriteStoryText.mockResolvedValue({
      pages: mockStory.pages.map((page) => ({ text: page.text })),
      storyTextRewriteModel: "gemini-2.5-pro",
      storyTextRewriteAttempts: 1,
    });

    await processBookGeneration("book-rewrite", premiumBook, deps);

    expect(deps.llmClient.rewriteStoryText).toHaveBeenCalled();
    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-rewrite",
      expect.objectContaining({
        storyTextRewriteUsed: true,
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      })
    );
  });

  it("sanitizes story metadata and page data before Firestore writes", async () => {
    const storyWithUndefinedCast: GeneratedStory = {
      ...mockStory,
      cast: [
        {
          characterId: "magic_friend_01",
          displayName: "ひかりのともだち",
          role: "magical_friend",
          visualBible: "small glowing golden spirit child",
          referenceImageUrl: undefined,
          approvedImageUrl: "https://example.com/magic-friend.png",
          silhouette: undefined,
          colorPalette: undefined,
          signatureItems: ["gold glow"],
          doNotChange: undefined,
          canChangeByScene: undefined,
        },
      ],
      pages: mockStory.pages.map((page, index) =>
        index === 0 ? { ...page, focusCharacterId: undefined } : page
      ),
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(storyWithUndefinedCast);
    deps.llmClient.rewriteStoryText.mockResolvedValueOnce({
      pages: storyWithUndefinedCast.pages.map((page) => ({ text: page.text })),
      storyTextRewriteModel: "gemini-2.5-pro",
      storyTextRewriteAttempts: 1,
    });

    await processBookGeneration(
      "book-sanitize",
      {
        ...baseBookData,
        productPlan: "premium_paid",
        input: { childName: "ゆうた", childAge: 4 },
      },
      deps
    );

    const metadataArg = deps.updateBookStoryGenerationMetadata.mock.calls.at(-1)?.[1];
    expect(hasUndefinedDeep(metadataArg)).toBe(false);

    const pageArgs = deps.writePage.mock.calls.map((call) => call[1]);
    expect(pageArgs.every((page) => !hasUndefinedDeep(page))).toBe(true);
  });

  it("runs premium rewrite up to 2 times when story goal consistency stays weak", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid",
      input: { childName: "ゆうた", childAge: 4, storyRequest: "なくした星をさがす" },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce({
      ...mockStory,
      pages: [
        { ...mockStory.pages[0], text: "たのしいね。" },
        { ...mockStory.pages[1], text: "すいかを さがしたよ。" },
      ],
    });
    deps.llmClient.rewriteStoryText
      .mockResolvedValueOnce({
        pages: [
          { text: "すなばで ひかりが きらり。ゆうたは ふしぎそうに みつめました。" },
          { text: "でも ふたりは、まだ すいかを さがしているようでした。" },
        ],
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      })
      .mockResolvedValueOnce({
        pages: mockStory.pages.map((page) => ({ text: page.text })),
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      });

    await processBookGeneration("book-rewrite-2", premiumBook, deps);

    expect(deps.llmClient.rewriteStoryText).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-rewrite-2",
      expect.objectContaining({
        storyTextRewriteUsed: true,
        storyTextRewriteAttempts: 2,
      })
    );
  });

  it("fails guided_ai generation when retry still does not satisfy the quality gate", async () => {
    const thinStory: GeneratedStory = {
      ...mockStory,
      narrativeDevice: undefined,
      pages: [
        { text: "たのしいね。", imagePrompt: "short image prompt", compositionHint: undefined },
        { text: "うれしいね。", imagePrompt: "short image prompt", compositionHint: undefined },
      ],
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(thinStory).mockResolvedValueOnce(thinStory);

    await processBookGeneration("book-retry-fail", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStoryQualityReport).toHaveBeenCalledOnce();
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
    expect(deps.updateBookFailure).toHaveBeenCalledWith(
      "book-retry-fail",
      "本文の品質基準を満たす絵本を作れませんでした。もう一度お試しください。"
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-retry-fail", "failed");
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

  it("stores retryable Gemini failure metadata when story generation service is unavailable", async () => {
    const retryableError = new Error(
      "[503 Service Unavailable] This model is currently experiencing high demand."
    );
    deps.llmClient.generateStory.mockRejectedValue(retryableError);

    await processBookGeneration("book-gemini-503", baseBookData, deps);

    expect(deps.updateBookFailure).toHaveBeenCalledWith(
      "book-gemini-503",
      "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。"
    );
    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "book-gemini-503",
      expect.objectContaining({
        failureStage: "story_generation",
        failureProvider: "gemini",
        retryable: true,
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-gemini-503", "failed");
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
        imageModelProfile: "pro_consistent",
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
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_cover",
        imageModelProfile: "pro_consistent",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-free",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_page",
        imageModelProfile: "pro_consistent",
      })
    );
  });

  it("keeps light_paid books on pro_consistent for both cover and pages", async () => {
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
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_cover",
        imageModelProfile: "pro_consistent",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-light-paid",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_page",
        imageModelProfile: "pro_consistent",
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
        imageModelProfile: "pro_consistent",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-premium-paid",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "premium",
        imagePurpose: "book_page",
        imageModelProfile: "pro_consistent",
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
      narrativeDevice: {
        repeatedPhrase: "だいじょうぶ、いっしょにいるよ",
        visualMotif: "yellow star",
        setup: "はじめに見つけた小さな星",
        payoff: "最後にもう一度星が光る",
        hiddenDetails: ["small bird", "blue cup", "leaf shape", "toy rabbit", "flower pot"],
      },
      pages: [
        {
          text: "こうえんに ついたとき、ゆうたは おおきく いきを すいました。やわらかな ひかりのなかで、きょうの ぼうけんが はじまります。",
          imagePrompt: "wide establishing shot of a child arriving at a bright park with gentle trees, a yellow star motif, and clear child-safe scenery details",
          pageVisualRole: "opening_establishing",
          compositionHint: "wide establishing shot",
        },
        {
          text: "ベンチの そばには、ちいさな はっぱが ゆれていました。ゆうたは その かたちを みて、ほしに すこし にているなあと おもいました。",
          imagePrompt: "medium shot with action showing a child near a park bench, looking at leaf shapes, with soft seasonal details and a clear focal point",
          pageVisualRole: "discovery",
          compositionHint: "medium shot with action",
        },
        {
          text: "そのとき、あおい ことりが ぴょこんと とんできて、ほしの ひかりが つづく ほうを みせてくれました。ゆうたは そっと てを のばして、星のかけらに ちかづいているのかもと おもいました。",
          imagePrompt: "side view storybook scene of a child noticing a small blue bird, with flowers, grass, and meaningful but not cluttered background details",
          pageVisualRole: "action",
          compositionHint: "side view with discovery",
        },
        {
          text: "かえりみち、ポケットの なかで きいろい ほしが きらっと ひかりました。ゆうたは きょうの ことを おもいだして、もういちど にっこり しました。",
          imagePrompt: "close-up emotional moment of a child holding a glowing yellow star near a pocket, with hands and clothing details in focus",
          pageVisualRole: "payoff",
          compositionHint: "close-up of hands and expression",
        },
        {
          text: "ふりかえると、こうえんの けしきの なかで、みつけた 星のかけらが まだ ちいさく ひかっていました。ゆうたは また あの ひかりに あえるかなと おもいながら、あたたかな きもちで あるきだしました。",
          imagePrompt: "warm ending back view of a child walking away through a beautiful park, gentle sky, repeated yellow star motif, and rich but calm scenery",
          pageVisualRole: "quiet_ending",
          compositionHint: "warm ending back view",
        },
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

    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: expect.arrayContaining(["https://example.com/approved.png"]),
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: [],
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      3,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: [],
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      4,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: expect.arrayContaining(["https://example.com/approved.png"]),
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenNthCalledWith(
      5,
      expect.any(String),
      expect.objectContaining({
        inputImageUrls: expect.arrayContaining(["https://example.com/approved.png"]),
      })
    );
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
    expect(calls[0]).toEqual(expect.arrayContaining(["https://example.com/magic-friend.png"]));
  });

  it("stores pageVisualRole and reference usage metadata on every written page", async () => {
    await processBookGeneration("book123", baseBookData, deps);

    const pageWrites = deps.writePage.mock.calls.map(([, page]) => page).filter((page) => page.status === "completed");
    expect(pageWrites).toHaveLength(2);
    expect(pageWrites[0]).toEqual(
      expect.objectContaining({
        pageVisualRole: "opening_establishing",
        imageModelProfile: "pro_consistent",
        inputImageUrlsCount: expect.any(Number),
        inputReferenceCount: expect.any(Number),
        usedCharacterReference: true,
        characterConsistencyMode: "all_pages",
      })
    );
    expect(pageWrites[1]).toEqual(
      expect.objectContaining({
        pageVisualRole: "action",
        imageModelProfile: "pro_consistent",
        inputImageUrlsCount: expect.any(Number),
        inputReferenceCount: expect.any(Number),
        usedCharacterReference: true,
        characterConsistencyMode: "all_pages",
      })
    );
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

  it("continues fixed_template generation even when the quality report has errors", async () => {
    deps.getTemplate.mockResolvedValue({
      ...fixedTemplate,
      fixedStory: {
        titleTemplate: fixedTemplate.fixedStory!.titleTemplate,
        pages: [
          {
            textTemplate: "{childName}、いった。",
            imagePromptTemplate: "A child at the zoo with family in a warm memory scene",
          },
          {
            textTemplate: "{parentMessage}",
            imagePromptTemplate: "A warm ending zoo memory scene with family",
          },
        ],
      },
    });

    const thinFixedBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo",
      creationMode: "fixed_template",
      input: {
        childName: "ゆうた",
        childAge: 6,
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed-thin", thinFixedBook, deps);

    expect(deps.updateBookStoryQualityReport).toHaveBeenCalledOnce();
    expect(deps.imageClient.generateImage).toHaveBeenCalled();
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-fixed-thin", "completed");
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
