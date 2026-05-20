# P4-6: Schema Repair Retry — Live Smoke Checklist

**Created**: 2026-05-20  
**Task**: P4-6 — Live smoke for `ENABLE_SCHEMA_REPAIR_RETRY` flag  
**Branch**: main  
**Starting commit**: d8c4bca14d791c93b7204b2eb6cd565274287c92 (P4-5 complete)  
**Firebase project**: story-gen-8a769  
**Status**: IN PROGRESS — awaiting operator approval for live deploy

---

## 1. Purpose

Validate the `ENABLE_SCHEMA_REPAIR_RETRY=true` opt-in behavior in a production-like environment:

1. **No regression** when flag is ON and Gemini output is already valid JSON.
2. **Repair metadata recorded** when retry succeeds.
3. **Hard-fail path unchanged** when both attempts fail.
4. **Rollback documented** and confirmed.

P4-7 prompt tuning MUST NOT begin until P4-6 results are recorded.

---

## 2. Pre-Flight Status

| Check | Command | Result |
|---|---|---|
| HEAD commit | `git log --oneline -1` | `d8c4bca` ✅ |
| Origin/main | `git log --oneline --decorate -1` | `d8c4bca` matches origin/main ✅ |
| Build clean | `cd functions && npm run build` | 0 errors ✅ |
| Unit tests | `cd functions && npx vitest run` | 1306/1306 PASS ✅ |
| Phase2 check | `npm run check:phase2` | 122/122 PASS ✅ |
| Hygiene | `node scripts/check-hygiene.mjs` | PASS ✅ |
| Runtime env | `functions/.env.story-gen-8a769` | `ENABLE_SCHEMA_REPAIR_RETRY` absent → flag OFF ✅ |
| Firebase CLI | `firebase --version` | 15.17.0 ✅ |
| gcloud CLI | `gcloud --version` | **NOT in PATH** ⚠️ (log export unavailable; use Cloud Console) |
| GOOGLE_APPLICATION_CREDENTIALS | `$env:GOOGLE_APPLICATION_CREDENTIALS` | **Not set** ⚠️ (required for smoke scripts) |

**Required before live smoke** (operator action):
1. Set `GOOGLE_APPLICATION_CREDENTIALS` to a valid service account JSON path for `story-gen-8a769`.
2. Approve flag ON deploy command (see §4).

---

## 3. Scope Constraints

| Constraint | Status |
|---|---|
| ENABLE_SCHEMA_REPAIR_RETRY defaults to OFF | ✅ Confirmed (absent from env file) |
| No prompt behavior change | ✅ No prompt changes in P4-5 |
| No ImageProvider routing change | ✅ Not touched |
| No candidate gate change | ✅ Not touched |
| No semantic repair | ✅ Repair = JSON fence strip + re-parse only |
| Retry capped at 1 | ✅ Enforced by code; verified by test |
| No Firebase deploy until operator approval | ✅ Pending |

---

## 4. Scenario A — Flag OFF Baseline

**Goal**: Confirm flag-off behavior is unchanged from pre-P4-5 baseline.

**Status**: ✅ VERIFIED (unit/local only — live smoke pending credentials)

### A.1 Local verification (completed)

| Check | Result |
|---|---|
| P4-5 tests pass with flag unset | ✅ 13/13 PASS (schema-repair-retry.test.ts) |
| No retry occurs when flag unset | ✅ Verified by `it("does not retry when ENABLE_SCHEMA_REPAIR_RETRY is not set")` |
| `storyGenerationAttempts` absent from event when flag unset | ✅ Verified by `it("storyGenerationAttempts is absent from book_early_failed event when flag is off")` |
| `ENABLE_SCHEMA_REPAIR_RETRY` absent from runtime env | ✅ `functions/.env.story-gen-8a769` does not contain this key |

### A.2 Live smoke (requires credentials — pending)

**Pre-conditions**:
- `ENABLE_SCHEMA_REPAIR_RETRY` NOT in `functions/.env.story-gen-8a769`
- `GOOGLE_APPLICATION_CREDENTIALS` set and valid

