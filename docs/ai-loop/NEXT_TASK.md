# Execute Template Smoke Checklist for 6 Fixed Templates

## Context

Phase 3 of the product roadmap focuses on enhancing Template Mode (`fixed_template`). The initial set of 6 templates (existing 4 + T2-A additions) have been updated to support cover, title, and narration, and their `imagePromptTemplate` and `pageVisualRole` have been refined. This task is explicitly listed as `T1-Smoke` in the roadmap's Phase T1 section and as an immediate priority under "Now". This verification step is crucial to ensure the quality and reliability of these core 4-page templates before proceeding with further template expansion or variants.

## Objective

Run the fixed-template generation process for the specified 6 templates, visually inspect the generated books, and record the results in the `TEMPLATE_SMOKE_CHECKLIST.md` document. This confirms that the templates function as expected, producing high-quality and consistent outputs, including cover images, title spreads, narrations, and page-specific illustrations.

## Allowed Scope

- `functions/`: Scripts for book generation (e.g., `create-book.ts` or similar utility scripts).
- `docs/`: Update `docs/TEMPLATE_SMOKE_CHECKLIST.md`.
- `test/`: Existing test scripts if used for verification, no new tests needed for this task.

## Forbidden Scope

- Core generation logic changes (e.g., in `generate-book.ts` or `generatePageImage.ts`).
- UI changes (frontend code).
- Infrastructure or Firebase configuration changes.
- Modifications to existing template definitions in `functions/src/templates/`.
- Creating new templates or template variants.

## Requirements

- **Generate Books**: For each of the following 6 fixed templates, generate a complete book (including cover, title spread, and all 4 pages):
    - `fixed-animals-adventure`
    - `fixed-bedtime-story`
    - `fixed-forest-friends`
    - `fixed-magical-journey`
    - `fixed-memories` (from T2-A)
    - `fixed-emotional-growth` (from T2-A)
- **Visual Inspection**: For each generated book, use the Admin UI to visually inspect:
    - Cover page quality and relevance.
    - Title spread and opening narration.
    - Consistency of main characters across pages.
    - Style adherence (`styleBible`).
    - Page visual roles and compositional variety.
    - Absence of text or undesirable artifacts in images.
    - Readability and naturalness of story text.
- **Record Results**: Fill out the `docs/TEMPLATE_SMOKE_CHECKLIST.md` for each template, marking pass/fail for each criterion and adding detailed notes for any failures or observations.
- **Documentation**: If any critical issues are found, clearly document them as "Known Issues" and suggest specific "Suggested next task"
