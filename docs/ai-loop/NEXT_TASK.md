# Enforce Plan-Based Page Count Restrictions for Fixed Templates

## Context

The product roadmap for Phase 3: Template Mode (T3-C) highlights the need to update `PlanConfig` to permit specific page counts (e.g., 8-page fixed templates) based on the user's plan. While 8-page template variants have been implemented (PR #276) and a page count selector is available in the UI (PR #287), the backend enforcement of these plan-based restrictions is not yet explicitly in place. With the `light_paid` plan removed and `standard_paid`/`premium_paid`/`single_purchase` plans active, it is critical to ensure that users can only generate books with page counts permitted by their current subscription or
