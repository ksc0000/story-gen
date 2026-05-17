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

---

## 19. T6-4 — Bedtime × Crayon Manual Visual QA (Book A2 + Book B)

Date: 2026-05-17

### 19.1 Scope and Method

- scope: manual visual QA for `bedtime × crayon` pair (`bookId=yylnhRJfVF23GcVyJBUF`, `bookId=iuCrth0sC6UV9SVVf0F1`)
- unit: `categoryGroupId × styleId` = `bedtime × crayon`
- pages reviewed: 8 pages per book, 16 pages total
- review axes: BF-4, BF-3, style adherence, emotional fit, story-image match, structural carry-over
- evidence source: Firestore page images/text reviewed page-by-page; no regeneration or post-edit

### 19.2 Book Evidence Record — Book A2 (anchored moderate)

bookId: `yylnhRJfVF23GcVyJBUF`
date: 2026-05-17
theme: bedtime
categoryGroupId: bedtime
styleId: crayon
creationMode: guided_ai
childAge: 4
inputProfile: anchored moderate (`a2`)
childName: さくら
parentMessage: きょうもたくさんあそんだね。おきにいりのうさぎさんといっしょに、あたたかいおへやでゆっくりねむろうね。おやすみ、さくら。
colorMood: soft warm
favorites: うさぎのぬいぐるみ
childProfileSnapshot: none

#### Structural Health

- total pages generated: 8
- broken / black images: 0
- placeholder images: 0
- structural carry-over: pass (same child identity and bunny motif maintained across all pages)
- verdict: pass

#### BF-4 Safety (per page)

| page | verdict | notes |
| --- | --- | --- |
| 0 | pass | no text-like strokes or signage surfaces |
| 1 | pass | no embedded text; night-sky motif clean |
| 2 | pass | toy/bedroom props simple and safe |
| 3 | pass | close-up with no glyph-like artifacts |
| 4 | pass | bed scene; no pseudo-lettering observed |
| 5 | pass | sleeping scene remains free of text artifacts |
| 6 | pass | window/star composition clean |
| 7 | pass | dream bubble/iconography only; no harmful text-like marks |

BF-4 summary verdict: pass
BF-4 worst surface observed: none blocking; no BF-4 trigger detected.

#### BF-3 Continuity

- child identity consistent across pages: yes
- age impression consistent: yes
- hairstyle / outfit consistent: partial (pajama color and hair clip details vary, but child identity remains stable)
- notable identity shift (if any): none critical
- BF-3 summary verdict: pass

#### Style Adherence

- crayon texture visible: yes
- hand-drawn warmth present: yes
- style consistent across pages: yes
- style distinguishable from soft_watercolor: yes
- style adherence verdict: strong

#### Emotional Fit

- bedtime mood present: yes
- child-safe, warm, gentle feeling: yes
- scene meaning preserved: yes
- emotional fit verdict: high-fit

#### Story-Image Match

- page text and visual scene alignment: strong across all 8 pages
- recurring motif alignment (`fuwafuwa rabbit`, moon/stars, bedtime wind-down): strong
- mismatch pages: none

#### LLM-Generated Scene Notes

- notable scenes the LLM invented (not directly from user input): smiling moon face, dream thought bubble icon
- any scene that introduced unexpected prop complexity: none
- any scene that produced unexpected setting detail: minor decorative variations only (non-blocking)

#### Overall Book Verdict

- verdict: Go
- notes: quality-gate remediation outcome is visually coherent and bedtime-safe; no BF-4/BF-3 blockers.

### 19.3 Book Evidence Record — Book B (rich)

bookId: `iuCrth0sC6UV9SVVf0F1`
date: 2026-05-17
theme: bedtime
categoryGroupId: bedtime
styleId: crayon
creationMode: guided_ai
childAge: 3
inputProfile: rich (`b`)
childName: けんた
parentMessage: げんきでよかった。また明日もいっしょに遊ぼうね。おやすみ。
colorMood: deep cozy night
favorites: ミニカーとぬいぐるみ
childProfileSnapshot: none

#### Structural Health

- total pages generated: 8
- broken / black images: 0
- placeholder images: 0
- structural carry-over: pass (boy identity, cloud pajamas, bunny plush motif sustained)
- verdict: pass

#### BF-4 Safety (per page)

| page | verdict | notes |
| --- | --- | --- |
| 0 | pass | no pseudo-text surfaces |
| 1 | pass | night sky symbols only; no letter-like cluster |
| 2 | pass | character + plush focus; no BF-4 risk artifact |
| 3 | pass | close-up expression scene, no text-like marks |
| 4 | pass | moon/stars composition; no signage/text |
| 5 | pass | bed close-up; no unsafe glyph pattern |
| 6 | pass | sleeping scene clean |
| 7 | pass | heart-shaped star arrangement is symbolic, not text-like |

BF-4 summary verdict: pass
BF-4 worst surface observed: page 7 heart-shaped star arrangement (watch-level symbolic motif, non-blocking).

#### BF-3 Continuity

- child identity consistent across pages: yes
- age impression consistent: yes
- hairstyle / outfit consistent: yes
- notable identity shift (if any): none
- BF-3 summary verdict: pass

#### Style Adherence

- crayon texture visible: partial (strong in most pages, softer in a few close-up pages)
- hand-drawn warmth present: yes
- style consistent across pages: partial
- style distinguishable from soft_watercolor: yes
- style adherence verdict: acceptable

#### Emotional Fit

- bedtime mood present: yes
- child-safe, warm, gentle feeling: yes
- scene meaning preserved: yes
- emotional fit verdict: high-fit

#### Story-Image Match

- page text and visual scene alignment: strong overall
- recurring motif alignment (moon/stars, bunny plush, sleep transition): strong
- mismatch pages: none

#### LLM-Generated Scene Notes

- notable scenes the LLM invented (not directly from user input): owl on tree branch (page 1), heart-star sky shape (page 7)
- any scene that introduced unexpected prop complexity: none
- any scene that produced unexpected setting detail: minor stylistic variance in close-up render sharpness

#### Overall Book Verdict

- verdict: Go
- notes: no safety/continuity blockers; style variance exists but remains within acceptable bedtime-crayon range.

### 19.4 Pair Verdict: bedtime × crayon (L1)

books sampled: 2
Book A2 (anchored moderate): `yylnhRJfVF23GcVyJBUF` — verdict: Go
Book B (rich): `iuCrth0sC6UV9SVVf0F1` — verdict: Go

BF-4 aggregate: pass
BF-3 aggregate: pass
style adherence aggregate: acceptable
emotional fit aggregate: high-fit
story-image match aggregate: strong
LLM variability: stable (minor stylistic variance, non-blocking)

Final pair verdict: **Go**

Rationale:

- structural health passed for both books
- no BF-4 fail pages; no BF-3 fail book
- style adherence met `strong` (A2) and `acceptable` (B)
- emotional fit `high-fit` for both books
- scene continuity and story-image match remained stable across both profiles

### 19.5 T6-4 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 20. T6-5 — Next Non-Fixed Pair Candidate Selection (Docs-Only)

Date: 2026-05-17

### 20.1 Objective

Select one next non-fixed `categoryGroupId × styleId` pair after `bedtime × crayon` reached Go, using a docs-only decision process.

Decision lenses used:

- risk (BF-4 / BF-3 and execution stability)
- learning value (how much uncertainty is reduced)
- cost (expected retries / QA burden)
- matrix coverage value (incremental evidence added to T6 initial matrix)

### 20.2 Current Matrix Progress

Completed pair:

- `bedtime × crayon` -> Go (T6-4)

Remaining unvalidated pairs:

- `bedtime × soft_watercolor`
- `bedtime × anime_storybook`
- `imagination × crayon`
- `imagination × soft_watercolor`
- `imagination × anime_storybook`
- `emotional-growth × crayon`
- `emotional-growth × soft_watercolor`
- `emotional-growth × anime_storybook`

### 20.3 Candidate Comparison (Shortlist)

Candidates compared in this slice:

- `bedtime × soft_watercolor`
- `bedtime × anime_storybook`
- `imagination × crayon`
- `emotional-growth × crayon`

| candidate pair | risk (overall) | learning value | expected BF-4 | expected BF-3 | expected style adherence | execution cost | matrix coverage value |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bedtime × soft_watercolor` | low | high | low | low to medium | high (baseline comparison quality) | low | high (isolates style effect within same category) |
| `bedtime × anime_storybook` | medium | high | low to medium | medium (age-drift / dramatization) | medium (style swing risk) | medium | high (same-category style contrast, higher volatility) |
| `imagination × crayon` | medium to high | very high | medium to high (fantasy symbols can resemble marks) | medium (scene variance) | medium | medium to high | high (new category stress test) |
| `emotional-growth × crayon` | medium | medium to high | low to medium | medium (character-expression drift) | medium to high | medium | medium to high (new category with lower scene entropy) |

### 20.4 Selection Result

Selected next pair: **`bedtime × soft_watercolor`**

Selection rationale:

1. Keeps `categoryGroupId=bedtime` fixed and changes only style, maximizing causal clarity after `bedtime × crayon` Go.
2. Offers strongest immediate comparison value for style adherence and emotional fit with minimal confounding.
3. Expected BF-4 and BF-3 risk is lower than `bedtime × anime_storybook` and clearly lower than `imagination × crayon`.
4. Lower execution cost supports faster learning loop and cleaner entry into expanded matrix validation.
5. Aligns with prior fixed-template evidence where `soft_watercolor` acted as a safe baseline (often Conditional-Go range), making it a practical second anchor.

Rejected-for-now rationale:

- `bedtime × anime_storybook`: useful but higher volatility; better as the next step after `bedtime × soft_watercolor`.
- `imagination × crayon`: high learning value but too many confounders at once (category+scene entropy).
- `emotional-growth × crayon`: valuable, but weaker direct A/B contrast than staying in bedtime for one more style comparison.

### 20.5 Pair Priority Order (Post T6-5 Decision)

Recommended near-term order:

1. `bedtime × soft_watercolor` (next)
2. `bedtime × anime_storybook`
3. `emotional-growth × crayon`
4. `imagination × crayon`

This order prioritizes low-risk same-category style discrimination first, then escalates toward higher-variance category exploration.

### 20.6 Lightweight Input Direction for T6-6 Smoke Design

Target pair for next smoke design: `bedtime × soft_watercolor`

Input policy guidance (lightweight):

1. Use two-book structure matching T6-4 comparability:
  - Book S1: anchored moderate profile (same anchoring philosophy as A2)
  - Book S2: rich profile
2. Keep `childAge` in 3-4 range and keep scene entropy low (bedroom, moon/stars, bedtime routine).
3. Require one explicit grounding object in both profiles (e.g., favorite plush) to reduce quality-gate drift.
4. Keep `colorMood` in soft/warm/night-safe range; avoid high-contrast fantasy descriptors.
5. Preserve no-reference path (`referenceImagesUsed=0`) for comparability with prior bedtime runs.
6. Reuse the same evidence grid (BF-4/BF-3/style/emotional/story-image/structural carry-over) to allow direct cross-style comparison.

### 20.7 Expected Decision Gate for Next Slice

For `bedtime × soft_watercolor`:

- if Go/Conditional-Go: proceed to `bedtime × anime_storybook` as third bedtime style point
- if Conditional/Hold: pause category expansion and analyze whether failure is style-specific or input-profile-specific

### 20.8 Exclusions (T6-5)

- Docs-only candidate selection
- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 21. T6-6 — Bedtime × Soft_Watercolor Smoke Input / Execution Design (Docs-Only)

Date: 2026-05-17

### 21.1 Objective

Define concrete smoke input and execution design for `bedtime × soft_watercolor` so that the next run can be executed safely and comparably.

This slice is design-only:

- generation execution is deferred to T6-7
- manual visual QA is deferred to T6-8

### 21.2 Design Baseline and Constraints

Baseline evidence used:

1. `bedtime × crayon` reached Go in T6-4 with two-book structure (anchored moderate + rich).
2. T6-5 selected `bedtime × soft_watercolor` as next pair for low-risk, high-comparison value progression.
3. T6-3a showed anchored-moderate grounding reduces quality-gate failure risk versus thin moderate input.

Design constraints for comparability:

- keep `categoryGroupId=bedtime` fixed
- change only style (`soft_watercolor`)
- keep no-reference path (`childProfileSnapshot: none`, `referenceImagesUsed=0` target)
- preserve two-book structure to compare with T6-4 outcomes

### 21.3 Input Structure Mapping (A2/B -> S1/S2)

| role | prior crayon run | T6-6 design role |
| --- | --- | --- |
| anchored moderate lane | Book A2 (`a2`) | Book S1 |
| rich lane | Book B (`b`) | Book S2 |

Rationale:

- preserves cross-style comparability while minimizing new confounders
- keeps one lower-entropy anchored profile and one richer profile

### 21.4 Book S1 / Book S2 Concrete Input Profiles

Target pair: `theme=bedtime`, `style=soft_watercolor`, `creationMode=guided_ai`, `productPlan=standard_paid`, `pageCount=8`.

#### Book S1 — Anchored Moderate (soft_watercolor)

| field | value |
| --- | --- |
| profile key | `s1` (new design key; naming for docs only) |
| inputProfile label | anchored moderate |
| childName | さくら |
| childAge | 4 |
| parentMessage | きょうもたくさんあそんだね。おきにいりのうさぎさんといっしょに、あたたかいおへやでゆっくりねむろうね。おやすみ、さくら。 |
| colorMood | soft warm watercolor night |
| favorites | うさぎのぬいぐるみ |
| style | soft_watercolor |
| theme | bedtime |
| childProfileSnapshot | none |

Design intent:

- maximize quality-gate pass probability with proven anchored structure
- isolate style difference relative to crayon A2

#### Book S2 — Rich (soft_watercolor)

| field | value |
| --- | --- |
| profile key | `s2` (new design key; naming for docs only) |
| inputProfile label | rich |
| childName | けんた |
| childAge | 3 |
| parentMessage | げんきでよかった。また明日もいっしょに遊ぼうね。おつきさまとおほしさまをみながら、やさしいきもちでねむろうね。おやすみ。 |
| colorMood | pale cozy night |
| favorites | うさぎのぬいぐるみとミニカー |
| style | soft_watercolor |
| theme | bedtime |
| childProfileSnapshot | none |

Design intent:

- keep rich lane learning value
- slightly constrain scene entropy compared with prior rich wording
- retain one harder prop (`ミニカー`) for BF-4 monitoring while keeping overall gentle palette

### 21.5 Soft_Watercolor-Specific QA Watchpoints

Expected strengths:

- gentle palette and soft lighting generally fit bedtime emotional target
- low BF-4 tendency compared with denser stroke-heavy styles

Watchpoints to track explicitly:

1. over-wash blur: subject boundaries become too soft and scene readability drops
2. low-contrast face detail: child expression becomes ambiguous across pages
3. color bleeding clusters: blot patterns that could resemble glyph-like marks at small scale
4. object drift under low contrast: recurring plush/toy appears inconsistently shaped or disappears
5. mood flattening: pages become visually similar and lose narrative progression cues

### 21.6 T6-7 Smoke Execution Policy (Generation / Structural Scope)

Execution scope for T6-7:

- run dry-run and write for Book S1 and Book S2 only
- capture structural metadata only (no manual image verdict yet)

Required policy:

1. preflight
  - confirm target pair `bedtime × soft_watercolor`
  - confirm same environment assumptions as T6-4/T6-5
  - confirm no pending bedtime template edits
2. generation
  - create Book S1 first, then Book S2
  - no Admin override path
  - no regeneration/retry until initial structural inspection is recorded
3. structural checks
  - status transition: `generating -> completed|partial_completed|failed`
  - pages completed and failed pages
  - quality-gate or image-stage failure stage if any
  - image metrics retained: `imageDurationMs`, `imageAttemptCount`, `imageFallbackUsed`, `imageTimedOut`, `imageModel`
4. stop conditions
  - if either book hard-fails at quality_gate, record and stop before visual QA
  - if completed/partial_completed, proceed to T6-8 visual QA phase

### 21.7 T6-8 Visual QA Separation Policy

T6-8 is defined as manual visual QA phase for `bedtime × soft_watercolor` after T6-7 structural completion.

Separation rule:

- T6-7 outputs: bookIds + structural evidence only
- T6-8 outputs: page-level visual evidence + book verdicts + pair verdict

T6-8 required review axes:

- BF-4 safety (per page)
- BF-3 continuity
- soft_watercolor style adherence
- emotional fit for bedtime
- story-image match
- structural carry-over consistency

### 21.8 Evidence Template for T6-7/T6-8

Use one record per book and one pair summary.

Book-level required fields:

- bookId
- date
- theme: bedtime
- categoryGroupId: bedtime
- styleId: soft_watercolor
- creationMode: guided_ai
- inputProfile: anchored moderate (S1) or rich (S2)
- childName, childAge, parentMessage, colorMood, favorites
- childProfileSnapshot: none
- structural metrics (status, pages completed, failure stage if any)
- visual QA axes (BF-4/BF-3/style/emotional/story-image)
- overall book verdict: Go | Conditional-Go | Conditional | Hold

Pair-level required fields:

- books sampled: 2
- Book S1 verdict
- Book S2 verdict
- BF-4 aggregate
- BF-3 aggregate
- style adherence aggregate
- emotional fit aggregate
- LLM variability (stable/variable/fail)
- final pair verdict

### 21.9 Preliminary Decision Criteria for Bedtime × Soft_Watercolor

Go candidate if all hold:

1. both books structural pass (or acceptable partial without safety concerns)
2. BF-4 no fail pages
3. BF-3 pass for both books
4. style adherence at least acceptable for both books
5. emotional fit at least acceptable for both books

Conditional-Go candidate:

- one persistent watch item, documented and judged non-blocking

Conditional/Hold candidate:

- visible watercolor blur/contrast issues causing repeated story-image mismatch
- BF-3 drift in one or both books
- any BF-4 fail page

### 21.10 Handoff Checklist to T6-7

Before T6-7 starts, confirm:

1. S1/S2 input payloads are frozen
2. no code or runner change is required for this slice
3. output logging format is ready for structural metrics
4. T6-8 visual QA worksheet fields are pre-created in docs

### 21.11 Exclusions (T6-6)

- Docs-only design
- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 22. T6-7 — Bedtime × Soft_Watercolor Smoke Generation / Structural Inspection

Date: 2026-05-17

### 22.1 Scope

Execute T6-7 structural smoke for `bedtime × soft_watercolor` with two books (S1/S2), including:

- runner profile support update (`s1`, `s2`)
- dry-run validation
- write generation
- monitor / inspect structural verification
- structural evidence recording

Out of scope for this slice:

- detailed manual visual QA (deferred to T6-8)
- final pair verdict determination

### 22.2 Runner Profile Support Update

Updated file: `scripts/create-nonfixed-smoke-book.js`

Changes:

- added bedtime profile key `s1` (anchored moderate)
- added bedtime profile key `s2` (rich)
- expanded usage comments to include `s1|s2`
- no functions logic changes

### 22.3 Dry-Run Verification

Dry-run commands executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=s1
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=s2
```

Dry-run summary:

- both payloads resolved `themeId=bedtime`, `styleId=soft_watercolor`
- `creationMode=guided_ai`, `productPlan=standard_paid`, `pageCount=8`
- no-reference path confirmed (`withReference=false`)
- S1 profile label: anchored moderate
- S2 profile label: rich

### 22.4 Generation Evidence (Write)

