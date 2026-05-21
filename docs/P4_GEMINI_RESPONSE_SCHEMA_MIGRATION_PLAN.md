# P4-8: Gemini `response_schema` Migration Design

**Created**: 2026-05-21  
**Task**: P4-8 — design Gemini response_schema migration  
**Status**: DESIGN COMPLETE (docs-only)  
**Branch**: main  
**Starting commit**: fd17514  
**Depends on**: P4-7s validated (prompt hardening smoke PASS)

---

## 1. Purpose

P4-7 added explicit field type constraints to the system prompt (`STORY_JSON_FIELD_TYPE_CONTRACT`) and P4-7s validated that `mainQuestObject must be a string` no longer recurred across 5 live smoke books. However, prompt-level instructions are a **soft contract** — the LLM can still violate them under edge conditions (temperature variance, long context, model updates).

Gemini's `response_schema` (structured output) provides a **hard API-level contract** that enforces the JSON shape and field types at the model output layer. This eliminates `field_type_mismatch` and `schema_structural` failures at the source, rather than detecting them after generation.

### Why now

- P4-7s smoke PASS confirms prompt hardening works for the immediate `mainQuestObject` issue.
- `response_schema` is the next defensive layer — it prevents the class of errors, not just the observed instance.
- The `@google/generative-ai` SDK (v0.24.0+) supports `responseSchema` in `generationConfig`.
- If `response_schema` migration is too risky or limited, P4 can continue relying on prompt hardening + `validateStory()` as the safety net.

---

## 2. Current State

### 2.1 JSON Constraint Stack (as of P4-7s)

| Layer | Mechanism | Defense level | Status |
|---|---|---|---|
| L1: Prompt instruction | `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()` | Soft — LLM can ignore | ✅ P4-7 |
| L2: `responseMimeType` | `"application/json"` in `generationConfig` | Medium — forces JSON output, no schema enforcement | ✅ Already active |
| L3: JSON extraction | `extractJSON()` / `extractJsonFromLLMResponse()` (P4-4) | Recovery — strips markdown fences | ✅ P4-4/P4-5 (flag-gated) |
| L4: Runtime validator | `validateStory()` in `gemini.ts` | Hard — throws on type mismatch | ✅ Always active |
| L5: `response_schema` | Gemini structured output API contract | Hard — model enforces types at output | ❌ Not yet implemented |

### 2.2 Production Flag State

| Flag | Value |
|---|---|
| `ENABLE_SCHEMA_REPAIR_RETRY` | absent / OFF |
| `response_schema` | not implemented |

### 2.3 P4 History

| Task | Summary |
|---|---|
| P4-1 | Inventory and design doc |
| P4-2 | `StoryJsonFailureCategory` taxonomy + `classifyStoryJsonFailure()` |
| P4-3 | Unit fixtures for malformed / wrong-type Gemini responses |
| P4-4 | `extractJsonFromLLMResponse()` pure helper (test-only) |
| P4-5 | One-shot schema repair retry behind `ENABLE_SCHEMA_REPAIR_RETRY` flag |
| P4-6 | Live smoke for repair retry (PASS with limitation) |
| P4-7 | `STORY_JSON_FIELD_TYPE_CONTRACT` prompt hardening |
| P4-7s | Targeted smoke — 0/5 `mainQuestObject` recurrence ✅ |
| **P4-8** | **This document — `response_schema` migration design** |

---

## 3. Current Gemini API Usage Inventory

### 3.1 SDK

| Item | Value |
|---|---|
| Package | `@google/generative-ai` |
| Version | `^0.24.0` (from `functions/package.json`) |
| Import | `GoogleGenerativeAI`, `HarmCategory`, `HarmBlockThreshold` |
| File | `functions/src/lib/gemini.ts` |

### 3.2 Model Selection

| Context | Model candidates |
|---|---|
| Default (free/guided_ai) | `gemini-2.5-flash`, `gemini-2.0-flash` |
| `standard_paid` | `gemini-2.5-flash`, `gemini-2.5-pro` |
| `premium_paid` / `original_ai` / memory theme | `gemini-2.5-pro`, `gemini-2.5-flash` |
| Env override | `GEMINI_STORY_MODEL_PRIMARY` / `GEMINI_STORY_MODEL_FALLBACKS` |

### 3.3 Generation Config

Current `generationConfig` passed to all story generation calls:

```typescript
generationConfig: { responseMimeType: "application/json" as const }
```

- **No `responseSchema`** is set.
- **No `temperature`** is explicitly set (uses model default).
- **No `maxOutputTokens`** is explicitly set.

### 3.4 Request Shape

```typescript
const request = {
  contents: [{ role: "user", parts: [{ text: userParts.join("\n") }] }],
  systemInstruction: { role: "system", parts: [{ text: params.systemPrompt }] },
  generationConfig: { responseMimeType: "application/json" },
};
```

### 3.5 JSON Parsing Path

```
result.text()
  → extractJSON()          // strips markdown fences (always)
  → JSON.parse()           // parse raw text
  OR (when ENABLE_SCHEMA_REPAIR_RETRY=true):
  → extractJsonFromLLMResponse()  // P4-4 enhanced extractor
  → parsed value
  → validateStory(parsed)  // runtime type checks + normalization
  → GeneratedStory object
```

### 3.6 Runtime Validator (`validateStory`)

Location: `gemini.ts`, lines ~430–550

The validator performs imperative type checking:
- Root: must be object
- `title`: required string
- `characterBible`: required string
- `styleBible`: required string
- `pages`: required non-empty array
- Each page: `text` string, `imagePrompt` string required; optional `compositionHint`, `visualMotifUsage`, `hiddenDetail`, `pageVisualRole` — all strings when present
- `narrativeDevice`: optional object with string sub-fields + `hiddenDetails` string array
- `storyGoal`, `mainQuestObject`, `titleSpreadText`, `openingNarration`, `coverImagePrompt`: optional strings
- `forbiddenQuestObjects`: optional string array
- `cast`: optional array of character objects with required `characterId`, `displayName`, `visualBible` strings

### 3.7 Rewrite Path

`rewriteStoryText()` also uses `responseMimeType: "application/json"` but no `responseSchema`. This is out of P4-8 scope — rewrite has a simpler schema (`{pages: [{text: string}]}`).

---

## 4. Story Schema Inventory

### 4.1 Root Fields

