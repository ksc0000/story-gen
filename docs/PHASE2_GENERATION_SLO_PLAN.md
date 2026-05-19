# Phase 2 Generation SLO and Regression Guard Plan

**Created**: 2026-05-20  
**Starting HEAD**: `5d93cd5`  
**Status**: P2-1 inventory COMPLETE (docs-only)  
**Scope**: Generation reliability SLOs, risk inventory, regression guard design, Phase 2 implementation slices  
**Non-goal**: No code changes, no production routing changes, no Firestore schema migration, no deploy.

---

## 1. Current Generation Architecture Summary

### 1.1 Generation Modes

| Mode | Entry | Story | Image provider | Notes |
|---|---|---|---|---|
| `fixed_template` | Template doc `creationMode: "fixed_template"` | Gemini expands fixed `FixedStoryTemplate` fields (no free LLM generation) | Replicate (pro_consistent → klein_fast fallback) | Most reliable path; story is deterministic |
| `guided_ai` | Template doc `creationMode: "guided_ai"` | Gemini generates story JSON (1 call per book) | Replicate (pro_consistent → klein_fast fallback) | Most common non-fixed path |
| `original_ai` | User-written free text | Gemini generates story JSON | Replicate (pro_consistent → klein_fast fallback) | Most open-ended; highest variance |

### 1.2 Image Provider Routing

```
book.imageModelProfile
    │
    ▼
gateImageModelProfile()          ← T6-59: candidate gate (generate-book.ts)
    │   if isCandidateProfile() && !generationOverride.allowCandidateProfile
    │       → strip to undefined (→ plan default: pro_consistent)
    │   else → pass through
    ▼
resolveImageModelProfile()       ← replicate.ts
    │   free: klein_fast
    │   paid/premium: pro_consistent
    │   explicit: pass through
    ▼
resolveImageFallbackProfiles()   ← replicate.ts
    │   pro_consistent  → [pro_consistent, klein_fast]
    │   klein_base      → [klein_base, klein_fast]
    │   openai_image_candidate → [openai_image_candidate]  (no Replicate fallback)
    │   flux11_pro_candidate   → [flux11_pro_candidate, klein_fast]
    │   klein_fast     → [klein_fast]
    ▼
generatePageImage() with withImageTimeout(120_000ms)
    │   attempt 1: primary profile
    │   attempt 2: fallback profile (if different)
    ▼
ImageClient (ReplicateImageClient | OpenAIImageClient)
```

### 1.3 Candidate / Gated Path (T6-59)

- `openai_image_candidate` and `flux11_pro_candidate` are **candidate profiles**
- Gate check: `gateImageModelProfile()` in `generate-book.ts` reads `users/{uid}.generationOverride.allowCandidateProfile`
- If `allowCandidateProfile !== true`, the candidate profile is stripped → book falls back to plan default (`pro_consistent`)
- OpenAI path has NO Replicate fallback: `resolveImageFallbackProfiles("openai_image_candidate") = ["openai_image_candidate"]`
- `gateImageModelProfile` is unit-tested in `generate-book.test.ts` (T6-59 test suite, 6 assertions)

### 1.4 Book and Page Status Lifecycle

```
Book: generating → completed | partial_completed | failed
Page: completed | image_failed | fallback_completed
```

- `partial_completed`: ≥1 page failed but ≥1 page succeeded. Re-generable via page regeneration UI.
- `image_failed` page: available for re-generation (page regeneration flow).
- `failed`: all pages failed, or story generation failed before images.

### 1.5 Generation Metrics Stored in Firestore (per page)

`imageDurationMs`, `imageAttemptCount`, `imageFallbackUsed`, `imageModel`, `imageTimedOut`, `imageFailureReason`, `regenerationAttemptCount`

### 1.6 SLO Dashboard (already implemented)

