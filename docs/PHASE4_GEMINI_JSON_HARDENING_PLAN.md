# Phase 4 — Gemini Story JSON Hardening Plan

**Created**: 2026-05-20
**Status**: P4-1 inventory and design COMPLETE (docs-only)
**Author**: P4-1 task
**Depends on**: [PHASE3_IMAGE_PROVIDER_CLOSURE.md](PHASE3_IMAGE_PROVIDER_CLOSURE.md), [PHASE2_GENERATION_SLO_PLAN.md](PHASE2_GENERATION_SLO_PLAN.md), [GENERATION_SLO_RUNBOOK.md](GENERATION_SLO_RUNBOOK.md), [GENERATION_SLO_THRESHOLD_POLICY.md](GENERATION_SLO_THRESHOLD_POLICY.md)

---

## 1. Purpose

P4-1 targets **story JSON generation and schema validation failures** that occur *before* image generation begins.

These failures are distinct from the Phase 3 `ImageProvider` adapter migration. P3 closed the page-image generation path — both `ReplicateImageAdapter` and `OpenAIImageAdapter` are now wired and verified. P4 focuses on hardening the upstream Gemini story-generation step that feeds the image pipeline.

### 1.1 Scope boundary

| Scope | In P4-1? |
|---|---|
| Gemini story JSON parsing / schema validation failures | ✅ Yes |
| `schema_validation` / `quality_gate` `book_early_failed` events | ✅ Yes |
| Story generation retry / repair strategies (design only) | ✅ Yes (design) |
| Runtime code changes to generation or prompts | ❌ No — docs-first |
| ImageProvider adapter routing | ❌ No — P3 complete |
| Candidate gate behavior | ❌ No — unchanged |
| Firestore schema migration | ❌ No |
| Firebase deploy | ❌ No |

**This task is docs-first and does not change runtime behavior.**

---

## 2. Observed Failures

### 2.1 P3-15s Smoke Observation

During the P3-15s production smoke (2026-05-20, Scenario A), the following failure occurred on the **first attempt** before image generation:

| Field | Value |
|---|---|
| `failureStage` | `schema_validation` |
| `failureProvider` | `gemini` |
| `errorCategory` | `validation` |
| `retryable` | `false` |
| Error message | `Failed to parse LLM JSON response` |
| Retry outcome | Manual retry succeeded — story generated correctly on second attempt |

A related validation error observed in the P3-14s run:

| Field | Value |
|---|---|
| Error message | `'mainQuestObject' must be a string when provided` |
| Stage | story JSON validation (post-parse, pre-image) |
| Classification | Schema field type mismatch |

### 2.2 Classification

These failures are classified as **pre-existing Gemini story quality gate / JSON parse issues**. They are:

- **Not** a P3 ImageProvider adapter regression.
- **Not** caused by the Replicate or OpenAI adapter paths.
- Present before the P3 cutover.
- Intermittent — retrying with the same input often succeeds.

### 2.3 Failure Characteristics

- Occur in `generateStoryWithQualityGate()` before any image adapter is invoked.
- Gemini returns output that either (a) cannot be parsed as JSON or (b) parses but fails structural validation (`mainQuestObject` type, `pageVisualRole` enum, `narrativeDevice` shape, etc.).
- The current hard-fail path sets `bookStatus = "failed"` with `failureStage = "schema_validation"`.
- Manual retry is the only recovery mechanism today.
- Impact: book reaches `"failed"` status; user receives no book. This is the **worst user experience** scenario.

---

## 3. Current Story Generation Flow Inventory

### 3.1 Entry Point

```
processBookGeneration()            [generate-book.ts ~L969]
  │
  ├─ [Input validation]            [sanitizeInput(), ~L1200]
  │     → failureStage: "validation"
  │
  ├─ [Candidate gate]              [gateImageModelProfile(), ~L940]
  │
  ├─ [Story generation]
  │     fixed_template:  generateFixedTemplateStoryWithQualityReport()  [~L2016]
  │     guided_ai / original_ai:  generateStoryWithQualityGate()        [~L1826]
  │           → LLM call:  llmClient.generateStory()
  │           → Parse + normalize:  normalizeStoryForBook()
  │           → Validate:  validateGeneratedStoryQuality()
  │           → Retry (quality): appendQualityRetryInstruction() + generateStory()
  │           → Rewrite passes: llmClient.rewriteStoryText() (premium / original_ai)
  │
  └─ [Image generation]            [generatePageImageWithFallback(), per page]
```

### 3.2 Prompt Construction

**Function**: `buildSystemPrompt()` in `functions/src/lib/prompt-builder.ts`

Key sections emitted:
- Template `systemPrompt` text
- Age reading guidance (`targetCharsPerPage`, `vocabularyLevel`, `kanjiPolicy`, etc.)
- Constraints (`styleBible`, `characterBible`, image prompt rules)
- Full JSON output schema with example values and field-type annotations
- `pageVisualRole` enum values listed explicitly

Quality retry extension: `appendQualityRetryInstruction()` appends issue list from `StoryQualityReport.issues` to the system prompt before the second generation attempt.

### 3.3 Raw LLM Output Parsing

**Location**: Inside `GeminiClient.generateStory()` (not directly in `generate-book.ts`).

The client returns a typed `GeneratedStory` object. JSON parsing, field extraction, and initial type coercion happen inside the client implementation. If parsing fails, the client throws an `Error` whose message contains one of the sentinel strings checked by `isStorySchemaValidationError()`.

### 3.4 Schema Validation

**Function**: `validateGeneratedStoryQuality()` in `functions/src/lib/story-quality.ts`

- Returns `{ ok: boolean, issues: StoryQualityIssue[] }`.
- Checks: text length, sentence count, `storyGoal`, `mainQuestObject`, `narrativeDevice` presence, `compositionHint`, `pageVisualRole`, age-band consistency.
- Called after each generation attempt (initial + quality retry) and after each rewrite pass.

### 3.5 Schema Validation Error Detection (current)