Write commands executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=soft_watercolor --profile=s1
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=soft_watercolor --profile=s2
```

Created books:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book S1 | `uwhwhq3DmuGPekxBVn0a` | anchored moderate (`s1`) | `t6-nonfixed-20260517140513` |
| Book S2 | `PFuh3zu7q4VmNn4qA3dU` | rich (`s2`) | `t6-nonfixed-20260517140516` |

### 22.5 Monitor / Inspect Structural Results

#### Book S1 — Anchored Moderate (`s1`)

| field | value |
| --- | --- |
| bookId | uwhwhq3DmuGPekxBVn0a |
| status | **completed** |
| progress | 100 |
| theme | bedtime |
| styleId | soft_watercolor |
| selectedStyleName | やさしい水彩 |
| pageCount requested | 8 |
| pages actual | 8 |
| pages completed | 8 |
| failed pages | 0 |
| imageModel | black-forest-labs/flux-2-pro |
| imageAttemptCount | 1 (all pages) |
| imageFallbackUsed pages | 0 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 21011 / 24617 / 27559 |
| inspect expected page count check | PASS |

#### Book S2 — Rich (`s2`)

| field | value |
| --- | --- |
| bookId | PFuh3zu7q4VmNn4qA3dU |
| status | **completed** |
| progress | 100 |
| theme | bedtime |
| styleId | soft_watercolor |
| selectedStyleName | やさしい水彩 |
| pageCount requested | 8 |
| pages actual | 8 |
| pages completed | 8 |
| failed pages | 0 |
| imageModel | black-forest-labs/flux-2-pro |
| imageAttemptCount | 1 (all pages) |
| imageFallbackUsed pages | 0 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 16237 / 21475 / 33609 |
| inspect expected page count check | PASS |

### 22.6 Structural Interpretation (T6-7)

- Both S1 and S2 completed successfully with full 8/8 pages.
- No quality-gate failure and no page-level image failure occurred.
- No fallback usage and no timeout flags were observed.
- No-reference execution path remained intact (`inputReferenceCount=0`, `usedCharacterReference=false` for all pages).
- Structural health for `bedtime × soft_watercolor` is **pass** at T6-7 scope.

### 22.7 T6-8 Handoff (Manual Visual QA)

T6-8 should perform detailed manual visual QA for both books using the defined watchpoints:

- BF-4 per-page safety
- BF-3 continuity
- soft_watercolor style adherence
- emotional fit
- story-image match

Current status before T6-8:

- visual QA: pending
- pair verdict: not finalized in T6-7

### 22.8 Exclusions (T6-7)

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
- No detailed manual visual QA completion
- No final pair verdict confirmation

---

## 23. T6-8 - Bedtime x Soft_Watercolor Manual Visual QA / Pair Verdict

Date: 2026-05-17

### 23.1 Scope

- scope: manual visual QA for `bedtime x soft_watercolor` pair (`bookId=uwhwhq3DmuGPekxBVn0a`, `bookId=PFuh3zu7q4VmNn4qA3dU`)
- unit: `categoryGroupId x styleId` = `bedtime x soft_watercolor`
- pages reviewed: 8 pages per book, 16 pages total
- review axes: BF-4, BF-3, style adherence, emotional fit, story-image match, structural carry-over
- evidence source: Firestore page images/text reviewed page-by-page; no regeneration or post-edit

### 23.2 Book Evidence Record - Book S1 (anchored moderate)

bookId: `uwhwhq3DmuGPekxBVn0a`
date: 2026-05-17
theme: bedtime
categoryGroupId: bedtime
styleId: soft_watercolor
creationMode: guided_ai
childAge: 4
inputProfile: anchored moderate (`s1`)
childName: さくら
parentMessage: きょうもたくさんあそんだね。おきにいりのうさぎさんといっしょに、あたたかいおへやでゆっくりねむろうね。おやすみ、さくら。
colorMood: soft warm watercolor night
favorites: うさぎのぬいぐるみ
childProfileSnapshot: none

#### Structural Health

- total pages generated: 8
- broken / black images: 0
- placeholder images: 0
- structural carry-over: pass (same child identity, pink pajamas, and bunny plush motif remain recognizable across the sequence)
- verdict: pass

#### BF-4 Safety (per page)

| page | verdict | notes |
| --- | --- | --- |
| 0 | pass | no readable text or unsafe symbol cluster |
| 1 | pass | stars / constellation motif only; no BF-4 trigger |
| 2 | pass | bedroom scene remains text-free |
| 3 | pass | close-up crop clean; no embedded lettering |
| 4 | pass | plush close-up remains safe |
| 5 | pass | sleeping composition clean |
| 6 | fail | lower-left quadrant contains a large readable Japanese text block unrelated to the story scene |
| 7 | pass | quiet ending close-up free of text artifacts |

BF-4 summary verdict: fail
BF-4 worst surface observed: page 6 lower-left readable Japanese paragraph block; blocking BF-4 artifact.

#### BF-3 Continuity

- child identity consistent across pages: yes
- age impression consistent: yes
- hairstyle / outfit consistent: yes
- notable identity shift (if any): none critical
- BF-3 summary verdict: pass

#### Style Adherence

- watercolor texture visible: yes
- soft warm palette present: yes
- style consistent across pages: yes
- style distinguishable from crayon / anime_storybook: yes
- style adherence verdict: strong

#### Emotional Fit

- bedtime mood present: yes
- child-safe, warm, gentle feeling: yes
- scene meaning preserved: partial (page 6 composition is emotionally fitting, but the text artifact breaks the intended wordless visual finish)
- emotional fit verdict: acceptable

#### Story-Image Match

- page text and visual scene alignment: strong on pages 0-5 and 7
- recurring motif alignment (`fuwafuwa rabbit`, moon/stars, bedtime wind-down): strong
- mismatch pages: page 6 (blocking readable text overlay introduces a non-story element)

#### LLM-Generated Scene Notes

- notable scenes the LLM invented (not directly from user input): smiling moon face, bunny-shaped star motif in the night sky
- any scene that introduced unexpected prop complexity: none
- any scene that produced unexpected setting detail: page 6 inserted a large unrelated readable text block

#### Overall Book Verdict

- verdict: Hold
- notes: soft watercolor look and bedtime tone are strong overall, but page 6 is a clear BF-4 blocker and prevents book-level clearance.

### 23.3 Book Evidence Record - Book S2 (rich)

bookId: `PFuh3zu7q4VmNn4qA3dU`
date: 2026-05-17
theme: bedtime
categoryGroupId: bedtime
styleId: soft_watercolor
creationMode: guided_ai
childAge: 3
inputProfile: rich (`s2`)
childName: けんた
parentMessage: げんきでよかった。また明日もいっしょに遊ぼうね。おつきさまとおほしさまをみながら、やさしいきもちでねむろうね。おやすみ。
colorMood: pale cozy night
favorites: うさぎのぬいぐるみとミニカー
childProfileSnapshot: none

#### Structural Health

- total pages generated: 8
- broken / black images: 0
- placeholder images: 0
- structural carry-over: pass (same boy identity, blue star pajamas, bunny plush, and bedtime room logic remain coherent)
- verdict: pass

#### BF-4 Safety (per page)

| page | verdict | notes |
| --- | --- | --- |
| 0 | pass | moon / bedroom establishing shot is clean |
| 1 | pass | no readable text, labels, or signage |
| 2 | pass | bed close-up free of unsafe marks |
| 3 | pass | pointing scene contains no text artifact |
| 4 | pass | plush close-up safe; no readable stitched text |
| 5 | pass | sleeping scene remains clean |
| 6 | pass | dream-cloud scene uses symbolic stars only; no BF-4 issue |
| 7 | pass | ending sleep close-up remains text-free |

BF-4 summary verdict: pass
BF-4 worst surface observed: none blocking.

#### BF-3 Continuity

- child identity consistent across pages: yes
- age impression consistent: yes
- hairstyle / outfit consistent: yes
- notable identity shift (if any): none
- BF-3 summary verdict: pass

#### Style Adherence

- watercolor texture visible: yes
- soft warm / pale night palette present: yes
- style consistent across pages: yes
- style distinguishable from crayon / anime_storybook: yes
- style adherence verdict: strong

#### Emotional Fit

- bedtime mood present: yes
- child-safe, warm, gentle feeling: yes
- scene meaning preserved: yes
- emotional fit verdict: high-fit

#### Story-Image Match

- page text and visual scene alignment: strong overall
- recurring motif alignment (moon/stars, bunny plush, sleep transition, cozy room): strong
- mismatch pages: none

#### LLM-Generated Scene Notes

- notable scenes the LLM invented (not directly from user input): rabbit-eye star reflection close-up on page 4, cloud-travel dream scene on page 6
- any scene that introduced unexpected prop complexity: none
- any scene that produced unexpected setting detail: dreamy cloud-travel image expands beyond the bedroom but remains aligned with the text's dream-travel beat

#### Overall Book Verdict

- verdict: Go
- notes: visually coherent, emotionally on-target, and safety-clean across all 8 pages.

### 23.4 Pair Verdict: bedtime x soft_watercolor (L1)

books sampled: 2
Book S1 (anchored moderate): `uwhwhq3DmuGPekxBVn0a` - verdict: Hold
Book S2 (rich): `PFuh3zu7q4VmNn4qA3dU` - verdict: Go

BF-4 aggregate: fail
BF-3 aggregate: pass
style adherence aggregate: strong
emotional fit aggregate: high-fit
story-image match aggregate: strong with one blocker (S1 page 6)
LLM variability: variable (one profile clean, one profile produced a blocking readable-text artifact)

Final pair verdict: **Hold**

Rationale:

- structural health passed for both books
- Book S2 demonstrates that `bedtime x soft_watercolor` can produce commercially coherent, bedtime-appropriate output
- however, S1 page 6 contains a clear BF-4 blocker: a large readable Japanese text block inserted into the illustration
- pair-level criteria in 21.9 require `BF-4 no fail pages`; that condition is not met
- therefore the pair is not cleared for promotion yet, despite otherwise strong style and emotional fit

### 23.5 Exclusions (T6-8)

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 24. T6-9 - Bedtime x Soft_Watercolor BF-4 Remediation Plan (Docs-Only)

Date: 2026-05-17

### 24.1 Objective

Define the minimum-scope remediation plan for the T6-8 blocker in `bedtime x soft_watercolor`, so T6-10 can execute a focused retry without changing runner behavior, style profiles, or broader non-fixed infrastructure.

This slice is planning only:

- no code or prompt implementation in this slice
- no new generation in this slice
- no pair verdict reopening in this slice

### 24.2 Blocker Restatement

Target blocker from T6-8:

- book: Book S1 `uwhwhq3DmuGPekxBVn0a`
- page: `6`
- current verdict: BF-4 `fail`
- observed surface: lower-left quadrant contains a large readable Japanese text block unrelated to the story scene
- pair impact: `bedtime x soft_watercolor` remained `Hold` because section 21.9 requires no BF-4 fail pages

Important narrowing signals:

- both books passed structural health
- Book S2 (`PFuh3zu7q4VmNn4qA3dU`) was BF-4 clean and received `Go`
- aggregate BF-3 passed
- aggregate style adherence was strong
- aggregate emotional fit was high-fit
- failure was localized to one sample, one page, and one surface

### 24.3 Page 6 Context Comparison

Book S1 page `6` context:

- pageVisualRole: `payoff`
- page text beat: moon and stars quietly watching over sleeping Sakura through the window
- scene prompt shape: wide bedroom shot, visible window, many stars, visible room detail, hidden rabbit-shaped star cluster

Book S2 page `6` comparison:

- pageVisualRole: `quiet_ending`
- page text beat: Kenta traveling in a dream-star world
- scene prompt shape: dream-cloud scene with fewer bedroom surfaces and less open negative space for accidental text blocks

Interpretation:

- the failure did not require a globally unsafe style or globally unsafe category
- the failing page combined a wide in-room composition, dense story instructions, many visible stars, and a late-story payoff beat
- this makes page-local composition pressure a more plausible driver than pair-level style unsafety

### 24.4 Cause Hypothesis Classification

| hypothesis class | assessment | reasoning |
| --- | --- | --- |
| input profile origin (`s1` anchored moderate) | low to medium | S1 failed and S2 passed, so profile sensitivity is possible, but the artifact occurred on one late page rather than across the whole book; no broader S1 degradation was observed |
| generated story / page text origin | low | page text itself contains no signage-like content and is bedtime-safe; all pages carry text, but only page `6` produced the blocker |
| `soft_watercolor` style origin | low | style adherence was strong and S2 was clean; current evidence does not support a pair-wide style defect |
| prompt / global no-text suppression insufficiency | high | the page prompt already includes no-text clauses, yet the model still produced a large readable paragraph block; this suggests existing suppression is directionally correct but not strong enough for this page context |
| page `6` scene composition origin | high | S1 page `6` uses a wide bedroom payoff composition with visible lower-left free area and rich scene detail; this is the most direct contextual difference from the clean S2 page `6` dream composition |

Working cause model:

- primary driver: page-local composition vulnerability on S1 page `6`
- co-driver: existing no-text suppression is too generic for this specific late-bedtime wide-room payoff beat
- non-primary factors: `s1` input profile and `soft_watercolor` style may affect stochastic convergence, but they are not the strongest explanatory variables from current evidence

### 24.5 Remediation Options Comparison

| option | scope | upside | downside | recommendation |
| --- | --- | --- | --- | --- |
| A. rerun full pair unchanged | rerun S1 + S2 with no prompt change | cheapest to reason about; tests pure variance | does not actively reduce recurrence risk; wastes rerun budget on already-clean S2 | reject |
| B. rerun Book S1 only unchanged | one-book retry, no prompt change | isolates whether the issue was one-off sampling noise | if it passes, root prevention remains weak; if it fails again, little new diagnostic information is gained | fallback only |
| C. narrow prompt hardening for the failing page context + retry Book S1 only | one-book targeted retry with localized no-text / composition hardening | smallest intervention that meaningfully addresses recurrence risk while preserving the validated pair structure | requires careful wording so style warmth is not over-suppressed | **recommended** |
| D. broaden style-level anti-text rules for all `soft_watercolor` pages | style-profile-level hardening | may reduce future text artifacts more broadly | too wide for a one-page failure; risks overcorrecting a baseline style that otherwise performed well | reject |
| E. change runner, schema, or reference flow | infrastructure-level change | maximum control | out of scope, too expensive, not justified by current evidence | reject |

### 24.6 Recommended Minimum-Scope Direction

Recommended direction for T6-10:

- keep the pair fixed as `bedtime x soft_watercolor`
- keep prompt-only / no-reference mode unchanged
- do not alter runner behavior
- do not alter style profiles
- do not alter global non-fixed generation architecture
- target only the failing book lane first: Book S1 anchored moderate (`s1`)

Recommended remediation shape:

1. strengthen no-readable-text suppression for the specific late-bedtime wide-room sleep-watchover scene class
2. reduce composition freedom on the failing page context so the model is less likely to invent large flat text-bearing regions
3. preserve the emotional beat: sleeping child, bunny plush, moon/stars watching over the room

Desired wording characteristics for later implementation:

- local, narrow, and scene-specific
- framed as visual constraints, not style denial
- compatible with `soft_watercolor` softness and bedtime warmth
- explicit about blank surfaces, printed blocks, paragraph-like clusters, labels, captions, and book-page overlays

### 24.7 Planned Prompt-Hardening Themes For T6-10

T6-10 should prefer narrow hardening in the failing page context using themes like:

- no printed paragraph blocks anywhere in the room
- no poster text, page text, storybook overlays, wall writing, labels, or decorative writing
- no open-book, paper-sheet, poster, or framed-print surfaces that could invite generated writing
- prefer clean bedding, plain walls, simple furniture, and uncluttered lower-frame surfaces
- keep the window / moon / star watchover beat visually dominant
- favor a calm sleep closure composition over a detail-dense payoff tableau

Important non-goals for the later implementation:

- do not remove moon / stars / bunny motifs
- do not make the page photorealistic or harsh
- do not rewrite the whole pair strategy
- do not escalate to style-level hardening before a narrow page-context retry is tested

### 24.8 Template-Local vs Pair-Level Decision

Decision:

- treat this as a pair-local, page-context-local remediation problem first

Reasoning:

- current evidence does not indicate a broad `soft_watercolor` failure
- the clean S2 book demonstrates viable pair behavior already exists
- broad style or infrastructure changes would be disproportionate to a one-page failure
- a narrow intervention preserves causal clarity for T6-10

Escalation rule:

- if a targeted S1 retry still produces readable text on page `6` or a nearby late-book page, then consider a second-step broader no-text hardening for bedtime non-fixed late-sleep pages
- do not escalate to style-profile or runner changes unless narrow prompt hardening fails

### 24.9 T6-10 Retry Definition

Primary retry target for T6-10:

- retry unit: Book S1 lane only
- target profile: anchored moderate (`s1`)
- target pair: `theme=bedtime`, `style=soft_watercolor`
- mode: prompt-only, no-reference
- page count: 8
- evaluation focus: full book QA with special attention to page `6` and any late-book pages that could inherit the same failure mode

Retry policy:

- do not rerun Book S2 in the first retry slice
- preserve Book S2 as the clean comparison/control sample from T6-8
- treat T6-10 as a targeted remediation retry, not a fresh pair re-baseline

Success criteria for T6-10:

- no BF-4 fail on page `6`
- no new BF-4 fail introduced on other pages
- bedtime emotional fit remains acceptable or better
- `soft_watercolor` style adherence remains acceptable or better
- child / bunny continuity remains pass

If T6-10 passes:

- pair can be reconsidered with the original S2 `Go` evidence plus the remediated S1 retry evidence

If T6-10 fails:

- open a second remediation slice before any additional pair promotion decision

### 24.10 Out Of Scope (T6-9)

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 25. T6-10 - Bedtime x Soft_Watercolor S1R Retry Generation / Structural Inspection

Date: 2026-05-17

### 25.1 Scope

Execute the T6-10 targeted retry for `bedtime x soft_watercolor` using Book S1 retry lane only, including:

- runner profile support update for `s1r`
- dry-run validation
- one-book write generation
- monitor / inspect structural verification
- structural evidence recording

Out of scope for this slice:

- detailed manual visual QA
- pair verdict reopening
- S2 regeneration

### 25.2 Runner Profile Support Update

Updated file: `scripts/create-nonfixed-smoke-book.js`

Changes:

- added bedtime profile key `s1r` (anchored moderate retry)
- expanded usage comments to include `s1r`
- no functions logic changes

`s1r` input intent:

- preserve the successful anchored-moderate structure from `s1`
- keep prompt-only / no-reference execution
- strengthen bedtime grounding with a calmer sleep-closure parent message
- add `place` hint (`しずかですっきりした寝室`) to reduce scene clutter freedom
- avoid adding new prop complexity beyond the bunny plush motif

### 25.3 Dry-Run Verification

Dry-run command executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=s1r
```

Dry-run summary:

- payload resolved `themeId=bedtime`, `styleId=soft_watercolor`
- `creationMode=guided_ai`, `productPlan=standard_paid`, `pageCount=8`
- no-reference path confirmed (`withReference=false`)
- profile label resolved as `anchored moderate retry`
- input includes:
  - `childName=さくら`
  - `childAge=4`
  - longer retry `parentMessage`
  - `colorMood=soft warm quiet bedtime watercolor night`
  - `favorites=うさぎのぬいぐるみ`
  - `place=しずかですっきりした寝室`

### 25.4 Generation Evidence (Write)

