# P3-9: Adapter Wiring and Gated Smoke Plan

**Status**: Design complete — no production wiring performed.  
**Author**: P3-9 task (2026-05-20)  
**Depends on**: P3-2 through P3-8 (all complete)  
**Next slices**: P3-10 adapter factory → P3-11 uploader abstraction → P3-12 shadow tests → P3-13 Replicate switch → P3-14 OpenAI candidate switch → P3-15 cleanup

---

## 1. Purpose

P3-9 defines the safest wiring path for ImageProvider adapters into the existing
generation flow, plus a gated smoke plan that can validate adapter behavior without
touching the production default routing.

**This document does not change production routing.**  
OpenAI remains candidate/gated only. `createImageClient()` is not modified.  
No deployment is performed.

---

## 2. Current State Summary

| Artifact | Status |
|---|---|
| `functions/src/lib/image-provider.ts` | Provider-neutral types: `ImageProvider` interface, `ImageProviderId`, `PROFILE_PROVIDER_MAP` |
| `functions/src/lib/image-model-policy.ts` | `CANDIDATE_IMAGE_PROFILES`, `isCandidateProfile()`, `resolveImageModelProfile()`, `resolveImageFallbackProfiles()` |
| `functions/src/lib/replicate-image-adapter.ts` | `ReplicateImageAdapter` implements `ImageProvider` — NOT wired to production |
| `functions/src/lib/openai-image-adapter.ts` | `OpenAIImageAdapter` implements `ImageProvider`, candidate-only — NOT wired to production |
| `functions/src/lib/provider-error-classifier.ts` | `classifyProviderError()`, `isProviderErrorRetryable()` — used by both adapters |
| `functions/test/image-provider-contract.test.ts` | 84 shared contract tests; both adapters pass |
| `functions/src/generate-book.ts` | Still uses `createImageClient()` → `ReplicateImageClient` / `OpenAIImageClient` directly |

---

## 3. Existing Production Flow Inventory

Below is the full image generation path inside `generate-book.ts` as of P3-8.
Line numbers are approximate and may shift, but the call sequence is stable.

```
generateBook (onDocumentCreated)
 │
 ├── Read user doc (gateUserData)
 ├── gateImageModelProfile(bookData.imageModelProfile, allowCandidateProfile)
 │       → resolves gatedModelProfile (candidate stripped if not enrolled)
 ├── logGenerationEvent(generation_started) — SLO structured log
 │
 ├── createImageClient(gatedModelProfile)        ← provider selection
 │       if "openai_image_candidate" → new OpenAIImageClient(apiKey, PROFILE)
 │       else                        → new ReplicateImageClient(apiToken)
 │       returns: ImageClient (legacy interface)
 │
 ├── processBookGeneration(bookId, bookData, deps)
 │    ├── normalizeBookForGeneration()
 │    │     └── resolveImageModelProfile({purpose, tier, imageModelProfile})
 │    │             → primaryProfile
 │    │
 │    └── per page: generatePageImageWithFallback(params)
 │          ├── resolveImageFallbackProfiles(primaryProfile)   → [p1, p2, ...]
 │          ├── loop over fallbackProfiles × maxRetries:
 │          │     withImageTimeout(
 │          │       imageClient.generateImage(prompt, {purpose, tier, profile, inputImageUrls}),
 │          │       IMAGE_GENERATION_TIMEOUT_MS
 │          │     )                                            → Buffer
 │          ├── on success: return { imageBuffer: Buffer, imageUrl: "" }
 │          └── on total failure: logGenerationEvent(page_image_failed)
 │
 └── after all pages: per page with imageBuffer:
       deps.uploadImage(bookId, pageNumber, buffer)            → Cloud Storage URL
       Firestore write: page.imageUrl, page.imageModel, page.imageStatus
       Firestore write: book.status = "completed" | "partial_completed" | "failed"
       logGenerationEvent(book_outcome)
```