**Function**: `isStorySchemaValidationError(err)` in `generate-book.ts` (~L464)

```typescript
function isStorySchemaValidationError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes("Failed to parse LLM JSON response") ||
    err.message.includes("LLM response") ||
    err.message.includes("Each page must") ||
    err.message.includes("narrativeDevice") ||
    err.message.includes("pageVisualRole")
  );
}
```

This is a **keyword-based string match**. It does not distinguish:
- Parse failure (invalid JSON) from structural validation failure (wrong field type)
- Transient Gemini model error from a deterministic schema drift
- Which specific field caused the failure

### 3.6 Error Handling and `failureStage` Assignment

| Error type | Handler | `failureStage` | `errorCategory` | `retryable` |
|---|---|---|---|---|
| `GeminiServiceUnavailableError` or `isRetryableGeminiFailure()` | `processBookGeneration()` catch | `story_generation` | `provider_error` | `true` |
| `isStorySchemaValidationError()` | `processBookGeneration()` catch | `schema_validation` | `validation` | `false` |
| Quality gate final failure | `processBookGeneration()` quality check | `quality_gate` | `validation` | `false` |
| Input validation failure | Pre-story block | `validation` | `validation` | — |
| Unexpected error | Final catch | `unexpected` | `unknown` | — |

### 3.7 Retry / Fallback (current)

| Stage | Retry exists? | Mechanism |
|---|---|---|
| JSON parse failure (`schema_validation`) | ❌ No | Hard fail immediately |
| Quality gate failure (thin content, missing fields) | ✅ Yes | One quality-retry with `appendQualityRetryInstruction()` appended to prompt |
| Rewrite pass (text quality) | ✅ Yes | Up to 2 passes for premium/original_ai; 1 pass for guided_ai |
| Retryable Gemini 5xx | ❌ No auto-retry | Hard fail; `retryable: true` set for external/manual retry |

**Key gap**: JSON parse failures and structural type errors (`schema_validation`) have **no automatic retry**. They fail the entire book immediately.

### 3.8 Logging

Story validation failures appear in Cloud Logging as `book_early_failed` events:

```json
{
  "eventName": "book_early_failed",
  "failureStage": "schema_validation",
  "failureProvider": "gemini",
  "errorCategory": "validation",
  "retryable": false
}
```

**Gaps in current logging**:
- `errorCategory: "validation"` groups input validation, schema parse failures, and quality gate failures under a single bucket — no sub-classification.
- No `geminiModel` field on `book_early_failed` events (which model produced the bad response?).
- No `attemptCount` field on `book_early_failed` (was this the first attempt or after a retry?).
- Story generation latency (`storyDurationMs`) is not emitted as a generation event.
- SLO report (`slo-metrics.ts`) does not separately aggregate `schema_validation` vs `quality_gate` vs `story_generation` failure counts — all roll up into `failedBooks`.

### 3.9 Firestore Storage

| Field | Set when | Notes |
|---|---|---|
| `failureStage` | Book fails | `"schema_validation"` \| `"quality_gate"` \| `"story_generation"` \| `"validation"` \| `"image_generation"` \| `"unexpected"` |
| `failureReason` | Book fails | Currently `"unknown"` for schema_validation |
| `technicalErrorMessage` | Book fails | Raw error message string (not logged to Cloud Logging) |
| `storyModel` | Story succeeds | Which Gemini model was used |
| `storyGenerationAttempts` | Story succeeds | Number of generation attempts |

`technicalErrorMessage` is stored in Firestore (not emitted to logs) and may contain raw Gemini error output. It should never include child name, story text, or user PII — confirm in P4-2 logging hardening.

---

## 4. Failure Taxonomy Proposal

### 4.1 Proposed Story JSON Failure Categories

| Category | Code | Description | Example |
|---|---|---|---|
| Malformed JSON | `malformed_json` | LLM output is not parseable JSON (truncated, escaped incorrectly, wrapped in markdown) | `"Failed to parse LLM JSON response"` |
| Schema structural violation | `schema_structural` | JSON parses but required top-level fields are absent (`title`, `pages`, `cast`, `narrativeDevice`) | Missing `narrativeDevice` object |
| Field type mismatch | `field_type_mismatch` | Field present but wrong type (number/array/null where string expected) | `mainQuestObject: null` or `mainQuestObject: ["item1"]` |
| Field value invalid | `field_value_invalid` | Type correct but value fails enum or range check | `pageVisualRole: "unknown_role"` |
| Content policy / safety refusal | `unsafe_or_policy` | LLM declined to generate (safety filter, content policy) | Gemini refusal block in response |
| Provider error | `provider_error` | Gemini API returned 4xx/5xx or network error | `[503] Service Unavailable` |
| Timeout | `timeout` | Story generation exceeded time budget | No explicit timeout today — gap |
| Unknown | `unknown` | Classification not possible from available signals | Catch-all |

### 4.2 Mapping Observed Errors

| Observed error | Proposed category | Current category |
|---|---|---|
| `"Failed to parse LLM JSON response"` | `malformed_json` | `validation` (undifferentiated) |
| `'mainQuestObject' must be a string when provided` | `field_type_mismatch` | `validation` (undifferentiated) |
| `"Each page must"` | `schema_structural` | `validation` (undifferentiated) |
| `"narrativeDevice"` | `schema_structural` | `validation` (undifferentiated) |
| `"pageVisualRole"` | `field_value_invalid` | `validation` (undifferentiated) |
| `GeminiServiceUnavailableError` | `provider_error` | `provider_error` ✅ |
| Quality gate thin content | (not a parse error — see §3.6) | `validation` via `quality_gate` stage |

### 4.3 SLO Report Integration

The `generation-event-logger.ts` `ErrorCategory` type currently has `"validation"` as a single bucket. A `storyJsonFailureCategory` sub-field on `book_early_failed` would allow the SLO report to break down:

```
schema_validation events:
  malformed_json:      N
  field_type_mismatch: N
  schema_structural:   N
  field_value_invalid: N
  unknown:             N
```