| Field | Type | Required | Validated by | P4-3 fixture? | Notes |
|---|---|---|---|---|---|
| `title` | `string` | ✅ | `validateStory` | — | |
| `characterBible` | `string` | ✅ | `validateStory` | — | |
| `styleBible` | `string` | ✅ | `validateStory` | — | |
| `storyGoal` | `string` | ❌ | `validateStory` | — | |
| `mainQuestObject` | `string` | ❌ | `validateStory` | ✅ `field_type_mismatch` | P4-6 observed as array |
| `forbiddenQuestObjects` | `string[]` | ❌ | `validateStory` | — | |
| `titleSpreadText` | `string` | ❌ | `validateStory` | — | |
| `openingNarration` | `string` | ❌ | `validateStory` | — | |
| `coverImagePrompt` | `string` | ❌ | `validateStory` | — | |
| `narrativeDevice` | `object` | ❌ | `validateStory` | ✅ `schema_structural` | |
| `cast` | `StoryCharacter[]` | ❌ | `validateStoryCast` | — | Complex nested object |
| `pages` | `GeneratedStoryPage[]` | ✅ | `validateStory` | ✅ `schema_structural` | Non-empty array |

### 4.2 Page Fields (`pages[]`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | `string` | ✅ | P4-7 prompt-hardened |
| `imagePrompt` | `string` | ✅ | P4-7 prompt-hardened |
| `compositionHint` | `string` | ❌ | |
| `visualMotifUsage` | `string` | ❌ | |
| `hiddenDetail` | `string` | ❌ | |
| `pageVisualRole` | `PageVisualRole` (enum) | ❌ | Normalized via alias map |
| `appearingCharacterIds` | `string[]` | ❌ | Filtered against cast |
| `focusCharacterId` | `string` | ❌ | Validated against cast |

### 4.3 Narrative Device Fields (`narrativeDevice`)

| Field | Type | Required |
|---|---|---|
| `repeatedPhrase` | `string` | ❌ |
| `visualMotif` | `string` | ❌ |
| `setup` | `string` | ❌ |
| `payoff` | `string` | ❌ |
| `hiddenDetails` | `string[]` | ❌ |

### 4.4 Cast Character Fields (`cast[]`)

| Field | Type | Required |
|---|---|---|
| `characterId` | `string` | ✅ |
| `displayName` | `string` | ✅ |
| `role` | `StoryCharacterRole` (enum) | ✅ (normalized) |
| `visualBible` | `string` | ✅ |
| `characterKind` | `StoryCharacterKind` (enum) | ❌ (inferred from role) |
| `nonHuman` | `boolean` | ❌ |
| `noHumanFace` | `boolean` | ❌ |
| `noHumanBody` | `boolean` | ❌ |
| `scaleHint` | `string` | ❌ |
| `silhouette` | `string` | ❌ |
| `colorPalette` | `string[]` | ❌ |
| `signatureItems` | `string[]` | ❌ |
| `doNotChange` | `string[]` | ❌ |
| `negativeCharacterRules` | `string[]` | ❌ |
| `canChangeByScene` | `string[]` | ❌ |

### 4.5 Known Problematic Fields (from P4-3/P4-6)

| Field | Observed failure | Category |
|---|---|---|
| `mainQuestObject` | Returned as array instead of string | `field_type_mismatch` |
| `pages` | Missing or non-array | `schema_structural` |
| `narrativeDevice` | Non-object value | `schema_structural` |
| `pageVisualRole` | Unknown enum value | `field_value_invalid` |

---

## 5. Response Schema Target Design

### 5.1 Gemini `responseSchema` Compatibility

The `@google/generative-ai` SDK supports `responseSchema` via `generationConfig`:

```typescript
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: { /* JSON Schema subset */ },
}
```

Gemini structured output supports a **subset** of JSON Schema:
- `type`: `"string"`, `"number"`, `"integer"`, `"boolean"`, `"array"`, `"object"`
- `properties` + `required` for objects
- `items` for arrays
- `enum` for string enums
- `description` for field documentation
- `nullable` for optional fields

**Not supported** (or with limitations):
- `oneOf`, `anyOf`, `allOf`, `$ref` — not supported
- `additionalProperties` — behavior varies
- `minItems`, `maxItems` — may not be enforced
- `pattern` (regex) — not supported
- Default values — not supported

### 5.2 Draft Schema

```typescript
const STORY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Book title in Japanese",
    },
    characterBible: {
      type: "string",
      description: "Detailed visual description of the child protagonist",
    },
    styleBible: {
      type: "string",
      description: "Illustration style description for consistent page images",
    },
    storyGoal: {
      type: "string",
      description: "Central narrative goal of the story",
      nullable: true,
    },
    mainQuestObject: {
      type: "string",
      description: "Primary quest object as a single string, not an array",
      nullable: true,
    },
    forbiddenQuestObjects: {
      type: "array",
      items: { type: "string" },
      description: "Objects that must not become the main quest",
      nullable: true,
    },
    titleSpreadText: {
      type: "string",
      description: "Text for title spread page",
      nullable: true,
    },
    openingNarration: {
      type: "string",
      description: "Opening narration text",
      nullable: true,
    },
    coverImagePrompt: {
      type: "string",
      description: "Image prompt for the book cover",
      nullable: true,
    },
    narrativeDevice: {
      type: "object",
      properties: {
        repeatedPhrase: { type: "string", nullable: true },
        visualMotif: { type: "string", nullable: true },
        setup: { type: "string", nullable: true },
        payoff: { type: "string", nullable: true },
        hiddenDetails: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
      },
      nullable: true,
    },
    cast: {
      type: "array",
      items: {
        type: "object",
        properties: {
          characterId: { type: "string" },
          displayName: { type: "string" },
          role: {
            type: "string",
            enum: [
              "protagonist", "buddy", "parent", "sibling",
              "animal", "magical_friend", "object_character",
              "background_recurring",
            ],
          },
          visualBible: { type: "string" },
          characterKind: {
            type: "string",
            enum: [
              "human_child", "human_adult", "animal",
              "magical_creature", "object_character", "background",
            ],
            nullable: true,
          },
          nonHuman: { type: "boolean", nullable: true },
          noHumanFace: { type: "boolean", nullable: true },
          noHumanBody: { type: "boolean", nullable: true },
          scaleHint: { type: "string", nullable: true },
          silhouette: { type: "string", nullable: true },
          colorPalette: {
            type: "array", items: { type: "string" }, nullable: true,
          },
          signatureItems: {
            type: "array", items: { type: "string" }, nullable: true,
          },
          doNotChange: {
            type: "array", items: { type: "string" }, nullable: true,
          },
          negativeCharacterRules: {
            type: "array", items: { type: "string" }, nullable: true,
          },
          canChangeByScene: {
            type: "array", items: { type: "string" }, nullable: true,
          },
        },
        required: ["characterId", "displayName", "role", "visualBible"],
      },
      nullable: true,
    },
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          imagePrompt: { type: "string" },
          compositionHint: { type: "string", nullable: true },
          visualMotifUsage: { type: "string", nullable: true },
          hiddenDetail: { type: "string", nullable: true },
          pageVisualRole: {
            type: "string",
            enum: [
              "opening_establishing", "discovery", "action",
              "emotional_closeup", "object_detail",
              "setback_or_question", "payoff", "quiet_ending",
            ],
            nullable: true,
          },
          appearingCharacterIds: {
            type: "array", items: { type: "string" }, nullable: true,
          },
          focusCharacterId: { type: "string", nullable: true },
        },
        required: ["text", "imagePrompt"],
      },
    },
  },
  required: ["title", "characterBible", "styleBible", "pages"],
};
```

