# Worker Prompt Template

## Context

The product is entering a soft-launch phase (Cohort B is GO), and foundational reliability work (Phase 1, Phase 4) and monitoring setup (P2-7 to P2-12) are largely complete. A production baseline of `35` real user `book_outcome` records has been successfully gathered (P5-4). The next critical step is to activate the comprehensive monitoring for Story JSON and Image Generation failures to ensure the ongoing reliability and quality of book generation during the soft launch.

## Objective

Review the defined but currently disabled Cloud Monitoring alert policies for Story JSON and Image Generation failures (SJ/IM) in `docs/P2_SJ_IM_ALERT_POLICIES.md`, tune their thresholds based on the established production baseline, and then enable these policies within Cloud Monitoring.

## Allowed Scope

- `docs/P2_SJ_IM_ALERT_POLICIES.md` (to update threshold values and enable status in documentation)
- Cloud Monitoring (via `gcloud` commands as documented, or direct console application, to set thresholds and enable the policies)
- No other application code or infrastructure files.

## Forbidden Scope

- Infrastructure (e.g., Terraform, main CI/CD configurations)
- Billing
- Authentication redesign
- Secrets management
- Generated assets
- Application code (e.g., `functions/src`, `web/src`)

## Requirements

- Update `docs/P2_SJ_IM_ALERT_POLICIES.md` to reflect the chosen thresholds and the enabled status for each policy.
- Ensure the selected thresholds are realistic and effective based on the `35` real `book_outcome` records from the `prod-baseline` (P5-4).
- Execute the necessary `gcloud` commands (or follow console steps) to update and enable all SJ/IM alert policies within the Google Cloud project.
- Provide verification steps to confirm the policies are active and correctly configured.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

### Summary

With the production baseline now complete (35 real user book outcomes), your task is to **tune the thresholds and enable all currently disabled Cloud Monitoring alert policies for Story JSON and Image Generation (SJ/IM) failures**.

Reference `docs/P2_SJ_IM_ALERT_POLICIES.md` for the definitions of the 13 SJ/IM policies (SJ-1..SJ-4, IM-1..IM-9). These policies were created live but set to `enabled: false` (as per P2-10b-live).

### Changed files

- `docs/P2_SJ_IM_ALERT_POLICIES.md`
    - Update the `enabled` field for each policy from `false` to `true`.
    - Review the `threshold` values for each policy in the documentation. Adjust them based on the `prod-baseline` data (P5-4 results available in `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7.3, which lists the historical values observed during the baseline period). The goal is to set thresholds that are sensitive enough to detect real regressions without generating excessive false positives. Document any changes to the `threshold` values in the `.md` file.

- **Cloud Monitoring Configuration:**
    - Execute the `gcloud alpha monitoring policies update
