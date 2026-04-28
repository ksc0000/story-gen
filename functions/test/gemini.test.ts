import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GeneratedStory } from "../src/lib/types";

describe("GeminiClient", () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;
  let GeminiClient: any;

  beforeEach(async () => {
    vi.resetModules();

    mockGenerateContent = vi.fn();

    vi.doMock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
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
  });

  afterEach(() => {
    vi.doUnmock("@google/generative-ai");
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
    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(story) } });

    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト用システムプロンプト", childName: "ゆうた", pageCount: 4, style: "watercolor",
    });
    expect(result.title).toBe("ゆうたくんのたんじょうび");
    expect(result.pages).toHaveLength(2);
  });

  it("handles JSON wrapped in markdown code block", async () => {
    const story: GeneratedStory = {
      title: "テスト",
      characterBible: "A consistent child",
      styleBible: "Flat picture book style",
      pages: [{ text: "テスト本文", imagePrompt: "test" }],
    };
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "```json\n" + JSON.stringify(story) + "\n```" },
    });
    const client = new GeminiClient("fake-api-key");
    const result = await client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "flat",
    });
    expect(result.title).toBe("テスト");
  });

  it("throws on invalid JSON response", async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => "This is not JSON" } });
    const client = new GeminiClient("fake-api-key");
    await expect(client.generateStory({
      systemPrompt: "テスト", childName: "ゆうた", pageCount: 4, style: "crayon",
    })).rejects.toThrow();
  });

  it("throws on missing pages in response", async () => {
    mockGenerateContent.mockResolvedValue({
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
