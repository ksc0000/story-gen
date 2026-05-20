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

### P3-2: Provider-neutral type definitions — **COMPLETE**

**Scope**: Types only, no behavior change.

**Implementation** (commit: see git log for `feat(P3-2)`):
- New file: `functions/src/lib/image-provider.ts`
- New test file: `functions/test/image-provider-types.test.ts` (13 tests, all passing)
- Runtime behavior unchanged — no production module imports this file yet

**Exported types**:
| Export | Kind | Description |
|---|---|---|
| `ImageProviderId` | `type` | `"replicate" \| "openai"` |
| `ImageProviderCapabilities` | `interface` | Static capability flags for text-to-image, image-to-image, reference images, detailed guidance |
| `ImageGenerationMetadata` | `interface` | Non-PII context (bookId, pageIndex, templateId, generationMode, candidateRequested, candidateAllowed) |
| `ImageGenerationRequest` | `interface` | Provider-neutral input (prompt, negativePrompt, aspectRatio, width, height, inputImageUrls, imageModelProfile, timeoutMs, metadata) |
| `ImageGenerationResult` | `interface` | Successful output (imageUrl, providerId, modelLabel, profile, durationMs, fallbackUsed) |
| `ImageGenerationFailure` | `interface` | Normalized failure (providerId, profile, errorCategory, errorCode, retryable, durationMs, safeMessage) |
| `ImageProvider` | `interface` | Adapter contract (providerId, capabilities, generateImage, classifyError, resolveModelLabel, validateConfig?) |
| `PROFILE_PROVIDER_MAP` | `const` | Maps each `ImageModelProfile` to its `ImageProviderId` — test use only in P3-2 |

**Non-goals confirmed**:
- `createImageClient()` in `generate-book.ts` — unchanged
- Candidate gate logic — unchanged
- Fallback ordering — unchanged
- Firestore schema — unchanged
- Generation routing — unchanged

**Test suite after P3-2**: 818/818 PASS (was 805, +13 new tests)

### P3-3: Wrap Replicate path behind adapter — **COMPLETE**

**Scope**: Add `ReplicateImageAdapter` wrapping `ReplicateImageClient` behind `ImageProvider`. NOT yet wired into `generate-book.ts`.

**Implementation**:
- New file: `functions/src/lib/replicate-image-adapter.ts`
- New test file: `functions/test/replicate-image-adapter.test.ts` (32 tests, all passing)

**Adapter responsibilities**:
| Method | Implementation |
|---|---|
| `providerId` | `"replicate"` (const) |
| `capabilities` | supportsTextToImage=true, supportsImageToImage=false, supportsReferenceImages=true, supportsDetailedGuidance=true |
| `generateImage(request)` | Delegates to `ReplicateImageClient.generateImageWithMetadata`; calls injected `ReplicateStorageUploader` to convert Buffer → URL. Default uploader throws until production wiring (P3-7). |
| `classifyError(err, ctx)` | Delegates to `classifyError()` from `generation-event-logger.ts`; adds `retryable` flag and truncated `safeMessage` (≤120 chars). |
| `resolveModelLabel(profile)` | Delegates to `resolveReplicateModel({ imageModelProfile: profile })`; throws for `openai_image_candidate`. |
| `validateConfig()` | Throws if `apiToken` is empty. |

**Exported types**: `ReplicateStorageUploader` (callback for Cloud Storage upload, injected for DI).

**Non-goals confirmed**:
- `createImageClient()` in `generate-book.ts` — **unchanged**
- Candidate gate logic — **unchanged**
- Fallback ordering (`resolveImageFallbackProfiles`) — **unchanged**
- Firestore schema — **unchanged**
- Generation routing — **unchanged**

**Note on generateImage production wiring**: `generateImage` requires a `ReplicateStorageUploader` callback. Production upload wiring (Cloud Storage) happens in P3-7. Live provider smoke belongs to P3-9.

**Test suite after P3-3**: 850/850 PASS (was 818, +32 new tests)

### P3-4: Wrap OpenAI image candidate path behind adapter — **COMPLETE**

**Scope**: Add `OpenAIImageAdapter` wrapping `OpenAIImageClient` behind `ImageProvider`. Candidate-only. NOT yet wired into `generate-book.ts`.

