# Diagnose Protagonist Visual Consistency Failures

## Context

The product roadmap for EhonAI (Ehoria) explicitly lists `主人公一貫性の改善` (Improve protagonist consistency) under Phase 2: Story & Illustration Quality. While `character consistency diagnostics` (PR #388) and `anchor recurring character face geometry to the reference` (PR #447) have been implemented, the core improvement task remains. This task aims to leverage existing diagnostic tools and manual review capabilities to identify specific, recurring failure patterns in protagonist visual consistency across generated book pages. This analysis will inform subsequent targeted improvements in prompt engineering or model usage.

## Objective

Analyze a selection of generated books to systematically identify and document common failure patterns in the visual consistency of the protagonist character. The output will be a detailed report describing these patterns, their observed frequency, and potential contributing factors, providing a concrete foundation for future iteration.

## Allowed Scope

- `docs/`: Create a new diagnostic report Markdown file (`docs/PROTAGONIST_CONSISTENCY_DIAGNOSTICS.md`).
- Read-only access to:
    - Admin Quality Review UI
    - Admin UI for Character Consistency Diagnostics
    - Cloud Logging (for generation logs related to selected books)
    - Source code related to `generate-book.ts`, `styleBible`, and character prompting (for