This is not yet implemented — it is a target for P4-2.

---

## 5. Candidate Hardening Strategies

### 5.1 Stricter JSON-only Prompt Instruction

**Description**: Reinforce in `buildSystemPrompt()` that the response must be a raw JSON object with no markdown fencing, no preamble, no trailing text.

| | Detail |
|---|---|
| **Benefit** | Reduces `malformed_json` caused by LLM wrapping output in ` ```json ``` ` blocks |
| **Risk** | Minimal — purely additive instruction. Gemini already follows JSON instructions well in most cases |
| **Complexity** | Low — single line addition to prompt template |
| **Privacy** | None — prompt instruction only; no PII |
| **Testability** | High — `prompt-builder.test.ts` can assert presence of instruction string |

**Verdict**: Safe, low-cost. Recommended for P4-7 (prompt tuning) after metrics confirm malformed_json is the dominant category.

---

### 5.2 Schema Reminder / Field Type Examples

**Description**: Add inline type annotations and constraints to the JSON schema example in `buildSystemPrompt()`. E.g., annotate `"mainQuestObject": "string (single item, not array)"`.

| | Detail |
|---|---|
| **Benefit** | Reduces `field_type_mismatch` (e.g., `mainQuestObject` as array or null) |
| **Risk** | Prompt length increases slightly; may compete with other instructions for attention |
| **Complexity** | Low-medium — edit prompt template, update prompt-builder tests |
| **Privacy** | None |
| **Testability** | High — assert type annotation strings appear in prompt output |

**Verdict**: Good candidate for P4-7 after classification data from P4-2 confirms field_type_mismatch frequency.

---

### 5.3 JSON Extraction / Repair Parser

**Description**: Add a safe helper (`extractJsonFromLLMResponse()`) that attempts to recover parseable JSON from a response that contains markdown fencing, leading text, or trailing commentary before throwing a hard parse error.

| | Detail |
|---|---|
| **Benefit** | Recovers from the most common `malformed_json` case (` ```json ``` ` wrapping) without a second LLM call |
| **Risk** | May silently accept partially-valid JSON that appears correct but contains semantic errors. Repair logic must be minimal and conservative — only strip wrapping, not repair field values |
| **Complexity** | Medium — new helper with its own unit tests; must be wired into `GeminiClient.generateStory()` (or a wrapper in generate-book.ts) |
| **Privacy** | The raw LLM response string passes through the repair function. It must not be logged — only parsed. Existing constraint preserved |
| **Testability** | High — pure function; testable with fixture strings in unit tests without any provider calls |

**Verdict**: Highest ROI hardening for `malformed_json`. Implement in P4-4 as test-only helper first, then wire in P4-5.

---

### 5.4 One-Shot Validation Repair Retry

**Description**: When `isStorySchemaValidationError()` fires (currently hard-fail), attempt one automatic re-generation with the same prompt before escalating to `"failed"`. Optionally include the validation error detail as a repair instruction.

| | Detail |
|---|---|
| **Benefit** | Converts intermittent parse failures into successful books without user-visible failure. P3-15s-A evidence: retry succeeded on manual retry |
| **Risk** | Adds 1 additional Gemini call per schema failure, increasing cost and latency. Must be capped at 1 retry — no infinite loop risk. Must not retry deterministic schema drift (would waste cost without helping) |
| **Complexity** | Medium — modify catch block in `processBookGeneration()` or `generateStoryWithQualityGate()` to add retry path; add flag to enable |
| **Privacy** | Retry prompt must not include child name, story text, or PII in error detail. Repair instruction should reference field names only (e.g., `"mainQuestObject must be a string"`) |
| **Testability** | High — mock `llmClient.generateStory()` to throw on first call, succeed on second; assert `storyGenerationAttempts = 2` |

**Verdict**: Most impactful reliability improvement. Target for P4-5 behind a runtime flag (`ENABLE_SCHEMA_REPAIR_RETRY`). Requires P4-2 logging to measure before/after.

---

### 5.5 Validation-Aware Retry with Targeted Repair Prompt

**Description**: Extension of 5.4 — include the specific validation error (field name + expected type) in the retry prompt as a structured JSON correction instruction.

| | Detail |
|---|---|
| **Benefit** | Higher retry success rate for deterministic field type errors (e.g., always returns `mainQuestObject: null`) |
| **Risk** | More complex prompt construction; repair prompt may introduce regressions in other fields if not carefully scoped. Field names in retry prompt could expose schema details but not PII |
| **Complexity** | High — requires structured error extraction from `isStorySchemaValidationError()`, targeted prompt builder extension |
| **Privacy** | Repair prompt must not include field *values* (which could contain child name or story content) — only field *names* and *expected types* |
| **Testability** | Medium — requires fixtures for each error category |

**Verdict**: Deferred until P4-4 taxonomy data shows specific field errors are dominant. More complexity than benefit at this stage.

---

### 5.6 Fallback to Simpler Story Structure

**Description**: On persistent schema validation failure, attempt generation with a reduced prompt (fewer pages, simpler schema, no optional fields).

| | Detail |
|---|---|
| **Benefit** | Last-resort recovery when full schema generation consistently fails |
| **Risk** | High — simplified story may produce lower quality output that passes validation but fails creative intent. Difficult to detect quality regressions. Would need its own quality gate |
| **Complexity** | High — requires a second prompt template, quality gate tuning for simplified output |
| **Privacy** | Same constraints as main generation |
| **Testability** | Medium |

**Verdict**: Not recommended at this time. Accepting a degraded story without the user's knowledge is worse than a `partial_completed` with a retry option. Revisit if overall failure rate persists above 5% after P4-4/P4-5.

---

### 5.7 Logging Improvement

**Description**: Add sub-category field `storyJsonFailureCategory` (from the taxonomy in §4) to `book_early_failed` events. Add `storyDurationMs` and `geminiModel` fields to `book_early_failed`.