**Implementation**:
- New file: `functions/src/lib/openai-image-adapter.ts`
- New test file: `functions/test/openai-image-adapter.test.ts` (40 tests, all passing)
- `openai-image.ts` exports unchanged (`resolveOpenAIModelLabel` was already exported)

**Adapter responsibilities**:
| Method | Implementation |
|---|---|
| `providerId` | `"openai"` (const) |
| `capabilities` | supportsTextToImage=true, supportsImageToImage=true, supportsReferenceImages=true, supportsDetailedGuidance=true |
| `generateImage(request)` | Only accepts `openai_image_candidate`; delegates to `OpenAIImageClient.generateImage()`; calls injected `OpenAIStorageUploader` to convert Buffer → URL. Computes accurate `modelLabel` from `hasReferenceImages`. Default uploader throws until P3-7. |
| `classifyError(err, ctx)` | Delegates to `classifyError()` from `generation-event-logger.ts`; adds `retryable` flag and truncated `safeMessage` (≤120 chars). |
| `resolveModelLabel(profile)` | Only accepts `openai_image_candidate`; throws for all Replicate profiles. Returns `resolveOpenAIModelLabel(false)` = `"openai/gpt-image-1-mini"` as static default. |
| `validateConfig()` | Throws if `apiKey` is empty. |

**Note on resolveModelLabel**: Static default returns `"openai/gpt-image-1-mini"` (text-to-image path). When reference images are present, `generateImage()` returns `"openai/gpt-4o"` in `ImageGenerationResult.modelLabel` instead.

**Exported types**: `OpenAIStorageUploader` (callback for Cloud Storage upload, injected for DI).

**Non-goals confirmed**:
- `createImageClient()` in `generate-book.ts` — **unchanged**
- Candidate gate logic — **unchanged** (adapter does not expose `allowCandidateProfile`)
- Fallback ordering — **unchanged**
- Firestore schema — **unchanged**
- Generation routing — **unchanged**
- `openai-image.ts` exports — **unchanged** (no new exports needed)

**Test suite after P3-4**: 890/890 PASS (was 850, +40 new tests)

### P3-5: Move provider error classification into adapters — **COMPLETE**

**Scope**: Each adapter's `classifyError()` handles provider-specific error shapes.
- Replicate adapter: E005 detection (content policy string matching)
- OpenAI adapter: OpenAI-specific quota/policy error detection
- Shared `classifyError()` in `generation-event-logger.ts` becomes the canonical taxonomy; adapters call it or override specific cases
- No change to logged error codes — same `ErrorCode` values emitted

**Implementation**:
- New file: `functions/src/lib/provider-error-classifier.ts`
  - `classifyProviderError(error: unknown): NormalizedErrorInfo` — checks extended patterns first, falls back to shared `classifyError()` from `generation-event-logger.ts`
  - `isProviderErrorRetryable(errorCode: ErrorCode): boolean` — centralizes retryable logic (PROVIDER_5XX | NETWORK_ERROR | TIMEOUT)
- Updated: `functions/src/lib/replicate-image-adapter.ts` — uses `classifyProviderError` + `isProviderErrorRetryable`
- Updated: `functions/src/lib/openai-image-adapter.ts` — same replacements
- New tests: `functions/test/provider-error-classifier.test.ts` (44 tests)
- New test cases added to `functions/test/replicate-image-adapter.test.ts` (+8 tests)
- New test cases added to `functions/test/openai-image-adapter.test.ts` (+8 tests)

**Extended patterns added beyond shared taxonomy**:
| Pattern | Detected by | ErrorCode |
|---|---|---|
| `content_policy` (underscore) | both adapters | E005 |
| `moderation` | both adapters | E005 |
| `insufficient_quota` | OpenAI specific | QUOTA_EXCEEDED |
| `timed out` (without 'timeout') | both | TIMEOUT |
| `ECONNRESET` | both | NETWORK_ERROR |
| `ETIMEDOUT` (TCP timeout) | both | NETWORK_ERROR (not TIMEOUT) |
| `overloaded` | both | PROVIDER_5XX |
| `provider unavailable` | both | PROVIDER_5XX |
| `invalid input` | both | PROVIDER_4XX |
| `invalid request` | both | PROVIDER_4XX |
| `bad request` | both | PROVIDER_4XX |

**Taxonomy constraint confirmed**: No new `ErrorCategory` or `ErrorCode` values introduced.
All classifications use existing P2 taxonomy values.

