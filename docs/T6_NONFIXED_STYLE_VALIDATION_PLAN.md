# T6 Non-Fixed Style Validation Plan

Date started: 2026-05-17
Track owner: Product / Validation
Prerequisite tracks: T4 (fixed-template style validation), T5 (fixed-template exposure gating)

---

## 1. Purpose

T6 extends style validation to non-fixed creation paths (`guided_ai`, `original_ai`).

T6 does **not**:

- change the current fixed-template exposure policy from T5
- immediately gate non-fixed style selection
- duplicate the T4 fixed-template methodology verbatim

T6 **does**:

- define what validation evidence must exist before non-fixed style gating can be introduced
- identify what makes non-fixed validation different from fixed-template validation
- propose a tractable first validation matrix scope
- define acceptance criteria for promoting category × style findings into an exposure policy

---

## 2. Context and Prerequisites

### 2.1 T5-13 Audit Summary

Non-fixed path behavior as of T5-13:

- style fields are always written into the book payload regardless of creation mode:
  - `style`
  - `selectedStyleId`
  - `selectedStyleName`
  - `styleBible`
  - `stylePreviewImageUrl`
  - `stylePreviewUsedAsReference`
- the exposure matrix is not consulted for `guided_ai` or `original_ai` books
- style profile lookup does happen at generation time for prompt construction
- there is no server-side style exposure gating for non-fixed books
- the UI style picker shows the canonical style fallback list for non-configured templates

T5-13 conclusion:

- this is currently acceptable because T5 scope was fixed-template only
- non-fixed expansion is blocked until dedicated validation evidence exists
- T6 is the next natural track

### 2.2 T4 Validation Baseline

T4 established the fixed-template evaluation framework:

- validation unit: `templateId × styleId`
- primary axes: BF-4 (readable text), BF-3 (child continuity), style adherence, emotional fit
- pass rule: all four axes must be at acceptable threshold for a Go verdict
- smoke levels: L0 (static) → L1 (spot) → L2 (mini matrix) → L3 (rollout)

T4 results confirmed:

- `crayon` is the most portable validated style across fixed templates
- `anime_storybook` is attractive but template-sensitive (blocked for zoo scenes)
- `soft_watercolor` is a broadly safe baseline

T6 inherits these axes and extends them.

---

## 3. Why Non-Fixed Validation Is Different

### 3.1 LLM-Generated Story Content

For fixed-template books:

- image prompts are pre-validated as part of the template
- scene content and visual intent are known before generation
- style × scene interaction is predictable

For non-fixed books:

- the LLM generates story content including image prompts from user input
- scene content varies with every generation even for the same theme
- style × scene interaction is not pre-validated
- the same theme can produce very different visual scenarios depending on user input

### 3.2 User Input Variability

Fixed-template books:

- user input is limited to name, age, and a few optional fields
- template visual intent absorbs most of the variability

Non-fixed books (`guided_ai`):

- user can specify favorites, place, family members, lesson to teach, memory to recreate
- all of these may shape the LLM-generated scenes in ways that interact unpredictably with style

Original AI path (`original_ai`):

- user provides a `storyRequest` which is nearly freeform
- visual output variability is highest of any creation mode

### 3.3 Higher Open-Ended BF-4 Risk

Fixed-template:

- image prompts include explicit suppression instructions
- known BF-4 risk surfaces are identified per template

Non-fixed:

- LLM-generated scenes may describe settings with signage (shops, parks, schools)
- LLM may invent props with label-like surfaces not explicitly seeded by user input
- fantasy and imagination themes are especially prone to rune-like, magical, or decorative text marks

### 3.4 Character Continuity Under Scene Diversity

Fixed-template:

- child protagonist appears in pre-defined scenes
- BF-3 risk is known per template page

Non-fixed:

- LLM may shift the protagonist across wildly different settings within one book
- fantasy scenarios may visually transform the protagonist
- multi-setting books (indoor → outdoor → imaginary) stress BF-3 continuity more than fixed templates

---

## 4. Validation Unit Analysis

### 4.1 `theme × style`

Available guided_ai themes (from current seed-templates):

- animals, adventure, fantasy, bedtime, emotional-growth, daily-habits, educational, food, seasonal, vehicles-robots

Pros:

- most granular, matches eventual T5-style `templateId × styleId` model
- theme-specific anomalies are directly captured
- evidence maps cleanly to a per-theme exposure decision

Cons:

- many combinations: ~10 themes × 6+ styles = 60+ pairs
- themes within the same category share similar content structure, making per-theme validation redundant at first pass
- evidence burden is too high before initial expansion

### 4.2 `categoryGroupId × style`

Available category groups:

- `memories`
- `bedtime`
- `growth-support`
- `seasonal-events`
- `emotional-growth`
- `imagination`
- `daily-life`
- `favorite-worlds`
- `learning`

Pros:

- tractable first pass: ~9 categories × 6 styles = 54 pairs, but many are already low-priority
- captures the main mood and content-type variation across the product
- category-level pass gives reasonable initial confidence across themes in that category
- maps to the existing product data model (`categoryGroupId` is a first-class field)
- themes within a category share similar prompt vocabulary and scene character

Cons:

- individual theme anomalies within a category are not guaranteed to be caught
- eventual theme-level spot-checks are still required before gating specific themes

### 4.3 `creationMode × style`

Modes: `guided_ai`, `original_ai`

Pros:

- minimal combinations: 2 modes × 6 styles = 12 pairs
- simplest initial safety check

Cons:

- too coarse: very different themes share the same `creationMode`
- a pass for `guided_ai × watercolor` does not mean all guided_ai themes are safe with watercolor
- would encourage premature broad gating decisions without category-level evidence

### 4.4 `prompt archetype × style`

Possible archetypes (example dimensions):

- scene complexity: simple interior / outdoor active / fantastical / multi-setting
- character count: solo protagonist / family group / group cast
- prop density: minimal / moderate / prop-heavy

Pros:

- would be the most principled framework for understanding style × model behavior
- archetypes would generalize across both fixed and non-fixed paths

Cons:

- no archetype taxonomy currently exists in the codebase
- requires significant up-front definition work before any validation can begin
- premature as a first-pass approach before baseline evidence exists

### 4.5 Recommended Primary Unit: `categoryGroupId × style`

Rationale:

- category groups are already a first-class concept in the product data model
- they naturally cluster themes with similar visual content characteristics
- category-level validation gives a tractable, product-relevant first pass
- T6 should establish category-level evidence first, then use theme-level spot-checks to support specific theme gating decisions

Escalation path:

1. category × style evidence (T6-A)
2. theme × style spot-checks within proven categories (T6-B)
3. theme-level exposure map extension (T6-C)

---

## 5. Initial Validation Matrix

### 5.1 Style Scope

Priority 1 (already validated for fixed-template):

- `crayon` — validated_go for both fixed templates, highest portability
- `soft_watercolor` — validated_conditional for both fixed templates, broadly safe baseline
- `anime_storybook` — validated_go for sleepy-moon, blocked for zoo; behavior in non-fixed scenes is an open question

Priority 2 (not yet validated):

- `flat_illustration`
- `fluffy_pastel`
- `toy_3d`

T6 style scope recommendation:

- start with priority-1 styles only
- `anime_storybook` is deliberately included to assess whether its fixed-template sensitivity generalizes to non-fixed content
- defer priority-2 styles until priority-1 results across initial categories are clear

### 5.2 Category Scope

Initial T6 category selection:

| category | rationale |
| --- | --- |
| `bedtime` | quiet, low-prop environment; expected most style-forgiving; lowest BF-4 risk |
| `imagination` | open-ended LLM generation; exposes style variability risk most clearly |
| `emotional-growth` | character-forward scenes; tests BF-3 and style emotional fit together |

Rationale for this selection:

- `bedtime` is the safest starting point given its quiet mood and minimal signage risk
- `imagination` represents the highest variability case, exposing style instability risks early
- `emotional-growth` is character-forward and tests whether non-fixed child portrait consistency holds across styles

Extension targets (after initial results):

- `growth-support` — indoor habit scenes with moderate prop risk
- `memories` — overlaps with fixed-template categories (zoo, birthday); cross-reference to T4 evidence possible
- `original_ai` path — separate from guided_ai due to highest input variability; handled separately from themed guided_ai

Deferred:

- `seasonal-events` — event-specific props with higher BF-4 surface
- `learning` — educational props with letter-like BF-4 risk
- `favorite-worlds` — user-defined subject content; hardest to define representative input

### 5.3 Minimum First Matrix

Recommended T6 initial validation matrix:

| category | style | priority |
| --- | --- | --- |
| `bedtime` | `crayon` | first |
| `bedtime` | `soft_watercolor` | first |
| `bedtime` | `anime_storybook` | first |
| `imagination` | `crayon` | first |
| `imagination` | `soft_watercolor` | first |
| `imagination` | `anime_storybook` | first |
| `emotional-growth` | `crayon` | second |
| `emotional-growth` | `soft_watercolor` | second |
| `emotional-growth` | `anime_storybook` | second |

Representative themes for smoke (one per category):

- `bedtime` → theme id `bedtime`
- `imagination` → theme id `fantasy`
- `emotional-growth` → theme id `emotional-growth`

---

## 6. QA Criteria

### 6.1 Inherited from T4

Fixed-template evaluation axes that carry over to T6:

#### BF-4 Safety

Check for:

- readable text
- pseudo-text or handwriting-like strokes
- signage-like marks
- panel / label / cover text
- style-induced line clusters that look linguistic

Verdicts: `pass` / `watch` / `fail`

#### BF-3 Continuity

Check for:

- same child identity across pages
- age impression consistency
- hairstyle and outfit continuity
- signature item continuity where present
- protagonist not redesigned across setting shifts

Verdicts: `pass` / `watch` / `fail`

#### Style Adherence

Check for:

- styleBible primary characteristics visible in the output
- style distinguishable from other styles
- consistency across pages within one book

Verdicts: `strong` / `acceptable` / `weak` / `off-target`

#### Emotional Fit

Check for:

- style rendering aligns with the category's primary mood
- story text and image emotional direction are not at odds
- scene meaning preserved under the style

Verdicts: `high-fit` / `acceptable` / `mismatch`

#### Structural Health

Check for:

- all pages completed without broken or black images
- no over-clutter or under-detail per page
- no placeholder images

Verdicts: `pass` / `fail`

### 6.2 New T6-Specific Criteria

#### LLM Scene Variability

Check:

- do multiple books generated from the same theme × style pair show consistent BF-4 / BF-3 behavior, or does one fail while another passes?

Evaluation rule:

- a single passing book is not sufficient for a Go verdict
- at least 2 books sampled per pair
- if any book fails BF-4, the pair verdict is at most `Hold` regardless of the other sample

Verdicts: `stable` (both pass) / `variable` (mixed) / `fail` (both fail or any BF-4 fail)

#### User Input Profile Sensitivity