- `save-daily-slo-snapshot.ts`: Daily 03:00 JST snapshot → Firestore `sloSnapshots/`
- `save-weekly-slo-snapshot.ts`: Weekly Mon 03:15 JST → Firestore `sloSnapshots/weekly_*`
- `slo-metrics.ts`: Pure computation (bookReadableRate, bookHardFailedRate, pageImageFailureRate, fallbackRate, timeoutRate, imageP50/P90/P95, regenerationSuccessRate)
- Admin UI: SLO Dashboard + Snapshot History (already implemented per PRODUCT_ROADMAP.md)

---

## 2. Known Risk Areas

### 2.1 Image Generation Risks

| Risk | Severity | Known? | Mitigation |
|---|---|---|---|
| E005 content sensitivity rejection (Replicate flux-2-pro) | HIGH | ✅ Yes (T6-27〜T6-31) | `imagination` × `crayon` on Hold; L1+L2 guardrails deployed; L3 sanitizer deferred |
| E005 is prompt-deterministic (retry/backoff doesn't help) | HIGH | ✅ Yes | No workaround without model or prompt change |
| `klein_fast` Starting滞留 (Replicate queue delay) | MEDIUM | ✅ Yes | Isolated to fallback only; not in primary path |
| `openai_image_candidate` has no Replicate fallback | MEDIUM | ✅ Yes | OpenAI network issues cause immediate page_failed |
| Timeout (120s) → `imageTimedOut = true` | MEDIUM | ✅ Yes | Counted in SLO metrics |
| `partial_completed` without re-gen UI | HIGH | ✅ Yes | Addressed: page regeneration flow exists |
| image URL stored as Firebase Storage download URL (token-based) | MEDIUM | ✅ Yes | Download tokens persist; no expiry concern in current setup |

### 2.2 Candidate Gate Risks

| Risk | Severity | Notes |
|---|---|---|
| Candidate profile leaking to non-enrolled users | CRITICAL | Gate exists in T6-59; unit-tested (6 assertions in generate-book.test.ts) |
| `allowCandidateProfile` field missing from user doc (undefined coercion) | MEDIUM | `=== true` comparison safe; undefined → false |
| Firestore user doc read failure at gate check | HIGH | Would cause Function failure before generation begins |
| Admin incorrectly enrolling wrong user | LOW | Manual Firestore write process; auditable |

### 2.3 Story Generation Risks

| Risk | Severity | Notes |
|---|---|---|
| Gemini story JSON malformed / schema mismatch | MEDIUM | `story-quality.ts` quality gate catches thin content |
| Gemini 503 / quota error → book `failed` | MEDIUM | `GeminiServiceUnavailableError` maps to `failed` status |
| `hiddenDetail` promoted to main objective | MEDIUM | Prompt design + quality gate; not a code regression risk |
| `storyGoal` / `mainQuestObject` missing from output | MEDIUM | Quality gate; missing fields logged |

### 2.4 Template / Routing Risks

| Risk | Severity | Notes |
|---|---|---|
| Production routing changed by accident (e.g. removing gate) | CRITICAL | Must be caught by regression tests |
| `fixed_template` page count inconsistency | MEDIUM | `fixedStory.pages.length` must match expected count |
| `seed-templates.ts` sync write overwriting Firestore state | LOW | `template:sync:write` is explicit command; not automated |

### 2.5 Asset / UI Risks

| Risk | Severity | Notes |
|---|---|---|
| Public asset URL returning 404 (broken image in UI) | MEDIUM | T7 addressed 37/37; Firebase Hosting serves from `out/` |
| Stale `.png` reference in source code after WebP migration | LOW | T7-4.6 / T7-6 cleaned up; grep guard recommended |
| `sampleImages` schema regression (missing light/premium) | LOW | seed-templates.test.ts covers 5 target templates |
| demo.ts diverging from seed-templates.ts | LOW | T7-6 aligned; future edits may drift |

### 2.6 Firestore Consistency Risks

| Risk | Severity | Notes |
|---|---|---|
| `undefined` written to Firestore | HIGH | Enforced by copilot instructions; `firestore-sanitize.ts` exists |
| Timestamp pair inconsistency (`createdAt` without `createdAtMs`) | MEDIUM | Pair requirement in copilot instructions |
| Book stuck in `generating` status (Function crash mid-run) | HIGH | `cleanup-stale-generation.ts` handles this (Daily 03:30 JST) |

---

## 3. Proposed SLOs / SLIs

### 3.1 Book-level SLOs (from PRODUCT_ROADMAP.md)

| SLI | Target | Computation | Source |
|---|---|---|---|
| Book readable rate | ≥ 98% | `(completed + partial_completed) / total` | `slo-metrics.ts:bookReadableRate` |
| Book hard failed rate | ≤ 2% | `failed / total` | `slo-metrics.ts:bookHardFailedRate` |

### 3.2 Page/Image SLOs

| SLI | Target | Computation | Source |
|---|---|---|---|
| Page image p95 latency | ≤ 120s | p95 of `imageDurationMs` across completed pages | `slo-metrics.ts:imageP95Ms` |
| Image failed rate | ≤ 2% | `image_failed pages / total pages` | `slo-metrics.ts:pageImageFailureRate` |
| Regeneration success rate | ≥ 95% | `regeneration_success / regeneration_attempt` | `slo-metrics.ts:regenerationSuccessRate` |
| Fallback rate | informational | `fallback_completed / total pages` | `slo-metrics.ts:fallbackRate` |
| Timeout rate | informational | `imageTimedOut pages / total pages` | `slo-metrics.ts:timeoutRate` |

### 3.3 Candidate Gate SLIs (proposed — not yet measured)

| SLI | Target | Notes |
|---|---|---|
| Gate-block correctness | 100% | Non-enrolled user request → candidate profile stripped |
| Gate-pass correctness | 100% | Enrolled user request → candidate profile used |
| Candidate profile leak rate | 0% | Any non-zero is a production incident |

These are currently covered by unit tests only. Live production measurement would require structured logging of gating decisions (→ P2-2).

### 3.4 Asset SLIs (proposed)

| SLI | Target | Notes |
|---|---|---|
| Public asset URL 200 rate | 100% | Group A/B/C/D; currently verified manually in T7 |
| Sample modal image load success | 100% | `sampleImages.light` / `.premium` → HTTP 200 |
| Stale .png reference in source | 0 | grep check in hygiene or CI |

### 3.5 Additional Proposed Metrics

| Metric | Purpose | Gap |
|---|---|---|
| E005 occurrence rate (per profile / category) | Detect E005 regression in new category combinations | Not yet counted; needs structured log |
| Provider error taxonomy | Classify failures (E005 / timeout / network / schema) | Currently logged as raw strings |
| Story generation latency p95 | Detect Gemini slowdown | Not in current SLO snapshot |
| Gemini 503 rate | Detect Gemini availability degradation | Logged; not counted |
| `partial_completed` page gap distribution | How many pages fail per partial book | Not in current snapshot |

---

## 4. Minimum Viable Dashboard / Report Design

### 4.1 What Currently Exists

| Signal | Where |
|---|---|
| `bookReadableRate`, `bookHardFailedRate` | Daily/weekly SLO snapshot → Admin SLO Dashboard |
| `pageImageFailureRate`, `fallbackRate`, `timeoutRate` | Same snapshot |
| `imageP50/P90/P95` | Same snapshot |
| `regenerationSuccessRate` | Same snapshot |
| Per-page `imageDurationMs`, `imageFallbackUsed`, `imageTimedOut`, `imageFailureReason` | Firestore `books/{id}/pages/{n}` |
| Admin quality review scores | Firestore `qualityTasks/` |

### 4.2 Gaps (not yet captured)

| Signal | Priority | Notes |
|---|---|---|
| Gate decision event (gate-pass / gate-block) | HIGH | Logged as `logger.warn` only; not queryable |
| Provider error type / code (E005 vs timeout vs network) | HIGH | `imageFailureReason` is a string; no taxonomy |
| Story generation latency | MEDIUM | Not stored per-book |
| Gemini model used / fallback model | MEDIUM | Not stored per-book |
| Category × model × error correlation | MEDIUM | Need structured fields |
| Live HTTP 200 check for public assets | LOW | Manual only (T7 checks) |

### 4.3 Instrumentation Needed

```typescript
// Proposed: structured generation event (per book)
interface GenerationEvent {
  bookId: string;
  userId: string;
  creationMode: "fixed_template" | "guided_ai" | "original_ai";
  categoryGroupId?: string;
  requestedImageModelProfile?: string;
  effectiveImageModelProfile: string;
  candidateGateApplied: boolean;   // true if candidate was stripped
  storyGenerationMs: number;
  storyModelUsed: string;          // e.g. "gemini-2.0-flash"
  storyFallbackUsed: boolean;
  bookFinalStatus: BookStatus;
  pageCount: number;
  pagesCompleted: number;
  pagesImageFailed: number;
  pagesFallback: number;
  pagesTimedOut: number;
  errorTypes: string[];            // e.g. ["E005", "timeout"]
  timestamp: Timestamp;
}
```

---

## 5. Regression Guard Proposal

### 5.1 Existing Tests (relevant to regression)

| Test file | Coverage |
|---|---|
| `generate-book.test.ts` | `gateImageModelProfile` (6 assertions); book status transitions; partial_completed; image fallback |
| `replicate.test.ts` | `isCandidateProfile`; `resolveImageFallbackProfiles`; `resolveImageModelProfile` |
| `openai-image.test.ts` | OpenAI client; CANDIDATE_PROFILE constants |
| `seed-templates.test.ts` | All 385 template fields including sampleImages for 5 guided_ai templates |
| `prompt-builder.test.ts` | Prompt construction (1 pre-existing failure — unrelated to generation routing) |
| `fixed-template-expansion.test.ts` | fixed_template page expansion |

### 5.2 Proposed New Regression Guards

#### RG-1: Candidate gate — must not leak to non-enrolled users
```typescript
// Already tested: generate-book.test.ts line 1655-1656
// Proposed addition: integration-style test verifying end-to-end gate behavior
// with a mock book doc containing openai_image_candidate and a non-enrolled user doc
```
**Gap**: Gate is unit-tested but not integration-tested with the full `generateBook` Function flow.

#### RG-2: Production default routing — non-candidate profiles must not be stripped
```typescript
// gateImageModelProfile("pro_consistent", false) === "pro_consistent"  ✅ covered
// gateImageModelProfile("klein_fast", false) === "klein_fast"           ✅ covered
```
**Status**: Covered. No gap.

#### RG-3: OpenAI path — candidate profile only for enrolled users
**Status**: Covered by gate test. Gap: no test that `createImageClient("openai_image_candidate")` is NOT called for non-enrolled users in the full flow.

#### RG-4: `fixed_template` page count consistency
```typescript
// Proposed: for each fixed_template in seed-templates.ts,
// assert pages.length === expected (e.g. 4 for 4-page templates)
```
**Gap**: `seed-templates.test.ts` validates field presence; page count assertion can be added.

#### RG-5: Public asset URL HTTP 200 smoke check
```typescript
// Proposed: scripts/check-public-assets.mjs
// Reads a manifest of known asset paths, performs HTTP HEAD, reports any non-200
// Can be run in CI or as part of deploy verification
```
**Gap**: Currently manual (T7 checks). Automatable as a Node.js script.

#### RG-6: Stale `.png` reference prevention
```typescript
// Proposed: add to scripts/check-hygiene.mjs or a new lint step:
// grep src/**/*.ts functions/src/**/*.ts for:
//   sampleImageUrl: "...*.png"
//   /images/templates/*.png
//   /images/styles/*.png
//   /images/samples/*.png
// Fail if any match found (except .md files which document historical state)
```
**Status**: Partially covered by manual T7 checks. Should be automated.

#### RG-7: `sampleImages` light/premium schema validation
```typescript
// Already in seed-templates.test.ts (5 guided_ai templates)
// Proposed: add TypeScript type assertion that all sampleImages entries
// (when present) have valid string paths (not undefined or .png)
```
**Status**: Partially covered. Extend existing test.

#### RG-8: demo.ts ↔ seed-templates.ts alignment check
```typescript
// Proposed: unit test or script that compares DEMO_TEMPLATES sampleImageUrl format
// against TEMPLATES in seed-templates.ts — both should use .webp
```
**Gap**: No existing check. Low priority (demo mode only).

---

## 6. Phase 2 Implementation Slices

| Slice | Title | Scope | Priority |
|---|---|---|---|
| **P2-1** | Generation SLO and regression guard inventory (this doc) | docs-only | ✅ COMPLETE |
| **P2-2** | Add structured generation event logging | Add `generationEvent` write in `generate-book.ts`; capture gate decision, story latency, error taxonomy | HIGH |
| **P2-3** | Add provider / error taxonomy | Classify `imageFailureReason` into enum (E005 / timeout / network / schema / unknown); update `slo-metrics.ts` to count by type | HIGH |
| **P2-4** | Add candidate gate regression tests | Integration-style test for gate → `createImageClient` path; verify non-enrolled user never gets OpenAI client | HIGH |
| **P2-5** | Add public asset URL smoke checker script | `scripts/check-public-assets.mjs` — HTTP HEAD all Groups A/B/C/D; exit 1 on any non-200; runnable in CI | MEDIUM |
| **P2-6** | Add stale .png reference guard to hygiene | Extend `scripts/check-hygiene.mjs` to grep for `.png` in `sampleImageUrl` / `/images/templates/` / `/images/samples/` in source code | MEDIUM |
| **P2-7** | Add generation SLO report script | `scripts/generate-slo-report.mjs` — reads Firestore SLO snapshots, prints last 7-day trend, alerts if below target | MEDIUM |
| **P2-8** | Document operational runbook | `docs/GENERATION_RUNBOOK.md` — on-call procedures for hard failure, partial_completed spike, E005 outbreak, candidate leak | MEDIUM |
| **P2-9** | Add `fixed_template` page count regression test | Extend `seed-templates.test.ts` to assert `pages.length` for all fixed templates | LOW |
| **P2-10** | Add `sampleImages` .webp format assertion | Extend `seed-templates.test.ts` to assert no `.png` paths in `sampleImages.light` / `.premium` | LOW |

### Recommended slice ordering

```
P2-2 → P2-3 → P2-4 → P2-5 → P2-6 → P2-7 → P2-8 → P2-9 → P2-10
  ↑ most immediate production value (logging gaps close first)
```

---

## 7. Non-Goals (this task and Phase 2 in general)

- **No production routing change** — `gateImageModelProfile`, `resolveImageModelProfile`, fallback chains must not change without explicit approval and smoke evidence
- **No provider switch** — `openai_image_candidate` remains candidate/gated only; Replicate remains production default
- **No Firestore schema migration** unless separately approved and backward-compatible
- **No new image generation** — Group D quality samples were completed in T7-5b; no further asset generation in P2
- **No Firebase Hosting or Functions deploy** in P2-1 (docs-only)
- **No new candidate profile enrollments** without explicit operator action
- **No changes to `CANDIDATE_IMAGE_PROFILES` constant** without unit test coverage

---

## 8. SLO Targets Reference (from PRODUCT_ROADMAP.md)

| Metric | Target |
|---|---|
| Book readable rate | ≥ 98% |
| Book hard failed rate | ≤ 2% |
| Page image p95 | ≤ 120s |
| Image failed rate | ≤ 2% |
| Regeneration success rate | ≥ 95% |
| Candidate profile leak rate (proposed) | 0% |
| Public asset URL 200 rate (proposed) | 100% |

---

## P2 Slice Map

| Slice | Status |
|---|---|
| P2-1 | ✅ COMPLETE (this doc) |
| P2-2 | Pending |
| P2-3 | Pending |
| P2-4 | Pending |
| P2-5 | Pending |
| P2-6 | Pending |
| P2-7 | Pending |
| P2-8 | Pending |
| P2-9 | Pending |
| P2-10 | Pending |