### 5.3 Schema Design Notes

1. **`nullable: true`** is used for all optional fields. Gemini structured output requires either `required` or `nullable` — omitting both may cause the model to always include the field with an empty value.

2. **`pageVisualRole` enum** is defined in the schema. The existing `normalizePageVisualRole()` alias map handles non-enum values gracefully; with `response_schema`, only valid enum values should appear. The alias map remains as a safety net.

3. **`cast[].role` enum** is defined in the schema. `normalizeStoryCharacterRole()` similarly normalizes unknown values. The schema enforces the canonical set.

4. **Page count** (`minItems`/`maxItems`) is NOT enforced in the schema — Gemini JSON Schema subset may not support these constraints. Page count validation remains in `validateStory()` and the quality gate.

5. **Fields not in schema**: `storyModel`, `storyModelFallbackUsed`, `storyGenerationAttempts` are added by the client after generation. They are NOT part of the LLM output schema.

---

## 6. Migration Options

### Option A: Keep Prompt-Only (No Schema)

**Description**: Continue with P4-7 prompt hardening + `validateStory()` runtime validator. No `responseSchema` wiring.

| | Detail |
|---|---|
| **Benefit** | Zero risk. No SDK behavior change. P4-7s validated. |
| **Risk** | `field_type_mismatch` can still recur under model updates or edge inputs. Prompt is a soft contract. |
| **Complexity** | None |
| **When to choose** | If `response_schema` testing reveals creativity degradation or SDK limitations that block adoption. |

### Option B: `responseMimeType: "application/json"` Only (Current State)

**Description**: Already active. Forces JSON output but does not enforce field types or structure.

| | Detail |
|---|---|
| **Benefit** | Already deployed. Reduces `malformed_json` (non-JSON output). |
| **Risk** | Does not prevent `field_type_mismatch` or `schema_structural`. |
| **Complexity** | None — already live |

### Option C: `response_schema` for Root Fields Only

**Description**: Add `responseSchema` with only the top-level required fields (`title`, `characterBible`, `styleBible`, `pages` as array of objects). Leave page and cast sub-fields untyped.

| | Detail |
|---|---|
| **Benefit** | Prevents `schema_structural` failures (missing `pages`, wrong root type). Low complexity. |
| **Risk** | Does not prevent `field_type_mismatch` on `mainQuestObject` or page sub-fields. Partial schema may confuse model. |
| **Complexity** | Low |
| **When to choose** | If full schema causes model issues but root-level enforcement is sufficient. |

### Option D: Full `response_schema` for Story + Pages + Enums

**Description**: Use the complete schema from §5.2 with all fields, page array items, cast array items, and enum constraints.

| | Detail |
|---|---|
| **Benefit** | Maximum type safety. Eliminates `field_type_mismatch` and `field_value_invalid` at the API level. `validateStory()` becomes a redundant safety net (kept for defense-in-depth). |
| **Risk** | Schema too strict may cause model failures or degraded creativity. Large schema increases prompt token count. Complex nested schema may hit SDK limitations. Enum constraints may prevent valid alias values. |
| **Complexity** | Medium-high |
| **When to choose** | If testing confirms no creativity regression and SDK supports the full schema shape. |

### Option E: Hybrid — `response_schema` + Existing Validator (Recommended)

**Description**: Wire `response_schema` with the full schema behind a feature flag. Keep `validateStory()` as the source of truth. The schema is the first line of defense; the validator is the final safety net. Alias normalization (e.g., `pageVisualRole` aliases) continues to operate on the validated output.

| | Detail |
|---|---|
| **Benefit** | Best of both worlds. Schema prevents most type errors at the API level. Validator catches anything the schema misses. Rollback by disabling flag restores current behavior. |
| **Risk** | Schema/validator mismatch drift if maintained separately. Must keep both in sync. |
| **Complexity** | Medium |
| **When to choose** | **Recommended default approach.** |

### Recommendation

**Option E (Hybrid)** is recommended. The `response_schema` is additive — it makes `validateStory()` failures less likely, not unnecessary. The feature flag ensures zero-risk rollback.

---

## 7. Recommended Staged Plan

### P4-9: Add TypeScript JSON Schema Constant (Not Wired) ✅ COMPLETE

**Status**: ✅ COMPLETE (2026-05-21)

**Goal**: Define the `STORY_RESPONSE_SCHEMA` constant in a new file (`functions/src/lib/story-response-schema.ts`). Not imported by `gemini.ts`.

**Deliverables**:
- New file with schema constant matching §5.2
- Unit tests asserting schema shape, required fields, enum values
- Schema snapshot test to detect drift

**Constraints**: No runtime import, no generation behavior change.

**Implementation**:
- Schema file: `functions/src/lib/story-response-schema.ts`
- Test file: `functions/test/story-response-schema.test.ts` (35 tests)
- Schema version: `1.0.0`
- Exports: `STORY_RESPONSE_SCHEMA`, `STORY_RESPONSE_SCHEMA_VERSION`, `STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS`, `STORY_PAGE_REQUIRED_FIELDS`
- Covered fields (12 root, 8 page, 5 narrativeDevice, 15 cast character):
  - Root required: `title`, `characterBible`, `styleBible`, `pages`
  - Root optional (nullable): `storyGoal`, `mainQuestObject`, `forbiddenQuestObjects`, `titleSpreadText`, `openingNarration`, `coverImagePrompt`, `narrativeDevice`, `cast`
  - Page required: `text`, `imagePrompt`
  - Page optional (nullable): `compositionHint`, `visualMotifUsage`, `hiddenDetail`, `pageVisualRole` (enum), `appearingCharacterIds`, `focusCharacterId`
  - Enums: `pageVisualRole` (8 values from `PAGE_VISUAL_ROLES`), `cast[].role` (8 values), `cast[].characterKind` (6 values)
