```markdown
# Worker Prompt Template

## Context

The product roadmap highlights the need for continued reliability and quality validation, particularly for the core generation modes. Phase 1 (Reliability First) has pending production smoke evidence, and Phase 3 (Template Mode) focuses on strengthening the most stable generation mode. The next immediate step identified in the roadmap's "優先順位 (Now)" section is to perform the `Template Smoke Checklist`.

## Objective

Execute the `Template Smoke Checklist` for the 6 `fixed_template`s (the initial 4 templates and the 2 added in T2-A). The goal is to verify their real-generation performance and quality, documenting all findings in the designated markdown file.

## Allowed Scope

- `docs/TEMPLATE_SMOKE_CHECKLIST.md` (for recording test results and observations)
- `functions/src/` (for creating or using existing local scripts to trigger book generation for testing purposes, if direct UI interaction is not sufficient or efficient)
- `web/` (for interacting with the admin UI or user-facing generation flow to initiate book creation for the smoke test)
- `firebase-admin-test-cli/` (for using CLI tools to facilitate book generation for the smoke test)

## Forbidden Scope

- `firebase.json`
- `package.json` at root level
- Infrastructure configuration (e.g., `infra/` directory)
- Billing related code or configurations
- Authentication redesign
- Secrets management (e.g., `.env` files, Google Cloud Secret Manager configurations)
- Generated assets (`public/`, `dist/`, `lib/` directories in functions)
- Core database schema changes (Firestore or other)
- Firebase rules modifications beyond minor additions for quality review documents (if absolutely necessary for results recording, but not expected for this task)

## Requirements

- **Identify Templates**: The 6 `fixed_template`s for this smoke test are:
    - `fixed-animal-adventure`
    - `fixed-magical-journey`
    - `fixed-tiny-hero`
    - `fixed-bedtime-story`
    - `fixed-memories-sparkle` (from T2-A)
    - `fixed-emotional-garden` (from T2-A)
- **Generate Books**: For each of these 6 `fixed_template`s, generate at least one complete book using the standard generation flow (e.g., through the admin UI or a command that accurately simulates the user flow).
- **Consult Checklist**: Thoroughly review the criteria outlined in `docs/TEMPLATE_SMOKE_CHECKLIST.md` for evaluating each generated book.
- **Record Results**: Fill out `docs/TEMPLATE_SMOKE_CHECKLIST.md` with detailed, objective observations for each generated book. This must include:
    - Overall success/failure status.
    - Any specific quality issues (e.g., story coherence, character consistency, image quality, adherence to `styleBible`, prompt following, unexpected text in images, generation duration, fallback usage).
    - Links to generated book IDs and relevant screenshots/video snippets (if any significant issues or notable successes are observed).
- **Identify Issues**: Clearly document any identified issues, regressions, or areas for improvement for each template.
- **Adhere to Constraints**: The primary output of this task is updated documentation. Minimize code changes unless absolutely necessary to enable the smoke test execution (e.g., a simple local script).

## Output Format

### Summary

Executed the `Template Smoke Checklist` for 6 `
