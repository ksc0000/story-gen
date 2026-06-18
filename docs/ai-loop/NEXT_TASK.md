# Decide and Potentially Enable `ENABLE_SCHEMA_REPAIR_RETRY` in Production

## Context

The product roadmap indicates that Phase 4: Gemini JSON Hardening is now closed, with the `responseSchema` rollout having been abandoned. However, the `P4-5` slice implemented a one-shot validation repair retry mechanism, and `P4-6` verified its functionality via live smoke tests. A production baseline (`P5-4`) has been established, and `SJ/IM` alert policies (`P5-5`) are tuned and enabled. The decision to enable the `ENABLE_SCHEMA_REPAIR_RETRY` flag in production is now pending the completion of the production baseline, which has been met. With Cohort B's limited rollout currently in progress,