- Intentionally deferred fields:
  - `storyModel`, `storyModelFallbackUsed`, `storyGenerationAttempts` (client-side metadata, not LLM output)
  - `cast[].referenceImageUrl`, `cast[].approvedImageUrl`, `cast[].generatedReferenceImageUrl`, `cast[].referenceImageGeneratedAt`, `cast[].referenceImagePrompt`, `cast[].referenceImageStatus` (app-managed fields)
  - `minItems`/`maxItems` for pages array (Gemini JSON Schema subset may not support; validated by app)
- Not imported by `gemini.ts` or `generate-book.ts` ✅

**Next**: P4-10 — schema compatibility tests against P4-3 fixtures.

---

### P4-10: Schema Compatibility Tests Against Fixtures ✅ COMPLETE

**Status**: ✅ COMPLETE (2026-05-21)  
**File**: `functions/test/story-response-schema-compat.test.ts` (56 tests)  
**Runtime change**: None — test-only addition  

**Goal**: Validate that the schema constant is compatible with valid story shapes and rejects known P4 failure modes, matching `validateStory()` behavior.

**Deliverables** (all met):
- ✅ Valid `GeneratedStory` fixtures pass lightweight schema check (minimal + full)
- ✅ `field_type_mismatch` fixtures fail schema check (mainQuestObject array/object/number, forbiddenQuestObjects string/number)
- ✅ `field_value_invalid` fixtures fail schema check (bad pageVisualRole enum)
- ✅ Schema `required` fields match `validateStory()` required fields (bidirectional check)
- ✅ Page text/imagePrompt type mismatch rejected (array, object, missing)
- ✅ narrativeDevice shape validated (object accepted, array/string rejected)
- ✅ P4-3 fixture relationship documented and verified
- ✅ Import guard: gemini.ts and generate-book.ts do not import story-response-schema

**Schema vs validateStory() gaps found**:
1. **pageVisualRole enum**: Schema is stricter — rejects invalid enum values. `validateStory()` silently normalizes via `normalizePageVisualRole()`. Impact: LOW.
2. **narrativeDevice as array**: Schema rejects. `validateStory()` may accept (`typeof [] === "object"`). Impact: NEGLIGIBLE.
3. **cast role/characterKind enum**: Same pattern as pageVisualRole — schema enforces, validator normalizes. Impact: LOW.
4. **Empty pages array**: `validateStory()` rejects `pages.length === 0`; schema has no `minItems` (deferred). Impact: LOW — quality gate catches downstream.

All gaps are benign. Schema serves as first line of defense; `validateStory()` remains runtime source of truth.

**Constraints**: No runtime change, no live Gemini calls.

---

### P4-11: Wire `responseSchema` Behind Feature Flag ✅ COMPLETE

**Status**: ✅ COMPLETE (2026-05-21)  
**Files**:  
- `functions/src/lib/gemini.ts` (modified — import + flag + wiring)  
- `functions/test/gemini-response-schema-flag.test.ts` (new — 18 tests)  
- `functions/test/story-response-schema-compat.test.ts` (updated — import guard revised)  
**Runtime change**: None by default — `ENABLE_RESPONSE_SCHEMA` defaults to OFF  

**Deliverables** (all met):
- ✅ `isResponseSchemaEnabled()` exported flag helper in `gemini.ts`
- ✅ Flag ON: `generationConfig: { responseMimeType: "application/json", responseSchema: STORY_RESPONSE_SCHEMA }`
- ✅ Flag OFF: `generationConfig: { responseMimeType: "application/json" }` — unchanged from pre-P4-11
- ✅ `validateStory()` remains the final runtime validator regardless of flag state
- ✅ `extractJSON()` / `extractJsonFromLLMResponse()` still called — defense-in-depth
- ✅ `ENABLE_SCHEMA_REPAIR_RETRY` behavior unchanged — both flags are independent
- ✅ 18 tests covering flag helper, config wiring, flag independence, source guards
- ✅ P4-10 import guard updated — gemini.ts now imports `story-response-schema` (expected)

**Flag behavior**:
- `ENABLE_RESPONSE_SCHEMA=true` → responseSchema included in Gemini generationConfig
- Absent / empty / `"false"` / `"0"` / `"TRUE"` → responseSchema NOT included (strict lowercase match)

**How to enable for live smoke (P4-12)**:
```bash
ENABLE_RESPONSE_SCHEMA=true
```

**Rollback**:
- Remove or unset `ENABLE_RESPONSE_SCHEMA` env var
- Redeploy functions (in P4-12 live smoke phase, not this task)

**Constraints**: Flag defaults to OFF. No prompt change. No validator change. `extractJSON()` / `extractJsonFromLLMResponse()` still called. No Firebase deploy.

---

### P4-12: Live Smoke with Feature Flag — ✅ COMPLETE (FAIL — null handling gap)

**Goal**: Deploy with `ENABLE_RESPONSE_SCHEMA=true` and run targeted smoke.

**Deliverables**:
- Deploy functions with flag ON
- Run 3–5 smoke books (bedtime / soft_watercolor / profile=a — same scenario as P4-7s)
- Record: status, page count, schema_validation failures, field_type_mismatch recurrence
- Compare with P4-7s baseline

**Acceptance**: All books complete or fail for unrelated reasons. No new `schema_validation` or `field_type_mismatch` errors. No creativity regression (manual spot check of generated text).

#### P4-12 Results (2026-05-21)

**Flag ON deploy**: ≈02:33 JST, all 13 functions updated.
**Rollback deploy**: ≈03:45 JST, `ENABLE_RESPONSE_SCHEMA` removed, all 13 functions updated.
**Starting HEAD**: 8a6b167.

