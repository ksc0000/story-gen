# Add Two New Fixed Templates: 'Learning' and 'Favorite Worlds'

## Context

The product roadmap includes "Phase 3: Template Mode" to strengthen `fixed_template` generation. Under "Phase T2: テンプレート拡充 (4 ページ × 10 本目標)", steps T2-A and T2-B have been completed, adding templates 5-8. The next logical step is to complete T2-C. This involves adding two new 4-page templates based on the themes 'learning' and 'favorite-worlds'. This task focuses on the data definition and initial content for these templates.

## Objective

Implement the data definitions for two new 4-page fixed templates, focusing on the themes of 'learning' and 'favorite-worlds', as part of Phase T2-C of the Template Mode expansion.

## Allowed Scope

-   `functions/src/templates/fixed-story-templates.ts`
-   `functions/src/config/` (if configuration for new categories is required)
-   `functions/src/prompts/` (for adding new, reusable prompt fragments if necessary)
-   `functions/test/` (for unit tests if any new logic is inadvertently introduced, though unlikely for data-only changes)

## Forbidden Scope

-   `web/src/` (UI changes are not part of this task)
-   Infrastructure changes (Firebase rules, CI/CD, etc.)
-   Billing or payment-related logic
-   Authentication or user management redesign
-   Secrets management
-   Generated assets
-   Changes to existing template logic (only additions are allowed)

## Requirements

-   Add two new entries to the `fixedStoryTemplates` array in `functions/src/templates/fixed-story-templates.ts`.
-   Each new template must be a 4-page template.
-   The themes for the new templates should be 'learning' and 'favorite-worlds'.
-   Each new template object must include:
    -   `templateId` (unique identifier)
    -   `seed` (a brief, unique starting point for the story)
    -   `category` (assign to an existing category, or propose a new one if appropriate, e.g., "Educational" or "Fantasy")
    -   `titleSpreadTextTemplate`
    -   `openingNarrationTemplate`
    -   `coverImagePromptTemplate`
    -   `pageTemplates` (an array of 4 page objects).
    -   Each `pageTemplate` must contain:
        -   `textTemplate`
        -   `imagePromptTemplate` (including `pageVisualRole` for varied compositions)
-   Ensure that the `imagePromptTemplate` for the new templates incorporates best practices for quality (e.g., `no-text` constraints) and character reference isolation where applicable, following `IMG-001` and `IMG-002` guidelines.
-   The `textTemplate` should be appropriate for the `preschool_3_4` age band, adhering to the Japanese Orthography Policy (hiragana-first).
-   All new template content must be in Japanese.

## Output Format

-   Summary
-   Changed files
-   Tests executed
-   Known issues
-   Suggested next task

---

## Worker prompt

Please create two new 4-page fixed templates for the themes of 'learning' and 'favorite-worlds' by modifying `functions/src/templates/fixed-story-templates.ts`.

1.  **Define two new `FixedStoryTemplate` objects.**
    *   One for a 'learning' theme (e.g., about discovering numbers, letters, or nature).
    *   One for a 'favorite-worlds' theme (e.g., exploring a magical forest, a city of toys, or outer space).
2.  **Populate all required fields** for each template: `templateId`, `seed`, `category`, `titleSpreadTextTemplate`, `openingNarrationTemplate`, `coverImagePromptTemplate`, and `pageTemplates` (with 4 `pageTemplate` objects inside).
3.  For each `pageTemplate`, ensure `textTemplate` and `imagePromptTemplate` (including `pageVisualRole`) are provided.
4.  **Craft the prompts carefully:**
    *   `imagePromptTemplate` should incorporate `no-text` and other quality constraints.
    *   `textTemplate` should be in Japanese and suitable for `preschool_3_4` (hiragana-first).
5.  **Assign appropriate `category` values** to the new templates. You may add new `category` entries to `functions/src/config/template-config.ts` if the themes don't fit existing categories (e.g., "まなび", "ふしぎな世界").
6.  **Run `npm test`** within the `functions` directory to ensure no regressions.
7.  **Manually verify template structure:** Generate one book for each new template using the `fixed_template` mode locally. This is to visually inspect the generated story JSON, particularly `titleSpreadText`, `openingNarration`, `coverImagePrompt`, and the `text` and `imagePrompt` of each page, without needing to generate actual images. Confirm that the content aligns with the intended theme and quality guidelines.

Please ensure your changes are focused solely on adding these new template definitions.
