# P4-15: Permanent Story JSON SLO Monitoring Plan

**Created**: 2026-05-21
**Updated**: 2026-05-21 (P4-16: SLO report enhancements completed)
**Task**: P4-15 — Permanent story JSON SLO monitoring and repair retry decision framework
**Status**: ACTIVE
**Branch**: main
**Depends on**: P4-14 (responseSchema rollout abandoned — [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md))

---

## 1. Purpose

P4 established a permanent safety stack for Gemini story JSON generation. This document defines:

1. The metrics that must be monitored to ensure story generation reliability.
2. Target SLOs and alert thresholds for the permanent path.
3. A decision framework for `ENABLE_SCHEMA_REPAIR_RETRY`.
4. How to triage story JSON validation failures.

**This document assumes the permanent path** (prompt hardening + `validateStory()` + diagnostics). `responseSchema` is abandoned — do NOT use it as a mitigation. See [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md).

---

## 2. Permanent Safety Stack

| Layer | Mechanism | Task | Status |
|-------|-----------|------|--------|
| L1 | `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()` | P4-7 | ✅ Active |
| L2 | `responseMimeType: "application/json"` | Pre-P4 | ✅ Active |
| L3 | `extractJSON()` / `extractJsonFromLLMResponse()` | P4-4/P4-5 | ✅ Active |
| L4 | `validateStory()` + `nullToUndefined()` | P4-12a | ✅ Active |
| L5 | `classifyStoryJsonFailure()` | P4-2 | ✅ Active |
| L6 | `storyJsonParseDiagnostics` (flag-gated, inactive) | P4-12d | Available |
| L7 | `ENABLE_SCHEMA_REPAIR_RETRY` (flag-gated) | P4-5 | Available (OFF) |
| L8 | SLO monitoring + SLO report script | P2 | ✅ Active |

### 2.1 Production Flag State

| Flag | Current Value | Notes |
|------|--------------|-------|
| `ENABLE_RESPONSE_SCHEMA` | **absent / OFF** | ⚠️ Do NOT enable — see P4_RESPONSE_SCHEMA_DECISION.md |
| `RESPONSE_SCHEMA_MODE` | **absent** | Has no effect unless ENABLE_RESPONSE_SCHEMA=true |
| `ENABLE_SCHEMA_REPAIR_RETRY` | **absent / OFF** | Available for future enablement per §5 |
| `ENABLE_SCHEMA_REPAIR_RETRY` → criteria | See §5 | Must meet evidence threshold before enabling |

---

## 3. Story JSON Metrics

The following metrics are emitted via `generation-event-logger.ts` on `book_early_failed` and `book_outcome` events.

### 3.1 Primary Story Generation Metrics

| Metric | Event | Field | Description |
|--------|-------|-------|-------------|
| Story generation completion rate | `book_outcome` | — | Books where story JSON was parsed and validated successfully |
| schema_validation failure rate | `book_early_failed` | `failureStage = "schema_validation"` | Parse or type error before image generation |
| quality_gate failure rate | `book_early_failed` | `failureStage = "quality_gate"` | Story generated OK but content quality insufficient |
| story_generation failure rate | `book_early_failed` | `failureStage = "story_generation"` | Gemini API 5xx / provider error |
| storyDurationMs p50 / p95 / p99 | `book_early_failed`, `book_outcome` | `storyDurationMs` | Story generation wall time |

### 3.2 Story JSON Failure Sub-Classification (`storyJsonFailureCategory`)

Present on `book_early_failed` when `failureStage = "schema_validation"`. Emitted by `classifyStoryJsonFailure()`.

