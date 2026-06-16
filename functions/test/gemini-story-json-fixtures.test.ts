/**
 * P4-3: Gemini story JSON failure fixture tests.
 *
 * Coverage:
 * 1. classifyStoryJsonFailure maps each fixture to the expected storyJsonFailureCategory.
 * 2. Errors that pass isStorySchemaValidationError route to failureStage: "schema_validation"
 *    in processBookGeneration, with storyJsonFailureCategory + storyDurationMs in the log event.
 * 3. field_type_mismatch errors (NOT in isStorySchemaValidationError keyword list) fall through
 *    to the outer catch → failureStage: "unexpected". Documents P4-1 §5 routing gap.
 * 4. quality_gate failures emit a book_early_failed log event (P4-2 fix regression coverage).
 * 5. No image generation is attempted on any story-phase failure.
 * 6. No retry is performed on schema_validation failures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "firebase-functions/logger";
import { processBookGeneration } from "../src/generate-book";
import { classifyStoryJsonFailure } from "../src/lib/generation-event-logger";
import type { BookData, GeneratedStory } from "../src/lib/types";
import {
  ALL_JSON_FAILURE_FIXTURES,
  SCHEMA_VALIDATION_ROUTED_FIXTURES,
  OUTER_CATCH_ROUTED_FIXTURES,
  MALFORMED_JSON_ERRORS,
  SCHEMA_STRUCTURAL_ERRORS,
  FIELD_VALUE_INVALID_ERRORS,
  FIELD_TYPE_MISMATCH_ERRORS,
} from "./fixtures/gemini-story-json-failures";

// ---------------------------------------------------------------------------
// Shared mock infrastructure
// ---------------------------------------------------------------------------

const mockTemplate = {
  name: "おたんじょうび",
  description: "誕生日",
  icon: "🎂",
  order: 1,
  creationMode: "guided_ai" as const,
  priceTier: "take" as const,
  storyCostLevel: "standard" as const,
  systemPrompt: "誕生日テーマで物語を作って",
  active: true,
  sampleImageUrl: "/images/templates/animals.webp",
};

const baseBookData: BookData = {
  userId: "p43-test-user",
  title: "",
  theme: "birthday",
  style: "watercolor",
  pageCount: 2,
  status: "generating",
  progress: 0,
  input: { childName: "テスト" },
  createdAt: {} as FirebaseFirestore.Timestamp,
  expiresAt: null,
};

/** A story thin enough to always fail the quality gate (both retries) */
const thinStory: GeneratedStory = {
  title: "p43 thin story",
  characterBible: "child with short hair",
  styleBible: "watercolor style",
  storyGoal: "find the star",
  mainQuestObject: "star",
  forbiddenQuestObjects: ["watermelon"],
  storyModel: "gemini-2.5-flash-lite",
  storyModelFallbackUsed: false,
  storyGenerationAttempts: 1,
  pages: [
    { text: "たのしいね。", imagePrompt: "short image prompt" },
    { text: "うれしいね。", imagePrompt: "short image prompt" },
  ],
};

