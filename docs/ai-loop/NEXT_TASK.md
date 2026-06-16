# Implement `TemplateData` Fields for Page Count and Variant Management

## Context

The product roadmap outlines the need to support 8-page and potentially 12-page story templates, along with variants of existing templates (Phase 3: Template Mode - T3-A). While some 8-page templates have been implemented and `PlanConfig` updated, the underlying `TemplateData` in Firestore still needs to be extended to fully support `availablePageCounts`, `variantOf`, and `variantLabel`. This is a foundational step for improving the template selection UI and enabling users to choose different page counts or template variations.

## Objective

Extend the `FixedStoryTemplate` (and corresponding `TemplateData` Firestore structure) to include `availablePageCounts`, `variantOf`, and `variantLabel
