# Refine `fixed-brush-teeth` Template for `pageVisualRole` Consistency

## Context

Phase 3 of the product roadmap focuses on enhancing the Template Mode for reliability and quality. The "T3-2 status update" identified critical P1 quality issues for existing templates based on the `TEMPLATE_QUALITY_REVIEW.md` document. Specifically, item T3-2a points to inconsistencies in `pageVisualRole` within the `fixed-brush-teeth` template, which can lead to suboptimal visual storytelling and prompt generation. This task directly addresses this identified quality improvement.

## Objective

Improve the `pageVisualRole` definitions within the `fixed-brush-teeth` template to ensure better visual consistency and narrative flow across the book's pages, aligning with the quality review recommendations.

## Allowed Scope

-   `src/common/fixed-templates.ts` (specifically, the `fixed-brush-teeth` template data).
-   `src/common/story-json.ts` (only if `pageVisualRole` enum needs minor adjustment for the template's context, which is unlikely but allowed).
-   `src/functions/generate-book.ts` (only for adding a temporary diagnostic log for `pageVisualRole` values during testing, to be removed before PR merge).
-   Corresponding test files if applicable to the template data structure (unlikely for a simple data change).

## Forbidden Scope

-   Infrastructure changes (Firebase rules, Cloud Functions deployment config beyond `src/functions`).
-   Billing or subscription logic.
-   Authentication redesign.
-   Secrets management.
-   Generated assets (e.g., actual template preview images).
-   