| # | bookId | theme | style | profile | status | failure |
|---|---|---|---|---|---|---|
| 1 | `7MqcmeZFnODujCBvjsnQ` | bedtime | soft_watercolor | a | **FAILED** | `schema_validation`: `'titleSpreadText' must be a string when provided` (null from Gemini) |
| 2 | `qj94wYvWgSo1sonJMFoe` | fantasy | crayon | a | **partial_completed** (stuck generating/100%) | Story gen passed; 8/8 pages with images (1 completed, 7 fallback_completed). Status transition did not complete. |
| 3 | `nE7oNs7ly1zZirPa0vOH` | emotional-growth | soft_watercolor | a | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` |
| 4 | `czAeQDjrejiOHG5J2IBt` | imagination | anime_storybook | a | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` |
| 5 | `iepD86FyTevQ5gpPPHB8` | bedtime | crayon | b | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` |

**Result**: 4/5 FAILED, 1/5 partial success (story gen passed but book stuck at generating). **Acceptance NOT met.**

#### Root Cause Analysis

**Failure Type A — null handling (Book 1)**:
- Gemini `responseSchema` with `nullable: true` returns explicit `null` values for optional fields (e.g., `titleSpreadText: null`)
- `validateStory()` checks `if (obj.titleSpreadText !== undefined && typeof obj.titleSpreadText !== "string")` — `null !== undefined` is true, `typeof null === "object"` fails the string check
- **This was predicted as Risk R3** in §10 but the null coercion fix was deferred to "if needed"
- **Fix needed**: Add `null`→`undefined` coercion in `validateStory()` before type checks

**Failure Type B — JSON parse failure (Books 3, 4, 5)**:
- `Failed to parse LLM JSON response` — Gemini returned something that `extractJsonFromLLMResponse()` could not parse
- With `responseSchema` enabled, Gemini should return well-formed JSON, but the response may have been truncated or malformed
- May indicate that `extractJSON()` / `extractJsonFromLLMResponse()` conflicts with `responseSchema` structured output format

**Book 2 observation**: Story generation succeeded (all pages generated), indicating `responseSchema` CAN produce valid stories. The 7/8 fallback_completed pages are an image-generation issue (unrelated to schema). The book stuck at `generating/100%` may be a cover generation or status transition issue.

#### Recommended Next Steps

1. ~~**P4-12a (prerequisite)**: Add `null`→`undefined` coercion in `validateStory()` for all nullable fields before type checks.~~ ✅ COMPLETE
2. **P4-12b**: Investigate `Failed to parse LLM JSON response` with `responseSchema` ON — may need to bypass `extractJSON()` when `responseSchema` is enabled (Gemini structured output returns clean JSON without markdown wrapping).
3. **P4-12c**: Re-smoke after P4-12a + P4-12b fixes.
4. **P4-14**: Decide rollout/rollback based on re-smoke results.

#### P4-12a Results

- **Change**: Added `nullToUndefined()` helper in `gemini.ts`; applied to all optional nullable fields in `validateStory()`, `validateStoryCast()`, `validateStringArray()`, and narrative device validation.
- **Scope**: Optional nullable fields now accept `null` (coerced to `undefined`). Required fields (`title`, `characterBible`, `styleBible`, `pages`, `pages[].text`, `pages[].imagePrompt`, `cast[].characterId`, `cast[].displayName`, `cast[].visualBible`) still reject `null`.
- **Tests**: 46 new tests in `story-null-coercion.test.ts` covering null acceptance, required rejection, and P4-12 Book 1 regression.
- **Export**: `validateStory()` exported with `@internal` annotation for direct testing.
- **P4-12 Book 1 fix**: `titleSpreadText: null` now accepted (was the root cause).
- **JSON parse failures**: NOT addressed — remain open as P4-12b.
- **Firebase deploy**: No.
- **ENABLE_RESPONSE_SCHEMA**: Remains OFF/absent in production.

#### P4-12b Results

- **Change**: Added `parseGeminiStoryJsonResponse()` helper in `gemini.ts`. When `ENABLE_RESPONSE_SCHEMA=true`, prefers direct `JSON.parse(rawText.trim())` for Gemini structured output. Falls back to `extractJsonFromLLMResponse()` for defense-in-depth.
- **Flag OFF behavior**: Unchanged. Legacy `extractJSON()` path and P4-5 `extractJsonFromLLMResponse()` path preserved exactly.
- **Flag ON direct path**: Clean JSON from structured output parses via direct `JSON.parse` without extraction overhead.
- **Flag ON fallback**: If direct parse fails (e.g. unexpected markdown fences), `extractJsonFromLLMResponse()` is attempted as fallback.
- **Error safety**: When flag ON, parse errors do not include raw LLM content in error messages (prevents PII leakage).
- **validateStory() unchanged**: Remains final validator after JSON parsing.
- **Tests**: 39 new tests in `response-schema-json-parse.test.ts` covering all parse paths, flag combinations, malformed input, error privacy, and P4-12 regression.
- **P4-12 Books 3/4/5 fix**: JSON parse failures addressed at unit level — structured output now parses via direct path.
- **Live re-smoke**: Required in P4-12c to confirm end-to-end fix.
- **Firebase deploy**: No.
- **ENABLE_RESPONSE_SCHEMA**: Remains OFF/absent in production.

#### P4-12c Results (2026-05-21) — FAIL

**Starting HEAD**: `cf60c44`.
**Flag ON deploy**: ≈11:30 JST, all 13 functions updated, `ENABLE_RESPONSE_SCHEMA=true`.
**Rollback deploy**: ≈11:39 JST, `ENABLE_RESPONSE_SCHEMA` removed, all 13 functions updated.
**Final production state**: `ENABLE_RESPONSE_SCHEMA` absent/OFF.
**Hosting deployed**: No.

| # | bookId | theme | style | profile | status | failure |
|---|---|---|---|---|---|---|
| 1 | `smoke-rschema-12c-1-1779330765965` | bedtime | soft_watercolor | a | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` (malformed_json) |
| 2 | `smoke-rschema-12c-2-1779330765965` | fantasy | crayon | a | **completed** | — (8/8 pages: 1 completed, 7 fallback_completed; storyDurationMs: 59625) |
| 3 | `smoke-rschema-12c-3-1779330765965` | emotional-growth | soft_watercolor | a | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` (malformed_json) |
| 4 | `smoke-rschema-12c-4-1779330765965` | imagination | anime_storybook | a | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` (malformed_json) |
| 5 | `smoke-rschema-12c-5-1779330765965` | bedtime | crayon | b | **FAILED** | `schema_validation`: `Failed to parse LLM JSON response` (malformed_json) |

**Aggregate**: 1/5 completed, 4/5 failed.

| Metric | Count |
|---|---|
| schema_validation failures | 4 |
| malformed_json failures | 4 |
| field_type_mismatch failures | 0 |
| null handling recurrence (P4-12a) | 0 |
| parse failure recurrence (P4-12b) | 4 (genuinely unparseable content, not parse-path bug) |
| responseSchema-specific API errors | 0 |
| quality_gate failures | 0 |
| schemaRepairRetryUsed | not observed (flag OFF) |

**P4-12a verification**: ✅ No null handling errors recurred. `titleSpreadText: null` fix confirmed.
**P4-12b verification**: ✅ Safe error messages confirmed (no raw LLM content in error). Parse path works correctly for successful responses (Book 2 parsed via direct `JSON.parse`).
**P4-12b limitation**: Direct parse + extraction fallback cannot recover genuinely malformed/truncated Gemini responses. The failed books had `storyDurationMs` of 244–250 seconds (vs 60s for success), suggesting response truncation or token-limit issues with structured output.

**Conclusion**: **FAIL** — `malformed_json` recurrence in 4/5 books. P4-12a/P4-12b fixes are validated at the layer they target, but the root cause is upstream: Gemini structured output with the current `STORY_RESPONSE_SCHEMA` produces genuinely unparseable content for most themes. The long `storyDurationMs` values suggest the model is struggling with the schema constraint.

