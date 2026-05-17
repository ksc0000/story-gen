# T5 Style Exposure Gating / Product Integration Plan

Date started: 2026-05-17
Track owner: Product / App Integration
Source validation track: `docs/STYLE_VARIANT_VALIDATION_PLAN.md`

## 1. Goal

T5 translates the T4 style-validation results into product-facing gating rules.

This track does **not** decide whether a style is good in isolation.
It decides:

- which `template × style` combinations can be exposed in product
- which combinations need caution or internal-only handling
- which combinations should be blocked or deferred
- where that logic should live across UI, payload, API, and operational QA

Core premise inherited from T4:

- the validation unit is the **style-template pairing**, not the style alone

## 2. Current Product Surface Audit

Reviewed surfaces:

- `src/components/style-picker.tsx`
- `src/app/(app)/create/style/page.tsx`
- `src/lib/illustration-styles.ts`
- `src/lib/types.ts`

Observed current behavior:

- the style picker shows canonical styles directly and hides legacy aliases
- the create flow currently lets the user select a style without checking template-specific validation status
- the create payload already stores the style metadata needed for gating:
  - `style`
  - `selectedStyleId`
  - `selectedStyleName`
  - `styleBible`
  - `stylePreviewImageUrl`
  - `stylePreviewUsedAsReference`
- style profiles already contain:
  - canonical id
  - display name
  - preview image
  - styleBible
  - negativeStyleRules

Implication:

- T5 does not need to invent a new style identity system
- T5 needs a product-facing decision layer on top of existing style selection and payload flow

## 3. T4 Input Summary

Inherited T4 final ranking:

### Promote / Go

- `fixed-sleepy-moon-adventure-8p × crayon`
- `fixed-sleepy-moon-adventure-8p × anime_storybook`
- `fixed-first-zoo-8p × crayon`

### Candidate / Conditional-Go

- `fixed-sleepy-moon-adventure-8p × soft_watercolor`
- `fixed-first-zoo-8p × soft_watercolor`

### Blocked / Deferred

- `fixed-first-zoo-8p × anime_storybook`

Key T4 learnings that must affect exposure:

- `crayon` is the most portable validated style
- `anime_storybook` is attractive but template-sensitive
- `soft_watercolor` is the safest broad default but less differentiated
- zoo scenes are especially vulnerable to printed-surface BF-4 issues
- structural completion is not enough; validated exposure must honor style-template QA results

## 4. Exposure Tier Model

T5 defines four product exposure tiers for `template × style` combinations.

### Tier A: `Promote`

Definition:

- fully validated in current product scope
- can be shown as a recommended or featured combination
- does not need special warning copy

Expected examples:

- sleepy-moon × crayon
- sleepy-moon × anime_storybook
- first-zoo × crayon

### Tier B: `Available`

Definition:

- allowed for user selection
- not a featured hero combination
- may carry lightweight internal watch or QA note

Expected examples:

- sleepy-moon × soft_watercolor
- first-zoo × soft_watercolor

### Tier C: `Internal / Guarded`

Definition:

- not generally exposed in the main user picker
- still available to internal QA, admin tools, or controlled experiments
- useful for continued validation before wider release

Use case:

- future combinations that are not blocked, but not yet ready for user-facing exposure

### Tier D: `Blocked / Deferred`

Definition:

- should not be selectable in the normal product flow
- may remain documented for later stabilization work
- internal generation should require intentional override if allowed at all

Current example:

- first-zoo × anime_storybook

## 5. Combination Gating Policy

T5 gating unit:

- `templateId + selectedStyleId`

Not sufficient:

- style-only gating
- template-only gating

Required decision output per pairing:

- exposure tier
- user-facing availability
- internal availability
- rationale code
- watch notes if any

Recommended minimal decision shape:

```ts
type StyleExposureDecision = {
  templateId: string;
  styleId: string;
  tier: "promote" | "available" | "internal" | "blocked";
  userSelectable: boolean;
  featured: boolean;
  internalOnly?: boolean;
  rationaleCode:
    | "validated_go"
    | "validated_conditional"
    | "not_validated"
    | "blocked_qc"
    | "deferred_stabilization";
  watchNotes?: string[];
};
```

Policy rule:

