import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedStory } from "../src/lib/types";

describe("GeminiClient", () => {
  let handlers: Record<string, ReturnType<typeof vi.fn>>;
  let GeminiClient: any;
  let normalizePageVisualRole: any;
  let defaultPageVisualRole: any;
  let GeminiServiceUnavailableError: any;

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
    GeminiServiceUnavailableError = mod.GeminiServiceUnavailableError;
  });

  afterEach(() => {
    vi.doUnmock("@google/generative-ai");
    delete process.env.GEMINI_STORY_MODEL_PRIMARY;
    delete process.env.GEMINI_STORY_MODEL_FALLBACKS;
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
    });
    expect(result.title).toBe("テスト");
  });

  it("accepts optional narrativeDevice and allowed pageVisualRole values", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
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
        },
      ],
    } satisfies GeneratedStory;
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
    });

    expect(result.narrativeDevice?.visualMotif).toBe("yellow star");
    expect(result.pages[0].pageVisualRole).toBe("opening_establishing");
    expect(result.pages[0].compositionHint).toBe("wide establishing shot");
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
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("[503 Service Unavailable] This model is currently experiencing high demand.")
      )
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
    });

    expect(handlers["gemini-2.5-flash-lite"]).toHaveBeenCalledTimes(2);
    expect(result.storyModel).toBe("gemini-2.5-flash-lite");
    expect(result.storyGenerationAttempts).toBe(2);
  });

  it("falls back to the next model when the primary keeps returning retryable errors", async () => {
    const story = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      pages: [{ text: "たのしいね。もうすこし。", imagePrompt: "storybook scene" }],
    };
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockRejectedValue(
        new Error("[503 Service Unavailable] This model is currently experiencing high demand.")
      );
    handlers["gemini-2.5-flash"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
    });

    expect(handlers["gemini-2.5-flash-lite"]).toHaveBeenCalledTimes(4);
    expect(handlers["gemini-2.5-flash"]).toHaveBeenCalledTimes(1);
    expect(result.storyModel).toBe("gemini-2.5-flash");
    expect(result.storyModelFallbackUsed).toBe(true);
  });

  it("throws GeminiServiceUnavailableError after all fallback models fail with retryable errors", async () => {
    process.env.GEMINI_STORY_MODEL_FALLBACKS = "gemini-2.5-flash";
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockRejectedValue(new Error("[429 Too Many Requests] rate limit"));
    handlers["gemini-2.5-flash"] = vi
      .fn()
      .mockRejectedValue(new Error("[503 Service Unavailable] high demand"));

    const client = new GeminiClient("fake-api-key");

    await expect(
      client.generateStory({
        systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
      })
    ).rejects.toBeInstanceOf(GeminiServiceUnavailableError);
  });

  it("throws on invalid JSON response", async () => {
    handlers["gemini-2.5-flash-lite"] = vi
      .fn()
      .mockResolvedValue({ response: { text: () => "This is not JSON" } });
    const client = new GeminiClient("fake-api-key");
    await expect(client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "crayon",
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
    })).rejects.toThrow();
  });
});