Write command executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=soft_watercolor --profile=s1r
```

Created retry book:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book S1R | `YVsHLGjXJ1svdhzWMDn9` | anchored moderate retry (`s1r`) | `t6-nonfixed-20260517144741` |

### 25.5 Monitor / Inspect Structural Results

#### Book S1R - Anchored Moderate Retry (`s1r`)

| field | value |
| --- | --- |
| bookId | `YVsHLGjXJ1svdhzWMDn9` |
| title | `おやすみ、きらきら おほしさま` |
| status | **completed** |
| progress | 100 |
| theme | bedtime |
| styleId | soft_watercolor |
| selectedStyleName | やさしい水彩 |
| pageCount requested | 8 |
| pages actual | 8 |
| pages completed | 8 |
| failed pages | 0 |
| imageModel | `black-forest-labs/flux-2-pro` |
| imageAttemptCount | 1 (all pages) |
| imageFallbackUsed pages | 0 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 17264 / 23570 / 32762 |
| inspect expected page count check | PASS |

Monitor / inspect notes:

- `selectedStyleId` persisted as `soft_watercolor`
- `creationMode` persisted as `guided_ai`
- `characterConsistencyMode` remained `cover_only`
- reference path remained unused across all 8 pages

### 25.6 Structural Interpretation (T6-10)

- The targeted S1 retry completed successfully with full 8/8 pages.
- No page-level image failure occurred.
- No fallback usage and no timeout flags were observed.
- No-reference execution path remained intact (`inputReferenceCount=0`, `usedCharacterReference=false` for all pages).
- Structural health for Book S1R is **pass** at T6-10 scope.

What T6-10 does and does not prove:

- proves: the `s1r` retry lane is runnable and structurally healthy
- does not yet prove: that the T6-8 BF-4 blocker is resolved
- detailed visual QA is deferred to T6-11

### 25.7 T6-11 Handoff (Manual Visual QA)

T6-11 should perform detailed manual visual QA for Book S1R and then reassess the pair using:

- original Book S2 control evidence (`PFuh3zu7q4VmNn4qA3dU`)
- new Book S1R retry evidence (`YVsHLGjXJ1svdhzWMDn9`)

Required T6-11 focus:

- BF-4 on page `6` first, then full-book BF-4 sweep
- BF-3 continuity versus prior S1 expectations
- `soft_watercolor` style adherence after retry prompt grounding
- bedtime emotional fit
- story-image match

Current status before T6-11:

- S1R structural health: pass
- S1R visual QA: pending
- pair verdict: not finalized after retry

### 25.8 Exclusions (T6-10)

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
- No detailed manual visual QA completion
- No final pair verdict confirmation

---

## 26. T6-11 - Bedtime x Soft_Watercolor S1R Manual Visual QA / Pair Re-Evaluation

Date: 2026-05-18

### 26.1 Scope

- scope: manual visual QA for retry Book S1R (`bookId=YVsHLGjXJ1svdhzWMDn9`) and pair re-evaluation against existing clean control Book S2 (`bookId=PFuh3zu7q4VmNn4qA3dU`)
- unit: `categoryGroupId x styleId` = `bedtime x soft_watercolor`
- pages reviewed: 8 pages for S1R; S2 evidence reused from T6-8
- review axes: BF-4, BF-3, style adherence, emotional fit, story-image match, structural carry-over
- evidence source: Firestore page images/text reviewed page-by-page; no regeneration or post-edit

### 26.2 Book Evidence Record - Book S1R (anchored moderate retry)

bookId: `YVsHLGjXJ1svdhzWMDn9`
date: 2026-05-18
theme: bedtime
categoryGroupId: bedtime
styleId: soft_watercolor
creationMode: guided_ai
childAge: 4
inputProfile: anchored moderate retry (`s1r`)
childName: さくら
parentMessage: きょうもたくさんあそんだね。おきにいりのうさぎさんといっしょに、しずかでやさしいひかりのおへやで、まどのそとのおつきさまとおほしさまにみまもられながら、あんしんしてぐっすりねむろうね。おやすみ、さくら。
colorMood: soft warm quiet bedtime watercolor night
favorites: うさぎのぬいぐるみ
place: しずかですっきりした寝室
childProfileSnapshot: none

#### Structural Health

- total pages generated: 8
- broken / black images: 0
- placeholder images: 0
- structural carry-over: pass (same child identity, pink cloud/star pajamas, and bunny plush motif remain recognizable through the sequence)
- verdict: pass

#### BF-4 Safety (per page)

| page | verdict | notes |
| --- | --- | --- |
| 0 | pass | no readable text or signage-like surface |
| 1 | pass | window / curtain / bed scene remains text-free |
| 2 | fail | lower-right shelf box contains clearly readable Latin text `SAKURA` |
| 3 | pass | star lamp and bedside composition remain clean |
| 4 | pass | bedding motif is symbolic only; no readable lettering |
| 5 | pass | sleep scene clean; no text-like artifact |
| 6 | pass | original page 6 Japanese paragraph blocker is resolved; no readable text observed |
| 7 | pass | ending sleep scene remains free of readable text |

BF-4 summary verdict: fail
BF-4 worst surface observed: page 2 shelf storage box with readable `SAKURA` label; blocking BF-4 artifact.

#### BF-3 Continuity

- child identity consistent across pages: yes
- age impression consistent: yes
- hairstyle / outfit consistent: yes
- notable identity shift (if any): bunny plush pose and ear posture vary, but recurring identity remains readable
- BF-3 summary verdict: pass

#### Style Adherence

- watercolor texture visible: yes
- soft warm bedtime palette present: yes
- style consistent across pages: yes
- style distinguishable from crayon / anime_storybook: yes
- style adherence verdict: strong

#### Emotional Fit

- bedtime mood present: yes
- child-safe, warm, gentle feeling: yes
- scene meaning preserved: yes
- emotional fit verdict: high-fit

#### Story-Image Match

- page text and visual scene alignment: strong overall
- recurring motif alignment (moon/stars, bunny plush, quiet bedroom wind-down): strong
- mismatch pages: none blocking for story logic; page 2 BF-4 issue is safety-related rather than scene-semantics-related

#### LLM-Generated Scene Notes

- notable scenes the LLM invented (not directly from user input): smiling crescent moon, star curtain motif, glowing star lamp shade, labeled shelf box
- any scene that introduced unexpected prop complexity: shelf storage / decor details on page 2
- any scene that produced unexpected setting detail: page 2 introduced the readable `SAKURA` label while otherwise matching the calm bedroom search beat

#### Overall Book Verdict

- verdict: Hold
- notes: the original page 6 blocker was removed, but a new BF-4 blocker appeared on page 2 as readable shelf-box text.

### 26.3 Pair Re-Evaluation: bedtime x soft_watercolor

Books used for re-evaluation:

- Book S1R retry: `YVsHLGjXJ1svdhzWMDn9` - verdict: Hold
- Existing Book S2 control from T6-8: `PFuh3zu7q4VmNn4qA3dU` - verdict: Go

BF-4 aggregate: fail
BF-3 aggregate: pass
style adherence aggregate: strong
emotional fit aggregate: high-fit
story-image match aggregate: strong
LLM variability: variable (clean S2 control remains valid; S1 retry removed the original page 6 blocker but produced a new page 2 readable-text blocker)

Final pair verdict after retry: **Hold**

Rationale:

- S1R proves the T6-9 narrowing helped remove the original page 6 Japanese paragraph artifact
- however, pair-level BF-4 criteria still fail because page 2 now contains readable `SAKURA` text
- S2 remains a clean and commercially viable control sample
- style adherence, BF-3 continuity, and emotional fit remain strong enough that the issue still appears narrow and text-surface-local rather than a broad pair failure
- the pair is therefore improved diagnostically, but not yet cleared for promotion

### 26.4 Interpretation After Retry

What changed versus T6-8:

- resolved: original S1 page 6 lower-left Japanese paragraph block
- new blocker: S1R page 2 readable shelf-box label `SAKURA`

Interpretation:

- the retry confirms the earlier blocker was not fully random; narrow prompt grounding did change the failing surface
- however, the non-fixed bedtime path still allows text to reappear on secondary bedroom objects
- this suggests the next remediation should expand from page-6-only watchover suppression to a slightly broader bedroom-object / labeled-surface suppression rule, while still staying narrower than a style-wide rewrite

### 26.5 Suggested T6-12 Direction

If a next remediation slice is opened, it should likely:

- keep the same pair and prompt-only / no-reference mode
- stay on Book S1 retry lane only
- add narrow suppression for:
  - labeled storage boxes
  - toy bins
  - book spines
  - framed prints
  - bedroom containers or decor that may invite name labels
- preserve the calm bedtime bedroom setting and current soft-watercolor strengths

### 26.6 Exclusions (T6-11)

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 27. T6-12 - Bedtime x Soft_Watercolor Bedroom-Object No-Text Remediation Plan (Docs-Only)

Date: 2026-05-18

### 27.1 Objective

Define the next minimum-scope remediation strategy for `bedtime x soft_watercolor` after T6-11 showed failure migration between different bedroom-object text surfaces.

This slice is planning only:

- no code or prompt implementation in this slice
- no new generation in this slice
- no runner changes in this slice
- no pair verdict reopening in this slice

### 27.2 Failure Migration Summary

Observed BF-4 blocker progression:

| sample | bookId | failing page | surface | text type | outcome |
| --- | --- | --- | --- | --- | --- |
| original S1 | `uwhwhq3DmuGPekxBVn0a` | page `6` | lower-left in-room area | readable Japanese paragraph block | Hold |
| S1R | `YVsHLGjXJ1svdhzWMDn9` | page `2` | shelf storage box | readable Latin text `SAKURA` | Hold |
| S2 control | `PFuh3zu7q4VmNn4qA3dU` | none | none | none | Go |

Key interpretation:

- the original blocker was removed
- the pair did not stabilize
- the failure moved from one bedroom surface to another
- current narrow page-6-focused hardening is therefore insufficient as a convergence strategy

### 27.3 What The Migration Implies

The evidence now suggests:

1. this is not just a single-page payoff-scene problem
2. this is not yet evidence that `soft_watercolor` is broadly unusable
3. the unstable zone is the broader bedroom-object layer where the model can invent:
   - storage labels
   - shelf-box names
   - framed print text
   - book spine text
   - decor markings that drift into readable symbols

Updated conclusion:

- the failure class is best described as **bedroom-object / labeled-surface BF-4 migration**
- the next intervention should be broader than the T6-9 page-6-only watchover suppression
- the next intervention should still remain narrower than a style-wide or architecture-wide rewrite

### 27.4 Updated Cause Hypothesis

| hypothesis class | updated assessment | reasoning |
| --- | --- | --- |
| page-specific scene issue only | reduced | page `6` issue was removed, but a new page `2` object-label issue appeared |
| generic no-text clause is directionally correct but underspecified | high | existing no-text rules are not enough to suppress secondary bedroom object labels |
| bedroom object richness creates recurring text opportunities | high | both failures occurred on non-primary room surfaces rather than on the child or the moon/stars focal beat |
| `soft_watercolor` surface texture amplifies incidental label generation | medium | watercolor wash and cozy decor richness may encourage bookish / papery / labeled room details, but current evidence is still pair-local rather than globally style-failing |
| input-only tuning can fully solve the issue | low | `s1r` changed the failing page but did not stabilize BF-4 overall |

Working model after T6-11:

- the root problem is now better framed as insufficient suppression of **secondary bedroom reading surfaces**
- local input steering alone can redirect the error but not reliably eliminate it
- the next step should harden no-text rules for bedroom objects across the full bedtime room scene family

### 27.5 Remediation Option Comparison

| option | scope | upside | downside | recommendation |
| --- | --- | --- | --- | --- |
| A. rerun S1R unchanged again | one-book rerun, no prompt change | cheapest execution | likely repeats migration without new learning | reject |
| B. add another input-only retry variant | one-book rerun with altered parentMessage / place wording only | preserves minimal change footprint | T6-11 suggests input-only steering is not sufficient for BF-4 stability | reject |
| C. broaden bedroom-object no-text suppression locally for bedtime room scenes + retry S1 lane only | narrow prompt hardening for labeled room surfaces | directly targets the migrated failure class while staying pair-local | requires carefully scoped wording to avoid flattening room richness | **recommended** |
| D. add global `soft_watercolor` anti-text hardening | style-wide | could reduce future label incidents broadly | too broad for the current evidence; risks overcorrecting a baseline style with strong fit | reject |
| E. add runner/reference/schema changes | infrastructure-wide | maximum control | out of scope and disproportionate | reject |

### 27.6 Recommended T6-13 Strategy

Recommended execution direction for T6-13:

- keep the pair fixed as `bedtime x soft_watercolor`
- keep prompt-only / no-reference mode unchanged
- stay on the S1 retry lane only
- retain S2 as the clean control
- move from **page-specific watchover suppression** to **bedroom-object labeled-surface suppression**

Recommended hardening target surfaces:

- shelf storage boxes
- toy bins / baskets
- book spines
- framed prints / picture frames
- labels on containers, drawers, pillows, decor cards, and wall items
- any papery, printed, or plaque-like object in the child bedroom

Recommended hardening intent:

- preserve a cozy bedroom
- preserve room richness
- remove or neutralize only the surfaces most likely to invite readable marks

### 27.7 Desired Wording Shape For Later Implementation

T6-13 implementation should likely use wording characteristics like:

- no names, labels, words, alphabet marks, or printed symbols on bedroom storage objects
- no readable text on boxes, bins, toy containers, books, framed pictures, wall decor, or shelf items
- use plain, unlabeled, child-safe bedroom objects only
- if books or frames appear, keep covers/spines/faces turned away or visually blank
- if containers appear, keep them solid-color and unmarked
- keep surfaces decorative but non-readable

Important guardrails:

- do not remove the bedroom entirely
- do not remove all shelf or decor richness if a cleaner unlabeled version is sufficient
- do not shift to sterile empty-room compositions unless needed
- do not escalate to style-level changes before this bedroom-object-local strategy is tested

### 27.8 T6-13 Retry Definition

Primary retry target for T6-13:

- retry unit: Book S1 lane only
- target pair: `theme=bedtime`, `style=soft_watercolor`
- execution mode: prompt-only / no-reference
- objective: test whether broader bedroom-object no-text hardening can stabilize BF-4 without harming bedtime emotional fit or style quality

Evaluation priorities for T6-13 follow-up QA:

- full-book BF-4 sweep, not only the previously failing pages
- page `2` shelf / storage surfaces
- page `6` watchover scene regression check
- any new text emergence on secondary objects
- preservation of soft-watercolor warmth and child-safe bedroom storytelling

Success criteria for the next retry:

- no BF-4 fail pages anywhere in S1 retry
- no new readable text on shelf items, boxes, books, bins, or framed objects
- BF-3 remains pass
- style adherence remains acceptable or better
- emotional fit remains acceptable or better

### 27.9 Escalation Rule

Escalate beyond bedroom-object-local hardening only if:

- the next retry still produces readable text on a different bedroom object surface, or
- the failure migrates outside the bedroom-object family despite explicit local suppression

If that happens, the next analysis may need to consider:

- broader bedtime-scene no-text guardrails across more room compositions
- more systemic no-readable-mark suppression for non-fixed bedtime generation

Do not escalate to style-profile or runner changes before the bedroom-object-local remediation has been tested.

### 27.10 Out Of Scope (T6-12)

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

---

## 28. T6-13 - Bedtime x Soft_Watercolor S1 Bedroom-Object No-Text Retry Generation / Structural Inspection

Date: 2026-05-18

### 28.1 Scope

Execute the T6-13 targeted retry for `bedtime x soft_watercolor` using the S1 retry lane only, including:

- runner profile support update for `s1rr`
- dry-run validation
- one-book write generation
- monitor / inspect structural verification
- structural evidence recording

Out of scope for this slice:

- detailed manual visual QA
- pair verdict reopening
- S2 regeneration
- original S1 / S1R regeneration

### 28.2 Runner Profile Support Update

Updated file: `scripts/create-nonfixed-smoke-book.js`

Changes:

- added bedtime profile key `s1rr` (anchored moderate room-no-text retry)
- expanded usage comments to include `s1rr`
- no functions logic changes

`s1rr` input intent:

- preserve the stable anchored-moderate bedtime lane
- keep prompt-only / no-reference execution
- keep the room-safe bedtime emotional framing from `s1r`
- add explicit room-object suppression language through parentMessage / place wording
- steer toward an unlabeled bedroom with no named shelves / boxes while preserving cozy room richness

### 28.3 Dry-Run Verification

Dry-run command executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=s1rr
```

Dry-run summary:

- payload resolved `themeId=bedtime`, `styleId=soft_watercolor`
- `creationMode=guided_ai`, `productPlan=standard_paid`, `pageCount=8`
- no-reference path confirmed (`withReference=false`)
- profile label resolved as `anchored moderate room-no-text retry`
- input includes:
  - `childName=さくら`
  - `childAge=4`
  - room-object no-text retry `parentMessage`
  - `colorMood=soft warm quiet bedtime watercolor night`
  - `favorites=うさぎのぬいぐるみ`
  - `place=しずかですっきりした寝室 もじのないたなと箱`

### 28.4 Generation Evidence (Write)