### Key observations

1. **Two-phase image flow**: generate (`Buffer`) is decoupled from upload (`URL`). Adapters currently return a `URL` directly (uploader injected). This must be reconciled when wiring.

2. **`withImageTimeout` wraps `imageClient.generateImage`**: Adapters do not internally call `withImageTimeout` — they rely on the caller. This must be preserved when switching to adapters.

3. **Fallback loop is in the orchestration layer** (`generatePageImageWithFallback`), not inside adapters. Adapters handle exactly one profile per call. This design is correct and must not change.

4. **`createImageClient()` picks provider from profile**: Current logic is a simple `if/else`. After P3-13, `PROFILE_PROVIDER_MAP` handles this lookup.

5. **`uploadImage` signature is per-call**: `(bookId: string, pageNumber: number, buffer: Buffer) → URL`. Adapter uploader signature is `(buffer: Buffer, profile: ImageModelProfile) → URL`. A per-call closure bridges these.

---

## 4. Adapter Wiring Target Architecture

After all P3-13/P3-14 slices are complete, the generation flow will look like:

```
generateBook (onDocumentCreated)
 │
 ├── [unchanged] Read user doc, gate, log generation_started
 │
 ├── createImageAdapter(gatedModelProfile, deps)    ← replaces createImageClient()
 │       uses PROFILE_PROVIDER_MAP[profile] to select provider
 │       injects per-call storage uploader closure
 │       returns: ImageProvider (new interface)
 │
 └── processBookGeneration(bookId, bookData, deps)
      └── per page: generatePageImageWithFallback(params)
            ├── [unchanged] resolveImageFallbackProfiles(primaryProfile)
            ├── loop over fallbackProfiles × maxRetries:
            │     withImageTimeout(
            │       adapter.generateImage({prompt, imageModelProfile: profile, ...}),
            │       IMAGE_GENERATION_TIMEOUT_MS
            │     )                                       → ImageGenerationResult
            │     result.imageUrl is already uploaded (adapter called uploader internally)
            ├── on success: return { imageUrl: result.imageUrl, usedProfile: result.profile }
            └── on total failure: adapter.classifyError(err, {profile}) → ImageGenerationFailure
                  logGenerationEvent(page_image_failed) using failure fields
```

### Design invariants

| Invariant | How enforced |
|---|---|
| Candidate gate outside adapters | Gate runs in `gateImageModelProfile()` before any adapter is selected |
| Fallback ordering outside adapters | `resolveImageFallbackProfiles()` in `image-model-policy.ts`; orchestration layer loops |
| No PII in adapters | Adapters receive `prompt` for API call only; never log it |
| Timeout wraps adapter call | `withImageTimeout()` wraps `adapter.generateImage()` in orchestration layer |
| Storage uploader injected | Adapter receives uploader closure per page, not per book |
| Firestore writes in orchestration | Adapters return `ImageGenerationResult`; Firestore writes stay in `generate-book.ts` |
| SLO log schema unchanged | `logGenerationEvent(page_image_failed)` kept in orchestration; adapter provides `errorCategory`/`errorCode` via `classifyError()` |

---

## 5. Storage Uploader Design

### Current signatures

```typescript
// In generate-book.ts deps:
uploadImage: (bookId: string, pageNumber: number, buffer: Buffer) => Promise<string>

// ReplicateStorageUploader (injected into adapter):
(buffer: Buffer, profile: ImageModelProfile) => Promise<string>

// OpenAIStorageUploader (injected into adapter):
(buffer: Buffer, profile: ImageModelProfile) => Promise<string>
```

### Reconciliation approach

Adapters receive a **per-page uploader closure** created at the call site,
not a generic uploader at adapter construction time:

```typescript
// In generatePageImageWithFallback() or its caller:
function makePageUploader(
  bookId: string,
  pageNumber: number,
  uploadFn: (bookId: string, pageNum: number, buf: Buffer) => Promise<string>
): ReplicateStorageUploader {
  return async (buffer: Buffer, _profile: ImageModelProfile) =>
    uploadFn(bookId, pageNumber, buffer);
}
```

This bridges the two signatures without changing either the existing `deps.uploadImage` or the adapter constructor signatures.

### Production uploader path

```
deps.uploadImage(bookId, pageNumber, buffer)
 → storage.bucket("story-gen-8a769.firebasestorage.app")
 → books/{bookId}/page-{pageNumber}.png
 → firebasestorage.googleapis.com/v0/b/.../o/...?alt=media&token={uuid}
```

**Privacy rules**:
- Path uses system-generated `bookId` and `pageNumber` — no PII.
- `downloadToken` is a random UUID — no PII.
- Prompt is never included in the path or metadata.

### URL shape parity requirement

Adapter-wired path must produce URLs of the identical shape:
```
https://firebasestorage.googleapis.com/v0/b/story-gen-8a769.firebasestorage.app/o/books%2F{bookId}%2Fpage-{N}.png?alt=media&token={uuid}
```
This is verified in the P3-12 shadow tests.

---

## 6. Candidate Gate Safety

### Gate invariants (must never change)

| Invariant | Enforcement |
|---|---|
| `openai_image_candidate` only reaches `OpenAIImageAdapter` after gate-pass | Gate runs in `gateImageModelProfile()` before adapter selection |
| `allowCandidateProfile` must be exactly `true` to pass | `isCandidateProfile(profile) && !candidateProfileEnabled` strips profile |
| Non-boolean, missing, null, false all block candidates | `generationOverride.allowCandidateProfile === true` strict equality |
| Gate-blocked candidate → `undefined` → `resolveImageModelProfile({...})` → production default | `normalizeBookForGeneration` absorbs the undefined |
| `openai_image_candidate` has no Replicate fallback | `resolveImageFallbackProfiles("openai_image_candidate")` returns `["openai_image_candidate"]` only |
| `flux11_pro_candidate` falls back to `klein_fast` (Replicate only) | `resolveImageFallbackProfiles("flux11_pro_candidate")` returns `["flux11_pro_candidate", "klein_fast"]` |

### Test source of truth

`functions/test/candidate-gate.test.ts` (48 tests) is the authoritative regression suite.
No P3-10+ slice may change these test expectations without a documented gate policy change.

### Adapter must NOT decide enrollment

Adapters do not receive `allowCandidateProfile` or any user document reference.
If `openai_image_candidate` reaches `OpenAIImageAdapter`, the gate has already passed it.
If `klein_fast` or another profile reaches `ReplicateImageAdapter`, the gate has already blocked the candidate.

---

## 7. Migration Slices After P3-9

Each slice is independently shippable, test-first, and behavior-equivalent until P3-13.

### P3-10: Adapter factory function — **COMPLETE**

**Goal**: Introduce `createImageAdapter(params)` returning `ImageProvider`.  
**Implementation**:
- New file: `functions/src/lib/image-adapter-factory.ts`
- Exports: `createImageAdapter(params)`, `resolveImageProviderId(profile)`, `ImageAdapterFactoryParams`
- Uses `PROFILE_PROVIDER_MAP` from `image-provider.ts` as single source of truth
- `validateConfig()` NOT called at construction — testable with dummy credentials
- `allowCandidateProfile` NOT part of factory params — candidate gating is caller responsibility

**Not wired to production**: `generate-book.ts` unchanged. `createImageClient()` unchanged.  
**No network / no Firestore / no Firebase deploy.**  
**Tests**: `functions/test/image-adapter-factory.test.ts` (7 describe blocks, all profiles covered)

### P3-11: Storage uploader abstraction — **COMPLETE**

