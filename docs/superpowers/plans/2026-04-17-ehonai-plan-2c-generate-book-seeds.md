# EhoNAI Web MVP - Plan 2c: generateBook Function & Seed Templates

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the main Cloud Function that orchestrates story + image generation, and seed the 8 theme templates into Firestore.

**Architecture:** `generateBook` is an `onDocumentCreated` Firestore trigger on `books/{bookId}`. It validates input, calls Gemini for story, calls Replicate for each page's illustration, uploads to Cloud Storage, and updates Firestore in real-time. Seed script populates 8 theme templates.

**Tech Stack:** Firebase Cloud Functions v2, firebase-admin, Vitest

**Depends on:** Plan 2a (content-filter, prompt-builder), Plan 2b (gemini, replicate clients)

---

## File Structure

```
functions/src/
├── generate-book.ts           # Main generation Cloud Function
├── seed-templates.ts          # One-off seed script
└── index.ts                   # Updated exports
functions/test/
└── generate-book.test.ts      # Unit tests with mocked dependencies
```

---

### Task 1: generateBook Cloud Function

**Files:**
- Create: `functions/test/generate-book.test.ts`
- Create: `functions/src/generate-book.ts`

- [ ] **Step 1: Write the failing tests**

Create `functions/test/generate-book.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBookGeneration } from "../src/generate-book";
import type { BookData, TemplateData, GeneratedStory } from "../src/lib/types";

// We test the core logic function (processBookGeneration), not the Firebase trigger wrapper.

const mockTemplate: TemplateData = {
  name: "おたんじょうび",
  description: "誕生日",
  icon: "🎂",
  order: 1,
  systemPrompt: "誕生日テーマで物語を作って",
  active: true,
};

const mockStory: GeneratedStory = {
  title: "ゆうたくんのたんじょうび",
  pages: [
    { text: "きょうはたんじょうびです。", imagePrompt: "A birthday party" },
    { text: "ケーキをたべました。", imagePrompt: "A child eating cake" },
  ],
};

const mockImageBuffer = Buffer.from("fake-png-data");

function createMockDeps() {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    llmClient: {
      generateStory: vi.fn().mockResolvedValue(mockStory),
    },
    imageClient: {
      generateImage: vi.fn().mockResolvedValue(mockImageBuffer),
    },
    uploadImage: vi.fn().mockResolvedValue("https://storage.example.com/image.png"),
    updateBookTitle: vi.fn().mockResolvedValue(undefined),
    writePage: vi.fn().mockResolvedValue(undefined),
    updateBookProgress: vi.fn().mockResolvedValue(undefined),
    updateBookStatus: vi.fn().mockResolvedValue(undefined),
    getUserMonthlyCount: vi.fn().mockResolvedValue(0),
    incrementMonthlyCount: vi.fn().mockResolvedValue(undefined),
  };
}

const baseBookData: BookData = {
  userId: "user123",
  title: "",
  theme: "birthday",
  style: "watercolor",
  pageCount: 4,
  status: "generating",
  progress: 0,
  input: { childName: "ゆうた" },
  createdAt: {} as FirebaseFirestore.Timestamp,
  expiresAt: null,
};

describe("processBookGeneration", () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it("generates a complete book successfully", async () => {
    await processBookGeneration("book123", baseBookData, deps);

    expect(deps.getTemplate).toHaveBeenCalledWith("birthday");
    expect(deps.llmClient.generateStory).toHaveBeenCalledOnce();
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(2);
    expect(deps.uploadImage).toHaveBeenCalledTimes(2);
    expect(deps.writePage).toHaveBeenCalledTimes(2);
    expect(deps.updateBookTitle).toHaveBeenCalledWith("book123", "ゆうたくんのたんじょうび");
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "completed");
    expect(deps.incrementMonthlyCount).toHaveBeenCalledWith("user123");
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

    // 2 pages: first page fails twice then succeeds (3 calls), second page succeeds (1 call)
    expect(deps.imageClient.generateImage).toHaveBeenCalledTimes(4);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "completed");
  });

  it("marks page as failed after 3 image generation attempts", async () => {
    deps.imageClient.generateImage
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockRejectedValueOnce(new Error("fail 3"))
      .mockResolvedValue(mockImageBuffer); // second page succeeds

    await processBookGeneration("book123", baseBookData, deps);

    expect(deps.writePage).toHaveBeenCalledWith(
      "book123",
      expect.objectContaining({ pageNumber: 0, status: "failed" })
    );
  });

  it("validates input and rejects NG words", async () => {
    const badBook: BookData = {
      ...baseBookData,
      input: { childName: "殺す" },
    };

    await processBookGeneration("book123", badBook, deps);

    expect(deps.updateBookStatus).toHaveBeenCalledWith("book123", "failed");
    expect(deps.llmClient.generateStory).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd functions && npx vitest run test/generate-book.test.ts
```

