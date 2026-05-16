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
