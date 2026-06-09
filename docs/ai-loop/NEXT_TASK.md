# Worker Prompt Template

## Context

The product has progressed to a limited production rollout (Cohort A/B). Critical infrastructure for SLO monitoring (metrics, dashboards, disabled alert policies) has been set up, and an initial production baseline (P5-4) has been collected. The Story JSON (SJ) and Image (IM) alert policies are currently defined but disabled.

## Objective

Tune the thresholds for the disabled Story JSON (SJ) and Image (IM) alert policies based on the collected production baseline data, and then enable these policies in Cloud Monitoring. This task ensures robust automated monitoring for generation quality as the product scales.

## Allowed Scope

- `functions/` (specifically for `firebase.json` for deployment commands, but no functional code changes within `functions/src` or `functions/tests` should be needed unless deriving thresholds requires temporary scripts)
- `docs/` (to update documentation reflecting the enabled policies and chosen thresholds)
- Configuration files related to Cloud Monitoring (e.g., YAML specifications for alerts, if applicable for `gcloud` commands)

## Forbidden Scope

- Infrastructure (beyond Cloud Monitoring alert policy configuration)
- Billing
- Authentication redesign
- Secrets
- Generated assets
- Any application-level code changes (e.g., `generate-book.ts`, UI components)

## Requirements

- Retrieve and analyze the collected production baseline data for `storyJsonFailureCategory` and `imageFailureCategory`.
- Propose and document appropriate thresholds for the `SJ-1` to `SJ-4` and `IM-1` to `IM-9` alert policies. The thresholds should be sensitive enough to detect regressions but avoid excessive false positives based on the baseline.
- Update the relevant documentation (e.g., `docs/P2_SJ_IM_ALERT_POLICIES.md`) with the chosen thresholds and the date of enablement.
- Enable the previously defined `SJ-1` to `SJ-4` and `IM-1` to `IM-9` alert policies in Cloud Monitoring. This will likely involve `gcloud` commands or direct console interaction.
- Report any observations or challenges during the threshold tuning process.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

### Summary

The objective is to tune and enable the Story JSON (SJ) and Image (IM) alert policies in Cloud Monitoring. These policies were previously defined and created but left disabled (`enabled: false`) pending the collection of a production baseline. With the `prod-baseline` (P5-4) now complete, it is time to analyze this data, determine appropriate thresholds, and activate the alerts.

### Changed files

- `docs/P2_SJ_IM_ALERT_POLICIES.md` (to update with determined thresholds and enablement status)
- Cloud Monitoring configurations (via `gcloud` commands or console, which will implicitly update the live configuration, and these commands/console steps should be documented).

### Tests executed

1.  **Baseline Data Analysis:**
    *   Access Cloud Logging and Cloud Monitoring to retrieve the `storyJsonFailureCategory` and `imageFailureCategory` metrics over the duration of the P5-4 production baseline (7 days, or however long the P5-4 data was collected).
    *   Analyze the frequency and patterns of `story_json_failure` (e.g., `malformed_json`, `schema_validation`, `field_type_mismatch`, `missing_critical_field`) and `image_failure_category` (e.g., `image_provider_error`, `content_filter_violation`, `timeout`).
    *   Based on this analysis, propose specific threshold values (e.g., percentage of failures over a given window) for each SJ and IM alert policy.
2.  **Alert Policy Configuration (Manual/gcloud):**
    *   For each policy from `SJ-1` to `SJ-4` and `IM-1` to `IM-9` as defined in `docs/P2_SJ_IM_ALERT_POLICIES.md`, update its `threshold` and set `enabled: true`. This should be done carefully, potentially starting with a few policies and then expanding.
    *   Verify in the Cloud Monitoring console that the policies are enabled and their thresholds are correctly applied.
    *   No automated unit/integration tests are directly applicable here, as this is a configuration task.

### Known issues

-   The baseline might be limited in volume depending on the current production traffic. Thresholds might need further refinement as more data accumulates.
-   Care must be taken to avoid false positives during the initial enablement. It might be prudent to set slightly lenient thresholds initially and tighten them over time.
-   Ensure all required notification channels are correctly configured for these alerts to reach the intended recipients.

### Suggested next task

# Worker Prompt Template

## Context

The Story JSON (SJ) and Image (IM) alert policies have been tuned and enabled, providing automated monitoring for key generation quality metrics. This significantly enhances the reliability monitoring phase. The `Production smoke checklist` for Phase 1 and `Template Smoke Checklist` for Phase 3 T1-Smoke are still open, which are crucial for formally verifying the system's reliability in production.

## Objective

Formally execute and document the `Production smoke checklist` for Phase 1. This involves running specific manual or semi-automated tests in a production or production-like environment and recording the results.

## Allowed Scope

- `docs/` (specifically `docs/PRODUCTION_SMOKE_CHECKLIST.md` and `docs/PRODUCTION_SMOKE_RESULTS.md`)
- Minimal `functions/` changes if a small helper script is needed to facilitate a smoke test step (must be strictly contained, temporary, and easily removable).

## Forbidden Scope

- Infrastructure changes (beyond running existing `gcloud` or `firebase` commands for observation).
- Billing
- Authentication redesign
- Secrets
- Generated assets
- Core application logic changes.

## Requirements

- Thoroughly review `docs/PRODUCTION_SMOKE_CHECKLIST.md`.
- Execute each item on the checklist in the designated production environment (or a very close staging environment if production interaction is restricted for initial tests).
- Record the outcome of each checklist item, including any observations, success/failure status, and relevant timestamps.
- Update `docs/PRODUCTION_SMOKE_RESULTS.md` with the detailed findings.
- Identify any failures or unexpected behaviors, providing clear descriptions.
- Report any follow-up tasks arising from the smoke test (e.g., bugs to fix, further investigation needed).

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task