**Goal**: Bridge `deps.uploadImage(bookId, pageNumber, buffer)` to the adapter uploader `(buffer, profile) => URL` signature.  
**Implementation**:
- New file: `functions/src/lib/image-storage-uploader.ts`
- Exports: `PageImageUploadFn`, `AdapterStorageUploader`, `makePageUploader(params)`
- `profile` argument intentionally ignored — routing is caller's responsibility
- `AdapterStorageUploader` is type-compatible with both `ReplicateStorageUploader` and `OpenAIStorageUploader`

**Not wired to production**: `generate-book.ts` unchanged. `deps.uploadImage` still called directly.  
**No network / no Firestore / no Firebase deploy.**  
**Tests**: `functions/test/image-storage-uploader.test.ts` (9 describe blocks, 16 test cases)

### P3-12: Adapter-backed shadow tests — **COMPLETE**

**Goal**: Verify adapter path produces behavior equivalent to legacy `createImageClient()` path.  
**Implementation**: New test file `functions/test/image-adapter-shadow.test.ts` (72 tests, 7 describe blocks).  
**Parity coverage**:
1. Provider selection — adapter factory vs documented legacy `createImageClient()` rule
2. Model label — `adapter.resolveModelLabel(profile)` == `resolveReplicateModel(...)` / `resolveOpenAIModelLabel(false)`
3. Upload URL — `makePageUploader()` bridges to mock `uploadImage`; URL unchanged by adapter
4. Error classification — `classifyError()` shape matches P2 taxonomy; no PII fields; `safeMessage ≤ 120` chars
5. Fallback/candidate policy — `resolveImageFallbackProfiles`, `isCandidateProfile` unchanged
6. Shadow result shape — fixture comparison of stable legacy vs adapter fields
7. Adapter interface completeness

**Key findings**: All parity checks pass. Adapter path produces identical stable fields.  
**Not wired to production**: `generate-book.ts` unchanged. `createImageClient()` unchanged.  
**No network / no Firestore / no Firebase deploy.**

### P3-13: Switch Replicate path to adapter (feature-flagged) — COMPLETE

**Goal**: Replace `createImageClient()` Replicate branch with `ReplicateImageAdapter` behind `USE_REPLICATE_ADAPTER=true`.  
**Condition**: P3-12 shadow tests pass; no behavior change observable.  
**Feature flag**: `process.env.USE_REPLICATE_ADAPTER === "true"` — default false, legacy path unchanged.  
**Implementation**:
- Added `useReplicateAdapter()` helper in `generate-book.ts`.
- `GenerationDeps.replicateApiToken?: string` — optional, passed from CF handler when flag is on.
- `generatePageImageWithFallback()` branches on the flag: adapter path when `PROFILE_PROVIDER_MAP[profile] === "replicate"`, else legacy.
- Adapter path: `makePageUploader → ReplicateImageAdapter → upload inside adapter → imageUrl returned, imageBuffer=undefined`.
- Caller `if (imageResult.imageBuffer)` upload block is skipped for adapter path (imageBuffer is undefined).
- `openai_image_candidate` profile is unaffected (`PROFILE_PROVIDER_MAP` maps it to "openai", not "replicate").
- `ensureRecurringCharacterReferences()` and `generateCoverImage()` remain on legacy path.
**Tests**: 11 new tests in `functions/test/generate-book-replicate-adapter.test.ts`. All 1203 tests (33 files) pass.  
**Gate safety**: candidate-gate.test.ts (48 tests) and generate-book.test.ts (52 tests) remain green.  
**No behavior change** when `USE_REPLICATE_ADAPTER` is not set.

### P3-14: Switch OpenAI candidate path to adapter

**Goal**: Replace `createImageClient()` OpenAI branch with `OpenAIImageAdapter` for enrolled users.  
**Condition**: P3-13 shipped and stable; enrolled-user smoke passes.  
**Scope**: Candidate path only — no unenrolled users affected.  
**Tests**: Enrolled-user smoke test (manual dispatch or emulator).  
**Gate safety**: candidate-gate.test.ts, allowCandidateProfile invariants unchanged.