- when a pairing is missing from the validated exposure map, default to a conservative non-featured state rather than silently treating it as fully approved

## 6. Product Exposure Recommendation

### 6.1 Featured Combinations

Recommended for top-level exposure:

- `fixed-sleepy-moon-adventure-8p × crayon`
- `fixed-sleepy-moon-adventure-8p × anime_storybook`
- `fixed-first-zoo-8p × crayon`

Recommended use:

- first-row picker emphasis
- template-specific recommendation chips
- marketing screenshots / preview examples

### 6.2 Available But Not Featured

Recommended for general availability without hero treatment:

- `fixed-sleepy-moon-adventure-8p × soft_watercolor`
- `fixed-first-zoo-8p × soft_watercolor`

Recommended use:

- still selectable in user flow
- can carry subtle "stable default" positioning
- should not outrank stronger distinctive validated pairings

### 6.3 Blocked / Deferred

Recommended hidden or blocked pairing:

- `fixed-first-zoo-8p × anime_storybook`

Handling:

- do not show in normal user picker when template is `fixed-first-zoo-8p`
- preserve internal reference in docs and controlled tooling
- reopen only under a dedicated stabilization track

## 7. Blocked Combination Handling

For blocked pairings, T5 recommends:

- hidden in user-facing style choices for the affected template
- excluded from featured template previews
- excluded from automated default recommendations
- still traceable in docs and internal QA records

If an internal override is needed later:

- expose only in admin / QA surfaces
- mark as non-productized
- require explicit context that the pairing is under investigation

Important constraint:

- blocking one pairing must not imply blocking the full style globally

Example:

- `anime_storybook` remains valid for sleepy-moon
- only `first-zoo × anime_storybook` is blocked

## 8. Conditional-Go Handling

`Conditional-Go` pairings should not be treated the same as blocked pairings.

Recommended product behavior:

- keep selectable
- avoid top-level recommendation priority
- preserve internal watch metadata
- use as safe fallback candidates when stronger featured styles are unavailable

Recommended internal watch operations:

- retain T4 watch note in docs and QA reference
- sample-check periodically after major model/prompt changes
- keep these pairings in any future regression bundle

Potential UI patterns:

- no scary warning to end users
- optional subtle label such as "やさしい定番"
- no special text if that adds clutter; internal handling is acceptable

## 9. Suggested Integration Architecture

T5 should keep the architecture simple.

Recommended layers:

### 9.1 Static Exposure Map

Add a product-owned decision map keyed by:

- `templateId`
- `styleId`

This map should define:

- exposure tier
- recommendation order
- blocked state
- optional watch notes

### 9.2 UI Filtering Layer

The create-style page should:

- know the selected template
- filter or reorder styles using the exposure map
- prefer template-scoped recommendation ordering over global style ordering

### 9.3 Server / Payload Validation Layer

Even if the UI filters correctly, the server path should not trust the client blindly.

Recommended server behavior candidate:

- reject blocked pairings in production-facing create flow
- allow admin/internal override only through explicit trusted paths

### 9.4 Analytics Layer

Capture:

- shown pairings
- selected pairings
- blocked-attempt events if any
- fallback usage for Conditional-Go candidates if later useful

## 10. Firestore / Payload / API / UI Impact Candidates

T5-1 does not implement changes, but the likely impact areas are:

### UI

- `src/components/style-picker.tsx`
- `src/app/(app)/create/style/page.tsx`

Possible changes:

- template-aware filtering
- template-aware ranking
- optional featured badge or ordering

### Shared Config / Types

- likely a new config module for style exposure decisions
- possible lightweight type for exposure tier and gating decision

### API / Server

- create-book entry path should validate blocked pairings
- admin/internal paths may need explicit override behavior

### Firestore / Payload

Schema changes are not required for the first implementation

Possible optional metadata later:

- resolved exposure tier at creation time
- recommendation source
- gating decision snapshot

Recommendation:

- keep first implementation schema-free if possible
- only persist gating snapshot if product analytics or auditing clearly needs it

## 11. T5-2+ Implementation Candidates

### T5-2

Define the canonical style exposure map and product-facing tier table in code.

### T5-3

Implement template-aware style filtering / ordering in the create flow UI.

### T5-4

Add server-side blocked-pair validation for production create paths.

### T5-5