| | Detail |
|---|---|
| **Benefit** | Enables SLO report to distinguish `malformed_json` (transient/fixable) from `field_type_mismatch` (systematic/requires prompt fix) from `provider_error` (external). Enables cost/latency analysis for story generation separate from image generation |
| **Risk** | Low — additive log fields only. Must verify no PII leaks through new fields |
| **Complexity** | Low — add optional fields to `GenerationEventPayload` type and emit at failure site |
| **Privacy** | New fields must be system metadata only (`geminiModel` = model name string; `storyDurationMs` = number; `storyJsonFailureCategory` = enum string). No prompt, no child name, no story text |
| **Testability** | High — `generation-event-logger.test.ts` fixture tests |

**Verdict**: Foundational prerequisite for all other strategies. Implement first as P4-2.

---

### 5.8 Smoke Fixture Expansion

**Description**: Add test fixtures for malformed and wrong-type Gemini responses in `generate-book.test.ts`. Currently the test suite covers quality gate failure but not raw JSON parse failure or field type mismatch.

| | Detail |
|---|---|
| **Benefit** | Prevents regression of any hardening code added in P4-4/P4-5; locks expected behavior for each error category |
| **Risk** | Low — test-only change |
| **Complexity** | Low — add mock `llmClient.generateStory()` implementations that throw specific errors |
| **Privacy** | Test fixtures must not contain real child names or real story content |
| **Testability** | Inherently testable — this is the test strategy itself |

**Verdict**: Required for any code change in P4-4+. Implement in P4-3.

---

## 6. Recommended Staged Plan

### P4-1 — Inventory and Design (this document) ✅ COMPLETE

**Deliverable**: `docs/PHASE4_GEMINI_JSON_HARDENING_PLAN.md`
**Runtime change**: None

---

### P4-2 — Structured Story Validation Error Taxonomy / Logging

**Goal**: Add sub-classification of story JSON failures to `book_early_failed` events so the SLO report can distinguish `malformed_json` from `field_type_mismatch` etc.

**Changes**:
- Add `storyJsonFailureCategory: StoryJsonFailureCategory` optional field to `GenerationEventPayload` in `generation-event-logger.ts`
- Update `isStorySchemaValidationError()` classification in `generate-book.ts` to extract category
- Add `storyDurationMs` (story generation wall time) to `book_early_failed` and `book_outcome` events
- Update `generation-event-logger.test.ts` fixtures

**Constraints**:
- No raw error message text in logs
- No child name / story text / prompt in logs
- `storyJsonFailureCategory` is an enum string — system metadata only

**Acceptance criteria**:
- `generation-event-logger.test.ts` covers all `StoryJsonFailureCategory` values
- `npm run check:phase2` continues to pass
- No production code change outside logging layer

---

### P4-3 — Unit Fixtures for Malformed / Wrong-Type Gemini Responses ✅ COMPLETE

**Goal**: Add test cases that cover raw JSON parse failure, field type mismatch, and structural schema violation.

**Implemented (commit `test(P4-3)`)**:

**Fixture file**: `functions/test/fixtures/gemini-story-json-failures.ts`
- `MALFORMED_JSON_ERRORS` — `"Failed to parse LLM JSON response"`, `"LLM response"` prefix → `malformed_json`
- `SCHEMA_STRUCTURAL_ERRORS` — `"Each page must"`, `"narrativeDevice"` → `schema_structural`
- `FIELD_VALUE_INVALID_ERRORS` — `"pageVisualRole"` enum error → `field_value_invalid`
- `FIELD_TYPE_MISMATCH_ERRORS` — `"must be a string"`, `"must be an array"` → `field_type_mismatch` (outer-catch gap documented)
- `ALL_JSON_FAILURE_FIXTURES` — typed aggregate with `passesSchemaValidationCheck` flag

**Test file**: `functions/test/gemini-story-json-fixtures.test.ts` (25 new tests)
1. `classifyStoryJsonFailure` fixture coverage — each fixture → expected category (parameterized)
2. `processBookGeneration` schema_validation path — 6 integration tests (routing, log fields, no retry, no image gen)
3. `processBookGeneration` outer-catch path — 3 tests documenting P4-1 §5 routing gap for type-mismatch errors
4. `processBookGeneration` quality_gate `logGenerationEvent` — 3 tests verifying P4-2 fix (spy on `logger.info`)
5. Fixture metadata self-checks — 3 tests (category coverage, PII-free messages)

**Routing gap fixed (P4-5)**: `field_type_mismatch` errors (`"must be a string"` etc.) now pass `isStorySchemaValidationError()` → route to `failureStage: "schema_validation"` correctly.

**Constraints met**:
- No live Gemini calls
- No real child names or story content in fixtures
- All 4 schema-validation-routed categories covered
- `npx vitest run` passes: 1258/1258 ✅
- `npm run build` clean ✅
- `check-hygiene.mjs` PASS ✅
- No production code change, no prompt change, no retry added

---

### P4-4 — Safe JSON Extraction / Repair Helper (Test-Only First) ✅ COMPLETE

**Commit**: (see git log — implemented after P4-3)
**Files**:
- `functions/src/lib/llm-json-repair.ts` — pure helper, exports `extractJsonFromLLMResponse(raw: string): LlmJsonRepairResult`
- `functions/test/llm-json-repair.test.ts` — 34 unit tests (valid_original, extracted-fence, extracted-delimiter, unrepairable, shape invariants, scope constraints, P4-3 fixture connection)
- No production files changed; helper is not imported from `generate-book.ts` or `gemini.ts`

**Goal**: Add a `extractJsonFromLLMResponse(raw: string): LlmJsonRepairResult` helper that strips markdown fencing and recovers a parseable JSON object from common LLM output patterns. Wired to tests only; not yet called in production path.

**Changes**:
- New file: `functions/src/lib/llm-json-repair.ts`
- Handles: ` ```json\n...\n``` ` wrapping, leading `Here is the JSON:` preamble, trailing newlines
- Does NOT: repair field values, guess missing fields, or make semantic corrections
- Unit tests in `functions/test/llm-json-repair.test.ts`