**Acceptance criteria**:
- [x] `classifyProviderError()` recognizes all extended patterns
- [x] Falls back to shared `classifyError()` for unmatched inputs
- [x] `isProviderErrorRetryable()` matches existing retryable logic in both adapters
- [x] Both adapters import from helper (not directly from generation-event-logger.ts for classification)
- [x] ETIMEDOUT → NETWORK_ERROR (not TIMEOUT)
- [x] `generate-book.ts` `createImageClient()` unchanged
- [x] All gate/SLO/candidate tests unchanged
- [x] safeMessage ≤ 120 chars for all new patterns
- [x] 1034/1034 PASS (was 974, +60 new tests)

### P3-6: Add adapter contract tests — **COMPLETE**

**Scope**: Shared contract tests verifying both adapters satisfy `ImageProvider` invariants.

**Implementation**:
- New file: `functions/test/image-provider-contract.test.ts`
- 84 tests, all passing (parameterized with `describe.each` over both adapters)

**Contract invariants covered**:
| Section | Tests | Description |
|---|---|---|
| Interface shape | 5 × 2 adapters | `providerId`, `capabilities`, `generateImage`, `classifyError`, `resolveModelLabel` all present |
| Provider identity | 3 × 2 | `providerId` value, PROFILE_PROVIDER_MAP alignment, valid ImageProviderId |
| Capabilities | 5 × 2 | All 4 boolean fields present and stable across calls |
| Supported profiles | 2 × 2 | Accept own profiles, reject foreign profiles |
| Model label | 3 × 2 | Non-empty string, provider prefix pattern, helpful error for unsupported |
| Error classification | 9 × 2 | Never throws, required fields, providerId matches, profile matches, UNKNOWN fallback, TIMEOUT consistent, retryable type |
| Privacy / safeMessage | 6 × 2 | No `prompt`/`childName`/`storyText`/`userId` keys in result; safeMessage ≤ 120 chars |
| No live network | 3 × 2 | Dummy keys, pure computation for resolveModelLabel and classifyError |
| Cross-adapter exhaustiveness | 4 | Every profile handled by exactly one adapter; each profile rejected by all other adapters; fixture completeness |

**Non-goals confirmed**:
- `generate-book.ts` not imported
- `createImageClient()` not called
- Candidate gate not tested here (covered in `test/candidate-gate.test.ts`)
- Adapters not wired into production generation

**Test suite after P3-6**: 974/974 PASS (was 890, +84 new tests)

### P3-7: Update SLO logging to use provider-neutral fields — **COMPLETE**

**Scope**: Unify provider attribution for structured generation logs.

**Implementation**:
- `resolveProviderFromProfile()` in `generation-event-logger.ts` now delegates to `PROFILE_PROVIDER_MAP`
  from `image-provider.ts`, making `PROFILE_PROVIDER_MAP` the single source of truth.
- `PROFILE_PROVIDER_MAP` comment updated to note it is now canonical and consumed by `generation-event-logger.ts`.
- No change to `generate-book.ts` — it still calls `resolveProviderFromProfile(finalProfile)` unchanged.
- No change to event schema or emitted field names.
- No change to `createImageClient()` or generation routing.

**Why `resolveProviderFromProfile()` is kept** (not replaced by `adapter.providerId`):
- `generate-book.ts` generates using the original `ReplicateImageClient` / `OpenAIImageClient` path
  (adapters not yet wired). Provider identity at log time comes from the profile, not an adapter instance.
- Replacing with `adapter.providerId` belongs to P3-8/P3-9 when adapters are wired into generation.
- This slice only eliminates the dual-source-of-truth issue (map in image-provider.ts vs hardcoded check in generation-event-logger.ts).

**Import safety**: `image-provider.ts` uses `import type { ErrorCategory, ErrorCode }` from
`generation-event-logger.ts` (type-only, erased at runtime). `generation-event-logger.ts` now imports
`PROFILE_PROVIDER_MAP` as a runtime value. No circular dependency at runtime.

**Acceptance criteria**:
- [x] `PROFILE_PROVIDER_MAP` is the single source of truth for profile → provider attribution
- [x] `resolveProviderFromProfile()` delegates to `PROFILE_PROVIDER_MAP` with "replicate" fallback
- [x] Emitted `provider` values unchanged: Replicate profiles → "replicate", openai_image_candidate → "openai"
- [x] Event schema unchanged (field names, event names unchanged)
- [x] `generate-book.ts` unchanged — still calls `resolveProviderFromProfile()`
- [x] `createImageClient()` unchanged
- [x] Generation routing unchanged, candidate gate unchanged, fallback order unchanged
- [x] No circular imports (verified by TypeScript compiler and test runner)
- [x] No Firebase deploy
- [x] 1037/1037 PASS (was 1034, +3 alignment tests)

**Files changed**:
- `functions/src/lib/generation-event-logger.ts` — import PROFILE_PROVIDER_MAP; delegate resolveProviderFromProfile
- `functions/src/lib/image-provider.ts` — update PROFILE_PROVIDER_MAP comment (canonical source)
- `functions/test/generation-event-logger.test.ts` — import PROFILE_PROVIDER_MAP; add 3 alignment tests

**Next step**: P3-8 — cleanup legacy Replicate-specific names, or P3-9 — gated OpenAI adapter smoke test.

### P3-8: Legacy Replicate-specific naming cleanup and shared policy extraction — **COMPLETE**

**Scope**: Provider-neutral policy functions extracted from replicate.ts into a dedicated shared module.

**New module**: `functions/src/lib/image-model-policy.ts`

**Functions moved** (source of truth now in image-model-policy.ts):
| Symbol | Direction |
|---|---|
| `CANDIDATE_IMAGE_PROFILES` | Moved to image-model-policy.ts; re-exported from replicate.ts |
| `isCandidateProfile()` | Moved to image-model-policy.ts; re-exported from replicate.ts |
| `resolveImageModelProfile()` | Moved to image-model-policy.ts; re-exported from replicate.ts |
| `resolveImageFallbackProfiles()` | Moved to image-model-policy.ts; re-exported from replicate.ts |

**Deferred** (churn too large for this slice; tracked for future cleanup):
- `withImageTimeout()` — still in replicate.ts
- `ImageTimeoutError` — still in replicate.ts

**Compatibility strategy**:
- `replicate.ts` imports from `image-model-policy.ts` and re-exports all four symbols.
- `generate-book.ts` imports from `./lib/replicate` unchanged — continues to work via re-exports.
- `candidate-gate.test.ts` imports from `../src/lib/replicate` unchanged — continues to work.
- `replicate.test.ts` imports from `../src/lib/replicate` unchanged — continues to work.
- No call site anywhere needed changing.

**Acceptance criteria**:
- [x] Policy functions have single source of truth in image-model-policy.ts
- [x] replicate.ts re-exports verified to be same reference as policy module exports
- [x] CANDIDATE_IMAGE_PROFILES membership unchanged
- [x] resolveImageFallbackProfiles order unchanged for all 6 profiles
- [x] isCandidateProfile behavior unchanged
- [x] resolveImageModelProfile default, purpose, tier, and candidate pass-through unchanged
- [x] generate-book.ts unchanged
- [x] createImageClient() unchanged
- [x] Generation routing unchanged, candidate gate unchanged, fallback order unchanged
- [x] No Firebase deploy
- [x] 1074/1074 PASS (was 1037, +37 new tests)
- [x] npm run check:phase2: PASS

**Files changed**:
- `functions/src/lib/image-model-policy.ts` — new file (canonical source)
- `functions/src/lib/replicate.ts` — removed policy implementations; added import + re-export
- `functions/test/image-model-policy.test.ts` — new file (37 tests covering all policy functions)

**Next step**: P3-9 — gated OpenAI adapter smoke test, or adapter wiring design (phase gate).

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

## 10. Acceptance Criteria

### P3-1

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

### P3-2

- [x] `functions/src/lib/image-provider.ts` created with all required type exports
- [x] `PROFILE_PROVIDER_MAP` constant present and correct (openai_image_candidate → openai; all others → replicate)
- [x] `ImageGenerationMetadata` excludes PII fields (userId, childName, storyText, userName, parentName)
- [x] Mock `ImageProvider` implementation compiles and passes tests
- [x] `functions/test/image-provider-types.test.ts` added: 13 tests, all passing
- [x] No production module imports `image-provider.ts` yet
- [x] `createImageClient()` in `generate-book.ts` unchanged
- [x] Candidate gate unchanged (48 gate tests green)
- [x] `npm run check:phase2`: PASS
- [x] Full functions suite: 818/818 (was 805 + 13 new)
- [x] `cd functions && npm run build`: PASS
- [x] `node scripts/check-hygiene.mjs`: PASS

### P3-3

- [x] `functions/src/lib/replicate-image-adapter.ts` created implementing `ImageProvider`
- [x] `ReplicateImageAdapter.providerId` = `"replicate"`
- [x] `ReplicateImageAdapter.capabilities` matches current Replicate FLUX behavior
- [x] `ReplicateImageAdapter.resolveModelLabel()` delegates to `resolveReplicateModel()`; throws for `openai_image_candidate`
- [x] `ReplicateImageAdapter.classifyError()` delegates to `classifyError()` from `generation-event-logger.ts`; adds `retryable`, truncated `safeMessage`
- [x] `ReplicateImageAdapter.generateImage()` delegates to `ReplicateImageClient.generateImageWithMetadata()`; storage upload via injected `ReplicateStorageUploader`
- [x] Default `ReplicateStorageUploader` throws — production wiring deferred to P3-7
- [x] `functions/test/replicate-image-adapter.test.ts` added: 32 tests, all passing
- [x] `createImageClient()` in `generate-book.ts` unchanged
- [x] Candidate gate unchanged (48 gate tests green)
- [x] Fallback ordering unchanged
- [x] `npm run check:phase2`: PASS
- [x] Full functions suite: 850/850 (was 818 + 32 new)
- [x] `cd functions && npm run build`: PASS
- [x] `node scripts/check-hygiene.mjs`: PASS

### P3-4

- [x] `functions/src/lib/openai-image-adapter.ts` created implementing `ImageProvider`
- [x] `OpenAIImageAdapter.providerId` = `"openai"`
- [x] `OpenAIImageAdapter.capabilities` matches current OpenAI candidate path behavior (supportsReferenceImages=true, supportsImageToImage=true)
- [x] `OpenAIImageAdapter.resolveModelLabel("openai_image_candidate")` = `"openai/gpt-image-1-mini"` (text-to-image default); throws for all Replicate profiles
- [x] `OpenAIImageAdapter.classifyError()` delegates to `classifyError()` from `generation-event-logger.ts`; adds `retryable`, truncated `safeMessage`
- [x] `OpenAIImageAdapter.generateImage()` only accepts `openai_image_candidate`; throws for other profiles
- [x] `OpenAIImageAdapter.generateImage()` computes accurate `modelLabel` per request (gpt-4o vs gpt-image-1-mini)
- [x] Default `OpenAIStorageUploader` throws — production wiring deferred to P3-7
- [x] Candidate gate does not exist on adapter (no `allowCandidateProfile` exposure)
- [x] `openai-image.ts` exports unchanged
- [x] `functions/test/openai-image-adapter.test.ts` added: 40 tests, all passing
- [x] `createImageClient()` in `generate-book.ts` unchanged
- [x] Candidate gate unchanged (48 gate tests green)
- [x] Fallback ordering unchanged
- [x] `npm run check:phase2`: PASS
- [x] Full functions suite: 890/890 (was 850 + 40 new)
- [x] `cd functions && npm run build`: PASS
- [x] `node scripts/check-hygiene.mjs`: PASS

### P3-6

- [x] `functions/test/image-provider-contract.test.ts` added: 84 tests, all passing
- [x] Interface shape contract (5 checks × 2 adapters)
- [x] Provider identity contract (3 × 2) — providerId, PROFILE_PROVIDER_MAP alignment
- [x] Capabilities contract (5 × 2) — all 4 boolean fields present and stable
- [x] Supported profile contract (2 × 2) — accept own, reject foreign
- [x] Model label contract (3 × 2) — non-empty, provider prefix, helpful error
- [x] Error classification contract (9 × 2) — never throws, required fields, UNKNOWN/TIMEOUT
- [x] Privacy contract (6 × 2) — no PII keys; safeMessage ≤ 120 chars
- [x] No live network contract (3 × 2) — dummy keys, pure computation
- [x] Cross-adapter exhaustiveness contract (4) — every profile handled by exactly one adapter
- [x] `generate-book.ts` not imported in test
- [x] `createImageClient()` not called in test
- [x] Candidate gate unchanged (48 gate tests green)
- [x] `npm run check:phase2`: PASS
- [x] Full functions suite: 974/974 (was 890 + 84 new)
- [x] `cd functions && npm run build`: PASS
- [x] `node scripts/check-hygiene.mjs`: PASS

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
