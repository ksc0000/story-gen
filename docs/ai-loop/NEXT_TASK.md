# Define Quality Review Rubrics (Story, Illustration, Character, Personalization, Safety)

## Context

Phase 2 of the roadmap, "Story & Illustration Quality," aims to ensure generated picture books are "acceptable as a product." Granular human quality review scores are now persisted and displayed in the Admin UI (`PR #365`, `PR #372`). To standardize human review processes, provide a clear baseline for future LLM auto-review comparisons, and meet the explicit Phase 2 completion criteria ("Admin Review 1〜5 rubric が定義されている"), specific rubrics need to be documented.

## Objective

Create new markdown documents that define the criteria for the Story Quality, Illustration Quality, Character Consistency, Personalization, and Safety scores used in manual quality reviews. Update the `QUALITY_METRICS.md` document to link to these new rubric definitions.

## Allowed Scope

- `docs/` (create new markdown files, update `QUALITY_METRICS.md`)

## Forbidden Scope

- `functions/`
- `lib/`
- `web/`
- `e2e/`
- Infrastructure
- Billing
- Authentication redesign
- Secrets
- Generated assets

## Requirements

- Create a separate markdown document for each of the five quality axes:
    - Story Quality
    - Illustration Quality
    - Character Consistency
    - Personalization
    - Safety
- Each rubric document should clearly outline:
    - The purpose/goal of the score for that axis.
    - Specific criteria for assigning different score levels (e.g., 1-5 or 1-100, aligning with existing UI where applicable).
    - Examples of what constitutes "good" vs. "poor" quality for that specific axis.
    - Any edge cases or nuances to consider.
- The rubrics should be actionable and easily understood by a human reviewer.
- Update `docs/QUALITY_METRICS.md` to include links to each of the newly created rubric documents.
- Keep changes reviewable (i.e., focus on documentation, no backend/frontend code changes).
- Include tests where appropriate (e.g., ensure new files are part of `docs` structure, internal links work). For a docs-only task, `markdownlint` or similar checks are sufficient.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker prompt

```markdown
Generate new markdown files defining detailed rubrics for Story Quality, Illustration Quality, Character Consistency, Personalization, and Safety. For each rubric, describe its purpose, scoring criteria (e.g., what a score of 1 vs. 5 means), and examples of good/bad quality specific to that axis. Then, update `docs/QUALITY_METRICS.md` to link to these new rubric documents. Ensure all new files are placed in the `docs/` directory and adhere to Markdown formatting best practices.
```
