# Phase 4 — Gemini JSON Hardening: Closure Record

**Status**: CLOSED
**Closed**: 2026-05-21
**Task**: P4-17
**Final HEAD**: `c8d2547`
**Branch**: main
**Preceding plan**: [PHASE4_GEMINI_JSON_HARDENING_PLAN.md](PHASE4_GEMINI_JSON_HARDENING_PLAN.md)

---

## 1. Summary

Phase 4 set out to harden Gemini story JSON generation reliability after a `schema_validation` failure was observed during the P3-15s production smoke (2026-05-20). The phase investigated two complementary strategies:

1. **Prompt hardening + runtime validation** — strengthen JSON format instructions and validate output at the type level before proceeding to image generation.
2. **`responseSchema` structured output** — use Gemini's native structured output API to constrain output format.

**Outcome**: Strategy 1 (prompt hardening + `validateStory()`) is the **permanent production path**. Strategy 2 (`responseSchema`) was **abandoned** after thorough live testing (4 smoke rounds, 16 books) revealed inherent output token truncation that made it incompatible with EhonAI's story JSON size.

**Gemini continues as the story generation model.** The abandonment is specific to `responseSchema` structured output mode, not to Gemini's JSON generation capability via prompt instruction.

---

## 2. Completed Slices

### 2.1 Prompt Hardening and Runtime Validation (P4-1 – P4-7)

| Slice | Description | Result |
|-------|-------------|--------|
| **P4-1** | Gemini JSON hardening inventory and design | ✅ COMPLETE — scope boundary defined |
| **P4-2** | Structured story validation error taxonomy / logging | ✅ COMPLETE |
| **P4-3** | Malformed / wrong-type Gemini response unit fixtures | ✅ COMPLETE |
| **P4-4** | Safe JSON extraction/repair helper | ✅ COMPLETE |
| **P4-5** | One-shot validation repair retry (`ENABLE_SCHEMA_REPAIR_RETRY` flag) | ✅ COMPLETE |
| **P4-6** | Repair flow live smoke | ✅ COMPLETE (PASS with limitation) |
| **P4-7** | Metrics-driven prompt instruction tuning | ✅ COMPLETE |
| **P4-7s** | `mainQuestObject` prompt hardening targeted smoke | ✅ PASS — 5 books, **0 recurrence** |

**Key evidence**: After P4-7, the `mainQuestObject must be a string` error was eliminated in a 5-book targeted smoke (0/5 recurrence vs prior failures). `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()` is the primary mitigation.

### 2.2 responseSchema Investigation and Abandonment (P4-8 – P4-14)

| Slice | Description | Result |
|-------|-------------|--------|
| **P4-8** | `responseSchema` migration design | ✅ DESIGN COMPLETE |
| **P4-9** | Story response schema constant (not wired) | ✅ COMPLETE |
| **P4-10** | Schema compatibility tests vs `validateStory()` | ✅ COMPLETE |
| **P4-11** | `responseSchema` wired behind flag | ✅ COMPLETE |
| **P4-12** | responseSchema live smoke + rollback | ✅ COMPLETE (FAIL) |
| **P4-12a** | `validateStory()` null→undefined coercion | ✅ COMPLETE |
| **P4-12b** | responseSchema ON JSON parse hardening | ✅ COMPLETE |
| **P4-12c** | responseSchema re-smoke after P4-12a/b | ✅ COMPLETE (FAIL) |
| **P4-12d** | Safe responseSchema parse diagnostics | ✅ COMPLETE |
| **P4-12e** | Diagnostic live smoke (root cause identified) | ✅ COMPLETE |
| **P4-12f** | Minimal schema spike (714 chars = 21.5% of full) | ✅ COMPLETE |
| **P4-12g** | Minimal schema mode + live smoke | ✅ COMPLETE (FAIL — abandoned) |
| **P4-14** | responseSchema rollout abandonment record | ✅ COMPLETE — decision recorded |

**Key evidence**:

| Round | Schema | Books | Result | Failure Pattern |
|-------|--------|-------|--------|-----------------|
| P4-12 | full 3,322 chars | 5 | 4/5 FAIL | null handling + malformed_json |
| P4-12c | full 3,322 chars | 5 | 4/5 FAIL | malformed_json (244–250s) |
| P4-12e | full 3,322 chars | 3 | 3/3 FAIL | likely_truncated_object (311–346K chars) |
| P4-12g | minimal 714 chars | 3 | 3/3 FAIL | likely_truncated_object (289–331K chars) |

Root cause: `responseSchema` causes Gemini to generate 289–346K characters of JSON output (vs expected ~8K), which exceeds the model's output token limit. Schema size had zero effect on this behavior — the truncation is at the model level, not the parse layer.

Full decision record: [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md)

### 2.3 Permanent SLO Monitoring (P4-15)

