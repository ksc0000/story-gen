# Worker Prompt Template

## Context

The product roadmap indicates that Phase 4 (Gemini JSON Hardening) is closed, and crucial SLO monitoring metrics and log-based alerts have been defined in Phase 2. The production baseline measurement (P5-4) has recently been completed, providing the necessary data to tune these alerts. Cohort B rollout (P5-3-execute-b) has received a "GO" decision, but wider user invitations require robust monitoring. Currently, the Story JSON (SJ) and Image Generation (IM) alert policies in Cloud Monitoring are defined but disabled (`enabled: false`).

## Objective

Tune the thresholds for the disabled Story JSON (SJ) and Image Generation (IM) alert policies in Cloud Monitoring based on the completed production baseline (P5-4) data, and then enable these policies. This is a critical step to ensure operational readiness and safety before inviting more users to Cohort B.

## Allowed Scope

- Google Cloud Console (Cloud Monitoring, Cloud Logging)
- `gcloud` CLI commands for Cloud Monitoring
- Consultation of `docs/P2_SJ_IM_ALERT_POLICIES.md` for policy details.

## Forbidden Scope

- Modifications to application code (`functions/`, `web/`, etc.)
- Infrastructure provisioning (beyond existing Cloud Monitoring resources)
- Billing configuration
- Authentication system changes
- Secrets management
- Generation of new assets

## Requirements

- Retrieve the `prod-baseline` data (from P5-4) to understand typical success rates and failure patterns. This data is recorded in `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7.3.
- Access the existing SJ-1..SJ-4 and IM-1..IM-9 alert policies in Cloud Monitoring. These policies are documented in `docs/P2_SJ_IM_ALERT_POLICIES.md` and created live but with `enabled: false`.
- Carefully determine appropriate thresholds for each alert policy. The goal is to detect *regressions* and *significant deviations* from the baseline, not to trigger alerts for normal, acceptable levels of transient failures.
- Update each policy's configuration (`yaml` or directly in Console) to set the tuned thresholds.
- Change the `enabled` field of each policy from `false` to `true`.
- Document the chosen thresholds and the rationale in a new `docs/P5_SJ_IM_ALERT_TUNING_DECISION.md` document, linking to the baseline data.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

### Summary

The task is to tune and enable the disabled Story JSON (SJ) and Image Generation (IM) alert policies in Google Cloud Monitoring. These 13 policies (SJ-1..SJ-4 and IM-1..IM-9), defined in `docs/P2_SJ_IM_ALERT_POLICIES.md`, were previously created with `enabled: false`. Using the production baseline data from P5-4 (recorded in `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7.3), the worker will determine appropriate thresholds for each policy and enable them. This ensures critical monitoring is active for the ongoing Cohort B rollout.

### Changed files

- `docs/P5_SJ_IM_ALERT_TUNING_DECISION.md` (New document to record tuning decisions and rationale)
- No application code changes. All changes are to Cloud Monitoring configurations.

### Tests executed

1.  **Baseline Data Review:** Confirmed access to and understanding of the `prod-baseline` data from `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7.3.
2.  **Cloud Monitoring Policy Status Check:** Verified that SJ-1..SJ-4 and IM-1..IM-9 policies exist in Cloud Monitoring and are currently `enabled: false`.
3.  **Threshold Tuning (Manual/Analytical):** Analyzed baseline metrics (`storyJsonFailureCategory` rates, `imageFailedRate`, `imageGenerationTimeoutRate`, etc.) to propose initial thresholds that would detect regressions without excessive noise.
4.  **Policy Update and Enablement (Cloud Console / `gcloud`):** Executed the necessary steps to update thresholds and set `enabled: true` for all 13 policies.
5.  **Post-Enablement Verification:** Confirmed that all 13 policies are now active in Cloud Monitoring with the new thresholds.
6.  **No Immediate Alert Firing Check:** Ensured that newly enabled policies do not immediately fire false positive alerts based on recent historical data (if available within Cloud Monitoring's lookback window).

### Known issues

-   Threshold tuning is an iterative process. The initially set thresholds may require further refinement based on actual production traffic and observed patterns during Cohort B.
-   The notification channels are already configured (e.g., email `kikushun0529@gmail.com` for CG-1 policy), but ensure these are correctly linked to the newly enabled SJ/IM alerts if not already inherited.

### Suggested next task

**Summary:** Execute Cohort B limited rollout, inviting the first small group of testers. This involves following the `P5_COHORT_B_GO_NOGO_CHECKLIST.md` and initiating the invitation process. This task is primarily operational but requires close monitoring of the newly enabled SLO alerts.

**Objective:** Safely initiate the limited rollout of Cohort B by inviting 3-5 testers and closely monitoring the system for any issues.

**Allowed Scope:**
- No code changes are expected for this task.
- Interacting with communication tools (email, chat) to send invitations.
- Interacting with Firebase Console to manage user roles/permissions (if required for inviting specific testers).
- Monitoring Cloud Monitoring dashboards and alerts.
- Documenting observations and feedback in `docs/P5_COHORT_B_GO_NOGO_CHECKLIST.md`.

**Forbidden Scope:**
- Any application code modification.
- Infrastructure changes.

**Requirements:**
- Follow all steps outlined in `docs/P5_COHORT_B_GO_NOGO_CHECKLIST.md`.
- Send invitations to 3-5 designated testers.
- Activate the initial 1-hour monitoring window as per the checklist.
- Record observations, especially regarding the newly enabled SJ/IM alerts and user feedback.
- Document any incidents or issues and follow the defined incident response process.
- Based on initial monitoring, evaluate the "Go/No-Go" criteria for expanding Cohort B.

**Acceptance criteria:**
- 3-5 testers have received invitations to Cohort B.
- The 1-hour initial monitoring period has been completed without critical incidents, or any incidents have been successfully managed and documented.
- The `P5_COHORT_B_GO_NOGO_CHECKLIST.md` document is updated with the execution details and initial assessment.