**Recommended next steps**:
1. **P4-12d**: Investigate whether Gemini structured output is truncated (token limit), empty, or semantically corrupted. Add safe diagnostic logging (response length, first/last chars, status code) without raw content.
2. Consider simplifying `STORY_RESPONSE_SCHEMA` (fewer required/nullable fields, smaller enum sets) to reduce model strain.
3. Alternatively, abandon `responseSchema` approach if Gemini structured output proves unreliable and continue with prompt-based JSON + validator.
4. **P4-14**: Decide rollout or rollback based on P4-12d findings.

#### Retry Interaction Check (Scenario D)

- `ENABLE_SCHEMA_REPAIR_RETRY` was absent/OFF during smoke — confirmed independent
- Even if repair retry were ON, it would re-call Gemini with the same `responseSchema` → same null issue
- Flags are confirmed independent as designed in P4-11

---

#### P4-12d: Safe Response Schema Parse Diagnostics (2026-05-21)

**Goal**: Add privacy-safe structural diagnostics when `parseGeminiStoryJsonResponse()` fails under `ENABLE_RESPONSE_SCHEMA=true`, so the next diagnostic smoke can determine whether Gemini structured output is empty, truncated, prose/refusal, fenced, or otherwise malformed.

**Implementation**:
- `buildSafeJsonParseDiagnostics(rawText, context)` — pure function, returns only structural metadata:
  - `lengthChars`, `trimmedLengthChars`, `isEmpty`
  - `startsWithBrace`, `startsWithBracket`, `endsWithBrace`, `endsWithBracket`
  - `startsWithFence`, `containsFence`
  - `likelyTruncatedObject`, `likelyTruncatedArray`
  - `braceBalanceApprox`, `bracketBalanceApprox`, `quoteCountApprox`, `newlineCount`
  - `parseFailureKind`: `empty` | `likely_truncated_object` | `likely_truncated_array` | `fenced_json_unparsed` | `prose_or_refusal` | `malformed_json` | `unknown`
  - `responseSchemaEnabled`, `schemaRepairEnabled`, `directParseFailed`, `fallbackExtractionStatus`
- `getParseErrorDiagnostics(err)` — extracts diagnostics from thrown errors
- Diagnostics attached to Error objects thrown from `parseGeminiStoryJsonResponse()` when flag ON
- `console.warn` emitted in `GeminiClient.generateStory()` with safe diagnostics object
- `storyJsonParseDiagnostics` optional field added to `BookEarlyFailedEvent` in `generation-event-logger.ts`
- Wired into `generate-book.ts` at both schema_validation `book_early_failed` event emission points

**Raw LLM content**: NOT logged. Only numeric/boolean structural metadata.

**Tests**: 31 new tests in `response-schema-parse-diagnostics.test.ts` covering all classification kinds, privacy safety, integration with parse function, flag ON/OFF behavior, and diagnostic extraction.

**Flag state**: `ENABLE_RESPONSE_SCHEMA` remains OFF/absent in production.
**Firebase deploy**: No.
**Prompt behavior**: No change.
**Retry behavior**: No change.
**ImageProvider routing**: No change.

**Intended next step**: P4-12e — run diagnostic live smoke with `ENABLE_RESPONSE_SCHEMA=true`, inspect safe diagnostics in Cloud Logging, rollback, then decide whether to simplify `STORY_RESPONSE_SCHEMA` or abandon responseSchema rollout.

---

### P4-13: Compare `schema_validation` Rate Before/After

**Goal**: Run SLO report or analyze production logs to compare `schema_validation` failure rate before and after `response_schema` enablement.

**Deliverables**:
- SLO report for pre-flag window (P4-7s smoke period)
- SLO report for post-flag window (P4-12 smoke period)
- Compare `schema_validation` count, `field_type_mismatch` count
- Document whether the rate improved

---

### P4-14: Decide Rollout or Rollback

**Goal**: Based on P4-12/P4-13 results, decide whether to:
- **Rollout**: Remove flag guard, make `response_schema` the default
- **Rollback**: Disable flag, continue with prompt-hardening + validator
- **Iterate**: Adjust schema (e.g., remove enum constraints, simplify cast) and re-smoke

---

## 8. Test Strategy

### 8.1 Schema Snapshot Tests (P4-9)

```
describe("STORY_RESPONSE_SCHEMA") {
  it("has required root fields: title, characterBible, styleBible, pages")
  it("pages items have required fields: text, imagePrompt")
  it("mainQuestObject is type string, nullable true")
  it("forbiddenQuestObjects is type array of strings, nullable true")
  it("pageVisualRole enum matches PAGE_VISUAL_ROLES constant")
  it("cast role enum matches allowed StoryCharacterRole values")
  it("schema is a stable snapshot (detect unintended drift)")
}
```

### 8.2 Schema Compatibility Tests (P4-10)

```
describe("schema validates correctly against fixtures") {
  it("accepts a valid GeneratedStory sample")
  it("accepts a minimal story (only required fields)")
  it("rejects mainQuestObject as array (field_type_mismatch)")
  it("rejects pages as non-array")
  it("rejects page missing text field")
  it("rejects unknown pageVisualRole enum value")
  it("accepts valid pageVisualRole enum values")
  it("accepts story with cast array")
  it("rejects cast entry missing characterId")
}
```

### 8.3 Feature Flag Tests (P4-11)

```
describe("ENABLE_RESPONSE_SCHEMA flag") {
  it("does not include responseSchema when flag is OFF")
  it("includes responseSchema in generationConfig when flag is ON")
  it("validateStory() is still called when flag is ON")
  it("flag defaults to OFF")
}
```

### 8.4 General Test Rules

- No live Gemini calls in unit tests
- All schema tests use mock data or P4-3 fixtures
- Feature flag default is OFF in all test environments
- No PII (child name, story text, prompt content) in test fixtures

---

## 9. Runtime Safety

### 9.1 Feature Flag Required

The `response_schema` wiring MUST be behind `ENABLE_RESPONSE_SCHEMA` (or equivalent). Default: OFF.

### 9.2 Default Behavior Unchanged

When the flag is OFF, the generation path is identical to P4-7s production behavior:
- `generationConfig: { responseMimeType: "application/json" }`
- `extractJSON()` / `extractJsonFromLLMResponse()` parsing
- `validateStory()` validation

### 9.3 Privacy Preservation

- No prompt content, `childName`, `storyText`, or raw userId in logs
- `responseSchema` does not contain user data — it is a static schema definition
- Existing privacy rules in `generation-event-logger.ts` remain unchanged

### 9.4 Validator as Source of Truth

