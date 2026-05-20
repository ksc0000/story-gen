# Phase 3 ImageProvider Migration — Closure Document

**Closed**: 2026-05-20  
**Deployed commit**: `78636e8`  
**Docs commit**: `abfcb8f`  
**Author**: P3-Closure task  
**Depends on**: [PHASE3_IMAGE_PROVIDER_ABSTRACTION_PLAN.md](PHASE3_IMAGE_PROVIDER_ABSTRACTION_PLAN.md), [P3_ADAPTER_WIRING_AND_SMOKE_PLAN.md](P3_ADAPTER_WIRING_AND_SMOKE_PLAN.md), [P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md](P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md)

---

## 1. Executive Summary

Phase 3 (ImageProvider abstraction) is **complete for page image generation**.

The legacy monolithic `createImageClient()` page-generation path has been replaced by two
production-wired adapters — `ReplicateImageAdapter` and `OpenAIImageAdapter` — behind the
`ImageProvider` interface. Routing is driven by `PROFILE_PROVIDER_MAP` and the presence of
provider API tokens injected from Firebase secrets. No feature flags are required.

**Post-cutover live smoke (P3-15s) passed all 3 scenarios** on 2026-05-20 with deployed commit
`78636e8`. Both adapters activated correctly in production. The candidate gate remained secure
throughout (no OpenAI model assigned to unenrolled users).

**Remaining legacy scope** is limited to two non-page generation flows: `generateCoverImage()`
and `ensureRecurringCharacterReferences()`. These intentionally retain `deps.imageClient` (via
`createImageClient()`) and are tracked for a future P4 cleanup cycle.

---

## 2. Final Architecture

### 2.1 Page image generation (P3-15 canonical)

```
generateBook (Cloud Function — onDocumentCreated)
 │
 ├── [Candidate gate]
 │     gateImageModelProfile(profile, allowCandidateProfile)
 │       if isCandidateProfile(profile) && allowCandidateProfile !== true
 │         → fall back to default Replicate profile
 │
 ├── [Adapter selection — generatePageImageWithFallback()]
 │     if replicateApiToken != null && PROFILE_PROVIDER_MAP[profile] === "replicate"
 │       → ReplicateImageAdapter(replicateApiToken, uploader)
 │     else if openaiApiKey != null && PROFILE_PROVIDER_MAP[profile] === "openai"
 │       → OpenAIImageAdapter(openaiApiKey, uploader)
 │     else
 │       → legacy imageClient.generateImage() (test-environment fallback only)
 │
 ├── [Fallback loop]
 │     resolveImageFallbackProfiles(primaryProfile) → [p1, p2, ...]
 │     per attempt: withImageTimeout(adapter.generateImage(...), 120_000 ms)
 │       on success  → Buffer + uploaded URL
 │       on failure  → classifyProviderError() + logGenerationEvent(page_image_failed)
 │
 └── [Outcome]
       Firestore: page.imageUrl, page.imageModel, page.imageStatus,
                  imageDurationMs, imageAttemptCount, imageFallbackUsed,
                  imageModel, imageTimedOut
       book.status: "completed" | "partial_completed" | "failed"
       logGenerationEvent(book_outcome)
```

### 2.2 Key files

| File | Role |
|---|---|
| `functions/src/lib/image-provider.ts` | `ImageProvider` interface, `PROFILE_PROVIDER_MAP`, shared types |
| `functions/src/lib/image-model-policy.ts` | `CANDIDATE_IMAGE_PROFILES`, `isCandidateProfile()`, `resolveImageModelProfile()`, `resolveImageFallbackProfiles()` |
| `functions/src/lib/replicate-image-adapter.ts` | `ReplicateImageAdapter` — wraps `ReplicateImageClient.generateImageWithMetadata` |
| `functions/src/lib/openai-image-adapter.ts` | `OpenAIImageAdapter` — candidate-only, wraps `OpenAIImageClient.generateImage` |
| `functions/src/lib/image-adapter-factory.ts` | `createImageAdapter()`, `resolveImageProviderId()` — no gate, no env reads |
| `functions/src/lib/image-storage-uploader.ts` | `makePageUploader()` — closure bridging `deps.uploadImage` to adapter uploader |
| `functions/src/lib/provider-error-classifier.ts` | `classifyProviderError()`, `isProviderErrorRetryable()` |
| `functions/src/generate-book.ts` | Orchestration: gate → adapter selection → fallback loop → Firestore writes |

### 2.3 Profile-to-provider routing

```typescript
// functions/src/lib/image-provider.ts
export const PROFILE_PROVIDER_MAP: Record<ImageModelProfile, ImageProviderId> = {
  pro_consistent:        "replicate",
  klein_fast:            "replicate",
  klein_base:            "replicate",
  kontext_reference:     "replicate",
  flux11_pro_candidate:  "replicate",
  openai_image_candidate: "openai",
};
```

