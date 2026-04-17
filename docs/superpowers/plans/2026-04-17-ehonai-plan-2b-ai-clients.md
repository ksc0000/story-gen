# EhoNAI Web MVP - Plan 2b: AI Clients (Gemini + Replicate)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement LLM-agnostic Gemini client for story generation and Replicate client for FLUX Schnell image generation.

**Architecture:** Both clients implement interfaces defined in `functions/src/lib/types.ts` (`LLMClient` and `ImageClient`). External API calls are mocked in tests.

**Tech Stack:** @google/generative-ai, replicate, Vitest

**Depends on:** Plan 1 (types), Plan 2a (prompt builder)

---

## File Structure

```
functions/src/lib/
├── gemini.ts          # GeminiClient implements LLMClient
└── replicate.ts       # ReplicateImageClient implements ImageClient
functions/test/
├── gemini.test.ts
└── replicate.test.ts
```

---

### Task 1: Gemini API Client

**Files:**
- Create: `functions/test/gemini.test.ts`
- Create: `functions/src/lib/gemini.ts`

- [ ] **Step 1: Write the failing tests**

Create `functions/test/gemini.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiClient } from "../src/lib/gemini";
import type { GeneratedStory } from "../src/lib/types";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn();
  return {
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
    HarmBlockThreshold: {
      BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE",
    },
    __mockGenerateContent: mockGenerateContent,
  };
});

function getMockGenerateContent() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@google/generative-ai") as { __mockGenerateContent: ReturnType<typeof vi.fn> };
  return mod.__mockGenerateContent;
}

describe("GeminiClient", () => {
  let client: GeminiClient;
  let mockGenerateContent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GeminiClient("fake-api-key");
    mockGenerateContent = getMockGenerateContent();
  });

  it("parses valid JSON response into GeneratedStory", async () => {
    const story: GeneratedStory = {
      title: "ゆうたくんのたんじょうび",
      pages: [
        { text: "きょうはゆうたくんのたんじょうびです。", imagePrompt: "A boy celebrating birthday" },
        { text: "おともだちがあつまりました。", imagePrompt: "Friends gathering at a party" },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(story),
      },
    });

    const result = await client.generateStory({
      systemPrompt: "テスト用システムプロンプト",
      childName: "ゆうた",
      pageCount: 4,
      style: "watercolor",
    });

    expect(result.title).toBe("ゆうたくんのたんじょうび");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].text).toContain("ゆうたくん");
  });

  it("handles JSON wrapped in markdown code block", async () => {
    const story: GeneratedStory = {
      title: "テスト",
      pages: [{ text: "テスト本文", imagePrompt: "test" }],
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "```json\n" + JSON.stringify(story) + "\n```",
      },
    });

    const result = await client.generateStory({
      systemPrompt: "テスト",
      childName: "ゆうた",
      pageCount: 4,
      style: "flat",
    });

    expect(result.title).toBe("テスト");
  });

  it("throws on invalid JSON response", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "This is not JSON at all",
      },
    });

    await expect(
      client.generateStory({
        systemPrompt: "テスト",
        childName: "ゆうた",
        pageCount: 4,
        style: "crayon",
      })
    ).rejects.toThrow();
  });

  it("throws on missing pages in response", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ title: "タイトルだけ" }),
      },
    });

    await expect(
      client.generateStory({
        systemPrompt: "テスト",
        childName: "ゆうた",
        pageCount: 4,
        style: "watercolor",
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd functions && npx vitest run test/gemini.test.ts
```

Expected: FAIL — `Cannot find module '../src/lib/gemini'`

- [ ] **Step 3: Implement Gemini client**

Create `functions/src/lib/gemini.ts`:

```typescript
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type {
  LLMClient,
  GeneratedStory,
  PageCount,
  IllustrationStyle,
} from "./types";

const MODEL_NAME = "gemini-2.0-flash";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  return text.trim();
}

function validateStory(data: unknown): GeneratedStory {
  if (typeof data !== "object" || data === null) {
    throw new Error("LLM response is not an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.title !== "string") {
    throw new Error("LLM response missing 'title' string");
  }

  if (!Array.isArray(obj.pages) || obj.pages.length === 0) {
    throw new Error("LLM response missing 'pages' array");
  }

  for (const page of obj.pages) {
    if (typeof page.text !== "string" || typeof page.imagePrompt !== "string") {
      throw new Error("Each page must have 'text' and 'imagePrompt' strings");
    }
  }

  return { title: obj.title, pages: obj.pages };
}

export class GeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateStory(params: {
    systemPrompt: string;
    childName: string;
    childAge?: number;
    favorites?: string;
    lessonToTeach?: string;
    memoryToRecreate?: string;
    pageCount: PageCount;
    style: IllustrationStyle;
  }): Promise<GeneratedStory> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings: SAFETY_SETTINGS,
    });

    const userParts: string[] = [`主人公の名前: ${params.childName}`];
    if (params.childAge !== undefined) userParts.push(`年齢: ${params.childAge}歳`);
    if (params.favorites) userParts.push(`好きなもの: ${params.favorites}`);
    if (params.lessonToTeach) userParts.push(`教えたいこと: ${params.lessonToTeach}`);
    if (params.memoryToRecreate) userParts.push(`再現したい思い出: ${params.memoryToRecreate}`);
    userParts.push(`ページ数: ${params.pageCount}ページ`);

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: userParts.join("\n") }] },
      ],
      systemInstruction: { role: "model", parts: [{ text: params.systemPrompt }] },
    });

    const rawText = result.response.text();
    const jsonStr = extractJSON(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse LLM JSON response: ${rawText.slice(0, 200)}`);
    }

    return validateStory(parsed);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd functions && npx vitest run test/gemini.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/gemini.ts functions/test/gemini.test.ts
git commit -m "feat: add Gemini API client with LLM-agnostic interface"
```

---

### Task 2: Replicate API Client (FLUX Schnell)

**Files:**
- Create: `functions/test/replicate.test.ts`
- Create: `functions/src/lib/replicate.ts`

- [ ] **Step 1: Write the failing tests**

Create `functions/test/replicate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReplicateImageClient } from "../src/lib/replicate";

vi.mock("replicate", () => {
  const mockRun = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      run: mockRun,
    })),
    __mockRun: mockRun,
  };
});

function getMockRun() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("replicate") as { __mockRun: ReturnType<typeof vi.fn> };
  return mod.__mockRun;
}

// Mock global fetch for image download
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ReplicateImageClient", () => {
  let client: ReplicateImageClient;
  let mockRun: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ReplicateImageClient("fake-token");
    mockRun = getMockRun();
  });

  it("calls FLUX Schnell model with the given prompt", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRun.mockResolvedValue(["https://replicate.delivery/fake-image.png"]);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeImageData.buffer),
    });

    const result = await client.generateImage("A child at a birthday party");

    expect(mockRun).toHaveBeenCalledWith(
      "black-forest-labs/flux-schnell",
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: "A child at a birthday party",
        }),
      })
    );
    expect(result).toBeInstanceOf(Buffer);
  });

  it("throws when Replicate returns no output", async () => {
    mockRun.mockResolvedValue([]);

    await expect(client.generateImage("test prompt")).rejects.toThrow(
      "No image output from Replicate"
    );
  });

  it("throws when image download fails", async () => {
    mockRun.mockResolvedValue(["https://replicate.delivery/fake-image.png"]);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(client.generateImage("test prompt")).rejects.toThrow(
      "Failed to download image"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd functions && npx vitest run test/replicate.test.ts
```

Expected: FAIL — `Cannot find module '../src/lib/replicate'`

- [ ] **Step 3: Implement Replicate client**

Create `functions/src/lib/replicate.ts`:

```typescript
import Replicate from "replicate";
import type { ImageClient } from "./types";

const FLUX_SCHNELL_MODEL = "black-forest-labs/flux-schnell" as const;

export class ReplicateImageClient implements ImageClient {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generateImage(prompt: string): Promise<Buffer> {
    const output = await this.replicate.run(FLUX_SCHNELL_MODEL, {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "4:3",
        output_format: "png",
      },
    });

    const urls = output as string[];
    if (!urls || urls.length === 0) {
      throw new Error("No image output from Replicate");
    }

    const imageUrl = urls[0];
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd functions && npx vitest run test/replicate.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/replicate.ts functions/test/replicate.test.ts
git commit -m "feat: add Replicate FLUX Schnell image generation client"
```

---

## Self-Review

1. **Spec coverage:** Gemini client with safety settings (`BLOCK_LOW_AND_ABOVE`) ✓, LLM-agnostic interface (`LLMClient`) ✓, JSON parsing with code block handling ✓, FLUX Schnell via Replicate ✓, `ImageClient` interface ✓.
2. **Placeholder scan:** No TBD/TODO. All code complete. ✓
3. **Type consistency:** `GeminiClient implements LLMClient`, `ReplicateImageClient implements ImageClient` — matches `functions/src/lib/types.ts`. `GeneratedStory` shape validated in `validateStory()`. ✓

---

## Next Plan

Proceed to **Plan 2c: generateBook Function & Seed Templates**.
