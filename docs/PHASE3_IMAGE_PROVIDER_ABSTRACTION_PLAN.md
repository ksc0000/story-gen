# EhonAI Phase 3: ImageProvider Abstraction Plan

**Version**: P3-1 (2026-05-20)  
**Status**: Design — no production code changes in P3-1  
**Scope**: Inventory of image provider coupling and design of a safe ImageProvider abstraction

---

## 1. Purpose

### Why this abstraction is needed

The current image generation codebase has significant Replicate-specific coupling embedded directly in `generate-book.ts` and in `functions/src/lib/replicate.ts`. As the OpenAI image candidate path (`openai_image_candidate`) matures toward potential production use, and as provider reliability, cost, and content-policy tradeoffs evolve, maintaining this coupling creates increasing risk:

- Provider-specific payload builders (`buildReplicateInput`) live next to routing logic
- Error classification (`classifyError`) is provider-aware but not adapter-encapsulated
- Model names (`FLUX_PRO_MODEL`, etc.) are referenced directly in generation logic
- Fallback chain (`resolveImageFallbackProfiles`) is Replicate-centric by construction
- Switching or adding providers requires changes across multiple files

### Goals

1. **Reduce Replicate-specific coupling** — isolate all Replicate API details behind an adapter
2. **Allow OpenAI candidate path to coexist safely** — OpenAI adapter can evolve independently without touching core generation logic
3. **Preserve production default routing** — no routing or fallback behavior changes during abstraction
4. **Improve provider-specific error handling** — each adapter classifies its own errors; shared taxonomy is preserved
5. **Keep P2 SLO/logging compatibility** — all structured generation events continue to emit the same fields

### Non-goals for P3-1 (this document)

- No provider switch
- No routing change
- No candidate profile promotion to default
- No Firebase deploy
- No new generation API calls
- No fallback order change

---

## 2. Current Architecture Inventory

### 2.1 Generation flow summary

```
generate-book.ts
  │
  ├── [Profile resolution]
  │     resolveImageModelProfile()     ← replicate.ts (L77–95)
  │     resolveReplicateModel()        ← replicate.ts (L98–108)
  │
  ├── [Candidate gate]
  │     isCandidateProfile()           ← replicate.ts (L128–133)
  │     CANDIDATE_IMAGE_PROFILES list  ← replicate.ts (L118–124)
  │
  ├── [Client instantiation]           ← generate-book.ts createImageClient() (L2185–2200)
  │     imageModelProfile === "openai_image_candidate"
  │       → new OpenAIImageClient(...)
  │     else
  │       → new ReplicateImageClient(...)
  │
  ├── [Page image generation]
  │     generatePageImageWithFallback() (L540–660)
  │       resolveImageFallbackProfiles() ← replicate.ts (L111–125)
  │       withImageTimeout(imageClient.generateImage(), 120_000)
  │       on failure: classifyError() → logGenerationEvent(page_image_failed)
  │
  ├── [Cover image generation]
  │     generateCoverImage() (L678–748) — same pattern as page
  │
  ├── [Recurring character reference]
  │     ensureRecurringCharacterReferences() (L1569–1650)
  │       withImageTimeout(imageClient.generateImage(), 120_000)
  │
  └── [Outcome logging]
        logGenerationEvent(generation_started, book_outcome, book_early_failed)
```

### 2.2 Provider dispatch summary

| Call site in generate-book.ts | Provider used |
|---|---|
| Page image (default) | `ReplicateImageClient` via `pro_consistent` profile |
| Page image (candidate enrolled) | `OpenAIImageClient` via `openai_image_candidate` profile |
| Cover image | Same as page (follows `imageModelProfile`) |
| Recurring character reference | Same client as book (follows `imageModelProfile`) |
| Fallback page attempt | `ReplicateImageClient` via `klein_fast` |
| Admin test (`test-image-models.ts`) | Dispatches by profile; Replicate or OpenAI |

### 2.3 Timeout and fallback summary

| Config | Value | Source |
|---|---|---|
| `IMAGE_GENERATION_TIMEOUT_MS` | 120,000 ms | `generate-book.ts` L62 |
| Timeout wrapper | `withImageTimeout()` | `replicate.ts` L201–213 |
| Timeout error class | `ImageTimeoutError` | `replicate.ts` L215–220 |
| Fallback chain (pro_consistent) | `[pro_consistent, klein_fast]` | `replicate.ts` L111–125 |
| Fallback chain (openai candidate) | `[openai_image_candidate]` (no Replicate fallback) | `replicate.ts` L111–125 |

