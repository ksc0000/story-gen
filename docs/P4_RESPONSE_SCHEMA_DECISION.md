# P4-14: responseSchema Rollout Decision Record

**Created**: 2026-05-21
**Task**: P4-14 — Formally abandon Gemini responseSchema rollout
**Status**: CLOSED — Not viable for production
**Decision**: Do NOT roll out `responseSchema` for story generation
**Branch**: main

---

## 1. Decision

**Abandon Gemini `responseSchema` rollout for story generation.**

The `responseSchema` (Gemini structured output API) was tested in 4 live smoke rounds across 2 schema variants. All rounds produced output token truncation causing book generation failure. Schema size had zero effect on the truncation behavior. The feature is not viable for production use with the current Gemini model family for this use case.

**Gemini remains the story-generation model.** The issue is specific to `responseSchema` structured output mode, not to Gemini's JSON generation capability via prompt instruction.

---

## 2. Evidence Summary

### 2.1 Smoke Test Timeline

| Round | Task | Schema | Size | Books | Result | Key Failure |
|-------|------|--------|------|-------|--------|-------------|
| 1 | P4-12 | full | 3,322 chars | 5 | 4/5 FAIL | null handling + malformed_json |
| 2 | P4-12c | full | 3,322 chars | 5 | 4/5 FAIL | malformed_json (244–250s duration) |
| 3 | P4-12e | full | 3,322 chars | 3 | 3/3 FAIL | likely_truncated_object (311K–346K chars) |
| 4 | P4-12g | minimal | 714 chars (21.5%) | 3 | 3/3 FAIL | likely_truncated_object (289K–331K chars) |

### 2.2 Full Schema Evidence (P4-12e)

| Book | Theme/Style | lengthChars | storyDurationMs | parseFailureKind |
|------|-------------|-------------|-----------------|------------------|
| 1 | bedtime/soft_watercolor | 346,003 | 245,128 | likely_truncated_object |
| 2 | fantasy/crayon | 311,714 | 268,296 | likely_truncated_object |
| 3 | emotional-growth/soft_watercolor | 320,009 | 254,032 | likely_truncated_object |

### 2.3 Minimal Schema Evidence (P4-12g)

| Book | Theme/Style | lengthChars | storyDurationMs | parseFailureKind |
|------|-------------|-------------|-----------------|------------------|
| 1 | bedtime/soft_watercolor | 318,571 | 263,662 | likely_truncated_object |
| 2 | fantasy/crayon | 330,625 | 435,474 | likely_truncated_object |
| 3 | emotional-growth/soft_watercolor | 331,425 | 343,148 | likely_truncated_object |
| 3 (retry) | emotional-growth/soft_watercolor | 288,901 | 307,602 | likely_truncated_object |

### 2.4 Root Cause

Gemini's `responseSchema` structured output mode fundamentally changes how the model generates output. For EhonAI's story JSON use case:

1. **Enormous internal representation**: The model generates 289K–346K characters of JSON output, far exceeding the ~8K expected story JSON size.
2. **Output token truncation**: The inflated output exceeds the model's output token limit, resulting in truncated JSON (`likely_truncated_object`).
3. **Schema size is NOT the cause**: Reducing schema from 3,322 → 714 chars (78.5% reduction) had zero effect on truncation. The output sizes and failure patterns were indistinguishable between full and minimal schemas.
4. **Not a parse-path bug**: P4-12a (null coercion) and P4-12b (direct JSON parse) fixed their respective layers correctly. The truncation is upstream of all parse/validation code.
5. **Stochastic but consistent**: The 1 success in P4-12c (Book 2, 59s, normal-sized JSON) shows that `responseSchema` CAN produce valid output, but the failure rate (~85% across all rounds) is far too high for production.

---

## 3. Permanent Story JSON Hardening Strategy

The following layers constitute the production safety stack. All were validated during P4 and remain active:

| Layer | Mechanism | Task | Status | Defense Level |
|-------|-----------|------|--------|---------------|
| L1 | `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()` | P4-7 | ✅ Active | Soft — prompt instruction |
| L2 | `responseMimeType: "application/json"` | Pre-P4 | ✅ Active | Medium — forces JSON output |
| L3 | `extractJSON()` / `extractJsonFromLLMResponse()` | P4-4/P4-5 | ✅ Active | Recovery — strips markdown fences |
| L4 | `validateStory()` + `nullToUndefined()` | P4-12a | ✅ Active | Hard — runtime type validator |
| L5 | `classifyStoryJsonFailure()` | P4-2 | ✅ Active | Observability — structured error taxonomy |
| L6 | `storyJsonParseDiagnostics` | P4-12d | ✅ Active | Observability — privacy-safe structural metadata |
| L7 | `ENABLE_SCHEMA_REPAIR_RETRY` (flag-gated) | P4-5 | ✅ Available | Recovery — one-shot retry on parse failure |
| L8 | SLO monitoring + runbook | P2 | ✅ Active | Operational — failure rate tracking |

### 3.1 What was validated