**Constraints**:
- Helper is pure (string → unknown) — no side effects, no I/O
- Must not accept partial JSON with truncated fields as valid
- Must not log the raw string

**Acceptance criteria**:
- Unit tests cover: clean JSON, fenced JSON, preamble + JSON, truncated JSON (should throw), empty string (should throw)
- `npx vitest run` passes
- Helper is not yet wired into any production path (no import from `generate-book.ts`)

---

### P4-5 — One-Shot Validation Repair Retry Behind Flag ✅ COMPLETE

**Commit**: (pending)

**Goal**: When `isStorySchemaValidationError()` fires, attempt one automatic re-generation before hard-failing. Controlled by `ENABLE_SCHEMA_REPAIR_RETRY` environment variable (default: off).

**Changes delivered**:
- `isStorySchemaValidationError()` extended with `"must be a string|array|number|boolean|object"` keywords (routing gap fix — always-on, independent of flag)
- `enableSchemaRepairRetry()` flag helper added to `generate-book.ts`
- `isSchemaRepairEnabled()` flag helper + `extractJsonFromLLMResponse()` wiring added to `gemini.ts`
- Catch block in `processBookGeneration()` restructured: flag ON → retry `generateStoryWithQualityGate()` once; flag OFF → original immediate failure
- `schemaRepairRetryUsed: true` recorded in Firestore story metadata when retry succeeds
- `storyGenerationAttempts: 2` logged in `book_early_failed` event when both attempts fail
- `BookEarlyFailedEvent` type extended with `storyGenerationAttempts?: number`
- P4-3 fixtures updated: `field_type_mismatch` entries now `passesSchemaValidationCheck: true`
- P4-3 tests updated: section 3 rewritten to verify `schema_validation` routing (not outer catch)
- New test file `functions/test/schema-repair-retry.test.ts` with 13 tests

---

### P4-6 — Live Smoke for Repaired Flow (IN PROGRESS)

**Goal**: With `ENABLE_SCHEMA_REPAIR_RETRY=true` deployed to production, validate that:
- Books that previously failed at `schema_validation` now succeed on retry
- No regression in normal (non-failing) generation
- Retry count metrics visible in Firestore and Cloud Logging

**Deliverable**: [docs/P4_SCHEMA_REPAIR_SMOKE_CHECKLIST.md](P4_SCHEMA_REPAIR_SMOKE_CHECKLIST.md)

**Status**: ⏸ IN PROGRESS — awaiting operator approval for deploy + GOOGLE_APPLICATION_CREDENTIALS

**Local pre-flight (completed)**:
- HEAD d8c4bca verified on `origin/main`
- 1306/1306 tests pass; 122/122 check:phase2 pass; build clean; hygiene pass
- `ENABLE_SCHEMA_REPAIR_RETRY` absent from `functions/.env.story-gen-8a769` → flag OFF confirmed
- Firebase CLI 15.17.0 available; project `story-gen-8a769` accessible

**Blockers**:
- `GOOGLE_APPLICATION_CREDENTIALS` not set → live smoke scripts cannot run
- Operator approval required for `firebase deploy --only functions --project story-gen-8a769`

**Acceptance criteria**:
- At least 2 books generated successfully with flag ON (no regression)
- `storyGenerationAttempts` field present in Firestore on completed books
- No candidate gate regression
- Rollback confirmed: flag removed, redeploy, one final smoke PASS

---

### P4-7 — Prompt Instruction Tuning After Metrics

**Status**: ✅ COMPLETE (2026-05-20)

**Observed failure (P4-6 Scenario E)**: `'mainQuestObject' must be a string when provided` — 2 consecutive `schema_validation` failures, classified as `field_type_mismatch`. Gemini returned `mainQuestObject` as an array instead of a string.

**Goal**: Reduce Gemini story JSON `schema_validation` failures, especially `mainQuestObject must be a string`, by hardening prompt field type instructions.

**Implementation**: Added `STORY_JSON_FIELD_TYPE_CONTRACT` constant to `functions/src/lib/prompt-builder.ts`. Wired into `buildSystemPrompt()` constraints section as:
```
- JSON field type contract (must follow exactly): <STORY_JSON_FIELD_TYPE_CONTRACT>
```

Contract content:
- `mainQuestObject` must be a plain string, not an array or object. If multiple items, join as one concise Japanese string.
- Invalid example: `"mainQuestObject": ["\u9375", "\u5730\u56f3"]` — Valid: `"mainQuestObject": "\u9375\u3068\u5730\u56f3"`
- `forbiddenQuestObjects` must be an array of strings, not a single string.
- `pages[].text` must be a string, not an array or object.
- `pages[].imagePrompt` must be a string, not an array or object.

**Tests added** (`functions/test/prompt-builder.test.ts`, 5 new tests):
- `"includes explicit mainQuestObject string-only type contract (P4-7)"`
- `"includes mainQuestObject invalid/valid examples (P4-7)"`
- `"includes forbiddenQuestObjects array type contract (P4-7)"`
- `"includes pages text and imagePrompt string type contract (P4-7)"`
- `"field type contract does not instruct to output arrays for mainQuestObject (P4-7)"`

**Constraints preserved**:
- No semantic repair added
- No additional Gemini API call added
- No generation routing change
- No candidate gate change
- No Firebase deploy
- No retry behavior change

**Follow-up (Option B — response_schema migration)**:
The current Gemini client uses JSON.parse / `extractJsonFromLLMResponse()` for response parsing. Migrating to Gemini structured outputs / response schema would enforce field types at the API level, eliminating `field_type_mismatch` entirely. This is NOT implemented in P4-7 — it requires a separate slice with its own integration tests and smoke validation.

**Validation results**: 1311/1311 tests PASS, build clean, hygiene PASS, check:phase2 122/122 PASS.

---

### P4-7s — Targeted Live Smoke for `mainQuestObject` Prompt Hardening ✅ COMPLETE

