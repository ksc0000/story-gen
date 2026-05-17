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

## 19. T5-7 Server-Side Exposure Validation QA

### 19.1 Scope

Performed QA for the T5-6 server-side exposure guard with a focus on:

- blocked pair rejection before story/image generation
- allowed pair pass-through into the existing generation path
- auditability of failure metadata
- effective protection against UI bypass / direct `books` writes at the functions entrypoint

This slice was executed as QA-only:

- no code changes
- no schema changes
- no real image-generation smoke run

### 19.2 QA Strategy

Used the functions generation entrypoint as the primary validation surface:

- `processBookGeneration(...)` is the same branch reached by the Firestore trigger after a `books` write
- therefore, targeted functions tests provide a low-cost equivalent for direct-write bypass QA

Reason for avoiding a production Firestore blocked-pair smoke:

- the branch under test is deterministic and fully covered before generation work starts
- a live blocked write would add operational noise without increasing confidence materially
- the user explicitly asked to minimize cost and side effects

### 19.3 Blocked Pair QA

Targeted blocked pair:

- `fixed-first-zoo-8p × anime_storybook`

Validated behavior:

- status becomes `failed`
- failure happens before story generation
- failure happens before image generation
- `updateBookFailureMetadata(...)` records an auditable technical reason string

Targeted command:

- `npm --prefix functions test -- test/generate-book.test.ts -t "fails closed for blocked fixed-template style pairings before generation starts"`

Observed result:

- pass
- stderr includes:
  - `style_exposure_blocked: template=fixed-first-zoo-8p style=anime_storybook status=blocked rationale=deferred_stabilization`

QA conclusion for blocked path:

- pass
- server-side guard is effective even if the client UI is bypassed and a blocked pairing reaches the trigger path

### 19.4 Allowed Pair QA

Allowed coverage confirmed through existing fixed-template generation tests and the full `generate-book` suite.

Representative allowed-path evidence:

- `fixed-first-zoo` legacy id normalizes and still completes fixed-template generation
- fixed-template generation still reaches page writes and `completed` status when the pairing is allowed
- quality-tier normalization and regular fixed-template generation behavior remain intact

Targeted command:

- `npm --prefix functions test -- test/generate-book.test.ts -t "skips LLM story generation for fixed templates|uses premium model metadata when imageQualityTier is premium|normalizes free fixed-template books back to light quality even if premium was sent"`

Observed result:

- pass (`3 passed`)
- fixed-template stdout confirms generation continued:
  - `Book book-fixed generation completed: 2/2 pages succeeded`
  - `Book book-free generation completed: 2/2 pages succeeded`

QA conclusion for allowed path:

- pass
- the guard does not block known-allowed fixed-template execution paths

### 19.5 Full Regression Check

Executed:

- `npm run guard:hygiene`
- `npm --prefix functions test -- test/generate-book.test.ts`

Observed result:

- hygiene: pass
- full targeted functions suite: pass (`48 passed`)

QA implication:

- no regression detected in the surrounding fixed-template or generation logic from the T5-6 guard

### 19.6 Direct Firestore Write Equivalence Assessment

Direct production Firestore write QA was not executed in this slice.

Assessment:

- acceptable

Reasoning:

- the create flow writes to `books`
- the backend guard runs in the trigger-driven `processBookGeneration(...)` path
- the targeted tests exercise that exact guard branch with crafted book payloads
- the QA objective here was policy enforcement, not model/image behavior

### 19.7 QA Verdict

T5-7 verdict:

- pass

Confirmed:

- blocked pairing is rejected before generation work
- allowed pairing proceeds through the existing path
- failure metadata is audit-friendly
- server-side guard meaningfully complements T5-4 UI hiding

### 19.8 Follow-Up

Recommended next slice:

- T5-8 server-side exposure validation closure / rollout guidance

Optional later QA:

- one low-cost live blocked-pair write in a controlled QA environment if product ops wants end-to-end trigger evidence beyond unit-level branch verification

## 20. T5-8 Style Exposure Gating Closure / Rollout Guidance

### 20.1 Closure Scope