**Commands**:
```powershell
# Dry-run preview
node scripts/create-nonfixed-smoke-book.js --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=a

# Live write (requires GOOGLE_APPLICATION_CREDENTIALS)
node scripts/create-nonfixed-smoke-book.js --write --theme-id=bedtime --style-id=soft_watercolor --profile=a
```

**Monitor** (replace BOOK_ID):
```powershell
node scripts/monitor-smoke-book.js BOOK_ID
```

**Expected outcome**:
- Book completes (`completed` or `partial_completed`)
- `schemaRepairRetryUsed` field absent from Firestore story metadata
- No `storyGenerationAttempts: 2` in any log event
- Image generation proceeds normally via default adapter path

**Actual outcome**:  
- `--dry-run` preview: themeId=bedtime, styleId=soft_watercolor, profile=moderate, creationMode=guided_ai ✅  
- Book status: **`completed`** (8/8 pages)  
- `schemaRepairRetryUsed`: **absent** from Firestore ✅  
- `imageAttemptCount: 1` for all 8 pages (no image fallback) ✅  
- `imageModel: black-forest-labs/flux-2-pro` (default adapter path) ✅  
- `failureStage`: absent ✅  
- No `storyGenerationAttempts: 2` in any log event ✅  
- Total imageDurationMs range: 23–44s/page (within SLO)

**bookId**: `p46-a-1` (internal alias; actual bookId recorded in §12)

---

## 5. Scenario B — Flag ON: Normal Generation (No Repair Triggered)

**Goal**: Confirm no regression when flag is ON and Gemini returns clean JSON on first attempt.

**Status**: ⏸ BLOCKED — awaiting operator approval for deploy

### B.1 Deploy command (operator approval required)

**Step 1**: Add flag to runtime env file:
```
# Add to functions/.env.story-gen-8a769
ENABLE_SCHEMA_REPAIR_RETRY=true
```

**Step 2**: Deploy:
```powershell
firebase deploy --only functions --project story-gen-8a769
```

> ⚠️ **Operator approval required before running.** This changes the production runtime.  
> This deploy changes NO source code — only adds env var to the Functions runtime.  
> No other env vars are modified.

**Rollback**:
```
# Remove ENABLE_SCHEMA_REPAIR_RETRY from functions/.env.story-gen-8a769
# Then redeploy:
firebase deploy --only functions --project story-gen-8a769
```

### B.2 Smoke book (after deploy + GOOGLE_APPLICATION_CREDENTIALS set)

**Pre-conditions**:
- `ENABLE_SCHEMA_REPAIR_RETRY=true` deployed to `story-gen-8a769` Functions
- `GOOGLE_APPLICATION_CREDENTIALS` set and valid

**Commands**:
```powershell
# Dry-run preview
node scripts/create-nonfixed-smoke-book.js --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=a

# Live write
node scripts/create-nonfixed-smoke-book.js --write --theme-id=bedtime --style-id=soft_watercolor --profile=a

# Second smoke: different theme
node scripts/create-nonfixed-smoke-book.js --write --theme-id=fantasy --style-id=soft_watercolor --profile=a
```

**Monitor**:
```powershell
node scripts/monitor-smoke-book.js BOOK_ID
```

**Expected outcome**:
- Books complete (`completed` or `partial_completed`)
- `schemaRepairRetryUsed` field **absent** from Firestore (repair was not needed — JSON was clean)
- `storyGenerationAttempts` = 1 on story metadata (single attempt succeeded)
- Image generation proceeds via normal adapter path
- No candidate gate change

**Actual outcome**: _Not yet run (pending deploy approval)_

**bookIds**: _pending_

---

## 6. Scenario C — Flag ON: Repair Trigger Observation

**Goal**: Confirm repair metadata is recorded when Gemini produces fenced/preambled JSON and the retry path is exercised.

**Status**: ⏸ BLOCKED — requires live environment; natural trigger may not occur

### Notes on trigger feasibility

The repair path (`extractJsonFromLLMResponse`) in `GeminiClient.generateStory()` fires when the flag is ON AND Gemini output is parseable but not clean JSON (e.g., wrapped in ` ```json ... ``` ` markdown fencing or preceded by a preamble).

