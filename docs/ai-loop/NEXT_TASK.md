# Enable and Tune SJ/IM Alert Policies

## Context

The product is currently in Phase 5 (Monetization / Soft Launch), with Cohort B rollout in progress. A critical dependency for enabling robust monitoring and ensuring system reliability during this phase was the completion of the `prod-baseline` measurement for generation SLOs. This `prod-baseline` (P5-4) has now been successfully completed, providing sufficient real user data (35 records) to inform alert threshold tuning.

The SJ/IM (Story JSON / Image) alert policies were previously defined and live-created in Cloud Monitoring (P2-10b-live), but they were intentionally left `disabled` awaiting baseline data for threshold tuning. This task focuses on leveraging the `prod-baseline` data to set appropriate thresholds for these critical alerts and then enabling them to actively monitor the generation pipeline.

This task directly addresses `P5-5` and `P2-10b-enable` from the roadmap, which are marked as "推奨次タスク" (recommended next task) following the completion of `P5-4`.

## Objective

Tune the thresholds for the 13 defined Story JSON (SJ) and Image (IM) alert policies based on the established `prod-baseline` data, and then enable these policies in
