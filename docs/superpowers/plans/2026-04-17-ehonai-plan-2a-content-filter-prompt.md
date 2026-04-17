# EhoNAI Web MVP - Plan 2a: Content Filter & Prompt Builder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement content safety filtering and LLM prompt construction for the story generation pipeline.

**Architecture:** Pure utility functions with no external dependencies, fully testable with Vitest. Content filter validates user input against NG word list. Prompt builder constructs system/user/image prompts from templates and user input.

**Tech Stack:** TypeScript, Vitest

**Depends on:** Plan 1 (functions project setup, types defined in `functions/src/lib/types.ts`)

---

## File Structure

```
functions/
├── src/lib/
│   ├── content-filter.ts     # NG word detection + input validation
│   └── prompt-builder.ts     # System/user/image prompt construction
├── test/
│   ├── content-filter.test.ts
│   └── prompt-builder.test.ts
└── vitest.config.ts          # Vitest config for functions
```

---

### Task 1: Content Filter

**Files:**
- Create: `functions/vitest.config.ts`
- Create: `functions/test/content-filter.test.ts`
- Create: `functions/src/lib/content-filter.ts`

- [ ] **Step 1: Create Vitest config for functions**

Create `functions/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `functions/test/content-filter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { containsNGWords, sanitizeInput } from "../src/lib/content-filter";
import type { BookInput } from "../src/lib/types";

describe("containsNGWords", () => {
  it("returns safe for clean text", () => {
    const result = containsNGWords("ゆうたくんはどうぶつえんにいきました");
    expect(result.safe).toBe(true);
    expect(result.matchedWords).toEqual([]);
  });

  it("detects violence-related words", () => {
    const result = containsNGWords("殺すシーンを入れてください");
    expect(result.safe).toBe(false);
    expect(result.matchedWords.length).toBeGreaterThan(0);
  });

  it("detects adult content words", () => {
    const result = containsNGWords("セクシーな内容にして");
    expect(result.safe).toBe(false);
  });

  it("handles empty string as safe", () => {
    const result = containsNGWords("");
    expect(result.safe).toBe(true);
  });

  it("is case-insensitive for latin characters", () => {
    const result = containsNGWords("KILL the monster");
    expect(result.safe).toBe(false);
  });
});