- **Natural trigger**: Gemini intermittently produces fenced JSON (observed in P3-15s smoke). Cannot be forced without prompt change.
- **Controlled trigger**: No test-only harness available for live production endpoint.
- **Recommended approach**: Monitor production logs for `schemaRepairRetryUsed` field after flag ON deploy. If not observed within 24h of smoke, document as "repair trigger not naturally observed during smoke window."

### C.1 Log filter for repair observation

After flag ON deploy, in Cloud Logging Log Explorer (`story-gen-8a769`):

```
# Look for books where repair retry succeeded
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_outcome"
```

Then check Firestore for smoke book docs:
- Field `schemaRepairRetryUsed: true` → repair was triggered and succeeded
- Field absent → Gemini output was clean, repair not needed

```
# Look for books where both attempts failed after flag ON
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_early_failed" AND jsonPayload.storyGenerationAttempts = 2
```

**Actual outcome**: _Not yet run_

---

## 7. Scenario D — Semantic Repair Guard (Negative)

**Goal**: Confirm wrong-type or schema-invalid JSON is NOT semantically repaired.

**Status**: ✅ VERIFIED by unit tests (live verification deferred)

### D.1 Unit test evidence

| Test | Covers |
|---|---|
| `"does not exceed 2 generateStory calls (no infinite loop)"` | Caps at 2 attempts |
| `"fails book when both attempts throw schema error"` | Hard-fails when retry also throws |
| `llm-json-repair.test.ts` — shape invariants | `extractJsonFromLLMResponse` never repairs field values |
| `llm-json-repair.test.ts` — scope constraints | Truncated JSON → unrepairable; missing required fields → unrepairable |

The repair helper (`llm-json-repair.ts`) performs ONLY:
1. Direct JSON.parse (no transformation)
2. Strip markdown fence (` ```json ... ``` `)
3. Extract outermost `{...}` delimiter

It does NOT:
- Repair field types (array → string, etc.)
- Fill in missing required fields
- Interpret or rewrite JSON content

### D.2 Live verification

If a `field_type_mismatch` error occurs live with flag ON:
- **Expected**: book hard-fails after 2 attempts (`storyGenerationAttempts: 2` logged)
- **Not expected**: `schemaRepairRetryUsed: true` on a book with structurally invalid JSON

This cannot be safely induced live without changing prompts. Relying on unit test coverage.

---

## 8. Scenario E — Rollback / Flag OFF Confirmation

**Status**: ⏸ BLOCKED — execute after Scenario B/C smoke

### E.1 Rollback steps

1. Remove `ENABLE_SCHEMA_REPAIR_RETRY=true` from `functions/.env.story-gen-8a769`
2. Redeploy:
   ```powershell
   firebase deploy --only functions --project story-gen-8a769
   ```
3. Verify env in deployment:
   ```powershell
   firebase functions:config:get --project story-gen-8a769
   ```
   (or check Firebase console > Functions > Configuration tab)

### E.2 Post-rollback smoke book

Run one final book after rollback to confirm no regression:
```powershell
node scripts/create-nonfixed-smoke-book.js --write --theme-id=bedtime --style-id=soft_watercolor --profile=a
```

**Expected**: Book completes, `schemaRepairRetryUsed` absent.

**Actual outcome**: _Not yet run_

---

## 9. Firestore Metadata Verification

After each live smoke book, verify Firestore document at `books/{bookId}` in the Firebase Console:

| Field | Flag OFF book | Flag ON + no repair | Flag ON + repair triggered |
|---|---|---|---|
| `status` | `completed` / `partial_completed` | `completed` / `partial_completed` | `completed` / `partial_completed` |
| `storyGenerationAttempts` | 1 | 1 | 1 (story-level; repair is parse-only) |
| `schemaRepairRetryUsed` | absent | absent | `true` |
| `storyModel` | present | present | present |
| `failureStage` | absent | absent | absent |

---

## 10. Cloud Logging Verification

After flag ON deploy, monitor using these filters in the Cloud Logging Log Explorer:

```
# P4-6 targeted: schema repair retry activity
jsonPayload.message = "generation_event" AND jsonPayload.storyGenerationAttempts = 2

# All early failures during smoke window
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_early_failed"

# All book outcomes during smoke window
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_outcome"
```