Check:

- does the style × category pairing hold under moderate-complexity user inputs, not just minimal input?
- does the LLM-generated scene vary so much across input profiles that style quality becomes unpredictable?

Evaluation rule:

- QA should use a moderate-input profile (name + age + 2+ optional fields)
- minimal input alone is not a valid basis for a Go verdict

#### Open-Ended BF-4 Coverage

Check:

- BF-4 evaluation must cover every page, not only pages 0-1
- LLM-invented scene content on later pages may introduce text risk not present on the opening pages

---

## 7. Smoke Level Design

T4 smoke levels for reference:

| level | scope |
| --- | --- |
| L0 | static, no generation |
| L1 | 1 template × 1 style |
| L2 | 2 templates × 3-6 styles |
| L3 | full rollout matrix |

T6 proposed smoke levels:

| level | purpose | scope |
| --- | --- | --- |
| L0 | docs / contract review | no generation |
| L1 | 1 category × 1 style, 1 representative theme, 1 book | first viability check |
| L2 | 2-3 categories × 3 priority styles, 1 representative theme per category, 2 books per pair | first comparative evidence |
| L3 | full initial matrix (3 categories × 3 priority styles, 2+ books per pair) | category-level promotion gate |
| L4 | specific themes within approved categories, 1-2 books per theme | theme-level gating evidence |

T6-1 recommendation:

- T6-2 should begin at L1 or L2, starting with `bedtime × crayon` as the lowest-risk initial pair
- do not skip L1/L2 evidence in favor of a direct L3 matrix run

---

## 8. Acceptance Criteria for Exposure Gating Promotion

### 8.1 Category-Level Promotion

For a `categoryGroupId × styleId` pair to be eligible for product exposure gating:

Minimum evidence:

- at least 2 books sampled (L2 minimum)
- BF-4: no `fail` in any sampled book; no more than 1 `watch` per book
- BF-3: `pass` across all sampled books
- style adherence: `acceptable` or better across all sampled books
- emotional fit: `acceptable` or better for the category's primary mood
- structural health: all pages complete, no broken images
- at least one book used a moderate-complexity user input

Additional:

- written verdict per pair recorded in this document
- a human QA pass has been performed (not automated scoring only)

### 8.2 Theme-Level Promotion

For a specific `theme × styleId` to receive individual exposure gate treatment within an approved category:

- at least 1 theme-level spot-check book has been generated and reviewed
- no theme-specific anomaly found that category-level evidence missed
- the spot-check book used a representative but not extreme user input profile

### 8.3 Block Criteria

A pair should be blocked if any of the following occur:

- any sampled book has a BF-4 `fail`
- BF-3 `fail` in more than one sampled book
- style adherence `off-target` across more than one sample
- structural health `fail` in more than one sample
- `variable` LLM scene variability verdict and at least one safety failure in any sample

### 8.4 Hold / Conditional Criteria

Hold:

- BF-4 `watch` persists across multiple samples without clear pattern
- LLM scene variability verdict is `variable` without a safety failure but with meaningful visual inconsistency

Conditional-Go:

- all primary axes pass but one `watch`-level item persists (documented)
- suitable for product availability at reduced promotion priority

---

## 9. Evidence Recording Format

### 9.1 Per Book Sample

| field | description |
| --- | --- |
| bookId | internal id for reference |
| theme | theme id used |
| categoryGroupId | category of the theme |
| styleId | canonical style id |
| creationMode | `guided_ai` or `original_ai` |
| inputProfile | `minimal` / `moderate` / `rich` |
| childAge | age used in input |
| BF-4 per page | per-page verdict summary |
| BF-3 summary | overall verdict |
| style adherence | overall verdict |
| emotional fit | overall verdict |
| notable anomalies | LLM-invented content that caused issues |
| overall verdict | Go / Conditional-Go / Conditional / Hold |

### 9.2 Per Category × Style Pair

| field | description |
| --- | --- |
| category | categoryGroupId |
| styleId | canonical style id |
| books sampled | count |
| BF-4 aggregate | worst case across samples |
| BF-3 aggregate | worst case across samples |
| style adherence aggregate | summary |
| emotional fit aggregate | summary |
| LLM variability | stable / variable / fail |
| pair verdict | Go / Conditional-Go / Conditional / Hold / Block |
| notes | any pattern worth recording |

---

## 10. Non-Fixed Path Specific Risk Assessment

### 10.1 BF-4 Risk by Category

Higher BF-4 risk:

- `imagination` / `fantasy` — fantastical environments, magical sigils, rune-like marks
- `seasonal-events` — seasonal settings (e.g. Christmas) may generate labeled props or cards
- `learning` — educational context may induce letter-like objects, book covers, chalkboard text
- `favorite-worlds` — user-specified subjects (vehicles, characters) may carry logo-like markings

Lower BF-4 risk (initial T6 candidates):

- `bedtime` — quiet, low-prop environments, minimal signage risk
- `emotional-growth` — character-forward, fewer ambient environmental objects

Watch:

- `imagination` is in the initial matrix despite higher risk, because testing it early is valuable for understanding the ceiling of BF-4 risk across non-fixed paths

### 10.2 BF-3 Risk by Category

Higher BF-3 risk:

- `imagination` — protagonist may appear across very different fantastical scenarios; transformation risk
- `emotional-growth` — emotional transformation scenes may affect character appearance if the LLM interprets the emotion literally

Lower BF-3 risk:

- `bedtime` — quiet scenes with limited setting changes; child protagonist remains consistent more easily

