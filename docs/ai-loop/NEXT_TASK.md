# Worker Prompt Template

## Context

The Cohort B soft launch is decided and in preparation, with several critical reliability improvements (like `simplified_scene` and safer retry mechanisms) recently implemented and deployed. Robust monitoring is essential before and during this rollout. The Story JSON (SJ) and Image Generation (IM) alert policies (P2-10b) have been defined, their metrics are live, and the policies exist but are currently disabled (`enabled: false`). The `prod-baseline` data (P5-4) has now been collected, providing the necessary information to tune these alerts.

## Objective

Tune the thresholds for the 13 disabled Story JSON (SJ) and Image Generation (IM) alert policies, and then enable them.

## Allowed Scope

- `docs/P2_SJ_IM_ALERT_POLICIES.md` (for threshold rationale and final policy status)
- `cloud_monitoring_configs/` (or equivalent directory where Cloud Monitoring alert policy YAMLs/configurations are stored)
- `functions/` (if there's any helper script for deploying these configs)
- Project Cloud Monitoring console (for verification)

## Forbidden Scope

- Infrastructure changes (beyond alert policy configuration)
- Billing
- Authentication redesign
- Secrets management (beyond existing access)
- Generated assets
- Core business logic unrelated to monitoring

## Requirements

- **Review `prod-baseline` data:** Analyze the results from P5-4 (`prod-baseline` re-measurement) to determine appropriate, realistic thresholds for each of the 13 SJ/IM alert policies. The goal is to detect actual regressions/failures without generating excessive noise.
- **Update Alert Policy Configurations:** Modify the configurations for the 13 policies (e.g., YAML files referenced in `P2_SJ_IM_ALERT_POLICIES.md` or a new configuration file) to:
    - Set `enabled: true` for all policies.
    - Set the `threshold` values based on the `prod-baseline` analysis.
- **Apply Changes:** Deploy the updated alert policy configurations to Google Cloud Monitoring.
- **Document Rationale:** Add notes to `docs/P2_SJ_IM_ALERT_POLICIES.md` (or a linked document) detailing the chosen thresholds and the reasoning behind them, referencing the `prod-baseline` data.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

### Summary

The task is to enable 13 critical monitoring alert policies for Story JSON (SJ) and Image Generation (IM) failures, which are currently defined but disabled. This involves analyzing the `prod-baseline` data to set appropriate thresholds and then applying the updated configurations. This action is crucial for robust monitoring during the upcoming Cohort B soft launch.

### Changed files

List of files you expect to change, e.g.:
- `docs/P2_SJ_IM_ALERT_POLICIES.md`
- `cloud_monitoring_configs/sj-alert-policy-1.yaml`
- `cloud_monitoring_configs/im-alert-policy-1.yaml`
- ... (and other relevant policy YAML files)

### Tests executed

1.  **Verification of enabled policies:**
    ```bash
    gcloud monitoring alert-policies list --filter="displayName=sj-policy-name" --format="value(enabled)"
    gcloud monitoring alert-policies list --filter="displayName=im-policy-name" --format="value(enabled)"
    # Repeat for all 13 policies, confirming `true`
    ```
    (Replace `sj-policy-name` and `im-policy-name` with actual policy display names.)
2.  **Verification of thresholds:** Manually inspect each alert policy in the Cloud Monitoring UI to confirm the `threshold` values match the updated configurations.
3.  **Documentation check:** Verify that the `docs/P2_SJ_IM_ALERT_POLICIES.md` (or relevant linked doc) has been updated with the threshold rationale.

### Known issues

- (None yet, to be filled by worker)

### Suggested next task

After this task is complete and verified:
- **P5-3-execute-b: Cohort B Limited Rollout Execution.** Once monitoring is robustly enabled, proceed with the actual invitation and onboarding of 3-5 testers for Cohort B, as documented in `docs/P5_COHORT_B_GO_NOGO_CHECKLIST.md`. This will involve manual operational steps rather than coding.