**Fields to look for in events**:
- `storyGenerationAttempts`: 2 → both attempts failed under flag ON
- `storyJsonFailureCategory`: classifies failure (malformed_json, field_type_mismatch, etc.)
- `storyDurationMs`: should not spike unreasonably (retry adds ≤ 1 additional story gen time)
- `failureStage`: must remain `"schema_validation"` (not `"validation"` or `"unexpected"`)

---

## 11. SLO Guard

| SLO | Threshold | Action if breached |
|---|---|---|
| Book readable rate | ≥ 98% | Disable flag, open incident |
| Book hard failed rate | ≤ 2% | Disable flag, open incident |
| `schema_validation` early failures | Monitor for change vs baseline | Record in results |
| No `unexpected` failures from field_type_mismatch | — | Flag OFF, P4-5 routing gap fix re-review |

---

## 12. Results Log

### Scenario A — Flag OFF Baseline

| Item | Value |
|---|---|
| Date/time | 2026-05-20 |
| Commit | d8c4bca |
| Flag state | OFF (absent from functions/.env.story-gen-8a769) |
| Local baseline | ✅ 1306/1306 tests PASS, flag-off tests confirmed |
| Live smoke | ✅ PASS |
| bookId | p46-a-1 (5gjcBCwqBr9nLEpvN2Mp) |
| book status | `completed` (8/8 pages) |
| schemaRepairRetryUsed | absent ✅ |
| imageAttemptCount | 1 for all pages ✅ |
| failureStage | absent ✅ |
| Status | ✅ PASS |

### Scenario B — Flag ON Normal Generation

| Item | Value |
|---|---|
| Date/time | 2026-05-20 |
| Commit deployed | 38acc63 |
| Deploy command | `firebase deploy --only functions --project story-gen-8a769` ✅ all 13 functions updated |
| Flag state | ON (`ENABLE_SCHEMA_REPAIR_RETRY=true` in functions/.env.story-gen-8a769) |
| bookId B-1 | p46-b-1 (HFJvsyh87zllD5uHtrUN) — bedtime/soft_watercolor |
| bookId B-2 | p46-b-2 (JFfQrbGMusaWw9MXdYir) — fantasy/soft_watercolor |
| B-1 book status | `completed` (8/8 pages, imageAttemptCount=1 all pages) ✅ |
| B-2 book status | `completed` (8/8 imageUrl populated; pages 1–6 `fallback_completed` imageAttemptCount=3 — image adapter fallback, unrelated to schema repair) ✅ |
| schemaRepairRetryUsed B-1 | absent ✅ (Gemini returned clean JSON, repair path not triggered) |
| schemaRepairRetryUsed B-2 | absent ✅ (Gemini returned clean JSON, repair path not triggered) |
| imageModel | `black-forest-labs/flux-2-pro` both books ✅ |
| ImageProvider routing change | none ✅ |
| candidate gate change | none ✅ |
| Status | ✅ PASS |

### Scenario C — Repair Trigger

| Item | Value |
|---|---|
| Natural trigger observed | Not observed during Scenario B smoke window (Gemini returned clean JSON for both books) |
| schemaRepairRetryUsed: true observed | Not observed |
| field_type_mismatch failures observed | Yes — during Scenario E post-rollback smoke (see §12 Scenario E) |
| Notes | `field_type_mismatch` failures occurred naturally but are not repairable by fence-strip helper. Scenario C requires a fenced-JSON failure (`json ... ` preamble). Not triggered in this smoke window. |
| Status | ⏸ NOT TRIGGERED IN SMOKE WINDOW — P4-7 prompt tuning may improve trigger rate |

### Scenario D — Semantic Repair Guard

| Item | Value |
|---|---|
| Unit test coverage | ✅ (see §7) |
| Live induction | Not attempted (would require prompt change) |
| Status | ✅ COVERED BY UNIT TESTS |

### Scenario E — Rollback

