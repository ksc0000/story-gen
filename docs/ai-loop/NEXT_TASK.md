# Execute Template Smoke Checklist for 6 Fixed Templates

## Context

The product roadmap for EhonAI indicates that Phase 3, "Template Mode — Reliability-First 生成," has a critical remaining task: `fixed_template 6テンプレート（既存4 + T2-A追加2）の実生成 smoke checklist 実行`. This task is also listed in the "Now" priority section. While new templates have been added and UI improvements made, verifying the foundational reliability of these initial 6 fixed templates is essential, especially as the product is in Phase 5 (Monetization) with active soft launch cohorts. The `Template Smoke Checklist` document (`docs/TEMPLATE_SMOKE_CHECKLIST.md`) defines the specific templates and criteria for this verification.

## Objective

Generate books using the 6 specified fixed templates, meticulously follow the `TEMPLATE_SMOKE_CHECKLIST`, and record the results in `docs/TEMPLATE_SMOKE_RESULTS.md`.

## Allowed Scope

- `docs/` (for updating `TEMPLATE_SMOKE_RESULTS.md` with findings)
- `functions/` (for triggering book generation via existing admin tools or scripts for testing purposes)
- `web/` (for interacting with the administrative or user-facing UI to initiate book generation and observe results)
- `scripts/` (for creating a temporary diagnostic script to automate the generation of the 6 books, if deemed efficient)
- `shared/` (if a diagnostic script requires shared types)

## Forbidden Scope

- Infrastructure changes (e.g., new Firebase projects, Cloud Run configurations)
- Billing modifications
- Authentication redesign
- Secrets management (e.g., adding/modifying API keys)
- Generated assets (e.g., images, `package-lock.json` unless absolutely necessary for dependency updates related to the task)

## Requirements

- **Documentation First:** Update `docs/TEMPLATE_SMOKE_RESULTS.md` with detailed findings for each template, including book IDs, observed issues, and compliance with the checklist.
- **Reproducibility:** Clearly state the method used to generate the books (e.g., via admin UI, specific script with commands).
- **Issue Reporting:** For any discrepancies or failures identified during the smoke test, document them thoroughly within `TEMPLATE_SMOKE_RESULTS.md` and suggest follow-up actions.
- **Cleanliness:** If a temporary script is created, ensure it's removed or clearly marked as a diagnostic tool upon completion. No permanent code changes to core generation logic are expected as part of this task, unless a critical bug is discovered and requires an immediate fix (which should be reported as a follow-up).

## Output Format

- Summary of findings for each of the 6 templates.
- A link to the updated