### 2.4 Error classification flow

```
(error thrown during generateImage)
      ↓
  classifyError(err)             ← generation-event-logger.ts L273–360
      ↓
  resolveProviderFromProfile()   ← generation-event-logger.ts L362–365
      ↓
  logGenerationEvent(page_image_failed, { errorCode, provider, ... })
```

`resolveProviderFromProfile()` currently hardcodes:
```ts
profile === "openai_image_candidate" ? "openai" : "replicate"
```

### 2.5 Prompt building — provider coupling

`buildImagePrompt()` in `prompt-builder.ts` (L659–671) has a branch:
```ts
if (imageModelProfile === "pro_consistent" || imageModelProfile === "kontext_reference")
  // detailed guidance
else
  // simplified guidance
```
This is model-capability coupling, not provider coupling. It should be surfaced through a provider capability flag (`supportsDetailedGuidance`) in the adapter, but the prompt content stays in `prompt-builder.ts`.

---

## 3. Coupling Map

### 3.1 `functions/src/generate-book.ts`

| Coupling point | Lines | Classification |
|---|---|---|
| Import of `ReplicateImageClient` | L31 | → Should go through provider factory |
| Import of `resolveImageModelProfile` from replicate | L32 | → Should become provider-neutral routing policy |
| Import of `resolveImageFallbackProfiles` from replicate | L34 | → Should become provider-neutral fallback policy |
| Import of `isCandidateProfile`, `CANDIDATE_IMAGE_PROFILES` | L35 | → Should remain shared gate policy (not inside adapter) |
| Import of `withImageTimeout`, `ImageTimeoutError` from replicate | L36–37 | → Should move to shared utility; referenced by adapters |
| Import of `OpenAIImageClient`, `OPENAI_IMAGE_CANDIDATE_PROFILE` | L39 | → Should go through provider factory |
| `createImageClient()` routing by profile | L2185–2200 | → Should become a `ProviderFactory.create(profile)` call |
| `resolveReplicateModel()` used for model label in Firestore | L1064, L1087 | → Should become `adapter.resolveModelLabel()` |
| `resolveOpenAIModelLabel()` call | L1087 | → Should become `adapter.resolveModelLabel()` |
| `generatePageImageWithFallback()` calls `imageClient.generateImage()` | L580 | → Already polymorphic; OK |
| `withImageTimeout(...)` wrapping | L580, L712, L1598 | → Move into adapter or shared utility |

### 3.2 `functions/src/lib/replicate.ts`

| Coupling point | Lines | Classification |
|---|---|---|
| Replicate model name constants | L8–18 | → Stay inside Replicate adapter |
| `CANDIDATE_IMAGE_PROFILES` list | L118–124 | → Stay as shared gate policy (referenced by generate-book) |
| `resolveImageModelProfile()` | L77–95 | → Should become provider-neutral profile resolution |
| `resolveReplicateModel()` | L98–108 | → Stay inside Replicate adapter (maps profiles to Replicate model names) |
| `resolveImageFallbackProfiles()` | L111–125 | → Should become provider-neutral fallback policy |
| `isCandidateProfile()` | L128–133 | → Stay as shared gate policy |
| `buildReplicateInput()` | L136–198 | → Stay inside Replicate adapter |
| `withImageTimeout()` | L201–213 | → Move to shared utility used by all adapters |
| `ImageTimeoutError` class | L215–220 | → Move to shared types |
| `ReplicateImageClient` class | L222–305 | → Becomes Replicate adapter implementing `ImageProvider` interface |

### 3.3 `functions/src/lib/openai-image.ts`

| Coupling point | Lines | Classification |
|---|---|---|
| `OPENAI_IMAGE_CANDIDATE_PROFILE` constants | L44–99 | → Stay inside OpenAI adapter |
| `resolveOpenAIModelLabel()` | L67–73 | → Becomes `OpenAIImageAdapter.resolveModelLabel()` |
| `OpenAIImageClient` class | L75–222 | → Becomes OpenAI adapter implementing `ImageProvider` interface |
| System instruction constants | L31–63 | → Stay inside OpenAI adapter (content policy hardening) |
| Two-API routing (Images API vs Responses API) | L83–93 | → Internal to OpenAI adapter |

### 3.4 `functions/src/lib/generation-event-logger.ts`

