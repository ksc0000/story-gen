# Refine Fixed Template Image Prompts to Further Suppress Text and Signage Artifacts (IMG-001 Follow-up)

## Context

The product roadmap explicitly states `IMG-001 (短期・実施済み / minor follow-up継続)` under Phase 3: Template Mode Quality Follow-ups. It directs: "次回 seed/prompt 更新時に sign / label / poster / banner / storefront sign など文字誘発語をさらに避ける。" While initial efforts have been made, continuous refinement of image prompts is necessary to achieve consistent image quality, particularly regarding the suppression of unwanted text and signage within generated illustrations for `fixed_template` books. This task focuses on identifying and enhancing prompts in existing templates prone to these artifacts.

## Objective

Identify existing `fixed_template` image prompts that may still generate unintended text or signage, and refine them by adding stronger negative prompt keywords and rephrasing positive prompt elements to minimize text-inducing artifacts in the generated illustrations. The goal is to improve the visual quality and readability of illustrations by preventing spurious text from appearing.

## Allowed Scope

-   `functions/src/templates/`
-   `functions/src/imageGen/` (specifically `buildImagePrompt.ts` if general prompt construction logic needs adjustment, but primarily `templates/`)
-   `functions/test/` (for adding or updating tests related to image prompt construction)
-   `docs/` (for documenting findings or changes in a quality review document)

## Forbidden Scope

-   Infrastructure (Firebase configuration, Cloud Functions deployment outside `functions/src` changes)
-   Billing (Stripe integration, pricing logic)
-   Authentication redesign
-   Secrets management
-   Generated assets (e.g., `lib/`)
-   UI/Frontend code

## Requirements

-   **Review Current Fixed Templates:** Examine `FixedStoryTemplate` definitions (e.g., in `functions/src/templates/`) to identify image prompts that are likely to produce text/signage based on their subject matter (e.g., street scenes, shops, books, signs). Prioritize templates that have shown such issues in past quality reviews or smoke tests.
-   **Refine Image Prompt Templates:** For identified templates, modify their `imagePromptTemplate` fields to include more robust negative prompt clauses such as `no text, no words, no letters, no typography, no signage, no labels, no posters, no banners, no storefront signs, no brand names, no logos`. Also, consider rephrasing positive prompt elements if they implicitly encourage text generation.
-   **No Regression:** Ensure that prompt changes do not negatively impact other aspects of image quality (e.g., character consistency, style adherence, scene diversity).
-   **Document Changes:** If applicable, update the `Template Quality Review` document or create a new internal memo detailing which templates were modified, what specific changes were made to the prompts, and the rationale.
-   **Create Smoke Test Books:** Generate 2-3 sample books using the modified templates to visually verify the reduction of text/signage artifacts. Save their IDs for review.

## Output Format

-   Summary
-   Changed files
-   Tests executed
-   Known issues
-   Suggested next task

## Worker prompt

```text
You are an AI Loop Worker. Your task is to refine image prompts for existing fixed templates to further suppress text and signage artifacts.

1.  **Review Fixed Templates:**
    *   Examine `functions/src/templates/fixedStoryTemplates.ts` and other relevant template files.
    *   Focus on templates where the scene context (e.g., urban, shops, libraries, public spaces) might lead to unwanted text or signage. If you have access to previous quality review data, prioritize templates flagged for text/signage issues.
    *   As an initial focus, consider templates such as `fixed-brush-teeth`, `fixed-first-birthday`, `fixed-sleepy-moon-adventure`, and `fixed-little-helper` as these have been subject to recent quality refinement efforts.

2.  **Refine Image Prompt Templates:**
    *   For the identified `imagePromptTemplate` strings, add or strengthen negative prompt clauses. A robust set of negative terms includes: `no text, no words, no letters, no typography, no signage, no labels, no posters, no banners, no storefront signs, no brand names, no logos, no inscriptions, no graffiti`.
    *   Carefully review the positive prompt components as well. If any positive phrasing might inadvertently encourage text (e.g., "a cozy bookshop with many books"), consider slightly rephrasing to focus on visual elements without implying textual content (e.g., "a cozy bookshop filled with colorful books on shelves").

3.  **Local Testing:**
    *   Run `npm test` in the `functions/` directory to ensure no regressions in existing tests.
    *   If applicable, add specific unit tests for `buildImagePrompt.ts` or similar utility functions to verify negative prompt injection.

4.  **Manual Smoke Testing:**
    *   After making changes, manually create 2-3 books using the modified templates via the `/create` flow. Pay close attention to pages where text/signage issues were previously observed.
    *   Record the `bookId`s of these generated books for later review.

5.  **Documentation:**
    *   If significant changes are made to multiple templates, document the specific templates modified, the prompt changes (before/after), and your observations from smoke testing in a concise Markdown note within the `docs/quality/` directory (e.g., `docs/quality/IMG-001_Prompt_Refinement_Report_YYYYMMDD.md`).

## Acceptance Criteria

-   At least 3 `fixed_template` image prompts have been reviewed and, if necessary, updated with stronger text-suppression negative prompts.
-   `npm test` in `functions/` passes with no new failures.
-   Manual smoke tests on generated books show a noticeable reduction or absence of unintended text/signage artifacts in the modified
