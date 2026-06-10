# Worker Prompt Template

## Context

The product roadmap indicates that the `prod-baseline` (P5-4) has been completed, providing sufficient real user data. This unlocks the next critical step in our reliability efforts: enabling the Story JSON (SJ) and Image (IM) generation SLO alert policies. These policies were previously defined and deployed in a disabled state (P2-10b, P2-10b-live) and are awaiting threshold tuning and activation based on actual production performance.

## Objective

Tune the thresholds for the 13 disabled Story JSON (SJ) and Image (IM) alert policies using the latest production baseline data, and then enable these policies in Cloud Monitoring.

## Allowed Scope

- `docs/P2_SJ_IM_ALERT_POLICIES.md`
- `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` (for runbook updates)
- Shell scripts or `gcloud` commands for Cloud Monitoring policy updates (to be documented, not committed as executable files if possible, or as deployable config).

## Forbidden Scope

- `functions/` (no code changes needed for the policies themselves)
- `src/` or other application code
- Infrastructure (except for Cloud Monitoring policy configuration)
- Billing
- Authentication redesign
- Secrets
- Generated assets

## Requirements

- Update `docs/P2_SJ_IM_ALERT_POLICIES.md` with the newly determined thresholds and mark the policies as `enabled: true`.
- Clearly document the `gcloud` commands (or equivalent process) used to update and enable each policy.
- Update the relevant runbook in `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` to reflect the newly enabled alerts and initial response procedures.
- Ensure the changes are reviewable and small.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker prompt

You are an expert SRE and DevOps engineer.

1.  **Review Production Baseline Data:** Analyze the `prod-baseline` data (P5-4, 35 real user records completed on 2026-05-23) to determine appropriate, actionable thresholds for each of the 13 Story JSON (SJ) and Image (IM) alert policies. Focus on thresholds that indicate a meaningful degradation in user experience or system reliability, rather than purely informational noise. Refer to `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` section 7 for baseline data if available, or request access to the actual Cloud Monitoring data.

2.  **Update Policy Documentation:**
    *   Edit `docs/P2_SJ_IM_ALERT_POLICIES.md`.
    *   For each of the 13 SJ and IM policies, set the `enabled` field to `true`.
    *   Update the `threshold` value (and `duration` if necessary) for each policy based on your analysis of the production baseline.
    *   Add a `reason` comment explaining the rationale behind the chosen threshold.

3.  **Generate `gcloud` Commands for Deployment:**
    *   For each of the 13 policies, generate the `gcloud alpha monitoring policies update` (or `create` if easier to re-create) command(s) that will apply the updated YAML configurations to Cloud Monitoring.
    *   Document these commands within `docs/P2_SJ_IM_ALERT_POLICIES.md` (or a linked sub-document if the list is too long), ensuring they are ready for direct execution.

4.  **Update Alert Runbook:**
    *   Review `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` and update or create initial runbook entries for how to respond to each of the newly enabled SJ/IM alerts. This should include:
        *   What the alert signifies.
        *   Initial diagnostic steps (e.g., checking specific logs, looking at related dashboards).
        *   Escalation path if the issue persists.

## Acceptance Criteria

- All 13 SJ and IM alert policies are documented in `docs/P2_SJ_IM_ALERT_POLICIES.md` with `enabled: true` and well-justified thresholds.
- The `gcloud` commands to update/enable these policies are clearly documented and ready for execution.
- Initial runbook entries for these alerts are present in `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md`.
- No new code is introduced in `functions/` or other application directories.

## Required Test Commands

- **Local Verification:**
    - `npm test` (ensure documentation changes don't break existing tests, if any)
    - `npm run lint` (ensure linting passes)
- **Manual Verification (after deployment):**
    - Verify in Cloud Monitoring console that all 13 SJ/IM alert policies are enabled and have the specified thresholds.
    - Confirm that the email notification channel is correctly configured for these policies.
    - (Optional) If historical data allows, use the "Test policy" feature in Cloud Monitoring to see if the new thresholds would have triggered alerts on past incidents.

## Suggested Next Task

```markdown
# Worker Prompt Template

## Context

The Story JSON (SJ) and Image (IM) generation SLO alert policies have been enabled based on production baseline data. While these alerts provide critical monitoring, true reliability requires proactive issue detection and resolution.

## Objective

Proactively monitor the newly enabled SJ and IM alert policies, specifically focusing on the frequency of alerts, their severity, and initial diagnosis of common failure patterns.

## Allowed Scope

- `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md`
- `docs/QUALITY_METRICS.md` (if new failure patterns warrant rubric updates)
- Cloud Monitoring Dashboard configuration (via `gcloud` commands or documented manual steps).

## Forbidden Scope

- `functions/`
- `src/`
- Infrastructure (beyond monitoring dashboards)
- Billing
- Authentication redesign
- Secrets
- Generated assets

## Requirements

- Document any observed recurring failure patterns for SJ or IM generation.
- Add specific dashboard panels in Cloud Monitoring to visualize metrics directly relevant to these alert conditions (e.g., `storyJsonFailureCategory` breakdown, `imageFailedReason` breakdown).
- Identify and document potential common root causes for early alerts.
- Report any recommended adjustments to alert thresholds or policies based on initial observation.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task
```