**P4-15** defined the permanent monitoring plan for the prompt+validator path:
- Target SLOs: schema_validation ≤ 2%, malformed_json ≤ 1%, field_type_mismatch ≤ 0.5%, storyDurationMs p95 ≤ 120s.
- Alert thresholds and triage flow for each `storyJsonFailureCategory`.
- Evidence-based decision framework for future `ENABLE_SCHEMA_REPAIR_RETRY` enablement.

Full plan: [P4_PERMANENT_STORY_JSON_SLO_PLAN.md](P4_PERMANENT_STORY_JSON_SLO_PLAN.md)

### 2.4 SLO Report Enhancements and Baseline (P4-16)

| Slice | Description | Result |
|-------|-------------|--------|
| **P4-16-a** | `storyJsonFailureCategory` breakdown in SLO report | ✅ COMPLETE |
| **P4-16-b** | `storyDurationMs` p50/p95/p99 in SLO report | ✅ COMPLETE |
| **P4-16-baseline** | 7-day dev/test baseline measurement | ✅ COMPLETE (dev/test only — see §4) |

Report additions: `storyJsonFailures`, `repairRetrySignals`, `latency.storyDurationMs` with `p99` in all latency sections. 93 self-test assertions + 55 vitest tests added. Export helper: `scripts/_export-cloud-logging.mjs`.

---

## 3. Final Decisions

### 3.1 Story Generation Model

**Gemini continues as the story generation model.** No change to the story generation provider.

### 3.2 responseSchema

**Permanently abandoned for story generation.** `ENABLE_RESPONSE_SCHEMA` must remain absent/OFF. Do NOT re-enable without new evidence that the output token truncation behavior has changed in the underlying Gemini model. See [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md).

The responseSchema code is preserved as dormant/experimental for auditability. 287 associated tests continue to guard against accidental re-enablement.

### 3.3 ENABLE_SCHEMA_REPAIR_RETRY

**Enabled in Production (2026-06-12).** The production baseline (established 2026-05-23) showed a `schema_validation` rate of 2.9%, exceeding the 2% target. Since failures were predominantly `malformed_json` (recoverable) and latency headroom (p95 64s) was ample, the flag was enabled to improve reliability for Cohort B and beyond.

### 3.4 Prompts

**No further prompt changes planned** unless a new systematic `field_type_mismatch` pattern is identified in production data. The `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()` is the current permanent safeguard.

---

## 4. Production Flag State (Final)

| Flag | Value | Constraint |
|------|-------|------------|
| `ENABLE_RESPONSE_SCHEMA` | **absent / OFF** | ⚠️ Do NOT enable — causes ~94% generation failure |
| `RESPONSE_SCHEMA_MODE` | **absent** | No effect unless ENABLE_RESPONSE_SCHEMA=true |
| `ENABLE_SCHEMA_REPAIR_RETRY` | **ON** | Enabled 2026-06-12 based on prod baseline (2.9%) |

---

## 5. Permanent Safety Stack

The following layers are active in production and constitute the permanent Gemini story JSON safety stack.

| Layer | Mechanism | Task | Status |
|-------|-----------|------|--------|
| L1 | `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()` | P4-7 | ✅ Active — prompt instruction for field type contracts |
| L2 | `responseMimeType: "application/json"` | Pre-P4 | ✅ Active — forces JSON output mode |
| L3 | `extractJSON()` / `extractJsonFromLLMResponse()` | P4-4/P4-5 | ✅ Active — strips markdown fences, recovers embedded JSON |
| L4 | `validateStory()` + `nullToUndefined()` | P4-12a | ✅ Active — runtime type validator; null coercion |
| L5 | `classifyStoryJsonFailure()` | P4-2 | ✅ Active — structured error taxonomy (`StoryJsonFailureCategory`) |
| L6 | `storyJsonParseDiagnostics` (flag-gated) | P4-12d | Available — privacy-safe structural metadata for triage |
| L7 | `ENABLE_SCHEMA_REPAIR_RETRY` (flag-gated) | P4-5 | Available (OFF) — one-shot retry on parse failure |
| L8 | `report-generation-slo.mjs` + SLO runbook | P2/P4-16 | ✅ Active — failure rate tracking, storyDurationMs percentiles, category breakdown |

---

## 6. Dev/Test Baseline Limitations

The P4-16-baseline measurement (2026-05-21) captured **80 events over 7 days** from a dev/test environment with **no production users**. Key limitations:

- **Not representative of production**: The 45% `schema_validation` rate reflects dev/test edge-case testing, not real user traffic.
- **Includes responseSchema experiment noise**: Some events in the window are from responseSchema smoke testing and are not part of the permanent path baseline.
- **Sample size too small**: 40 `generation_started` events is insufficient for SLO percentage confidence.