Design admin/internal override behavior for blocked or deferred pairings.

### T5-6

Add regression / QA operating notes for Conditional-Go candidates.

### T5-7

Optional analytics instrumentation for shown / selected / blocked style-template pairings.

## 12. Initial Decision

T5-1 recommendation:

- proceed with template-aware exposure gating
- do not expose blocked pairings through the normal user flow
- treat `crayon` as the first broadly promotable style
- treat `anime_storybook` as selectively exposed, not globally promoted
- treat `soft_watercolor` as a safe baseline availability layer

## 13. Exclusions

- No code changes
- No UI changes
- No API changes
- No Firestore schema changes
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No runner changes
- No style profile changes
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 14. T5-2 Style Exposure Config Implementation Plan

Date: 2026-05-17

Scope:

- docs-only implementation planning
- translates the T5-1 policy into concrete config and responsibility boundaries
- no code changes in this slice

### 14.1 Current Integration Baseline

Confirmed current baseline:

- `src/components/style-picker.tsx`
  - renders canonical styles only
  - does not know the selected template or exposure decision
- `src/app/(app)/create/style/page.tsx`
  - knows the selected template
  - builds the user-facing create payload
  - already writes:
    - `style`
    - `selectedStyleId`
    - `selectedStyleName`
    - `styleBible`
    - `stylePreviewImageUrl`
    - `stylePreviewUsedAsReference`
- `src/lib/types.ts`
  - already defines the core style-related payload fields
- `src/lib/illustration-styles.ts`
  - remains the canonical source for style profile metadata
  - should stay separate from product exposure policy

Implication:

- style identity and style exposure should remain different concerns
- T5 config should layer on top of style profiles, not merge into them

### 14.2 Recommended Config Placement

Recommended new config location:

- `src/lib/style-exposure.ts`

Optional server mirror candidate:

- `functions/src/lib/style-exposure.ts`

Reasoning:

- exposure policy is app-specific product logic, not intrinsic style metadata
- keeping it separate from `illustration-styles.ts` avoids mixing QA gating with art-style definitions
- a mirrored server copy is acceptable if server-side validation is introduced before shared package extraction

Future consolidation option:

- if both client and functions need the same source of truth, consider a shared isomorphic module later
- do not optimize for that in the first implementation if it slows T5-3 / T5-4

### 14.3 Proposed Types

Recommended types:

```ts
export type StyleExposureStatus =
  | "promote"
  | "available"
  | "internal"
  | "blocked";

export type StyleExposureRationale =
  | "validated_go"
  | "validated_conditional"
  | "deferred_stabilization"
  | "not_validated"
  | "internal_only";

export type StyleTemplateExposure = {
  templateId: string;
  styleId: IllustrationStyle;
  status: StyleExposureStatus;
  rationale: StyleExposureRationale;
  featured?: boolean;
  userSelectable: boolean;
  internalOnly?: boolean;
  watchNotes?: string[];
  sortPriority?: number;
};
```

Recommended helper result type:

```ts
export type ResolvedStyleExposure = StyleTemplateExposure & {
  templateKnown: boolean;
  styleKnown: boolean;
};
```

Key design choice:

- use `status` as the product-facing tier
- use `rationale` to preserve why the status exists
- keep `watchNotes` lightweight and optional

### 14.4 Initial Exposure Matrix

Initial validated matrix to encode:

| templateId | styleId | status | featured | userSelectable | rationale |
| --- | --- | --- | --- | --- | --- |
| `fixed-sleepy-moon-adventure-8p` | `crayon` | `promote` | `true` | `true` | `validated_go` |
| `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `promote` | `true` | `true` | `validated_go` |
| `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `available` | `false` | `true` | `validated_conditional` |
| `fixed-first-zoo-8p` | `crayon` | `promote` | `true` | `true` | `validated_go` |
| `fixed-first-zoo-8p` | `soft_watercolor` | `available` | `false` | `true` | `validated_conditional` |
| `fixed-first-zoo-8p` | `anime_storybook` | `blocked` | `false` | `false` | `deferred_stabilization` |

Recommended default policy for unlisted pairings:

- `status = internal`
- `userSelectable = false`
- `rationale = not_validated`

Reasoning:

- fail-open would accidentally expose unvalidated pairings
- fail-closed is safer for first rollout