### 2.4 Token injection (generate-book.ts)

Both tokens are always injected into `deps` from Firebase secrets — no conditional ternary:

```typescript
deps.replicateApiToken = replicateApiToken.value();  // always set
deps.openaiApiKey      = openaiApiKey.value();        // always set
```

Adapter activation is determined by `PROFILE_PROVIDER_MAP[profile]` + token presence.

---

## 3. Completed Slice Summary

| Slice | Title | Status |
|---|---|---|
| P3-1 | Architecture inventory and design doc | ✅ COMPLETE |
| P3-2 | `ImageProvider` interface + `PROFILE_PROVIDER_MAP` type definitions | ✅ COMPLETE |
| P3-3 | `ReplicateImageAdapter` (wraps `ReplicateImageClient`) | ✅ COMPLETE |
| P3-4 | `OpenAIImageAdapter` (candidate-only, wraps `OpenAIImageClient`) | ✅ COMPLETE |
| P3-5 | `provider-error-classifier.ts` — shared error classification | ✅ COMPLETE |
| P3-6 | Provider contract tests + adapter unit tests | ✅ COMPLETE |
| P3-7 | `image-model-policy.ts` — policy extracted from `replicate.ts` | ✅ COMPLETE (P3-8 revised) |
| P3-8 | `image-model-policy.ts` — finalized extraction, `replicate.ts` re-exports | ✅ COMPLETE |
| P3-9 | Adapter wiring plan and gated smoke plan (docs-only) | ✅ COMPLETE |
| P3-10 | `image-adapter-factory.ts` — `createImageAdapter()` (not wired) | ✅ COMPLETE |
| P3-11 | `image-storage-uploader.ts` — `makePageUploader()` closure | ✅ COMPLETE |
| P3-12 | Shadow parity tests (`image-adapter-shadow.test.ts` — 72 tests) | ✅ COMPLETE |
| P3-13 | Replicate adapter wiring — feature-flagged (`USE_REPLICATE_ADAPTER`) | ✅ COMPLETE |
| P3-14 | OpenAI candidate adapter wiring — feature-flagged (`USE_OPENAI_ADAPTER`) | ✅ COMPLETE |
| P3-14s | Adapter wiring gated live smoke — 5/5 scenarios PASS | ✅ COMPLETE |
| P3-14s-run | Re-run of P3-14s live smoke (confirmed 5/5 PASS post-fixes) | ✅ COMPLETE |
| P3-15 | Remove feature flags — adapter path canonical for all page generation | ✅ COMPLETE |
| P3-15s | Post-cutover live smoke — 3/3 scenarios PASS, all adapters verified | ✅ COMPLETE |

---

## 4. Smoke Evidence

### 4.1 P3-14s-run (pre-cutover, feature-flagged) — 5/5 PASS

**Executed**: 2026-05-20 | **Commit**: `b9aca01`

| Scenario | Status | imageModel |
|---|---|---|
| Replicate adapter flag on | PASS | `black-forest-labs/flux-2-pro` |
| OpenAI candidate enrolled, flag on | PASS | `openai/gpt-image-1-mini` |
| Gate-block negative | PASS | `black-forest-labs/flux-2-pro` |
| Flag off → legacy path | PASS | `black-forest-labs/flux-2-pro` |
| Fallback (pro→klein) | PASS | `black-forest-labs/flux-2-pro` |

Full results: [`docs/P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md`](P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md) §12.

### 4.2 P3-15s (post-cutover, no flags) — 3/3 PASS

**Executed**: 2026-05-20 | **Deployed commit**: `78636e8` | **Deploy**: `firebase deploy --only functions --project story-gen-8a769`

| Scenario | Status | imageModel | Pages |
|---|---|---|---|
| A — Replicate adapter default, no flags | **PASS** | `black-forest-labs/flux-2-pro` | 8/8 completed |
| B — OpenAI candidate enrolled, no flags | **PASS** | `openai/gpt-image-1-mini` | 8/8 completed |
| C — Gate-block unenrolled (negative) | **PASS** | `black-forest-labs/flux-2-pro` (not OpenAI) | 8/8 completed |

**Performance observations**:
- Replicate (`ReplicateImageAdapter`): `imageDurationMs` 25,560–41,277 ms
- OpenAI (`OpenAIImageAdapter`): `imageDurationMs` 14,869–28,739 ms
- Scenario C: 7/8 pages `fallback_completed` — pre-existing Replicate pro_consistent behavior for adventure theme; not a P3-15 regression.

**Logging note**: Cloud Logging not directly accessible (gcloud CLI unavailable in development environment). Adapter activation confirmed indirectly via Firestore `imageModel` field per page document.