This slice closes the initial T5 style exposure gating track.

T5 covered:

- product exposure policy design
- exposure config design
- frontend exposure config module
- create-flow UI filtering
- server-side exposure guard planning
- server-side exposure guard implementation
- server-side QA

Closure intent:

- confirm the current gating stack is product-usable
- document the current matrix as operational guidance
- separate rollout-ready pairings from deferred pairings

### 20.2 Implementation Status Summary

UI gating status:

- implemented
- normal create flow now filters style options by `templateId`
- stale selected styles fall back to the first visible allowed style

Current user-visible examples:

- `fixed-first-zoo-8p`
  - `crayon`
  - `soft_watercolor`
- `fixed-sleepy-moon-adventure-8p`
  - `crayon`
  - `anime_storybook`
  - `soft_watercolor`

Server-side gating status:

- implemented for `creationMode === "fixed_template"`
- runs inside `functions/src/generate-book.ts`
- validates the operative pair:
  - `bookData.templateId ?? bookData.theme`
  - `bookData.style`
- allows:
  - `promote`
  - `available`
- blocks:
  - `internal`
  - `blocked`
  - unknown styles
  - unlisted pairings

Combined product effect:

- blocked pairings are hidden in normal UI
- blocked or unvalidated fixed-template pairings are also rejected server-side if UI is bypassed

### 20.3 Current Product Exposure Matrix

Current operational matrix:

- `fixed-sleepy-moon-adventure-8p × crayon`
  - status: `promote`
  - rollout guidance: safe for active exposure
- `fixed-sleepy-moon-adventure-8p × anime_storybook`
  - status: `promote`
  - rollout guidance: safe for active exposure
- `fixed-sleepy-moon-adventure-8p × soft_watercolor`
  - status: `available`
  - rollout guidance: safe baseline option, not primary hero pairing
- `fixed-first-zoo-8p × crayon`
  - status: `promote`
  - rollout guidance: safe for active exposure
- `fixed-first-zoo-8p × soft_watercolor`
  - status: `available`
  - rollout guidance: acceptable with standard watch level
- `fixed-first-zoo-8p × anime_storybook`
  - status: `blocked`
  - rollout guidance: do not expose in product flow

Default matrix behavior for unlisted pairings:

- treat as `internal`
- do not expose in normal product UI
- reject in fixed-template backend path

### 20.4 Rollout Guidance

Recommended exposure tiers:

- `promote`
  - can be used in user-facing recommended lists
  - can be featured in product messaging or merchandising experiments
- `available`
  - can be user-selectable
  - should not outrank stronger validated pairings by default
- `internal`
  - reserve for future validation or internal QA only
  - not user-selectable
- `blocked`
  - do not expose
  - reject on guarded backend path

Recommended initial product posture:

- lead with `crayon` as the broadest portable style
- surface `anime_storybook` only on validated template pairings such as sleepy-moon
- retain `soft_watercolor` as a dependable baseline, especially where a safer default is preferred

### 20.5 Blocked Pair Operating Policy

Blocked pairing in current scope:

- `fixed-first-zoo-8p × anime_storybook`

Operating policy:

- hidden from standard UI
- rejected by fixed-template server guard
- no automatic fallback rewriting on the server
- no admin override in the standard product path

Reason for continued block:

- repeated T4 remediation did not converge reliably
- issue surfaces migrated across signage, clothing text, watermark-like text, and continuity
- product reliability remains below acceptable threshold for normal exposure

### 20.6 Deferred / Remaining Items

Deferred items:

- admin or QA override path
- client-facing fallback recommendation UX after a blocked selection
- non-fixed-template server-side exposure enforcement expansion
- shared-package extraction between frontend and functions exposure config
- live end-to-end blocked write QA in a dedicated controlled environment

Known current narrowing:

- server-side enforcement currently applies only to fixed-template generation

Assessment:

- acceptable for this rollout stage
- should be revisited before extending style exposure policy to broader non-fixed creation paths

### 20.7 Product Readiness Decision

T5 initial gating track decision:

- `Closed`

Readiness summary:

- UI filtering: ready
- fixed-template backend enforcement: ready
- blocked pairing handling: ready for current validated scope
- exposure matrix: ready for product operations use

Overall rollout judgment:

- `Go` for the currently validated and configured fixed-template pairings
- `Do Not Expose` for blocked or unvalidated pairings

### 20.8 Suggested Next Steps

Recommended immediate follow-up candidates:

1. T5-9 product rollout checklist / operator playbook for style exposure updates.
2. Add server-side exposure enforcement to non-fixed product paths only after a dedicated audit.
3. Add admin/internal override flow as a separate privileged path if product QA needs manual pairing trials.
4. Consider shared config extraction if frontend/functions drift risk becomes material.

### 20.9 Closure Verdict

T5 verdict:

- `Closed`

What is now true:

- template-aware style exposure is enforced in the create UI
- blocked fixed-template pairings are no longer protected only by the client
- the validated style-template matrix is documented well enough for controlled product rollout

### 20.10 Exclusions

- No code changes performed
- No UI changes performed
- No functions changes performed
- No Firestore schema or rules changes performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No runner changes
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded

## 21. T5-9 Product Rollout Checklist / Operator Playbook For Style Exposure Updates

### 21.1 Purpose

This section defines the standard operator workflow for updating the style exposure matrix safely.

Use this playbook whenever a team wants to:

- add a new `templateId × styleId` pairing
- promote or demote an existing pairing
- emergency-block a pairing already exposed in product
- reopen a previously blocked pairing after validation

### 21.2 Current Gating Stack

Before any exposure update, confirm the current stack is still the source of truth:

- T4 validation evidence in `docs/STYLE_VARIANT_VALIDATION_PLAN.md`
- frontend exposure config in `src/lib/style-exposure.ts`
- create-flow UI filtering in `src/app/(app)/create/style/page.tsx`
- functions mirror config in `functions/src/lib/style-exposure.ts`
- server-side guard in `functions/src/generate-book.ts`
- server-side QA evidence in `docs/STYLE_EXPOSURE_GATING_PLAN.md`

Operator rule:

- never update only one layer
- exposure policy is not considered changed until docs, frontend config, and functions mirror all agree

### 21.3 Standard Change Types

Supported change types:

- add new pairing
- promote `available -> promote`
- soften `blocked -> internal`
- reopen `blocked/internal -> available`
- emergency block `promote/available -> blocked`
- remove pairing from active exposure

Recommended framing:

- treat every change as a `pairing-level policy update`
- do not reason about style exposure as a style-wide toggle unless every relevant template has been validated

### 21.4 Required Validation Evidence

Minimum evidence before allowing a new public-facing pairing:

- documented validation run in `docs/STYLE_VARIANT_VALIDATION_PLAN.md`
- structural smoke completion
- manual visual QA for BF-4
- manual visual QA for BF-3
- style adherence assessment
- emotional fit / story-image fit assessment
- explicit decision outcome (`Go`, `Conditional-Go`, `Conditional`, or `Hold`)

Promotion requirements by target status:

#### `promote`

- pairing must have stable `Go` evidence
- no unresolved blocker-level BF-4/BF-3 issues
- suitable for recommended or highlighted product exposure

#### `available`

- pairing may have `Conditional-Go` evidence
- no blocker-level issues
- minor watch items may remain if documented and commercially acceptable

#### `internal`

- pairing may have incomplete validation
- may be retained for future testing
- must not be user-selectable in normal product flow

#### `blocked`

- pairing has known unacceptable risk or instability
- should be hidden from UI and rejected by guarded backend paths

### 21.5 Standard Update Procedure

When updating the matrix, follow this order:

1. confirm evidence and target status decision
2. update the product decision record in docs
3. update `src/lib/style-exposure.ts`
4. update `functions/src/lib/style-exposure.ts`
5. update or add tests for frontend exposure helpers
6. update or add tests for functions-side guard behavior if status changes affect backend behavior
7. run hygiene, lint/build, and targeted tests
8. verify UI-visible styles for affected templates
9. verify server behavior for blocked or reopened pairings
10. record rollout result and merge only after all layers agree

