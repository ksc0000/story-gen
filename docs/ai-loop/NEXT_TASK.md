# Refine `fixed-first-birthday` Template for Sample Image and Category Alignment

## Context

The product roadmap for Phase 3: Template Mode, specifically the T3-2 "既存10テンプレート品質磨き込み" (Existing 10 Templates Quality Refinement) section, identifies P1 priority items based on the `Template Quality Review` document. One such item concerns the `fixed-first-birthday` template, noting a potential mismatch between its `sampleImage` and its assigned `category`, or that the category itself could be more precise.

Recent work has greatly expanded the number of fixed templates (PR #274) and improved the template selection UI (PR #253), making it crucial for each template's presentation to be clear and consistent. This task aims to address a specific, high-priority quality issue identified in the template review.

## Objective

Improve the `fixed-first-birthday` template by ensuring its `sampleImage` accurately reflects the template's theme and aligns with its `category` definition, thereby enhancing user understanding and expectation setting.

## Allowed Scope

- `src/templates/fixed_templates.ts` (for updating template metadata, including `category` and `sampleImage` path)
- `public/assets/templates/` (for adding, updating, or replacing sample image files)

## Forbidden Scope

- Infrastructure changes (e.g., Firebase configurations, Cloud Functions deployments beyond typical client updates)
- Billing or payment system modifications
- Authentication or user management redesign
- Secrets management
- Automated generation of images or text (unless explicitly part of a template update)
- Changes to core AI generation logic or providers
- Any files or directories outside of `src/templates/` and `public/assets/templates/`

## Requirements

- Keep changes reviewable, focusing on a single template.
- Review `TEMPLATE_QUALITY_REVIEW.md` for specific guidance on `fixed-first-birthday`.
- If a new `sampleImage` is deemed necessary, ensure it adheres to existing naming conventions and is optimized for web display.
- Ensure the updated template entry passes existing type checks and linting rules.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

Please perform the following steps:

1.  **Review the `fixed-first-birthday` template:**
    *   Locate the `fixed-first-birthday` entry within `src/templates/fixed_templates.ts`.
    *   Consult the `TEMPLATE_QUALITY_REVIEW.md` document (specifically the entry for `fixed-first-birthday`) for the detailed P1 feedback regarding its `sampleImage` and `category`.
    *   Visually inspect the current `sampleImage` located at `public/assets/templates/fixed-first-birthday.png` (or its actual path) and compare it against the template's story text and its current `category: "memories"`.

2.  **Determine the best course of action:**
    *   **Option A: Update `category`:** If the template is highly specific to "first birthday" and a more fitting category exists or can be reasonably proposed (e.g., if a `celebration` or `birthday` category were to be added globally, though for this task, a minor tweak to an existing category if suitable is preferred, or a more precise sub-category within `memories` if applicable).
    *   **Option B: Update `sampleImage`:** If the `category: "memories"` is to be retained as a broader concept, generate or select a new `sampleImage` that is more universally representative of "memories" while still being relevant to the story's theme.
    *   **Option C: Minor adjustment to existing `sampleImage` description/metadata:** If both the current image and category are acceptable with minor context adjustment.

3.  **Implement the chosen change:**
    *   **If updating `category`:** Modify the `category` field in `src/templates/fixed_templates.ts` for `fixed-first-birthday`.
    *   **If updating `sampleImage`:**
        *   Obtain a new image that better fits the chosen strategy.
        *   Place the new image file in `public/assets/templates/` following existing naming conventions (e.g., `fixed-first-birthday_v2.png` if keeping the original as a reference, or simply overwriting if confident).
        *   Update the `sampleImage` path in `src/templates/fixed_templates.ts` to point to the new image.

4.  **Verification:**
    *   Run `npm run typecheck` and `npm run lint` to ensure no errors are introduced.
    *   Manually navigate to the template selection UI in a local development environment to visually confirm that the `fixed-first-birthday` template card displays correctly with the updated `sampleImage` and/or `category` information.

## Tests Executed

- `npm run typecheck`
- `npm run lint`
- Manual visual inspection of the template card in the local development environment (`/create/input` route).

## Known Issues

- None expected from this bounded task.

## Suggested Next Task

Refine `fixed-sleepy-moon-adventure` Template for Sample Image and Category Alignment (addressing the next P1 item from `Template Quality Review.md`).