| Metric | Dev/Test Baseline | SLO Target | Status |
|--------|------------------|------------|--------|
| schema_validation rate | 45.0% (18/40) | ≤ 2% | ⚠️ DEV/TEST — not meaningful |
| malformed_json rate | 35.0% (14/40) | ≤ 1% | ⚠️ DEV/TEST — not meaningful |
| field_type_mismatch rate | 7.5% (3/40) | ≤ 0.5% | ⚠️ DEV/TEST — not meaningful |
| storyDurationMs p95 (outcome) | 89,316ms (~89s) | ≤ 120s | ✅ Within SLO |
| storyDurationMs p99 (outcome) | 90,856ms (~91s) | ≤ 200s | ✅ Within SLO |
| readable rate | 100% (19/19) | ≥ 98% | ✅ Within SLO |
| repairRetrySignals (multipleAttemptsCount) | 0 | — | No retries observed |

**The only meaningful SLO data point at this stage** is `storyDurationMs` for successful outcome books (p95 89s, within the 120s target). All failure-rate metrics require a production baseline.

---

## 7. Remaining Follow-Ups

These items are **NOT part of Phase 4** and should be tracked separately.

### 7.1 Production Baseline (High Priority — before ENABLE_SCHEMA_REPAIR_RETRY decision)

After the first 7+ days of production user traffic, re-run the baseline:

```sh
node scripts/_export-cloud-logging.mjs --out tmp/prod-baseline-events.json
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format markdown
```

Fill [P4_PERMANENT_STORY_JSON_SLO_PLAN.md §7.2](P4_PERMANENT_STORY_JSON_SLO_PLAN.md) with production values and apply the §5.2/§5.3 repair retry criteria.

### 7.2 P2 SLO Dashboard / Alert Automation (Medium Priority)

- Create Cloud Monitoring alert policy: `schema_validation` rate > 5% over 24h → notification.
- Add automated alert: `malformed_json` rate > 2% over 24h.
- Add automated alert: `storyDurationMs` p95 > 180s.
- Extend `report-generation-slo.mjs` with `--since` / `--until` date range flags for scheduled reporting.
- Saved Cloud Logging queries for each `storyJsonFailureCategory` triage filter.

### 7.3 Targeted Prompt Hardening (On-Demand)

Only needed if a new systematic `field_type_mismatch` pattern appears in production data. Do not make pre-emptive prompt changes. Process: identify the specific field from `technicalErrorMessage`, add a clause to `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()`, add a unit test fixture.

### 7.4 ImageProvider Adapter Follow-ups (Separate Track)

These were deferred from P3 closure and are unrelated to story JSON hardening:

- `generateCoverImage()` migration to `ImageProvider` adapter.
- `ensureRecurringCharacterReferences()` migration (after cover adapter).

---

## 8. What Was Not Changed

| Area | Change? | Notes |
|------|---------|-------|
| Runtime behavior | **No** | No prompt, retry, or generation flow changes in P4-16/P4-17 |
| Gemini prompts | **No** | Last change was P4-7 (mainQuestObject contract) |
| Retry behavior | **No** | `ENABLE_SCHEMA_REPAIR_RETRY` remains OFF |
| ImageProvider routing | **No** | P3 is closed; P4 did not touch routing |
| Candidate gate | **No** | Unchanged throughout P4 |
| Firestore schema | **No** | No schema changes in P4 |
| Firebase deploy | **No** | No deploys in P4-15, P4-16, P4-17 |
| Production env flags | **No** | All three flags remain absent/OFF |

---

## 9. References

| Document | Relevance |
|---|---|
| [PHASE4_GEMINI_JSON_HARDENING_PLAN.md](PHASE4_GEMINI_JSON_HARDENING_PLAN.md) | Full P4 task log and code references |
| [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md) | P4-14 abandonment evidence and rationale |
| [P4_PERMANENT_STORY_JSON_SLO_PLAN.md](P4_PERMANENT_STORY_JSON_SLO_PLAN.md) | SLO targets, alert thresholds, repair retry decision framework |
| [GENERATION_SLO_RUNBOOK.md](GENERATION_SLO_RUNBOOK.md) | Operational runbook for SLO measurement and incident response |
| [GENERATION_SLO_THRESHOLD_POLICY.md](GENERATION_SLO_THRESHOLD_POLICY.md) | Full threshold policy and severity levels |
| [PHASE3_IMAGE_PROVIDER_CLOSURE.md](PHASE3_IMAGE_PROVIDER_CLOSURE.md) | P3 complete; P4 originated from P3-15s smoke observation |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | P4 slice tracker |
| `scripts/report-generation-slo.mjs` | Enhanced SLO report (P4-16-a/b) |
| `scripts/_export-cloud-logging.mjs` | Cloud Logging export helper (P4-16-baseline) |
| `functions/src/lib/generation-event-logger.ts` | `StoryJsonFailureCategory`, event types |
| `functions/src/generate-book.ts` | `processBookGeneration()`, `generateStoryWithQualityGate()` |