function createMockDeps() {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    getUserPlan: vi.fn().mockResolvedValue("free" as const),
    llmClient: {
      generateStory: vi.fn(),
      rewriteStoryText: vi.fn().mockResolvedValue({
        pages: [{ text: "テスト。" }, { text: "テスト。" }],
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      }),
    },
    imageClient: { generateImage: vi.fn().mockResolvedValue(Buffer.from("fake-png")) },
    uploadImage: vi.fn().mockResolvedValue("https://storage.example.com/img.png"),
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

// ---------------------------------------------------------------------------
// 1. classifyStoryJsonFailure — fixture coverage
// ---------------------------------------------------------------------------

describe("classifyStoryJsonFailure fixture coverage (P4-3)", () => {
  it.each(ALL_JSON_FAILURE_FIXTURES)(
    "$description → $expectedCategory",
    ({ error, expectedCategory }) => {
      expect(classifyStoryJsonFailure(error)).toBe(expectedCategory);
    }
  );

  it("returned category is always a non-empty string (safe enum value)", () => {
    for (const { error } of ALL_JSON_FAILURE_FIXTURES) {
      const category = classifyStoryJsonFailure(error);
      expect(typeof category).toBe("string");
      expect(category.length).toBeGreaterThan(0);
    }
  });

  it("never returns a value containing raw prompt or child name text", () => {
    for (const { error } of ALL_JSON_FAILURE_FIXTURES) {
      const category = classifyStoryJsonFailure(error);
      // Category must be an enum token, not a raw error message re-echo
      expect(category).not.toContain("parse");
      expect(category).not.toContain("テスト");
      expect(category).not.toContain("Error");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. processBookGeneration — schema_validation path
//    (errors that pass isStorySchemaValidationError)
// ---------------------------------------------------------------------------

describe("processBookGeneration schema_validation path (P4-3)", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    deps = createMockDeps();
    infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("routes 'Failed to parse LLM JSON response' to schema_validation with malformed_json category", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p43-malformed", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-malformed",
      expect.objectContaining({
        failureStage: "schema_validation",
        failureProvider: "gemini",
        retryable: false,
      })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-malformed", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("routes 'LLM response' prefix error to schema_validation", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.llmResponsePrefix);

    await processBookGeneration("p43-llm-prefix", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-llm-prefix",
      expect.objectContaining({ failureStage: "schema_validation", retryable: false })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-llm-prefix", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("routes 'Each page must' error to schema_validation with schema_structural category", async () => {
    deps.llmClient.generateStory.mockRejectedValue(SCHEMA_STRUCTURAL_ERRORS.eachPageMustHaveImagePrompt);

    await processBookGeneration("p43-each-page", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-each-page",
      expect.objectContaining({ failureStage: "schema_validation", retryable: false })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-each-page", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("routes 'narrativeDevice' error to schema_validation", async () => {
    deps.llmClient.generateStory.mockRejectedValue(SCHEMA_STRUCTURAL_ERRORS.narrativeDeviceMissingField);

    await processBookGeneration("p43-narrative", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-narrative",
      expect.objectContaining({ failureStage: "schema_validation", retryable: false })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-narrative", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("routes 'pageVisualRole' error to schema_validation with field_value_invalid category", async () => {
    deps.llmClient.generateStory.mockRejectedValue(FIELD_VALUE_INVALID_ERRORS.pageVisualRoleInvalid);

    await processBookGeneration("p43-pvrole", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-pvrole",
      expect.objectContaining({ failureStage: "schema_validation", retryable: false })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-pvrole", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("schema_validation log event includes storyJsonFailureCategory and storyDurationMs (P4-2 fields)", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p43-log-fields", baseBookData, deps);

    // Find the book_early_failed log event
    const loggedEvent = infoSpy.mock.calls
      .map(([, payload]) => payload as Record<string, unknown>)
      .find((p) => p?.eventName === "book_early_failed" && p?.failureStage === "schema_validation");

    expect(loggedEvent).toBeDefined();
    expect(loggedEvent?.storyJsonFailureCategory).toBe("malformed_json");
    expect(typeof loggedEvent?.storyDurationMs).toBe("number");
    expect((loggedEvent?.storyDurationMs as number)).toBeGreaterThanOrEqual(0);
    // Privacy: no raw error message, child name, or userId in logged event
    expect(JSON.stringify(loggedEvent)).not.toContain("Unexpected token");
    expect(JSON.stringify(loggedEvent)).not.toContain("テスト");
    expect(JSON.stringify(loggedEvent)).not.toContain("p43-test-user");
  });

  it("does not retry on schema_validation failures (generateStory called exactly once)", async () => {
    deps.llmClient.generateStory.mockRejectedValue(MALFORMED_JSON_ERRORS.jsonParseFailed);

    await processBookGeneration("p43-no-retry", baseBookData, deps);

    expect(deps.llmClient.generateStory).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 3. processBookGeneration — field_type_mismatch routing (P4-5 gap fix)
//    P4-5 extended isStorySchemaValidationError to cover "must be a string/array/..."
//    keywords, so these errors now route to schema_validation instead of outer catch.
// ---------------------------------------------------------------------------

describe("processBookGeneration field_type_mismatch routing — schema_validation (P4-5 gap fix)", () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
    // Ensure retry flag is OFF so we test routing behavior without retry
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
  });

  afterEach(() => {
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
  });

  it("'mainQuestObject must be a string' routes to schema_validation (P4-5 routing gap fix)", async () => {
    deps.llmClient.generateStory.mockRejectedValue(FIELD_TYPE_MISMATCH_ERRORS.mainQuestObjectIsArray);

    await processBookGeneration("p43-type-mismatch-main", baseBookData, deps);

    // P4-5: now routes to schema_validation (not outer catch)
    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-type-mismatch-main",
      expect.objectContaining({ failureStage: "schema_validation" })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-type-mismatch-main", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });

  it("'forbiddenQuestObjects must be an array' routes to schema_validation (P4-5 routing gap fix)", async () => {
    deps.llmClient.generateStory.mockRejectedValue(FIELD_TYPE_MISMATCH_ERRORS.forbiddenQuestObjectsIsString);

    await processBookGeneration("p43-type-mismatch-fqo", baseBookData, deps);

    expect(deps.updateBookFailureMetadata).toHaveBeenCalledWith(
      "p43-type-mismatch-fqo",
      expect.objectContaining({ failureStage: "schema_validation" })
    );
    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-type-mismatch-fqo", "failed");
  });

  it("fixture metadata: OUTER_CATCH_ROUTED_FIXTURES is empty after P4-5 routing gap fix", () => {
    // After P4-5, all field_type_mismatch errors are routed to schema_validation.
    expect(OUTER_CATCH_ROUTED_FIXTURES).toHaveLength(0);
  });

  it("fixture metadata: SCHEMA_VALIDATION_ROUTED_FIXTURES covers all 7 failure scenarios", () => {
    expect(SCHEMA_VALIDATION_ROUTED_FIXTURES).toHaveLength(ALL_JSON_FAILURE_FIXTURES.length);
  });
});

// ---------------------------------------------------------------------------
// 4. processBookGeneration — quality_gate logGenerationEvent (P4-2 fix coverage)
//    Verifies the previously-missing logGenerationEvent call on quality_gate path
// ---------------------------------------------------------------------------

describe("processBookGeneration quality_gate logGenerationEvent (P4-2 fix, P4-3 regression)", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    deps = createMockDeps();
    infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
    // Both retries return a thin story so the quality gate always fails
    deps.llmClient.generateStory
      .mockResolvedValueOnce(thinStory)
      .mockResolvedValueOnce(thinStory);
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("emits book_early_failed with failureStage: quality_gate after both retries exhaust", async () => {
    await processBookGeneration("p43-quality-gate", baseBookData, deps);

    const loggedEvent = infoSpy.mock.calls
      .map(([, payload]) => payload as Record<string, unknown>)
      .find((p) => p?.eventName === "book_early_failed" && p?.failureStage === "quality_gate");

    expect(loggedEvent).toBeDefined();
    expect(loggedEvent?.failureStage).toBe("quality_gate");
    expect(loggedEvent?.errorCategory).toBe("validation");
    expect(loggedEvent?.retryable).toBe(false);
  });

  it("quality_gate log event includes storyDurationMs (P4-2 field)", async () => {
    await processBookGeneration("p43-quality-gate-duration", baseBookData, deps);

    const loggedEvent = infoSpy.mock.calls
      .map(([, payload]) => payload as Record<string, unknown>)
      .find((p) => p?.eventName === "book_early_failed" && p?.failureStage === "quality_gate");

    expect(loggedEvent).toBeDefined();
    expect(typeof loggedEvent?.storyDurationMs).toBe("number");
    expect((loggedEvent?.storyDurationMs as number)).toBeGreaterThanOrEqual(0);
  });

  it("quality_gate failure sets book status to failed and does not start image generation", async () => {
    await processBookGeneration("p43-quality-gate-no-img", baseBookData, deps);

    expect(deps.updateBookStatus).toHaveBeenCalledWith("p43-quality-gate-no-img", "failed");
    expect(deps.imageClient.generateImage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Fixture metadata consistency self-checks
// ---------------------------------------------------------------------------

describe("gemini-story-json-failures fixture metadata (P4-3)", () => {
  it("SCHEMA_VALIDATION_ROUTED_FIXTURES all have passesSchemaValidationCheck: true", () => {
    for (const f of SCHEMA_VALIDATION_ROUTED_FIXTURES) {
      expect(f.passesSchemaValidationCheck).toBe(true);
    }
  });

  it("ALL_JSON_FAILURE_FIXTURES covers malformed_json, schema_structural, field_value_invalid, field_type_mismatch categories", () => {
    const categories = new Set(ALL_JSON_FAILURE_FIXTURES.map((f) => f.expectedCategory));
    expect(categories).toContain("malformed_json");
    expect(categories).toContain("schema_structural");
    expect(categories).toContain("field_value_invalid");
    expect(categories).toContain("field_type_mismatch");
  });

  it("each fixture error has a non-empty message and no PII", () => {
    for (const { error, description } of ALL_JSON_FAILURE_FIXTURES) {
      expect(error.message.length, `${description}: message must not be empty`).toBeGreaterThan(0);
      expect(error.message, `${description}: must not contain child name`).not.toContain("テスト");
      expect(error.message, `${description}: must not contain user ID`).not.toContain("p43-test-user");
    }
  });
});