### P3-14: Switch OpenAI candidate path to adapter (feature-flagged) — COMPLETE

**Feature flag**: `process.env.USE_OPENAI_ADAPTER === "true"` — default false, legacy path unchanged.  
**Implementation**:
- Added `useOpenAIAdapter()` helper in `generate-book.ts`.
- `GenerationDeps.openaiApiKey?: string` — optional, passed from CF handler when `USE_OPENAI_ADAPTER=true`.
- `generatePageImageWithFallback()` extended with `openaiApiKey?` param.
- Adapter branch condition: `useOpenAIAdapter() && openaiApiKey != null && uploadFn != null && PROFILE_PROVIDER_MAP[profile] === "openai"`.
- Adapter path: `makePageUploader → OpenAIImageAdapter → upload inside adapter → imageUrl returned, imageBuffer=undefined`.
- Caller `if (imageResult.imageBuffer)` upload block skipped — no double upload.
- Replicate profiles unaffected (`PROFILE_PROVIDER_MAP` maps them to "replicate", not "openai").
- `USE_REPLICATE_ADAPTER` and `USE_OPENAI_ADAPTER` are independent flags — both can be on simultaneously.
- Candidate gate unchanged: runs in CF handler before deps creation; adapter never sees enrollment state.
- `ensureRecurringCharacterReferences()` and `generateCoverImage()` remain on legacy path.
- `imageModel` label in Firestore unchanged: `resolveOpenAIModelLabel(inputImageUrls.length > 0)` — same as legacy.
**Default behavior**: Unchanged when `USE_OPENAI_ADAPTER` is not set.  
**Rollback**: Set `USE_OPENAI_ADAPTER` to `"false"` or unset, or revert commit.  
**Tests**: 15 new tests in `functions/test/generate-book-openai-adapter.test.ts`. All 1218 tests (34 files) pass.  
**Gate safety**: candidate-gate.test.ts (48 tests) and generate-book.test.ts (52 tests) remain green.  
**No Firebase deploy.**

### P3-15: Remove legacy `createImageClient()`

**Goal**: Delete `createImageClient()`, `ReplicateImageClient` direct import, `OpenAIImageClient` direct import from `generate-book.ts`.  
**Condition**: P3-13 and P3-14 both verified stable in production.  
**Tests**: Verify no test references the removed path.  
**Risk**: Breaking rollback. Require one full release cycle of P3-14 before cutting over.

---

## 8. Gated Smoke Plan

### 8.1 Unit / emulator smoke (no live API)

These tests are safe to run in CI with no secrets:

| Test file | What it validates |
|---|---|
| `test/image-provider-contract.test.ts` | Both adapters satisfy ImageProvider interface invariants (84 tests) |
| `test/replicate-image-adapter.test.ts` | Replicate adapter error classification, model labels, uploader injection |
| `test/openai-image-adapter.test.ts` | OpenAI adapter (candidate-only), error classification, model labels |
| `test/provider-error-classifier.test.ts` | Extended error pattern matching, retryable flags |
| `test/image-model-policy.test.ts` | Policy: profile resolution, fallback chains, candidate detection |
| `test/candidate-gate.test.ts` | Gate behavior: blocking, passing, strict `=== true` semantics |

### 8.2 Pre-smoke adapter factory check (P3-10)

Before any live smoke:
1. Build the adapter factory for both providers.
2. Call `adapter.validateConfig()` with real secrets (no generation call).
3. Verify `adapter.providerId` and `adapter.capabilities` match expected values.
4. Verify `adapter.resolveModelLabel(profile)` matches current production `imageModel` Firestore values.

### 8.3 Live smoke — Replicate path (P3-13, enrolled account)