Expected: FAIL — `Cannot find module '../src/generate-book'`

- [ ] **Step 3: Implement generateBook**

Create `functions/src/generate-book.ts`:

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";
import { sanitizeInput } from "./lib/content-filter";
import { buildSystemPrompt, buildImagePrompt } from "./lib/prompt-builder";
import { GeminiClient } from "./lib/gemini";
import { ReplicateImageClient } from "./lib/replicate";
import type {
  BookData,
  TemplateData,
  PageData,
  GeneratedStory,
  LLMClient,
  ImageClient,
} from "./lib/types";

if (getApps().length === 0) initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");

const FREE_MONTHLY_LIMIT = 3;
const IMAGE_RETRY_LIMIT = 3;

// --- Dependency interfaces for testability ---

export interface GenerationDeps {
  getTemplate: (themeId: string) => Promise<TemplateData>;
  llmClient: LLMClient;
  imageClient: ImageClient;
  uploadImage: (bookId: string, pageNumber: number, data: Buffer) => Promise<string>;
  updateBookTitle: (bookId: string, title: string) => Promise<void>;
  writePage: (bookId: string, page: PageData) => Promise<void>;
  updateBookProgress: (bookId: string, progress: number) => Promise<void>;
  updateBookStatus: (bookId: string, status: "completed" | "failed") => Promise<void>;
  getUserMonthlyCount: (userId: string) => Promise<number>;
  incrementMonthlyCount: (userId: string) => Promise<void>;
}

// --- Core logic (testable) ---

export async function processBookGeneration(
  bookId: string,
  bookData: BookData,
  deps: GenerationDeps
): Promise<void> {
  try {
    // 1. Quota check
    const count = await deps.getUserMonthlyCount(bookData.userId);
    if (count >= FREE_MONTHLY_LIMIT) {
      await deps.updateBookStatus(bookId, "failed");
      return;
    }

    // 2. Input validation
    const validation = sanitizeInput(bookData.input);
    if (!validation.valid) {
      await deps.updateBookStatus(bookId, "failed");
      return;
    }

    // 3. Get template
    const template = await deps.getTemplate(bookData.theme);

    // 4. Build prompts and generate story
    const systemPrompt = buildSystemPrompt(template, bookData.style);
    const story: GeneratedStory = await deps.llmClient.generateStory({
      systemPrompt,
      childName: bookData.input.childName,
      childAge: bookData.input.childAge,
      favorites: bookData.input.favorites,
      lessonToTeach: bookData.input.lessonToTeach,
      memoryToRecreate: bookData.input.memoryToRecreate,
      pageCount: bookData.pageCount,
      style: bookData.style,
    });

    // 5. Update title
    await deps.updateBookTitle(bookId, story.title);

    // 6. Generate images for each page
    let completedPages = 0;
    for (let i = 0; i < story.pages.length; i++) {
      const page = story.pages[i];
      const imagePrompt = buildImagePrompt(page.imagePrompt, bookData.style);

      let imageUrl = "";
      let pageStatus: "completed" | "failed" = "failed";

      for (let attempt = 0; attempt < IMAGE_RETRY_LIMIT; attempt++) {
        try {
          const imageBuffer = await deps.imageClient.generateImage(imagePrompt);
          imageUrl = await deps.uploadImage(bookId, i, imageBuffer);
          pageStatus = "completed";
          break;
        } catch {
          if (attempt === IMAGE_RETRY_LIMIT - 1) {
            pageStatus = "failed";
          }
        }
      }

      await deps.writePage(bookId, {
        pageNumber: i,
        text: page.text,
        imageUrl,
        imagePrompt,
        status: pageStatus,
      });

      if (pageStatus === "completed") {
        completedPages++;
      }
      await deps.updateBookProgress(bookId, completedPages);
    }

    // 7. Mark complete
    await deps.updateBookStatus(bookId, "completed");
    await deps.incrementMonthlyCount(bookData.userId);
  } catch {
    await deps.updateBookStatus(bookId, "failed");
  }
}

