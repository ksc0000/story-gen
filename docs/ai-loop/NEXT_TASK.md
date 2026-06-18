# Implement `variantOf` and `variantLabel` in FixedStoryTemplate

## Context

The product roadmap outlines Phase 3, "Template Mode — Reliability-First 生成," which aims to enhance the fixed template system. Specifically, Step T3-A proposes adding `availablePageCounts`, `variantOf`, and `variantLabel` to `TemplateData` (which corresponds to `FixedStoryTemplate`). While `pageCount` already exists and 8-page variants have been partially implemented, the `variantOf` and `variantLabel` fields are crucial for properly structuring and presenting template variations (e.g., "Bedtime Adventure - 4 Pages" vs. "Bedtime Adventure - 8 Pages") within the UI. This task will implement these data model additions, preparing the groundwork