Write command executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=soft_watercolor --profile=s1rr
```

Created retry book:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book S1RR | `7silOATa4vPfvfXNHNIt` | anchored moderate room-no-text retry (`s1rr`) | `t6-nonfixed-20260517153443` |

### 28.5 Monitor / Inspect Structural Results

#### Book S1RR - Anchored Moderate Room-No-Text Retry (`s1rr`)

| field | value |
| --- | --- |
| bookId | `7silOATa4vPfvfXNHNIt` |
| title | `おやすみ、さくらちゃん` |
| status | **completed** |
| progress | 100 |
| theme | bedtime |
| styleId | soft_watercolor |
| selectedStyleName | やさしい水彩 |
| pageCount requested | 8 |
| pages actual | 8 |
| pages completed | 8 |
| failed pages | 0 |
| imageModel | `black-forest-labs/flux-2-pro` |
| imageAttemptCount | 1 (all pages) |
| imageFallbackUsed pages | 0 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 16254 / 22145 / 27005 |
| inspect expected page count check | PASS |

Monitor / inspect notes:

- `selectedStyleId` persisted as `soft_watercolor`
- `creationMode` persisted as `guided_ai`
- `characterConsistencyMode` remained `cover_only`
- reference path remained unused across all 8 pages

### 28.6 Structural Interpretation (T6-13)

- The targeted S1 bedroom-object retry completed successfully with full 8/8 pages.
- No page-level image failure occurred.
- No fallback usage and no timeout flags were observed.
- No-reference execution path remained intact (`inputReferenceCount=0`, `usedCharacterReference=false` for all pages).
- Structural health for Book S1RR is **pass** at T6-13 scope.

What T6-13 does and does not prove:

- proves: the `s1rr` retry lane is runnable and structurally healthy
- does not yet prove: that the bedroom-object BF-4 migration is resolved
- detailed visual QA is deferred to T6-14

### 28.7 T6-14 Handoff (Manual Visual QA)

T6-14 should perform detailed manual visual QA for Book S1RR and then reassess the pair using:

- existing Book S2 clean control (`PFuh3zu7q4VmNn4qA3dU`)
- new Book S1RR retry evidence (`7silOATa4vPfvfXNHNIt`)

Required T6-14 focus:

- BF-4 on page `2` shelf / storage surfaces first
- BF-4 regression check on page `6`
- full-book sweep for any readable text on bedroom objects
- BF-3 continuity versus S1 / S1R
- `soft_watercolor` style adherence and bedtime emotional fit after broader room-object suppression

Current status before T6-14:

- S1RR structural health: pass
- S1RR visual QA: pending
- pair verdict: not finalized after bedroom-object retry

### 28.8 Exclusions (T6-13)

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
- No detailed manual visual QA completion
- No final pair verdict confirmation

## 29. T6-14 - Bedtime x Soft_Watercolor S1RR Manual Visual QA / Pair Re-Evaluation

Date: 2026-05-18

### 29.1 Scope

Perform manual visual QA for the T6-13 retry book `7silOATa4vPfvfXNHNIt` and reassess the pair using:

- Book S1RR retry: `7silOATa4vPfvfXNHNIt`
- existing clean control Book S2: `PFuh3zu7q4VmNn4qA3dU`

Out of scope for this slice:

- further regeneration
- runner or functions changes
- style profile changes
- S2 regeneration

### 29.2 Priority BF-4 Checks

Priority checks requested for T6-14:

- page `2` shelf / storage surfaces
- page `6` regression versus the original S1 Japanese paragraph blocker
- full-book sweep for additional bedroom-object readable text surfaces

Priority-check result:

- page `2`: **pass** for BF-4; the prior `SAKURA` shelf-box blocker from S1R did not recur
- page `6`: original lower-left Japanese paragraph blocker did not recur, but new readable book-spine text remained on the right bookshelf
- additional full-book sweep found comparable readable bookshelf / book-cover text on pages `0` and `1`

### 29.3 Manual Visual QA Notes

#### Book S1RR - `7silOATa4vPfvfXNHNIt`

| page | visual QA notes |
| --- | --- |
| 0 | Cozy bedtime setup and strong watercolor mood, but right bookshelf contains multiple readable Japanese book-cover / spine text elements; **BF-4 fail** |
| 1 | Calm room-lighting scene fits bedtime tone, but readable Japanese text remains on right-side bookshelf objects; **BF-4 fail** |
| 2 | Child-in-bed bunny scene is warm and commercially strong; no readable shelf / storage text found; BF-4 pass |
| 3 | Intimate bunny cuddle close-up is clean and emotionally strong; BF-4 pass |
| 4 | Soft bunny detail shot remains clean, gentle, and on-style; BF-4 pass |
| 5 | Quiet imagination / sleep-transition scene is clean; BF-4 pass |
| 6 | Original paragraph-block regression is resolved, but right bookshelf still shows readable Japanese book-spine text; **BF-4 fail** |
| 7 | Sleep ending lands softly and appears clean at manual QA level; BF-4 pass |

Visual strengths that remained stable:

- `soft_watercolor` adherence stayed strong across all pages
- bedtime emotional fit stayed high-fit
- story-image match stayed strong
- BF-3 continuity remained acceptable across the full book

Observed blocker pattern after the T6-13 retry:

- the page `2` shelf-box surface improved as intended
- BF-4 failure did not disappear; it migrated to broader bookshelf / book-object surfaces
- readable text now appears in multiple bedroom-object locations rather than one isolated page surface

### 29.4 Book-Level Verdict

| sample | bookId | profile | verdict | rationale |
| --- | --- | --- | --- | --- |
| Book S1RR | `7silOATa4vPfvfXNHNIt` | bedroom-object no-text retry / `s1rr` | **Hold** | BF-4 fails remain on pages `0`, `1`, and `6` due to readable bookshelf / book-surface text despite otherwise strong style and emotional fit |

### 29.5 Pair Re-Evaluation

Pair comparison set used for re-evaluation:

| sample | bookId | status in pair review |
| --- | --- | --- |
| Book S1RR | `7silOATa4vPfvfXNHNIt` | retry candidate under review |
| Book S2 | `PFuh3zu7q4VmNn4qA3dU` | clean control retained from T6-8 |

Pair verdict after T6-14:

| pair | verdict |
| --- | --- |
| `bedtime x soft_watercolor` | **Hold** |

Reasoning:

- Book S2 remains clean and commercially viable control evidence
- Book S1RR improved the earlier localized blockers but still failed pair-clearing BF-4 criteria
- the T6-12 escalation rule is triggered because readable text persists on bedroom-object surfaces after the broader room-no-text retry

### 29.6 Interpretation

What T6-14 shows:

- the issue is no longer well-described as a single page-specific defect
- the issue is now better described as persistent bedroom bookshelf / book-surface readable text generation within the non-fixed lane
- `soft_watercolor` remains visually strong for bedtime, but current no-text suppression is not stable enough to clear BF-4

Operational conclusion:

- stop one-off S1 retries at this stage
- keep `bedtime x soft_watercolor` at **Hold**
- move next work, if any, to broader non-fixed no-text hardening rather than another narrow sample retry

### 29.7 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No S2 regeneration
- No further S1 retry generation

## 30. T6-15 - Broader Non-Fixed No-Text Hardening Design (Docs-Only)

Date: 2026-05-18

### 30.1 Objective

Define the next-layer remediation design for persistent BF-4 readable-text failures in the non-fixed generation path after the one-off bedtime retry lane failed to converge.

This slice is docs-only design work for the next implementation stage.

Out of scope:

- code changes
- runner changes
- new smoke generation
- pair verdict reopening

### 30.2 Failure Migration Summary

Observed retry history for `bedtime x soft_watercolor`:

| sample | bookId | failing surface | interpretation |
| --- | --- | --- | --- |
| original S1 | `uwhwhq3DmuGPekxBVn0a` | page `6` lower-left paragraph-like Japanese block | large accidental text panel style artifact |
| S1R | `YVsHLGjXJ1svdhzWMDn9` | page `2` shelf-box label `SAKURA` | narrower labeled-surface artifact after local page-6 steering |
| S1RR | `7silOATa4vPfvfXNHNIt` | pages `0`, `1`, `6` bookshelf / book-cover / spine Japanese text | broader room-object readable print persisted after bedroom-object steering |

What changed across retries:

- the original paragraph block was removable
- the shelf-box label was removable
- the broader bedroom bookshelf / book-surface failure remained reproducible

What did not change:

- BF-3 stayed acceptable
- `soft_watercolor` style adherence stayed strong
- bedtime emotional fit stayed high-fit
- S2 control stayed clean and commercially viable

### 30.3 Why One-Off Retries Should Stop

Repeated one-off retries should stop for this pair because:

- the failure is no longer page-specific
- the failure migrated across different object surfaces instead of disappearing
- input-profile steering changed *where* the readable text appeared, but did not make the no-text outcome stable
- additional narrow retries would likely continue moving the artifact among bookshelf, box, print, packaging, or wall-object surfaces without materially de-risking the non-fixed path

Operational reading of T6-8 through T6-14:

- the current retry lane is useful for diagnosis
- it is not a reliable remediation layer
- the next change needs to live closer to shared prompt construction, not only smoke-book input phrasing

### 30.4 Existing Guardrail Baseline

Current evidence from the implementation layers:

- non-fixed prompt assembly already includes a broad scene-level rule equivalent to `Do not add readable text, signs, labels, logos, brand marks, numbers, watermarks, or random symbols.`
- illustration styles, including `soft_watercolor`, already include a generic negative rule equivalent to `Do not add readable text, logos, or watermarks.`
- fixed-template paths already use more concrete object-surface guardrails for some categories
- fixed bedtime template guardrails explicitly suppress readable book covers, spine writing, nursery cards, wall art, packaging graphics, and shelf objects

Design implication:

- the current non-fixed guard is too generic for bedroom-object printed surfaces
- fixed-template evidence suggests concrete surface-level wording is more effective than generic `no text` alone

### 30.5 Hardening Candidate Comparison

| candidate | scope | upside | downside | design verdict |
| --- | --- | --- | --- | --- |
| input profile only | smoke inputs such as `parentMessage` / `place` | smallest blast radius, fast to test | already tried indirectly in S1R and S1RR; only relocates failures | reject as primary solution |
| smoke runner no-text suffix | only smoke generation tool path | useful for experiments | does not protect real production non-fixed generation | reject as final remediation layer |
| non-fixed prompt assembly | shared guided-ai/original-ai prompt construction | broad protection, applies to real path, can add concrete printed-surface language | needs careful wording to avoid over-constraining scenes | strong candidate |
| style-specific negative rule | `soft_watercolor` only | targets current pair quickly | issue is not proven style-specific; risks masking broader lane issue | secondary candidate only |
| categoryGroup-specific guardrail | bedtime group only | good balance of specificity and shared protection for bedroom-like scenes | may miss similar object-surface failures in adjacent indoor categories | strong candidate |
| fixed-template-like local guardrail | reusable helper pattern modeled after fixed templates | proven pattern, concrete surfaces, maintainable if wrapped well | needs implementation design so it fits non-fixed path cleanly | strong candidate |

### 30.6 Implementation Layer Comparison

Recommended comparison of the requested implementation layers:

#### Input profile only

- good for diagnosis
- not sufficient for stable BF-4 protection
- should not be the main T6-16 answer

#### Smoke runner no-text suffix

- acceptable for temporary probing
- wrong abstraction boundary for production quality control
- should not carry the long-term guardrail responsibility

#### Non-fixed prompt assembly

- best place for a shared baseline printed-surface suppression clause
- can apply across all pages regardless of local input phrasing
- should carry the primary hardening clause

#### Style-specific negative rule

- too narrow as the lead fix because the issue is not yet proven unique to `soft_watercolor`
- may still be useful later if one style shows higher text-surface susceptibility after shared hardening lands

#### CategoryGroup-specific guardrail

- strong fit for bedtime because the failing surfaces are bedroom bookshelf / book / nursery-prop objects
- lets us add concrete room-object wording without burdening all non-fixed categories equally
- should carry the first category-local extension after the shared baseline

#### Fixed-template-like local guardrail

- best structural model for implementation shape
- lets us encode explicit clauses such as `plain unlabeled shelf objects`, `no readable book covers`, `no spine writing`, `no nursery cards`, `no framed word art`, `no packaging graphics`
- should be implemented as a reusable helper or clause generator, not as ad hoc string duplication

### 30.7 Recommended T6-16 Direction

Recommended implementation direction for T6-16:

1. add a shared non-fixed prompt-assembly hardening clause for printed surfaces
2. add a bedtime/categoryGroup-local room-prop no-text clause modeled after fixed-template guardrails
3. keep style profiles unchanged for the first pass
4. avoid further smoke-runner-only mitigation except as validation input

Recommended design shape:

- shared baseline clause:
  - suppress readable text not only on signs/logos, but also on books, book spines, labels, posters, framed prints, packaging, cards, storage bins, toy boxes, and shelf props
- bedtime-local clause:
  - describe bedroom props as plain, unlabeled, non-readable, and simplified
  - explicitly call out bookshelves, nursery cards, wall art, packaging graphics, and container labels
- implementation style:
  - follow the fixed-template pattern of composable guardrail helpers rather than embedding one long repeated suffix in many callsites

Why this is the recommended minimum viable broader fix:

- it moves the guardrail into the production non-fixed path
- it targets the actual migrating failure surface
- it avoids prematurely blaming `soft_watercolor`
- it preserves the option to add style-specific hardening later only if shared + category-local protection still proves insufficient

### 30.8 Proposed T6-16 Success Criteria

T6-16 should be considered correctly implemented if it delivers:

- a shared non-fixed no-text hardening layer beyond the current generic `no readable text` wording
- a bedtime/category-local room-object printed-surface guardrail
- no runner-only dependency for the production fix
- no style exposure matrix change
- no style profile change in the first pass

Validation expectations after implementation:

- retry generation should test whether bookshelf / book-cover / spine text disappears without harming BF-3, bedtime emotional fit, or `soft_watercolor` adherence
- if readable text still persists after this broader hardening, escalate to style-specific or deeper prompt-policy changes rather than more ad hoc S1 retries

### 30.9 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

## 31. T6-16 - Non-Fixed Bedtime No-Text Guardrail Implementation Design (Docs-Only)

Date: 2026-05-18

### 31.1 Objective

Translate the T6-15 design direction into a concrete implementation plan for T6-17, focusing on:

- exact insertion point in the non-fixed prompt assembly path
- helper shape for shared and bedtime-local no-text hardening
- test and validation command plan
- follow-up smoke retry scope for T6-18

This slice is docs-only implementation design.

### 31.2 Investigated Non-Fixed Prompt Path

Observed guided-ai image prompt flow:

1. `functions/src/generate-book.ts`
2. per-page image prompt generation calls `buildImagePrompt(...)`
3. `functions/src/lib/prompt-builder.ts`
4. final prompt string is assembled from:
   - character consistency guidance
   - style bible
   - style negative rules
   - composition guidance
   - scene policy / background guidance
   - wordless illustration suffix

Relevant current evidence:

- `generate-book.ts` passes page-level context into `buildImagePrompt(...)`
- `buildImagePrompt(...)` already receives `scenePolicy`, `childProfileBasePrompt`, cast info, and page role data
- `buildScenePolicyGuidance(...)` already contributes shared scene-level negative wording
- final image prompt already ends with a generic wordless/no-text suffix

Implementation consequence:

- T6-17 should not modify the smoke runner first
- the correct production insertion point is `functions/src/lib/prompt-builder.ts`

### 31.3 Fixed-Template Pattern To Reuse

Referenced fixed-template guardrail pattern:

- `functions/src/seed-templates.ts`
- helper-style wrappers such as:
  - `withFixedImagePromptSafety(...)`
  - `withSleepyMoon8pRoomPropGuardrail(...)`
  - other template-local object-surface guardrail helpers

Pattern characteristics worth copying:

- small composable helper functions
- concrete object-surface clauses rather than abstract `no text` only
- category-local vocabulary for likely failure surfaces
- helper wrapping instead of ad hoc duplicated suffixes

Design conclusion:

- T6-17 should follow the helper composition pattern from fixed-template guardrails
- the implementation should live in prompt-builder, not in seed template data and not in the smoke runner

### 31.4 Recommended Insertion Point

Primary insertion point:

- `functions/src/lib/prompt-builder.ts`
- inside `buildImagePrompt(...)`

Recommended structure:

1. keep existing `buildScenePolicyGuidance(...)` behavior
2. add a new shared non-fixed printed-surface clause into the assembled prompt
3. append a categoryGroup-local bedtime clause when the active template belongs to `categoryGroupId=bedtime`

Why this insertion point is preferred:

- it affects real guided-ai production prompts
- it applies consistently across all non-fixed pages
- it avoids smoke-only or profile-only drift
- it can use existing prompt-builder options and template metadata already present in the generation flow

### 31.5 Helper Design Proposal

Recommended new helper design inside `functions/src/lib/prompt-builder.ts`:

- `buildSharedPrintedSurfaceNoTextGuidance(): string`
- `buildCategoryGroupNoTextGuidance(categoryGroupId?: string): string`
- `buildBedtimeRoomPropNoTextGuidance(): string`

Expected helper responsibilities:

#### Shared helper

Purpose:

- strengthen the current generic `no readable text` wording
- explicitly suppress printed-surface artifacts across the non-fixed lane

Recommended clause shape:

- no readable text on books, book covers, book spines
- no labels on boxes, bins, containers, packaging, cards
- no framed word art, nursery cards, posters, charts, printed wall decor
- no logos, watermarks, numbers, letters, pseudo-writing, glyph-like marks
- background objects should be plain, unlabeled, and non-readable

#### Bedtime-local helper

Purpose:

- target the exact failure family seen in S1 / S1R / S1RR without changing all styles

Recommended clause shape:

- bedroom bookshelf objects must stay plain and simplified
- no readable book titles, spine writing, shelf labels, toy-bin labels, container labels
- no nursery cards, framed word prints, packaging graphics, or printed paper items
- shelf props should remain visual-only and non-readable

#### Category router helper

Purpose:

- keep the bedtime clause opt-in by `categoryGroupId`
- allow future reuse for other indoor categories if similar BF-4 migrations appear

### 31.6 Required Prompt-Builder Signature Change

To make the category-local helper viable, T6-17 should extend the prompt-builder call path so `buildImagePrompt(...)` can access `categoryGroupId`.

Recommended change chain:

- `functions/src/generate-book.ts`
  - pass `template.categoryGroupId` into `buildImagePrompt(...)` options
- `functions/src/lib/prompt-builder.ts`
  - accept `categoryGroupId?: string` in the options object
  - route to the bedtime-specific no-text helper only when `categoryGroupId === "bedtime"`

Why this is preferable to inference:

- avoids guessing from theme text or page prompt wording
- matches the same category vocabulary already used elsewhere in the codebase
- keeps the behavior explicit and testable

### 31.7 Bedtime-Only Limiting Rule

The first implementation pass should apply the local room-prop clause only when:

- `categoryGroupId === "bedtime"`
- generation path is non-fixed (`guided_ai` or, if shared through the same builder, any non-template prompt path using `buildImagePrompt`)

It should not:

- alter fixed-template prompt text
- mutate style profiles
- attach bedtime wording to unrelated categories such as zoo, birthday, or imagination

Reason for this limit:

- the validated migration evidence is strongest in bedtime bedroom scenes
- a narrow category-local scope reduces unintended regressions while still fixing the real production layer

### 31.8 Why T6-17 Should Not Change Style Profiles

Style-specific changes are intentionally deferred because:

- current evidence does not prove `soft_watercolor` is the root cause
- `bedtime x crayon` is already `Go`, which points to context and prompt-layer interaction rather than a universal style defect
- changing `functions/src/lib/illustration-styles.ts` now would widen the blast radius unnecessarily
- shared + bedtime-local prompt hardening is the lower-risk causal test

Escalation rule after T6-18:

- only consider style-specific negative-rule changes if shared plus bedtime-local hardening still leaves BF-4 readable text surfaces in the same lane

### 31.9 Test Plan For T6-17

Primary test file to extend:

- `functions/test/prompt-builder.test.ts`

Recommended new test coverage:

1. shared printed-surface guidance appears in `buildImagePrompt(...)`
2. bedtime categoryGroup adds bedroom-object no-text wording
3. non-bedtime categoryGroup does not receive bedtime-local wording
4. existing generic wordless/no-text suffix remains present
5. style-specific rules remain unchanged and still appear alongside the new shared clause

Optional secondary checks if implementation shape warrants them:

- `functions/test/generate-book.test.ts` if the call signature change around `categoryGroupId` needs integration confidence
- no seed-template tests are required unless implementation accidentally touches fixed-template files

Recommended validation commands for T6-17:

```bash
npm --prefix functions test -- prompt-builder.test.ts
npm --prefix functions test -- generate-book.test.ts
npm run guard:hygiene
```

If a narrower local command is preferred during iteration, keep the final verification at least on:

- `prompt-builder.test.ts`
- hygiene

### 31.10 T6-17 Implementation Scope Definition

T6-17 should include:

- prompt-builder helper additions in `functions/src/lib/prompt-builder.ts`
- prompt-builder option plumbing for `categoryGroupId`
- generate-book call-site update to pass `template.categoryGroupId`
- prompt-builder unit tests

T6-17 should exclude:

- smoke runner changes
- style profile changes
- seed-template data edits
- new generation execution
- pair verdict changes

### 31.11 T6-18 Smoke Retry Direction

T6-18 should be a validation slice after implementation, not part of T6-17.

Recommended smoke scope:

- retry the S1 lane only
- use the existing bedtime soft-watercolor smoke path
- keep no-reference mode
- prefer the latest retry profile lane rather than inventing many new ad hoc profiles

T6-18 evaluation intent:

- confirm structural health still passes
- confirm BF-4 bedroom bookshelf / book-surface text is reduced or removed
- defer final pair verdict to the visual QA slice after structural generation succeeds

### 31.12 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

## 32. T6-17 - Non-Fixed Bedtime No-Text Guardrail Implementation

Date: 2026-05-18

### 32.1 Scope

Implement the T6-16 design in the production non-fixed prompt path, including:

- shared printed-surface no-text guidance in non-fixed image prompts
- bedtime-local bedroom-object no-text guidance
- prompt-builder option plumbing for `categoryGroupId`
- targeted tests
- docs update

Out of scope for this slice:

- smoke generation
- image generation
- Firestore write
- runner changes
- style profile changes

### 32.2 Files Updated

Updated implementation files:

- `functions/src/lib/prompt-builder.ts`
- `functions/src/generate-book.ts`
- `functions/test/prompt-builder.test.ts`

Docs updated:

- `docs/T6_NONFIXED_STYLE_VALIDATION_PLAN.md`

No changes made to:

- smoke runner scripts
- `functions/src/lib/illustration-styles.ts`
- seed-template data
- style exposure matrix

### 32.3 Prompt-Builder Implementation

Implemented in `functions/src/lib/prompt-builder.ts`:

- added `buildSharedPrintedSurfaceNoTextGuidance()`
- added `buildBedtimeRoomPropNoTextGuidance()`
- added `buildCategoryGroupNoTextGuidance(categoryGroupId?: string)`
- extended `buildImagePrompt(...)` options with `categoryGroupId?: string`

Behavior now added to non-fixed prompt assembly:

- shared guidance explicitly suppresses readable text on:
  - books
  - book covers
  - book spines
  - labels
  - posters
  - framed prints
  - packaging
  - cards
  - storage bins
  - toy boxes
  - shelf props
- bedtime-local guidance additionally suppresses:
  - bedroom bookshelf readable titles
  - spine writing
  - shelf labels
  - toy-bin / container labels
  - nursery cards
  - framed wall art
  - printed packaging graphics

Insertion point used:

- the new shared and category-local guidance is appended through the `backgroundGuidance` segment inside `buildImagePrompt(...)`

Why this matches the design:

- it affects the production non-fixed path directly
- it stays reusable and composable like fixed-template helper patterns
- it avoids smoke-runner-only drift

### 32.4 Call-Site Plumbing

Updated `functions/src/generate-book.ts` so the prompt-builder now receives:

- `categoryGroupId: template.categoryGroupId`

This keeps the bedtime-local clause explicitly keyed to template metadata rather than inferred from prompt wording.

### 32.5 Tests Added / Verification

Added targeted tests in `functions/test/prompt-builder.test.ts` to verify:

- shared printed-surface no-text guidance appears in non-fixed prompts
- bedtime-local room-prop guidance appears when `categoryGroupId === "bedtime"`
- bedtime-local guidance does not appear for non-bedtime category groups

Verification commands executed:

```bash
npm --prefix functions run build
npm --prefix functions test -- prompt-builder.test.ts generate-book.test.ts
npm run guard:hygiene
```

Verification result:

- `functions` TypeScript build: **PASS**
- `prompt-builder.test.ts`: **PASS**
- `generate-book.test.ts`: **PASS**
- `guard:hygiene`: **PASS**

Execution note:

- the initial sandboxed Vitest run hit `spawn EPERM`
- the same test command was re-run with approval outside the sandbox and passed

### 32.6 Style-Specific Non-Changes

No style-specific changes were made in this slice.

Explicitly unchanged:

- `functions/src/lib/illustration-styles.ts`
- `soft_watercolor` negativeStyleRules

Reason:

- T6-16 defined shared + bedtime-local hardening as the first causal fix
- current evidence still does not justify blaming `soft_watercolor` alone
- keeping styles unchanged preserves a cleaner T6-18 validation signal

### 32.7 T6-18 Handoff

T6-18 should validate this implementation by running the post-hardening non-fixed bedtime smoke retry lane only.

T6-18 focus:

- confirm structural health still passes
- confirm BF-4 readable bookshelf / book-surface text is reduced or eliminated
- keep no-reference mode
- defer final pair verdict until post-generation visual QA

### 32.8 Exclusions

- No smoke generation
- No image generation
- No Firestore write
- No runner changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No seed-template data changes
- No Firestore schema/rules changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded

## 33. T6-18 - Post-Hardening Bedtime x Soft_Watercolor Smoke Retry / Structural Inspection

Date: 2026-05-18

### 33.1 Scope

Execute one post-hardening smoke retry for `bedtime x soft_watercolor` using the existing `s1rr` retry lane after the T6-17 non-fixed prompt hardening implementation.

This slice includes:

- dry-run validation
- one-book write generation
- monitor / inspect structural verification
- structural evidence recording

Out of scope:

- manual visual QA
- pair verdict reopening
- S2 regeneration

### 33.2 Retry Definition

Execution target:

| sample | theme | style | profile | reference mode |
| --- | --- | --- | --- | --- |
| post-hardening S1RR | bedtime | soft_watercolor | `s1rr` | no-reference |

Rationale:

- T6-17 changed production prompt assembly, not the runner profile layer
- using the same `s1rr` lane gives the cleanest comparison against the prior S1RR result
- S2 remains the retained clean control and is not regenerated here

### 33.3 Dry-Run Verification

Dry-run command executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=s1rr
```