| Category | What it means | Typical cause |
|----------|---------------|---------------|
| `malformed_json` | LLM output not parseable as JSON | Markdown fencing, truncation, mixed text |
| `schema_structural` | JSON parses but required fields absent | Missing `pages`, `title`, etc. |
| `field_type_mismatch` | Field present but wrong type | `mainQuestObject` as array, `null` where string expected |
| `field_value_invalid` | Type correct but value fails enum/range | Unknown `pageVisualRole` value |
| `provider_error` | Gemini API error (non-retryable) | Not a JSON format issue |
| `timeout` | Story generation exceeded time budget | Reserved — no explicit timeout today |
| `unknown` | Cannot classify | Catch-all |

### 3.3 Repair Retry Metrics (when ENABLE_SCHEMA_REPAIR_RETRY=true)

| Metric | Field | Description |
|--------|-------|-------------|
| schemaRepairRetryUsed | Firestore `schemaRepairRetryUsed` on BookDoc | Whether a repair retry was used (success path) |
| storyGenerationAttempts | `book_early_failed.storyGenerationAttempts` | Attempt count when both attempts failed (=2) |
| repair success rate | derived | `schemaRepairRetryUsed=true books that completed` / `all triggered repair retries` |

### 3.4 Cloud Logging Filters

```
# All schema_validation failures
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.failureStage = "schema_validation"

# Story duration for failed books
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.storyDurationMs > 0

# Story duration for all outcomes
jsonPayload.message = "generation_event"
  AND (jsonPayload.eventName = "book_early_failed" OR jsonPayload.eventName = "book_outcome")
  AND jsonPayload.storyDurationMs > 0

# schema_validation by sub-category
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.failureStage = "schema_validation"
  AND jsonPayload.storyJsonFailureCategory = "malformed_json"
```

---

## 4. Target SLOs and Alert Thresholds

### 4.1 Story Generation SLOs

These targets apply to the permanent path (prompt hardening + `validateStory()` only, no repair retry).

| Metric | Target | Threshold: Investigate | Threshold: Alert |
|--------|--------|------------------------|------------------|
| Story generation success rate | ≥ 98% | < 98% | < 95% |
| schema_validation failure rate | ≤ 2% | > 2% | > 5% |
| malformed_json rate | ≤ 1% | > 1% | > 2% |
| field_type_mismatch rate | ≤ 0.5% | > 0.5% | > 1% |
| storyDurationMs p95 | ≤ 120s (120,000ms) | > 120s | > 180s |
| storyDurationMs p99 | ≤ 200s (200,000ms) | > 200s | > 300s |

> **Rationale**:
> - 2% schema_validation aligns with the book hard-failed rate SLO (≤ 2%) from `docs/PRODUCT_ROADMAP.md §1`.
> - p95 story duration 120s: story generation normally completes in ~30–60s for the permanent path. 120s allows headroom for quality retry and model variance.
> - `malformed_json` and `field_type_mismatch` are separately tracked because they have different root causes and mitigations.

### 4.2 Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| 3 consecutive `schema_validation` failures | Investigate | Check `storyJsonFailureCategory` pattern. Is it `malformed_json` (transient), `field_type_mismatch` (systematic prompt issue), or `schema_structural` (new field missing)? |
| schema_validation rate > 5% over 24h | Alert | Same triage as above. If `malformed_json` dominant → temporary, monitor. If `field_type_mismatch` dominant → prompt hardening needed. |
| malformed_json rate > 2% over 24h | Alert | Check whether Gemini model version changed. Run spot smoke book. |
| field_type_mismatch rate > 1% over 24h | Alert | Specific field is being returned with wrong type. Identify which field from error messages in Firestore `technicalErrorMessage`. Add prompt contract if not already present. |
| storyDurationMs p95 > 180s | Investigate | Check Gemini API status. Check quality retry frequency (elevated quality retry = higher p95). |
| storyDurationMs p99 > 300s | Alert | Likely model API degradation or quality retry loop. Check `storyGenerationAttempts` if available. |
| quality_gate failure rate > 3% | Investigate | Story content quality below threshold — prompt/template issue. Not a JSON format issue. |

### 4.3 How to Measure