Full results: [`docs/P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md`](P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md) §13.

---

## 5. Test Coverage Snapshot

**As of commit `abfcb8f` (P3-15s docs)**:

| Suite | Count |
|---|---|
| `npx vitest run` (full functions suite) | 1216 / 1216 PASS |
| `npm run check:phase2` | 105 / 105 PASS |

**Key test files for P3**:

| File | Tests | Coverage |
|---|---|---|
| `test/image-provider-contract.test.ts` | 84 | Both adapters satisfy `ImageProvider` interface invariants |
| `test/image-adapter-shadow.test.ts` | 72 | Shadow parity: adapter output ≅ legacy client output |
| `test/generate-book-replicate-adapter.test.ts` | 10 | Replicate adapter routing in `generatePageImageWithFallback` |
| `test/generate-book-openai-adapter.test.ts` | 14 | OpenAI candidate routing in `generatePageImageWithFallback` |
| `test/replicate-image-adapter.test.ts` | ~40 | `ReplicateImageAdapter` unit tests |
| `test/openai-image-adapter.test.ts` | ~40 | `OpenAIImageAdapter` unit tests |
| `test/candidate-gate.test.ts` | 48 | Gate policy: blocking, passing, `=== true` strict semantics |
| `test/provider-error-classifier.test.ts` | ~40 | Extended error pattern matching, retryable flags |

**Test suite progression** (P3-3 → P3-15):  
805 → 818 → 850 → 890 → 974 → 1034 → 1037 → 1074 → 1096 → 1112 → 1192 → 1203 → 1218 → **1216** (P3-15: −2 removed flag-specific tests)

---

## 6. Safety Invariants

These invariants were verified throughout P3 and must be preserved in all future changes:

| Invariant | Mechanism | Verified |
|---|---|---|
| Candidate gate is NOT inside adapters | `gateImageModelProfile()` runs before adapter selection in CF handler | P3-15s-C PASS |
| `allowCandidateProfile` must be strict `=== true` | Gate uses `=== true`, not truthy check | `test/candidate-gate.test.ts` 48 tests |
| Fallback order: `pro_consistent → klein_fast` | `resolveImageFallbackProfiles()` in `image-model-policy.ts` | Unchanged through P3 |
| OpenAI adapter rejects non-candidate profiles | `OpenAIImageAdapter.generateImage()` throws on non-openai profiles | Contract tests |
| No PII in structured logs | `ImageProvider` design constraint — prompt field for provider only | Code review (P3-2) |
| Partial failure → `partial_completed` | Single page failure never hard-fails book | `generate-book.ts` orchestration |
| SLO events always emitted | `imageDurationMs`, `imageAttemptCount`, `imageFallbackUsed`, `imageTimedOut`, `imageModel` | Integration tests |
| `FieldValue.delete()` for Firestore field removal | Never use `undefined` in Firestore writes | copilot-instructions.md rule |

---

## 7. Remaining Legacy Scope

Two non-page image flows intentionally remain on the legacy `createImageClient()` path. This is **by design** and out of P3 scope.

| Flow | Function | Still uses | Reason |
|---|---|---|---|
| Cover image generation | `generateCoverImage()` | `deps.imageClient` (legacy `ReplicateImageClient` / `OpenAIImageClient`) | Out of P3 scope — separate visual prompt logic |
| Recurring character reference | `ensureRecurringCharacterReferences()` | `deps.imageClient` | Out of P3 scope — input_images reference pattern differs |

`createImageClient()` in `generate-book.ts` is **not removed**. It has a JSDoc comment marking it as retained for these flows.

**Recommended follow-up (P4)**:

| Task | Description | Priority |
|---|---|---|
| P4-1 | Migrate `generateCoverImage()` to `ImageProvider` adapter | Medium |
| P4-2 | Migrate `ensureRecurringCharacterReferences()` to `ImageProvider` adapter | Medium |
| P4-3 (stretch) | Remove `createImageClient()` after P4-1 + P4-2 | Low |

---

## 8. Rollback Strategy

If a P3-15+ regression is discovered in production, the rollback target is the commit before
feature flag removal. The legacy client path was stable and is fully preserved in the commit
history.

### Rollback steps

```bash
# 1. Identify regression (imageModel field unexpected, adapter error in Firestore)
# 2. Revert the cutover commit on a branch
git revert 78636e8 --no-edit
git checkout -b rollback/P3-15

# 3. Build and verify locally
cd functions && npm run build && npx vitest run

# 4. Deploy reverted functions
npm run build
cd ..
firebase deploy --only functions --project story-gen-8a769
```

**Scope of rollback**: Functions only. No Firestore schema changes were made in P3-15.
No Cloud Storage changes. No Firestore data migration required.