- **P4-7s**: `mainQuestObject must be a string` recurrence = 0/5 after prompt hardening.
- **P4-12a**: `null` values from Gemini correctly coerced to `undefined` in `validateStory()`.
- **P4-12b**: Direct `JSON.parse` path for structured output works correctly for valid responses.
- **P4-12d**: Safe diagnostics correctly classify truncation without logging raw content.

### 3.2 Recommendations for continued hardening

1. **Measure `schema_validation` failure rate** under the permanent prompt+validator path via SLO reports.
2. **Decide `ENABLE_SCHEMA_REPAIR_RETRY` rollout**: Selectively enable for production if `schema_validation` failures exceed SLO targets.
3. **Continue targeted prompt hardening**: If new `field_type_mismatch` patterns emerge, add field-specific constraints to `STORY_JSON_FIELD_TYPE_CONTRACT`.
4. **Monitor Gemini model updates**: Future model versions may resolve the structured output truncation issue. Reassess `responseSchema` viability if Gemini announces improved structured output for large schemas.

---

## 4. Code Status

### 4.1 Dormant / Experimental Code (Keep)

The following code is preserved for auditability and potential future reassessment. It is NOT production-active:

| File | Exports | Purpose |
|------|---------|---------|
| `functions/src/lib/story-response-schema.ts` | `STORY_RESPONSE_SCHEMA`, `STORY_RESPONSE_SCHEMA_MINIMAL` | Schema definitions |
| `functions/src/lib/gemini.ts` | `isResponseSchemaEnabled()`, `getResponseSchemaMode()` | Feature flag helpers |
| `functions/src/lib/gemini.ts` | `buildSafeJsonParseDiagnostics()`, `getParseErrorDiagnostics()` | Diagnostic utilities (useful regardless of responseSchema) |
| `functions/src/lib/gemini.ts` | `parseGeminiStoryJsonResponse()` | Parse helper with responseSchema awareness |

### 4.2 Production Flag State

| Flag | Value | Effect |
|------|-------|--------|
| `ENABLE_RESPONSE_SCHEMA` | **absent / OFF** | responseSchema NOT included in Gemini config |
| `RESPONSE_SCHEMA_MODE` | **absent** | No effect (only applies when ENABLE_RESPONSE_SCHEMA=true) |
| `ENABLE_SCHEMA_REPAIR_RETRY` | **absent / OFF** | Repair retry not active (available for future enablement) |

### 4.3 Do-Not-Enable Warning

**Do NOT enable `ENABLE_RESPONSE_SCHEMA` in production without a new decision record.**

Enabling this flag will cause ~85% of story generations to fail due to output token truncation. This was conclusively demonstrated in P4-12, P4-12c, P4-12e, and P4-12g across 16 total smoke books.

If Gemini releases improved structured output capabilities for large schemas, create a new task (e.g., P4-16) to reassess viability with fresh evidence.

---

## 5. Test Coverage

The following test files validate the dormant responseSchema code and guards:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `gemini-response-schema-flag.test.ts` | 18 | Flag helper, config wiring, independence, source guards |
| `gemini-response-schema-mode.test.ts` | 21 | Schema mode selector, config construction, schema identity |
| `story-response-schema.test.ts` | 35 | Schema shape, required fields, enums, snapshot stability |
| `story-response-schema-minimal.test.ts` | 41 | Minimal schema shape, size comparison, field coverage |
| `story-response-schema-compat.test.ts` | 56 | Schema vs validateStory() compatibility |
| `response-schema-json-parse.test.ts` | 39 | Parse paths, flag combinations, error privacy |
| `response-schema-parse-diagnostics.test.ts` | 31 | Diagnostic classification, privacy, integration |
| `story-null-coercion.test.ts` | 46 | null→undefined coercion in validateStory() |

Total: **287 tests** covering responseSchema-related code.

---

## 6. Lessons Learned

1. **Gemini structured output is not size-dependent for truncation**: Schema size (714 vs 3,322 chars) had zero effect. The model's internal representation inflates regardless.
2. **Feature flags enable safe experimentation**: `ENABLE_RESPONSE_SCHEMA` allowed 4 smoke rounds with immediate rollback, causing zero user impact.
3. **Safe diagnostics are essential for root cause analysis**: `storyJsonParseDiagnostics` (P4-12d) enabled conclusive identification of truncation as the root cause, without logging raw LLM content.
4. **Prompt hardening + runtime validation is a robust strategy**: The P4-7 + `validateStory()` stack has proven effective and remains the production path.
5. **One successful structured output response in ~16 attempts**: The feature is not inherently broken — it occasionally works (P4-12c Book 2). But the failure rate is unacceptable for production.

---

## 7. Related Documents

- [P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md](P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md) — Full migration design and smoke results
- [PHASE4_GEMINI_JSON_HARDENING_PLAN.md](PHASE4_GEMINI_JSON_HARDENING_PLAN.md) — Phase 4 hardening plan
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) — P4 slice tracker
- [GENERATION_SLO_RUNBOOK.md](GENERATION_SLO_RUNBOOK.md) — Operational runbook