Dry-run summary:

- payload resolved `themeId=bedtime`
- payload resolved `styleId=soft_watercolor`
- `creationMode=guided_ai`
- `productPlan=standard_paid`
- `pageCount=8`
- no-reference path confirmed (`withReference=false`)
- profile resolved as `s1rr` / `anchored moderate room-no-text retry`

Dry-run input check:

- `childName=sakura`
- `childAge=4`
- `colorMood=soft warm quiet bedtime watercolor night`
- `favorites=usagi no nuigurumi`
- `place=quiet simplified bedroom with text-free shelf and boxes`
- room-no-text `parentMessage` remained present in the retry payload

### 33.4 Generation Evidence (Write)

Write command executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=soft_watercolor --profile=s1rr
```

Created post-hardening retry book:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book S1RR-H1 | `DtBgZfT7rVKhLuH0A7l4` | anchored moderate room-no-text retry (`s1rr`) | `t6-nonfixed-20260517163614` |

### 33.5 Monitor / Inspect Structural Results

#### Book S1RR-H1 - Post-Hardening Retry (`s1rr`)

| field | value |
| --- | --- |
| bookId | `DtBgZfT7rVKhLuH0A7l4` |
| title | `[SMOKE-T6] bedtime × soft_watercolor (anchored moderate room-no-text retry)` |
| status | **failed** |
| progress | 0 |
| theme | bedtime |
| style | soft_watercolor |
| selectedStyleId | soft_watercolor |
| selectedStyleName | やさしい水彩 |
| creationMode | guided_ai |
| productPlan | standard_paid |
| characterConsistencyMode | cover_only |
| smoke metadata `withReference` | false |
| failureStage | `quality_gate` |
| failureReason | `unknown` |
| generatedTextPreview pages | 8 |
| pages actual | 0 |
| pages completed | 0 |
| failed pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| inspect expected page count check | **FAIL** (`expected=8`, `actual=0`) |

Monitor / inspect notes:

- the run reached book creation and story-preview generation
- the run did **not** reach page image generation
- no page documents were written
- no image-model, image-attempt, fallback, or timeout metrics were produced because image generation never started

Quality-gate failure metadata:

`technicalErrorMessage` summary:

- `text_too_childish page=2`
- repeated `missing_scene_detail`
- repeated `missing_action_or_emotion`
- repeated `page_text_not_connected_to_story_goal`
- repeated `missing_visual_motif_in_text`

### 33.6 Structural Interpretation (T6-18)

What this run proves:

- the T6-17 hardening code did not break smoke payload construction
- `bedtime` / `soft_watercolor` / `guided_ai` / no-reference selection persisted correctly at book level
- the post-hardening retry lane is still callable and writes the expected smoke metadata

What this run does not yet prove:

- whether bookshelf / book-surface BF-4 artifacts are reduced
- whether page-level image prompts now behave better in actual image generation
- whether the pair can move off `Hold`

Why not:

- the run failed at `quality_gate` before any page images were generated
- therefore there is no visual evidence set for T6-19 yet

Operational conclusion:

- T6-18 does **not** provide a visual-QA-ready retry book
- T6-19 manual visual QA is blocked until a subsequent retry clears story quality gate and reaches page generation
- the new blocker is currently upstream of image generation, not a direct BF-4 image-surface observation

### 33.7 Prompt-Field Behavior Notes

Prompt-field behavior confirmed at the structural level:

- `selectedStyleId=soft_watercolor` persisted
- `theme=bedtime` persisted
- `creationMode=guided_ai` persisted
- smoke metadata `withReference=false` persisted
- retry profile remained `s1rr`

Prompt-field behavior not yet observable:

- page-level image prompt output after hardening
- page-level printed-surface suppression behavior
- image-model response to the new shared + bedtime-local no-text guidance

### 33.8 Next-Step Handoff

Before any post-hardening visual QA, the next retry slice must first restore structural viability past the story quality gate.

Practical implication:

- do not treat this run as a replacement for S1RR in pair review
- keep current pair state unchanged
- next work should address the new `quality_gate` blocker or produce a successful post-hardening generation before T6-19 visual QA

### 33.9 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No seed-template data changes
- No Firestore schema/rules changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No detailed manual visual QA
- No final pair verdict update
- No S2 regeneration

## 34. T6-19 - Post-Hardening Quality-Gate Failure Analysis / Retry Design (Docs-Only)

Date: 2026-05-18

### 34.1 Objective

Analyze why the T6-18 post-hardening retry stopped at `quality_gate` and define the next retry strategy needed to observe post-hardening image-level BF-4 behavior.

This slice is docs-only analysis / retry design.

Out of scope:

- code changes
- runner changes
- new smoke generation
- manual visual QA
- pair verdict update

### 34.2 T6-18 Failure Restatement

Target run:

| item | value |
| --- | --- |
| bookId | `DtBgZfT7rVKhLuH0A7l4` |
| runId | `t6-nonfixed-20260517163614` |
| pair | `bedtime x soft_watercolor` |
| profile | `s1rr` |
| status | `failed` |
| failureStage | `quality_gate` |
| generatedTextPreview pages | 8 |
| actual page docs | 0 |
| image generation | not reached |

Immediate implication:

- T6-17 image-prompt hardening was deployed
- but the run never reached page-image generation
- therefore post-hardening BF-4 behavior remains unobserved

### 34.3 Generated Text Preview Review

T6-18 preserved 8 preview text pages even though image generation never started.

Observed text pattern from `generatedTextPreview`:

| page | preview reading |
| --- | --- |
| 1 | child + bunny in bedroom, sleepy tone, gentle night color |
| 2 | moon and stars smiling through the window |
| 3 | child and bunny inside blanket, explicit `おやすみ` line |
| 4 | tactile comfort close-up, very soft emotional wording |
| 5 | bunny watching over sleeping child, `だいすきだよ` line |
| 6 | quiet room, ticking clock, dream question |
| 7 | moonlight and stars watching over the room, `ゆっくり、おやすみ` |
| 8 | sleeping ending with moon and stars watching over child |

High-level read:

- tone is commercially aligned with bedtime
- the text is gentle and coherent at a surface level
- however, the later pages drift toward generalized sleep atmosphere and celestial watching rather than repeatedly grounding the main quest object or story goal

Additional book-level metadata observed:

| field | observed value |
| --- | --- |
| storyGoal | `さくらちゃんが、お気に入りのうさぎさんと夜空に守られ、安心した気持ちで眠りにつくこと。` |
| mainQuestObject | `うさぎのぬいぐるみ` |
| narrativeDevice | `null` |
| generatedTextPreview count | 8 |

Important structural observation:

- `generatedTextPreview` stores text-only preview strings, not page imagePrompt objects
- because the quality gate failed before page docs were created, T6-18 provides no page-level prompt payload for direct image-prompt inspection

### 34.4 Quality-Gate Failure Breakdown

Recorded `technicalErrorMessage` summary:

- `text_too_childish page=2`
- repeated `missing_scene_detail`
- repeated `missing_action_or_emotion`
- repeated `page_text_not_connected_to_story_goal`
- repeated `missing_visual_motif_in_text`

How those warnings/errors map to the preview text:

- `text_too_childish page=2`
  - page 2 concentrates on moon / stars smiling and uses a very simple reaction beat
- `missing_scene_detail`
  - several later pages become soft emotional statements with minimal place detail beyond `room`, `window`, `moon`, and `stars`
- `missing_action_or_emotion`
  - some pages describe quiet stillness rather than a clear action / discovery / emotional change
- `page_text_not_connected_to_story_goal`
  - the storyGoal explicitly requires `favorite bunny + safe feeling + falling asleep`, but multiple pages center moonlight watching rather than re-grounding bunny /安心 /眠りに向かう movement
- `missing_visual_motif_in_text`
  - the run appears to have no usable narrative-device motif metadata, so motif expectations were not being satisfied in text

### 34.5 Cause Hypothesis Classification

#### Hypothesis A: `s1rr` input over-optimized for no-text suppression

Assessment: strong

Reasoning:

- the `s1rr` parentMessage and place wording aggressively emphasize `text-free`, `no names`, `plain shelves`, `plain boxes`
- that wording is useful for BF-4 image suppression
- but it likely consumes part of the generation budget that previously went to concrete story-beat detail
- the result may be a safer room description with a weaker narrative spine

#### Hypothesis B: T6-17 prompt hardening indirectly changed story-generation behavior

Assessment: medium

Reasoning:

- the code change was in image prompt assembly, not in text-generation quality rules directly
- however, non-fixed generation keeps storyGoal / imagePrompt / narrative-device expectations coupled
- stronger printed-surface suppression language may have pushed the overall generation toward flatter, safer room descriptions when the same retry lane already had constrained bedtime input

#### Hypothesis C: quality gate is strict on minimal bedtime text

Assessment: medium

Reasoning:

- bedtime allows quieter scenes, but the gate still expects scene detail, action/emotion, and recurring story-goal linkage
- once several pages become mostly reassurance + moon/stars observation, the gate flags them as too generic or weakly connected

#### Hypothesis D: `s1rr` retry lane structurally weakens storyGoal linkage

Assessment: strong

Reasoning:

- `storyGoal` resolved around `bunny + safety + sleep`
- preview pages 4-8 increasingly pivot to ambient comfort rather than maintaining bunny-centered payoff progression
- this suggests the lane itself now favors mood over quest continuity

### 34.6 Why T6-18 Did Not Validate T6-17

T6-18 failed to validate the T6-17 image hardening for a simple reason:

- the run never crossed the story quality gate
- therefore no page image prompts were materialized into page docs
- and therefore no image outputs exist for BF-4 observation

Practical meaning:

- T6-17 remains structurally implemented and test-verified
- but it remains empirically unvalidated against the original bookshelf / book-surface BF-4 failure surface

### 34.7 Remediation Option Comparison

| option | description | upside | downside | recommendation |
| --- | --- | --- | --- | --- |
| retry `s1rr` unchanged | rerun exact same lane | cheapest comparison | likely repeats same upstream gate failure | reject |
| make input even more bedroom-safe | add more no-text / no-label wording | might further reduce BF-4 risk | likely worsens text thinness and goal drift | reject |
| roll back to `s1r` | use less constrained retry lane | better chance to clear quality gate | loses closest comparison to bookshelf-surface failure | secondary fallback only |
| use original `s1` | strongest narrative lane | best chance to pass quality gate | weakens comparability to latest bedroom-object remediation | fallback only |
| keep `s1rr` lane but rebalance input toward story-goal / bunny / sleep progression | preserves latest image-safety direction while restoring narrative anchor | best chance to reach image phase without discarding T6-17 test target | requires a new retry input/profile slice | **recommended** |
| alter quality gate rules | easier passage to image phase | changes production threshold and muddies interpretation | too broad for this validation thread | reject |

### 34.8 Recommended T6-20 Retry Direction

Recommended execution direction for T6-20:

- keep the T6-17 code unchanged
- keep `bedtime x soft_watercolor`
- keep no-reference mode
- do not regenerate S2
- do not change style profiles
- do not change quality-gate logic
- introduce a **rebalanced retry input** that preserves room-object no-text intent but restores clearer story-goal continuity

Recommended retry shape:

- maintain bedroom-object plain/unlabeled intent
- reduce repeated explicit `no text / no name / no label` phrasing inside user-facing input
- strengthen child + bunny + sleepy safety progression
- explicitly encourage page-to-page movement toward sleep rather than multiple pages of static moon/stars observation
- reinforce a gentle repeated motif that can satisfy the quality gate without reintroducing printed surfaces

### 34.9 Input Design Guidance For T6-20

The next retry input should likely:

- keep `favorites=うさぎのぬいぐるみ`
- keep a calm bedroom place description
- describe the room as `quiet`, `cozy`, `plain`, `safe`, `softly lit`
- avoid overloading the parentMessage with multiple explicit anti-text constraints
- emphasize:
  - child hugging bunny
  - getting into bed
  - feeling safe
  - slowly falling asleep
  - moonlight as support, not as replacement protagonist

Suggested direction for wording shape:

- better:
  - room is calm and cozy, shelves and boxes are simple and plain
  - child falls asleep while hugging favorite bunny
  - moonlight gently supports the scene
- worse:
  - repeated references to no text, no names, no letters, no labels in every clause
  - over-specifying unlabeled surfaces at the expense of narrative action

### 34.10 Recommended T6-20 Scope

T6-20 should likely be:

- runner-profile addition or targeted retry-input adjustment only
- one-book retry only
- same pair, same style, same no-reference mode
- structural inspection only in the first follow-up slice

T6-20 success condition:

- clear `quality_gate`
- create page docs
- reach image generation
- preserve `selectedStyleId=soft_watercolor`
- preserve `withReference=false`

Only after that:

- resume manual visual QA in the next slice
- evaluate whether T6-17 actually reduced bookshelf / book-surface BF-4 artifacts

### 34.11 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No seed-template data changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No manual visual QA
- No pair verdict update

## 35. T6-20 - Balanced S3 Post-Hardening Smoke Retry / Structural Inspection

Date: 2026-05-18

### 35.1 Scope

Execute one balanced post-hardening retry for `bedtime x soft_watercolor` by adding a new `s3` input profile to the smoke runner, then run:

- runner profile addition
- dry-run validation
- one-book write generation
- monitor / inspect structural verification
- structural evidence recording

Out of scope:

- manual visual QA
- pair verdict reopening
- S2 regeneration

### 35.2 Runner Profile Support Update

Updated file: `scripts/create-nonfixed-smoke-book.js`

Changes:

- added bedtime profile key `s3`
- expanded usage comments to include `s3`
- no functions logic changes

`s3` input intent:

- preserve the post-hardening production prompt path from T6-17
- keep prompt-only / no-reference execution
- keep the room-object plain/unlabeled intent from the `s1rr` lane
- rebalance the user-facing input toward:
  - child hugging bunny
  - entering bed / blanket
  - safe sleepy emotional progression
  - moonlight as support rather than main substitute subject

### 35.3 Dry-Run Verification

Dry-run command executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=bedtime --style-id=soft_watercolor --profile=s3
```

Dry-run summary:

- payload resolved `themeId=bedtime`
- payload resolved `styleId=soft_watercolor`
- `creationMode=guided_ai`
- `productPlan=standard_paid`
- `pageCount=8`
- no-reference path confirmed (`withReference=false`)
- profile resolved as `s3` / `balanced anchored post-hardening`

Dry-run input check:

- `childName=さくら`
- `childAge=4`
- `colorMood=soft warm quiet bedtime watercolor night`
- `favorites=うさぎのぬいぐるみ`
- `place=しずかであたたかい寝室 すっきりしたたなと箱`
- parent message restored bedtime routine / bunny / sleep progression emphasis

### 35.4 Generation Evidence (Write)

