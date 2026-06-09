# Worker Prompt Template

## Context

The product roadmap indicates a focus on enhancing the reliability and quality of Template Mode stories. Specifically, several P1 quality issues have been identified in existing templates during the T3-2 template quality review. This task addresses one of these issues, focusing on `pageVisualRole` consistency for a specific template.

## Objective

Update the `fixed-brush-teeth` template to consolidate and ensure consistent `pageVisualRole` assignments across its pages, as detailed in the `Template Quality Review` document.

## Allowed Scope

- `src/story/fixed-story-templates/fixed-brush-teeth.ts` (or the equivalent template definition file)
- `src/story/fixed-story-templates/index.ts` (if needed to update template metadata or exports)
- Related test files (e.g., `src/story/fixed-story-templates/__tests__/fixed-brush-teeth.test.ts`)
- Documentation files (e.g., `docs/TEMPLATE_MODE_T3_PLAN.md` to mark this item as completed)

## Forbidden Scope

- Infrastructure
- Billing
- Authentication redesign
- Secrets
- Generated assets
- Any files outside the explicitly allowed scope.

## Requirements

- **Consolidate `pageVisualRole`:**
    - For `page_0` (cover), `page_1` (title spread), `page_2` (opening narration), and `page_8` (end spread), set `pageVisualRole` to `wide_shot`.
    - For `page_3` (`brush_teeth_scene_1`), `page_4` (`brush_teeth_scene_2`), `page_5` (`brush_teeth_scene_3`), `page_6` (`brush_teeth_scene_4`), and `page_7` (`final_scene`), set `pageVisualRole` to `medium_shot`.
- **Verify template integrity:** Ensure all other fields and logic within the template remain unchanged and functional.
- **Update documentation:** Mark `T3-2a` as completed in `docs/TEMPLATE_MODE_T3_PLAN.md`.
- Ensure changes are small and reviewable.
- Include unit tests if any new logic is introduced (though this task is primarily data/config modification).

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

### Summary

The `fixed-brush-teeth` template's `pageVisualRole` assignments are inconsistent across pages. This task involves updating the template definition to ensure the correct `pageVisualRole` (either `wide_shot` or `medium_shot`) is applied to each page according to the specification outlined in `docs/TEMPLATE_MODE_T3_PLAN.md` under `T3-2a`. This improves visual consistency and quality for the template.

### Changed files

- `src/story/fixed-story-templates/fixed-brush-teeth.ts`
- `docs/TEMPLATE_MODE_T3_PLAN.md`

### Tests executed

1.  **Unit Tests:** Run `npm test` to ensure no existing tests are broken by the template configuration change.
2.  **Local Generation Smoke Test:**
    - Manually generate a book using the `fixed-brush-teeth` template in a local development environment.
    - Verify that the generated book's `BookDoc.pages` array reflects the updated `pageVisualRole` values.
    - Visually inspect the generated images for the `fixed-brush-teeth` template to confirm that `wide_shot` and `medium_shot` compositions are being applied as expected for their respective pages.

    Required commands:
    ```bash
    npm test
    # Follow local setup instructions to generate a book using the fixed-brush-teeth template
    # Example (adjust as per your local setup and template ID):
    # npm run generate-book -- --template fixed-brush-teeth --childName "Example" --gender girl --ageBand preschool_3_4 --style soft_watercolor
    ```

### Known issues

- This task specifically addresses `pageVisualRole` for `fixed-brush-teeth`. Other identified P1 quality issues for other templates (T3-2b, T3-2c, T3-2d) remain.
- The `REF-001: Character Reference Strategy` documentation is still in draft.

### Suggested next task

**Objective:** Address the next P1 template quality issue from the Template Quality Review.

**Task:** Update the `fixed-first-birthday` template to fix the `sampleImage` duplication and category mismatch.

**Reference:** `docs/TEMPLATE_MODE_T3_PLAN.md` (T3-2b)