`validateStory()` remains the authoritative validator. `response_schema` is additive defense-in-depth:
- Schema reduces the probability of type errors reaching the validator
- Validator catches anything the schema misses (e.g., app-level business rules, page count, cast ID cross-references)
- Both must be maintained in sync

### 9.5 Rollback Path

1. Remove `ENABLE_RESPONSE_SCHEMA=true` from `functions/.env.story-gen-8a769`
2. Redeploy: `firebase deploy --only functions --project story-gen-8a769`
3. No code change required for rollback

---

## 10. Risk Analysis

### R1: SDK Incompatibility

**Risk**: The `@google/generative-ai` v0.24.0 SDK may not support `responseSchema` or may have breaking differences from the Gemini API docs.

**Mitigation**: Test SDK type definitions in P4-9. If `responseSchema` is not in the SDK types, check if it can be passed as `Record<string, unknown>` or if an SDK upgrade is needed.

**Severity**: Medium. Blocks P4-11 if SDK upgrade is required.

### R2: JSON Schema Subset Limitations

**Risk**: Gemini's JSON Schema support is a subset. Features like `oneOf`, `$ref`, `pattern`, `minItems`/`maxItems` are not supported. Complex nested structures (cast with 15+ optional fields) may hit undocumented limits.

**Mitigation**: Start with the full schema in P4-9 tests. If specific fields cause issues, simplify incrementally (e.g., remove cast sub-schema, keep only root + pages).

**Severity**: Low-medium. Can degrade gracefully by simplifying schema.

### R3: Optional / Nullable Mismatch

**Risk**: Gemini may treat `nullable: true` differently from "field absent." The current validator accepts both `undefined` and field-not-present. If Gemini outputs `null` for every nullable field, the validator must handle `null` as equivalent to `undefined`.

**Mitigation**: Add `null`-handling to `validateStory()` (or normalizer) if needed. Test with P4-10 fixtures.

**Severity**: Medium. May require a small code change in P4-11.

### R4: Creativity Degradation

**Risk**: Structured output may constrain the model's generation quality. Forcing enum values and strict types may reduce the variety of story content.

**Mitigation**: P4-12 live smoke includes manual quality spot-check. Compare story text quality with P4-7s baseline. If degradation is observed, iterate on schema (e.g., remove enum constraints for `pageVisualRole`) or rollback.

**Severity**: Medium. Primary concern. Addressed by manual review in P4-12.

### R5: Increased Latency / Token Usage

**Risk**: `responseSchema` adds schema tokens to the generation request. Large schemas (especially with nested cast definition) may increase input token count and latency.

**Mitigation**: Measure `storyDurationMs` in P4-12 smoke and compare with P4-7s baseline. If latency increases >20%, simplify schema or evaluate trade-off.

**Severity**: Low. Schema is ~2KB, small relative to system prompt.

### R6: Schema Too Strict — Model Failures

**Risk**: If the schema is too restrictive (e.g., strict enum on `pageVisualRole` without aliases), the model may fail to generate a valid response, causing generation errors.

**Mitigation**: The existing normalizer handles aliases. With `response_schema`, the model should only output canonical enum values. If model still produces aliases, the `validateStory()` normalizer will handle them. If the model outright fails, the flag can be disabled.

**Severity**: Low-medium. Addressed by the hybrid approach (Option E).

### R7: Schema/Validator Drift

**Risk**: If the schema and validator are maintained separately, they may drift out of sync. A field added to the validator but not the schema (or vice versa) creates a gap.

**Mitigation**: P4-10 adds cross-validation tests between schema and `validateStory()` required fields. P4-9 adds a snapshot test. CI should catch drift.

**Severity**: Low. Addressed by test strategy.

### R8: `rewriteStoryText()` Not Covered

**Risk**: The rewrite path also uses `responseMimeType: "application/json"` but has a different, simpler schema (`{pages: [{text: string}]}`). If `response_schema` is only added to `generateStory()`, the rewrite path remains unprotected.

**Mitigation**: Rewrite failures are less critical (story text already exists; rewrite is an enhancement). A separate schema for rewrite can be added in a follow-up task if needed. Out of P4-8 scope.

**Severity**: Low. Out of scope.

---

## 11. Acceptance Criteria (for Future Implementation)

| Criterion | Verification |
|---|---|
| No default runtime change until flag enabled | Flag OFF → identical behavior to P4-7s |
| Full test suite passes | `npx vitest run` 1311+ PASS |
| `check:phase2` passes | 122+ PASS |
| Build clean | `npm run build` exits 0 |
| Hygiene pass | `check-hygiene.mjs` PASS |
| Live smoke passes (P4-12) | 3+ books complete with flag ON |
| `schema_validation` rate improves (P4-13) | 0 `field_type_mismatch` with flag ON |
| No candidate gate change | Not touched |
| No ImageProvider routing change | Not touched |
| `validateStory()` still called | Source of truth regardless of flag |
| Rollback tested | Flag OFF → redeploy → books still complete |

---

## 12. Relationship to P4-7s

- **P4-7s validated** that prompt hardening (`STORY_JSON_FIELD_TYPE_CONTRACT`) eliminates `mainQuestObject must be a string` in the observed scenario (5/5 no recurrence).
- **P4-8 (`response_schema`)** is the next defensive layer — it prevents the entire **class** of `field_type_mismatch` errors at the API level, not just the specific `mainQuestObject` instance.
- If `response_schema` migration proves too risky or limited by SDK constraints, P4 can **stop at P4-7** with prompt hardening + `validateStory()` as the permanent safety net. The system is already improved.
- `response_schema` does NOT replace `validateStory()` — it supplements it. The validator handles business rules (cast cross-references, page visual role normalization, alias mapping) that are beyond JSON Schema's capability.

---

## 13. Open Questions (to resolve in P4-9)

1. Does `@google/generative-ai` v0.24.0 export a `responseSchema` type in `GenerationConfig`? If not, what is the minimum version required?
2. Does Gemini handle `nullable: true` on nested objects (e.g., `narrativeDevice`) correctly — returning `null` vs. omitting the field?
3. Does the `enum` constraint on `pageVisualRole` cause the model to fail when it would otherwise return a valid alias (e.g., `"closeup"` instead of `"emotional_closeup"`)?
4. Is there a maximum schema depth or property count that Gemini enforces?
5. Does the `cast` sub-schema (15+ optional properties per item, in an array) cause performance issues or model confusion?

These will be answered empirically in P4-9/P4-10 through SDK inspection and local testing.

---

## 14. P4-12e Diagnostic Live Smoke Results

**Date**: 2026-06-20  
**Commit deployed**: `040b9d6` (P4-12d)  
**Flag**: `ENABLE_RESPONSE_SCHEMA=true` deployed ~12:09 JST, rolled back ~12:27 JST  
**Smoke timestamp**: `1779333196430`