**Preconditions**:
- `USE_REPLICATE_ADAPTER=true` (feature flag or test harness)
- Enrolled account with `allowCandidateProfile` not needed for Replicate (production profiles)
- One test book with `imageModelProfile: "klein_fast"`, one page

**Validation**:
- [ ] Generated image Buffer is non-empty
- [ ] Cloud Storage URL shape matches production format
- [ ] Firestore `page.imageUrl` is populated
- [ ] Firestore `page.imageModel` = `"black-forest-labs/flux-2-klein-9b"` (unchanged from current)
- [ ] Firestore `page.imageDurationMs` is reasonable (< 120s)
- [ ] Cloud Logging: `generation_event` with `provider = "replicate"` present
- [ ] Cloud Logging: `page_image_failed` NOT present (success path)
- [ ] No PII in any log field

### 8.4 Live smoke — OpenAI candidate path (P3-14, enrolled account only)

**Preconditions**:
- `generationOverride.allowCandidateProfile === true` on test user
- `bookData.imageModelProfile = "openai_image_candidate"`
- One test book with `imageModelProfile: "openai_image_candidate"`, one page, no reference images

**Validation**:
- [ ] Generated image Buffer is non-empty
- [ ] Cloud Storage URL shape matches production format
- [ ] Firestore `page.imageUrl` is populated
- [ ] Firestore `page.imageModel` = `"openai/gpt-image-1-mini"` (no reference images → Images API)
- [ ] Firestore `page.imageDurationMs` is reasonable
- [ ] Cloud Logging: `generation_event` with `provider = "openai"` present
- [ ] Cloud Logging: `page_image_failed` NOT present (success path)
- [ ] No PII in any log field

**With reference images** (second smoke run):
- [ ] Firestore `page.imageModel` = `"openai/gpt-4o"` (reference images present → Responses API)

**Negative smoke** (unenrolled user):
- [ ] `bookData.imageModelProfile = "openai_image_candidate"` with unenrolled user
- [ ] Gate strips profile → falls back to production default (e.g., `klein_fast`)
- [ ] NO call to OpenAI API observable (Cloud Logging only shows Replicate events)

### 8.5 SLO parity check

After each smoke, run the SLO self-test and compare:

```bash
npm run check:phase2  # must remain 105/105
```

Verify structured logs in Cloud Console:
- `page_image_failed` events have same field set as before
- `book_outcome` events have same field set as before
- No new fields added that break SLO queries

---

## 9. Parity Checklist

Before cutting P3-15 (legacy removal), verify parity for each metric:

| Metric | Before (createImageClient) | After (adapter) | Test / Evidence |
|---|---|---|---|
| `page.imageModel` Firestore field | e.g. `"black-forest-labs/flux-2-klein-9b"` | Must match exactly | `adapter.resolveModelLabel()` vs current `resolveReplicateModel()` output |
| `page.imageDurationMs` | generation wall-clock | Must be within 10% | Smoke run comparison |
| `page.imageFallbackUsed` | true/false | `ImageGenerationResult.fallbackUsed` | Integration test |
| `provider` in `page_image_failed` log | `"replicate"` / `"openai"` | `adapter.providerId` | P3-12 shadow test |
| `errorCode` in `page_image_failed` log | P2 taxonomy | `adapter.classifyError()` output | contract tests |
| `errorCategory` in `page_image_failed` log | P2 taxonomy | `adapter.classifyError()` output | contract tests |
| Cloud Storage URL shape | `https://firebasestorage.googleapis.com/v0/b/...` | Must match exactly | P3-11 uploader test |
| Book `status` lifecycle | `generating` → `completed` / `partial_completed` / `failed` | Unchanged | generate-book.test.ts |
| SLO self-test | `npm run check:phase2` passes | Must still pass | CI gate |

---