### 14.5 Responsibility Split

#### UI responsibility

The create flow UI should:

- resolve exposure by `templateId × styleId`
- hide or demote blocked / non-validated pairings
- surface featured combinations first
- preserve a stable deterministic ordering

The style picker component itself should ideally remain presentational.

Recommended split:

- `page.tsx` resolves exposure-aware style list
- `style-picker.tsx` receives an already-filtered ordered list plus optional exposure annotations

#### Server responsibility

Server-side validation should:

- treat blocked pairings as invalid for standard product creation paths
- not trust the client to have filtered correctly
- return a clear reason code for blocked combinations

Recommended principle:

- UI improves experience
- server enforces policy

### 14.6 Blocked Combination UX / Error Handling

Blocked pairings should not rely only on hidden UI.

Recommended behavior:

- in normal flow, blocked pairings should be absent from the picker
- if an old client or crafted request submits a blocked pairing:
  - reject on the server
  - return a product-safe message
  - optionally suggest a validated fallback style for that template

Recommended fallback behavior:

- do **not** silently swap styles on the server
- instead:
  - fail clearly
  - let the client reselect or propose a replacement

Suggested fallback recommendation for current blocked case:

- if `fixed-first-zoo-8p × anime_storybook` is attempted, recommend:
  - `crayon`
  - `soft_watercolor`

### 14.7 Internal Override / Admin Preview

Recommended rule:

- blocked does not mean impossible everywhere
- blocked means not allowed in standard user-facing product flow

Suggested handling:

- admin or QA tools may expose blocked / internal pairings explicitly
- override must be intentional and visible in tool context
- override should not be inherited automatically by standard app flows

Recommended future flag shape:

```ts
type StyleExposureContext = "product" | "admin_preview" | "qa";
```

Behavior by context:

- `product`
  - enforce `userSelectable`
- `admin_preview`
  - can allow `internal` and `blocked` with explicit labeling
- `qa`
  - can allow all canonical pairings for experimentation

### 14.8 Suggested T5-3+ Slices

#### T5-3

Add `style-exposure` config module and exposure types.

#### T5-4

Wire template-aware filtering / ordering into the create flow UI.

#### T5-5

Add server-side blocked-pair validation for production create paths.

#### T5-6

Design and implement fallback recommendation UX for blocked attempts.

#### T5-7

Design admin / QA override behavior for blocked and internal pairings.

#### T5-8

Optional analytics instrumentation for:

- exposure impressions
- selection events
- blocked attempt events

### 14.9 Initial Implementation Decision

Recommended implementation order:

1. config and types
2. UI filtering and ordering
3. server validation
4. admin / QA override support
5. optional analytics

Reasoning:

- config first creates a single product policy source
- UI next gives immediate user-facing value
- server validation then closes the loophole
- admin override should wait until the product path is stable

### 14.10 Exclusions

- No code changes
- No UI changes
- No API changes
- No Firestore schema changes
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No runner changes
- No style profile changes
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 15. T5-3 Style Exposure Config Module Implementation

Date: 2026-05-17

Scope:

- product-facing config module only
- no UI integration in this slice
- no server-side validation wiring in this slice

### 15.1 Implemented Files

Added:

- `src/lib/style-exposure.ts`
- `src/__tests__/style-exposure.test.ts`

### 15.2 Implemented Types

Implemented in `src/lib/style-exposure.ts`:

- `StyleExposureStatus`
- `StyleExposureRationale`
- `StyleTemplateExposure`
- `ResolvedStyleExposure`

Design notes:

- exposure policy remains separate from `illustration-styles.ts`
- `templateId × styleId` is the resolution key
- resolved results preserve:
  - requested style id
  - normalized canonical style id
  - alias usage
  - template-known / style-known status

### 15.3 Implemented Config

Added:

- `CANONICAL_ILLUSTRATION_STYLES`
- `STYLE_TEMPLATE_EXPOSURE_MATRIX`

Initial encoded matrix:

- sleepy-moon × crayon: `promote`
- sleepy-moon × anime_storybook: `promote`
- sleepy-moon × soft_watercolor: `available`
- first-zoo × crayon: `promote`
- first-zoo × soft_watercolor: `available`
- first-zoo × anime_storybook: `blocked`