### 21.6 Frontend / Functions Sync Checklist

Every matrix update must check all of the following:

- canonical `templateId` matches across docs and both config modules
- canonical `styleId` matches across docs and both config modules
- `status` matches across frontend and functions mirrors
- `rationale` matches or is intentionally equivalent
- `userSelectable` matches intended UI exposure
- `sortPriority` reflects intended picker order
- alias behavior remains unchanged unless intentionally updated

Do not ship if:

- frontend shows a pairing the functions mirror would reject
- functions allow a pairing that docs still classify as blocked
- docs claim a pairing is promoted but sort/order still hides it behind lower-priority options

### 21.7 UI / Server / Test / Docs Checklist

For each exposure change, verify:

#### UI

- affected template shows only intended visible styles
- blocked pairings are hidden
- ordering follows `sortPriority`
- stale selection fallback still behaves safely

#### Server

- allowed pairing passes guarded path
- blocked/internal/unlisted pairing fails guarded path where applicable
- failure metadata remains audit-friendly

#### Tests

- frontend helper tests updated if visible matrix changed
- picker tests updated if ordering/visibility changed
- functions tests updated if server allow/block behavior changed

#### Docs

- validation evidence source linked or referenced
- matrix table updated
- rollout tier updated
- watch notes or deferred reasons updated if relevant

### 21.8 Promotion / Demotion Rules

Promotion rule:

- move a pairing upward only after documented fresh evidence supports the new tier

Demotion rule:

- demote immediately if any of the following appear in validated reruns:
  - blocker-level BF-4 regression
  - blocker-level BF-3 regression
  - repeated fallback behavior with visible quality instability
  - commercial suitability failure

Suggested downgrade path:

- `promote -> available`
  - if issues are minor and manageable
- `available -> internal`
  - if evidence becomes stale or incomplete
- `promote/available -> blocked`
  - if production safety or commercial suitability is no longer acceptable

### 21.9 Emergency Block Procedure

Use emergency block when a currently exposed pairing shows a blocker after rollout.

Emergency steps:

1. set pairing status to `blocked` in `src/lib/style-exposure.ts`
2. mirror the same change in `functions/src/lib/style-exposure.ts`
3. keep or add a clear blocked rationale
4. run the smallest targeted UI and functions verification set
5. push immediately once checks pass
6. update docs with incident note and temporary operating status

Emergency success criteria:

- pairing disappears from normal UI
- server guard rejects direct fixed-template writes for that pairing

### 21.10 Rollback Guidance

Rollback trigger examples:

- accidental exposure of blocked pairing
- mismatched frontend/functions matrix state
- new regression discovered after merge

Rollback options:

- config rollback
  - revert the last matrix change commit
- emergency block
  - keep code shape but change the pairing to `blocked`
- temporary internalization
  - move public pairing to `internal` while reruns are evaluated

Preferred rollback choice:

- if safety is uncertain, prefer `blocked` over `internal`

### 21.11 Release Verification Checklist

Before considering a style exposure update released, confirm:

- docs decision has been updated
- frontend exposure config is updated
- functions mirror config is updated
- UI filtering behavior is correct for affected templates
- server guard behavior is correct for affected templates
- targeted tests pass
- hygiene passes
- any required build/lint step passes
- rollout owner knows whether the pairing is `promote`, `available`, `internal`, or `blocked`

### 21.12 Operator Notes

Recommended operator defaults:

- default unknown or new pairing to `internal`
- require explicit evidence before making a pairing user-selectable
- prefer narrow pair-level changes over broad style-wide assumptions
- preserve blocked rationales so future reopen work has context

### 21.13 Suggested Next Steps

Recommended follow-up candidates after this playbook:

1. T5-10 optional non-fixed-path exposure enforcement audit.
2. T5-11 admin/internal override path planning.
3. Shared config extraction planning if frontend/functions duplication becomes expensive.

### 21.14 Exclusions

- No code changes performed
- No UI changes performed
- No functions changes performed
- No Firestore schema or rules changes performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No runner changes
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded

## 22. T5-10 Product QA Plan For Style-Gated Create Flow End-To-End

### 22.1 Goal

Define a low-risk, product-facing end-to-end QA plan for the style-gated create flow.

This QA plan is meant to validate:

- user-visible style filtering in the create flow
- safe fallback when a previously selected style becomes invalid for the selected template
- server-side fail-close behavior when blocked pairs bypass the UI
- normal generation path continuity for allowed pairs

This slice is planning-only:

- no Firestore write
- no smoke execution
- no image generation

### 22.2 QA Scope

The E2E QA surface includes:

- template selection state in the create flow
- style picker visible options and ordering
- stale selected style fallback in the style page
- persisted create payload assumptions
- backend trigger-side guard for fixed-template pairings

Out of scope for this slice:

- visual QA of generated images
- broader non-fixed creation paths
- admin-only or override workflows

### 22.3 Primary QA Questions

The execution slice should answer these questions:

1. Does each validated template show only its approved styles in the normal create UI?
2. Does the picker order match the exposure config `sortPriority`?
3. If a user reaches the style page with a stale/blocked style selected, does the UI recover safely?
4. If a blocked pairing is written directly to `books`, does the backend reject it before story/image generation?
5. If an allowed pairing is submitted, does the flow continue through the expected generation path?

### 22.4 UI Filtering QA Coverage

For UI filtering, verify:

- `fixed-first-zoo-8p`
  - visible:
    - `crayon`
    - `soft_watercolor`
  - hidden:
    - `anime_storybook`
- `fixed-sleepy-moon-adventure-8p`
  - visible:
    - `crayon`
    - `anime_storybook`
    - `soft_watercolor`

Also verify:

- visible ordering follows exposure `sortPriority`
- no unexpected canonical fallback list appears for these validated templates
- no blocked style leaks into the standard style picker

### 22.5 Stale Selected Style Fallback QA Coverage

Key stale-selection scenario:

- template changes from sleepy-moon to first-zoo while `anime_storybook` is selected

Expected behavior:

- stale style is no longer shown as an available option
- selected style falls back automatically to the first visible allowed style
- fallback is deterministic and consistent with picker order
- downstream payload still stores a valid visible style

Additional fallback checks:

- fallback does not crash or leave the UI in an empty state
- fallback does not preserve hidden style metadata silently
- returning to a template where the style is valid again behaves predictably

### 22.6 Server-Side Fail-Close QA Coverage

Blocked server-path scenario:

- direct write equivalent for:
  - `fixed-first-zoo-8p × anime_storybook`

Expected behavior:

- trigger reaches `processBookGeneration(...)`
- exposure validation runs before story generation
- exposure validation runs before image generation
- book status becomes `failed`
- failure metadata includes stable technical reason beginning with:
  - `style_exposure_blocked:`

Server-side acceptance point:

- UI bypass must not be able to force generation for the blocked fixed-template pairing

### 22.7 Allowed Pair QA Coverage

Allowed-pair QA should be kept minimal.

Recommended allowed live candidate:

- `fixed-first-zoo-8p × crayon`

Reason:

- already strong validated pairing
- simplest contrast against the blocked zoo anime pairing
- lower ambiguity in expected outcome

Alternative allowed candidate:

- `fixed-sleepy-moon-adventure-8p × anime_storybook`

Allowed-path expectations:

- create flow keeps the selected style visible
- payload remains valid
- generation proceeds past exposure validation
- no exposure-related failure metadata is written

### 22.8 Cost-Minimized Execution Design

Recommended execution order for the actual QA slice:

1. local/UI-only verification first
2. local/functions test verification second
3. live blocked write last, and only if extra end-to-end trigger evidence is still needed
4. allowed live generation only if local evidence is insufficient

Cost-minimizing defaults:

- use one blocked pairing maximum for live backend QA
- use one allowed pairing maximum if live generation is required
- prefer existing local tests and deterministic trigger-path verification over production writes

Preferred evidence stack:

- UI observation or local browser validation for picker behavior
- existing frontend tests for exposure helpers/picker behavior
- existing functions tests for guard behavior
- optional one live blocked write
- optional one live allowed write