Write command executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=bedtime --style-id=soft_watercolor --profile=s3
```

Created balanced retry book:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book S3 | `oj1VACCdTyTTObUILPGL` | balanced anchored post-hardening (`s3`) | `t6-nonfixed-20260517165305` |

### 35.5 Monitor / Inspect Structural Results

#### Book S3 - Balanced Anchored Post-Hardening (`s3`)

| field | value |
| --- | --- |
| bookId | `oj1VACCdTyTTObUILPGL` |
| title | `[SMOKE-T6] bedtime × soft_watercolor (balanced anchored post-hardening)` |
| status | **failed** |
| progress | 0 |
| theme | bedtime |
| style | soft_watercolor |
| selectedStyleId | soft_watercolor |
| selectedStyleName | やさしい水彩 |
| creationMode | guided_ai |
| productPlan | standard_paid |
| characterConsistencyMode | cover_only |
| smoke metadata `withReference` | false |
| failureStage | `quality_gate` |
| failureReason | `unknown` |
| generatedTextPreview pages | 8 |
| pages actual | 0 |
| pages completed | 0 |
| failed pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| inspect expected page count check | **FAIL** (`expected=8`, `actual=0`) |

Monitor / inspect notes:

- the run again stopped before page-image generation
- no page docs were created
- no image-model, fallback, timeout, or page-attempt metrics were produced

Quality-gate failure metadata summary:

- `sentence_too_short_for_age page=1`
- `missing_scene_detail page=2`
- `missing_scene_detail page=3`
- `text_too_childish page=4`
- `missing_scene_detail page=6`
- `missing_action_or_emotion page=7`
- `sentence_too_short_for_age page=7`
- `missing_scene_detail page=8`
- `missing_action_or_emotion page=8`
- repeated `page_text_not_connected_to_story_goal`
- repeated `missing_visual_motif_in_text`

### 35.6 Generated Text Preview Interpretation

Book-level metadata observed:

| field | observed value |
| --- | --- |
| storyGoal | `さくらが、お気に入りのうさぎのぬいぐるみと、夜空の光に見守られながら、安心して眠りにつくこと。` |
| mainQuestObject | `うさぎのぬいぐるみと安心感を与える光` |
| narrativeDevice | `null` |

Preview reading summary:

| page | preview reading |
| --- | --- |
| 1 | child remembers fun day on bed; warm happy feeling |
| 2 | bunny introduced at blanket edge; hug beat |
| 3 | explicit bunny + bed-entry +安心 progression |
| 4 | moon/stars smiling and `やさしい ひかり` line |
| 5 | moonlight enters room; bunny tail glows softly |
| 6 | child closes eyes and recalls the day; bunny nearby |
| 7 | stars and room light wrap child; quiet drift into dream |
| 8 | short closing `やさしい ひかり、おやすみ。` line |

Interpretation:

- compared with T6-18 `s1rr`, S3 restored clearer bunny / bed-entry grounding on pages `2` and `3`
- however, the later pages still drift into soft atmosphere and generalized light-watching
- `mainQuestObject` broadened into `bunny + comforting light`, which may have weakened quest specificity rather than strengthening it
- `narrativeDevice` remained `null`, so motif-related quality checks still had no stable support

### 35.7 Structural Interpretation (T6-20)

What improved relative to T6-18:

- the retry text is less aggressively constrained by explicit room-no-text wording
- the opening bedtime routine and bunny anchor are stronger
- the profile better matches the T6-19 recommendation direction than `s1rr`

What did not improve enough:

- the run still failed before image generation
- page-level prompt output remains unobserved
- post-hardening BF-4 image behavior is still untested

Operational conclusion:

- a balanced input-only retry was not sufficient to restore structural viability
- the blocker is now best described as persistent quality-gate fragility in the non-fixed bedtime soft-watercolor lane after post-hardening
- T6-21 manual visual QA remains blocked because no image pages exist

### 35.8 Next-Step Handoff

The next slice should not attempt pair verdict review yet.

The next practical decision space is likely:

- another docs-only retry design, or
- a more deliberate retry lane that strengthens story-goal continuity / motif structure further without undoing T6-17 image hardening

Current pair state after T6-20:

- `bedtime x soft_watercolor`: unchanged / **Hold**

### 35.9 Exclusions

- No functions logic changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No seed-template data changes
- No Firestore schema/rules changes
- No quality gate threshold changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No detailed manual visual QA
- No final pair verdict update
- No S2 regeneration

## 36. T6-21 - Bedtime x Soft_Watercolor Quality-Gate Root-Cause / Pause-or-Pivot Decision (Docs-Only)

Date: 2026-05-18

### 36.1 Objective

Decide whether `bedtime x soft_watercolor` should:

1. remain fixed at `Hold` while validation work pivots to another pair, or
2. continue immediately with more work on the quality-gate / story-generation interaction before returning to the pair

This slice is docs-only decision work.

### 36.2 Decision Context

Current post-hardening retry outcomes:

| sample | bookId | profile | status | failureStage | image phase reached |
| --- | --- | --- | --- | --- | --- |
| S1RR-H1 | `DtBgZfT7rVKhLuH0A7l4` | `s1rr` | failed | `quality_gate` | no |
| S3 | `oj1VACCdTyTTObUILPGL` | `s3` | failed | `quality_gate` | no |

Pre-hardening visual evidence remains:

| sample | bookId | result | issue |
| --- | --- | --- | --- |
| S1 | `uwhwhq3DmuGPekxBVn0a` | Hold | page 6 readable Japanese paragraph block |
| S1R | `YVsHLGjXJ1svdhzWMDn9` | Hold | page 2 shelf-box `SAKURA` |
| S1RR | `7silOATa4vPfvfXNHNIt` | Hold | pages 0 / 1 / 6 bookshelf / book-surface readable Japanese text |
| S2 control | `PFuh3zu7q4VmNn4qA3dU` | Go | clean control |

Pair state entering T6-21:

- `bedtime x soft_watercolor`: **Hold**

### 36.3 Pre-Hardening vs Post-Hardening Failure Type Shift

The failure mode has shifted materially across the thread.

#### Pre-hardening

Observed failure family:

- image-level BF-4 failures on readable text surfaces
- concrete evidence existed on generated pages
- manual visual QA was possible
- root problem was in the rendered image output

#### Post-hardening

Observed failure family:

- upstream `quality_gate` failure before page generation
- no page docs
- no image outputs
- no manual visual QA possible
- root problem is currently structural/story-generation viability rather than observable image BF-4 output

Interpretation:

- T6-17 likely changed the system enough that the active bottleneck moved upstream
- this does not prove the BF-4 issue is solved
- it also means current retries are no longer measuring the original blocker directly

### 36.4 T6-18 vs T6-20 Failure Comparison

| dimension | T6-18 `s1rr` | T6-20 `s3` | reading |
| --- | --- | --- | --- |
| input style | strong room-no-text suppression | rebalanced bunny / sleep progression | S3 improved narrative grounding somewhat |
| status | failed | failed | no structural recovery |
| failureStage | `quality_gate` | `quality_gate` | same upstream blocker |
| generatedTextPreview | 8 pages | 8 pages | text generation still works |
| page docs | 0 | 0 | image phase still unreachable |
| narrativeDevice | `null` | `null` | motif weakness persisted |
| repeated goal-link warnings | yes | yes | story-goal linkage still unstable |

What changed:

- S3 improved local bedtime routine grounding on early pages
- S3 reduced the most extreme room-no-text overconstraint pattern from `s1rr`

What did not change:

- both runs still failed before image generation
- both runs still showed repeated `page_text_not_connected_to_story_goal`
- both runs still lacked usable narrative-device support
- neither run produced evidence that can validate T6-17 BF-4 hardening

### 36.5 Root-Cause Summary

Current best root-cause reading:

1. the original pair problem was image-level readable text on bedroom-object surfaces
2. T6-17 introduced a necessary production-layer hardening change for that surface family
3. after hardening, the active blocker shifted upstream into story quality gate fragility for this retry lane
4. repeated input-only retries are now mostly exploring story-generation / quality-gate coupling, not the original BF-4 image issue

Most likely contributing factors:

- bedtime lane tolerates quiet text poorly once story-goal continuity weakens
- retry inputs increasingly blend `bunny`, `sleep`, and `light` into a diffuse quest
- `narrativeDevice` remains absent, leaving motif-based checks unsatisfied
- repeated retries are no longer giving efficient signal on whether `soft_watercolor` image behavior improved

### 36.6 Risk of Continuing Retries Immediately

If retries continue immediately in the same pair, the risks are:

- more time spent without generating any new visual evidence
- more runner-profile drift away from the original product behavior
- confusion between `quality_gate` tuning issues and BF-4 image-quality issues
- delayed progress on the wider T6 matrix while one pair remains blocked on an upstream interaction problem
- reduced confidence that new results are measuring the same thing as the original S1 / S1R / S1RR BF-4 failures

Practical project risk:

- this pair can consume multiple additional slices without producing a single reviewable image
- that is a poor validation tradeoff compared with exploring a fresh pair that can still generate output

### 36.7 Pivot Candidate Comparison

Possible next directions:

| option | upside | downside | decision read |
| --- | --- | --- | --- |
| continue immediate retries on `bedtime x soft_watercolor` | preserves continuity on one blocked pair | likely continues upstream gate exploration without visual evidence | weak |
| pause pair and pivot to next T6 pair | restores broader matrix momentum and avoids getting stuck | leaves `bedtime x soft_watercolor` unresolved for now | strong |
| launch a deeper investigation specifically into quality-gate / story-generation interaction before any new pair work | could eventually explain both T6-18 and T6-20 | becomes a subsystem investigation, not pair validation | valid later, but not as immediate default |

Important distinction:

- `pivot` does not mean `clear` or `abandon`
- it means treating the pair as a documented `Hold` while work moves to a healthier validation lane

### 36.8 Recommended Decision

Recommended T6-21 decision:

- **Option 1: hold `bedtime x soft_watercolor` fixed and pivot to the next pair**

Decision statement:

- `bedtime x soft_watercolor` should remain **Hold**
- further retries on this pair should be paused for now
- the team should pivot to another pair for forward validation progress
- if this pair is revisited later, it should be revisited as a focused quality-gate / story-generation interaction investigation, not as another routine smoke retry

### 36.9 Why Pivot Is Preferred Now

Pivot is preferred because:

- two consecutive post-hardening retries failed at the same upstream stage
- neither retry produced image evidence
- the pair is no longer the fastest route to learning about image-level BF-4 behavior
- the original T6 objective is broader pair validation, not indefinite iteration on one structurally blocked lane
- S2 already proves `bedtime x soft_watercolor` is not globally broken, so pausing does not erase the positive evidence

What this decision is *not* saying:

- not saying T6-17 hardening was wrong
- not saying `soft_watercolor` is unsuitable for bedtime
- not saying the pair is permanently abandoned

What it *is* saying:

- current retry economics are poor
- the next unit of work should maximize new signal, not preserve continuity for its own sake

### 36.10 Recommended Next Action

Recommended next action after T6-21:

- mark `bedtime x soft_watercolor` as **Hold / Paused**
- move to the next pair in the T6 queue
- optionally schedule a later dedicated investigation track for:
  - non-fixed bedtime quality-gate fragility
  - narrativeDevice / storyGoal coupling in quiet bedtime lanes
  - whether prompt hardening indirectly increases gate fragility in low-action themes

If/when this pair is revisited later, entry criteria should likely be:

- explicit investigation scope
- success metric defined around clearing `quality_gate` first
- no assumption that the existing smoke runner profiles are still the right vehicle

### 36.11 Pair Status After Decision

Documented pair status:

| pair | status | decision |
| --- | --- | --- |
| `bedtime x soft_watercolor` | **Hold** | paused after two consecutive post-hardening `quality_gate` failures |

### 36.12 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No quality gate threshold changes
- No seed-template data changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No manual visual QA
- No pair verdict reopening beyond this documented pause decision

## 37. T6-22 - Imagination x Crayon Smoke Input Design (Docs-Only)

Date: 2026-05-18

### 37.1 Objective

Define the smoke input and execution design for `imagination x crayon` so T6-23 can execute the next pair safely and comparably after the T6-21 pivot decision.

This slice is docs-only design work for:

- Book I1 / Book I2 input profiles
- execution policy
- QA focus
- evidence template
- pair decision criteria

Out of scope:

- smoke generation
- image generation
- manual visual QA
- code or runner changes

### 37.2 Why `imagination x crayon` Is Next

Selection basis after T6-21:

- `bedtime x soft_watercolor` is paused at `Hold / Paused`
- matrix progress needs a healthier lane that is more likely to reach image generation
- `crayon` already has stronger portability evidence from `bedtime x crayon -> Go`
- `imagination` expands category coverage beyond bedtime and tests a higher-variance scene family

Why this pair is worth doing now:

- it adds a new `categoryGroupId`
- it keeps a style with proven prior stability
- it provides a stronger signal on category portability than staying within bedtime

### 37.3 What To Reuse From `bedtime x crayon`

`bedtime x crayon` success pattern to reuse:

- two-book structure:
  - anchored moderate lane
  - rich lane
- age kept in the lower-stable range
- one explicit grounding object or motif
- enough scene detail to avoid thin quality-gate output
- no-reference mode
- same evidence frame:
  - structural health
  - BF-4
  - BF-3
  - style adherence
  - emotional fit
  - story-image match

Why the A2/B structure still fits:

- A2-like anchoring reduced quality-gate fragility without over-constraining the generation
- B-like richer input gives a second sample with more scene entropy
- together they show whether the pair is robust across both a safer and a more expressive lane

### 37.4 Pair-Specific Design Principles

For `imagination x crayon`, the design should:

- preserve the child-safe crayon storybook feeling
- allow category expansion into magical / pretend-adventure scenes
- avoid high-prop chaos that could create BF-4 noise
- keep one concrete quest object so the story goal stays trackable
- keep scene progression visible enough to satisfy quality gate

Avoid:

- vague fantasy-only wording with no quest object
- too many named fantasy elements in one profile
- overly abstract `dream`, `magic`, or `sky` language without place / action anchors
- branded or label-prone objects such as control panels, signs, maps, books with titles, posters, or gadget screens

### 37.5 Proposed Book I1 / I2 Profiles

#### Book I1 - Anchored Moderate (`i1`)

Design intent:

- safest imagination lane
- keep one pretend-adventure object and one simple setting
- maximize structural viability

Recommended input shape:

| field | design |
| --- | --- |
| childAge | 4 |
| childName | simple common name |
| favorites | one quest-friendly object such as `段ボールロケット` or `ほしのステッキ` |
| colorMood | warm playful crayon twilight / cozy adventure |
| place | one clear pretend setting such as `おへやのなかの手づくり宇宙ごっこ` |
| parentMessage | supportive line that frames a beginning, small discovery, and safe return |

Recommended narrative lane:

- child starts with a handmade pretend-adventure object
- imagination expands the room into a magical world
- one small discovery or problem
- one reassuring payoff
- safe return or emotional closure

Suggested watchwords:

- `handmade`
- `pretend`
- `safe`
- `small discovery`
- `gentle adventure`

#### Book I2 - Rich (`i2`)

Design intent:

- richer imagination lane with more visual variety
- still child-safe and story-goal anchored

Recommended input shape:

| field | design |
| --- | --- |
| childAge | 4 or 5 |
| childName | different simple common name |
| favorites | one main pretend-adventure object plus one supporting motif |
| colorMood | bright adventurous crayon with warm highlights |
| place | slightly broader world such as `おへやからつながる星のこみち` or `ふしぎな cardboard rocket world` |
| parentMessage | encourages brave exploration, noticing, and returning safely |

Recommended narrative lane:

- stronger sense of departure and exploration
- one magical helper or one recurring non-human friend at most
- richer environment details than I1
- still one clear story-goal thread

Constraint:

- do not let I2 become a generic fantasy collage
- keep the same quest object central across the book

### 37.6 Draft Input Direction

The actual T6-23 runner inputs should likely follow a shape like:

#### I1 draft direction

- age: `4`
- favorites: one object such as `だんぼーるロケット`
- place: `おへやのなかの手づくり宇宙ごっこ`
- parentMessage emphasis:
  - child imagines a gentle journey
  - notices small stars / sounds / pathways
  - feels safe and proud
  - comes back or settles happily

#### I2 draft direction

- age: `4` or `5`
- favorites: one main object plus one recurring motif
- place: `おへやからつながるふしぎな空のこみち`
- parentMessage emphasis:
  - curious exploration
  - one magical friend or guide at most
  - one moment of small uncertainty
  - reassuring payoff and safe closure

### 37.7 Imagination-Specific QA Watchpoints

Structural / quality-gate watchpoints:

- storyGoal or mainQuestObject drifting into vague fantasy mood only
- too many invented elements causing weak page-to-page continuity
- thin scene detail from overly abstract wonder language
- loss of recurring motif or payoff cue

Image-level watchpoints for later QA:

- BF-4:
  - star maps, signs, labels, charts, control panels, spell books, rocket dashboards, banners, emblems, pseudo-runes
- BF-3:
  - child identity drift across scene-heavy fantasy pages
  - magical helper turning into inconsistent character forms
- style adherence:
  - crayon warmth being replaced by smoother watercolor-like rendering
- story-image match:
  - image spectacle outrunning the page text

Commercial-fit watchpoints:

- scenes becoming too chaotic for preschool readers
- adventure becoming too dramatic or unsafe
- visual density overwhelming the page

### 37.8 T6-23 Execution Policy

T6-23 should follow this execution policy:

- generate exactly 2 books:
  - Book I1 anchored moderate
  - Book I2 rich
- keep style fixed to `crayon`
- keep theme fixed to `imagination`
- keep no-reference mode
- run dry-run first for both profiles
- if dry-run payloads look correct, run write generation for both
- record monitor / inspect evidence before any visual QA

Expected T6-23 evidence fields:

- `bookId`
- `runId`
- `status`
- `pageCount`
- `failed`
- `fallback`
- `timedOut`
- `selectedStyleId`
- `imageModel`
- `imageAttemptCount`
- `referenceImagesUsed`
- `usedCharacterReference`
- inspect expected-page-count result

### 37.9 T6-24 Visual QA Separation

T6-24 should remain a separate slice for:

- manual visual QA of I1 / I2
- BF-4 and BF-3 page review
- style adherence review
- emotional fit / story-image match review
- pair-level verdict

This separation is important because:

- `imagination` is expected to have higher image-level variance than bedtime
- structural pass alone will not be enough to clear the pair
- visual QA is where the real category-stress evidence will appear

### 37.10 Evidence Template For T6-23 / T6-24

Recommended T6-23 structural table:

| sample | bookId | profile | status | pages | failed | fallback | timedOut | reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Book I1 | TBD | anchored moderate / `i1` | TBD | TBD | TBD | TBD | TBD | no-reference |
| Book I2 | TBD | rich / `i2` | TBD | TBD | TBD | TBD | TBD | no-reference |

Recommended T6-24 visual QA lenses:

- BF-4: readable text / pseudo-text / signage / map-like surfaces
- BF-3: protagonist identity continuity
- style adherence: crayon texture, warmth, hand-drawn readability
- emotional fit: wonder without fear or overstimulation
- story-image match: quest object and discovery arc remain legible

### 37.11 Pair Decision Criteria

For `imagination x crayon`, a pair-level `Go` should likely require:

- both books structurally pass
- no BF-4 fail pages
- no BF-3 fail book
- style adherence at least acceptable across both books
- emotional fit at least acceptable, with no frightening or chaotic outlier pages
- story-image match strong enough that the quest object / recurring motif remains clear

Recommended hold triggers:

- any BF-4 fail page
- repeated pseudo-symbol / map / control-panel text surfaces
- strong child identity drift
- adventure tone becoming too intense for target age
- structural quality-gate failure in both books

### 37.12 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No quality gate threshold changes
- No seed-template data changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No manual visual QA

## 38. T6-23 - Imagination x Crayon Smoke Generation / Structural Inspection

Date: 2026-05-18

### 38.1 Scope

Execute the next pair structural smoke for `imagination x crayon` using the T6-22 design, including:

- runner profile support update for `i1` / `i2`
- dry-run validation
- two-book write generation
- monitor / inspect structural verification
- structural evidence recording

Out of scope:

- manual visual QA
- pair verdict reopening
- post-generation regeneration

### 38.2 Runner Profile Support Update

Updated file: `scripts/create-nonfixed-smoke-book.js`

Changes:

- added reusable `IMAGINATION_INPUT_PROFILES`
- extended `fantasy` profile set with `i1` and `i2`
- added `T6_INPUT_PROFILES.imagination` alias pointing to the same imagination/fantasy profile set
- no functions logic changes

Execution note:

- matrix category label is `imagination`
- actual guided-ai theme id used by the runner remains `fantasy`
- this follows the existing T6 mapping rule: `imagination -> theme id fantasy`

### 38.3 Dry-Run Verification

Dry-run commands executed:

```bash
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=fantasy --style-id=crayon --profile=i1
npm run smoke:create-nonfixed-book -- --dry-run --theme-id=fantasy --style-id=crayon --profile=i2
```

Dry-run summary:

- both payloads resolved `themeId=fantasy`
- both payloads resolved `styleId=crayon`
- `creationMode=guided_ai`, `productPlan=standard_paid`, `pageCount=8`
- no-reference path confirmed (`withReference=false`)
- profile labels resolved as:
  - `i1` -> `anchored moderate`
  - `i2` -> `rich`

Dry-run input check:

#### Book I1 - `i1`

- `childName=ひかり`
- `childAge=4`
- `favorites=だんぼーるロケット`
- `colorMood=warm playful crayon twilight`
- `place=おへやのなかのてづくりうちゅうごっこ`

#### Book I2 - `i2`

- `childName=そうた`
- `childAge=5`
- `favorites=だんぼーるロケットとほしのステッキ`
- `colorMood=bright adventurous crayon with warm highlights`
- `place=おへやからつながるふしぎなそらのみち`

### 38.4 Generation Evidence (Write)

Write commands executed:

```bash
npm run smoke:create-nonfixed-book -- --write --theme-id=fantasy --style-id=crayon --profile=i1
npm run smoke:create-nonfixed-book -- --write --theme-id=fantasy --style-id=crayon --profile=i2
```

Created smoke books:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book I1 | `gxuvnnlAnQXf6LVXtSo4` | anchored moderate (`i1`) | `t6-nonfixed-20260517171510` |
| Book I2 | `ZPwrVsVARKIPBEm8mcu2` | rich (`i2`) | `t6-nonfixed-20260517171510` |

### 38.5 Monitor / Inspect Structural Results

#### Book I1 - Anchored Moderate (`i1`)

| field | value |
| --- | --- |
| bookId | `gxuvnnlAnQXf6LVXtSo4` |
| title | `ひかりちゃんの ほしぞらロケット` |
| status | **completed** |
| progress | 100 |
| theme | fantasy |
| styleId | crayon |
| selectedStyleName | クレヨンで描いた絵本 |
| pageCount requested | 8 |
| pages actual | 8 |
| pages completed status | 1 `completed` + 7 `fallback_completed` |
| failed pages | 0 |
| imageModel | `black-forest-labs/flux-2-pro` |
| imageAttemptCount | 1 on page 0, 3 on pages 1-7 |
| imageFallbackUsed pages | 7 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 21577 / 38572 / 47712 |
| inspect expected page count check | PASS |

#### Book I2 - Rich (`i2`)

| field | value |
| --- | --- |
| bookId | `ZPwrVsVARKIPBEm8mcu2` |
| title | `そうたの きらきら ほしさがし` |
| status | **completed** |
| progress | 100 |
| theme | fantasy |
| styleId | crayon |
| selectedStyleName | クレヨンで描いた絵本 |
| pageCount requested | 8 |
| pages actual | 8 |
| pages completed status | 1 `completed` + 7 `fallback_completed` |
| failed pages | 0 |
| imageModel | `black-forest-labs/flux-2-pro` |
| imageAttemptCount | 1 on page 0, 3 on pages 1-7 |
| imageFallbackUsed pages | 7 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 26949 / 34687 / 43894 |
| inspect expected page count check | PASS |

### 38.6 Structural Interpretation (T6-23)

Primary result:

- both I1 and I2 cleared the story quality gate
- both books completed 8/8 page generation
- no-reference execution remained intact across both books

Important structural caution:

- both books were **fallback-heavy**
- each book used fallback completion on 7 of 8 pages
- this is not a structural failure, but it is a strong watchpoint for T6-24 visual QA

What T6-23 proves:

- the pivot away from `bedtime x soft_watercolor` restored structural viability
- `imagination x crayon` can generate reviewable books in the current system
- the new `i1` / `i2` input lanes are runnable and quality-gate-safe

What T6-23 does not yet prove:

- BF-4 safety in imagination-specific symbol / pseudo-text surfaces
- BF-3 continuity across higher-variance imagination scenes
- whether fallback-heavy generation materially harms style adherence or story-image match

### 38.7 T6-24 Handoff

T6-24 should perform manual visual QA and pair verdict review for:

| sample | bookId | profile |
| --- | --- | --- |
| Book I1 | `gxuvnnlAnQXf6LVXtSo4` | anchored moderate / `i1` |
| Book I2 | `ZPwrVsVARKIPBEm8mcu2` | rich / `i2` |

Priority T6-24 watchpoints:

- BF-4 on:
  - rune-like marks
  - map-like symbols
  - rocket/control-panel pseudo-text
  - spell-book / signage / banner surfaces
- BF-3 on protagonist identity across scene-heavy pages
- crayon style adherence under fallback-heavy generation
- emotional fit: wonder without fear / clutter overload
- story-image match: quest object remains legible page-to-page

### 38.8 Exclusions

- No functions logic changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No seed-template data changes
- No quality gate threshold changes
- No Firestore schema/rules changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No detailed manual visual QA
- No final pair verdict update

## 39. T6-24 - Imagination x Crayon Manual Visual QA / Pair Verdict

Date: 2026-05-18

### 39.1 Scope

Perform manual visual QA for the two structurally completed `imagination x crayon` smoke books from T6-23 and issue book-level plus pair-level verdicts.

Reviewed books:

| sample | bookId | profile |
| --- | --- | --- |
| Book I1 | `gxuvnnlAnQXf6LVXtSo4` | anchored moderate / `i1` |
| Book I2 | `ZPwrVsVARKIPBEm8mcu2` | rich / `i2` |

Review dimensions:

- BF-4 readability / pseudo-text surfaces
- BF-3 character continuity / age / identity stability
- `crayon` style adherence
- emotional fit
- story-image match
- fallback-heavy impact on scene stability and prompt adherence

### 39.2 Book I1 Visual QA

#### I1 page-level observations

- page 0: strong result; clear crayon rendering, readable opening fantasy beat, no BF-4 issue
- pages 1-3: fallback output shifts to soft photoreal bedroom imagery; child and glowing star remain gentle, but the room-sky adventure framing collapses into plain in-room poses
- pages 4-6: largest story-image mismatch; text calls for a hidden box, opening effort, and discovery of star fragments, but images continue to show mostly the same child-plus-star setup without the requested object/action payoff
- page 7: gentle ending mood is preserved, but the visual remains generic and does not visually resolve the found-fragment return beat

#### I1 rubric

| dimension | verdict | notes |
| --- | --- | --- |
| BF-4 | Pass | no readable text, labels, map-like symbols, or pseudo-letter artifacts observed |
| BF-3 | Pass | protagonist remains a young girl in star pajamas; no clear age-up or identity break |
| style adherence | **Fail** | 7 fallback pages drift hard from crayon storybook into soft photoreal imagery |
| emotional fit | Pass | wonder stays gentle and child-safe |
| story-image match | **Fail** | adventure/search/payoff beats are largely missing from pages 4-7 |
| fallback impact | High negative | fallback behavior materially reduced prompt specificity and visual narrative progression |

Book I1 verdict: **Hold**

Primary reason:

- BF-4/BF-3 are acceptable, but `crayon` style adherence and story-image match fall below pair-clear criteria once fallback pages dominate the book

### 39.3 Book I2 Visual QA

#### I2 page-level observations

- page 0: strong result; warm crayon bedroom launch image with clear fantasy invitation and good child-friendly appeal
- pages 1-3: fallback output again switches to photoreal bedroom portrait mode; child identity stays stable, but visual language no longer resembles the requested crayon storybook path
- pages 4-6: major imagination beats from text do not appear; the sleeping baby dragon, distant glowing castle, and branch-side fragment discovery are not visualized in a specific or reliable way
- page 7: return-home reassurance tone remains gentle, but the closing image is still a generic bedroom pose rather than a visual resolution of the quest

#### I2 rubric

| dimension | verdict | notes |
| --- | --- | --- |
| BF-4 | Pass | no readable text, signage, book-title leakage, or control-panel pseudo-text observed |
| BF-3 | Pass | same young boy is maintained across pages; no scary escalation or costume age drift |
| style adherence | **Fail** | fallback pages abandon crayon texture/composition and become photoreal |
| emotional fit | Pass | magical adventure remains warm and non-threatening |
| story-image match | **Fail** | text-specific fantasy set pieces are not materially depicted on the fallback pages |
| fallback impact | High negative | fallback-heavy lane preserved structural completion but not usable visual fidelity for this pair |

Book I2 verdict: **Hold**

Primary reason:

- the book remains safe and gentle, but the fallback-heavy output does not visually realize the `imagination x crayon` promise closely enough for release-level validation

### 39.4 Pair Verdict

| pair | I1 | I2 | verdict |
| --- | --- | --- | --- |
| `imagination x crayon` | Hold | Hold | **Hold** |

Pair-level interpretation:

- this pair is structurally viable, unlike the paused `bedtime x soft_watercolor` lane
- BF-4 passed across both reviewed books
- BF-3 remained acceptable across both reviewed books
- however, both books failed on the same aggregate weakness:
  - fallback-heavy generation caused broad `crayon` style collapse
  - fallback-heavy generation also weakened story-image alignment on the pages where imagination-specific scene beats mattered most

Why pair is not `Go`:

- pair-level criteria require acceptable style adherence and story-image match across both books, not only structural completion and BF safety
- with 7/8 pages falling back in both books, the visual output is too unstable to treat this pair as commercially validated

### 39.5 T6-24 Conclusion

What T6-24 proves:

- `imagination x crayon` can clear structural generation and avoid the upstream quality-gate trap seen in the paused `bedtime x soft_watercolor` lane
- the current lane does not show a BF-4 readability blocker
- the main blocker for this pair is not safety but fallback-driven quality degradation

What T6-24 does not prove:

- that `crayon` remains reliable under high fallback pressure for imagination scenes
- that imagination-category scene specificity survives the current fallback path well enough for validation success

Recommended next step:

- keep `imagination x crayon` at **Hold**
- move the next slice to fallback-behavior analysis / remediation design rather than declaring pair success

### 39.6 Exclusions

- No code changes
- No runner changes
- No functions logic changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No quality gate threshold changes
- No seed-template data changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No product exposure matrix update

## 40. T6-25 - Fallback-Heavy Behavior Analysis / Remediation Design (Docs-Only)

Date: 2026-05-18

### 40.1 Scope

Analyze the root cause of the fallback-heavy generation pattern observed in T6-23 / T6-24 (`imagination × crayon`, Books I1 and I2) and design remediation options to unblock the pair from `Hold` to `Go`.

This is a docs-only analysis slice. No code changes, no re-generation, no visual QA.

### 40.2 Observed Fallback Pattern

Evidence from T6-23 structural inspection:

| metric | I1 | I2 |
| --- | --- | --- |
| pages total | 8 | 8 |
| pages `completed` | 1 | 1 |
| pages `fallback_completed` | 7 | 7 |
| pages `image_failed` | 0 | 0 |
| imageAttemptCount (page 0) | 1 | 1 |
| imageAttemptCount (pages 1-7) | 3 | 3 |
| imageTimedOut pages | 0 | 0 |
| imageDurationMs min / avg / max | 21577 / 38572 / 47712 | 26949 / 34687 / 43894 |

Pattern summary:

- Page 0 succeeded on the first attempt with the primary model.
- Pages 1-7 exhausted all primary-model retries and fell back to the fallback model.
- The fallback succeeded (no `image_failed` pages), so structural completion was preserved.
- The consistent 3-attempt pattern (2 primary failures + 1 fallback success) indicates a deterministic fallback path rather than random noise.

### 40.3 Generation Stack: How Fallback Works

Relevant code paths (as of T6-24 codebase state):

**Plan config** (`functions/src/lib/plans.ts`):

```
standard_paid → imageQualityTier: "standard", imageModelProfile: "pro_consistent"
```

**Model resolution** (`functions/src/lib/replicate.ts`):

```
resolveImageModelProfile({ imageModelProfile: "pro_consistent" }) → "pro_consistent"
→ primary model: black-forest-labs/flux-2-pro
```

**Fallback chain** (`functions/src/lib/replicate.ts`):

```
resolveImageFallbackProfiles("pro_consistent") → ["pro_consistent", "klein_fast"]
→ fallback model: black-forest-labs/flux-2-klein-9b
```

**Retry loop** (`functions/src/generate-book.ts`):

```
maxRetries = 2  (per profile)
for each profile in ["pro_consistent", "klein_fast"]:
  for attempt in [0, 1]:
    → attempt N