// --- Firebase production deps ---

function createProductionDeps(): GenerationDeps {
  const db = getFirestore();
  const bucket = getStorage().bucket();

  return {
    getTemplate: async (themeId: string) => {
      const snap = await db.doc(`templates/${themeId}`).get();
      if (!snap.exists) throw new Error(`Template not found: ${themeId}`);
      return snap.data() as TemplateData;
    },

    llmClient: new GeminiClient(geminiApiKey.value()),
    imageClient: new ReplicateImageClient(replicateApiToken.value()),

    uploadImage: async (bookId, pageNumber, data) => {
      const filePath = `books/${bookId}/pages/${pageNumber}.png`;
      const file = bucket.file(filePath);
      await file.save(data, { contentType: "image/png" });
      await file.makePublic();
      return file.publicUrl();
    },

    updateBookTitle: async (bookId, title) => {
      await db.doc(`books/${bookId}`).update({ title });
    },

    writePage: async (bookId, page) => {
      await db.doc(`books/${bookId}/pages/${page.pageNumber}`).set(page);
    },

    updateBookProgress: async (bookId, progress) => {
      await db.doc(`books/${bookId}`).update({ progress });
    },

    updateBookStatus: async (bookId, status) => {
      await db.doc(`books/${bookId}`).update({ status });
    },

    getUserMonthlyCount: async (userId) => {
      const snap = await db.doc(`users/${userId}`).get();
      return snap.data()?.monthlyGenerationCount ?? 0;
    },

    incrementMonthlyCount: async (userId) => {
      const { FieldValue } = await import("firebase-admin/firestore");
      await db.doc(`users/${userId}`).update({
        monthlyGenerationCount: FieldValue.increment(1),
      });
    },
  };
}

// --- Cloud Function export ---