**After rollback**: Re-enable `USE_REPLICATE_ADAPTER=true` / `USE_OPENAI_ADAPTER=true` in
`.env.story-gen-8a769` and redeploy with the pre-cutover commit (`b9aca01` or `619dbf9`) to
return to the feature-flagged adapter path.

---

## 9. Known Issues and Follow-Ups

### 9.1 Gemini `schema_validation` failure (pre-existing)

- **Observed**: P3-15s-A first attempt failed at `schema_validation` with "Failed to parse LLM JSON response".
- **Root cause**: Pre-existing Gemini story generation issue — not P3-15 regression.
- **Impact**: Requires manual retry; success rate on retry is high.
- **Recommended fix**: P4 priority — improve Gemini JSON schema prompt or add structured output
  mode to reduce parse failures. This is the highest-priority reliability risk remaining.

### 9.2 Adventure theme `fallback_completed` rate

- **Observed**: Scenario C — 7/8 pages `fallback_completed` (pro_consistent → klein_fast fallback).
- **Root cause**: Pre-existing Replicate content policy behavior for adventure themes with
  action/combat-adjacent scenes.
- **Impact**: Lower image quality for affected pages (klein_fast tier vs pro_consistent).
- **Recommended fix**: Refine `styleBible` and `pageVisualRole` for adventure theme prompts
  to reduce policy-triggering content. Not a P3-15 regression.

### 9.3 Cloud Logging not directly accessible

- **Observed**: `gcloud` CLI not available in the development environment during P3-15s.
- **Workaround**: Adapter activation confirmed via Firestore `imageModel` field per page document.
- **Recommended fix**: Set up `gcloud` CLI authentication for the `story-gen-8a769` project to
  enable direct structured log querying in future smoke runs.

---

## 10. Recommended Next Phase (P4)

Priorities are ordered by reliability impact on production users.

| Task | Description | Priority | Rationale |
|---|---|---|---|
| **P4-1 ✅** | Gemini JSON hardening inventory and design | **COMPLETE** | P4-1 design doc: [`docs/PHASE4_GEMINI_JSON_HARDENING_PLAN.md`](PHASE4_GEMINI_JSON_HARDENING_PLAN.md) |
| **P4-2 ✅** | Structured story validation error taxonomy / logging | **COMPLETE** | `storyJsonFailureCategory` + `storyDurationMs` added to log events; commit `bde7bb9` |
| **P4-3 ✅** | Unit fixtures for malformed/wrong-type Gemini responses | **COMPLETE** | `functions/test/fixtures/gemini-story-json-failures.ts` + 25 new tests; 1258/1258 PASS |
| **P4-4** | Safe JSON extraction/repair helper (test-only first) | Medium | ✅ COMPLETE — `functions/src/lib/llm-json-repair.ts`, 34 tests |
| **P4-5** | One-shot validation repair retry behind flag | Medium | Converts intermittent schema failures to successes; gated on P4-2/P4-3 |
| **P4-6** | Live smoke for repaired flow | Medium | Validates P4-5 in production |
| **P4-7** | Prompt instruction tuning after metrics | Low | Data-driven prompt fix; requires 2+ weeks of P4-2 data |
| **P4-cover** | Migrate `generateCoverImage()` to `ImageProvider` adapter | Medium | Completes the migration; removes final `createImageClient()` usage |
| **P4-ref** | Migrate `ensureRecurringCharacterReferences()` to `ImageProvider` adapter | Medium | Required before `createImageClient()` can be removed; after P4-cover |
| **P4-logging** | Automate Cloud Logging queries for smoke runs | Low | Operational improvement; reduces indirect verification reliance |
| **P4-5** | Cost/provider comparison dashboard | Low | `imageModel` field now populated per page — enables provider cost comparison |

**Highest priority**: P4-2 (Gemini failures are the most frequent observed hard-fail cause
and the highest risk to the SLO target of book hard failed rate ≤ 2%).

---

## Appendix: Related Documents

| Document | Description |
|---|---|
| [PHASE3_IMAGE_PROVIDER_ABSTRACTION_PLAN.md](PHASE3_IMAGE_PROVIDER_ABSTRACTION_PLAN.md) | Full P3 design and migration slice details |
| [P3_ADAPTER_WIRING_AND_SMOKE_PLAN.md](P3_ADAPTER_WIRING_AND_SMOKE_PLAN.md) | Adapter wiring plan and parity checklist |
| [P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md](P3_ADAPTER_LIVE_SMOKE_CHECKLIST.md) | Live smoke checklist with full scenario results (§12 P3-14s-run, §13 P3-15s) |
| [image-model-policy.md](image-model-policy.md) | Image model selection policy and SLO targets |
| [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) | Overall product roadmap |
| [GENERATION_SLO_RUNBOOK.md](GENERATION_SLO_RUNBOOK.md) | SLO runbook and rollback procedures |
