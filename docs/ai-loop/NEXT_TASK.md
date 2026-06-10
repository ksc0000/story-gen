# Worker Prompt Template

## Context

The product roadmap indicates that the initial quality review of existing templates (Phase T3-2) has been completed, and specific P1 issues have been identified for refinement. One such issue pertains to the `pageVisualRole` consistency within the `fixed-brush-teeth` template. Addressing these identified quality issues is a prerequisite for further template expansion and ensuring a high-quality user experience.

## Objective

Implement the necessary changes to ensure the `pageVisualRole` is correctly aligned and consistent across all pages of the `fixed-brush-teeth` template, as identified in the `TEMPLATE_QUALITY_REVIEW.md` document.

## Allowed Scope

- `functions/src/fixed-templates/`
- `functions/src/types/` (if type definition adjustments are strictly necessary for the template structure)
- `functions/src/prompts/` (if the visual role fix requires prompt adjustments)
- `functions/src/templates/` (if the template processing logic needs adjustment)
- `functions/tests/` (for adding or modifying tests)
- `docs/` (for updating `TEMPLATE_QUALITY_REVIEW.md` with the resolution)

## Forbidden Scope

- Infrastructure configuration (e.g., `firebase.json` for anything other than `functions/` build steps)
- Billing logic
- Authentication redesign
- Secrets management
- Generated assets
- UI/Client-side code

## Requirements

- **Reviewable changes:** The PR should be small and focused, addressing only the `pageVisualRole` issue for `fixed-brush-teeth`.
- **Docs-first updates:** Reference the specific entry in `TEMPLATE_QUALITY_REVIEW.md` being addressed and update its status upon completion.
- **Include tests:** Add or modify unit tests for the `fixed-brush-teeth` template generation to verify the `pageVisualRole` consistency. Consider a