export const generateBook = onDocumentCreated(
  {
    document: "books/{bookId}",
    secrets: [geminiApiKey, replicateApiToken],
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (event) => {
    const bookId = event.params.bookId;
    const bookData = event.data?.data() as BookData | undefined;
    if (!bookData) return;

    const deps = createProductionDeps();
    await processBookGeneration(bookId, bookData, deps);
  }
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd functions && npx vitest run test/generate-book.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/generate-book.ts functions/test/generate-book.test.ts
git commit -m "feat: add generateBook Cloud Function with quota check and retry logic"
```

---

### Task 2: Seed Templates

**Files:**
- Create: `functions/src/seed-templates.ts`

- [ ] **Step 1: Create seed script**

Create `functions/src/seed-templates.ts`:

```typescript
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { TemplateData } from "./lib/types";

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const JSON_FORMAT_INSTRUCTION = `

以下のJSON形式で出力してください。JSON以外のテキストは含めないでください。
\`\`\`json
{
  "title": "絵本のタイトル（日本語）",
  "pages": [
    {
      "text": "ページの本文（日本語・ひらがな多め）",
      "imagePrompt": "English description of the illustration"
    }
  ]
}
\`\`\``;

const templates: Record<string, TemplateData> = {
  birthday: {
    name: "おたんじょうび",
    description: "主人公の誕生日パーティーの冒険",
    icon: "🎂",
    order: 1,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。主人公の誕生日をテーマにした心温まる物語を作ってください。
- 誕生日パーティー、プレゼント、ケーキ、友だちや家族のお祝いなど楽しい要素を入れてください。
- 主人公が特別な一日を過ごし、幸せな気持ちで終わる物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  bedtime: {
    name: "おやすみなさい",
    description: "眠りにつくまでの穏やかな物語",
    icon: "🌙",
    order: 2,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。寝かしつけにぴったりの穏やかな物語を作ってください。
- 夜の静かな冒険、お月さまやお星さまとのやりとり、眠りの妖精など穏やかな要素を入れてください。
- ゆっくりとしたテンポで、最後は主人公が安心して眠りにつく場面で終わってください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  adventure: {
    name: "おでかけぼうけん",
    description: "公園や動物園へのお出かけ冒険",
    icon: "🌳",
    order: 3,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。お出かけをテーマにした楽しい冒険物語を作ってください。
- 公園、動物園、水族館、山や海など楽しいお出かけ先での冒険を描いてください。
- 新しい発見やちょっとしたハプニングを入れて、ワクワクする展開にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  seasons: {
    name: "きせつのおはなし",
    description: "春夏秋冬の季節イベント",
    icon: "🌸",
    order: 4,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。日本の四季をテーマにした物語を作ってください。
- お花見、夏祭り、紅葉狩り、雪遊び、節分、七夕など季節の行事を取り入れてください。
- 季節の美しさや楽しさが伝わる描写を入れてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  animals: {
    name: "どうぶつのともだち",
    description: "動物たちと友だちになる物語",
    icon: "🐰",
    order: 5,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。動物と友だちになるテーマの物語を作ってください。
- うさぎ、くま、ねこ、いぬ、ぞうなどかわいい動物たちを登場させてください。
- 動物たちと一緒に遊んだり助け合ったりする友情の物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  food: {
    name: "たべものだいぼうけん",
    description: "好き嫌い克服や食の楽しさ",
    icon: "🍙",
    order: 6,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。食べ物をテーマにした楽しい物語を作ってください。
- 食べ物が擬人化されたり、料理を一緒に作ったり、新しい食べ物に挑戦する物語にしてください。
- 食べることの楽しさや、好き嫌いを少し克服するようなポジティブな展開にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  challenge: {
    name: "できたよ！チャレンジ",
    description: "トイレ・着替え・お片付けなど成長体験",
    icon: "💪",
    order: 7,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。子どもの成長チャレンジをテーマにした物語を作ってください。
- トイレトレーニング、自分で着替える、お片付け、歯みがきなどの日常チャレンジを取り入れてください。
- 最初は難しくても頑張って「できた！」と達成感を感じる物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },

  family: {
    name: "かぞくのおはなし",
    description: "家族の絆や兄弟・祖父母との物語",
    icon: "👨‍👩‍👧",
    order: 8,
    active: true,
    systemPrompt: `あなたは子ども向け絵本の作家です。家族の絆をテーマにした温かい物語を作ってください。
- お父さん、お母さん、兄弟姉妹、おじいちゃん、おばあちゃんなど家族との交流を描いてください。
- 家族と一緒に過ごす時間の大切さや、愛情が伝わる物語にしてください。
- 子ども向けの安全な内容のみ。暴力・恐怖・悲しい結末は禁止です。${JSON_FORMAT_INSTRUCTION}`,
  },
};

async function seed(): Promise<void> {
  const batch = db.batch();
  for (const [id, data] of Object.entries(templates)) {
    batch.set(db.doc(`templates/${id}`), data);
  }
  await batch.commit();
  console.log(`Seeded ${Object.keys(templates).length} templates.`);
}

seed().catch(console.error);
```

- [ ] **Step 2: Update functions/src/index.ts with exports**

Replace `functions/src/index.ts`:

```typescript
export { generateBook } from "./generate-book";
```

- [ ] **Step 3: Verify functions build**

```bash
cd functions && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add functions/src/seed-templates.ts functions/src/index.ts
git commit -m "feat: add template seed script and export generateBook function"
```

---

## Self-Review

1. **Spec coverage:** generateBook flow matches spec (validate → LLM → image per page → update Firestore) ✓, quota check (3/month free) ✓, image retry (max 2 retries = 3 attempts) ✓, error handling (book/page failed status) ✓, 8 templates with Japanese systemPrompts ✓, JSON output format in templates ✓.
2. **Placeholder scan:** No TBD/TODO. All templates have complete systemPrompts. ✓
3. **Type consistency:** `processBookGeneration` uses `BookData`, `TemplateData`, `GeneratedStory`, `PageData` matching `functions/src/lib/types.ts`. `GenerationDeps` interface matches `LLMClient`/`ImageClient`. ✓

---

## Next Plan

Proceed to **Plan 3a: Hooks + Layout + Auth Screens**.