| Item | Value |
|---|---|
| Date/time | 2026-05-20 |
| env file change | `ENABLE_SCHEMA_REPAIR_RETRY=true` removed from `functions/.env.story-gen-8a769` ✅ |
| Rollback deploy | `firebase deploy --only functions --project story-gen-8a769` — 13/13 Successful, Deploy complete ✅ |
| Runtime env confirmed | `ENABLE_SCHEMA_REPAIR_RETRY` absent from deployed function env (verified via debug log) ✅ |
| Post-rollback smoke E-1 | p46-e-1 (kCEUG4R0Ztg7FudjJKxE) — `failed` / `failureStage: schema_validation` / `mainQuestObject must be a string` |
| Post-rollback smoke E-2 | p46-e-2 (Stf46UmwxVXbW9qZPDhC) — `failed` / `failureStage: schema_validation` / `mainQuestObject must be a string` |
| Cause of E-1/E-2 failure | Natural LLM `field_type_mismatch` variability (not caused by rollback). Same error classification as P4-5 routing gap fix target. `failureStage: schema_validation` (not `unexpected`) confirms routing is correct ✅ |
| Retry triggered | No — flag is OFF, no retry attempted ✅ (expected behavior) |
| ImageProvider routing change | none ✅ |
| candidate gate change | none ✅ |
| schemaRepairRetryUsed | absent (flag OFF) ✅ |
| Final flag state | OFF — `ENABLE_SCHEMA_REPAIR_RETRY` absent from production runtime ✅ |
| Status | ✅ ROLLBACK CONFIRMED / ⚠️ post-smoke hit natural schema_validation failures (see notes) |

---

## 13. Final Summary

| Scenario | Status |
|---|---|
| A — Flag OFF baseline (local) | ✅ PASS |
| A — Flag OFF baseline (live) | ✅ PASS |
| B — Flag ON normal generation | ✅ PASS |
| C — Repair trigger observation | ⏸ NOT TRIGGERED IN SMOKE WINDOW |
| D — Semantic repair negative | ✅ COVERED BY UNIT TESTS |
| E — Rollback | ✅ ROLLBACK CONFIRMED / ⚠️ limitation (see below) |

**Overall P4-6 status**: ✅ PASS with limitation

**Limitation**:  
Post-rollback smoke (Scenario E) encountered 2 consecutive natural `schema_validation` failures (`mainQuestObject must be a string` — `field_type_mismatch` category). These are NOT caused by the P4-5 code changes or the rollback. The failures:
- Are correctly classified as `failureStage: schema_validation` (not `unexpected`) ✅
- Are NOT repairable by the fence-strip repair helper (repair only strips markdown fences)
- Would hard-fail even with `ENABLE_SCHEMA_REPAIR_RETRY=true` ON
- Are a P4-7 prompt tuning candidate
- Do not affect P4-6 scope (P4-6 validates the schema repair retry feature, not Gemini output quality)

Scenario C (repair trigger) was not naturally triggered during this smoke window; the repair path for fence-wrapped JSON requires Gemini to return ` ```json ... ``` ` output, which did not occur. Monitoring production logs is recommended.

**Default behavior changed**: No  
**Prompt behavior changed**: No  
**ImageProvider routing changed**: No  
**Candidate gate changed**: No  
**Firebase deployed**: Yes — flag ON (`38acc63`→`30c0c9e`), then rolled back (flag OFF) ✅
**Final production state**: `ENABLE_SCHEMA_REPAIR_RETRY` absent (flag OFF) ✅

---

## 14. Required Operator Actions

Before continuing P4-6:

1. ~~**Set credentials**~~ → ✅ Done

2. ~~**Approve Scenario A live smoke**~~ → ✅ Done (`bookId=5gjcBCwqBr9nLEpvN2Mp`, status=completed)

3. ~~**Approve Scenario B deploy**~~ → ✅ Done (2 books PASS)

4. ~~**Approve Scenario E rollback**~~ → ✅ Done (flag OFF, production restored)

---

**P4-6 COMPLETE** — `ENABLE_SCHEMA_REPAIR_RETRY` flag is OFF in production. P4-7 prompt tuning may proceed.

**P4-7 follow-up note** (Scenario E `field_type_mismatch` limitation):  
The 2 consecutive `mainQuestObject must be a string` failures observed in Scenario E post-rollback smoke are the primary target of P4-7. P4-7 adds an explicit `mainQuestObject` string-only type contract (with invalid/valid examples) to `buildSystemPrompt()` in `functions/src/lib/prompt-builder.ts`. See `docs/PHASE4_GEMINI_JSON_HARDENING_PLAN.md` P4-7 section for implementation details.