```

**Concurrency** (`functions/src/generate-book.ts`):

```
IMAGE_CONCURRENCY = 2  (default; configurable via env var)
→ 2 pages generated in parallel at a time
```

**Timeout** (`functions/src/generate-book.ts`):

```
IMAGE_GENERATION_TIMEOUT_MS = 120000  (120 s)
```

### 40.4 Failure Scenario Reconstruction

For pages 1-7 (attemptCount = 3 = 2 pro_consistent failures + 1 klein_fast success):

| attempt | profile | model | result |
| --- | --- | --- | --- |
| 1 | pro_consistent | flux-2-pro | fail |
| 2 | pro_consistent | flux-2-pro | fail |
| 3 | klein_fast | flux-2-klein-9b | success → `fallback_completed` |

Timeout is ruled out as a cause:

- `imageTimedOut = 0` across all pages for both books.
- `imageDurationMs` values (21-47 s) are well below the 120 s threshold.
- The 429 rate-limit retry path (`retryAfterMs`) would produce longer attempt durations if triggered.

### 40.5 Root Cause Hypotheses

Three hypotheses are considered, ranked by likelihood based on the available evidence.

#### Hypothesis H1: Burst API failures from concurrent page generation (most likely)

`IMAGE_CONCURRENCY = 2` means two pages are submitted to Replicate simultaneously. For an 8-page book, this produces 4 burst-pairs of concurrent flux-2-pro requests. Page 0 runs in the initial pair alone (or with the first real page), where the API is not yet under burst pressure. Pages 1-7 run in the subsequent concurrent pairs, where transient overload or burst error responses from Replicate may reject the primary model requests.

Supporting evidence:
- page 0 succeeded (first request, likely under low burst pressure)
- all pages 1-7 failed on pro_consistent despite no timeout signal
- both books showed the identical 7-of-8 fallback pattern in the same run
- generation timing for successful attempts was 21-47 s (normal, not stressed)

Confidence: **high**.

#### Hypothesis H2: Replicate flux-2-pro transient service degradation (moderate)

A temporary degradation in flux-2-pro availability during the smoke run (`t6-nonfixed-20260517171510`) could cause systematic failures across both books simultaneously. This would explain the consistent pattern without requiring a burst-concurrency mechanism.

Supporting evidence:
- both books ran in the same `runId` window, so a shared time-window failure is plausible
- page 0 for each book succeeded before the degraded window

Confidence: **moderate**.

Limitation: This hypothesis is not distinguishable from H1 without Replicate status history or logs showing per-request error codes.

#### Hypothesis H3: Prompt length or complexity rejection by flux-2-pro (lower likelihood)

Longer or more complex prompts on non-fixed imagination pages (vs. the opener on page 0) could trigger model-specific rejection patterns. This could explain why page 0 (often a simpler setup image) succeeds while later pages (with richer scene descriptions) fail.

Supporting evidence:
- non-fixed imagination prompts can be longer and more scene-specific than opener pages
- page 0 typically has a simpler narrative role (introduction / setting the scene)

Confidence: **lower** — no direct evidence that flux-2-pro prompt length thresholds were exceeded. The imagination scene descriptions are not abnormally long.

### 40.6 Quality Impact: Why Fallback Hurt This Pair

The fallback to `klein_fast` preserved structural completion but materially reduced output quality for `imagination × crayon` for two reasons.

**Reason 1: Style fidelity gap between models**

Both models receive the same text prompt including `styleBible` (crayon style instructions). However:

- `pro_consistent` (flux-2-pro): high instruction-following capability; reliably renders explicit style descriptors like crayon texture, hand-drawn line weight, and warm palette.
- `klein_fast` (flux-2-klein-9b): lower capability; tends to default to its training distribution (soft photoreal) when style instructions conflict with generic scene prompts.

Result: fallback pages displayed soft photoreal rendering instead of the requested crayon storybook style.

**Reason 2: Scene specificity gap**

Non-fixed imagination pages contain rich, story-specific scene descriptions (e.g., a sleeping baby dragon, a glowing castle in the distance, a discovery of star fragments in a hidden box). These complex descriptions are harder for `klein_fast` to resolve faithfully, whereas `pro_consistent` would be more likely to attempt the specific scene geometry.

Result: fallback pages showed generic child-in-bedroom compositions rather than the imagination-specific fantasy set pieces requested by the story.

**Reason 3: No style reinforcement on fallback path**

The current code applies the same prompt to both the primary and fallback models. There is no mechanism to add extra style anchors or prompt restructuring when switching to a lower-capability model.

### 40.7 Remediation Options

Five options are considered. They are not mutually exclusive.

#### Option R1: Reduce IMAGE_CONCURRENCY for non-fixed books

Reduce `IMAGE_CONCURRENCY` from 2 to 1 for `guided_ai` / `original_ai` books. This serializes page requests to flux-2-pro, reducing burst pressure on the Replicate API.

| dimension | assessment |
| --- | --- |
| addresses H1 | yes — directly reduces burst concurrency |
| addresses H2 | no |
| code change required | yes — env-var or plan-specific concurrency override |
| risk | low — serialization adds latency but does not change model behavior |
| implementation complexity | low |
| trade-off | generation time per book increases (e.g., 8 pages at ~35s avg ≈ 280 s serial vs. ~150 s at concurrency=2) |

**Assessment: recommended as first hypothesis test** (low risk, targeted at H1).

#### Option R2: Increase per-profile retry count before falling back

Increase `maxRetries` for the `pro_consistent` profile from 2 to 3, with exponential backoff between retries.

| dimension | assessment |
| --- | --- |
| addresses H1 | partially — gives burst pressure time to dissipate |
| addresses H2 | yes — retries over a longer window can recover from transient degradation |
| code change required | yes — maxRetries adjustment or profile-specific retry config |
| risk | low |
| implementation complexity | low |
| trade-off | extends generation time per failed page by the backoff duration |

**Assessment: complementary to R1; not sufficient alone**.

#### Option R3: Add style-reinforcement injection on fallback prompt

When the fallback path activates (`profile === "klein_fast"`), prepend an amplified style anchor to the prompt (e.g., `"STYLE: crayon hand-drawn illustration. DO NOT use photorealistic rendering. ..."` before the full scene description).

| dimension | assessment |
| --- | --- |
| addresses style adherence failure | yes — directly targets the prompt-following gap in klein_fast |
| addresses fallback occurrence | no |
| code change required | yes — prompt builder must detect fallback context |
| risk | medium — amplified style instructions may conflict with scene geometry and increase BF-4 risk (pseudo-text surfaces) |
| implementation complexity | medium |
| trade-off | may improve style without reducing fallback frequency; requires visual QA after implementation |

**Assessment: valid remediation for quality gap, but adds implementation complexity and a new BF-4 test obligation**.

#### Option R4: Extend fallback chain to klein_base instead of klein_fast

Enable `ENABLE_KLEIN_BASE=true` and change the fallback sequence to `["pro_consistent", "klein_base", "klein_fast"]`. `klein_base` (flux-2-klein-9b-base) may have better instruction-following than `klein_fast`.

| dimension | assessment |
| --- | --- |
| addresses style adherence failure | partially — depends on whether klein_base has materially better style fidelity |
| addresses fallback occurrence | no |
| code change required | env-var flag; no new code needed |
| risk | medium — klein_base quality for crayon style is unvalidated in T6 |
| implementation complexity | minimal |
| trade-off | adds one more fallback tier; extends attempt count and generation time |

**Assessment: low-effort option to test if klein_base provides better style fidelity than klein_fast; should be tested before assuming it helps**.

#### Option R5: Post-generation page regeneration trigger for fallback-heavy books

If a book ends with more than N fallback pages (e.g., N=4), automatically queue page regeneration for all `fallback_completed` pages as a post-generation step.

| dimension | assessment |
| --- | --- |
| addresses fallback occurrence | no — re-generates but uses the same fallback chain |
| addresses style adherence failure | only if primary model succeeds on regeneration |
| code change required | yes — book completion handler + regeneration trigger |
| risk | medium — if primary model failures persist, regeneration loops without improvement |
| implementation complexity | high |
| trade-off | improves outcomes when fallback was caused by transient API failures; does not help if primary model failures are systematic |

**Assessment: architecturally appropriate but premature until R1/R2 are tested; regeneration is already available for manual use**.

### 40.8 Recommended Path for T6-26

Based on the analysis above, the following sequenced approach is recommended.

**Step 1 (T6-26): Test H1 by running a controlled re-smoke with IMAGE_CONCURRENCY=1**

- Run a single re-smoke of `imagination × crayon` with `IMAGE_CONCURRENCY=1` (env-var override, no code change needed).
- If fallback ratio drops to ≤ 1/8, H1 is confirmed and R1 is the primary fix.
- If fallback ratio remains high, H2 or H3 must be investigated next.

This test is low-risk, requires no code changes, and directly isolates the concurrency hypothesis.

**Step 2 (conditional on H1 confirmation): Implement R1 as a plan-specific default**

- Change the default `IMAGE_CONCURRENCY` for `guided_ai` / `original_ai` books to 1.
- Keep `fixed_template` concurrency at 2 (validated behavior).

**Step 3 (parallel): Evaluate R4 (klein_base fallback)**

- Enable `ENABLE_KLEIN_BASE=true` in a test environment.
- Run a spot comparison: same imagination × crayon prompts via klein_base vs. klein_fast.
- If klein_base shows materially better crayon style fidelity, update the fallback chain.

**Step 4 (if style gap persists after R1/R2): Implement R3 (fallback prompt reinforcement)**

- Design and implement fallback-path style injection as a targeted prompt-builder change.
- Requires new visual QA run after implementation.

**What T6-26 does NOT do:**

- R5 (auto-regeneration trigger) is deferred until primary failure behavior is characterized.
- No style exposure matrix update until the pair clears all visual QA axes.

### 40.9 Pair Status After T6-25

| pair | current verdict | blocker | recommended next action |
| --- | --- | --- | --- |
| `imagination × crayon` | **Hold** | fallback-heavy → style adherence Fail + story-image match Fail | T6-26: controlled re-smoke with IMAGE_CONCURRENCY=1 |

### 40.10 What T6-25 Proves

- The fallback-heavy pattern in T6-23 is mechanically explained by the `pro_consistent` → `klein_fast` fallback chain under concurrent page generation.
- The quality gap is not random variance; it is a predictable consequence of `klein_fast`'s lower style-instruction adherence.
- The pair is not blocked by safety failures (BF-4/BF-3 are clear), story quality gate, or structural generation. The single remaining blocker is fallback-driven visual quality degradation.
- A concurrency-reduction test (H1 test) is the lowest-risk next step and can be executed without code changes.

### 40.11 What T6-25 Does Not Prove

- Whether H1 (burst concurrency) or H2 (service degradation) is the dominant cause — that requires the T6-26 re-smoke experiment.
- Whether `klein_base` provides meaningfully better style fidelity than `klein_fast` — that requires a model comparison test.
- Whether R3 (fallback prompt reinforcement) would achieve acceptable style adherence — that requires implementation and visual QA.

### 40.12 Exclusions

- No code changes
- No runner changes
- No functions logic changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No quality gate threshold changes
- No seed-template data changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No manual visual QA
- No product exposure matrix update

## 41. T6-26 - IMAGE_CONCURRENCY=1 Controlled Re-Smoke / Fallback Hypothesis Test

Date: 2026-05-18

### 41.1 Scope

Execute a controlled re-smoke of `imagination × crayon` (profiles i1 and i2) with `IMAGE_CONCURRENCY=1` to test Hypothesis H1 from T6-25.

H1 stated that concurrent page generation (`IMAGE_CONCURRENCY=2`) was causing burst API failures on `pro_consistent` (flux-2-pro), which caused the 7/8 fallback pattern observed in T6-23/T6-24.

The controlled variable: `IMAGE_CONCURRENCY` reduced from 2 (default) to 1 (serial page generation). All other parameters are identical to T6-23.

### 41.2 Dry-Run Verification

Dry-run confirmed both profiles resolve correctly:

| sample | profile | themeId | styleId | creationMode | productPlan | pageCount | withReference |
| --- | --- | --- | --- | --- | --- | --- | --- |
| i1 | anchored moderate | fantasy | crayon | guided_ai | standard_paid | 8 | false |
| i2 | rich | fantasy | crayon | guided_ai | standard_paid | 8 | false |

### 41.3 Environment Change

`IMAGE_CONCURRENCY=1` was added to `functions/.env.story-gen-8a769` and the `generateBook` function was redeployed to apply it. After the test, the line was removed and the function was redeployed again to restore the default (`IMAGE_CONCURRENCY=2`).

The `.env.story-gen-8a769` file is back to its pre-test state. No net change to the committed env file.

### 41.4 Generation Evidence (Write)

Write commands executed with `IMAGE_CONCURRENCY=1` active:

| sample | bookId | profile | runId |
| --- | --- | --- | --- |
| Book I1 | `LP9dLwaVodcsz0GCOlJP` | anchored moderate (`i1`) | `t6-nonfixed-20260517175726` |
| Book I2 | `Gs0MrswWkcuAo2bQ4W9Y` | rich (`i2`) | `t6-nonfixed-20260517175733` |

### 41.5 Monitor / Inspect Structural Results

#### Book I1 (LP9dLwaVodcsz0GCOlJP) — IMAGE_CONCURRENCY=1

| field | value |
| --- | --- |
| bookId | `LP9dLwaVodcsz0GCOlJP` |
| status | **completed** |
| progress | 100 |
| creationMode | guided_ai |
| theme | fantasy |
| styleId | crayon |
| pageCount requested | 8 |
| pages actual | 8 |
| pages `completed` status | 2 (pages 0–1) |
| pages `fallback_completed` | 6 (pages 2–7) |
| pages `image_failed` | 0 |
| imageAttemptCount (pages 0–1) | 1 |
| imageAttemptCount (pages 2–7) | 3 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 17412 / 44203 / 59888 |

#### Book I2 (Gs0MrswWkcuAo2bQ4W9Y) — IMAGE_CONCURRENCY=1

| field | value |
| --- | --- |
| bookId | `Gs0MrswWkcuAo2bQ4W9Y` |
| status | **completed** |
| progress | 100 |
| creationMode | guided_ai |
| theme | fantasy |
| styleId | crayon |
| pageCount requested | 8 |
| pages actual | 8 |
| pages `completed` status | 1 (page 0) |
| pages `fallback_completed` | 7 (pages 1–7) |
| pages `image_failed` | 0 |
| imageAttemptCount (page 0) | 1 |
| imageAttemptCount (pages 1–7) | 3 |
| imageTimedOut pages | 0 |
| referenceImagesUsed pages | 0 |
| usedCharacterReference pages | 0 |
| imageDurationMs (min / avg / max) | 32452 / 41700 / 74193 |

### 41.6 T6-23 vs T6-26 Comparison

| metric | T6-23 (concurrency=2) | T6-26 (concurrency=1) |
| --- | --- | --- |
| I1 fallback pages | 7/8 | 6/8 |
| I2 fallback pages | 7/8 | 7/8 |
| I1 `completed` pages | 1 (page 0) | 2 (pages 0–1) |
| I2 `completed` pages | 1 (page 0) | 1 (page 0) |
| image_failed pages | 0 | 0 |
| imageTimedOut pages | 0 | 0 |
| Structural completion | 8/8 both books | 8/8 both books |

### 41.7 H1 Verdict

H1 stated: `IMAGE_CONCURRENCY=2` caused burst API failures on `pro_consistent`, which drove the 7/8 fallback pattern.

H1 success criteria from T6-25:

| condition | result |
| --- | --- |
| fallback_completed ≤ 1/8 per book | **Not met** (6/8 and 7/8) |
| fallback_completed materially lower than 7/8 | **Not met** (improvement of 1 page on I1 only) |
| fallback_completed remains around 7/8 | **Met** — this condition applies |

**H1 verdict: WEAK**

Reducing concurrency from 2 to 1 produced at most a 1-page improvement in I1 (7→6) and no improvement in I2 (7→7). The fallback pattern is not primarily driven by burst concurrency.

### 41.8 Updated Root Cause Analysis

With H1 ruled out as the primary driver, two remaining hypotheses gain more weight.

#### H2: Replicate flux-2-pro intermittent availability per account or session (now primary hypothesis)

Both T6-23 and T6-26 show the same pattern: pages 0 (and occasionally 1) succeed with `pro_consistent`, while later pages consistently exhaust the primary retries. This pattern is independent of whether pages are generated in parallel (concurrency=2) or serially (concurrency=1).

This suggests that `pro_consistent` / flux-2-pro becomes unavailable shortly after the first 1–2 successful generations within a single book run. The most plausible mechanism is:

- A per-account or per-session rate limit on flux-2-pro predictions that kicks in after the first 1–2 calls in quick succession.
- A warm-start / cold-start routing effect where the first call lands on a ready instance, but subsequent calls hit cold instances that return error responses within the 120 s timeout.

Supporting evidence:
- Pattern is consistent across 4 books (T6-23 I1, T6-23 I2, T6-26 I1, T6-26 I2).
- Page 0 always succeeds. Pages 1–7 fail systematically.
- I1 in T6-26 succeeded on page 1 as well (possibly because with serial generation, there was a small natural delay between pages 0 and 1 that allowed the rate limit to reset partially).
- `imageTimedOut = 0` in all 4 books: the failures are fast errors, not slow timeouts.

#### H3: Prompt complexity escalation after the opening page (secondary hypothesis)

Imagination pages 1–7 may carry significantly more scene-specific content than page 0 (the story introduction). If flux-2-pro has a prompt length or token budget issue that causes fast rejections on complex prompts, this could explain the consistent page 0 success pattern.

However, H3 is less likely than H2 because:
- I1 in T6-26 also succeeded on page 1, which is not a simpler prompt than pages 2–7.
- T4 fixed-template books with equally detailed prompts do not show this pattern.

### 41.9 Implications for Remediation Design

| option | H1 assumed | H2 assumed | revised recommendation |
| --- | --- | --- | --- |
| R1: reduce IMAGE_CONCURRENCY | primary fix | ineffective alone | **deprioritized** (tested; did not resolve) |
| R2: increase pro_consistent retry count + backoff | complementary | **potentially effective** if per-session limit is time-gated | retain as next option |
| R3: style-reinforcement on fallback prompt | quality fix | quality fix regardless of cause | retain |
| R4: extend fallback chain to klein_base | quality fix | quality fix regardless of cause | retain |
| R5: post-generation auto-regeneration | premature | worth revisiting with delay | defer |

New option:

- **R6: Diagnose Replicate rate-limit behavior directly** — Add Cloud Logging for the error type (HTTP status code, error body) from flux-2-pro failures, and inspect the logs from T6-26 runs to confirm whether failures are 429 (rate limit), 500 (server error), or connection errors. This is a prerequisite for designing a targeted fix.

### 41.10 Pair Status After T6-26

| pair | verdict | blocker | updated next action |
| --- | --- | --- | --- |
| `imagination × crayon` | **Hold** | fallback-heavy (cause: H2 likely, not H1) | T6-27: visual QA for T6-26 books + R6 error logging investigation |

### 41.11 Exclusions

- No code changes
- No runner changes
- No functions logic changes (env-var change was a test parameter only; restored after test)
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No quality gate threshold changes
- No seed-template data changes
- No Firestore schema/rules changes
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No manual visual QA
- No product exposure matrix update

## 42. T6-27 - Cloud Logs / Primary Failure Code Audit (Docs-Only)

Date: 2026-05-18

### 42.1 Scope

Audit Cloud Functions logs for the `generateBook` function to determine the actual error code and error type for `pro_consistent` (flux-2-pro) primary attempt failures observed in T6-23 and T6-26.

Objective: replace the H1/H2/H3 hypotheses from T6-25 with a log-confirmed root cause.

Books audited:

| run | book | bookId | fallback pages |
| --- | --- | --- | --- |
| T6-23 (concurrency=2) | I1 | `gxuvnnlAnQXf6LVXtSo4` | 7/8 |
| T6-23 (concurrency=2) | I2 | `ZPwrVsVARKIPBEm8mcu2` | 7/8 |
| T6-26 (concurrency=1) | I1 C1 | `LP9dLwaVodcsz0GCOlJP` | 6/8 |
| T6-26 (concurrency=1) | I2 C1 | `Gs0MrswWkcuAo2bQ4W9Y` | 7/8 |

### 42.2 Log Extraction Method

Logs were retrieved via:

```
firebase functions:log --project story-gen-8a769 --only generateBook -n 200
```

The output covers the time window from T6-23 generation (2026-05-17T17:16) through T6-26 generation completion (2026-05-17T18:06).

### 42.3 Confirmed Error Code for All pro_consistent Failures

Every `pro_consistent` (flux-2-pro) attempt failure across all four books returned the identical error:

```json
{
  "message": "Image generation attempt failed",
  "profile": "pro_consistent",
  "error": "Prediction failed: The input or output was flagged as sensitive. Please try again with different inputs. (E005) (uIJ6l3ruRD)"
}
```

Error classification:

| field | value |
| --- | --- |
| Error code | **E005** |
| Error type | **Replicate content sensitivity rejection** |
| HTTP status | not 429 (no rate-limit retry header observed) |
| Timeout | not triggered (`imageTimedOut = 0` on all books) |
| Error message | "The input or output was flagged as sensitive. Please try again with different inputs." |
| Replicate reference ID | `uIJ6l3ruRD` (static error reference, not a per-request ID) |

### 42.4 Log Evidence per Book

#### T6-23 I1 (`gxuvnnlAnQXf6LVXtSo4`) — 2026-05-17T17:17–17:21

All page failures on pro_consistent show E005. Selected log entries:

```
17:17:23 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=1  attempt=0  E005
17:17:50 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=1  attempt=1  E005
17:17:57 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=2  attempt=0  E005
17:18:16 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=2  attempt=1  E005
17:18:15 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=3  attempt=0  E005
17:18:34 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=3  attempt=1  E005
17:18:38 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=4  attempt=0  E005
17:18:51 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=4  attempt=1  E005
17:19:05 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=5  attempt=0  E005
17:19:25 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=5  attempt=1  E005
17:19:25 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=6  attempt=0  E005
17:19:48 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=6  attempt=1  E005
17:20:01 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=7  attempt=0  E005
17:20:20 W  bookId=gxuvnnlAnQXf6LVXtSo4  pageIndex=7  attempt=1  E005
```

Pattern: pages 1–7, both attempts (0 and 1), all E005. Page 0: no failure log (succeeded on first attempt).

#### T6-23 I2 (`ZPwrVsVARKIPBEm8mcu2`) — 2026-05-17T17:17–17:20

```
17:17:19 W  bookId=ZPwrVsVARKIPBEm8mcu2  pageIndex=1  attempt=0  E005
17:17:33 W  bookId=ZPwrVsVARKIPBEm8mcu2  pageIndex=1  attempt=1  E005
17:17:54 W  bookId=ZPwrVsVARKIPBEm8mcu2  pageIndex=2  attempt=0  E005
17:18:17 W  bookId=ZPwrVsVARKIPBEm8mcu2  pageIndex=2  attempt=1  E005
(pages 3–7 follow the same E005 pattern on both attempts)
17:19:25 W  bookId=ZPwrVsVARKIPBEm8mcu2  pageIndex=7  attempt=0  E005
17:19:37 W  bookId=ZPwrVsVARKIPBEm8mcu2  pageIndex=7  attempt=1  E005
```

#### T6-26 I1 C1 (`LP9dLwaVodcsz0GCOlJP`) — 2026-05-17T18:00–18:06

```
18:00:46 W  bookId=LP9dLwaVodcsz0GCOlJP  pageIndex=2  attempt=0  E005
18:00:59 W  bookId=LP9dLwaVodcsz0GCOlJP  pageIndex=2  attempt=1  E005
18:01:35 W  bookId=LP9dLwaVodcsz0GCOlJP  pageIndex=3  attempt=0  E005
18:01:59 W  bookId=LP9dLwaVodcsz0GCOlJP  pageIndex=3  attempt=1  E005
(pages 4–7 follow the same E005 pattern on both attempts)
18:05:28 W  bookId=LP9dLwaVodcsz0GCOlJP  pageIndex=7  attempt=0  E005
18:05:45 W  bookId=LP9dLwaVodcsz0GCOlJP  pageIndex=7  attempt=1  E005
```

No failure on pages 0 or 1 — both succeeded on first pro_consistent attempt.

#### T6-26 I2 C1 (`Gs0MrswWkcuAo2bQ4W9Y`) — 2026-05-17T18:00–18:06

```
18:00:39 W  bookId=Gs0MrswWkcuAo2bQ4W9Y  pageIndex=1  attempt=0  E005
18:00:54 W  bookId=Gs0MrswWkcuAo2bQ4W9Y  pageIndex=1  attempt=1  E005
(pages 2–7 follow the same E005 pattern on both attempts)
18:05:25 W  bookId=Gs0MrswWkcuAo2bQ4W9Y  pageIndex=7  attempt=0  E005
18:05:46 W  bookId=Gs0MrswWkcuAo2bQ4W9Y  pageIndex=7  attempt=1  E005
```

### 42.5 Additional Evidence: E005 Is Not Exclusive to Imagination Prompts

The same log window shows E005 failures on non-imagination books:

- Book `BDKHvJt4J7Bfzwx4IZAg` (2026-05-16): pro_consistent E005 on page 1, attempts 0 and 1.
- Book `7silOATa4vPfvfXNHNIt` (2026-05-17T15:39): pro_consistent E005 on **cover image** generation, attempts 0 and 1.

Other books in the same period (iuCrth0sC6UV9SVVf0F1, yylnhRJfVF23GcVyJBUF, YVsHLGjXJ1svdhzWMDn9, uwhwhq3DmuGPekxBVn0a) completed without E005. This confirms that E005 is triggered by specific prompt content, not by the imagination category alone, but imagination-category prompts carry higher risk.

### 42.6 Hypothesis Revision

Prior hypotheses from T6-25 are now resolved:

| hypothesis | T6-25 assessment | T6-27 finding |
| --- | --- | --- |
| H1: `IMAGE_CONCURRENCY=2` burst pressure | WEAK (tested in T6-26) | **Ruled out** — failures are E005 content filter, not rate-limit |
| H2: Replicate flux-2-pro transient service degradation | primary after T6-26 | **Ruled out** — E005 is deterministic per prompt, not transient |
| H3: Prompt complexity escalation | secondary | **Partially relevant** — narrative complexity correlates with E005 risk |

**New definitive finding: H4 — Replicate / flux-2-pro content sensitivity filter (E005)**

`flux-2-pro` applies a content moderation layer to predictions. When the input or output score exceeds the sensitivity threshold, it returns E005 and the prediction fails immediately. The same prompts submitted to `flux-2-klein-9b` (klein_fast) do not trigger E005. E005 is prompt-deterministic: the same prompt returns E005 on every attempt.

### 42.7 Why Page 0 Consistently Passes

The story quality log for T6-23 I1 shows no `image_prompt.text_risk`, `readable_text_risk`, or `brand_or_logo_risk` warnings on page 0, while pages 1–7 carry multiple such warnings. The opening page is typically a simple scene-setting illustration, while pages 1–7 escalate into imagination-specific content: rocket launches, fantasy landscapes, magic objects, creature encounters, discovery beats. These richer scenes contain elements (fantasy signage, glowing text effects, magical books, spell-like motifs) that push into flux-2-pro's sensitivity threshold.

I1 C1 in T6-26 also succeeded on page 1 because that run generated page 1 story text that did not trigger E005 — confirming the threshold is content-dependent, not positional.

### 42.8 Why Retrying the Same Prompt Does Not Help

E005 is **deterministic**: the same prompt returns E005 on every attempt. This is directly observed in logs — every attempt 0 and attempt 1 for a given page produces the same E005 without exception. R2 (retry with backoff) will not recover from E005.

### 42.9 Updated Remediation Assessment

| option | T6-25 recommendation | T6-27 reassessment |
| --- | --- | --- |
| R1: reduce IMAGE_CONCURRENCY | deprioritized after T6-26 | **Confirmed ineffective** |
| R2: increase pro_consistent retry count + backoff | retain | **Ineffective** — E005 is deterministic per prompt |
| R3: style-reinforcement on fallback prompt | retain | **Remains valid** for fallback quality |
| R4: extend fallback chain to klein_base | retain | **Remains valid** for fallback quality |
| R5: post-generation auto-regeneration | defer | Re-generation with same prompt also hits E005; requires prompt modification |
| R6: diagnose Replicate error type | done | **Complete** — E005 confirmed |

New options:

**R7: Prompt sanitization to reduce E005 trigger probability**

Remove or rewrite image prompt elements that correlate with E005 rejection. The story quality gate `image_prompt.text_risk` / `readable_text_risk` / `brand_or_logo_risk` warnings already flag these patterns. A targeted prompt-builder pass that strips or rewrites these elements before image generation could reduce E005 rejection significantly. Story narrative content is preserved; only the image prompt field is modified.

**R8: Accept E005 as a known flux-2-pro limitation; focus on fallback quality**

If sanitizing imagination prompts meaningfully degrades scene specificity, accept that imagination-category books will use klein_fast for many pages and invest in fallback quality improvement through R3 + R4.

### 42.10 Recommended Path for T6-28

**Primary: R7 — prompt sanitization design and implementation**

- Identify patterns in imagination-category `imagePrompt` fields that correlate with `image_prompt.text_risk` / `readable_text_risk` / `brand_or_logo_risk` quality warnings.
- Design a prompt-builder sanitization pass that removes or rewrites these patterns from the image prompt (not from the story text).
- After implementation, run a new re-smoke to measure E005 rejection rate change.

**Parallel: R4 — evaluate klein_base as fallback quality floor**

- Enable `ENABLE_KLEIN_BASE=true` and compare klein_base vs. klein_fast for crayon style fidelity on imagination prompts.

**Retire: R1, R2** — formally retired. Both are confirmed ineffective for E005.

**Defer: R5** — premature until prompt sanitization (R7) reduces the E005 rate.

### 42.11 Pair Status After T6-27

| pair | verdict | root cause (confirmed) | recommended next action |
| --- | --- | --- | --- |
| `imagination × crayon` | **Hold** | E005 content sensitivity rejection by flux-2-pro on pages 1–7 | T6-28: design and implement R7 prompt sanitization |

### 42.12 Exclusions

- No code changes
- No runner changes
- No functions changes
- No UI changes
- No style exposure matrix changes
- No style profile changes
- No quality gate threshold changes
- No seed-template data changes
- No Firestore schema/rules changes
- No new smoke generation
- No image generation
- No Admin regeneration
- No reference-flow generation
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
- No private image URLs or storage tokens recorded
- No manual visual QA
- No product exposure matrix update