/**
 * P4-3: Test fixtures for Gemini story JSON failure scenarios.
 *
 * Each fixture is a realistic Error object with a message matching patterns thrown by
 * GeminiClient.generateStory() or the story schema validation layer in generate-book.ts.
 *
 * Routing key (two independent functions govern behaviour):
 *
 *   isStorySchemaValidationError(err)  [private, in generate-book.ts]
 *     Keyword match: "Failed to parse LLM JSON response" | "LLM response" |
 *                    "Each page must" | "narrativeDevice" | "pageVisualRole"
 *     → true  → processBookGeneration routes to failureStage: "schema_validation"
 *     → false → falls through to outer catch → failureStage: "unexpected"
 *
 *   classifyStoryJsonFailure(err)  [exported, in generation-event-logger.ts]
 *     Called only on the schema_validation branch; returns StoryJsonFailureCategory enum.
 *
 * Privacy: no child names, user IDs, story text, or real PII in any fixture.
 */

// ---------------------------------------------------------------------------
// Category: malformed_json
// isStorySchemaValidationError → true  (via "Failed to parse LLM JSON response" / "LLM response")
// classifyStoryJsonFailure     → "malformed_json"
// processBookGeneration path   → failureStage: "schema_validation"
// ---------------------------------------------------------------------------

export const MALFORMED_JSON_ERRORS = {
  /** Raw JSON.parse threw inside GeminiClient */
  jsonParseFailed: new Error(
    "Failed to parse LLM JSON response: Unexpected token < in JSON at position 0"
  ),
  /** GeminiClient wraps non-JSON output with "LLM response" prefix */
  llmResponsePrefix: new Error(
    "LLM response was not valid JSON — output was not parseable as expected structure"
  ),
} as const;

// ---------------------------------------------------------------------------
// Category: schema_structural
// isStorySchemaValidationError → true  (via "Each page must" / "narrativeDevice")
// classifyStoryJsonFailure     → "schema_structural"
// processBookGeneration path   → failureStage: "schema_validation"
// ---------------------------------------------------------------------------

export const SCHEMA_STRUCTURAL_ERRORS = {
  /** Page array is present but individual pages are malformed */
  eachPageMustHaveImagePrompt: new Error(
    "Each page must have an imagePrompt field"
  ),
  /** Required narrativeDevice section missing or malformed */
  narrativeDeviceMissingField: new Error(
    "narrativeDevice is missing required repeatedPhrase field"
  ),
} as const;

// ---------------------------------------------------------------------------
// Category: field_value_invalid
// isStorySchemaValidationError → true  (via "pageVisualRole")
// classifyStoryJsonFailure     → "field_value_invalid"
// processBookGeneration path   → failureStage: "schema_validation"
// ---------------------------------------------------------------------------

export const FIELD_VALUE_INVALID_ERRORS = {
  /** pageVisualRole enum value outside the allowed set */
  pageVisualRoleInvalid: new Error(
    "pageVisualRole value 'unknown_scene_type' is not valid"
  ),
} as const;

// ---------------------------------------------------------------------------
// Category: field_type_mismatch
// isStorySchemaValidationError → FALSE (keywords not in the keyword list)
// classifyStoryJsonFailure     → "field_type_mismatch" (if called directly)
// processBookGeneration path   → outer catch → failureStage: "unexpected"
//
// Known gap documented in P4-1 §5. These errors are correctly classified by
// classifyStoryJsonFailure but are NOT routed through the schema_validation
// branch. P4-5 (schema repair retry) will extend isStorySchemaValidationError
// to cover type-mismatch keywords.
// ---------------------------------------------------------------------------

export const FIELD_TYPE_MISMATCH_ERRORS = {
  /** mainQuestObject received as array instead of string */
  mainQuestObjectIsArray: new Error(
    "'mainQuestObject' must be a string when provided, received array"
  ),
  /** forbiddenQuestObjects received as string instead of array */
  forbiddenQuestObjectsIsString: new Error(
    "forbiddenQuestObjects must be an array"
  ),
} as const;

// ---------------------------------------------------------------------------
// Aggregate exports for parameterized tests
// ---------------------------------------------------------------------------

/**
 * Fixtures that pass isStorySchemaValidationError → failureStage: "schema_validation".
 * Each entry specifies the expected storyJsonFailureCategory.
 */
export interface JsonFailureFixture {
  readonly description: string;
  readonly error: Error;
  readonly expectedCategory: "malformed_json" | "schema_structural" | "field_value_invalid" | "field_type_mismatch" | "unknown";
  /** Whether isStorySchemaValidationError() returns true for this error */
  readonly passesSchemaValidationCheck: boolean;
}

export const ALL_JSON_FAILURE_FIXTURES: JsonFailureFixture[] = [
  {
    description: "JSON parse failed (Failed to parse LLM JSON response)",
    error: MALFORMED_JSON_ERRORS.jsonParseFailed,
    expectedCategory: "malformed_json",
    passesSchemaValidationCheck: true,
  },
  {
    description: "LLM response prefix (LLM response was not valid JSON)",
    error: MALFORMED_JSON_ERRORS.llmResponsePrefix,
    expectedCategory: "malformed_json",
    passesSchemaValidationCheck: true,
  },
  {
    description: "Page array structure error (Each page must)",
    error: SCHEMA_STRUCTURAL_ERRORS.eachPageMustHaveImagePrompt,
    expectedCategory: "schema_structural",
    passesSchemaValidationCheck: true,
  },
  {
    description: "narrativeDevice structural error",
    error: SCHEMA_STRUCTURAL_ERRORS.narrativeDeviceMissingField,
    expectedCategory: "schema_structural",
    passesSchemaValidationCheck: true,
  },
  {
    description: "pageVisualRole enum value invalid",
    error: FIELD_VALUE_INVALID_ERRORS.pageVisualRoleInvalid,
    expectedCategory: "field_value_invalid",
    passesSchemaValidationCheck: true,
  },
  {
    description: "mainQuestObject type mismatch (not in isStorySchemaValidationError)",
    error: FIELD_TYPE_MISMATCH_ERRORS.mainQuestObjectIsArray,
    expectedCategory: "field_type_mismatch",
    passesSchemaValidationCheck: false,
  },
  {
    description: "forbiddenQuestObjects type mismatch (not in isStorySchemaValidationError)",
    error: FIELD_TYPE_MISMATCH_ERRORS.forbiddenQuestObjectsIsString,
    expectedCategory: "field_type_mismatch",
    passesSchemaValidationCheck: false,
  },
];

/** Fixtures that go through the schema_validation branch */
export const SCHEMA_VALIDATION_ROUTED_FIXTURES = ALL_JSON_FAILURE_FIXTURES.filter(
  (f) => f.passesSchemaValidationCheck
);

/** Fixtures that fall through to the outer catch */
export const OUTER_CATCH_ROUTED_FIXTURES = ALL_JSON_FAILURE_FIXTURES.filter(
  (f) => !f.passesSchemaValidationCheck
);
