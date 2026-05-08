import { describe, it, expect } from "vitest";
import { buildQualityTaskPayload } from "@/lib/quality-review";
import type { BookDoc, PageDoc } from "@/lib/types";

function makeBook(overrides: Partial<BookDoc> = {}): BookDoc & { id: string } {
  return {
    id: "book-task-1",
    title: "test book",
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

describe("buildQualityTaskPayload", () => {
  const adminUid = "admin-123";

  it("prepare_story_rewrite の payload を正しく生成する", () => {
    const book = makeBook({
      overallQualityScore: 2.8,
      qualityReviewStatus: "needs_fix",
      storyGoal: "友情",
      generatedTextPreview: ["p1", "p2", "p3"],
    });
    const payload = buildQualityTaskPayload("prepare_story_rewrite", book, [], adminUid);

    expect(payload.bookId).toBe("book-task-1");
    expect(payload.intent).toBe("prepare_story_rewrite");
    expect(payload.title).toBe("Story Rewrite 確認タスク");
    expect(payload.status).toBe("open");
    expect(payload.createdBy).toBe("admin-123");
    expect(payload.assignedTo).toBeNull();
    expect(payload.resolvedBy).toBeNull();
    expect(payload.resolvedAtMs).toBeNull();
    expect(payload.resolutionNote).toBe("");
    expect(payload.sourceOverallScore).toBe(2.8);
    expect(payload.sourceQualityReviewStatus).toBe("needs_fix");
    expect(payload.createdAtMs).toBeGreaterThan(0);
    expect(payload.updatedAtMs).toBe(payload.createdAtMs);
  });

  it("review_image_regeneration の payload: 問題ページを含む", () => {
    const pages = [
      makePage({ pageNumber: 0, status: "image_failed" }),
      makePage({ pageNumber: 1, status: "completed" }),
      makePage({ pageNumber: 2, status: "fallback_completed" }),
    ];
    const book = makeBook({ imageSuccessCount: 1, totalImageCount: 3 });
    const payload = buildQualityTaskPayload("review_image_regeneration", book, pages, adminUid);

    expect(payload.intent).toBe("review_image_regeneration");
    expect(payload.checklist.length).toBe(4);
    // image_failed page 1
    const failedItem = payload.checklist.find((c) => c.label.includes("image_failed"));
    expect(failedItem!.detail).toContain("page 1");
    // all items start unchecked
    expect(payload.checklist.every((c) => c.checked === false)).toBe(true);
  });

  it("review_character_consistency の payload", () => {
    const pages = [
      makePage({ pageNumber: 0, appearingCharacterIds: ["char-1"] }),
      makePage({ pageNumber: 1, focusCharacterId: "char-2" }),
      makePage({ pageNumber: 2 }),
    ];
    const book = makeBook({
      storyCast: [
        { characterId: "char-1" } as unknown as NonNullable<BookDoc["storyCast"]>[number],
        { characterId: "char-2" } as unknown as NonNullable<BookDoc["storyCast"]>[number],
      ],
    });
    const payload = buildQualityTaskPayload("review_character_consistency", book, pages, adminUid);

    expect(payload.intent).toBe("review_character_consistency");
    expect(payload.checklist[0].detail).toContain("2 キャラクター");
    expect(payload.summary).toContain("2 件");
  });

  it("review_personalization_inputs の payload: PII を含まない", () => {
    const book = makeBook({
      childProfileSnapshot: {
        displayName: "秘密の太郎",
        personality: {} as NonNullable<BookDoc["childProfileSnapshot"]>["personality"],
        visualProfile: {} as NonNullable<BookDoc["childProfileSnapshot"]>["visualProfile"],
      },
      personalizationScore: 3,
    });
    const payload = buildQualityTaskPayload("review_personalization_inputs", book, [], adminUid);

    expect(payload.intent).toBe("review_personalization_inputs");
    // PII check
    const allText = [
      payload.title,
      payload.summary,
      ...payload.checklist.map((c) => `${c.label} ${c.detail}`),
    ].join(" ");
    expect(allText).not.toContain("秘密の太郎");
    // name item shows safe text
    const nameItem = payload.checklist.find((c) => c.label.includes("子どもの名前"));
    expect(nameItem!.detail).toBe("設定あり（画面上で確認）");
  });

  it("require_human_safety_review の payload", () => {
    const book = makeBook({
      safetyScore: 2,
      storyQualityWarnings: ["safety_concern", "too_short"],
      storyGoal: "冒険",
    });
    const pages = [makePage(), makePage({ pageNumber: 1 })];
    const payload = buildQualityTaskPayload("require_human_safety_review", book, pages, adminUid);

    expect(payload.intent).toBe("require_human_safety_review");
    const warningItem = payload.checklist.find((c) => c.label.includes("safety 関連"));
    expect(warningItem!.detail).toContain("safety_concern");
    expect(warningItem!.detail).not.toContain("too_short");
  });

  it("confirm_approval の payload: チェックリスト空", () => {
    const payload = buildQualityTaskPayload("confirm_approval", makeBook(), [], adminUid);

    expect(payload.intent).toBe("confirm_approval");
    expect(payload.checklist).toEqual([]);
    expect(payload.summary).toContain("タスクはありません");
  });

  it("sourceOverallScore / sourceQualityReviewStatus が未設定なら null", () => {
    const book = makeBook(); // no scores set
    const payload = buildQualityTaskPayload("prepare_story_rewrite", book, [], adminUid);

    expect(payload.sourceOverallScore).toBeNull();
    expect(payload.sourceQualityReviewStatus).toBeNull();
  });

  it("全 intent で checklist items が checked: false で初期化される", () => {
    const intents = [
      "prepare_story_rewrite",
      "review_image_regeneration",
      "review_character_consistency",
      "review_personalization_inputs",
      "require_human_safety_review",
      "confirm_approval",
    ] as const;

    for (const intent of intents) {
      const payload = buildQualityTaskPayload(intent, makeBook(), [], adminUid);
      for (const item of payload.checklist) {
        expect(item.checked).toBe(false);
      }
    }
  });

  it("全 intent で PII (displayName) が payload に含まれない", () => {
    const book = makeBook({
      childProfileSnapshot: {
        displayName: "テスト花子",
        personality: {} as NonNullable<BookDoc["childProfileSnapshot"]>["personality"],
        visualProfile: {} as NonNullable<BookDoc["childProfileSnapshot"]>["visualProfile"],
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
      const payload = buildQualityTaskPayload(intent, book, [], adminUid);
      const allText = JSON.stringify(payload);
      expect(allText).not.toContain("テスト花子");
    }
  });

  it("createdAtMs と updatedAtMs が同値で正の整数", () => {
    const before = Date.now();
    const payload = buildQualityTaskPayload("prepare_story_rewrite", makeBook(), [], adminUid);
    const after = Date.now();

    expect(payload.createdAtMs).toBeGreaterThanOrEqual(before);
    expect(payload.createdAtMs).toBeLessThanOrEqual(after);
    expect(payload.updatedAtMs).toBe(payload.createdAtMs);
  });
});