| Coupling point | Lines | Classification |
|---|---|---|
| `ImageProvider` type (`"replicate" \| "openai"`) | L83–85 | → Stays shared; new providers add to the union |
| `resolveProviderFromProfile()` hardcodes openai check | L362–365 | → Should move into adapters; each adapter knows its own provider ID |
| `classifyError()` error classification | L273–360 | → Stays shared taxonomy; adapters may pre-classify before calling |
| `logGenerationEvent()` | L373–376 | → Stays shared; provider-neutral event shape |

### 3.5 `functions/src/lib/slo-metrics.ts`

| Coupling point | Lines | Classification |
|---|---|---|
| No provider-specific logic | — | → OK as-is; already provider-neutral |

### 3.6 Tests

| Coupling point | File | Classification |
|---|---|---|
| `isCandidateProfile` / `CANDIDATE_IMAGE_PROFILES` | `candidate-gate.test.ts` | → Stay as policy tests; not affected by adapter refactor |
| `resolveImageModelProfile`, `resolveImageFallbackProfiles` | `replicate.test.ts` | → Move into adapter contract tests in P3-6 |
| `OpenAIImageClient` behavior | `openai-image.test.ts` | → Move into OpenAI adapter contract tests in P3-6 |
| `generate-book.test.ts` stubs `imageClient` as mock | `generate-book.test.ts` | → Stable; abstract interface makes mocking easier |

---

## 4. Proposed `ImageProvider` Interface

> **P3-1 note**: This is a design draft. TypeScript types are documented here only. Implementation starts in P3-2.

### 4.1 Core interface

```typescript
/**
 * ImageProvider — provider-neutral contract for image generation.
 * Each provider (Replicate, OpenAI) implements this interface.
 * All provider-specific API calls, payload construction, and response
 * parsing stay within the implementation.
 */
export interface ImageProvider {
  /** Stable ID for this provider (e.g. "replicate", "openai") */
  readonly providerId: ImageProviderId;

  /** Whether this provider supports reference images as input */
  readonly supportsReferenceImages: boolean;

  /** Whether this provider supports text-to-image generation */
  readonly supportsTextToImage: boolean;

  /** Whether this provider supports detailed compositional guidance */
  readonly supportsDetailedGuidance: boolean;

  /**
   * Generate an image from the given request.
   * Throws ImageGenerationError (or a subclass) on failure.
   * Does NOT apply timeout — caller is responsible via withImageTimeout().
   */
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;

  /**
   * Classify an error thrown by generateImage() into a structured ErrorCode.
   * Called by the shared error logging layer.
   */
  classifyError(error: unknown): ErrorCode;

  /**
   * Return a human-readable model label for Firestore storage.
   * e.g. "black-forest-labs/flux-2-pro", "openai/gpt-4o"
   */
  resolveModelLabel(request: ImageGenerationRequest): string;
}
```

### 4.2 Provider ID type

```typescript
export type ImageProviderId = "replicate" | "openai";
// New providers extend this union in their P3-9+ tasks
```

### 4.3 Image profile → provider mapping

```typescript
/**
 * Each ImageModelProfile belongs to exactly one provider.
 * This mapping is owned by the routing policy layer (not by adapters).
 */
export type ImageModelProfile =
  | "pro_consistent"           // Replicate (default)
  | "klein_fast"               // Replicate (fallback)
  | "klein_base"               // Replicate (comparison)
  | "kontext_reference"        // Replicate (reference-mode candidate)
  | "flux11_pro_candidate"     // Replicate (diagnostic candidate)
  | "openai_image_candidate";  // OpenAI (candidate, gated)

export const PROFILE_PROVIDER_MAP: Record<ImageModelProfile, ImageProviderId> = {
  pro_consistent: "replicate",
  klein_fast: "replicate",
  klein_base: "replicate",
  kontext_reference: "replicate",
  flux11_pro_candidate: "replicate",
  openai_image_candidate: "openai",
};
```

This replaces the hardcoded check in `resolveProviderFromProfile()`.

---

## 5. Provider-Neutral Request / Response Model

> **P3-1 note**: Draft types only. Implementation in P3-2.

### 5.1 `ImageGenerationRequest`