```sh
# Export Cloud Logging events (see GENERATION_SLO_RUNBOOK.md §3)
gcloud logging read \
  'jsonPayload.message = "generation_event"' \
  --project=story-gen-8a769 \
  --format=json \
  --freshness=7d \
  > tmp/generation-events.json

# Run SLO report
node scripts/report-generation-slo.mjs --input tmp/generation-events.json
```

> The SLO report script (`report-generation-slo.mjs`) aggregates `book_early_failed` events by `errorCategory`. Starting with **P4-16** (2026-05-21), the script also:
> - Outputs `storyJsonFailures.byStoryJsonFailureCategory` (count, composition share, rate among all books).
> - Outputs `latency.storyDurationMs` with p50/p95/p99 for all events, `book_outcome` only, and `book_early_failed` only.
> - Outputs `repairRetrySignals.multipleAttemptsCount` and `storyGenerationAttemptsDistribution`.
>
> Use `--format json` or `--format markdown` to get the enhanced output.
> If exporting raw Cloud Logging data, use the filters in §6.1 for spot-checking per-category counts.

---

## 5. Repair Retry Decision Framework (`ENABLE_SCHEMA_REPAIR_RETRY`)

`ENABLE_SCHEMA_REPAIR_RETRY` was implemented in P4-5 as a one-shot retry on `schema_validation` failures. It is currently OFF. This section defines when and whether to enable it.

### 5.1 What ENABLE_SCHEMA_REPAIR_RETRY does

When `ENABLE_SCHEMA_REPAIR_RETRY=true`:
- On a `schema_validation` failure, `processBookGeneration()` automatically retries `generateStoryWithQualityGate()` once with the same parameters.
- If the retry succeeds: book proceeds to image generation; `schemaRepairRetryUsed: true` stored in Firestore.
- If the retry also fails: `book_early_failed` emitted with `storyGenerationAttempts: 2`.
- The retry adds ~30–90s of additional latency (one full story generation attempt).
- The retry adds one additional Gemini API call at the story model cost.

### 5.2 Keep OFF Criteria

Keep `ENABLE_SCHEMA_REPAIR_RETRY=false` while:
- `schema_validation` rate ≤ SLO target (≤ 2%).
- Failures are distributed (no systematic pattern) — consistent with transient Gemini behavior.
- No single `storyJsonFailureCategory` is dominant (all categories < 1%).
- User-visible book failure rate is within acceptable range.

**Rationale**: If the failure rate is already within SLO, the additional cost, latency, and operational complexity of repair retry is not justified.

### 5.3 Consider Enabling Criteria

Consider enabling `ENABLE_SCHEMA_REPAIR_RETRY=true` if ALL of the following are true:

1. **`schema_validation` rate persistently above 2%** over a 7-day baseline.
2. **Dominant failure category is recoverable**: `malformed_json` (transient parse issue) is the most likely to recover on retry. `field_type_mismatch` may or may not — depends on whether it's stochastic or systematic.
3. **Manual retry evidence**: At least one confirmed case where manual retry of the same book succeeded. This validates that the failure is transient.
4. **Cost headroom**: Gemini API cost budget allows ~2× story generation calls for the affected percentage.
5. **Latency budget**: p95 story latency is well within 180s even without retry overhead.

### 5.4 Do NOT Use Repair Retry For

| Scenario | Why not |
|----------|---------|
| Systematic `field_type_mismatch` | Retry will produce the same wrong-type output. Fix the prompt instead. |
| `provider_error` / Gemini 5xx | Already handled by `isRetryableGeminiFailure()` at the outer catch. Retry here is redundant. |
| `schema_structural` failures | If a required field is consistently missing, the model needs a prompt fix, not a retry. |
| `quality_gate` failures | These are not `schema_validation` — quality retry is already built in. |
| Masking prompt regressions | If a model update broke field types, retry will consistently fail. Address the prompt. |
| Compensating for `responseSchema` | responseSchema is abandoned. Do not use retry as a substitute. |

### 5.5 Enabling Process