### 22.9 Proposed Execution Matrix

Planned matrix for the execution slice:

#### UI-only verification matrix

- `fixed-first-zoo-8p × crayon`
  - should be visible
- `fixed-first-zoo-8p × soft_watercolor`
  - should be visible
- `fixed-first-zoo-8p × anime_storybook`
  - should be hidden
- `fixed-sleepy-moon-adventure-8p × crayon`
  - should be visible
- `fixed-sleepy-moon-adventure-8p × anime_storybook`
  - should be visible
- `fixed-sleepy-moon-adventure-8p × soft_watercolor`
  - should be visible

#### Stale-selection scenario

- start with `fixed-sleepy-moon-adventure-8p × anime_storybook`
- switch template to `fixed-first-zoo-8p`
- verify fallback to first visible allowed style

#### Optional live blocked backend scenario

- `fixed-first-zoo-8p × anime_storybook`
  - expected:
    - immediate guarded failure
    - no story/image generation

#### Optional live allowed backend scenario

- `fixed-first-zoo-8p × crayon`
  - expected:
    - generation path continues normally

### 22.10 Acceptance Criteria

The execution slice should be considered passing only if all of the following hold:

#### UI acceptance

- validated templates show exactly the intended user-facing styles
- blocked style is not visible for `fixed-first-zoo-8p`
- visible order matches exposure priority

#### Fallback acceptance

- stale blocked selection auto-recovers to a valid visible style
- no invalid hidden selection remains active after template switch

#### Server acceptance

- blocked direct-write equivalent is rejected before generation work
- allowed pair is not rejected by exposure validation
- failure metadata for blocked path is stable and audit-friendly

#### Operational acceptance

- observed behavior matches docs and config on both frontend and functions sides
- no mismatch is found between UI-visible policy and backend enforcement

### 22.11 Execution Notes

Recommended tooling for the future execution slice:

- in-app browser or local browser for style page UI checks
- existing unit/integration tests for helper-level confirmation
- only minimal live backend writes if truly needed

Recommended evidence capture:

- short QA table with:
  - templateId
  - styleId
  - UI visible/hidden result
  - fallback result
  - server result
  - final QA decision

### 22.12 Suggested Next Step

Recommended next slice:

- T5-11 execute product QA for style-gated create flow end-to-end

### 22.13 Exclusions

- No code changes performed
- No UI changes performed
- No functions changes performed
- No Firestore schema or rules changes performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No runner changes
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded

## 23. T5-11 Product QA Execution For Style-Gated Create Flow End-To-End

### 23.1 Scope

Executed the low-cost QA plan defined in T5-10.

This QA execution focused on:

- user-visible style filtering
- stale selected style fallback behavior
- blocked pair server fail-close
- allowed pair pass-through behavior

This slice remained low-cost by design:

- no live Firestore write
- no image generation
- no smoke generation

### 23.2 Executed Checks

Executed:

- `npm run guard:hygiene`
- `npm test -- src/__tests__/style-exposure.test.ts src/__tests__/style-picker.test.tsx`
- `npm --prefix functions test -- test/generate-book.test.ts`
- `npm --prefix functions test -- test/generate-book.test.ts -t "fails closed for blocked fixed-template style pairings before generation starts"`
- `npm --prefix functions test -- test/generate-book.test.ts -t "skips LLM story generation for fixed templates|uses premium model metadata when imageQualityTier is premium|normalizes free fixed-template books back to light quality even if premium was sent"`

Observed results:

- hygiene: pass
- frontend style exposure and picker tests: pass (`15 passed`)
- full targeted functions suite: pass (`48 passed`)
- blocked-path targeted test: pass
- allowed-path representative targeted tests: pass (`3 passed`)

### 23.3 UI Filtering Result

Evidence used:

- `src/__tests__/style-exposure.test.ts`
- `src/__tests__/style-picker.test.tsx`

Confirmed:

- `fixed-first-zoo-8p`
  - visible:
    - `crayon`
    - `soft_watercolor`
  - hidden:
    - `anime_storybook`