### Results

| # | bookId | theme | style | status | failure |
|---|---|---|---|---|---|
| 1 | `smoke-rschema-12c-1-1779333196430` | bedtime | soft_watercolor | **completed** | — (8/8 pages, storyDurationMs: 59,150) |
| 2 | `smoke-rschema-12c-2-1779333196430` | fantasy | crayon | **failed** | schema_validation: malformed_json |
| 3 | `smoke-rschema-12c-3-1779333196430` | emotional-growth | soft_watercolor | **failed** | schema_validation: malformed_json |
| 4 | `smoke-rschema-12c-4-1779333196430` | imagination | anime_storybook | **failed** | validation: rewrite page count mismatch (unrelated) |
| 5 | `smoke-rschema-12c-5-1779333196430` | bedtime | crayon | **failed** | schema_validation: malformed_json |

### Diagnostics (from Cloud Logging `storyJsonParseDiagnostics`)

| Book | lengthChars | storyDurationMs | braceBalance | parseFailureKind |
|------|-------------|-----------------|--------------|-----------------|
| 2 | 334,900 | 244,821 | +2 | likely_truncated_object |
| 3 | 311,173 | 262,274 | +1 | likely_truncated_object |
| 5 | 345,677 | 267,616 | +2 | likely_truncated_object |

### Root Cause

**Output token limit truncation.** When `responseSchema` is enabled, Gemini produces enormously inflated JSON responses (300–346K chars vs. normal ~1–5K). These exceed the model's output token limit and are truncated mid-object, yielding unparseable JSON with unclosed braces.

Evidence:
- All 3 schema_validation failures have `parseFailureKind: "likely_truncated_object"`
- Response sizes 60–70× larger than successful responses
- `storyDurationMs` 245–268s (failures) vs. 59s (success) — model spent max time generating before truncation
- Positive `braceBalance` confirms responses cut off before closing

### Conclusion

`STORY_RESPONSE_SCHEMA` in its current form is **not viable** for production. The schema's complexity (cast sub-schema with 15+ optional properties per array item, deeply nested page objects) causes Gemini to generate verbose structured output that exceeds token limits.

**Recommended next step**: P4-12f — simplify `STORY_RESPONSE_SCHEMA` (flatten cast, reduce optional fields, split into multi-turn) or abandon `responseSchema` in favor of prompt-only hardening (P4-7s) + `validateStory()`.

### Rollback Confirmation

- `ENABLE_RESPONSE_SCHEMA` removed from `functions/.env.story-gen-8a769`
- Functions redeployed ~12:27 JST — all functions updated successfully
- Production is back to prompt-hardening-only mode (P4-7s)

---

## 15. P4-12f Minimal Schema Spike

**Date**: 2026-06-20
**Status**: SPIKE COMPLETE (code + tests, no runtime wiring, no deploy)

### Motivation

P4-12e proved that the full `STORY_RESPONSE_SCHEMA` (3,322 chars) causes Gemini to generate 300–346K char responses that exceed the model's output token limit. This spike evaluates whether a drastically reduced schema might avoid the truncation problem.

### Design

`STORY_RESPONSE_SCHEMA_MINIMAL` keeps only the must-have envelope fields:

| Level | Retained Fields |
|-------|----------------|
| Root | `title`, `characterBible`, `styleBible`, `pages` |
| Page | `text`, `imagePrompt` |

All optional/semantic fields are intentionally excluded:
- Root: `cast`, `narrativeDevice`, `storyGoal`, `mainQuestObject`, `forbiddenQuestObjects`, `titleSpreadText`, `openingNarration`, `coverImagePrompt`
- Page: `pageVisualRole`, `compositionHint`, `visualMotifUsage`, `hiddenDetail`, `appearingCharacterIds`, `focusCharacterId`

### Rationale

- `validateStory()` remains the runtime validator and will accept/normalize any extra fields Gemini emits via prompt instructions.
- Minimal schema only constrains the JSON envelope, reducing structured output pressure.
- Prompt instructions still guide optional field semantics — no prompt change needed.

### Size Comparison

| Schema | JSON.stringify size | Ratio |
|--------|-------------------|-------|
| `STORY_RESPONSE_SCHEMA` (full) | 3,322 chars | 100% |
| `STORY_RESPONSE_SCHEMA_MINIMAL` | 714 chars | 21.5% |

The minimal schema is **78.5% smaller** than the full schema.

### Runtime Wiring

**None.** `STORY_RESPONSE_SCHEMA_MINIMAL` is not imported by `gemini.ts`. The `ENABLE_RESPONSE_SCHEMA` flag still controls the existing full schema. This is a spike artifact only.

### Test Coverage

`functions/test/story-response-schema-minimal.test.ts` — 41 tests:
- Export existence
- Required field exactness (root + page)
- Heavy optional field exclusion (root: 8 fields, page: 6 fields)
- Valid fixture acceptance
- Missing required field rejection
- Wrong type rejection
- Schema size comparison assertion (<35% of full)
- Runtime wiring guard (gemini.ts does not reference minimal schema)
- Full schema unchanged verification

### Next Steps

| Option | Description |
|--------|------------|
| **P4-12g** | Wire `STORY_RESPONSE_SCHEMA_MINIMAL` behind a separate flag/mode and run a tiny live smoke to test whether 714-char schema avoids truncation |
| **P4-14** | Abandon `responseSchema` rollout entirely; continue with prompt hardening (P4-7s) + `validateStory()` + repair retry as the permanent safety net |

**Recommendation**: The 78.5% size reduction is significant. A small P4-12g live smoke (2–3 books) is worth attempting before deciding to abandon `responseSchema`.

---

## 16. P4-12g Minimal Schema Mode Implementation

**Date**: 2026-06-20

### Schema Mode Selector

`getResponseSchemaMode()` added to `gemini.ts`:
- `RESPONSE_SCHEMA_MODE=minimal` → uses `STORY_RESPONSE_SCHEMA_MINIMAL` (714 chars)
- Default / `RESPONSE_SCHEMA_MODE=full` / absent → uses `STORY_RESPONSE_SCHEMA` (3,322 chars)
- Only takes effect when `ENABLE_RESPONSE_SCHEMA=true`
- `validateStory()` remains the runtime validator in all modes
- Parse diagnostics (`buildSafeJsonParseDiagnostics`) unchanged

### Test Coverage

- `functions/test/gemini-response-schema-mode.test.ts` — 21 tests:
  - `getResponseSchemaMode()` default/full/minimal/unknown values
  - Config construction with flag OFF/ON × mode full/minimal
  - Schema identity checks
  - Source-level guards