```typescript
export interface ImageGenerationRequest {
  /**
   * The image generation prompt.
   * Privacy: Must NOT contain raw child names, user IDs, or PII.
   * Use sanitized prompt from buildImagePrompt().
   */
  prompt: string;

  /** The resolved profile to use for this attempt */
  imageModelProfile: ImageModelProfile;

  /**
   * Optional reference image URLs (character references, style references).
   * These are storage URLs, not user-uploaded raw files.
   */
  inputImageUrls?: string[];

  /** Roles corresponding to inputImageUrls (e.g. "character_reference") */
  inputImageRoles?: string[];

  /** Purpose hint for model selection within the adapter */
  imagePurpose: ImagePurpose;

  /** Quality tier (affects prompt richness, not provider selection) */
  imageQualityTier?: ImageQualityTier;
}

export type ImagePurpose =
  | "book_page"
  | "book_cover"
  | "child_avatar"
  | "child_avatar_revision"
  | "recurring_character_reference";

export type ImageQualityTier = "premium" | "standard" | "free";
```

### 5.2 `ImageGenerationResult`

```typescript
export interface ImageGenerationResult {
  /** Generated image as Buffer */
  imageBuffer: Buffer;

  /** The profile actually used (may differ from requested if adapter internally adapts) */
  usedProfile: ImageModelProfile;

  /** Human-readable model label for Firestore (e.g. "black-forest-labs/flux-2-pro") */
  modelLabel: string;

  /** Duration of the generation call in ms */
  durationMs: number;

  /** Number of attempts made within this adapter call */
  attemptCount: number;

  /** Number of input image URLs actually sent to the provider */
  inputImageUrlsCount: number;
}
```

### 5.3 `ImageGenerationFailure`

```typescript
export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public readonly errorCode: ErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ImageGenerationError";
  }
}
```

### 5.4 Privacy requirements

All types in this model must satisfy:

- **No raw prompt logging**: `prompt` is passed through for generation only; never logged in structured events
- **No child names**: Not stored in any field of `ImageGenerationRequest`
- **No story text**: Not stored in any field
- **No raw user IDs**: `ImageGenerationRequest` has no user identity field — user context stays in the calling layer
- **inputImageUrls** are Cloud Storage URLs (system-generated), not user-uploaded content — safe to log count only (`inputImageUrlsCount`)

---

## 6. Routing and Policy Separation

### 6.1 What stays OUTSIDE adapters (shared policy layer)

| Concern | Current location | After P3 |
|---|---|---|
| Production default routing | `generate-book.ts` `createImageClient()` | `ProviderFactory.create(profile)` in shared routing module |
| Candidate gate | `isCandidateProfile()` in `replicate.ts` | Stays in shared gate policy; called before provider dispatch |
| Profile selection | `resolveImageModelProfile()` in `replicate.ts` | Move to shared routing module |
| Fallback chain | `resolveImageFallbackProfiles()` in `replicate.ts` | Move to shared routing module |
| Timeout wrapper | `withImageTimeout()` in `replicate.ts` | Move to shared utility |
| SLO logging | `logGenerationEvent()` in `generation-event-logger.ts` | Stays shared; called by generate-book.ts |
| Firestore page status updates | `generate-book.ts` | Stays in generate-book.ts |
| Partial completion logic | `generate-book.ts` | Stays in generate-book.ts |

### 6.2 What moves INTO adapters

| Concern | Current location | After P3 |
|---|---|---|
| Replicate API call | `ReplicateImageClient.generateImageWithMetadata()` | `ReplicateImageAdapter.generateImage()` |
| Replicate request payload | `buildReplicateInput()` | Inside `ReplicateImageAdapter` |
| Replicate response parsing | `extractUrlFromReplicateOutput()` | Inside `ReplicateImageAdapter` |
| Replicate model name resolution | `resolveReplicateModel()` | `ReplicateImageAdapter.resolveModelLabel()` |
| Replicate-specific error detection | `classifyError()` E005/TIMEOUT logic | `ReplicateImageAdapter.classifyError()` (delegates to shared taxonomy) |
| OpenAI API routing (Images vs Responses API) | `OpenAIImageClient.generateImage()` | `OpenAIImageAdapter.generateImage()` |
| OpenAI request formatting | `generateTextToImage()`, `generateWithReferenceImages()` | Inside `OpenAIImageAdapter` |
| OpenAI model label resolution | `resolveOpenAIModelLabel()` | `OpenAIImageAdapter.resolveModelLabel()` |
| OpenAI system instructions | constants in `openai-image.ts` | Stay inside `OpenAIImageAdapter` (content policy) |
| Provider ID | `resolveProviderFromProfile()` | `adapter.providerId` property |

---

## 7. Migration Slices

### P3-2: Provider-neutral type definitions

**Scope**: Types only, no behavior change.
- Add `ImageProvider` interface, `ImageGenerationRequest`, `ImageGenerationResult`, `ImageGenerationError`, `ImagePurpose`, `ImageQualityTier`, `PROFILE_PROVIDER_MAP` to a new file `functions/src/lib/image-provider.ts`
- Add `ImageProviderId` union type
- No runtime code using these types yet
- All existing tests continue to pass

