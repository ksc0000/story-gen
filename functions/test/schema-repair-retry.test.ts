/**
 * P4-5: Schema repair retry tests.
 *
 * Coverage:
 * 1. ENABLE_SCHEMA_REPAIR_RETRY=true: retry on schema error, second call succeeds → book completes.
 * 2. ENABLE_SCHEMA_REPAIR_RETRY=true: both attempts fail → book fails, generateStory called twice.
 * 3. ENABLE_SCHEMA_REPAIR_RETRY=true: storyGenerationAttempts: 2 logged when both fail.
 * 4. ENABLE_SCHEMA_REPAIR_RETRY=true: no more than 2 generateStory calls (no infinite loop).
 * 5. ENABLE_SCHEMA_REPAIR_RETRY=true: schemaRepairRetryUsed: true stored in story metadata.
 * 6. ENABLE_SCHEMA_REPAIR_RETRY=true: field_type_mismatch now retried (routing gap fix).
 * 7. ENABLE_SCHEMA_REPAIR_RETRY not set (default off): no retry, generateStory called once.
 * 8. ENABLE_SCHEMA_REPAIR_RETRY not set: storyGenerationAttempts absent from book_early_failed.
 * 9. Routing gap fix (always-on): field_type_mismatch errors route to schema_validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "firebase-functions/logger";
import { processBookGeneration } from "../src/generate-book";
import type { BookData, TemplateData, GeneratedStory } from "../src/lib/types";
import {
  MALFORMED_JSON_ERRORS,
  FIELD_TYPE_MISMATCH_ERRORS,
} from "./fixtures/gemini-story-json-failures";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockTemplate: TemplateData = {
  name: "テスト",
  description: "テスト",
  icon: "📖",
  order: 1,
  creationMode: "guided_ai",
  priceTier: "take",
  storyCostLevel: "standard",
  systemPrompt: "テスト用プロンプト",
  active: true,
  sampleImageUrl: "/images/templates/test.webp",
};

const mockStory: GeneratedStory = {
  title: "テストのほん",
  characterBible: "A child with black hair and blue overalls",
  styleBible: "Soft watercolor picture book style with warm paper texture",
  storyGoal: "テストくんが ともだちと いっしょに ふしぎな たからものを さがす",
  mainQuestObject: "テストアイテム",
  forbiddenQuestObjects: ["NG"],
  storyModel: "gemini-2.5-flash-lite",
  storyModelFallbackUsed: false,
  storyGenerationAttempts: 1,
  cast: [],
  narrativeDevice: {
    repeatedPhrase: "だいじょうぶ、いっしょにいるよ",
    visualMotif: "yellow star",
    setup: "はじめに みつけた ちいさな ひかり",
    payoff: "さいごに もう いちど ひかりが かがやく",
    hiddenDetails: ["small bird", "blue cup"],
  },
  pages: [
    {
      text: "こうえんの すなばで、テストくんは きょうも みどりの きょうりゅうを あそばせていました。すると すなの なかで、小さな きらきらが ひかりました。テストくんは なんだろうと おもって、そっと すなを よけました。",
      imagePrompt: "A warm wide sandbox scene with a child in a friendly park, with a small glowing star shard in the sand and soft watercolor style",
      pageVisualRole: "opening_establishing",
      compositionHint: "wide establishing shot",
      appearingCharacterIds: ["child_protagonist"],
      focusCharacterId: "child_protagonist",
    },
    {
      text: "テストくんが きらきらを てにとると、ふしぎな こえが きこえました。『ありがとう、さがしていたよ』と こえは いいました。テストくんは うれしくなって、おおきく うなずきました。こうえんに しずかな あたたかさが ひろがりました。",
      imagePrompt: "A quiet warm ending scene with a child holding a glowing star in a park, soft watercolor colors, gentle sunset light",
      pageVisualRole: "quiet_ending",
      compositionHint: "close medium shot with warm lighting",
      appearingCharacterIds: ["child_protagonist"],
      focusCharacterId: "child_protagonist",
    },
  ],
};

const mockImageBuffer = Buffer.from("fake-png-data");

const baseBookData: BookData = {
  userId: "user-p45",
  title: "",
  theme: "test-theme",
  style: "watercolor",
  pageCount: 2,
  status: "generating",
  progress: 0,
  input: { childName: "テストくん" },
  createdAt: {} as FirebaseFirestore.Timestamp,
  expiresAt: null,
};

function createMockDeps() {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    getUserPlan: vi.fn().mockResolvedValue("free" as const),
    llmClient: {
      generateStory: vi.fn().mockResolvedValue(mockStory),
      rewriteStoryText: vi.fn().mockResolvedValue({
        pages: mockStory.pages.map((p) => ({ text: p.text })),
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

// ---------------------------------------------------------------------------
// 1. Flag ON: retry succeeds → book completes
// ---------------------------------------------------------------------------

describe("P4-5: ENABLE_SCHEMA_REPAIR_RETRY=true — retry succeeds", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.ENABLE_SCHEMA_REPAIR_RETRY = "true";
    deps = createMockDeps();
    infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
    infoSpy.mockRestore();
  });

  it("retries when first generateStory throws schema error; book completes on second call", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed)
      .mockResolvedValueOnce(mockStory);

    await processBookGeneration("p45-retry-success", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p45-retry-success", expect.stringMatching(/completed/));
    expect(deps.updateBookFailure).not.toHaveBeenCalled();
  });

  it("does not call updateBookFailureMetadata when retry succeeds", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed)
      .mockResolvedValueOnce(mockStory);

    await processBookGeneration("p45-retry-no-fail-meta", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).not.toHaveBeenCalled();
  });

  it("records schemaRepairRetryUsed: true in story generation metadata when retry succeeds", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed)
      .mockResolvedValueOnce(mockStory);

    await processBookGeneration("p45-retry-metadata", baseBookData, deps);

    expect(deps.updateBookStoryGenerationMetadata).toHaveBeenCalledWith(
      "p45-retry-metadata",
      expect.objectContaining({ schemaRepairRetryUsed: true })
    );
  });

  it("field_type_mismatch errors are retried under flag (routing gap fix verification)", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(FIELD_TYPE_MISMATCH_ERRORS.mainQuestObjectIsArray)
      .mockResolvedValueOnce(mockStory);

    await processBookGeneration("p45-type-mismatch-retry", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p45-type-mismatch-retry", expect.stringMatching(/completed/));
  });
});

// ---------------------------------------------------------------------------
// 2. Flag ON: both attempts fail → hard fail with storyGenerationAttempts: 2
// ---------------------------------------------------------------------------

describe("P4-5: ENABLE_SCHEMA_REPAIR_RETRY=true — both attempts fail", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.ENABLE_SCHEMA_REPAIR_RETRY = "true";
    deps = createMockDeps();
    infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
    infoSpy.mockRestore();
  });

  it("fails book when both attempts throw schema error", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed)
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p45-both-fail", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(2);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p45-both-fail", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("logs storyGenerationAttempts: 2 in book_early_failed when both attempts fail", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed)
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p45-both-fail-log", baseBookData, deps);

    const loggedEvent = infoSpy.mock.calls
      .map(([, payload]) => payload as Record<string, unknown>)
      .find((p) => p?.eventName === "book_early_failed");

    expect(loggedEvent).toBeDefined();
    expect(loggedEvent?.storyGenerationAttempts).toBe(2);
    expect(loggedEvent?.failureStage).toBe("schema_validation");
  });

  it("does not exceed 2 generateStory calls (no infinite loop)", async () => {
    const schemaError = MALFORMED_JSON_ERRORS.llmResponsePrefix;
    deps.llmClient.generateStory.mockRejectedValue(schemaError);

    await processBookGeneration("p45-no-infinite-loop", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(2);
  });

  it("uses failureStage: schema_validation when both retry attempts fail", async () => {
    deps.llmClient.generateStory
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed)
      .mockRejectedValueOnce(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p45-both-fail-stage", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p45-both-fail-stage",
      expect.objectContaining({ failureStage: "schema_validation" })
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Flag OFF (default): no retry, original single-attempt behavior
// ---------------------------------------------------------------------------

describe("P4-5: ENABLE_SCHEMA_REPAIR_RETRY not set — no retry", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
    deps = createMockDeps();
    infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
    infoSpy.mockRestore();
  });

  it("does not retry when ENABLE_SCHEMA_REPAIR_RETRY is not set", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p45-no-retry-flag-off", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledTimes(1);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p45-no-retry-flag-off", "failed");
  });

  it("storyGenerationAttempts is absent from book_early_failed event when flag is off", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p45-no-attempts-field", baseBookData, deps);

    const loggedEvent = infoSpy.mock.calls
      .map(([, payload]) => payload as Record<string, unknown>)
      .find((p) => p?.eventName === "book_early_failed");

    expect(loggedEvent).toBeDefined();
    expect(loggedEvent?.storyGenerationAttempts).toBeUndefined();
  });

  it("schema_validation failure with flag off uses failureStage: schema_validation (not unexpected)", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.llmResponsePrefix);

    await processBookGeneration("p45-flag-off-stage", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p45-flag-off-stage",
      expect.objectContaining({ failureStage: "schema_validation" })
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Routing gap fix (always-on, independent of flag)
// ---------------------------------------------------------------------------

describe("P4-5: field_type_mismatch routing gap fix — always-on", () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
    deps = createMockDeps();
  });

  afterEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
  });

  it("field_type_mismatch errors route to schema_validation regardless of flag", async () => {
    deps.llmClient.generateStory.mockRejectedValue(FIELD_TYPE_MISMATCH_ERRORS.mainQuestObjectIsArray);

    await processBookGeneration("p45-routing-always-on", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p45-routing-always-on",
      expect.objectContaining({ failureStage: "schema_validation" })
    );
  });

  it("forbiddenQuestObjects type mismatch routes to schema_validation regardless of flag", async () => {
    deps.llmClient.generateStory.mockRejectedValue(FIELD_TYPE_MISMATCH_ERRORS.forbiddenQuestObjectsIsString);

    await processBookGeneration("p45-routing-fqo-always-on", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p45-routing-fqo-always-on",
      expect.objectContaining({ failureStage: "schema_validation" })
    );
  });
});
