# Implement `availablePageCounts` in `FixedStoryTemplate` and its UI integration

## Context

The product roadmap for Phase 3: Template Mode, specifically Step T3-A, calls for adding `availablePageCounts` to `TemplateData`. While `variantOf` and `variantLabel` have been implemented (PR #493), `availablePageCounts` remains unticked in the roadmap table. This feature is crucial for explicitly defining which page counts (e.g., 4, 8, 12) a given template supports and integrating this information into the user interface.

Currently, 8-page and 12-page variants are implemented (PR #276, PR #496), and a page count selector exists in the template detail