**Status**: ✅ PASS (2026-05-21)  
**Commit deployed**: c798662  
**Deploy command**: `firebase deploy --only functions --project story-gen-8a769` — 13/13 functions ✅  
**ENABLE_SCHEMA_REPAIR_RETRY**: absent (flag OFF) throughout ✅  

**Smoke scenario**: bedtime / soft_watercolor / profile=a / 5 books  

| bookId | status | mainQuestObject error |
|---|---|---|
| zDBNFzRUXORgNOkCqaMb | `failed` / `quality_gate` (unrelated to P4-7) | None ✅ |
| 8oYTXgIXz7KdHNb6M5Us | `completed` 8/8 | None ✅ |
| 0l7pIfVv1n2vnLgU63MG | `completed` 8/8 | None ✅ |
| 89lHtheKjgXFmhVFPH16 | `completed` 8/8 | None ✅ |
| m45PuFg5U2mRINxX5T66 | `completed` 8/8 | None ✅ |

`mainQuestObject must be a string` recurred: **0/5** ✅  
`schema_validation` failures: **0/5** ✅  
`schemaRepairRetryUsed`: absent on all books ✅  
ImageProvider routing changed: No ✅  
Candidate gate changed: No ✅  

**Conclusion**: P4-7 prompt hardening validated. `mainQuestObject` field type contract in `buildSystemPrompt()` is effective. No recurrence of the P4-6 Scenario E `field_type_mismatch` error.

**Next**: P4-8 — `response_schema` migration design (enforce field types at API level).

---

### P4-8 — Gemini `response_schema` Migration Design ✅ COMPLETE

**Status**: ✅ DESIGN COMPLETE (2026-05-21) — docs-only  
**Deliverable**: [P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md](P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md)  
**Runtime change**: None  

**Summary**:  
- Inventoried current Gemini API usage: `@google/generative-ai` v0.24.0, `responseMimeType: "application/json"`, no `responseSchema`  
- Documented full story schema (root, pages, narrativeDevice, cast) with field types, required/optional, enum values  
- Drafted Gemini-compatible `STORY_RESPONSE_SCHEMA` constant  
- Compared 5 migration options (A–E); recommended **Option E: hybrid response_schema + existing validator**  
- Proposed 6-slice staged plan: P4-9 through P4-14  
- Defined test strategy, runtime safety rules, risk analysis, acceptance criteria  
- No runtime code change, no prompt change, no feature flag wiring  

**Next**: P4-9 — add TypeScript JSON schema constant (not wired).

---

### P4-9 — Story Response Schema Constant ✅ COMPLETE

**Status**: ✅ COMPLETE (2026-05-21)  
**Files**: `functions/src/lib/story-response-schema.ts`, `functions/test/story-response-schema.test.ts` (35 tests)  
**Runtime change**: None — not imported by `gemini.ts` or `generate-book.ts`  

**Summary**:  
- Added `STORY_RESPONSE_SCHEMA` Gemini-compatible JSON Schema constant (v1.0.0)  
- 12 root properties, 8 page properties, 5 narrativeDevice properties, 15 cast character properties  
- Enums: `pageVisualRole` (8), `cast[].role` (8), `cast[].characterKind` (6)  
- 35 tests covering shape, P4 failure prevention, enum alignment, required fields, serialization stability  
- Deferred: client-side metadata fields, app-managed cast fields, `minItems`/`maxItems`  

**Next**: P4-10 — schema compatibility tests against P4-3 fixtures.

---

### P4-10 — Schema Compatibility Tests ✅ COMPLETE

**Status**: ✅ COMPLETE (2026-05-21)  
**File**: `functions/test/story-response-schema-compat.test.ts` (56 tests)  
**Runtime change**: None — test-only addition  

**Summary**:  
- 56 tests covering valid fixture compatibility, negative fixture rejection, P4-3 fixture relationship, required field alignment, gap documentation, import guard  
- Schema vs `validateStory()` gaps documented: enum normalization (benign), `minItems` deferred (benign)  
- `gemini.ts` and `generate-book.ts` confirmed not importing `story-response-schema`  

**Next**: P4-11 — wire `responseSchema` behind `ENABLE_RESPONSE_SCHEMA` feature flag.

---

### P4-11 — Wire responseSchema Behind Feature Flag ✅ COMPLETE

**Status**: ✅ COMPLETE (2026-05-21)  
**Files**: `functions/src/lib/gemini.ts` (modified), `functions/test/gemini-response-schema-flag.test.ts` (18 tests)  
**Runtime change**: None by default — `ENABLE_RESPONSE_SCHEMA` defaults to OFF  

**Summary**:  
- Added `isResponseSchemaEnabled()` flag helper (exported)  
- When flag ON, `STORY_RESPONSE_SCHEMA` is included in Gemini `generationConfig.responseSchema`  
- `validateStory()` remains final validator regardless of flag state  
- Extraction/repair path unchanged — defense-in-depth preserved  
- `ENABLE_SCHEMA_REPAIR_RETRY` behavior unchanged — flags are independent  
- P4-10 import guard updated to reflect expected wiring  

**Next**: P4-12 — live smoke with `ENABLE_RESPONSE_SCHEMA=true`.

---

## 7. Acceptance Criteria for P4 Hardening

The following criteria must hold across all P4 slices:

| Criterion | Verification |
|---|---|
| No raw `childName` / `storyText` / prompt in logs | Review `generation-event-logger.ts` emitted fields; `privacy` assertions in logger tests |
| Validation errors classified consistently | `StoryJsonFailureCategory` enum covers all observed error messages |
| Retries capped | `storyGenerationAttempts` ≤ 2 for schema_validation retry path; quality retry is already capped |
| No infinite generation loop | `generateStoryWithQualityGate()` called at most twice per book; confirmed by test mocks |
| Firestore `failureStage` remains meaningful | `"schema_validation"` vs `"quality_gate"` vs `"story_generation"` remain distinct |
| SLO report can distinguish story JSON failure from image failure | `book_early_failed` with `failureStage="schema_validation"` is separable from `page_image_failed` |
| Candidate gate and image adapter routing unaffected | P4 changes do not touch `gateImageModelProfile()`, `generatePageImageWithFallback()`, or adapters |
| `npm run check:phase2` passes | 105/105 after each P4 slice |
| `npx vitest run` passes | 1216+ / 1216+ after each P4 slice |
| Build clean | `cd functions && npm run build` exits 0 |
| Hygiene pass | `node scripts/check-hygiene.mjs` passes |