### 10.3 Style × Mood Risk by Category

- `anime_storybook` in `imagination`: may work well visually, but check for age-drift and over-dramatization
- `crayon` in `imagination`: may produce dense strokes in complex fantasy scenes that resemble handwriting
- `soft_watercolor` in `emotional-growth`: expected high fit; lowest concern for emotional mismatch

---

## 11. Relationship to T5 Exposure Policy

T5 current state:

- exposure matrix covers `fixed_template` only
- default for unlisted pairings: `status=internal`, `userSelectable=false`
- server-side guard enforces fail-closed for fixed-template generation

T6 policy intent:

- T6 validation evidence would enable promotion of category × style pairs to a new non-fixed exposure matrix
- this matrix would be keyed by `categoryGroupId × styleId` initially
- it would later extend to `theme × styleId` for specific gating decisions
- T6 does **not** change the existing fixed-template matrix
- a `Hold` result in T6 for a category does not retroactively affect fixed-template exposure for that style

Important constraint:

- T5 fixed-template `blocked` decisions are not affected by T6 results
- e.g. `fixed-first-zoo-8p × anime_storybook` remains blocked regardless of what T6 finds for `imagination × anime_storybook`

Future integration:

- if T6 evidence justifies it, a `categoryGroupId × styleId` exposure config can be introduced alongside the existing `templateId × styleId` matrix in `functions/src/lib/style-exposure.ts` and `src/lib/style-exposure.ts`
- a separate `creationMode`-aware guard would extend `processBookGeneration(...)` beyond the current `fixed_template` branch

---

## 12. Key Differences from T4 Evaluation Rules

| dimension | T4 (fixed-template) | T6 (non-fixed) |
| --- | --- | --- |
| validation unit | `templateId × styleId` | `categoryGroupId × styleId` → `theme × styleId` |
| scene content | pre-validated in template | LLM-generated, varies with input |
| sample count | 1 smoke per pair sufficient for L1/L2 | 2+ books per pair required |
| BF-4 scope | known risk surfaces per template | all pages must be checked; LLM-invented scenes may introduce new surfaces |
| input profile | minimal input acceptable for L1/L2 | moderate-complexity input required |
| pass threshold | all axes acceptable in one book | all axes stable across ≥2 books |
| style adherence basis | against fixed image prompts | against LLM-varied image prompts |

---

## 13. Exclusions

This slice is docs-only.

Excluded:

- code changes
- UI changes
- functions changes
- Firestore schema or rules changes
- smoke generation
- image generation
- Admin regeneration
- reference-flow generation
- Firebase Auth changes
- Storage token rotation / revocation
- runner changes
- style profile changes
- service account JSON, secrets, URLs, or tokens recorded

---

## 14. T6-1 Framework Decision

T6-1 verdict:

- recommended primary validation unit: `categoryGroupId × styleId`
- initial matrix: 3 categories (bedtime, imagination, emotional-growth) × 3 priority styles (crayon, soft_watercolor, anime_storybook)
- minimum sample count: 2 books per pair
- QA criteria: T4 axes plus LLM scene variability, input profile sensitivity, full-page BF-4 coverage
- non-fixed exposure gating should be deferred until L2-level evidence exists for the initial matrix

---

## 15. T6-2+ Candidate Slices

### T6-2: Input Profile and Smoke Candidate Design

Scope:

- define representative user input profiles (minimal / moderate / rich)
- select the first smoke candidates for L1 execution
- recommended first pair: `bedtime × crayon`
- define a low-cost L1 execution procedure with evidence recording template

### T6-3: L1 Smoke — Bedtime × Crayon

Scope:

- execute L1 smoke: 1-2 books for `bedtime × crayon`
- record evidence using T6 format
- assess BF-4 / BF-3 / style adherence / emotional fit
- issue L1 pair verdict
- decide whether L2 expansion is warranted

### T6-4: L1 Spot-Check — Bedtime × Soft Watercolor

Scope:

- execute L1 spot-check for `bedtime × soft_watercolor`
- compare with T4 fixed-template conditional-go evidence
- issue L1 pair verdict

### T6-5: L2 Mini Matrix — Bedtime × Priority Styles

Scope:

- complete all 3 bedtime × priority-style pairs
- include `anime_storybook` to assess whether its template-sensitivity extends to non-fixed bedtime scenes
- issue per-pair verdicts
- decide whether `bedtime` is cleared for category-level promotion

### T6-6: L2 Mini Matrix — Imagination × Priority Styles

Scope:

- execute 3 imagination × priority-style pairs (2+ books each)
- pay close attention to BF-4 in fantasy/adventure LLM-generated scenes
- compare anime_storybook behavior with fixed-template zoo findings
- issue per-pair verdicts

### T6-7: L2 Mini Matrix — Emotional-Growth × Priority Styles

Scope:

- execute 3 emotional-growth × priority-style pairs
- focus on BF-3 evaluation under emotional transformation scenes
- assess emotional fit for character-forward non-fixed content

### T6-8: Non-Fixed Exposure Config Design

Scope (docs-only):

- design the `categoryGroupId × styleId` exposure matrix config structure
- define how it extends `style-exposure.ts` without breaking fixed-template decisions
- propose how the server guard in `generate-book.ts` would be extended to cover non-fixed paths after T6-5 / T6-6 / T6-7 evidence exists

### T6-9: Non-Fixed Exposure Guard Implementation

Scope (code):