If criteria in §5.3 are met, follow this process:

1. **Establish a baseline**: Run SLO report over 7+ days. Record `schema_validation` rate, dominant `storyJsonFailureCategory`, `storyDurationMs` p95.
2. **Predict impact**: Estimate the proportion of failures that are likely recoverable (i.e., stochastic `malformed_json`) vs. deterministic (systematic `field_type_mismatch`).
3. **Write a decision note**: Record the decision to enable with the evidence (failure rate, category breakdown, cost projection).
4. **Enable behind flag only**: Set `ENABLE_SCHEMA_REPAIR_RETRY=true` in `functions/.env.story-gen-8a769`.
5. **Run a tiny smoke first** (3–5 books): Confirm normal books still complete successfully with flag ON. Verify no regression in `storyGenerationAttempts=1` for normal completions.
6. **Deploy functions**: `firebase deploy --only functions --project story-gen-8a769`.
7. **Monitor for 48h**:
   - `schemaRepairRetryUsed` rate in Firestore
   - `storyGenerationAttempts=2` rate in Cloud Logging
   - `storyDurationMs` p95 change
   - `schema_validation` failure rate change
8. **Rollback if**: repair retry success rate < 50%, or p95 story latency increases > 30%, or `schema_validation` rate does not decrease.

### 5.6 Rollback Criteria

Immediately remove `ENABLE_SCHEMA_REPAIR_RETRY=true` if:
- Repair retry success rate is < 50% (failures are systematic, not transient).
- `storyDurationMs` p95 increases > 30% from baseline.
- Cost increase is unexpected.
- `schema_validation` failure rate does not decrease or increases.
- Any regression in `book_outcome.completed` rate.

### 5.7 Retiring ENABLE_SCHEMA_REPAIR_RETRY

Consider retiring (removing) `ENABLE_SCHEMA_REPAIR_RETRY` if:
- After 30+ days of monitoring, `schema_validation` rate remains consistently below 0.5% (well within SLO) without repair retry.
- The dominant failure mode is `field_type_mismatch` (not recoverable by retry).
- Prompt hardening alone is sufficient.

Do NOT retire proactively — retain as a dormant option until monitoring confirms it is truly unnecessary.

---

## 6. Story JSON Validation Triage Flow

When `schema_validation` failures are observed:

```
1. Check failureStage
   ├─ "schema_validation" → story JSON parse/type error (pre-image) → go to 2
   ├─ "quality_gate"      → thin content, retry often succeeds → see §6.4
   └─ "story_generation"  → Gemini 5xx / API error → check Gemini status

2. Check storyJsonFailureCategory (from book_early_failed event)
   ├─ "malformed_json"      → likely transient → go to 3
   ├─ "field_type_mismatch" → systematic prompt issue? → go to 4
   ├─ "schema_structural"   → required field missing → go to 5
   ├─ "field_value_invalid" → enum value wrong → go to 6
   └─ "unknown"             → inspect technicalErrorMessage in Firestore

3. malformed_json triage
   ├─ Isolated (< 1%): monitor, likely transient
   ├─ Sustained (> 2%): check Gemini model version, run smoke book
   └─ If eligible: consider ENABLE_SCHEMA_REPAIR_RETRY per §5

4. field_type_mismatch triage
   ├─ Which field? Read Firestore technicalErrorMessage
   ├─ Is it mainQuestObject? → Already hardened in P4-7. Check if new model regressed.
   ├─ Is it another field? → Add to STORY_JSON_FIELD_TYPE_CONTRACT in buildSystemPrompt()
   └─ Do NOT use repair retry for systematic field type errors

5. schema_structural triage
   ├─ Which field is missing? Read Firestore technicalErrorMessage
   ├─ Is it a new field added to the prompt schema without validateStory() handling?
   └─ Fix: add default or make field truly optional in validateStory()

6. field_value_invalid triage
   ├─ Which enum? Usually pageVisualRole or cast role
   ├─ normalizePageVisualRole() handles aliases — if failing, new alias needed
   └─ Fix: add alias to normalizePageVisualRole() or normalizeStoryCharacterRole()

⚠️  Do NOT enable ENABLE_RESPONSE_SCHEMA at any step.
     responseSchema was tested and abandoned (P4-14). It causes ~94% generation failure.
     See docs/P4_RESPONSE_SCHEMA_DECISION.md.
```