---

## 8. Test Strategy

### 8.1 Prompt Builder Tests (`functions/test/prompt-builder.test.ts`)

Current coverage: system prompt structure, JSON schema instructions, field type annotations, image prompt sanitization, style credibility constraints.

**Additions for P4-7**:
- Assert `"Respond with raw JSON only"` instruction (if/when added)
- Assert `mainQuestObject` type annotation string (if/when added)
- Assert `narrativeDevice` required-key annotation (if/when added)
- All assertions are `toContain(...)` on prompt string output — no live calls

### 8.2 Generate-Book Validation Fixtures (`functions/test/generate-book.test.ts`)

**New test cases for P4-3**:

```
describe("processBookGeneration > schema validation failures") {
  it("fails book with failureStage=schema_validation when JSON parse throws")
    → mock: llmClient.generateStory throws Error("Failed to parse LLM JSON response")
    → assert: bookStatus = "failed", failureStage = "schema_validation", retryable = false
    → assert: imageClient.generateImage NOT called

  it("fails book with failureStage=schema_validation on mainQuestObject type error")
    → mock: throws Error("'mainQuestObject' must be a string when provided")
    → assert: same as above

  it("fails book with failureStage=schema_validation on narrativeDevice error")
    → mock: throws Error("narrativeDevice is missing required fields")
    → assert: same as above
}
```

**New test cases for P4-5**:

```
describe("processBookGeneration > schema validation repair retry") {
  it("succeeds on second attempt after schema_validation error (repair retry)")
    → mock: first call throws, second call returns valid story
    → assert: bookStatus = "completed", storyGenerationAttempts = 2
    → assert: imageClient.generateImage IS called (image generation proceeds)

  it("fails after two schema_validation errors (cap at 1 retry)")
    → mock: both calls throw
    → assert: bookStatus = "failed", failureStage = "schema_validation", storyGenerationAttempts = 2
    → assert: imageClient.generateImage NOT called
}
```

### 8.3 Malformed JSON Samples (for `llm-json-repair.test.ts`, P4-4)