describe("sanitizeInput", () => {
  it("accepts valid input with required field only", () => {
    const input: BookInput = { childName: "ゆうた" };
    const result = sanitizeInput(input);
    expect(result.valid).toBe(true);
  });

  it("accepts valid input with all fields", () => {
    const input: BookInput = {
      childName: "ゆうた",
      childAge: 3,
      favorites: "きょうりゅう",
      lessonToTeach: "はみがきをがんばる",
      memoryToRecreate: "どうぶつえんにいった",
    };
    const result = sanitizeInput(input);
    expect(result.valid).toBe(true);
  });

  it("rejects empty childName", () => {
    const input: BookInput = { childName: "" };
    const result = sanitizeInput(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects input containing NG words in childName", () => {
    const input: BookInput = { childName: "殺す" };
    const result = sanitizeInput(input);
    expect(result.valid).toBe(false);
  });

  it("rejects input containing NG words in favorites", () => {
    const input: BookInput = { childName: "ゆうた", favorites: "エロい本" };
    const result = sanitizeInput(input);
    expect(result.valid).toBe(false);
  });

  it("rejects childName exceeding max length", () => {
    const input: BookInput = { childName: "あ".repeat(51) };
    const result = sanitizeInput(input);
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd functions && npm test
```

Expected: FAIL — `Cannot find module '../src/lib/content-filter'`

- [ ] **Step 4: Implement content filter**

Create `functions/src/lib/content-filter.ts`:

```typescript
import type { BookInput } from "./types";

const NG_WORDS: string[] = [
  "殺す", "殺し", "死ね", "死ぬ",
  "セクシー", "エロ", "ヌード", "裸",
  "暴力", "虐待", "いじめ",
  "麻薬", "ドラッグ",
  "kill", "murder", "sex", "nude", "violence", "drug",
];

const MAX_NAME_LENGTH = 50;
const MAX_TEXT_LENGTH = 200;

export interface NGWordResult {
  safe: boolean;
  matchedWords: string[];
}

export interface SanitizeResult {
  valid: boolean;
  reason?: string;
}

export function containsNGWords(text: string): NGWordResult {
  if (!text) return { safe: true, matchedWords: [] };

  const lower = text.toLowerCase();
  const matched = NG_WORDS.filter((word) => lower.includes(word.toLowerCase()));

  return {
    safe: matched.length === 0,
    matchedWords: matched,
  };
}

export function sanitizeInput(input: BookInput): SanitizeResult {
  if (!input.childName || input.childName.trim().length === 0) {
    return { valid: false, reason: "子どもの名前は必須です" };
  }

  if (input.childName.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: "名前が長すぎます" };
  }

  const fieldsToCheck = [
    input.childName,
    input.favorites,
    input.lessonToTeach,
    input.memoryToRecreate,
  ].filter((f): f is string => typeof f === "string");

  for (const field of fieldsToCheck) {
    if (field.length > MAX_TEXT_LENGTH) {
      return { valid: false, reason: "入力テキストが長すぎます" };
    }
    const ngResult = containsNGWords(field);
    if (!ngResult.safe) {
      return {
        valid: false,
        reason: `不適切な表現が含まれています: ${ngResult.matchedWords.join(", ")}`,
      };
    }
  }

  return { valid: true };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd functions && npm test
```

Expected: All 11 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/vitest.config.ts functions/src/lib/content-filter.ts functions/test/content-filter.test.ts
git commit -m "feat: add content safety filter with NG word detection"
```

---

### Task 2: Prompt Builder

**Files:**
- Create: `functions/test/prompt-builder.test.ts`
- Create: `functions/src/lib/prompt-builder.ts`

- [ ] **Step 1: Write the failing tests**

Create `functions/test/prompt-builder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildImagePrompt,
} from "../src/lib/prompt-builder";
import type { TemplateData, IllustrationStyle, PageCount } from "../src/lib/types";

const mockTemplate: TemplateData = {
  name: "おたんじょうび",
  description: "主人公の誕生日パーティーの冒険",
  icon: "🎂",
  order: 1,
  systemPrompt:
    "あなたは子ども向け絵本の作家です。主人公の誕生日をテーマにした心温まる物語を作ってください。",
  active: true,
};

describe("buildSystemPrompt", () => {
  it("includes template system prompt", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("誕生日をテーマにした");
  });

  it("includes safety instruction", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("子ども向けの安全な内容");
  });

  it("includes JSON output format instruction", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("JSON");
    expect(result).toContain("title");
    expect(result).toContain("pages");
    expect(result).toContain("imagePrompt");
  });

  it("includes style-specific illustration instruction", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("水彩画");
  });
});

describe("buildUserPrompt", () => {
  it("includes child name", () => {
    const result = buildUserPrompt({ childName: "ゆうた" }, 8);
    expect(result).toContain("ゆうた");
  });

  it("includes page count", () => {
    const result = buildUserPrompt({ childName: "ゆうた" }, 4);
    expect(result).toContain("4");
  });

  it("includes optional fields when provided", () => {
    const result = buildUserPrompt(
      {
        childName: "さくら",
        childAge: 3,
        favorites: "うさぎ",
        lessonToTeach: "あいさつ",
        memoryToRecreate: "おばあちゃんの家",
      },
      8
    );
    expect(result).toContain("さくら");
    expect(result).toContain("3");
    expect(result).toContain("うさぎ");
    expect(result).toContain("あいさつ");
    expect(result).toContain("おばあちゃんの家");
  });

  it("omits optional fields when not provided", () => {
    const result = buildUserPrompt({ childName: "ゆうた" }, 8);
    expect(result).not.toContain("年齢");
    expect(result).not.toContain("好きなもの");
  });
});

describe("buildImagePrompt", () => {
  it("includes the base prompt", () => {
    const result = buildImagePrompt("A child playing in a park", "watercolor");
    expect(result).toContain("A child playing in a park");
  });

  it("appends safety keywords", () => {
    const result = buildImagePrompt("A child at a party", "flat");
    expect(result).toContain("safe for children");
    expect(result).toContain("family friendly");
  });

  it("appends watercolor style keywords", () => {
    const result = buildImagePrompt("A birthday scene", "watercolor");
    expect(result).toContain("watercolor");
    expect(result).toContain("soft warm colors");
  });

  it("appends flat style keywords", () => {
    const result = buildImagePrompt("A birthday scene", "flat");
    expect(result).toContain("flat illustration");
    expect(result).toContain("bright simple colors");
  });

  it("appends crayon style keywords", () => {
    const result = buildImagePrompt("A birthday scene", "crayon");
    expect(result).toContain("crayon pastel");
    expect(result).toContain("hand-drawn texture");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd functions && npm test
```

Expected: FAIL — `Cannot find module '../src/lib/prompt-builder'`

- [ ] **Step 3: Implement prompt builder**

Create `functions/src/lib/prompt-builder.ts`:

```typescript
import type {
  TemplateData,
  IllustrationStyle,
  BookInput,
  PageCount,
} from "./types";

const STYLE_DESCRIPTIONS: Record<IllustrationStyle, string> = {
  watercolor: "水彩画風（いわさきちひろ、ぐりとぐらのような柔らかく温かみのあるタッチ）",
  flat: "フラットイラスト風（ミッフィー、しろくまちゃんのような明るくシンプルなタッチ）",
  crayon: "クレヨン/パステル風（はらぺこあおむし、ノンタンのような手描き感のあるタッチ）",
};

const IMAGE_STYLE_KEYWORDS: Record<IllustrationStyle, string> = {
  watercolor:
    "watercolor painting style, soft warm colors, gentle illustration, Japanese picture book style",
  flat: "flat illustration style, bright simple colors, clean lines, minimalist picture book style",
  crayon:
    "crayon pastel drawing style, hand-drawn texture, colorful, children's picture book style",
};

const SAFETY_KEYWORDS = "safe for children, family friendly, wholesome, gentle";

export function buildSystemPrompt(
  template: TemplateData,
  style: IllustrationStyle
): string {
  return `${template.systemPrompt}

## 制約
- 子ども向けの安全な内容のみ生成してください。暴力、恐怖、悲しい結末は禁止です。
- 挿絵のスタイル: ${STYLE_DESCRIPTIONS[style]}
- 各ページの imagePrompt は英語で、挿絵の内容を具体的に描写してください。

## 出力形式
以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。

\`\`\`json
{
  "title": "絵本のタイトル",
  "pages": [
    {
      "text": "ページの本文（日本語・ひらがな多め・幼児が理解できる表現）",
      "imagePrompt": "English description of the illustration for this page"
    }
  ]
}
\`\`\``;
}

export function buildUserPrompt(input: BookInput, pageCount: PageCount): string {
  const lines: string[] = [];

  lines.push(`主人公の名前: ${input.childName}`);

  if (input.childAge !== undefined) {
    lines.push(`年齢: ${input.childAge}歳`);
  }
  if (input.favorites) {
    lines.push(`好きなもの: ${input.favorites}`);
  }
  if (input.lessonToTeach) {
    lines.push(`教えたいこと: ${input.lessonToTeach}`);
  }
  if (input.memoryToRecreate) {
    lines.push(`再現したい思い出: ${input.memoryToRecreate}`);
  }

  lines.push(`ページ数: ${pageCount}ページ`);

  return lines.join("\n");
}

export function buildImagePrompt(
  basePrompt: string,
  style: IllustrationStyle
): string {
  return `${basePrompt}, ${IMAGE_STYLE_KEYWORDS[style]}, ${SAFETY_KEYWORDS}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd functions && npm test
```

Expected: All 15 tests PASS (11 from Task 1 + 14 from Task 2 = 25 total, but run this task's 14 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/prompt-builder.ts functions/test/prompt-builder.test.ts
git commit -m "feat: add prompt builder for system, user, and image prompts"
```

---

## Self-Review

1. **Spec coverage:** Content filter covers all 4 layers on the input side (NGワード検出). Prompt builder covers system prompt (template + safety + JSON format), user prompt (all BookInput fields), and image prompt (style keywords + safety). ✓
2. **Placeholder scan:** No TBD/TODO. All NG words listed explicitly. All style keywords defined. ✓
3. **Type consistency:** Uses `BookInput`, `TemplateData`, `IllustrationStyle`, `PageCount` from `functions/src/lib/types.ts`. ✓

---

## Next Plan

Proceed to **Plan 2b: AI Clients** (Gemini + Replicate API implementations).