### 6.1 Cloud Logging Queries for Triage

```
# See all schema_validation failures with category breakdown
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.failureStage = "schema_validation"

# Find all malformed_json failures
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.storyJsonFailureCategory = "malformed_json"

# Find all field_type_mismatch failures
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.storyJsonFailureCategory = "field_type_mismatch"

# Slow story generation (p95 analysis)
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_early_failed"
  AND jsonPayload.storyDurationMs > 120000
```

### 6.2 What NOT to Do

| Do NOT | Reason |
|--------|--------|
| Enable `ENABLE_RESPONSE_SCHEMA` | Abandoned — causes ~94% book failure due to output truncation |
| Touch `ReplicateImageAdapter` / `OpenAIImageAdapter` | schema_validation is pre-image; adapters are uninvolved |
| Touch candidate gate | schema_validation is pre-image; gate is uninvolved |
| Change retry behavior without the decision process in §5 | Adds cost and latency without measured benefit |
| Change prompt without a test fixture for the new type constraint | May create regressions |

---

## 7. Baseline Measurement Plan

Before the first P4-15 monitoring period, establish a baseline:

### 7.1 Steps

1. Export 7+ days of generation events from Cloud Logging (see `GENERATION_SLO_RUNBOOK.md §3`):

   ```sh
   gcloud logging read \
     'jsonPayload.message = "generation_event"' \
     --project=story-gen-8a769 \
     --format=json \
     --freshness=7d \
     > tmp/p4-15-baseline-events.json
   ```

2. Run the SLO report:

   ```sh
   node scripts/report-generation-slo.mjs --input tmp/p4-15-baseline-events.json --format json > tmp/p4-15-baseline-report.json
   node scripts/report-generation-slo.mjs --input tmp/p4-15-baseline-events.json --format markdown > tmp/p4-15-baseline-report.md
   ```

   The report now automatically produces `storyJsonFailures.byStoryJsonFailureCategory` (P4-16),
   `latency.storyDurationMs` percentiles, and `repairRetrySignals`. No separate Cloud Logging
   queries are needed for the standard metrics.

3. For spot-checking or edge-case investigation, use the Cloud Logging filters in §6.1.

### 7.2 Baseline Record (P4-16-baseline — 2026-05-21)

**Measurement window**: 2026-05-14 – 2026-05-21 (7 days)
**Data source**: dev/test environment only — no production users in this window
**Total events**: 80 (40 `generation_started`, 19 `book_outcome`, 21 `book_early_failed`)
**Report command**: `node scripts/report-generation-slo.mjs --input tmp/p4-16-baseline-events.json --format json`

| Metric | Baseline Value | Measured Date | Notes |
|--------|---------------|---------------|-------|
| schema_validation rate | 18/40 = **45.0%** | 2026-05-21 | ⚠️ DEV/TEST ONLY — not representative of production. Expected far lower with real traffic. |
| malformed_json count/rate | 14/40 = **35.0%** (77.8% of schema_validation) | 2026-05-21 | Dominant category. DEV/TEST only. |
| field_type_mismatch count/rate | 3/40 = **7.5%** (16.7% of schema_validation) | 2026-05-21 | DEV/TEST only. |
| storyDurationMs p50 (outcome only) | **59,150ms (~59s)** | 2026-05-21 | ✅ Within 120s SLO target |
| storyDurationMs p95 (outcome only) | **89,316ms (~89s)** | 2026-05-21 | ✅ Within 120s SLO target (target ≤ 120s) |
| storyDurationMs p99 (outcome only) | **90,856ms (~91s)** | 2026-05-21 | ✅ Within 200s SLO target |
| storyDurationMs p50 (all events) | **244,154ms (~4m)** | 2026-05-21 | Elevated by quality-retry loops in early-failed books |
| storyDurationMs p95 (all events) | **332,484ms (~5.5m)** | 2026-05-21 | Driven by failed book paths with multiple story generation attempts |
| Total book_early_failed | **21** of 40 started | 2026-05-21 | DEV/TEST data only |
| Total book_outcome | **19** (completed=19, partial=0, failed=0) | 2026-05-21 | 100% readable rate |