- implement `categoryGroupId × styleId` exposure matrix in `src/lib/style-exposure.ts` and `functions/src/lib/style-exposure.ts`
- extend `processBookGeneration(...)` guard to cover `guided_ai` books when creationMode is not `fixed_template`
- only implementable after T6-8 design and sufficient T6-5/T6-6/T6-7 evidence

---

## 16. T6-2 Input Profile and First Smoke Candidate Design

Date: 2026-05-17

### 16.1 Purpose

T6-2 concretizes the inputs, execution conditions, evidence format, and pass criteria that T6-3 will use when running the first non-fixed L1 smoke for `bedtime × crayon`.

T6-3 cannot run without:

- a defined input profile taxonomy (minimal / moderate / rich)
- concrete `bedtime × crayon` input specimens
- defined evidence recording fields
- defined L1 pass / hold criteria

This slice delivers all of the above as docs-only artifacts.

### 16.2 Non-Fixed Input Fields Reference

Fields available in `BookInput` for guided_ai books:

| field | type | description |
| --- | --- | --- |
| `childName` | string | required in all templates |
| `childAge` | number? | child age in years |
| `favorites` | string? | what the child loves |
| `lessonToTeach` | string? | value or behavior to reinforce |
| `memoryToRecreate` | string? | a real event to illustrate |
| `characterLook` | string? | physical appearance hint |
| `signatureItem` | string? | a specific object tied to the child |
| `colorMood` | string? | color or mood directive |
| `place` | string? | a location hint |
| `familyMembers` | string? | relevant family members |
| `season` | string? | time of year hint |
| `parentMessage` | string? | a message from the parent |
| `storyRequest` | string? | freeform story request (original_ai only) |

For the guided_ai `bedtime` theme specifically:

- required: `childName`
- optional: `parentMessage`, `colorMood`

All other optional fields are accepted by the create flow and passed to the LLM system prompt, but the `bedtime` template metadata does not surface them as primary fields in the UI.

### 16.3 Input Profile Taxonomy

T6 defines three input profile levels to standardize what inputs are used during validation runs.

#### Minimal Profile

Fields filled: `childName` only (plus `childAge` if the template recommends an age range)

Purpose:

- establish the absolute floor of LLM behavior with the least user context
- not sufficient as the only evidence for a Go verdict (per T6-1 requirements)
- useful as a comparison baseline against moderate and rich profiles

Risk:

- LLM may generate generic, template-like scenes without distinctive content
- minimal input may not expose style × user-input interaction risks
- a pass at minimal profile alone is not meaningful evidence for product exposure

#### Moderate Profile

Fields filled: `childName` + `childAge` + all theme-primary optional fields + at least 1 additional optional field from the theme's available options

Purpose:

- represents realistic everyday user behavior
- the T6-1 required minimum for any Go verdict
- exposes LLM × style interaction under real-world input volume

For `bedtime` theme moderate profile:

- `childName` ✓
- `childAge` ✓
- `parentMessage` ✓
- `colorMood` ✓

#### Rich Profile

Fields filled: `childName` + `childAge` + all theme-primary optional fields + at least one field outside the theme's primary UI surface

Purpose:

- stress-tests the style under complex, multi-dimensional user input
- exposes LLM-generated scene variety that simpler profiles would not produce
- required as the second book in the T6 minimum 2-book pair requirement

For `bedtime` theme rich profile:

- `childName` ✓
- `childAge` ✓
- `parentMessage` ✓
- `colorMood` ✓
- `favorites` ✓ (not a primary bedtime field, but accepted by the create flow and passed to the LLM)

### 16.4 First Smoke Candidate: `bedtime × crayon`

Rationale:

- `bedtime` is the lowest-BF-4-risk category in the initial T6 matrix (quiet, low-prop environments)
- `crayon` is the most portable and strongest validated style in the T5 fixed-template baseline
- their combination represents the most likely non-fixed Go candidate in the entire T6 matrix
- a failure here would be a strong signal that non-fixed style validation is harder than expected

Expected behavior:

- LLM generates quiet evening / night bedtime scenes with low prop complexity
- crayon rendering produces warm, textured, hand-drawn page illustrations
- main risk: dense crayon strokes on fabric, blanket patterns, or toy surfaces resembling handwriting (BF-4)
- secondary risk: protagonist appearance across page transitions if the LLM shifts scenes dramatically

### 16.5 Concrete Input Specimens for `bedtime × crayon`

Two books are required per T6-1 pair requirement.

#### Book A — Moderate Profile

| field | value |
| --- | --- |
| childName | さくら |
| childAge | 4 |
| parentMessage | きょうもたくさんあそんだね。おやすみ、さくら。 |
| colorMood | soft warm |
| favorites | (none) |
| style | crayon |
| theme | bedtime |
| creationMode | guided_ai |
| productPlan | free |
| childProfileSnapshot | none |

Rationale:

- `さくら` is a familiar Japanese name the LLM handles cleanly
- age 4 is mid-range for the bedtime template (1–6)
- `parentMessage` provides a brief emotional anchor without injecting complex scene props
- `colorMood: "soft warm"` aligns with bedtime expectations and should not stress crayon style

#### Book B — Rich Profile

| field | value |
| --- | --- |
| childName | けんた |
| childAge | 3 |
| parentMessage | げんきでよかった。また明日もいっしょに遊ぼうね。おやすみ。 |
| colorMood | deep cozy night |
| favorites | ミニカーとぬいぐるみ |
| style | crayon |
| theme | bedtime |
| creationMode | guided_ai |
| productPlan | free |
| childProfileSnapshot | none |

Rationale:

- `けんた` age 3 tests a younger child, different name, and different implicit gender expression
- `colorMood: "deep cozy night"` pushes toward darker scene content, a mild BF-4 risk surface for crayon (darker areas may produce denser, stroke-heavy textures)
- `favorites: "ミニカーとぬいぐるみ"` introduces props into LLM-generated scenes
  - toy car (ミニカー): small, flat, potentially logo-like prop → moderate BF-4 watch surface
  - stuffed animal (ぬいぐるみ): soft, rounded → low BF-4 risk, good BF-3 test for recurring object
- both toys are manageable prop types but warrant BF-4 review on any page they appear

### 16.6 L1 Execution Conditions

Before execution:

- confirm the `bedtime` guided_ai template is active in the target Firestore instance
- confirm no pending template changes to the `bedtime` theme
- confirm `crayon` style resolves canonically (no alias collision in the style picker)
- confirm the create flow is pointing to the intended environment (dev or QA; prefer non-production for validation runs)

During execution:

- use the standard create flow (not an admin override path)
- do not attach a `childProfileSnapshot` (no photo reference) for either book
- use `productPlan: "free"` unless premium path is the explicit target of this run
- record the resulting `bookId` immediately after creation
- do not modify or retry the book after creation; review the raw generated output

After execution:

- review every page, not only pages 0–1
- capture the bookId, page count, and any available generation metadata
- complete the evidence recording template below for each book before issuing any verdict

### 16.7 L1 Evidence Recording Template

Use this template per book for T6-3.

```
## Book Evidence Record

bookId:
date:
theme: bedtime
categoryGroupId: bedtime
styleId: crayon
creationMode: guided_ai
childAge: [value used]
inputProfile: moderate | rich
childName: [value used]
parentMessage: [value used]
colorMood: [value used]
favorites: [value used, or "none"]
childProfileSnapshot: none

### Structural Health
total pages generated:
broken / black images:
placeholder images:
verdict: pass | fail

### BF-4 Safety (per page)
| page | verdict | notes |
|------|---------|-------|
| 0    |         |       |
| 1    |         |       |
| 2    |         |       |
| 3    |         |       |
| 4    |         |       |
| 5    |         |       |
| 6    |         |       |
| 7    |         |       |
BF-4 summary verdict: pass | watch | fail
BF-4 worst surface observed:

### BF-3 Continuity
child identity consistent across pages: yes | no
age impression consistent: yes | no
hairstyle / outfit consistent: yes | no
notable identity shift (if any):
BF-3 summary verdict: pass | watch | fail

### Style Adherence
crayon texture visible: yes | partial | no
hand-drawn warmth present: yes | partial | no
style consistent across pages: yes | partial | no
style distinguishable from soft_watercolor: yes | no
style adherence verdict: strong | acceptable | weak | off-target

### Emotional Fit
bedtime mood present: yes | partial | no
child-safe, warm, gentle feeling: yes | partial | no
scene meaning preserved: yes | partial | no
emotional fit verdict: high-fit | acceptable | mismatch

### LLM-Generated Scene Notes
notable scenes the LLM invented (not directly from user input):
any scene that introduced unexpected prop complexity:
any scene that produced unexpected setting detail:

### Overall Book Verdict
verdict: Go | Conditional-Go | Conditional | Hold
notes:
```

### 16.8 L1 Pair Verdict Criteria

After both books have been recorded, use these rules to issue the `bedtime × crayon` pair verdict.

#### Go

All of the following must be true:

- structural health: `pass` for both books
- BF-4: no `fail` in either book; combined `watch` count ≤ 2 across all pages of both books
- BF-3: `pass` for both books
- style adherence: `acceptable` or `strong` for both books
- emotional fit: `acceptable` or `high-fit` for both books
- LLM variability: results are consistent between the two books; no safety failure appears in one while absent in the other

#### Conditional-Go

All primary axes pass, but:

- 1 persistent `watch` item across BF-4 or BF-3 that is documented but judged non-blocking

#### Conditional

Any of the following:

- style adherence is `weak` for one book and `acceptable` for the other (inconsistent style output)
- emotional fit is `mismatch` for one book
- LLM scene variability is meaningfully different between the two books without a safety failure

#### Hold

Any of the following:

- BF-4 `fail` in any page of either book
- BF-3 `fail` in more than one book
- structural health `fail` in any book
- style adherence `off-target` for either book

### 16.9 Pair Verdict Recording Location

After T6-3 execution, record the pair verdict in this document using this format:

```
## Pair Verdict: bedtime × crayon

books sampled: 2
Book A (moderate): [bookId] — verdict: [Go | Conditional-Go | Conditional | Hold]
Book B (rich): [bookId] — verdict: [Go | Conditional-Go | Conditional | Hold]

BF-4 aggregate: pass | watch | fail
BF-3 aggregate: pass | watch | fail
style adherence aggregate: strong | acceptable | weak | off-target
emotional fit aggregate: high-fit | acceptable | mismatch
LLM variability: stable | variable | fail

pair verdict: Go | Conditional-Go | Conditional | Hold
promotion eligibility: eligible for category-level | watch | block
notes:
```

### 16.10 Decision After T6-3

If `bedtime × crayon` pair verdict is `Go` or `Conditional-Go`:

- proceed to T6-4: `bedtime × soft_watercolor` L1 spot-check
- the two results together will give the first multi-style category comparison for `bedtime`

If `bedtime × crayon` pair verdict is `Hold`:

- do not expand to additional matrix pairs before investigating the cause
- determine whether the issue is bedtime-specific or crayon-specific
- document the failure pattern in full before deciding next step
- candidates: retry with minimal profile to isolate LLM vs style contribution; or try `imagination × crayon` to isolate category contribution