Default behavior for unlisted pairings:

- `status=internal`
- `rationale=not_validated`
- `userSelectable=false`

### 15.4 Implemented Helpers

Added helper functions:

- `normalizeStyleExposureStyleId(...)`
- `isCanonicalIllustrationStyle(...)`
- `getStyleTemplateExposure(...)`
- `getStyleExposureEntriesForTemplate(...)`
- `getUserSelectableStyleExposureEntries(...)`
- `isStyleSelectableForTemplate(...)`

Behavior covered:

- legacy alias normalization
  - `watercolor` -> `soft_watercolor`
  - `flat` -> `flat_illustration`
- unknown style id handling
- known but unvalidated pairing handling
- template-scoped sorted exposure lists

### 15.5 Test Coverage

Added unit coverage for:

- canonical list excludes aliases
- alias normalization
- promote pairing resolution
- blocked pairing resolution
- alias requests resolving through the matrix
- known but unlisted pairing fallback to `internal`
- unknown style id fallback behavior
- sorted per-template exposure ordering
- user-selectable filtering
- simple selectability helper behavior

Test result:

- `10` tests passed

### 15.6 Validation

Executed:

```powershell
npm run guard:hygiene
npm test -- src/__tests__/style-exposure.test.ts
npm run lint
```

Result:

- `guard:hygiene`: pass
- targeted style exposure test: pass
- `lint`: pass with pre-existing repo warnings only

Pre-existing lint warnings observed outside this slice:

- unused local in `src/app/(app)/admin/book-quality-review/page.tsx`
- `<img>` usage warnings in:
  - `src/app/(app)/children/page.tsx`
  - `src/app/(app)/create/select-child/page.tsx`

No new lint warning remains from `style-exposure.ts`.

### 15.7 Implementation Outcome

T5-3 verdict:

- config module is ready
- helper API is ready for UI integration
- helper API is ready for later server-side validation mirroring or reuse
- no behavior change has been applied to the live create flow yet

### 15.8 Next Step

Proceed to:

- T5-4 template-aware style filtering / ordering in the create flow UI

Deferred to later:

- T5-5 server-side blocked-pair validation
- T5-6 blocked-combination fallback UX
- T5-7 admin / QA override support

### 15.9 Exclusions

- No UI wiring performed
- No server-side validation wiring performed
- No Firestore schema changes
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No runner changes
- No style profile changes
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 16. T5-4 Create Flow UI Style Filtering

Date: 2026-05-17

Scope:

- connect the create flow UI to the T5-3 style exposure config
- keep payload persistence unchanged
- do not add server-side validation in this slice

### 16.1 Implemented Files

Updated:

- `src/app/(app)/create/style/page.tsx`
- `src/components/style-picker.tsx`
- `src/lib/style-exposure.ts`
- `src/__tests__/style-exposure.test.ts`
- `src/__tests__/style-picker.test.tsx`

### 16.2 Implementation Summary

Implemented UI wiring:

- `create/style/page.tsx`
  - now resolves template-aware style picker profiles through `getStylePickerProfilesForTemplate(template?.id)`
  - uses `useMemo` to derive the visible style list from the selected template
  - uses `useEffect` to recover from stale selections when the current selected style is no longer visible
- `style-picker.tsx`
  - now accepts an explicit `styles` prop
  - renders the received list in the given order
  - still supports the previous canonical fallback behavior when no list is passed

Implemented helper support:

- `src/lib/style-exposure.ts`
  - added `getCanonicalStylePickerProfiles()`
  - added `getStylePickerProfilesForTemplate(templateId)`
  - preserves canonical fallback behavior for templates not yet configured in the exposure matrix

### 16.3 Effective UI Behavior

For `fixed-first-zoo-8p`:

- visible styles:
  - `crayon`
  - `soft_watercolor`
- hidden from normal UI:
  - `anime_storybook`

For `fixed-sleepy-moon-adventure-8p`:

- visible styles in priority order:
  - `crayon`
  - `anime_storybook`
  - `soft_watercolor`

Ordering rule:

- uses exposure config `sortPriority`
- picker display now follows exposure policy rather than global style profile order

Safety behavior:

- if a previously selected style becomes unavailable for the current template, the page resets selection to the first visible style
- templates not yet configured in the exposure matrix still fall back to canonical styles so the create flow does not silently break outside the current validated scope

### 16.4 Payload Compatibility

Confirmed unchanged payload path:

- `style`
- `selectedStyleId`
- `selectedStyleName`
- `styleBible`
- `stylePreviewImageUrl`
- `stylePreviewUsedAsReference`

Interpretation:

- T5-4 changes only the UI-visible selection set and ordering
- it does not alter the saved style payload format

### 16.5 Test Coverage

Expanded `style-exposure` tests:

- zoo template returns picker profiles without blocked anime
- sleepy-moon template returns picker profiles in exposure priority order
- unconfigured template falls back to canonical picker profiles

Added `style-picker` component tests:

- zoo picker renders only `crayon` and `soft_watercolor`
- sleepy-moon picker preserves `crayon -> anime_storybook -> soft_watercolor` order

Test totals after update:

- `style-exposure.test.ts`: `13` tests passed
- `style-picker.test.tsx`: `2` tests passed

### 16.6 Validation

Executed:

```powershell
npm run guard:hygiene
npm run lint
npm test -- src/__tests__/style-exposure.test.ts src/__tests__/style-picker.test.tsx
npm run build
```

Result:

- `guard:hygiene`: pass
- targeted tests: pass (`15` tests total)
- `build`: pass
- `lint`: warning-only, with pre-existing repo warnings only

Pre-existing lint warnings still present outside this slice:

- unused local in `src/app/(app)/admin/book-quality-review/page.tsx`
- `<img>` usage warnings in:
  - `src/app/(app)/children/page.tsx`
  - `src/app/(app)/create/select-child/page.tsx`

### 16.7 Outcome

T5-4 verdict:

- create flow UI now respects the product exposure matrix
- blocked pairing `fixed-first-zoo-8p × anime_storybook` is no longer visible in the normal picker
- validated pairings are ordered by product exposure priority
- unconfigured templates remain non-breaking through canonical fallback

### 16.8 Next Step

Proceed to:

- T5-5 server-side blocked-pair validation

Deferred:

- admin / QA override behavior
- fallback recommendation UX for blocked attempts
- optional gating analytics

### 16.9 Exclusions

- No server-side validation wiring performed
- No Firestore schema changes
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No runner changes
- No style profile changes
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 17. T5-5 Server-Side Blocked-Pair Validation Planning

Date: 2026-05-17

Scope:

- docs-only planning for server-side enforcement
- no code changes in this slice
- objective: identify the real backend entrypoint and define a safe validation strategy for blocked pairings

### 17.1 Current Request / Generation Path

Observed current path:

1. `src/app/(app)/create/style/page.tsx`
   - client writes a new `books` document directly with `addDoc(collection(db, "books"), bookPayload)`
2. book payload already includes:
   - `theme`
   - `templateId`
   - `creationMode`
   - `style`
   - `selectedStyleId`
   - `selectedStyleName`
   - `styleBible`
   - `stylePreviewImageUrl`
   - `stylePreviewUsedAsReference`
3. `functions/src/generate-book.ts`
   - `generateBook = onDocumentCreated({ document: "books/{bookId}" }, ...)`
4. the Firestore trigger calls `processBookGeneration(bookId, bookData, deps)`
5. `processBookGeneration(...)`
   - sanitizes input
   - fetches template through `deps.getTemplate(bookData.theme)`
   - normalizes book settings
   - proceeds into fixed-template or LLM story generation

Implication:

- the true server-side generation gate is the Firestore trigger, not a callable API
- UI hiding in T5-4 is helpful but not sufficient because a crafted client can still write a blocked pairing directly

### 17.2 Where Style Fields Are Saved And Used

Confirmed persistence path:

- client stores `style` as the operative style field
- client also stores `selectedStyleId` and `selectedStyleName` as descriptive metadata
- `styleBible` and `stylePreviewImageUrl` are stored on the book payload

Confirmed generation-side usage:

- `generate-book.ts` uses `bookData.style` as the actual style input for prompt construction
- style profile lookup is based on `normalizedBookData.style`
- `selectedStyleId` is useful for auditing but is not the authoritative field for generation behavior

Design consequence:

- server-side blocked-pair validation must validate against the canonical operative pair:
  - `templateId` or resolved template key
  - `bookData.style`

