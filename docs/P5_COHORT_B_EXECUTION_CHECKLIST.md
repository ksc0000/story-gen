# Phase 5 Cohort B Execution Checklist

## Context & Decisions
Based on the success of **P5-3c-verify** (2026-05-22), Phase 5 Cohort B is approved for a limited rollout.
- **P5-3c-verify Results**: simplified_scene PASS verified with 4 themes confirmed, 32/32 pages completed, no duplicates, no early failures.
- **Experiment**: `simplified_scene` is enabled for Cohort B (guarded by `hasReferenceImage` in P5-3d).
- **Goal**: Establish operational foundation for Phase 1 closure and evaluate readiness for Cohort C.

## Pre-Flight Validation (Timestamp: 2026-06-11 08:39:50 UTC)

### Build & Tests
- [x] **Build Check**: `npm run build --prefix functions` successful.
- [x] **Test Check**: `npm run test --prefix functions` successful (all 1746+ tests pass).
- [x] **Lint Check**: `npm run lint` pass (no critical errors).
- [ ] **Git Status**: No uncommitted changes in `origin/main`. (Pending final commit)

### SLO & Alerts
- [x] **SLO Dashboard**: Accessible at [Cloud Monitoring](https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769).
- [x] **Logging Queries**: Saved queries from `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` are operational.
- [x] **Alert Policy**: CG-1 (Candidate Gate) is **enabled**; SJ/IM policies are **enabled** and tuned (as of 2026-06-09).
- [x] **Notification**: Ops team confirmed alert notification channels (Email/Slack) are active.

### Admin Contact
- [ ] **Admin Owner**: [Name/Role] is available for the 1-hour window.
- [ ] **Escalation**: PM and Ops lead are on standby.

## Cohort Identification

### Tester List (Target: 3–5 users)
1. [Name/Email] - [Role]
2. [Name/Email] - [Role]
3. [Name/Email] - [Role]
4. [Name/Email] - [Role]
5. [Name/Email] - [Role]

### Administrator
- [ ] **Name**: [Name]
- [ ] **Role**: Rollout Operator

## Rollout Start (Timestamp: [TIME: _____])

### PM Sign-Off Gate
- [ ] PM approves go/no-go.
- [ ] Rationale: P5-3c-verify PASS and P5-3d guarded routing ready.
- [ ] **PM Signature**: [Signature/Initials]

### Monitoring Setup
- [ ] Cloud Monitoring dashboard loaded on second screen.
- [ ] Log Explorer open with `p5_page_experiment_active` query.
- [ ] Slack channel for rollout tracking joined.

### Send Invites
- [ ] Use invitation templates from `docs/P5_SOFT_LAUNCH_INVITE_KIT.md`.
- [ ] Include release notes and feedback form link.
- [ ] **Invites Sent**: [TIME: _____]

## 1-Hour Monitoring Window (Time T+0 to T+1h)

### Metrics to Watch (Refresh every 15 min)
| Metric | Target | Status (T+15) | Status (T+30) | Status (T+45) | Status (T+60) |
|--------|--------|---------------|---------------|---------------|---------------|
| `readable_rate` | >= 98% | [ ] | [ ] | [ ] | [ ] |
| `image_failed_rate` | <= 2% | [ ] | [ ] | [ ] | [ ] |
| `page_early_failed` | 0 | [ ] | [ ] | [ ] | [ ] |
| `p95 storyMs` | <= 150s | [ ] | [ ] | [ ] | [ ] |
| `p50 imageDurationMs`| <= 45s | [ ] | [ ] | [ ] | [ ] |
| Error rate (503/504) | <= 2% | [ ] | [ ] | [ ] | [ ] |
| `fallback_pages_ratio`| <= 10% | [ ] | [ ] | [ ] | [ ] |

### Stop Conditions (Halt immediately if any occur)
- [ ] `page_early_failed` > 0 → **STOP**
- [ ] `image_failed_rate` > 5% → **STOP**
- [ ] `p95 storyMs` > 150s (repeated) → **STOP**
- [ ] 503/504 Error rate > 2% → **STOP**
- [ ] `duplicate_page_image_urls_detected` appears → **STOP**
- [ ] `image_prompt.all_identical` appears → **STOP**
- [ ] PM reports critical user complaint → **Escalate & Pause**

## Success Criteria & Gates

### Cohort B Success (Evaluation after 1h window)
- [ ] `readableRate` >= 98%
- [ ] `image_failed_rate` <= 2%
- [ ] No blocking errors logged in Cloud Logging.
- [ ] No stop conditions triggered during the window.
- [ ] At least 3 testers completed the full generation cycle.

### Cohort C Decision Gate
- [ ] **Cohort B Duration Check**: [MINIMUM: 48–72 hours]
- [ ] Review Cohort B aggregate metrics (after [_____] hours).
- [ ] Compare metrics against Cohort A baseline.
- [ ] **PM Decision**: Expand to Cohort C (20–30 users) or HOLD.
- [ ] **Next Review Date**: [DATE: 2026-05-24]

## Incident Response

### Escalation Path
1. **Operator** → **Ops Lead** (Technical triage)
2. **Ops Lead** → **PM** (Business impact decision)
3. **PM** → **QA** (Success criteria re-evaluation)

### Fallback Procedures
- **Immediate Stop (Kill Switch)**: Disable invitation URL and revert `generationOverride` flag in Firestore for all testers.
- **Partial Stop**: Pause sending new invites; allow current sessions to finish while investigating.
- **Rollback**: If a critical regression is found, revert `origin/main` to the Cohort A baseline and redeploy.

## Approval Sign-Offs

| Role | Name | Date | Status |
|------|------|------|--------|
| **PM** | [Name] | [Date] | [ ] |
| **Ops** | [Name] | [Date] | [ ] |
| **QA** | [Name] | [Date] | [ ] |

---
*Reference: docs/P5_SOFT_LAUNCH_INVITE_KIT.md for invitation text.*
