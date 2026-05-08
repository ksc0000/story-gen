import { describe, it, expect } from "vitest";
import { buildTaskDraft } from "@/lib/quality-review";
import type { BookDoc, PageDoc } from "@/lib/types";

function makeBook(overrides: Partial<BookDoc> = {}): BookDoc & { id: string } {
  return {
    id: "book-test-1",
    title: "test",
    userId: "u1",
    childId: "c1",
    status: "completed",
    theme: "adventure",
    pageCount: 5,
    progress: 100,
    style: "watercolor",
    createdAt: null as unknown as import("firebase/firestore").Timestamp,
    expiresAt: null,
    input: {} as BookDoc["input"],
    ...overrides,
  } as BookDoc & { id: string };
}

function makePage(overrides: Partial<PageDoc> = {}): PageDoc {
  return {
    pageNumber: 0,
    text: "テストテキスト",
    imageUrl: "https://example.com/img.png",
    imagePrompt: "prompt",
    status: "completed",
    ...overrides,
  } as PageDoc;
}

describe("buildTaskDraft", () => {
  // ---------------------------------------------------------------
  // prepare_story_rewrite
  // ---------------------------------------------------------------
  describe("prepare_story_rewrite", () => {
    it("基本チェックリストが生成される", () => {
      const book = makeBook({ storyGoal: "友情を学ぶ", generatedTextPreview: ["p1", "p2", "p3"] });
      const draft = buildTaskDraft("prepare_story_rewrite", book, []);
      expect(draft.title).toBe("Story Rewrite 確認タスク");
      expect(draft.intent).toBe("prepare_story_rewrite");
      expect(draft.checklist.length).toBe(4);
      expect(draft.checklist[0].detail).toContain("3 ページ分");
      expect(draft.checklist[2].detail).toContain("友情を学ぶ");
      expect(draft.summary).toContain("book-test-1");
    });

    it("storyQualityWarnings がある場合はチェックリストに含まれる", () => {
      const book = makeBook({ storyQualityWarnings: ["too_short", "repetitive"] });
      const draft = buildTaskDraft("prepare_story_rewrite", book, []);
      const warningItem = draft.checklist.find((c) => c.label.includes("storyQualityWarnings"));
      expect(warningItem).toBeDefined();
      expect(warningItem!.detail).toContain("too_short");
      expect(warningItem!.detail).toContain("repetitive");
    });

    it("storyTextRewriteUsed の場合は追加チェックリスト項目", () => {
      const book = makeBook({
        storyTextRewriteUsed: true,
        storyTextRewriteModel: "gemini-2.5-flash",
        storyTextRewriteAttempts: 2,
      });
      const draft = buildTaskDraft("prepare_story_rewrite", book, []);
      expect(draft.checklist.length).toBe(5);
      const rewriteItem = draft.checklist.find((c) => c.label.includes("rewrite 実施済み"));
      expect(rewriteItem).toBeDefined();
      expect(rewriteItem!.detail).toContain("gemini-2.5-flash");
      expect(rewriteItem!.detail).toContain("2");
    });
  });

  // ---------------------------------------------------------------
  // review_image_regeneration
  // ---------------------------------------------------------------
  describe("review_image_regeneration", () => {
    it("問題ページを正しく検出する", () => {
      const pages = [
        makePage({ pageNumber: 0, status: "completed" }),
        makePage({ pageNumber: 1, status: "image_failed" }),
        makePage({ pageNumber: 2, status: "fallback_completed" }),
        makePage({ pageNumber: 3, status: "completed", imageDurationMs: 150_000 }),
        makePage({ pageNumber: 4, status: "completed" }),
      ];
      const book = makeBook({ imageSuccessCount: 3, totalImageCount: 5 });
      const draft = buildTaskDraft("review_image_regeneration", book, pages);

      expect(draft.title).toBe("画像再生成 確認タスク");
      // image_failed → page 2
      const failedItem = draft.checklist.find((c) => c.label.includes("image_failed"));
      expect(failedItem!.detail).toContain("page 2");
      // fallback → page 3
      const fallbackItem = draft.checklist.find((c) => c.label.includes("fallback"));
      expect(fallbackItem!.detail).toContain("page 3");
      // slow → page 4
      const slowItem = draft.checklist.find((c) => c.label.includes("120s"));
      expect(slowItem!.detail).toContain("page 4");
      // summary: 3 問題ページ
      expect(draft.summary).toContain("3 件");
    });

    it("問題ページがない場合は「なし」と表示", () => {
      const pages = [
        makePage({ pageNumber: 0, status: "completed" }),
        makePage({ pageNumber: 1, status: "completed" }),
      ];
      const draft = buildTaskDraft("review_image_regeneration", makeBook(), pages);
      const failedItem = draft.checklist.find((c) => c.label.includes("image_failed"));
      expect(failedItem!.detail).toBe("なし");
      expect(draft.summary).toContain("0 件");
    });
  });

  // ---------------------------------------------------------------
  // review_character_consistency
  // ---------------------------------------------------------------
  describe("review_character_consistency", () => {
    it("キャラクター登場ページを検出する", () => {
      const pages = [
        makePage({ pageNumber: 0, appearingCharacterIds: ["char-1"] }),
        makePage({ pageNumber: 1, focusCharacterId: "char-2" }),
        makePage({ pageNumber: 2 }),
        makePage({ pageNumber: 3, usedCharacterReference: true }),
      ];
      const book = makeBook({
        storyCast: [
          { characterId: "char-1" } as BookDoc["storyCast"] extends (infer T)[] | undefined ? T : never,
          { characterId: "char-2" } as BookDoc["storyCast"] extends (infer T)[] | undefined ? T : never,
        ],
        characterConsistencyMode: "reference_image",
      });
      const draft = buildTaskDraft("review_character_consistency", book, pages);

      expect(draft.title).toBe("キャラクター一貫性 確認タスク");
      expect(draft.checklist[0].detail).toContain("2 キャラクター");
      // pages 1, 2, 4 have character info (pageNumber 0,1,3 → display as 1,2,4)
      const pageItem = draft.checklist.find((c) => c.label.includes("キャラクター登場ページ"));
      expect(pageItem!.detail).toContain("1");
      expect(pageItem!.detail).toContain("2");
      expect(pageItem!.detail).toContain("4");
      expect(draft.summary).toContain("3 件");
    });

    it("storyCast が空の場合", () => {
      const draft = buildTaskDraft("review_character_consistency", makeBook(), []);
      expect(draft.checklist[0].detail).toContain("0 キャラクター");
    });
  });

  // ---------------------------------------------------------------
  // review_personalization_inputs
  // ---------------------------------------------------------------
  describe("review_personalization_inputs", () => {
    it("childProfileSnapshot があれば displayName を含めずに「設定あり」と表示", () => {
      const book = makeBook({
        childProfileSnapshot: {
          displayName: "太郎くん",
          personality: {} as BookDoc["childProfileSnapshot"] extends { personality: infer P } | undefined ? P : never,
          visualProfile: {} as BookDoc["childProfileSnapshot"] extends { visualProfile: infer V } | undefined ? V : never,
        },
        personalizationScore: 4,
      });
      const draft = buildTaskDraft("review_personalization_inputs", book, []);

      expect(draft.title).toBe("パーソナライズ 確認タスク");
      // PII チェック: displayName が含まれていない
      const nameItem = draft.checklist.find((c) => c.label.includes("子どもの名前"));
      expect(nameItem!.detail).toBe("設定あり（画面上で確認）");
      expect(nameItem!.detail).not.toContain("太郎");
      // summary にも含まれない
      expect(draft.summary).not.toContain("太郎");
      // personalizationScore
      const scoreItem = draft.checklist.find((c) => c.label.includes("personalizationScore"));
      expect(scoreItem!.detail).toContain("4 / 5");
    });

    it("childProfileSnapshot がない場合は「未設定」", () => {
      const draft = buildTaskDraft("review_personalization_inputs", makeBook(), []);
      const nameItem = draft.checklist.find((c) => c.label.includes("子どもの名前"));
      expect(nameItem!.detail).toBe("未設定");
      const snapshotItem = draft.checklist.find((c) => c.label.includes("childProfileSnapshot"));
      expect(snapshotItem!.detail).toBe("未設定");
    });
  });

  // ---------------------------------------------------------------
  // require_human_safety_review
  // ---------------------------------------------------------------
  describe("require_human_safety_review", () => {
    it("safety 関連 warnings をフィルタする", () => {
      const book = makeBook({
        storyQualityWarnings: ["too_short", "safety_concern", "violence_detected", "repetitive"],
        safetyScore: 2,
        storyGoal: "冒険",
      });
      const pages = [makePage(), makePage({ pageNumber: 1 }), makePage({ pageNumber: 2 })];
      const draft = buildTaskDraft("require_human_safety_review", book, pages);

      expect(draft.title).toBe("安全性 確認タスク");
      const warningItem = draft.checklist.find((c) => c.label.includes("safety 関連"));
      expect(warningItem!.detail).toContain("safety_concern");
      expect(warningItem!.detail).toContain("violence_detected");
      expect(warningItem!.detail).not.toContain("too_short");
      expect(warningItem!.detail).not.toContain("repetitive");
      // ページ数
      const textItem = draft.checklist.find((c) => c.label.includes("テキストを目視"));
      expect(textItem!.detail).toContain("3 ページ");
      // safetyScore in summary
      expect(draft.summary).toContain("safetyScore: 2");
    });

    it("safety warnings がない場合は「なし」", () => {
      const draft = buildTaskDraft("require_human_safety_review", makeBook(), []);
      const warningItem = draft.checklist.find((c) => c.label.includes("safety 関連"));
      expect(warningItem!.detail).toBe("なし");
    });
  });

  // ---------------------------------------------------------------
  // confirm_approval
  // ---------------------------------------------------------------
  describe("confirm_approval", () => {
    it("チェックリストが空で承認メッセージが返る", () => {
      const draft = buildTaskDraft("confirm_approval", makeBook(), []);
      expect(draft.title).toBe("承認済み");
      expect(draft.checklist).toEqual([]);
      expect(draft.summary).toContain("タスクはありません");
    });
  });

  // ---------------------------------------------------------------
  // PII safety: displayName が copyText に漏れないことの横断テスト
  // ---------------------------------------------------------------
  describe("PII safety", () => {
    it("全 intent で displayName が draft に含まれない", () => {
      const book = makeBook({
        childProfileSnapshot: {
          displayName: "秘密の名前",
          personality: {} as BookDoc["childProfileSnapshot"] extends { personality: infer P } | undefined ? P : never,
          visualProfile: {} as BookDoc["childProfileSnapshot"] extends { visualProfile: infer V } | undefined ? V : never,
        },
      });
      const intents = [
        "prepare_story_rewrite",
        "review_image_regeneration",
        "review_character_consistency",
        "review_personalization_inputs",
        "require_human_safety_review",
        "confirm_approval",
      ] as const;

      for (const intent of intents) {
        const draft = buildTaskDraft(intent, book, []);
        const allText = [
          draft.title,
          draft.summary,
          ...draft.checklist.map((c) => `${c.label} ${c.detail}`),
        ].join(" ");
        expect(allText).not.toContain("秘密の名前");
      }
    });
  });
});