### 17.3 Recommended Enforcement Point

Primary recommendation:

- enforce blocked-pair validation inside `processBookGeneration(...)`

Recommended insertion point:

- after template fetch succeeds
- before quota checks, story generation, or image generation begin

Suggested logical order:

1. validate raw input safety
2. fetch template
3. resolve canonical style-template exposure
4. fail early if pairing is blocked for product flow
5. continue with normalization and generation only if allowed

Why this point is best:

- template identity is now known and trustworthy
- no expensive generation work has started yet
- failure can be expressed as ordinary book-level validation failure metadata

### 17.4 Config Sharing Strategy

T5-3 currently lives in:

- `src/lib/style-exposure.ts`

Functions cannot safely import that browser-side file directly as the long-term contract.

Recommended T5-6 strategy:

- add a server mirror:
  - `functions/src/lib/style-exposure.ts`

Mirror contents should include:

- `StyleExposureStatus`
- `StyleExposureRationale`
- `StyleTemplateExposure`
- `ResolvedStyleExposure`
- initial exposure matrix
- the minimum resolver helpers needed for backend enforcement

Important constraint:

- keep style identity metadata in `illustration-styles.ts`
- keep product gating in `style-exposure.ts`
- do not merge these concepts during server rollout

Future option:

- if duplication becomes painful, later extract a shared package/module
- not required for T5-6

### 17.5 Validation Policy Design

Recommended server interpretation by resolved exposure:

#### `promote`

- allow generation

#### `available`

- allow generation

#### `internal`

- default production behavior: reject
- reason:
  - unvalidated pairing should not silently pass through the production backend

#### `blocked`

- reject

Recommended first-pass policy:

- only `promote` and `available` are allowed through the standard product generation path
- `internal` and `blocked` should both fail in product mode

Reasoning:

- this matches T5-1 / T5-2 fail-closed policy
- it prevents accidental exposure of unvalidated pairings

### 17.6 Template Identity Resolution

Current nuance:

- generation fetches the template using `bookData.theme`
- book payload also carries `templateId`

Recommended validation source of truth:

- prefer `bookData.templateId ?? bookData.theme`

Reason:

- T5 exposure policy is explicitly keyed by template id
- using `templateId` first aligns with product semantics while preserving backward compatibility

Suggested validation guard:

- if the resolved template id is missing, treat the pairing as non-validated and fail conservatively in product mode

### 17.7 Failure Behavior Design

Recommended failure shape:

- use existing book failure path
- mark book as `failed`
- record validation metadata through `updateBookFailureMetadata(...)`

Suggested metadata direction:

- `failureStage: "validation"`
- `failureProvider: "system"`
- `failureReason: "unknown"` for now, unless enum expansion is approved later
- `retryable: false`
- `technicalErrorMessage` should include a stable blocked-pair reason string

Suggested user-facing message shape:

- safe, short, non-technical
- example intent:
  - "この絵のタッチは、今はこのテンプレートでは選べません。別のタッチを選んでください。"

Suggested technical message shape:

- include template id and style id for auditability
- example intent:
  - `style_exposure_blocked: template=fixed-first-zoo-8p style=anime_storybook`

### 17.8 Fallback Recommendation Design

Do not auto-rewrite blocked pairings on the server.

Recommended behavior:

- fail clearly
- let the client recover

Suggested future client-facing recovery payload concept:

- blocked reason code
- recommended replacement styles for the same template

Current recommended replacements:

- for `fixed-first-zoo-8p × anime_storybook`
  - `crayon`
  - `soft_watercolor`

T5-6 note:

- server implementation can start with fail-only behavior
- client-facing fallback recommendation UX can remain a later slice if needed

### 17.9 Internal Override / Admin Preview Planning

T5-5 recommendation:

- do not mix admin override into the first server validation slice

Initial production path:

- standard create flow must enforce blocking strictly

Later override path candidate:

- admin or QA context can pass through a separate trusted route or explicit override flag
- that override must not be inferable from normal client payload alone

Reason:

- avoids accidental privilege escalation
- keeps T5-6 small and safe

### 17.10 Proposed T5-6 Slice

Recommended T5-6 implementation scope:

1. add a functions-side `style-exposure` mirror module
2. resolve `templateId ?? theme` plus canonical `style`
3. insert blocked/unvalidated pairing validation into `processBookGeneration(...)`
4. fail books early with clear validation metadata
5. add targeted tests for:
   - allowed pairing passes
   - blocked pairing fails
   - unlisted pairing fails closed
   - alias style normalizes before validation if needed

Validation targets for T5-6:

- `npm run guard:hygiene`
- functions build
- targeted functions tests covering the new validation branch

### 17.11 Planning Decision

T5-5 planning verdict:

- server-side blocked-pair validation should be added at the Firestore-trigger generation entrypoint
- first implementation should enforce fail-closed behavior for `internal` and `blocked`
- admin override should be deferred
- client fallback recommendation UX should be deferred unless T5-6 needs it for usability

### 17.12 Exclusions

- No code or functions changes performed
- No API changes performed
- No Firestore schema changes performed
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No runner changes
- No style profile changes
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 18. T5-6 Server-Side Exposure Validation Implementation

### 18.1 Scope

Implemented server-side style exposure validation inside the functions generation path.

Primary changes:

- added `functions/src/lib/style-exposure.ts`
- added early exposure validation in `functions/src/generate-book.ts`
- added targeted tests in `functions/test/generate-book.test.ts`

This slice intentionally does **not** add:

- UI changes
- Firestore schema changes
- admin override behavior
- client fallback recommendation UX

### 18.2 Validation Insertion Point

The validation is now performed in `processBookGeneration(...)`:

- after template fetch succeeds
- before quota-sensitive generation work
- before story generation
- before image generation

This matches the T5-5 planning decision that the Firestore-trigger path is the real server-side enforcement point.

### 18.3 Functions Mirror Config

Added a functions-side exposure mirror with:

- canonical style validation
- legacy style alias normalization
  - `watercolor -> soft_watercolor`
  - `flat -> flat_illustration`
- legacy template alias normalization
  - `fixed-first-zoo -> fixed-first-zoo-8p`
  - `fixed-sleepy-moon-adventure -> fixed-sleepy-moon-adventure-8p`
- minimal exposure matrix for currently product-tracked validated pairings

### 18.4 Enforcement Behavior

Operative pair resolution:

- template side: `bookData.templateId ?? bookData.theme`
- style side: `bookData.style`

Allow policy:

- `promote`
- `available`

Fail-closed policy:

- `internal`
- `blocked`
- unknown style ids
- unlisted pairings

Current rollout narrowing:

- enforcement is applied only when `creationMode === "fixed_template"`

Reason:

- this blocks known invalid fixed-template pairings immediately
- it avoids unintentionally changing existing non-fixed generation behavior in the same slice
- it keeps T5-6 small, auditable, and production-safe

### 18.5 Failure Recording

Blocked or unvalidated server-side pairings now:

- call `updateBookFailure(...)` with a short user-facing message
- call `updateBookFailureMetadata(...)` with:
  - `failureStage: "validation"`
  - `failureProvider: "system"`
  - `retryable: false`
  - `technicalErrorMessage` beginning with `style_exposure_blocked:`
- mark the book status as `failed`
- exit before story or image generation starts

### 18.6 Test Coverage

Added targeted coverage for:

- blocked fixed-template pairing fails before generation work
- unvalidated fixed-template pairing fails before generation work

Also confirmed legacy fixed-template tests still pass after:

- style alias normalization
- legacy template alias normalization

### 18.7 Validation Results

Executed:

- `npm run guard:hygiene`
- `npm --prefix functions run build`
- `npm --prefix functions test -- test/generate-book.test.ts`

Result:

- hygiene: pass
- functions build: pass
- targeted functions tests: pass (`48 passed`)

### 18.8 Outcome

T5-6 implementation verdict:

- server-side exposure validation is now active for fixed-template generation
- known blocked pairing `fixed-first-zoo-8p × anime_storybook` is no longer bypassable through direct Firestore writes
- unvalidated fixed-template pairings now fail closed on the backend

### 18.9 Follow-Up

Recommended next slice:

- T5-7 server-side validation closure / integration review

Possible later expansion:

- extend the same policy to broader non-fixed product paths after a dedicated audit
- add server/client recovery guidance if blocked-pair UX needs improvement
