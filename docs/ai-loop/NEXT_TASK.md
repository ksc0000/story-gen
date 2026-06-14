# Refine Image Prompts to Suppress Text and Signage Artifacts

## Context

The product roadmap for Phase 2: Story & Illustration Quality includes improving "画像品質" (image quality), and Phase 3 Quality Follow-ups explicitly lists `IMG-001` (suppress text/signage) with a short-term follow-up: "次回 seed/prompt 更新時に sign / label / poster / banner / storefront sign など文字誘発語をさらに避ける。"

While `IMG-001` was initially marked "実施済み" with a minor follow-up, this specific action to further refine prompts against text artifacts is pending. This task directly addresses that actionable follow-up to enhance overall image quality by reducing distracting text within illustrations.

## Objective

Enhance the core image generation prompts, either within existing `styleBible` definitions or the `buildImagePrompt` function, to systematically add negative prompts or specific instructions that explicitly discourage the generation of unintended text, signs, labels, posters, banners, or storefront signs in generated images.

## Allowed Scope

- `functions/src/ai/image/` (e.g., `imagePrompts.ts`, `styleBible.ts`, `styleBiblePrompts.ts`)
- `functions/src/ai/book/generateBook.ts` (if prompt construction logic needs modification)
- `functions/src/ai/constants.ts` (if new global negative prompt constants are introduced)
- Related test files (e.g., `functions/src/ai/image/*.test.ts`, `functions/src/ai/book/*.test.ts`)
- `docs/` (to update relevant quality metrics documentation or add a design note if necessary)

## Forbidden Scope

- Infrastructure changes
- Billing system modifications
- Authentication redesign
- Secrets management
- Automated generation of assets (other than the storybooks themselves for testing)

## Requirements

- Keep changes reviewable.
- Prefer docs-first updates.
- Include tests where appropriate.
- Report follow-up items.

### Acceptance Criteria

-   The core image generation logic (e.g., `styleBible` definitions or prompt construction functions) is modified to include more robust negative prompts against text/signage.
-   Manual smoke tests on at least 5-10 generated books, utilizing various styles and templates, demonstrate a noticeable reduction or absence of unwanted text, signs, or labels in the resulting images.
-   No regression in overall image quality, style adherence, or character consistency is observed during testing.
-   The modifications are accompanied by clear code comments explaining the rationale and specific keywords used for suppression.

### Required Test Commands

-   Run unit and integration tests: `npm test` within the `functions/` directory.
-   Perform manual smoke tests:
    1.  Generate several books using `yarn generate-book` or through the Admin UI on `dev` and `staging` environments.
    2.  Focus on books created with different `styleBible` choices and `fixed_template` options.
    3.  Visually inspect the generated images for the presence of unwanted text artifacts.
    4.  Compare results to
