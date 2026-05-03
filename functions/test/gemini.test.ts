import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedStory } from "../src/lib/types";

describe("GeminiClient", () => {
  let handlers: Record<string, ReturnType<typeof vi.fn>>;
  let GeminiClient: any;
  let normalizePageVisualRole: any;
  let defaultPageVisualRole: any;
  let normalizeFocusCharacterId: any;
  let GeminiServiceUnavailableError: any;
  let resolveStoryModelCandidates: any;

  beforeEach(async () => {
    vi.resetModules();
    handlers = {};

    vi.doMock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockImplementation(({ model }: { model: string }) => {
          handlers[model] ??= vi.fn();
          return {
            generateContent: handlers[model],
          };
        }),
      })),
      HarmCategory: {
        HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
        HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
        HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
      },
      HarmBlockThreshold: { BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE" },
    }));

    const mod = await import("../src/lib/gemini");
    GeminiClient = mod.GeminiClient;
    normalizePageVisualRole = mod.normalizePageVisualRole;
    defaultPageVisualRole = mod.defaultPageVisualRole;
    normalizeFocusCharacterId = mod.normalizeFocusCharacterId;
    GeminiServiceUnavailableError = mod.GeminiServiceUnavailableError;
    resolveStoryModelCandidates = mod.resolveStoryModelCandidates;
  });

  afterEach(() => {
    vi.doUnmock("@google/generative-ai");
    delete process.env.GEMINI_STORY_MODEL_PRIMARY;
    delete process.env.GEMINI_STORY_MODEL_FALLBACKS;
  });

  it("uses flash/pro strategy for premium/original stories", () => {
    expect(resolveStoryModelCandidates({ productPlan: "premium_paid" })).toEqual([
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ]);
    expect(resolveStoryModelCandidates({ creationMode: "original_ai" })).toEqual([
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ]);
    expect(resolveStoryModelCandidates({ productPlan: "standard_paid" })).toEqual([
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ]);
  });

  it("parses valid JSON response into GeneratedStory", async () => {
    const story: GeneratedStory = {
      title: "ゆうたくんのたんじょうび",
      characterBible: "A consistent boy with short black hair",
      styleBible: "Soft watercolor style",
      pages: [
        { text: "きょうはゆうたくんのたんじょうびです。", imagePrompt: "A boy celebrating birthday" },
        { text: "おともだちがあつまりました。", imagePrompt: "Friends gathering at a party" },
      ],
    };
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト用システムプロンプト", childName: "ゆうた", pageCount: 4, style: "watercolor",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    });
    expect(result.title).toBe("ゆうたくんのたんじょうび");
    expect(result.pages).toHaveLength(2);
    expect(result.storyModel).toBe("gemini-2.5-flash-lite");
  });

  it("handles JSON wrapped in markdown code block", async () => {
    const story: GeneratedStory = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      pages: [{ text: "テスト本文", imagePrompt: "test" }],
    };
    handlers["gemini-2.5-flash-lite"] = vi.fn().mockResolvedValue({
      response: { text: () => "```json\n" + JSON.stringify(story) + "\n```" },
    });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    });
    expect(result.title).toBe("テスト");
  });

  it("accepts cast and page character linkage fields", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      storyGoal: "ゆうたが ほしのこと いっしょに 星のかけらを さがす",
      mainQuestObject: "星のかけら",
      forbiddenQuestObjects: ["すいか", "食べもの"],
      cast: [
        {
          characterId: "magic_friend_01",
          displayName: "ひかりのともだち",
          role: "magical_friend",
          visualBible: "small glowing golden spirit child with a tiny purple top hat",
          signatureItems: ["tiny purple top hat"],
          doNotChange: ["Do not remove the hat"],
        },
      ],
      narrativeDevice: {
        repeatedPhrase: "だいじょうぶ、いっしょにいるよ",
        visualMotif: "yellow star",
      },
      pages: [
        {
          text: "テスト本文です。もうすこし つづきます。",
          imagePrompt: "A wide storybook scene with a child and family in a park",
          pageVisualRole: "opening_establishing",
          compositionHint: "wide establishing shot",
          visualMotifUsage: "yellow star on a backpack",
          hiddenDetail: "small bird in a tree",
          appearingCharacterIds: ["child_protagonist", "magic_friend_01"],
          focusCharacterId: "magic_friend_01",
        },
      ],
    } satisfies GeneratedStory;
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    });

    expect(result.cast?.[0].characterId).toBe("magic_friend_01");
    expect(result.storyGoal).toContain("星のかけら");
    expect(result.mainQuestObject).toBe("星のかけら");
    expect(result.forbiddenQuestObjects).toEqual(["すいか", "食べもの"]);
    expect(result.pages[0].appearingCharacterIds).toEqual(["child_protagonist", "magic_friend_01"]);
    expect(result.pages[0].focusCharacterId).toBe("magic_friend_01");
  });

  it("normalizes focusCharacterId and appearingCharacterIds without throwing", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      cast: [
        {
          characterId: "star_child_01",
          displayName: "ほしのこ",
          role: "magical_friend",
          visualBible: "small glowing star friend",
        },
      ],
      pages: [
        {
          text: "テスト本文です。もうすこし つづきます。",
          imagePrompt: "storybook scene",
          appearingCharacterIds: "star_child_01",
          focusCharacterId: null,
        },
        {
          text: "テスト本文です。もうすこし つづきます。",
          imagePrompt: "storybook scene",
          appearingCharacterIds: ["child_protagonist", 123, "star_child_01", {}],
          focusCharacterId: ["unknown_id", "star_child_01"],
        },
        {
          text: "テスト本文です。もうすこし つづきます。",
          imagePrompt: "storybook scene",
          appearingCharacterIds: ["child_protagonist", "star_child_01"],
          focusCharacterId: { characterId: "star_child_01" },
        },
        {
          text: "テスト本文です。もうすこし つづきます。",
          imagePrompt: "storybook scene",
          appearingCharacterIds: ["child_protagonist", "star_child_01"],
          focusCharacterId: "unknown_id",
        },
        {
          text: "テスト本文です。もうすこし つづきます。",
          imagePrompt: "storybook scene",
          focusCharacterId: { foo: "bar" },
        },
      ],
    };
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    });

    expect(result.pages[0].appearingCharacterIds).toEqual(["star_child_01"]);
    expect(result.pages[0].focusCharacterId).toBe("star_child_01");
    expect(result.pages[1].appearingCharacterIds).toEqual(["child_protagonist", "star_child_01"]);
    expect(result.pages[1].focusCharacterId).toBe("star_child_01");
    expect(result.pages[2].focusCharacterId).toBe("star_child_01");
    expect(result.pages[3].focusCharacterId).toBe("child_protagonist");
    expect(result.pages[4].focusCharacterId).toBeUndefined();
  });

  it("normalizes focusCharacterId helper fallbacks", () => {
    const castIds = new Set(["star_child_01"]);

    expect(
      normalizeFocusCharacterId({
        value: "star_child_01",
        appearingCharacterIds: ["child_protagonist"],
        castIds,
        pageIndex: 0,
      })
    ).toBe("star_child_01");

    expect(
      normalizeFocusCharacterId({
        value: null,
        appearingCharacterIds: ["child_protagonist"],
        castIds,
        pageIndex: 0,
      })
    ).toBe("child_protagonist");

    expect(
      normalizeFocusCharacterId({
        value: ["bad_id", "star_child_01"],
        appearingCharacterIds: ["child_protagonist"],
        castIds,
        pageIndex: 0,
      })
    ).toBe("star_child_01");

    expect(
      normalizeFocusCharacterId({
        value: { characterId: "star_child_01" },
        appearingCharacterIds: ["child_protagonist"],
        castIds,
        pageIndex: 0,
      })
    ).toBe("star_child_01");

    expect(
      normalizeFocusCharacterId({
        value: { foo: "bar" },
        appearingCharacterIds: undefined,
        castIds,
        pageIndex: 0,
      })
    ).toBeUndefined();
  });

  it("normalizes unknown cast roles to buddy", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      cast: [
        {
          characterId: "friend_01",
          displayName: "ふしぎなともだち",
          role: "mystery_role",
          visualBible: "soft glowing companion",
        },
      ],
      pages: [{ text: "テスト本文。もうすこし。", imagePrompt: "storybook scene" }],
    };
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    });

    expect(result.cast?.[0].role).toBe("buddy");
  });

  it("normalizes pageVisualRole aliases and missing values without throwing", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      pages: [
        { text: "はじまり。つづきます。", imagePrompt: "wide scene", pageVisualRole: "wide_shot" },
        { text: "みつけた。うれしい。", imagePrompt: "close view", pageVisualRole: "close_up" },
        { text: "しずかな おわり。よかったね。", imagePrompt: "detail scene", pageVisualRole: "detail_shot" },
        { text: "おしまいです。", imagePrompt: "ending scene" },
      ],
    };
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    });

    expect(result.pages[0].pageVisualRole).toBe("opening_establishing");
    expect(result.pages[1].pageVisualRole).toBe("emotional_closeup");
    expect(result.pages[2].pageVisualRole).toBe("object_detail");
    expect(result.pages[3].pageVisualRole).toBe("quiet_ending");
  });

  it("falls back to default pageVisualRole for unknown values", () => {
    expect(normalizePageVisualRole("mystery_role", 0, 4)).toBe("opening_establishing");
    expect(normalizePageVisualRole("mystery_role", 1, 4)).toBe("discovery");
    expect(normalizePageVisualRole("mystery_role", 2, 4)).toBe("payoff");
    expect(normalizePageVisualRole(undefined, 3, 4)).toBe("quiet_ending");
    expect(defaultPageVisualRole(4, 8)).toBe("action");
  });

  it("retries retryable 503 errors and succeeds on the same model", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      pages: [{ text: "たのしいね。もうすこし。", imagePrompt: "storybook scene" }],
    };
    handlers["gemini-2.5-flash"] = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("[503 Service Unavailable] This model is currently experiencing high demand.")
      )
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash"],
    });

    expect(handlers["gemini-2.5-flash"]).toHaveBeenCalledTimes(2);
    expect(result.storyModel).toBe("gemini-2.5-flash");
    expect(result.storyGenerationAttempts).toBe(2);
  });

  it("falls back to the next model when the primary keeps returning retryable errors", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      pages: [{ text: "たのしいね。もうすこし。", imagePrompt: "storybook scene" }],
    };
    handlers["gemini-2.5-flash"] = vi
      .fn()
      .mockRejectedValue(
        new Error("[503 Service Unavailable] This model is currently experiencing high demand.")
      );
    handlers["gemini-2.5-pro"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      storyModelCandidates: ["gemini-2.5-flash", "gemini-2.5-pro"],
    });

    expect(handlers["gemini-2.5-flash"]).toHaveBeenCalledTimes(4);
    expect(handlers["gemini-2.5-pro"]).toHaveBeenCalledTimes(1);
    expect(result.storyModel).toBe("gemini-2.5-pro");
    expect(result.storyModelFallbackUsed).toBe(true);
  });

  it("throws GeminiServiceUnavailableError after all fallback models fail with retryable errors", async () => {
    handlers["gemini-2.5-flash"] = vi
      .fn()
      .mockRejectedValue(new Error("[429 Too Many Requests] rate limit"));
    handlers["gemini-2.5-pro"] = vi
      .fn()
      .mockRejectedValue(new Error("[503 Service Unavailable] high demand"));

    const client = new GeminiClient("fake-api-key");

    await expect(
      client.generateStory({
        systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
        storyModelCandidates: ["gemini-2.5-flash", "gemini-2.5-pro"],
      })
    ).rejects.toBeInstanceOf(GeminiServiceUnavailableError);
  });

  it("rewriteStoryText rewrites only text payload and preserves page count", async () => {
    handlers["gemini-2.5-pro"] = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            pages: [
              { text: "すなばの すみに、あかい スコップが ちょこんと ありました。ゆうたは それを みつけて、めを まるく しました。" },
            ],
          }),
      },
    });

    const client = new GeminiClient("fake-api-key");
    const rewritten = await client.rewriteStoryText?.({
      systemPrompt: "テスト",
      childName: "ゆうた",
      childAge: 4,
      style: "watercolor",
      productPlan: "premium_paid",
      creationMode: "original_ai",
      storyModelCandidates: ["gemini-2.5-pro"],
      story: {
        title: "テスト",
        characterBible: "same child",
        styleBible: "same style",
        pages: [
          {
            text: "ころころ こりころ。",
            imagePrompt: "wide shot of a sandbox",
            pageVisualRole: "opening_establishing",
          },
        ],
      },
    });

    expect(rewritten?.pages).toHaveLength(1);
    expect(rewritten?.pages[0].text).toContain("あかい スコップ");
    expect(rewritten?.storyTextRewriteModel).toBe("gemini-2.5-pro");
  });

  it("throws on invalid JSON response", async () => {
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => "This is not JSON" } });
    const client = new GeminiClient("fake-api-key");
    await expect(client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "crayon",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    })).rejects.toThrow();
  });

  it("throws on missing pages in response", async () => {
    handlers["gemini-2.5-flash-lite"] = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          title: "タイトルだけ",
          characterBible: "A consistent child",
          styleBible: "Flat picture book style",
        }),
      },
    });
    const client = new GeminiClient("fake-api-key");
    await expect(client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "watercolor",
      storyModelCandidates: ["gemini-2.5-flash-lite"],
    })).rejects.toThrow();
  });
});