| Fixture | Description | Expected result |
|---|---|---|
| Clean JSON string | Valid JSON, no wrapping | Parsed successfully |
| Fenced with ` ```json ``` ` | Most common LLM output style | Strip fencing, parse |
| Fenced with ` ``` ` (no language) | Variant fencing | Strip fencing, parse |
| Preamble text + JSON | `"Here is the JSON:\n{...}"` | Strip preamble, parse |
| Truncated JSON | `{"title": "abc", "pages":` | Throw — do not accept partial |
| Empty string | `""` | Throw |
| JSON array (wrong root type) | `[{"title": "abc"}]` | Throw — root must be object |
| Extra trailing text | `{...}\nThis was the story JSON.` | Strip trailing text, parse |

### 8.4 Wrong-Type Samples

| Fixture | Field | Wrong value | Expected error category |
|---|---|---|---|
| `mainQuestObject` as null | `mainQuestObject` | `null` | `field_type_mismatch` |
| `mainQuestObject` as array | `mainQuestObject` | `["item1"]` | `field_type_mismatch` |
| `pageVisualRole` unknown value | `pageVisualRole` | `"splash"` | `field_value_invalid` |
| `narrativeDevice` as array | `narrativeDevice` | `[]` | `schema_structural` |
| `pages` missing | root | `{}` (no `pages` key) | `schema_structural` |

### 8.5 Retry Behavior Tests

- Mock `llmClient.generateStory` call count tracked via `vi.fn()` — confirm ≤ 2 calls
- Mock for schema_validation retry: first call throws, second call returns valid fixture
- Mock for double failure: both calls throw different error messages — confirm still classified correctly
- All tests use placeholder child/book data — no real names or story content

### 8.6 Provider Call Isolation

- No live Gemini or Replicate calls in unit tests — all mocked
- No live OpenAI calls in unit tests
- `llmClient`, `imageClient`, and `deps` are all injected via `GenerationDeps` interface — fully mockable
- Fixtures from P4-3 and P4-4 must pass `npx vitest run` with no external network access

---

## 9. Risk Analysis

### 9.1 Repair Parser Masking Real Schema Drift

**Risk**: A `malformed_json` repair that successfully extracts JSON from a wrapped response could mask a case where Gemini has drifted to a consistently different output format. The repair succeeds but the resulting story has different structure than intended.

**Mitigation**: The repair helper (P4-4) only strips wrapping — it does NOT repair field values or guess missing fields. Post-repair, the full `validateGeneratedStoryQuality()` check runs as normal. Schema drift would still surface as a quality gate failure.

### 9.2 Retries Increasing Cost and Latency

**Risk**: Adding a schema_validation retry (P4-5) adds one Gemini call per failure. If the failure rate is high (e.g., 20% of books), this doubles story generation cost.

**Mitigation**: Retry is capped at 1 call. The flag defaults to off — no cost impact until enabled. P4-2 logging will provide baseline failure rate before enabling. If failure rate is < 5% (expected), cost impact is < 5% increase in story generation API calls.

### 9.3 Accidental Prompt Leakage

**Risk**: Repair retry prompt (P4-5) might inadvertently include field *values* (child name, story text) in the repair instruction rather than just field *names*.

**Mitigation**: The repair retry uses the **same prompt as the original attempt** — not a modified prompt with error details (that is the more complex strategy 5.5, deferred). No field values are included in the retry trigger. Privacy tests in `generation-event-logger.test.ts` assert `childName` is not present in any logged event.

### 9.4 Accepting Malformed Story Content

**Risk**: A successful repair retry might return a story that passed JSON parsing but has subtly wrong content (e.g., `mainQuestObject` returned correctly-typed but with placeholder `"???"` value).

**Mitigation**: `validateGeneratedStoryQuality()` runs after every generation attempt, including repair retries. Stories with semantically empty fields are caught by the quality gate (e.g., `missing_main_quest_object` issue code).

### 9.5 Overfitting to Current Observed Failures

**Risk**: The current observed failures (`malformed_json`, `mainQuestObject` type) may not be representative. Prompt changes tuned for these may cause regressions for other failure types not yet observed.

**Mitigation**: P4-7 (prompt tuning) is explicitly gated on P4-2 data collection. No prompt changes will be made until 2+ weeks of classified failure data is available. The taxonomy (§4) is deliberately broad so new failure types can be added without redesign.

### 9.6 Changing Creative Output Quality

**Risk**: Any change to `buildSystemPrompt()` (P4-7) could alter story creativity, length, or structure in ways that affect user-visible quality.

**Mitigation**: All prompt changes go through `prompt-builder.test.ts` assertion coverage before deployment. Quality gate (`validateGeneratedStoryQuality()`) provides automated regression detection. Manual smoke book review (via existing smoke scripts) is required before merging prompt changes.

---

## 10. Relationship to P3 and P2

### 10.1 P3 — Page Image Generation (complete)

Phase 3 migrated page image generation to the `ImageProvider` adapter pattern (`ReplicateImageAdapter`, `OpenAIImageAdapter`). P3 is **functionally complete** for the page-generation path. P4 hardening operates entirely upstream of the image generation step — it does not touch adapters, routing, or the candidate gate.

The only interaction: if P4-5 (schema repair retry) succeeds, image generation proceeds normally through the existing P3 adapter path. If retry fails, book reaches `"failed"` before any image adapter is invoked — same as today.

### 10.2 P2 — SLO / Observability

Phase 2 established the `generation_started` / `book_outcome` / `book_early_failed` / `page_image_failed` event taxonomy and the SLO report (`report-generation-slo.mjs`). P4-2 extends this by adding sub-classification of `book_early_failed` story failures.

**Key gap to close**: The P2 SLO report currently cannot distinguish `"schema_validation failed"` from `"quality_gate failed"` from `"story_generation unavailable"` — all appear as `failedBooks`. P4-2 adds `storyJsonFailureCategory` to close this gap. The SLO threshold policy (`GENERATION_SLO_THRESHOLD_POLICY.md` §2.1) has `"Early failure rate"` as a metric; P4-2 makes this metric actionable by adding failure sub-type visibility.

### 10.3 Long-term: Cover Image and Recurring Character Reference

The remaining legacy scope from P3 (`generateCoverImage()` and `ensureRecurringCharacterReferences()`) is tracked separately. Those flows use `deps.imageClient` (legacy `createImageClient()`) and are unrelated to Gemini story JSON generation. Their migration to `ImageProvider` adapters is a separate P4 task (originally labeled P4-1 in the P3 Closure doc §10; renumbered relative to this hardening task).

---

## 11. Slice Summary

| Slice | Title | Type | Status |
|---|---|---|---|
| **P4-1** | Gemini JSON hardening inventory and design | Docs | ✅ COMPLETE (this doc) |
| **P4-2** | Structured story validation error taxonomy / logging | Code (logging only) | ✅ COMPLETE (bde7bb9) |
| **P4-3** | Unit fixtures for malformed/wrong-type Gemini responses | Test | ✅ COMPLETE |
| **P4-4** | Safe JSON extraction/repair helper, test-only | Code (new helper + tests) | ✅ COMPLETE |
| **P4-5** | One-shot validation repair retry behind flag | Code | ✅ COMPLETE |
| **P4-6** | Live smoke for repaired flow | Smoke | ✅ COMPLETE (PASS with limitation; see P4_SCHEMA_REPAIR_SMOKE_CHECKLIST.md) |
| **P4-7** | Tune prompt instructions after metrics | Code (prompt + tests) | ✅ COMPLETE |
| **P4-12** | Live smoke with `ENABLE_RESPONSE_SCHEMA=true` | Smoke + Docs | ✅ COMPLETE (FAIL — null handling gap; see P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md §P4-12 Results) |
| **P4-12a** | null→undefined coercion in validateStory() | Code + Tests | ✅ COMPLETE (46 tests, fixes P4-12 Book 1 failure) |
| **P4-12b** | Harden responseSchema ON JSON parse path | Code + Tests | ✅ COMPLETE (39 tests, direct JSON.parse + fallback extraction) |

---

## 12. References

| Document | Relevance |
|---|---|
| [PHASE3_IMAGE_PROVIDER_CLOSURE.md](PHASE3_IMAGE_PROVIDER_CLOSURE.md) | P3 complete; schema_validation failure classified as pre-existing (§9.1) |
| [PHASE2_GENERATION_SLO_PLAN.md](PHASE2_GENERATION_SLO_PLAN.md) | Story generation risk inventory (§2.3) |
| [GENERATION_SLO_RUNBOOK.md](GENERATION_SLO_RUNBOOK.md) | `book_early_failed` event structure, error codes, Cloud Logging filters |
| [GENERATION_SLO_THRESHOLD_POLICY.md](GENERATION_SLO_THRESHOLD_POLICY.md) | Early failure rate threshold (≤ 2% healthy, > 10% incident) |
| `functions/src/generate-book.ts` | `processBookGeneration()`, `generateStoryWithQualityGate()`, `isStorySchemaValidationError()` |
| `functions/src/lib/prompt-builder.ts` | `buildSystemPrompt()`, `appendQualityRetryInstruction()` |
| `functions/src/lib/generation-event-logger.ts` | `book_early_failed` event type, `ErrorCategory` |
| `functions/src/lib/slo-metrics.ts` | `computeSloMetrics()` — story failure gap |
| `functions/test/generate-book.test.ts` | Existing quality gate failure fixtures |
| `functions/test/prompt-builder.test.ts` | JSON schema instruction coverage |