If `bedtime × crayon` pair verdict is `Conditional`:

- proceed cautiously to `bedtime × soft_watercolor` as a comparison point
- do not promote `bedtime` as a validated category until at least one pair reaches `Go` or `Conditional-Go`

### 16.11 Exclusions

- No code changes performed
- No UI changes performed
- No functions changes performed
- No Firestore schema or rules changes performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No Firebase Auth changes
- No Storage token rotation / revocation
- No runner changes
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded

---

## 17. T6-3 L1 Smoke — Bedtime × Crayon Execution Results

Date: 2026-05-17

### 17.1 Runner Support Check

Finding: the existing `scripts/create-template-smoke-books.js` hardcodes `creationMode: "fixed_template"` and iterates over `getFixedTemplateIds()`. It cannot create `guided_ai` books.

Action taken: created `scripts/create-nonfixed-smoke-book.js` — minimal guided_ai smoke book creator for T6. Supports `--dry-run` and `--write` flags; accepts `--theme-id`, `--style-id`, `--profile=a|b` arguments. No functions logic changes.

npm script added: `smoke:create-nonfixed-book`.

### 17.2 Dry-Run Verification

Dry-run for Book A (profile=a / moderate):

```
themeId:       bedtime
styleId:       crayon
profile:       a (moderate)
creationMode:  guided_ai
productPlan:   standard_paid
pageCount:     8
characterMode: cover_only
withReference: false
input:         {"childName":"さくら","childAge":4,"parentMessage":"きょうもたくさんあそんだね。おやすみ、さくら。","colorMood":"soft warm"}
```

Payload verified correct. Proceeded to `--write`.

Note: `productPlan` is `standard_paid` (not `free` as noted in section 16.5) because `guided_ai` requires `standard_paid`. The server would normalize `free + guided_ai → standard_paid` anyway; being explicit avoids smoke metadata ambiguity.

### 17.3 Structural Evidence

#### Book A — Moderate Profile

| field | value |
| --- | --- |
| bookId | J5eLcAw50sC2yh0MCbJ6 |
| runId | t6-nonfixed-20260517064657 |
| themeId | bedtime |
| styleId | crayon |
| inputProfile | moderate (a) |
| creationMode | guided_ai |
| productPlan | standard_paid |
| characterConsistencyMode | cover_only |
| childProfileSnapshot | none |
| pageCount (requested) | 8 |
| status | **failed** |
| failureStage | quality_gate |
| progress | 0 |
| pagesCompleted | 0 / 8 |
| referenceImagesUsed | 0 / 8 |

Quality gate violation detail (20 violations across 8 pages):

| violation | pages |
| --- | --- |
| missing_action_or_emotion | 1, 3, 5, 6, 8 |
| too_many_sound_words | 2 |
| text_too_childish | 2 |
| missing_scene_detail | 4, 5, 7 |
| sentence_too_short_for_age | 5, 7 |
| page_text_not_connected_to_story_goal | 1, 2, 3, 4, 6, 7, 8 |
| missing_visual_motif_in_text | 3, 4 |

#### Book B — Rich Profile

| field | value |
| --- | --- |
| bookId | iuCrth0sC6UV9SVVf0F1 |
| runId | t6-nonfixed-20260517064705 |
| themeId | bedtime |
| styleId | crayon |
| inputProfile | rich (b) |
| creationMode | guided_ai |
| productPlan | standard_paid |
| characterConsistencyMode | cover_only |
| childProfileSnapshot | none |
| pageCount (requested) | 8 |
| status | **completed** |
| progress | 100 |
| pagesCompleted | 8 / 8 |
| referenceImagesUsed | 0 / 8 |
| imageModel | black-forest-labs/flux-2-pro |
| usedCharacterReference | false (all pages) |
| imageAttemptCount | 1 (all pages) |
| failedPages | 0 |

### 17.4 Generation Analysis

**Book A failure interpretation:**

The quality gate is a server-side LLM output check applied to the generated page text before image generation begins. Book A failed with 20 violations, most critically `page_text_not_connected_to_story_goal` appearing on 7 of 8 pages. This indicates the moderate input profile (minimal parentMessage + colorMood only) did not give the LLM sufficient anchoring context to generate scene text that the quality gate accepts as meaningfully connected to a coherent story arc.

This is a text-generation failure, not an image-render failure. No images were generated for Book A.

**Book B success interpretation:**

The rich input profile — with a longer parentMessage, `colorMood: "deep cozy night"`, and `favorites: "ミニカーとぬいぐるみ"` — provided the LLM with sufficient scene anchoring to pass all quality checks. All 8 pages generated successfully.

**Key T6 finding from this run:**

The moderate input profile is insufficient to pass the server-side quality gate for `bedtime × guided_ai` in at least this execution. The rich input profile passed. This does not mean moderate is always insufficient — LLM output has run-to-run variance — but it is a signal that thin input profiles carry meaningful quality-gate failure risk for guided_ai books.

**T6 framework update implication:**

The T6-1 requirement that "moderate or richer input profile is required for a Go verdict" is validated by this observation. Minimal and moderate profiles may be usable as comparison baselines but should not be relied upon as sufficient for production path validation.

### 17.5 Visual QA Status

Book A: not applicable (generation failed before image phase).

Book B: image URLs are available in Firestore for all 8 pages. Visual QA (BF-4, BF-3, style adherence, emotional fit) is pending manual review. This document records structural evidence only; visual QA must be performed separately using the evidence template from section 16.7.