**Repair retry signals**: `multipleAttemptsCount = 0` — no repair retries triggered (`ENABLE_SCHEMA_REPAIR_RETRY=OFF`).

#### ENABLE_SCHEMA_REPAIR_RETRY Decision (2026-05-21)

**Decision: remain OFF.**

Rationale:

- Current data is **dev/test only** (40 `generation_started`, no production users). The 45% `schema_validation` rate is not representative of production.
- Criteria for enabling (§5.3) require a **production baseline** showing persistent `schema_validation` rate > 2%.
- The `malformed_json`-dominant pattern (78% of failures) is consistent with dev testing edge cases, not a systematic prompt regression.
- `storyDurationMs p95` for successful books (89s) is within the 120s SLO. No latency headroom pressure that would justify the additional retry latency.
- **Re-run this baseline** after the first 7+ days of production traffic and apply §5.2/§5.3 criteria.

**Next baseline run**: after first production users generate books. Commands:

```sh
node scripts/_export-cloud-logging.mjs --out tmp/p4-16-prod-baseline-events.json
node scripts/report-generation-slo.mjs --input tmp/p4-16-prod-baseline-events.json --format markdown
```

> Use this table to detect regressions. Re-measure when: (a) first production traffic accumulates, (b) Gemini model version changes, (c) prompt changes are deployed.

---

## 8. Enhancement Backlog (P4-16 / P2 follow-up)

| ID | Enhancement | Value | Effort | Status |
|----|-------------|-------|--------|--------|
| **P4-16-a** | Add `storyJsonFailureCategory` breakdown to `report-generation-slo.mjs` output | High | Low | ✅ COMPLETE (2026-05-21) |
| **P4-16-b** | Add `storyDurationMs` histogram to SLO report (p50/p95/p99) | High | Medium | ✅ COMPLETE (2026-05-21) |
| **P4-16-c** | Add `schemaRepairRetryUsed` rate to SLO report | Medium | Low | Not started |
| **P4-16-d** | Cloud Logging saved queries for story JSON triage | Medium | Low | Not started |
| **P4-16-e** | Admin Dashboard panel: schema_validation sub-category trend | Medium | High | Not started |
| **P4-16-f** | Automated alert: 3 consecutive schema_validation → webhook/notification | Low-Medium | Medium | Not started |

---

## 9. Related Documents

| Document | Relevance |
|----------|-----------|
| [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md) | P4-14: responseSchema abandoned |
| [P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md](P4_GEMINI_RESPONSE_SCHEMA_MIGRATION_PLAN.md) | Full smoke results and evidence |
| [PHASE4_GEMINI_JSON_HARDENING_PLAN.md](PHASE4_GEMINI_JSON_HARDENING_PLAN.md) | P4 overall hardening plan |
| [GENERATION_SLO_RUNBOOK.md](GENERATION_SLO_RUNBOOK.md) | Operational runbook (§8.11 for schema_validation playbook) |
| [GENERATION_SLO_THRESHOLD_POLICY.md](GENERATION_SLO_THRESHOLD_POLICY.md) | Full threshold policy and severity levels |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | P4 slice tracker |
| `scripts/report-generation-slo.mjs` | SLO report script (P2-6) |
| `functions/src/lib/generation-event-logger.ts` | Event types and `StoryJsonFailureCategory` definition |
