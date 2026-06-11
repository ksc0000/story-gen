# Execute Template Smoke Checklist for 6 Fixed Templates

## Context

Phase 3 of the roadmap focuses on strengthening `Template Mode` for reliability and stable quality. We have integrated cover/title/narration support (`T1-A` to `T1-C`) and enhanced `imagePromptTemplate` and `pageVisualRole` (`T1-D`) for a set of `fixed_template` entries. The "Now" section of the roadmap explicitly prioritizes `T1-Smoke`: executing the template smoke checklist for these 6 templates to verify the stability and quality of the generated books. This verification is crucial before proceeding with further template expansion or wider feature rollouts.

## Objective

Generate books using the 6 specified `fixed_template` entries (4 existing + 2 from T2-A) and thoroughly execute the `Template Smoke Checklist` (`docs/TEMPLATE_SMOKE_CHECKLIST.md`), documenting the results.

## Allowed Scope

- `docs/` (for updating `TEMPLATE_SMOKE_CHECKLIST.md`)
- `scripts/` (for invoking book generation, e.g., `generate-book.ts`)
- Admin UI (for monitoring generation status and quality review)

## Forbidden Scope

- Infrastructure changes (e.g., Firebase project settings, Cloud Run configurations)
- Billing configuration
- Authentication redesign
- Secrets management
- Direct modification of core AI generation logic in `functions/` (unless specifically required for diagnostics and approved)
- Generated assets (e.g., `.next/`, `lib/` in `functions/`)

## Requirements

1.  **Generate Books**: For each of the following 6 `fixed_template` entries, generate one complete book using the `fixed_template` mode and typical user inputs (e.g., character name, age, simple themes):
    *   `fixed-a-day-at-the-zoo`
    *   `fixed-magical-forest-adventure`
    *   `fixed-farm-friends`
    *   `fixed-outer-space-journey`
    *   `fixed-memories-of-grandma` (from T2-A)
    *   `fixed-the-growing-tree` (from T2-A)
2.  **Execute Checklist**: For each generated book, thoroughly fill out the `docs/TEMPLATE_SMOKE_CHECKLIST.md`. Pay close attention to:
    *   Successful generation of all pages, cover, title spread, and opening narration.
    *   Overall story coherence and alignment with the template's theme and intent.
    *   Visual quality, style adherence, and page diversity.
    *   Character consistency across pages.
    *   Absence of problematic elements (e.g., text in images, unexpected objects/characters).
    *   Verification of `pageVisualRole` application.
3.  **Document Findings**: Record the `bookId` for each generated book in the checklist. Document any observed issues, unexpected behaviors, or quality regressions in detail within the checklist or as an attached note.
4.  **Confirm Phase 1 State**: As a meta-check, briefly confirm if the Cohort B rollout is providing sufficient real production evidence to advance the `Phase 1: Reliability First` smoke checklists.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker Prompt

```markdown
Generate books for the 6 specified `fixed_template` entries (fixed-a-day-at-the-zoo, fixed-magical-forest-adventure, fixed-farm-friends, fixed-outer-space-journey, fixed-memories-of-grandma, fixed-the-growing-tree) using the `fixed_template