Visual QA is required before issuing a final T6-3 pair verdict.

### 17.6 Partial Pair Verdict (Structural Only)

Book A structural verdict: **Hold** (generation failed at quality_gate before image phase; no images to review)

Book B structural verdict: **Pending visual QA** (generation completed; 8/8 pages; image QA required)

T6-3 full pair verdict: **Hold pending** — cannot issue a final verdict until either Book A is re-run successfully or the quality gate behavior is understood and addressed.

### 17.7 Recommended Next Steps

1. Retry Book A with a slightly richer parentMessage to test whether the moderate profile can reliably pass the quality gate with a longer message, or redesign the moderate profile definition to require a minimum parentMessage length.
2. Perform visual QA on Book B (8 pages) using the section 16.7 evidence template.
3. If a revised Book A generates successfully, record both books' full evidence and issue the final pair verdict.
4. Document whether the quality gate failure rate for moderate bedtime inputs is a systemic risk or a one-off LLM sampling event.

### 17.8 Exclusions

- No fixed-template exposure matrix changes
- No style exposure gating changes
- No UI changes
- No functions logic changes (runner script only: `scripts/create-nonfixed-smoke-book.js`)
- No Firestore schema or rules changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation / revocation
- No style profile changes
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 18. T6-3a — Bedtime × Crayon Book A2 (Anchored Moderate) Retry / Quality-Gate Remediation

Date: 2026-05-17

### 18.1 Objective

Execute T6-3a to remediate Book A moderate-profile quality-gate failure by introducing an anchored moderate profile (`a2`) and re-running Book A as Book A2.

Scope for this slice:

- input remediation (`a2`) in non-fixed smoke runner
- dry-run payload verification
- guided_ai generation write
- monitor and inspect structural verification
- evidence recording in this plan

Out of scope (deferred):

- Book B detailed visual QA (moved to T6-4)
- final pair verdict issuance

### 18.2 Input Remediation Design (Book A -> Book A2)

Root cause from T6-3 Book A:

- failure stage: `quality_gate`
- pages completed: `0 / 8`
- dominant violation: `page_text_not_connected_to_story_goal` (7/8 pages)

Interpretation:

- text-generation anchoring was insufficient in original moderate profile (`a`)
- this was not an image generation failure

Remediation applied:

- added new profile key `a2` for `bedtime` in `scripts/create-nonfixed-smoke-book.js`
- profile label: `anchored moderate`
- anchoring changes vs `a`:
  - longer parentMessage with explicit bedtime scene grounding
  - add one lightweight grounding field: `favorites: "うさぎのぬいぐるみ"`
  - keep `colorMood: "soft warm"`

### 18.3 Dry-Run Verification (`--profile=a2`)

Dry-run command executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=crayon --profile=a2
```

Observed payload summary:

- `themeId: bedtime`
- `styleId: crayon`
- `profile: a2 (anchored moderate)`
- `creationMode: guided_ai`
- `productPlan: standard_paid`
- `pageCount: 8`
- `characterMode: cover_only`
- `withReference: false`
- `input` includes anchored parentMessage + `favorites`

Dry-run validation verdict: pass.

### 18.4 Generation + Monitor + Inspect Evidence

Write command executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=crayon --profile=a2
```

Created book:

- Book A2 `bookId`: `yylnhRJfVF23GcVyJBUF`
- `runId`: `t6-nonfixed-20260517133158`

Monitor/inspect summary:

| field | value |
| --- | --- |
| bookId | yylnhRJfVF23GcVyJBUF |
| runId | t6-nonfixed-20260517133158 |
| themeId | bedtime |
| styleId | crayon |
| inputProfile | anchored moderate (a2) |
| creationMode | guided_ai |
| productPlan | standard_paid |
| characterConsistencyMode | cover_only |
| childProfileSnapshot | none |
| pageCount (requested) | 8 |
| status | **completed** |
| failureStage | none |
| progress | 100 |
| pagesCompleted | 8 / 8 |
| failedPages | 0 |
| referenceImagesUsed | 0 / 8 |
| imageModel | black-forest-labs/flux-2-pro |
| usedCharacterReference | false (all pages) |
| imageAttemptCount | 1 (all pages) |
| imageFallbackUsed | false (all pages) |
| imageTimedOut | false (all pages) |

### 18.5 T6-3a Result Interpretation

Book A2 passed structural generation (`completed`, 8/8), while original Book A failed at `quality_gate` before any image generation.

This run supports the remediation hypothesis:

- adding moderate-level anchoring (longer parentMessage + one grounding field) materially reduced quality-gate failure risk for `bedtime × crayon` in this sample.

This is still sample-limited (single retry) and should not be over-generalized as a universal guarantee.

### 18.6 Carry-Over to T6-4 (Book B Visual QA)

Book B from T6-3 remains:

- `bookId`: `iuCrth0sC6UV9SVVf0F1`
- structural status: completed (8/8)
- detailed visual QA status: **pending**

Per scope split, detailed visual QA is deferred to T6-4 and is not closed in T6-3a.

### 18.7 Pair Verdict State After T6-3a

Current structural state:

- Book A2 (anchored moderate): structural pass (`completed`, 8/8)
- Book B (rich): structural pass already recorded, visual QA pending

Pair verdict state:

- `bedtime × crayon` final pair verdict remains **Hold pending** until Book B detailed visual QA is completed in T6-4.

### 18.8 Exclusions (T6-3a)

- No functions logic changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