## 10. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Accidental default routing change | Low | High | `createImageClient()` unchanged until P3-13; CI gate |
| OpenAI candidate leakage to unenrolled users | Low | High | Gate test is automated (48 tests); gate logic not in adapters |
| Fallback order regression | Low | High | `image-model-policy.test.ts` regression guard; `candidate-gate.test.ts` |
| Storage uploader URL/path mismatch | Medium | High | P3-11 uploader unit test; P3-12 shadow URL shape assertion |
| Firestore metadata drift (`imageModel` field) | Medium | Medium | P3-12 shadow test; smoke parity checklist |
| Structured log schema drift | Low | Medium | `generation-event-logger.test.ts` unchanged; SLO self-test in CI |
| Adapter retryability mismatch | Low | Low | `image-provider-contract.test.ts` retryable field tests |
| Live smoke consuming paid API quota | Medium | Low | Limit smoke to one page per run; use shortest profile (`klein_fast` / `gpt-image-1-mini`) |
| Secrets/proxy issues in emulator | Medium | Medium | `validateConfig()` smoke before first live call; run `adapter.validateConfig()` in P3-10 |
| `withImageTimeout` missing from adapter path | Medium | High | Orchestration wraps `adapter.generateImage()` with `withImageTimeout()` — same as before |
| Two-phase image flow broken (Buffer vs URL) | Medium | High | `makePageUploader` closure design (§5); tested in P3-11 |

---

## 11. Rollback Plan

### Before P3-15 (legacy removal)

The old `createImageClient()` path coexists with adapters via feature flag.
Rollback = revert the adapter wiring commit (one file: `generate-book.ts`).

| Rollback trigger | Action |
|---|---|
| Smoke failure | Revert adapter wiring commit; re-run `npm run check:phase2` |
| Firestore metadata mismatch | Revert; no migration needed (Firestore pages are per-book) |
| SLO metric regression | Revert; SLO self-test detects it immediately |
| Candidate gate failure | Impossible if `candidate-gate.test.ts` is green; block merge if red |

### Constraints

- No Firestore schema migration needed — adapters write same fields to same docs.
- No Cloud Storage path migration needed — same bucket, same path pattern.
- No Firebase Rules change needed.
- No frontend change needed — image URLs are the same shape.

### After P3-15 (legacy removed)

Rollback requires restoring `createImageClient()` from git history.
Only cut P3-15 after ≥ 1 stable production release with adapters active.

---

## 12. Acceptance Criteria for P3-9

- [x] Docs-only output (no production routing change)
- [x] Existing production flow inventory documented
- [x] Target architecture defined with storage uploader reconciliation strategy
- [x] Candidate gate invariants explicitly stated
- [x] Migration slices P3-10 through P3-15 defined
- [x] Smoke plan defined for both Replicate and OpenAI paths
- [x] Parity checklist defined
- [x] Risk analysis complete
- [x] Rollback plan defined
- [x] All baseline tests pass: 1074/1074
- [x] `npm run check:phase2`: 105/105
- [x] No production routing change
- [x] No candidate gate change
- [x] No `createImageClient()` change
- [x] No Firebase deploy

---

## Appendix: File Reference Map

| File | Role in adapter wiring |
|---|---|
| `functions/src/lib/image-provider.ts` | Interface contract; `PROFILE_PROVIDER_MAP` for provider lookup |
| `functions/src/lib/image-model-policy.ts` | Canonical policy: profiles, fallbacks, candidate detection |
| `functions/src/lib/replicate-image-adapter.ts` | Replicate adapter; needs production uploader injected |
| `functions/src/lib/openai-image-adapter.ts` | OpenAI candidate adapter; needs production uploader injected |
| `functions/src/lib/provider-error-classifier.ts` | Shared error normalization; used by both adapters |
| `functions/src/generate-book.ts` | Orchestration: gate, client creation, fallback loop, upload, Firestore, SLO logging |
| `functions/test/candidate-gate.test.ts` | Authoritative gate regression suite — must stay green |
| `functions/test/image-provider-contract.test.ts` | Adapter interface invariants — must stay green |
