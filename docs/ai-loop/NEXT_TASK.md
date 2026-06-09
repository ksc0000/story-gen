```markdown
# Worker Prompt Template

## Context

The product roadmap indicates that the `P5-4 prod-baseline` (real user data for 7 days, >= 30 books) has been completed. This satisfies the prerequisite for tuning and enabling the Story JSON (SJ) and Image Generation (IM) alert policies, as outlined in `P2-10b-enable` and `P5-5`. Currently, these policies are defined but set to `enabled: false`.

## Objective

Analyze the collected production baseline data, determine appropriate thresholds for the disabled SJ/IM alert policies, update the policy documentation with these thresholds, and provide clear instructions for their enablement.

## Allowed Scope

- `docs/`
- `scripts/` (for any `gcloud` command generation or execution scripts, though manual execution is preferred for sensitive operations like alert enablement)

## Forbidden Scope

- `functions/src/` (no application code changes)
- Infrastructure
- Billing
- Authentication redesign
- Secrets
- Generated assets

## Requirements

- Analyze the `P5-4 prod-baseline` data (referencing `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7.3 and actual Cloud Monitoring metrics).
- Propose specific, data-driven threshold values for all 13 disabled SJ/IM alert policies.
- Update the `P2_SJ_IM_ALERT_POLICIES.md` document to include these specific thresholds and mark the policies for enablement.
- Add clear `gcloud` commands or step-by-step instructions within `P2_SJ_IM_ALERT_POLICIES.md` for a human operator to enable these policies in Cloud Monitoring.
- Ensure all changes are documented "docs-first" and adhere to the "small PRs" constraint.
- Report any follow-up items necessary for verification or further action.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker Prompt

### Summary

The task is to finalize and enable the disabled Story JSON (SJ) and Image Generation (IM) alert policies in Cloud Monitoring. This involves analyzing the established production baseline data (`P5-4`), proposing specific thresholds for each of the 13 policies currently in `enabled: false` state, updating the `P2_SJ_IM_ALERT_POLICIES.md` document with these tuned thresholds, and providing the necessary `gcloud` commands or manual steps for a human operator to enable them.

### Changed files

- `docs/P2_SJ_IM_ALERT_POLICIES.md`

### Tests executed

- Manual review of `P5-4` baseline data in Cloud Monitoring to inform threshold tuning.
- Linting and spell-checking on updated documentation.
- (Verification after enablement, outside this task's scope): Confirm policies appear as `enabled: true` in Cloud Monitoring console.

### Known issues

- Ensuring the selected thresholds are robust enough to catch actual issues without generating excessive noise will require careful consideration of the `P5-4` baseline data. The thresholds should be set conservatively initially if data is sparse, with a plan for iterative refinement.

### Suggested next task

**Objective:** Execute the `Production smoke checklist` now that critical production monitoring is enabled.

**Reasoning:** With the SJ/IM alert policies enabled following baseline analysis, a crucial layer of production reliability is in place. The next logical step is to perform the `Production smoke checklist` for `fixed_template` books and verify its results to move Phase 1 towards completion.

```