### P3-3: Wrap Replicate path behind adapter

**Scope**: Refactor `ReplicateImageClient` to implement `ImageProvider` interface.
- Rename/extend `ReplicateImageClient` → `ReplicateImageAdapter` (implements `ImageProvider`)
- Move `buildReplicateInput()`, `resolveReplicateModel()`, Replicate model constants inside the adapter
- `classifyError()` in adapter delegates to shared taxonomy
- `resolveModelLabel()` replaces `resolveReplicateModel()` call in `generate-book.ts`
- `generate-book.ts` calls `adapter.generateImage()` — same as before
- **All behavior identical to current.** Only internal structure changes.

### P3-4: Wrap OpenAI image candidate path behind adapter

**Scope**: Refactor `OpenAIImageClient` to implement `ImageProvider` interface.
- Rename/extend `OpenAIImageClient` → `OpenAIImageAdapter` (implements `ImageProvider`)
- Move OpenAI constants, routing logic, system instructions inside the adapter
- `resolveModelLabel()` replaces `resolveOpenAIModelLabel()` call in `generate-book.ts`
- `providerId` returns `"openai"` — replaces `resolveProviderFromProfile()` in event logger
- **All behavior identical to current.** OpenAI path remains candidate/gated.

### P3-5: Move provider error classification into adapters

**Scope**: Each adapter's `classifyError()` handles provider-specific error shapes.
- Replicate adapter: E005 detection (content policy string matching)
- OpenAI adapter: OpenAI-specific quota/policy error detection
- Shared `classifyError()` in `generation-event-logger.ts` becomes the canonical taxonomy; adapters call it or override specific cases
- No change to logged error codes — same `ErrorCode` values emitted

### P3-6: Add adapter contract tests

**Scope**: Test coverage for the `ImageProvider` interface contract.
- `test/replicate-adapter.test.ts` — golden tests for Replicate adapter
- `test/openai-image-adapter.test.ts` — golden tests for OpenAI adapter
- Tests verify: `providerId`, `supportsReferenceImages`, `generateImage()` mock, `classifyError()` for known error shapes, `resolveModelLabel()`
- Existing `test/candidate-gate.test.ts` and `test/generation-event-logger.test.ts` continue to pass unchanged

### P3-7: Update SLO logging to use provider-neutral fields

**Scope**: Replace `resolveProviderFromProfile()` call in event logger with `adapter.providerId`.
- After P3-4 lands, `generate-book.ts` can pass `provider: adapter.providerId` directly to `logGenerationEvent()`
- Remove `resolveProviderFromProfile()` function from `generation-event-logger.ts` (or keep as fallback)
- No change to logged `provider` field values — same `"replicate"` / `"openai"` values

### P3-8: Cleanup legacy Replicate-specific names where safe

**Scope**: Remove or deprecate Replicate-specific names that leaked into shared code.
- `resolveImageModelProfile()` moved to shared routing module
- `resolveImageFallbackProfiles()` moved to shared routing module
- `withImageTimeout()` moved to shared utility module
- `ImageTimeoutError` moved to shared types
- Replicate model name constants remain inside Replicate adapter

### P3-9: OpenAI adapter live smoke, gated only

**Scope**: Manual-dispatch smoke test for OpenAI adapter in candidate mode.
- Run against enrolled account only
- Verify adapter produces valid image buffer
- Verify `imageFallbackUsed`, `imageModel`, `imageDurationMs` stored correctly in Firestore
- Verify no PII in logs
- Confirm candidate gate blocks non-enrolled users

---

## 8. Test Strategy

### 8.1 Tests required before implementation

| Test | When needed | Description |
|---|---|---|
| Provider contract tests (P3-6) | Before P3-3/P3-4 merge | Interface contract: all adapters pass the same baseline assertions |
| Replicate adapter golden tests (P3-6) | With P3-3 | Mock Replicate API; verify payload construction, response parsing, error classification |
| OpenAI adapter golden tests (P3-6) | With P3-4 | Mock OpenAI API; verify both API paths (Images vs Responses), error classification |
| Timeout behavior tests | P3-3 | `withImageTimeout()` utility; ImageTimeoutError thrown at exactly `timeoutMs` |

### 8.2 Tests that must remain unchanged

| Test | Why |
|---|---|
| `test/candidate-gate.test.ts` (48 tests) | Gate policy is shared; not inside adapters |
| `test/generation-event-logger.test.ts` (54 tests) | Event shapes and error taxonomy must not drift |
| `test/generate-book.test.ts` (52 tests) | Integration behavior must not change |
| `test/replicate.test.ts` | Must be extended, not replaced, for backward compat |
| Full suite (805 tests) | Zero regression tolerance for adapter refactor |

### 8.3 No-live-call rule

Unit tests for adapters must:
- Mock the Replicate SDK (`replicate.run()`)
- Mock the OpenAI SDK (`client.images.generate()`, `client.responses.create()`)
- Never make real network calls
- Never use real API keys
- Use fixture response payloads

---

## 9. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Accidental routing change | Medium | High | Keep routing policy outside adapters; test `createImageClient()` / provider factory in P3-3 |
| Fallback order regression | Medium | High | Keep `resolveImageFallbackProfiles()` behavior identical; test in P3-3 with golden tests |
| Candidate profile leakage | Low | Critical | `isCandidateProfile()` stays in shared gate policy; tested by 48 existing gate tests |
| Error taxonomy drift | Medium | Medium | Shared `classifyError()` stays canonical; adapters delegate; `generation-event-logger.test.ts` covers taxonomy |
| Prompt leakage into logs | Low | Critical | `ImageGenerationRequest.prompt` never logged; all logged fields are counts/profiles/codes |
| Provider-specific timeout differences | Low | Medium | `withImageTimeout()` is shared; adapters do not set their own timeouts unless explicitly designed |
| Image URL / schema inconsistency | Low | Medium | Adapter must return `Buffer`; URL extraction stays inside Replicate adapter |
| Test fixture drift | Medium | Low | Adapter golden tests use explicit fixture snapshots; CI enforces |
| Scope creep into routing change | Medium | High | P3-1 is docs-only; P3-2 through P3-9 each have explicit non-goals |

---

## 10. Acceptance Criteria for P3-1

- [x] Docs-only — no production code changed
- [x] Coupling inventory complete (all major coupling points identified with line numbers)
- [x] `ImageProvider` interface draft complete
- [x] Provider-neutral request/response model draft complete
- [x] Routing/policy separation defined
- [x] Migration slices P3-2 through P3-9 defined
- [x] Test strategy defined
- [x] Risk analysis complete
- [x] All baseline tests pass:
  - `npm run check:phase2`: hygiene + SLO self-test 49/49 + guard tests 102/102
  - Full functions suite: 805/805
  - `cd functions && npm run build`: PASS

---

## Appendix A: Key File Reference

| File | Role | P3 status |
|---|---|---|
| `functions/src/generate-book.ts` | Main orchestrator; routing, fallback, logging | Refactor `createImageClient()` in P3-3/P3-4 |
| `functions/src/lib/replicate.ts` | Replicate API + shared policy (mixed) | Separate adapter (P3-3) from policy (P3-8) |
| `functions/src/lib/openai-image.ts` | OpenAI API (candidate only) | Become OpenAI adapter (P3-4) |
| `functions/src/lib/generation-event-logger.ts` | Error classification + event logging | Update `resolveProviderFromProfile` in P3-7 |
| `functions/src/lib/slo-metrics.ts` | SLO computation | Already provider-neutral; no change needed |
| `functions/src/lib/prompt-builder.ts` | Prompt construction | Minor capability-flag refactor in P3-3 |
| `functions/src/lib/image-provider.ts` | **New** — shared types and interface | Created in P3-2 |
| `functions/src/test-image-models.ts` | Admin test routing | Update provider dispatch in P3-4 |

## Appendix B: Candidate Profile Safety Rule

The following rule must be preserved through all Phase 3 slices:

> **`openai_image_candidate` must never be used for production default routing.** It is gated by `isCandidateProfile()` and only allowed for enrolled users in the candidate gate. Any adapter refactor that touches OpenAI routing must preserve this gate. The 48 tests in `test/candidate-gate.test.ts` are the regression lock.

## Appendix C: Privacy Invariants

The following must hold in all P3 slices:

- `ImageGenerationRequest.prompt` — never included in structured generation event logs
- `inputImageUrls` — only `inputImageUrlsCount` (integer) is logged in events
- No child name, story text, or user ID in any adapter input or output
- `imageModel` stored in Firestore is a model label string (e.g. `"black-forest-labs/flux-2-pro"`) — not prompt text

These are enforced by `generation-event-logger.ts` event type definitions (P2-2) and must not regress.