- `fixed-sleepy-moon-adventure-8p`
  - visible in priority order:
    - `crayon`
    - `anime_storybook`
    - `soft_watercolor`

UI filtering verdict:

- pass

### 23.4 Stale Selected Style Fallback Result

Evidence used:

- create-flow implementation inspection in `src/app/(app)/create/style/page.tsx`
- exposure helper tests proving the visible list is template-dependent and ordered

Relevant implementation behavior:

- page derives `visibleStyleProfiles` from `getStylePickerProfilesForTemplate(template?.id)`
- `useEffect(...)` resets `selected` to the first visible style when:
  - current selection is missing
  - current selection is no longer visible for the chosen template

QA judgment:

- pass with low-cost evidence

Reason:

- the fallback path is deterministic
- it is directly keyed off the tested visible style list
- no contradictory behavior was found in the page logic

Note:

- no live browser interaction was required in this slice because the fallback logic is small, deterministic, and already sits on top of tested exposure helpers

### 23.5 Blocked Pair Server Result

Blocked target:

- `fixed-first-zoo-8p × anime_storybook`

Confirmed via targeted functions QA:

- book is rejected before story generation
- book is rejected before image generation
- status becomes `failed`
- failure metadata contains the stable audit marker beginning with:
  - `style_exposure_blocked:`

Blocked-path verdict:

- pass

### 23.6 Allowed Pair Result

Allowed-path evidence was taken from representative fixed-template and generation-path tests.

Confirmed:

- allowed fixed-template paths still complete normally
- fixed-template generation is not accidentally blocked by the exposure guard
- representative allowed-path tests completed successfully

Allowed-path verdict:

- pass

### 23.7 Live Write / Live Generation Decision

Decision:

- not executed

Rationale:

- the requested QA emphasized low cost
- server-side policy enforcement was already verified at the exact guarded `processBookGeneration(...)` branch
- live blocked writes would add operational side effects without materially increasing confidence for this slice
- live allowed generation would add image-generation cost while duplicating already confirmed pass-through behavior

Assessment:

- acceptable

### 23.8 Acceptance Criteria Result

Acceptance criteria outcome:

- UI filtering correctness: pass
- blocked style hidden for zoo: pass
- exposure priority ordering: pass
- stale selection recovery: pass
- blocked server fail-close: pass
- allowed pair server pass-through: pass
- frontend/functions policy alignment: pass

### 23.9 QA Verdict

T5-11 verdict:

- pass

Meaning:

- the style-gated create flow is behaving consistently with the current exposure policy
- normal user-facing selection is aligned with the validated matrix
- backend protection is present for blocked fixed-template bypass attempts

### 23.10 Recommended Next Step

Recommended next slice:

- T5-12 optional non-fixed-path exposure enforcement audit

### 23.11 Exclusions

- No code changes performed
- No UI changes performed
- No functions changes performed
- No Firestore schema or rules changes performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No runner changes
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded

## 24. T5-12 Style-Gated Create Flow Release Readiness / Final Checklist

### 24.1 Goal

This section records the final release-readiness view for the initial style-gated create flow rollout.

The purpose is to answer:

- is the current T5 scope release-ready?
- what exact baseline is being released?
- what is still deferred or intentionally excluded?

### 24.2 T5 Summary

T5 delivered the following:

- exposure-policy planning
- exposure config design
- frontend exposure config module
- template-aware style picker filtering
- functions-side fixed-template exposure guard
- blocked/allowed path QA
- operator playbook for future matrix updates
- end-to-end low-cost product QA evidence

Overall T5 outcome:

- `Release Ready` for the currently validated fixed-template scope

### 24.3 Current Release Baseline

Current product exposure baseline:

- `fixed-sleepy-moon-adventure-8p`
  - user-facing:
    - `crayon`
    - `anime_storybook`
    - `soft_watercolor`
  - blocked:
    - none
- `fixed-first-zoo-8p`
  - user-facing:
    - `crayon`
    - `soft_watercolor`
  - blocked:
    - `anime_storybook`

Current backend allow/block posture:

- allow:
  - `promote`
  - `available`
