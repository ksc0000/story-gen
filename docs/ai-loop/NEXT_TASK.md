# Refine `fixed-brush-teeth` Template for Visual Consistency

## Context

The product roadmap's Phase 3: Template Mode focuses on strengthening the `fixed_template` mode for reliability and quality. The recent T3-2 "Existing 10 templates quality refinement" status update (`TEMPLATE_QUALITY_REVIEW.md`) identified several P1 items. This task addresses P1-1, which targets visual consistency issues in the `fixed-brush-teeth` template. Specifically, the current `pageVisualRole` and `imagePromptTemplate` fields for this template need refinement to more strongly guide image generation towards the theme of teeth brushing across all pages.

## Objective

Improve the image generation quality and consistency of the `fixed-brush-teeth` template by refining its `pageVisualRole` and `imagePromptTemplate` fields to better reflect and emphasize the theme of teeth brushing.

## Allowed Scope

- `src/storyTemplates/fixed-brush-teeth.ts`
- `docs/TEMPLATE_QUALITY_REVIEW.md` (for status update)

## Forbidden Scope

- Creation of new story templates.
- Any UI changes.
- Changes to any other story template files.
- Infrastructure or billing-related modifications.
- Generating new sample images.

## Requirements

- Adjust the `pageVisualRole` and `imagePromptTemplate` fields within `src/storyTemplates/fixed-brush-teeth.ts` to improve the visual storytelling around teeth brushing.
- Ensure the changes result in generated images that are more consistent and clearer in depicting the act or context of teeth brushing.
- Verify that these changes do not introduce any new visual inconsistencies or reduce overall image quality for the template.
- Add a brief note to `docs/TEMPLATE_QUALITY_REVIEW.md` under the `fixed-brush-teeth` P1 item, indicating that the `pageVisualRole` and `imagePromptTemplate` have been refined.

## Output Format

### Summary

Refined the `fixed-brush-teeth` template by updating `pageVisualRole` and `imagePromptTemplate` to enhance visual consistency related to teeth brushing. Documented the change in `docs/TEMPLATE_QUALITY_REVIEW.md`.

### Changed files

- `src/storyTemplates/fixed-brush-teeth.ts`
- `docs/TEMPLATE_QUALITY_REVIEW.md`

### Tests executed

1.  **Unit Tests:** `npm test` (All tests passed, ensuring no regressions from type/logic changes).
2.  **Manual Generation Test:** `npm run generate-book -- --templateId=fixed-brush-teeth`
    -   Verified the generated book's images visually to ensure the theme of teeth brushing is consistently and clearly depicted across all pages.
    -   Confirmed that `pageVisualRole`'s influence on composition and `imagePromptTemplate`'s specific instructions lead to improved outcomes without unexpected elements.

### Known issues

- No new issues were introduced.

### Suggested next task

# Refine `fixed-first-birthday` Template's `titleSpreadImageUrl`

## Context

The product roadmap's Phase 3: Template Mode continues to focus on refining existing templates for improved quality and consistency. The `TEMPLATE_QUALITY_REVIEW.md` document, an outcome of the T3-2 "Existing 10 templates quality refinement" task, identified several P1 items. Following the refinement of the `fixed-brush-teeth` template, the next logical step is to address P1-2, concerning the `fixed-first-birthday` template. Specifically, its `titleSpreadImageUrl` needs to be updated as it currently features a sample image inconsistent with the template's 'first birthday' theme, instead depicting an animal zoo setting.

## Objective

Update the `titleSpreadImageUrl` for the `fixed-first-birthday` template to use a sample image that accurately reflects the 'first birthday' theme, replacing the current inconsistent animal zoo image.

## Allowed Scope

- `src/storyTemplates/fixed-first-birthday.ts`
- `docs/TEMPLATE_QUALITY_REVIEW.md` (for status update)
- Potentially `public/story-templates-preview/` if a new, appropriate sample image needs to be added (though ideally, an existing, suitable image from `public/` could be leveraged, or a placeholder if no suitable image is immediately available).

## Forbidden Scope

- Creating or generating new images from scratch (unless absolutely necessary and explicitly approved for a placeholder).
- Any UI changes.
- Changes to any other story template files or core generation logic.
- Infrastructure or billing-related modifications.

## Requirements

- Identify or create (as a placeholder if no suitable existing image can be found) a `titleSpreadImageUrl` that appropriately represents a 'first birthday' theme.
- Update the `titleSpreadImageUrl` field in `src/storyTemplates/fixed-first-birthday.ts` with the path to the chosen image.
- Ensure the new image visually aligns with the template's 'first birthday' theme, avoiding generic or misleading imagery.
- Add a brief note to `docs/TEMPLATE_QUALITY_REVIEW.md` under the `fixed-first-birthday` P1 item, indicating that the `titleSpreadImageUrl` has been updated.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task
