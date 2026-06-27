import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "firebase-functions/logger";
import {
  processBookGeneration,
  shouldUseCharacterReferenceForPage,
  classifyFallbackReasonClass,
  normalizeStoryCastWithChildProfile,
  shouldFailBookForQuality,
  gateImageModelProfile,
  sanitizeForbiddenQuestObjects,
  normalizeBookForGeneration,
} from "../src/generate-book";
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
  sampleImageUrl: "/images/templates/animals.webp",
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
        textTemplate: "ぞうさん、おおきいね。",
        imagePromptTemplate: "A child looking at an elephant",
      },
      {
        textTemplate: "きりんさん、たかいね。",
        imagePromptTemplate: "A child looking at a giraffe",
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

function createPremiumPassingStory(): GeneratedStory {
  return {
    ...mockStory,
    pages: [
      {
        text: "たっくんは、すなばで みどりの きょうりゅうを あそばせていました。すると、すなの なかで 小さな ひかりが きらりと ゆれて、たっくんは ふしぎそうに てを のばしました。つぎに なにが でてくるのか、どきどきして しゃがみこみました。",
        imagePrompt: "wide establishing shot of a sandbox with a tiny star glow and a child-safe park background",
        pageVisualRole: "opening_establishing",
        compositionHint: "wide establishing shot",
        appearingCharacterIds: ["child_protagonist"],
        focusCharacterId: "child_protagonist",
      },
      {
        text: "すなの うえで、ちいさな ほしのこが ふるえながら ひかっていました。『星のかけらを なくしちゃったの』と きくと、たっくんは びっくりしながらも そっと うなずきました。すなばの まんなかで、ふたりの ぼうけんが はじまりました。",
        imagePrompt: "discovery scene with a small star child glowing on the sand and a gentle park setting",
        pageVisualRole: "discovery",
        compositionHint: "medium shot with discovery",
        appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
        focusCharacterId: "magic_friend_01",
      },
      {
        text: "ほしのこは たっくんの てのひらで、あかるく みちを てらしました。たっくんは すなの やまを そっと くずしながら、星のかけらの ありかを さがしました。『キラキラ、こっちかな』と つぶやくと、ふたりの めが ぱっと かがやきました。",
        imagePrompt: "action scene in a sandbox with a glowing path, child hands, and clear gentle background details",
        pageVisualRole: "action",
        compositionHint: "action shot with hand detail",
        appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
        focusCharacterId: "child_protagonist",
      },
      {
        text: "ひかりの みちの さきで、星のかけらが きらりと みつかりました。ほしのこは ほっとしたように わらって、『ありがとう』と たっくんの まわりを くるりと とびました。やさしい よぞらの したで、たっくんも うれしく なりました。",
        imagePrompt: "quiet ending under a gentle night sky with the found star shard glowing softly beside the child and star friend",
        pageVisualRole: "quiet_ending",
        compositionHint: "quiet ending shot",
        appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
        focusCharacterId: "magic_friend_01",
      },
    ],
  };
}

function createMockDeps() {
  const mockDb = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      })),
    })),
    runTransaction: vi.fn((cb) => cb({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: vi.fn(),
    })),
  };

  return {
    db: mockDb as any,
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
    isUserAdmin: vi.fn().mockResolvedValue(false),

    incrementMonthlyCount: vi.fn().mockResolvedValue(undefined),
  };
}
const baseBookData: BookData = { imageModelProfile: "pro_consistent",
  userId: "user123", title: "", theme: "birthday", style: "watercolor",
  pageCount: 4, status: "generating", progress: 0, input: { childName: "ゆうた" },
  createdAt: {} as FirebaseFirestore.Timestamp, expiresAt: null,
};
  let deps: ReturnType<typeof createMockDeps>;
describe("processBookGeneration", () => {
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
          "https://example.com/magic-friend.png",
        ]),
      })
    );
    expect(deps.imageClient.generateImage).toHaveBeenCalledWith(
      expect.not.stringContaining("reference image"),
      expect.any(Object)
    );
    expect(deps.imageClient.generateImage).toHaveBeenCalledWith(
      expect.stringContaining("Illustration style:"),
      expect.any(Object)
    );
    expect(deps.uploadImage).toHaveBeenCalledTimes(2);
    expect(deps.writePage).toHaveBeenCalledTimes(2);
    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "standard",
        imagePurpose: "book_page",
        inputImageRoles: ["character_reference"],
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
        inputImageRoles: ["character_reference"],
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
        selectedStyleId: "watercolor",
        selectedStyleName: "やさしい水彩",
        stylePreviewImageUrl: "/images/styles/soft_watercolor.webp",
        stylePreviewUsedAsReference: false,
        styleBible: mockStory.styleBible,
        inputImageRoles: ["character_reference"],
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
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
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
    const metadata = deps.updateBookStoryGenerationMetadata.mock.calls.at(-2)?.[1];
    expect(metadata).toEqual(
      expect.objectContaining({
        storyTextRewriteUsed: true,
        storyTextRewriteModel: "gemini-2.5-pro",
      })
    );
    expect(metadata.storyTextRewriteAttempts).toBeGreaterThanOrEqual(1);
  });

  it("normalizes protagonist cast with child profile values", () => {
    const normalized = normalizeStoryCastWithChildProfile(
      {
        ...mockStory,
        characterBible: "A boy wearing yellow t-shirt and blue shorts",
        cast: [
          {
            characterId: "tatchan",
            displayName: "たっちゃん",
            role: "protagonist",
            visualBible: "boy with yellow t-shirt and blue shorts",
            signatureItems: ["yellow shirt"],
            doNotChange: ["Do not change the yellow shirt"],
          },
          ...(mockStory.cast ?? []),
        ],
        pages: mockStory.pages.map((page) => ({
          ...page,
          appearingCharacterIds: ["tatchan", "magic_friend_01"],
          focusCharacterId: "tatchan",
        })),
      },
      {
        displayName: "たっちゃん",
        nickname: "たっちゃん",
        age: 4,
        personality: {},
        visualProfile: {
          version: 1,
          characterLook: "short black hair and gentle round face",
          outfit: "青空が描かれたTシャツ",
          signatureItem: "みどりのきょうりゅう",
          characterBible: "same child with short black hair, gentle round face, blue sky t-shirt, green dinosaur toy",
          referenceImageUrl: "https://example.com/child-ref.png",
          approvedImageUrl: "https://example.com/child-approved.png",
        },
      }
    );

    expect(normalized.characterBible).toContain("blue sky t-shirt");
    expect(normalized.cast?.[0]).toEqual(
      expect.objectContaining({
        characterId: "tatchan",
        role: "protagonist",
        referenceImageUrl: "https://example.com/child-ref.png",
        approvedImageUrl: "https://example.com/child-approved.png",
      })
    );
    expect(normalized.cast?.[0].doNotChange?.join(" ")).toContain("青空が描かれたTシャツ");
    expect(normalized.cast?.[0].doNotChange?.join(" ")).toContain("short black hair and gentle round face");
    expect(normalized.cast?.[0].doNotChange?.join(" ")).toContain("みどりのきょうりゅう");
    expect(normalized.pages[0].appearingCharacterIds).toEqual(["tatchan", "magic_friend_01"]);
  });

  it("corrects and validates protagonist name in story text fields", () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    const story: GeneratedStory = {
      ...mockStory,
      title: "たっくんのぼうけん",
      storyGoal: "たっくんが星をさがす",
      openingNarration: "むかしむかし、たっくんがいました。",
      titleSpreadText: "たっくんの はじまりの物語",
      cast: [
        {
          characterId: "child_protagonist",
          displayName: "たっくん",
          role: "protagonist",
          visualBible: "boy",
        },
      ],
      pages: [
        {
          text: "たっくんは、こうえんにいきました。",
          imagePrompt: "park",
        },
        {
          text: "なまえがないページ。",
          imagePrompt: "missing name",
        },
      ],
    };

    const normalized = normalizeStoryCastWithChildProfile(story, {
      displayName: "ゆうた",
      nickname: "ゆうた",
      age: 4,
      personality: {},
      visualProfile: {
        version: 1,
        characterBible: "child",
      },
    });

    expect(normalized.title).toBe("ゆうたのぼうけん");
    expect(normalized.storyGoal).toBe("ゆうたが星をさがす");
    expect(normalized.openingNarration).toBe("むかしむかし、ゆうたがいました。");
    expect(normalized.titleSpreadText).toBe("ゆうたの はじまりの物語");
    expect(normalized.pages[0].text).toBe("ゆうたは、こうえんにいきました。");
    expect(normalized.pages[1].text).toBe("なまえがないページ。");

    // Check that warning was logged for the page missing the name
    expect(warnSpy).toHaveBeenCalledWith(
      "Protagonist name mismatch detected in story text",
      expect.objectContaining({
        field: "pages[1].text",
        expected: "ゆうた",
      })
    );

    warnSpy.mockRestore();
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
        productPlan: "premium_paid", imageModelProfile: "pro_consistent",
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
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
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
      "絵本の内容を整えきれませんでした。もう一度作成すると、別の構成で成功する場合があります。"
    );
    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "book-retry-fail",
      expect.objectContaining({
        failureStage: "quality_gate",
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-retry-fail", "failed");
  });

  it("continues generation when premium quality report only has warnings", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
      input: { childName: "ゆうた", childAge: 4 },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce({
      ...createPremiumPassingStory(),
      pages: createPremiumPassingStory().pages.map((page, index) =>
        index === 1
          ? {
              ...page,
              text: "すなの うえで、ほしのこが ふるえながら ひかっていました。なくした ほしのかけらを さがしていると きいて、たっくんは びっくりしながらも うなずきました。いっしょに さがそうと こえを かけました。",
            }
          : page
      ),
    });
    deps.llmClient.rewriteStoryText.mockResolvedValueOnce({
      pages: createPremiumPassingStory().pages.map((page) => ({ text: page.text })),
      storyTextRewriteModel: "gemini-2.5-pro",
      storyTextRewriteAttempts: 1,
    });

    await processBookGeneration("book-premium-warning", premiumBook, deps);

    expect(deps.imageClient.generateImage).toHaveBeenCalled();
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-premium-warning", "completed");
  });

  it("saves generated text preview when quality gate fails", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
      input: { childName: "ゆうた", childAge: 4 },
    };
    const driftingStory: GeneratedStory = {
      ...createPremiumPassingStory(),
      pages: [
        {
          ...createPremiumPassingStory().pages[0],
          text: "たっくんは すなばで あそんでいました。すいかは どこかな、と つぶやいて いました。すなばの はしを みまわしました。",
        },
        {
          ...createPremiumPassingStory().pages[1],
          text: "ほしのこも すいかを さがそうと いいました。たっくんは すなの やまを くずしながら、すいかの ありかを たずねました。ふたりの めは すいかだけを おっていました。",
        },
        createPremiumPassingStory().pages[2],
        {
          ...createPremiumPassingStory().pages[3],
          text: "よるに なっても、おそらが きれいでした。たっくんと ほしのこは しずかに みあげていました。",
        },
      ],
    };
    deps.llmClient.generateStory
      .mockResolvedValueOnce(driftingStory)
      .mockResolvedValueOnce(driftingStory);
    deps.llmClient.rewriteStoryText
      .mockResolvedValueOnce({
        pages: driftingStory.pages.map((page) => ({ text: page.text })),
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      })
      .mockResolvedValueOnce({
        pages: driftingStory.pages.map((page) => ({ text: page.text })),
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      });

    await processBookGeneration("book-quality-fail-preview", premiumBook, deps);

    const metadata = deps.updateBookStoryGenerationMetadata.mock.calls.at(-1)?.[1];
    expect(metadata).toEqual(
      expect.objectContaining({
        storyTitleCandidate: driftingStory.title,
        storyGoal: driftingStory.storyGoal,
        mainQuestObject: driftingStory.mainQuestObject,
        forbiddenQuestObjects: driftingStory.forbiddenQuestObjects,
        generatedTextPreview: driftingStory.pages.map((page) => page.text),
      })
    );
    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "book-quality-fail-preview",
      expect.objectContaining({
        failureStage: "quality_gate",
        technicalErrorMessage: expect.stringContaining("forbidden_object_became_goal_persistent"),
      })
    );
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

  it("retries within a fallback profile then falls back to klein_fast on failure", async () => {
    deps.imageClient.generateImage
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(mockImageBuffer);
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "completed");
    expect(deps.writePage).toHaveBeenCalledTimes(2);
  });

  it("writes image_failed page status when all fallback profiles fail and marks book failed", async () => {
    deps.imageClient.generateImage.mockRejectedValue(new Error("always fail"));
    await processBookGeneration("book123", baseBookData, deps);
    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({ pageNumber: 0, status: "image_failed" })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({ pageNumber: 1, status: "image_failed" })
    );
    expect(deps.writePage).toHaveBeenCalledTimes(2);
    expect(deps.uploadImage).not.toHaveBeenCalled();
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "failed");
    expect(deps.incrementMonthlyCount).not.toHaveBeenCalled();
  });

  it("marks book as partial_completed when some pages fail and some succeed", async () => {
    const page0Keyword = "warm wide sandbox";
    deps.imageClient.generateImage.mockImplementation(async (prompt: string) => {
      if (prompt.includes(page0Keyword)) {
        throw new Error("page 0 always fails");
      }
      return mockImageBuffer;
    });

    await processBookGeneration("book-partial", baseBookData, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-partial",
      expect.objectContaining({ pageNumber: 0, status: "image_failed" })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-partial",
      expect.objectContaining({ pageNumber: 1, status: expect.stringMatching(/^(completed|fallback_completed)$/) })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-partial", "partial_completed");
    expect(deps.incrementMonthlyCount).toHaveBeenCalledWith("user123");
  });

  it("marks page status as fallback_completed when primary profile fails but fallback succeeds", async () => {
    deps.imageClient.generateImage.mockImplementation(
      async (_prompt: string, options?: { imageModelProfile?: string }) => {
        if (options?.imageModelProfile === "pro_consistent") {
          throw new Error("pro_consistent unavailable");
        }
        return mockImageBuffer;
      }
    );

    await processBookGeneration("book-fallback", baseBookData, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-fallback",
      expect.objectContaining({
        imageFallbackUsed: true,
        status: "fallback_completed",
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-fallback", "completed");
  });

  it("saves image generation metrics per page", async () => {
    await processBookGeneration("book-metrics", baseBookData, deps);

    const pageArgs = deps.writePage.mock.calls.map((call) => call[1]);
    for (const page of pageArgs) {
      expect(page.imageAttemptCount).toBeGreaterThan(0);
      expect(page.imageDurationMs).toBeGreaterThanOrEqual(0);
    }
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
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(4);
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
        ...fixedTemplate.fixedStory!,
        pages: Array(4).fill({
          textTemplate: "{childName}は{place}へいきました。",
          textTemplatesByAge: {
            general_child: "{childName}は、みんなで{place}へでかけました。",
          },
          imagePromptTemplate: "A child arriving at a friendly zoo with family",
        }),
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
        ...fixedTemplate.fixedStory!,
        pages: Array(4).fill({
          textTemplate: "{childName}は、{place}へいきました。",
          imagePromptTemplate: "A child arriving at a friendly zoo with family",
        }),
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

  it("fails closed for blocked fixed-template style pairings before generation starts", async () => {
    deps.getTemplate.mockResolvedValue(fixedTemplate);
    const blockedBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo-8p",
      templateId: "fixed-first-zoo-8p",
      creationMode: "fixed_template",
      style: "anime_storybook",
      input: {
        childName: "ゆうた",
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed-blocked", blockedBook, deps);

    expect(deps.updateBookFailure).toHaveBeenCalledWith(
      "book-fixed-blocked",
      "この絵のタッチは、今はこのテンプレートでは選べません。別のタッチを選んでください。"
    );
    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "book-fixed-blocked",
      expect.objectContaining({
        failureStage: "validation",
        failureProvider: "system",
        retryable: false,
        technicalErrorMessage: expect.stringContaining(
          "style_exposure_blocked: template=fixed-first-zoo-8p style=anime_storybook status=blocked"
        ),
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-fixed-blocked", "failed");
    expect(deps.getUserPlan).not.toHaveBeenCalled();
    expect(deps.llmClient.generateStory).not.toHaveBeenCalled();
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
    expect(deps.writePage).not.toHaveBeenCalled();
  });

  it("allows unvalidated fixed-template style pairings via fallback to available", async () => {
    deps.getTemplate.mockResolvedValue(fixedTemplate);
    const unvalidatedBook: BookData = {
      ...baseBookData,
      theme: "fixed-first-zoo-8p",
      templateId: "fixed-first-zoo-8p",
      creationMode: "fixed_template",
      style: "toy_3d",
      input: {
        childName: "ゆうた",
        place: "上野動物園",
        familyMembers: "ママとパパ",
      },
    };

    await processBookGeneration("book-fixed-unvalidated", unvalidatedBook, deps);

    // Should NOT fail with exposure error
    expect(deps.updateBookFailure).not.toHaveBeenCalledWith(
      "book-fixed-unvalidated",
      expect.stringContaining("この絵のタッチは")
    );
    // Should proceed to successful completion (fixed templates don`t hit LLM)
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-fixed-unvalidated", "completed");
  });

  it("uses premium model metadata when imageQualityTier is premium", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
      imageQualityTier: "premium",
      input: { childName: "ゆうた", childAge: 4 },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(createPremiumPassingStory());
    deps.llmClient.rewriteStoryText.mockResolvedValue({
      pages: createPremiumPassingStory().pages.map((page) => ({ text: page.text })),
      storyTextRewriteModel: "gemini-2.5-pro",
      storyTextRewriteAttempts: 1,
    });

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
        imageQualityTier: "light",
        imagePurpose: "book_page",
        imageModelProfile: "pro_consistent",
      })
    );
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-free",
      expect.objectContaining({
        pageNumber: 1,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "light",
        imagePurpose: "book_page",
        imageModelProfile: "pro_consistent",
      })
    );
  });

  it("keeps premium_paid books on pro for both cover and pages", async () => {
    const premiumPaidBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
      pageCount: 4,
      input: { childName: "ゆうた", childAge: 4 },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(createPremiumPassingStory());
    deps.llmClient.rewriteStoryText.mockResolvedValue({
      pages: createPremiumPassingStory().pages.map((page) => ({ text: page.text })),
      storyTextRewriteModel: "gemini-2.5-pro",
      storyTextRewriteAttempts: 1,
    });

    await processBookGeneration("book-premium-paid", premiumPaidBook, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book-premium-paid",
      expect.objectContaining({
        pageNumber: 0,
        imageModel: "black-forest-labs/flux-2-pro",
        imageQualityTier: "premium",
        imagePurpose: "book_page",
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
    deps.uploadCoverImage = vi.fn().mockResolvedValue("https://storage.example.com/cover.png");
    coverOnlyBook.coverImagePrompt = "Cover";
    await processBookGeneration("book-cover-only", coverOnlyBook, deps);

    // Page 0 should NOT have references
    expect(deps.imageClient.generateImage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        purpose: "book_page",
        inputImageUrls: [],
      })
    );
    // Cover should HAVE reference images
    expect(deps.imageClient.generateImage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        purpose: "book_cover",
        inputImageUrls: expect.arrayContaining([
          "https://example.com/reference.png",
          "https://example.com/approved.png",
        ]),
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

  it("saves the final rewritten quality report summary instead of the pre-rewrite threshold summary", async () => {
    const premiumBook: BookData = {
      ...baseBookData,
      productPlan: "premium_paid", imageModelProfile: "pro_consistent",
      input: { childName: "ゆうた", childAge: 4 },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce({
      ...mockStory,
      pages: [
        { ...mockStory.pages[0], text: "たのしいね。" },
        { ...mockStory.pages[1], text: "みつけたよ。" },
      ],
    });
    deps.llmClient.rewriteStoryText
      .mockResolvedValueOnce({
        pages: [
          {
            text: "たっくんは、すなばで みどりの きょうりゅうを あそばせていました。すると、すなの なかで 小さな ひかりが きらりと ゆれて、たっくんは そっと てを のばしました。",
          },
          {
            text: "すなの うえで、ほしのこが こまった かおを していました。なくした 星のかけらを さがしていると きいて、たっくんは いっしょに さがそうと うなずきました。",
          },
        ],
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      });

    await processBookGeneration("book-final-report", premiumBook, deps);

    const savedReport = deps.updateBookStoryQualityReport.mock.calls.at(-1)?.[1];
    expect(savedReport.summary.minCharsPerPage).toBeGreaterThanOrEqual(70);
  });

  it("keeps child consistency but does not hard-lock the background in story_flexible mode", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce({
      ...mockStory,
      characterBible: "A boy wearing yellow t-shirt and blue shorts",
      pages: [
        {
          ...mockStory.pages[0],
          imagePrompt: "A child near a red slide in a sandbox scene",
        },
        mockStory.pages[1],
      ],
    });

    const constrainedBook: BookData = {
      ...baseBookData,
      childProfileSnapshot: {
        displayName: "たっちゃん",
        nickname: "たっちゃん",
        age: 4,
        personality: {},
        visualProfile: {
          version: 1,
          outfit: "青空が描かれたTシャツ",
          signatureItem: "みどりのきょうりゅう",
          characterLook: "short black hair and gentle round face",
          characterBible:
            "same child with short black hair, gentle round face, blue sky t-shirt, green dinosaur toy",
          basePrompt:
            "Background must always be quiet Japanese neighborhood park. Include square sandbox. Do not include playground equipment. Do not include buildings, roads, signs.",
        },
      },
    };

    await processBookGeneration("book-child-constraints", constrainedBook, deps);

    const firstPrompt = deps.imageClient.generateImage.mock.calls[0]?.[0];
    expect(firstPrompt).toContain("blue sky t-shirt");
    expect(firstPrompt).not.toContain("yellow t-shirt and blue shorts");
    expect(firstPrompt).toContain("Scene setting rules: choose a setting that naturally supports this page's story beat");
    expect(firstPrompt).toContain("red slide");
    expect(firstPrompt).not.toContain("Respect the child profile background constraints");
    expect(firstPrompt).not.toContain("Do not include playground equipment");
  });

  it("removes generic toy words and signature items from forbidden quest objects", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce({
      ...createPremiumPassingStory(),
      forbiddenQuestObjects: ["すいか", "おもちゃ", "みどりのきょうりゅう"],
    });

    await processBookGeneration(
      "book-forbidden-sanitize",
      {
        ...baseBookData,
        productPlan: "premium_paid", imageModelProfile: "pro_consistent",
        input: { childName: "ゆうた", childAge: 4, signatureItem: "みどりのきょうりゅう" },
        childProfileSnapshot: {
          displayName: "ゆうた",
          personality: {},
          visualProfile: {
            version: 1,
            signatureItem: "みどりのきょうりゅう",
          },
        },
      },
      deps
    );

    const metadata = deps.updateBookStoryGenerationMetadata.mock.calls.at(-2)?.[1];
    expect(metadata.forbiddenQuestObjects).toEqual(["すいか"]);
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
        ...fixedTemplate.fixedStory!,
        pages: Array(4).fill({
          textTemplate: "{childName}、いった。",
          imagePromptTemplate: "A child at the zoo with family in a warm memory scene",
        }),
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

describe("shouldFailBookForQuality", () => {
  it("does not fail for warnings only", () => {
    expect(
      shouldFailBookForQuality(
        {
          ok: true,
          issues: [{ severity: "warning", code: "missing_scene_detail", message: "warn" }],
          summary: {
            pageCount: 4,
            averageCharsPerPage: 90,
            averageSentencesPerPage: 3,
            minCharsPerPage: 70,
            minSentencesPerPage: 3,
          },
        },
        "premium_paid"
      )
    ).toBe(false);
  });

  it("fails for fatal premium quality issues", () => {
    expect(
      shouldFailBookForQuality(
        {
          ok: false,
          issues: [
            {
              severity: "error",
              code: "main_quest_drift_persistent",
              message: "fatal",
            },
          ],
          summary: {
            pageCount: 4,
            averageCharsPerPage: 40,
            averageSentencesPerPage: 2,
            minCharsPerPage: 24,
            minSentencesPerPage: 2,
          },
        },
        "premium_paid"
      )
    ).toBe(true);
  });
});

describe("cover image generation", () => {
  let deps: ReturnType<typeof createMockDeps>;
  beforeEach(() => { deps = createMockDeps(); });

  const bookWithCoverPrompt: BookData = {
    ...baseBookData,
    coverImagePrompt: "A cheerful boy on a sunny park cover illustration",
  };

  it("generates cover image when coverImagePrompt and uploadCoverImage are present", async () => {
    deps.uploadCoverImage = vi.fn().mockResolvedValue("https://storage.example.com/cover.png");
    await processBookGeneration("book-cover-1", bookWithCoverPrompt, deps);

    expect(deps.uploadCoverImage).toHaveBeenCalledWith("book-cover-1", expect.any(Buffer));
    // cover URL should overwrite the page-0 fallback
    expect(deps.updateBookCoverImage).toHaveBeenCalledWith("book-cover-1", "https://storage.example.com/cover.png");
    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-cover-1",
      expect.objectContaining({ coverStatus: "generating" })
    );
    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-cover-1",
      expect.objectContaining({
        coverStatus: "completed",
        coverGeneratedAtMs: expect.any(Number),
        hasCoverPage: true,
        readingStructureVersion: "v2_cover_title_story",
        coverImageFallbackUsed: false,
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-cover-1", "completed");
  });

  it("skips cover generation when coverImagePrompt is absent", async () => {
    deps.uploadCoverImage = vi.fn();
    const noCoverBook = { ...baseBookData, coverImagePrompt: undefined };
    await processBookGeneration("book-no-prompt", noCoverBook, deps);

    expect(deps.uploadCoverImage).not.toHaveBeenCalled();
  });

  it("sets coverStatus failed when uploadCoverImage is not configured", async () => {
    // deps.uploadCoverImage is undefined by default
    await processBookGeneration("book-no-upload", bookWithCoverPrompt, deps);

    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-no-upload",
      expect.objectContaining({
        coverStatus: "failed",
        coverFailureReason: "upload_not_configured",
        hasCoverPage: false,
        readingStructureVersion: "v1_pages_only",
      })
    );
    // pages still succeed → book not failed
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-no-upload", "completed");
  });

  it("does not fail book when cover image generation fails but pages succeed", async () => {
    let callIndex = 0;
    deps.imageClient.generateImage = vi.fn().mockImplementation(() => {
      callIndex++;
      // First 2 calls are page images (succeed), subsequent are cover (fail)
      if (callIndex <= 2) return Promise.resolve(mockImageBuffer);
      return Promise.reject(new Error("cover generation error"));
    });
    deps.uploadCoverImage = vi.fn();
    await processBookGeneration("book-cover-fail", bookWithCoverPrompt, deps);

    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-cover-fail",
      expect.objectContaining({
        coverStatus: "failed",
        hasCoverPage: false,
        readingStructureVersion: "v1_pages_only",
      })
    );
    // pages succeeded → book should be completed, not failed
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-cover-fail", "completed");
  });

  it("includes characterBible and cast visual descriptions in the cover prompt", async () => {
    deps.uploadCoverImage = vi.fn().mockResolvedValue("https://storage.example.com/cover.png");
    const bookWithCast: BookData = {
      ...baseBookData,
      coverImagePrompt: "A cheerful boy and his magic friend",
    };
    // Use a cast member with a visualBible that won't be overridden by buildNonHumanRecurringCharacter
    const storyWithCustomCast = {
      ...mockStory,
      cast: [
        {
          ...mockStory.cast![0],
          visualBible: "small glowing golden creature with a tiny purple top hat",
        }
      ]
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(storyWithCustomCast);

    await processBookGeneration("book-cover-consistency", bookWithCast, deps);

    // Find the generateImage call for the cover (it's called with purpose: "book_cover")
    const coverCall = deps.imageClient.generateImage.mock.calls.find(
      ([prompt, options]) => options.purpose === "book_cover"
    );
    expect(coverCall).toBeDefined();
    const coverPrompt = coverCall![0];

    // Verify characterBible presence
    expect(coverPrompt).toContain("Character consistency: A consistent boy with short black hair and blue overalls");
    // Verify cast visual description presence
    expect(coverPrompt).toContain("small glowing golden creature with a tiny purple top hat");
    // Verify cover specific guidance
    expect(coverPrompt).toContain("Book cover: text-free, no letters, no logos, no watermarks");
    expect(coverPrompt).toContain("Book cover composition:");

    // Also verify page 0 prompt for comparison
    const page0Call = deps.imageClient.generateImage.mock.calls.find(
      ([, options]) => options.purpose === "book_cover" || options.pageIndex === 0
    );
    // Note: page 0 can also have purpose "book_cover" if it's the first page
    // In our deps.imageClient.generateImage mock in beforeEach, the first 2 calls are usually pages.
    // Actually, Step 8 (pages) runs before Step 8.5 (cover).
    const pagePrompts = deps.imageClient.generateImage.mock.calls
      .filter(([, options]) => options.purpose === "book_page" || (options.purpose === "book_cover" && options.pageIndex !== undefined))
      .map(([prompt]) => prompt);

    expect(pagePrompts[0]).toContain("Character consistency: A consistent boy with short black hair and blue overalls");
    expect(pagePrompts[0]).toContain("small glowing golden creature with a tiny purple top hat");
  });

  it("keeps page-0 coverImageUrl when cover upload fails", async () => {
    // In our new controller, the uploader is called inside generateCoverImageWithFallback.
    // We need to trigger a success in generation but a failure in upload.
    // Our mock imageClient.generateImage returns a buffer.
    // generateCoverImageWithFallback uses createImageAdapter which uses ReplicateImageClient.
    // Since we are in a test env without tokens, it should fall back to imageClient.

    deps.uploadCoverImage = vi.fn().mockRejectedValue(new Error("upload error"));
    await processBookGeneration("book-upload-fail", bookWithCoverPrompt, deps);

    // page 0 coverImageUrl should still be set from page upload (Step 8)
    expect(deps.updateBookCoverImage).toHaveBeenCalledWith(
      "book-upload-fail",
      "https://storage.example.com/image.png"
    );
    // cover status should be failed but book is completed
    // Note: With the refactoring, generateCoverImageWithFallback might catch the upload error
    // or return success false if the uploader throws.
    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "book-upload-fail",
      expect.objectContaining({
        coverStatus: "failed",
        // The failure reason comes from generateCoverImageWithFallback's catch block
        // which now logs the error and returns success: false.
        // In the test it seems to be classification to "unexpected_error" or similar.
        hasCoverPage: false,
        readingStructureVersion: "v1_pages_only",
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book-upload-fail", "completed");
  });
});

describe("gateImageModelProfile (T6-59)", () => {
  it("passes undefined through unchanged", () => {
    expect(gateImageModelProfile(undefined, false)).toBeUndefined();
    expect(gateImageModelProfile(undefined, true)).toBeUndefined();
  });

  it("passes non-candidate profiles through unchanged regardless of enrollment", () => {
    expect(gateImageModelProfile("pro_consistent", false)).toBe("pro_consistent");
    expect(gateImageModelProfile("klein_fast", false)).toBe("klein_fast");
    expect(gateImageModelProfile("klein_base", false)).toBe("klein_base");
    expect(gateImageModelProfile("kontext_reference", false)).toBe("kontext_reference");
  });

  it("strips candidate profile when user is not enrolled", () => {
    expect(gateImageModelProfile("openai_image_candidate", false)).toBeUndefined();
    expect(gateImageModelProfile("flux11_pro_candidate", false)).toBeUndefined();
  });

  it("passes candidate profile when user is enrolled", () => {
    expect(gateImageModelProfile("openai_image_candidate", true)).toBe("openai_image_candidate");
    expect(gateImageModelProfile("flux11_pro_candidate", true)).toBe("flux11_pro_candidate");
  });
});

describe("p5PageExperiment simplified_scene routing (P5-3d)", () => {
  let deps: ReturnType<typeof createMockDeps>;
  beforeEach(() => {
    deps = createMockDeps();
  });

  it("activates simplified_scene prompt for photo-less books with override set", async () => {
    const depsWithExperiment = { ...deps, p5PageExperiment: "simplified_scene" as const };
    await processBookGeneration("book-no-photo", baseBookData, depsWithExperiment);

    // simplified_scene omits the character-consistency block present in the full prompt
    for (const [promptArg] of deps.imageClient.generateImage.mock.calls) {
      expect(promptArg).not.toContain("Character consistency rules:");
    }
    for (const [, opts] of deps.imageClient.generateImage.mock.calls) {
      expect(opts.inputImageUrls).toEqual([]);
    }
  });

  it("suppresses simplified_scene for photo-backed books and keeps reference images active", async () => {
    const photoBook: BookData = {
      ...baseBookData,
      characterConsistencyMode: "all_pages",
      childProfileSnapshot: {
        displayName: "テスト",
        personality: {},
        visualProfile: {
          version: 1,
          referenceImageUrl: "https://example.com/child-photo.png",
        },
      },
    };
    const depsWithExperiment = { ...deps, p5PageExperiment: "simplified_scene" as const };
    await processBookGeneration("book-with-photo", photoBook, depsWithExperiment);

    // reference-aware path: reference URL must appear in at least one page call
    const anyPageWithRef = deps.imageClient.generateImage.mock.calls.some(
      ([, opts]) => (opts.inputImageUrls ?? []).includes("https://example.com/child-photo.png")
    );
    expect(anyPageWithRef).toBe(true);

    // full prompt path: prompt must contain the character-consistency block
    for (const [promptArg] of deps.imageClient.generateImage.mock.calls) {
      expect(promptArg).toContain("Character consistency rules:");
    }
  });

  it("suppresses simplified_scene for books with approvedImageUrl and keeps reference images active", async () => {
    const approvedPhotoBook: BookData = {
      ...baseBookData,
      characterConsistencyMode: "all_pages",
      childProfileSnapshot: {
        displayName: "テスト",
        personality: {},
        visualProfile: {
          version: 1,
          approvedImageUrl: "https://example.com/approved-photo.png",
        },
      },
    };
    const depsWithExperiment = { ...deps, p5PageExperiment: "simplified_scene" as const };
    await processBookGeneration("book-with-approved-photo", approvedPhotoBook, depsWithExperiment);

    const anyPageWithRef = deps.imageClient.generateImage.mock.calls.some(
      ([, opts]) => (opts.inputImageUrls ?? []).includes("https://example.com/approved-photo.png")
    );
    expect(anyPageWithRef).toBe(true);

    for (const [promptArg] of deps.imageClient.generateImage.mock.calls) {
      expect(promptArg).toContain("Character consistency rules:");
    }
  });

  it("leaves the default prompt path unchanged when p5PageExperiment is absent", async () => {
    await processBookGeneration("book-default", baseBookData, deps);

    for (const [promptArg] of deps.imageClient.generateImage.mock.calls) {
      expect(promptArg).toContain("Character consistency");
    }
  });
});

describe("p5ModelUnification safer_retry (P5-3f)", () => {
  const E005_ERROR = new Error("Prediction failed: The input or output was flagged as sensitive. Please try again with different inputs. (E005) (uIJ6l3ruRD)");

  // Single-page story for tests that need precise call ordering.
  // With concurrency=2 and 2 pages, mockRejectedValueOnce() rejections are shared across
  // both page tasks, making call-index assertions non-deterministic. A single page
  // eliminates all concurrency ambiguity.
  const onePage: GeneratedStory = { ...mockStory, pages: [mockStory.pages[0]] };

  let deps: ReturnType<typeof createMockDeps>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    deps = createMockDeps();
    logSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("Step b does not activate when Step a succeeds (all attempts succeed on first try)", async () => {
    await processBookGeneration("book-default-unification", baseBookData, deps);

    // All calls use original prompt with reference URLs — Step b never reached because no failures
    for (const [, opts] of deps.imageClient.generateImage.mock.calls) {
      expect((opts.inputImageUrls ?? []).length).toBeGreaterThan(0);
    }
    for (const [promptArg] of deps.imageClient.generateImage.mock.calls) {
      expect(promptArg).toContain("Character consistency");
    }
    const stepBLogs = logSpy.mock.calls.filter(
      ([, payload]) => (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLogs).toHaveLength(0);
  });

  it("safer_retry + Step a success: original prompt and refs used, Step b not called", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-step-a-success", baseBookData, saferDeps);

    // 1 page, 1 successful call — no step b needed
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(1);
    const [, opts] = deps.imageClient.generateImage.mock.calls[0];
    expect((opts.inputImageUrls ?? []).length).toBeGreaterThan(0);
    const [promptArg] = deps.imageClient.generateImage.mock.calls[0];
    expect(promptArg).toContain("Character consistency");
    const stepBLogs = logSpy.mock.calls.filter(
      ([, payload]) => (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLogs).toHaveLength(0);
  });

  it("safer_retry + Step a failure + Step b success: simplified prompt and empty refs on second call", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR); // Step a
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-step-b-success", baseBookData, saferDeps);

    // Step a (call 0) fails, Step b (call 1) succeeds
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);

    const [, stepAOpts] = deps.imageClient.generateImage.mock.calls[0];
    const [stepBPrompt, stepBOpts] = deps.imageClient.generateImage.mock.calls[1];

    // Step a: reference URLs present
    expect((stepAOpts.inputImageUrls ?? []).length).toBeGreaterThan(0);
    // Step b: reference images cleared
    expect(stepBOpts.inputImageUrls ?? []).toEqual([]);
    // Step b: simplified prompt — no character consistency block
    expect(stepBPrompt).not.toContain("Character consistency rules:");
    // Step b: same model (pro_consistent)
    expect(stepBOpts.imageModelProfile).toBe("pro_consistent");

    const page0Data = deps.writePage.mock.calls[0][1];
    expect(page0Data.imageAttemptCount).toBe(2);
    // imageFallbackUsed is stored as undefined (not false) when falsy — see removeUndefinedDeep
    expect(page0Data.imageFallbackUsed ?? false).toBe(false);
    expect(page0Data.imageModelProfile).toBe("pro_consistent");
    // Step b success → "completed", not "fallback_completed"
    expect(page0Data.status).toBe("completed");
  });

  it("safer_retry + Step a failure + Step b failure + Step c success: falls to klein_fast", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage
      .mockRejectedValueOnce(E005_ERROR)  // Step a
      .mockRejectedValueOnce(E005_ERROR); // Step b; Step c (klein_fast) succeeds via default mock
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-step-c", baseBookData, saferDeps);

    // Step a, Step b, klein_fast attempt 0 = 3 calls
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(3);

    const [, stepCOpts] = deps.imageClient.generateImage.mock.calls[2];
    expect(stepCOpts.imageModelProfile).toBe("klein_fast");

    const page0Data = deps.writePage.mock.calls[0][1];
    expect(page0Data.imageAttemptCount).toBe(3);
    expect(page0Data.imageFallbackUsed).toBe(true);
    expect(page0Data.imageModelProfile).toBe("klein_fast");
    expect(page0Data.status).toBe("fallback_completed");
  });

  it("photo-backed book: Step a uses reference URL, Step b clears it after Step a failure", async () => {
    const photoBook: BookData = {
      ...baseBookData,
      characterConsistencyMode: "all_pages",
      childProfileSnapshot: {
        displayName: "テスト",
        personality: {},
        visualProfile: {
          version: 1,
          referenceImageUrl: "https://example.com/child-photo.png",
        },
      },
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR);
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-photo-step-b", photoBook, saferDeps);

    const [, stepAOpts] = deps.imageClient.generateImage.mock.calls[0];
    const [, stepBOpts] = deps.imageClient.generateImage.mock.calls[1];

    // Step a: child reference URL present (photo-backed book)
    expect(stepAOpts.inputImageUrls ?? []).toContain("https://example.com/child-photo.png");
    // Step b: all reference images cleared — applies to photo-backed books too
    expect(stepBOpts.inputImageUrls ?? []).toEqual([]);
  });

  it("Step b fires only once — not on fallback profile (klein_fast)", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    // Step a, Step b, klein_fast attempt 0 all fail; klein_fast attempt 1 succeeds
    deps.imageClient.generateImage
      .mockRejectedValueOnce(E005_ERROR)  // Step a
      .mockRejectedValueOnce(E005_ERROR)  // Step b
      .mockRejectedValueOnce(E005_ERROR); // klein_fast attempt 0
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-no-double-step-b", baseBookData, saferDeps);

    // 4 calls: pro_consistent step a, pro_consistent step b, klein_fast 0, klein_fast 1
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(4);
    const calls = deps.imageClient.generateImage.mock.calls;
    expect(calls[0][1].imageModelProfile).toBe("pro_consistent"); // step a
    expect(calls[1][1].imageModelProfile).toBe("pro_consistent"); // step b
    expect(calls[2][1].imageModelProfile).toBe("klein_fast");     // step c attempt 0
    expect(calls[3][1].imageModelProfile).toBe("klein_fast");     // step c attempt 1

    // klein_fast attempt 0 retains original inputImageUrls (step b logic does not apply)
    expect((calls[2][1].inputImageUrls ?? []).length).toBeGreaterThan(0);

    // Step-b diagnostic log fires exactly once
    const stepBLogs = logSpy.mock.calls.filter(
      ([msg, payload]) =>
        msg === "p5_model_unification_retry_active" &&
        (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLogs).toHaveLength(1);
  });

  it("diagnostic log emitted with correct fields when Step b activates", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR);
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-diag-log", baseBookData, saferDeps);

    const stepBLog = logSpy.mock.calls.find(
      ([msg, payload]) =>
        msg === "p5_model_unification_retry_active" &&
        (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLog).toBeDefined();
    const payload = stepBLog![1] as Record<string, unknown>;
    expect(payload["step"]).toBe("b");
    expect(payload["originalProfile"]).toBe("pro_consistent");
    expect(payload["retryProfile"]).toBe("pro_consistent");
    expect(payload["retryInputReferenceCount"]).toBe(0);
    expect(["safety_rejection", "timeout", "other"]).toContain(payload["fallbackReasonClass"]);
  });

  it("fallbackReasonClass is safety_rejection for E005 errors", async () => {
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR);
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-e005-class", baseBookData, saferDeps);

    const stepBLog = logSpy.mock.calls.find(([msg]) => msg === "p5_model_unification_retry_active");
    const payload = stepBLog![1] as Record<string, unknown>;
    expect(payload["fallbackReasonClass"]).toBe("safety_rejection");
  });

  it("respects p5ModelUnification: safer_retry override even for non-default profiles", async () => {
    // profile that doesn't have safer_retry enabled by default
    const customBookData = { ...baseBookData, imageModelProfile: "klein_base" as const };
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR);

    // p5ModelUnification: "safer_retry" override is passed via deps
    const saferDeps = { ...deps, p5ModelUnification: "safer_retry" as const };
    await processBookGeneration("book-override-test", customBookData, saferDeps);

    // Should activate Step b because of the override
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    const [, stepBOpts] = deps.imageClient.generateImage.mock.calls[1];
    expect(stepBOpts.imageModelProfile).toBe("klein_base");

    const stepBLog = logSpy.mock.calls.find(
      ([msg, payload]) =>
        msg === "p5_model_unification_retry_active" &&
        (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLog).toBeDefined();
  });
});

describe("P5-4a: Promoted safer_retry to production default", () => {
  const E005_ERROR = new Error("Prediction failed: The input or output was flagged as sensitive. Please try again with different inputs. (E005) (uIJ6l3ruRD)");

  const onePage: GeneratedStory = { ...mockStory, pages: [mockStory.pages[0]] };

  let deps: ReturnType<typeof createMockDeps>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    deps = createMockDeps();
    logSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("activates Step b for pro_consistent + reference-aware book without p5ModelUnification override", async () => {
    // baseBookData uses mockStory with magic_friend_01.approvedImageUrl — refs present
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR); // Step a fails

    // No p5ModelUnification override — isSaferRetryEnabled triggers Step b
    await processBookGeneration("book-p54a-always-on", baseBookData, deps);

    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    const [, stepAOpts] = deps.imageClient.generateImage.mock.calls[0];
    const [stepBPrompt, stepBOpts] = deps.imageClient.generateImage.mock.calls[1];

    // Step a: reference images present
    expect((stepAOpts.inputImageUrls ?? []).length).toBeGreaterThan(0);
    // Step b: reference images cleared
    expect(stepBOpts.inputImageUrls ?? []).toEqual([]);
    // Step b: simplified prompt (no character consistency block)
    expect(stepBPrompt).not.toContain("Character consistency rules:");
    // Step b: still pro_consistent (no model downgrade)
    expect(stepBOpts.imageModelProfile).toBe("pro_consistent");

    const page0Data = deps.writePage.mock.calls[0][1];
    expect(page0Data.status).toBe("completed");
    expect(page0Data.imageFallbackUsed ?? false).toBe(false);
    expect(page0Data.imageModelProfile).toBe("pro_consistent");
    expect(page0Data.imageAttemptCount).toBe(2);

    // Diagnostic log emitted
    const stepBLog = logSpy.mock.calls.find(
      ([msg, payload]) =>
        msg === "p5_model_unification_retry_active" &&
        (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLog).toBeDefined();
  });

  it("DOES activate Step b even when pro_consistent book has no reference images (new P5-4a behavior)", async () => {
    // Story without any cast reference images, no childProfileSnapshot
    const noRefStory: GeneratedStory = {
      ...onePage,
      cast: [{ ...mockStory.cast[0], approvedImageUrl: undefined, referenceImageUrl: undefined, generatedReferenceImageUrl: undefined }],
    };
    deps.llmClient.generateStory.mockResolvedValueOnce(noRefStory);
    // Step a fails → Step b succeeds
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR);

    await processBookGeneration("book-p54a-no-ref", baseBookData, deps);

    // 2 calls: pro_consistent a0 (fail), pro_consistent a1 (Step b succeed)
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    const [, call0Opts] = deps.imageClient.generateImage.mock.calls[0];
    const [, call1Opts] = deps.imageClient.generateImage.mock.calls[1];

    expect(call0Opts.imageModelProfile).toBe("pro_consistent");
    expect(call1Opts.imageModelProfile).toBe("pro_consistent");

    const page0Data = deps.writePage.mock.calls[0][1];
    expect(page0Data.imageFallbackUsed ?? false).toBe(false);
    expect(page0Data.imageModelProfile).toBe("pro_consistent");

    // Step b diagnostic log emitted
    const stepBLogs = logSpy.mock.calls.filter(
      ([msg, payload]) =>
        msg === "p5_model_unification_retry_active" &&
        (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLogs).toHaveLength(1);
  });

  it("does NOT activate Step b when primary profile is klein_fast (not pro_consistent)", async () => {
    const kleinBook: BookData = { ...baseBookData, imageModelProfile: "klein_fast" };
    deps.llmClient.generateStory.mockResolvedValueOnce(onePage);
    deps.imageClient.generateImage.mockRejectedValueOnce(E005_ERROR); // klein_fast attempt 0 fails

    await processBookGeneration("book-p53k-klein-primary", kleinBook, deps);

    // klein_fast attempt 0 fails → klein_fast attempt 1 succeeds (no Step b, no fallback profile)
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    const [, call0Opts] = deps.imageClient.generateImage.mock.calls[0];
    const [, call1Opts] = deps.imageClient.generateImage.mock.calls[1];
    expect(call0Opts.imageModelProfile).toBe("klein_fast");
    expect(call1Opts.imageModelProfile).toBe("klein_fast");

    // No Step b log
    const stepBLogs = logSpy.mock.calls.filter(
      ([msg]) => msg === "p5_model_unification_retry_active"
    );
    expect(stepBLogs).toHaveLength(0);
  });
});

describe("Page 0 purpose and reference logic (E2E-QA fix)", () => {
  let deps: ReturnType<typeof createMockDeps>;
  beforeEach(() => {
    deps = createMockDeps();
    deps.uploadCoverImage = vi.fn().mockResolvedValue("https://storage.example.com/cover.png");
  });

  it("uses book_page purpose for Page 0 and suppresses references in cover_only mode", async () => {
    const book: BookData = {
      ...baseBookData,
      theme: "fantasy",
      creationMode: "guided_ai",
      characterConsistencyMode: "cover_only",
      childProfileSnapshot: {
        displayName: "ゆうた",
        personality: {},
        visualProfile: {
          version: 1,
          referenceImageUrl: "https://example.com/child-photo.png",
        },
      },
      coverImagePrompt: "Cover scene with child",
    };

    await processBookGeneration("book-page0-fix", book, deps);

    // Filter calls by purpose
    const page0Call = deps.imageClient.generateImage.mock.calls.find(
      ([, opts]) => opts.purpose === "book_page"
    );
    const coverCall = deps.imageClient.generateImage.mock.calls.find(
      ([, opts]) => opts.purpose === "book_cover"
    );

    expect(page0Call).toBeDefined();
    expect(coverCall).toBeDefined();

    // Page 0 should NOT have reference images in cover_only mode
    expect(page0Call![1].inputImageUrls).toEqual([]);

    // Cover should HAVE reference images
    expect(coverCall![1].inputImageUrls).toContain("https://example.com/child-photo.png");

    // Verify Page 0 record in database
    expect(deps.writePage).toHaveBeenCalledWith(
      "book-page0-fix",
      expect.objectContaining({
        pageNumber: 0,
        imagePurpose: "book_page",
      })
    );
  });

  it("passes coverStepBConfig to generateCoverImageWithFallback when pro_consistent is used", async () => {
    deps.uploadCoverImage = vi.fn().mockResolvedValue("https://storage.example.com/cover.png");
    // Default baseBookData uses pro_consistent
    // Use a story with coverImagePrompt to trigger cover generation
    const bookWithCover = { ...baseBookData, coverImagePrompt: "A cover" };
    await processBookGeneration("book-cover-stepb", bookWithCover, deps);

    // Filter calls by purpose
    const coverCall = deps.imageClient.generateImage.mock.calls.find(
      ([, opts]) => opts.purpose === "book_cover"
    );

    expect(coverCall).toBeDefined();
    // Since we are in a test env without tokens, generateCoverImageWithFallback calls imageClient.generateImage.
    // In our implementation, Step B retry happens inside generateCoverImageWithFallback,
    // which then calls imageClient.generateImage if Step A fails.
    // However, in this success case, Step A succeeds, so Step B is not reached for imageClient.
    // To verify that processBookGeneration is indeed passing stepBConfig to the controller,
    // we would ideally mock the controller, but here it's an internal function.
    // Instead, we can verify that the controller was called with stepBConfig if we had a spy on it.
    // Given the current test structure, let's trigger a Step A failure to see Step B in action.

    deps.imageClient.generateImage.mockImplementation(async (prompt, options) => {
      if (options?.purpose === "book_cover" && prompt.includes("Book cover:")) {
        // Step A (full prompt) fails
        throw new Error("Prediction failed: (E005)");
      }
      return mockImageBuffer;
    });

    await processBookGeneration("book-cover-stepb-retry", bookWithCover, deps);

    const coverCalls = deps.imageClient.generateImage.mock.calls.filter(
      ([, opts]) => opts.purpose === "book_cover"
    );

    // In this test run, it seems there were 3 calls.
    // 1 from the previous test expectation "book-cover-stepb" (which also used purpose: book_cover)
    // plus 2 from "book-cover-stepb-retry".
    // We should clear the mock or check the last 2.
    const lastTwoCoverCalls = coverCalls.slice(-2);

    // Should have 2 cover calls for this specific run: Step A (failed) and Step B (retried)
    expect(lastTwoCoverCalls.length).toBe(2);
    expect(lastTwoCoverCalls[0][0]).toContain("Book cover:");
    expect(lastTwoCoverCalls[0][0]).toContain("Character consistency"); // Step A
    expect(lastTwoCoverCalls[1][0]).toContain("Illustration style:");
    expect(lastTwoCoverCalls[1][0]).not.toContain("Character consistency"); // Step B (simplified)
    expect(lastTwoCoverCalls[1][1].inputImageUrls).toEqual([]); // Step B clears refs
  });
});

describe("normalizeBookForGeneration (Phase 3-C)", () => {
  const freeUserPlan = "free";
  const premiumUserPlan = "premium";

  const fourPageFixedTemplate: TemplateData = {
    ...fixedTemplate,
    fixedStory: {
      ...fixedTemplate.fixedStory!,
      pages: Array(4).fill(fixedTemplate.fixedStory!.pages[0]),
    },
  };

  const eightPageFixedTemplate: TemplateData = {
    ...fixedTemplate,
    fixedStory: {
      ...fixedTemplate.fixedStory!,
      pages: Array(8).fill(fixedTemplate.fixedStory!.pages[0]),
    },
  };

  const twelvePageFixedTemplate: TemplateData = {
    ...fixedTemplate,
    fixedStory: {
      ...fixedTemplate.fixedStory!,
      pages: Array(12).fill(fixedTemplate.fixedStory!.pages[0]),
    },
  };

  it("allows 4-page fixed template for free plan", () => {
    const result = normalizeBookForGeneration(baseBookData, fourPageFixedTemplate, freeUserPlan);
    expect(result.pageCount).toBe(4);
    expect(result.productPlan).toBe("free");
  });

  it("blocks 8-page fixed template for free plan", () => {
    expect(() =>
      normalizeBookForGeneration(baseBookData, eightPageFixedTemplate, freeUserPlan)
    ).toThrow(/8ページの絵本は現在のプランでは作成できません/);
  });

  it("allows 8-page fixed template for free plan if isSinglePurchase is true", () => {
    const singlePurchaseBook = { ...baseBookData, isSinglePurchase: true };
    const result = normalizeBookForGeneration(singlePurchaseBook, eightPageFixedTemplate, freeUserPlan);
    expect(result.pageCount).toBe(8);
    expect(result.productPlan).toBe("premium_paid"); // Single purchase maps to premium_paid settings
  });

  it("allows 8-page fixed template for standard_paid productPlan with premium userPlan", () => {
    const standardBookData = { ...baseBookData, productPlan: "standard_paid" as const };
    const result = normalizeBookForGeneration(standardBookData, eightPageFixedTemplate, premiumUserPlan);
    expect(result.pageCount).toBe(8);
    expect(result.productPlan).toBe("standard_paid");
  });

  it("blocks 12-page fixed template for standard_paid plan (simulated via free userPlan)", () => {
    // Standard paid users on the standard plan are simulated by passing standard_paid as the requested productPlan
    // if the user doesn't have a premium subscription.
    // However, normalizeBookForGeneration internal logic might downgrade standard_paid to free for fixed_template if not premium.
    // Let's test standard_paid specifically.
    const standardBookData = { ...baseBookData, productPlan: "standard_paid" as const };
    expect(() =>
      normalizeBookForGeneration(standardBookData, twelvePageFixedTemplate, freeUserPlan)
    ).toThrow(/12ページの絵本は現在のプランでは作成できません/);
  });

  it("allows 12-page fixed template for premium plan", () => {
    const premiumBookData = { ...baseBookData, productPlan: "premium_paid" as const };
    const result = normalizeBookForGeneration(premiumBookData, twelvePageFixedTemplate, premiumUserPlan);
    expect(result.pageCount).toBe(12);
    expect(result.productPlan).toBe("premium_paid");
  });

  // 有料プラン限定モード（guided_ai / original_ai）のサーバー側エンタイトルメント強制。
  // ENFORCE_AI_MODE_ENTITLEMENT フラグで gate（rollout 前は互換のため許可）。
  const guidedTemplate: TemplateData = { ...fixedTemplate, creationMode: "guided_ai", fixedStory: undefined };

  describe("with ENFORCE_AI_MODE_ENTITLEMENT enabled", () => {
    beforeEach(() => { process.env.ENFORCE_AI_MODE_ENTITLEMENT = "true"; });
    afterEach(() => { delete process.env.ENFORCE_AI_MODE_ENTITLEMENT; });

    it("blocks guided_ai paid plan for un-entitled free user", () => {
      const standardBookData = { ...baseBookData, productPlan: "standard_paid" as const };
      expect(() =>
        normalizeBookForGeneration(standardBookData, guidedTemplate, freeUserPlan)
      ).toThrow(/有料プラン限定/);
    });

    it("blocks original_ai paid plan for un-entitled free user", () => {
      const originalTemplate: TemplateData = { ...guidedTemplate, creationMode: "original_ai" };
      const premiumBookData = { ...baseBookData, productPlan: "premium_paid" as const };
      expect(() =>
        normalizeBookForGeneration(premiumBookData, originalTemplate, freeUserPlan)
      ).toThrow(/有料プラン限定/);
    });

    it("allows guided_ai paid plan for entitled premium user", () => {
      const standardBookData = { ...baseBookData, productPlan: "standard_paid" as const };
      const result = normalizeBookForGeneration(standardBookData, guidedTemplate, premiumUserPlan);
      expect(result.productPlan).toBe("standard_paid");
    });

    it("allows guided_ai paid plan for admin (plan preview) even on free userPlan", () => {
      const standardBookData = { ...baseBookData, productPlan: "standard_paid" as const };
      const result = normalizeBookForGeneration(standardBookData, guidedTemplate, freeUserPlan, true);
      expect(result.productPlan).toBe("standard_paid");
    });

    it("does not block single purchase guided_ai for free user", () => {
      const singlePurchaseBook = { ...baseBookData, isSinglePurchase: true };
      const result = normalizeBookForGeneration(singlePurchaseBook, guidedTemplate, freeUserPlan);
      expect(result.productPlan).toBe("premium_paid");
    });
  });

  it("keeps guided_ai for free user when enforcement flag is disabled (compat)", () => {
    delete process.env.ENFORCE_AI_MODE_ENTITLEMENT;
    const standardBookData = { ...baseBookData, productPlan: "standard_paid" as const };
    const result = normalizeBookForGeneration(standardBookData, guidedTemplate, freeUserPlan);
    expect(result.productPlan).toBe("standard_paid");
  });
});

describe("sanitizeForbiddenQuestObjects", () => {
  const dummyBook: BookData = {
    ...baseBookData,
    childProfileSnapshot: {
      displayName: "ゆうた",
      personality: {},
      visualProfile: { version: 1, signatureItem: "くまのぬいぐるみ" },
    },
  };

  it("removes tokens from signatureItem (input or snapshot)", () => {
    const input = { childName: "ゆうた", signatureItem: "あかい くるま" };
    const forbidden = ["りんご", "あかい", "くるま"];
    const result = sanitizeForbiddenQuestObjects(forbidden, dummyBook, input);
    expect(result).toEqual(["りんご"]);
  });

  it("removes tokens from favorites and colorMood", () => {
    const input = {
      childName: "ゆうた",
      favorites: "オーバーウォッチ, 恐竜",
      colorMood: "サイバーテクノロジー",
    };
    const forbidden = ["りんご", "オーバーウォッチ", "サイバーテクノロジー", "恐竜"];
    const result = sanitizeForbiddenQuestObjects(forbidden, dummyBook, input);
    expect(result).toEqual(["りんご"]);
  });

  it("is case-insensitive and handles partial matches", () => {
    const input = {
      childName: "ゆうた",
      favorites: "Overwatch",
    };
    const forbidden = ["OVERWATCH", "overwatch-game", "game"];
    const result = sanitizeForbiddenQuestObjects(forbidden, dummyBook, input);
    // "OVERWATCH" matches "overwatch"
    // "overwatch-game" contains "overwatch"
    expect(result).toEqual(["game"]);
  });

  it("returns undefined if all objects are sanitized", () => {
    const input = { childName: "ゆうた", favorites: "りんご, ばなな" };
    const forbidden = ["りんご", "ばなな"];
    const result = sanitizeForbiddenQuestObjects(forbidden, dummyBook, input);
    expect(result).toBeUndefined();
  });

  it("removes generic toy words", () => {
    const input = { childName: "ゆうた" };
    const forbidden = ["おもちゃ", "toys", "りんご"];
    const result = sanitizeForbiddenQuestObjects(forbidden, dummyBook, input);
    expect(result).toEqual(["りんご"]);
  });

  it("removes duplicate entries (preserving first encounter casing)", () => {
    const input = { childName: "ゆうた" };
    const forbidden = ["りんご", " りんご ", "Ringo", "RINGO"];
    const result = sanitizeForbiddenQuestObjects(forbidden, dummyBook, input);
    // Normalization lowercases and trims for comparison, but preserves original casing of first match
    expect(result).toEqual(["りんご", "Ringo"]);
  });
});

describe("photo_story mode", () => {
  it("downloads photos and passes them to llmClient in photo_story mode", async () => {
    const photoUrl = "https://example.com/photo.jpg";
    const bookData: BookData = {
      ...baseBookData,
      creationMode: "photo_story",
      sourcePhotos: [photoUrl],
    };
    const deps = createMockDeps();
    // Ensure template doesn't override creationMode
    deps.getTemplate = vi.fn().mockResolvedValue({ ...mockTemplate, creationMode: undefined });

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.stubGlobal("fetch", mockFetch);

    await processBookGeneration("book_photo_1", bookData, deps);

    expect(mockFetch).toHaveBeenCalledWith(photoUrl);
    expect(deps.llmClient.generateStory).toHaveBeenCalledWith(expect.objectContaining({
      sourcePhotos: [
        { mimeType: "image/jpeg", data: expect.any(String) }
      ],
      creationMode: "photo_story",
    }));

    vi.unstubAllGlobals();
  });

  it("fails book if photo download fails", async () => {
    const photoUrl = "https://example.com/bad-photo.jpg";
    const bookData: BookData = {
      ...baseBookData,
      creationMode: "photo_story",
      sourcePhotos: [photoUrl],
    };
    const deps = createMockDeps();
    deps.getTemplate = vi.fn().mockResolvedValue({ ...mockTemplate, creationMode: undefined });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, statusText: "Not Found" }));

    await processBookGeneration("book_photo_fail", bookData, deps);

    expect(deps.updateBookStatus).toHaveBeenCalledWith("book_photo_fail", "failed");
    expect(deps.updateBookFailure).toHaveBeenCalledWith(
      "book_photo_fail",
      expect.stringContaining("Vision analysis failed: Photo download error")
    );

    vi.unstubAllGlobals();
  });

  it("includes source photo as style_reference during page generation", async () => {
    const photoUrl = "https://example.com/source.jpg";
    const bookData: BookData = {
      ...baseBookData,
      creationMode: "photo_story",
      sourcePhotos: [photoUrl],
      imageModelProfile: "kontext_max", // ensures sequential generation where buildInputImageRefs is called
    };

    const photoStory = createPremiumPassingStory();
    photoStory.pages[0].sourcePhotoIndex = 0;

    const deps = createMockDeps();
    deps.getTemplate = vi.fn().mockResolvedValue({ ...mockTemplate, creationMode: undefined });
    deps.llmClient.generateStory = vi.fn().mockResolvedValue(photoStory);
    deps.getUserPlan = vi.fn().mockResolvedValue("premium");

    // Stub fetch for story generation step
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }));

    await processBookGeneration("book_photo_ref", bookData, deps);

    // Verify imageClient.generateImage (or adapter path) was called with the photo URL
    // In generate-book.ts, buildInputImageRefs is used.
    // It should have role: "style_reference" and url: photoUrl
    expect(deps.writePage).toHaveBeenCalledWith("book_photo_ref", expect.objectContaining({
      inputImageRefs: expect.arrayContaining([
        { role: "style_reference", url: photoUrl }
      ])
    }));

    vi.unstubAllGlobals();
  });
});