- fail-close:
  - `internal`
  - `blocked`
  - unknown style ids
  - unlisted pairings

Current backend scope:

- enforced for `creationMode === "fixed_template"`

### 24.4 Final Release Checklist

The release should be considered ready only if all of the following are true:

#### Product policy

- exposure matrix is documented
- every user-facing pairing has recorded validation evidence
- every blocked pairing has a recorded rationale

#### Frontend

- style picker filters by template correctly
- hidden blocked pairings are not visible in the normal flow
- style ordering matches configured exposure priority
- stale selected style recovers to a valid visible style

#### Backend

- fixed-template guard is active in `processBookGeneration(...)`
- blocked fixed-template pairings fail before story generation
- blocked fixed-template pairings fail before image generation
- failure metadata is audit-friendly

#### QA

- targeted frontend tests pass
- targeted functions tests pass
- blocked-path test passes
- representative allowed-path test passes
- no contradictory evidence exists in the latest docs

#### Operations

- operator playbook exists for matrix changes
- emergency block procedure is documented
- rollback options are documented

### 24.5 Readiness By Area

#### UI readiness

- ready

Reason:

- template-aware filtering is implemented
- visible options match the validated matrix
- stale fallback path has low-cost QA support

#### Server readiness

- ready for fixed-template scope

Reason:

- blocked-pair enforcement exists beyond the client
- bypass attempts through direct product writes are covered by the guarded generation path

#### QA readiness

- ready

Reason:

- T5-7 and T5-11 provide sufficient low-cost confidence for the current scope
- no additional live write was required for this release decision

#### Docs / operations readiness

- ready

Reason:

- exposure policy, rollout guidance, operator playbook, and QA evidence are all documented

### 24.6 Known Limitations

Known limitations at release:

- server-side exposure enforcement currently applies only to fixed-template paths
- no admin override path exists yet
- no client-facing fallback recommendation UX exists for blocked attempts
- no live Firestore blocked-write proof was collected in T5-11
- frontend and functions exposure configs are mirrored, not yet shared from a single package

Assessment of these limitations:

- acceptable for the current release scope
- not acceptable as a reason to extend exposure blindly into non-fixed product paths without further audit

### 24.7 Deferred Items

Deferred items after release:

- non-fixed-path exposure enforcement audit
- privileged admin/internal override path
- client fallback recommendation UX for blocked attempts
- shared config extraction to reduce duplication drift
- optional controlled live blocked-write verification if ops wants additional trigger-level evidence

### 24.8 Rollback / Emergency Reference

If a release issue is discovered, use the existing T5 references:

- emergency block procedure:
  - see `21.9 Emergency Block Procedure`
- rollback guidance:
  - see `21.10 Rollback Guidance`
- operator sync checklist:
  - see `21.6 Frontend / Functions Sync Checklist`

Release principle:

- if confidence drops, prefer emergency-blocking the affected pairing over leaving it exposed while investigating

### 24.9 Post-Release Monitoring Guidance

After release, monitor for:

- unexpected blocked-pair creation failures in logs
- reports of missing/incorrect style options in the create flow
- evidence that UI-visible options and backend policy drifted apart
- operator mistakes during future matrix updates

Recommended monitoring focus:

- creation failures containing `style_exposure_blocked:`
- support or QA reports mentioning hidden/visible style mismatches
- any future incidents involving `fixed-first-zoo-8p × anime_storybook`

### 24.10 Final Release Decision

T5 final release-readiness decision:

- `Go`

Scope of that decision:

- the currently documented style-gated fixed-template create flow
- the currently documented exposure baseline only

Non-go scope:

- new unvalidated pairings
- broader non-fixed creation modes
- admin/internal override scenarios

### 24.11 Suggested Next Roadmap

Recommended next candidates after T5 release readiness:

1. T5-13 non-fixed-path exposure enforcement audit.
2. T5-14 admin/internal override planning.
3. T5-15 shared config extraction assessment.

### 24.12 Exclusions

- No code changes performed
- No UI changes performed
- No functions changes performed
- No Firestore schema or rules changes performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No runner changes
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded
