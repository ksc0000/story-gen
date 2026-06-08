# NEXT_TASK.md

**Generated:** 2026-05-07  
**Phase:** 1.5b (Production Smoke Evidence Pending)  
**Scope:** Docs-first + Live Verification

---

## Context

The roadmap shows Phase 1 (Reliability First) is functionally complete but requires **production smoke evidence** before closure. Phase 3 (Template Mode) and Phase 4 (Gemini JSON Hardening) are largely complete with smoke checkups needed. Phase 5 (Soft Launch) is actively executing with Cohort B pending.

Key blockers:
1. **Phase 1 closure**: Needs `docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md` with real evidence
2. **Phase 3 T1-Smoke**: Fixed template 6-template smoke checklist execution
3. **Phase 5 Cohort B**: `simplified_scene` experiment PASS verification + limited rollout

Current decision point: **P5-3c-verify is complete and PASS-verified**. Cohort B is approved for limited rollout but needs formal execution checklist + invitation kit deployment.

---

## Objective

**Generate Phase 5 Cohort B execution checklist** with concrete pre-flight steps, rollout procedure, 1-hour monitoring window, stop conditions, and follow-up decision gates.

This is the next critical task to unblock Cohort B limited rollout (3–5 testers) and establish the operational foundation for Phase 1 closure decision.

---

## Scope: Editable Directories

```
docs/
├── P5_COHORT_B_EXECUTION_CHECKLIST.md (CREATE)
├── P5_COHORT_B_GO_NOGO_CHECKLIST.md (UPDATE if needed)
└── PM_SIGN_OFF_LOG.md (UPDATE)
```

---

## Forbidden Scope

- Code changes (Firebase Functions, UI, backend logic)
- Infrastructure (Firestore, Cloud Run, Cloud Monitoring)
- Secrets, billing, or authentication changes
- Generated assets or images
- Live Firestore data modification
- Alert policy creation/modification (monitoring only)

---

## Requirements

### Acceptance Criteria

1. ✅ `P5_COHORT_B_EXECUTION_CHECKLIST.md` is created with:
   - Pre-flight validation steps (build, tests, SLO dashboard check, alert policy status)
   - Cohort member identification & invitation procedure
   - Rollout start checklist (time, monitoring setup, PM sign-off gate)
   - 1-hour monitoring window with concrete metrics to watch (p95 storyMs, p50 imageDurationMs, image_failed_rate, page_early_failed, fallback_pages_ratio)
   - Stop conditions (page_early_failed > 0, image_failed_rate > 5%, p95 storyMs > 150s, 503 error rate > 2%)
   - Incident response escalation path
   - Success criteria (readable_rate >= 98%, image_failed_rate <= 2%, no blocking errors after 1h window)
   - Cohort B → Cohort C gate evaluation framework
   - Approval sign-off blocks (PM, Ops, QA)

2. ✅ Cross-reference `P5_SOFT_LAUNCH_INVITE_KIT.md` (invitation template, operator guide, tester release notes)

3. ✅ Document decision inputs from P5-3c-verify (simplified_scene PASS verified, 4 styles confirmed, 32/32 pages completed, no duplicates, no early failures)

4. ✅ Include fallback procedures:
   - Immediate stop: kill switch (disable invite, revert generationOverride flag)
   - Partial stop: pause new invites, investigate active sessions
   - Rollback: revert to Cohort A baseline if critical issue found

5. ✅ Schedule placeholders for:
   - Cohort B duration (recommended: 48–72 hours minimum before Cohort C decision)
   - Next review timestamp (e.g., 2026-05-24 18:00 JST)
   - PM decision gate timestamp

### Required Test Commands

```bash
# Verify checklist structure and cross-references
grep -l "P5_SOFT_LAUNCH_INVITE_KIT" docs/P5_COHORT_B_EXECUTION_CHECKLIST.md
grep -l "stop condition" docs/P5_COHORT_B_EXECUTION_CHECKLIST.md
grep -l "readableRate >= 98%" docs/P5_COHORT_B_EXECUTION_CHECKLIST.md
grep -l "simplified_scene PASS" docs/P5_COHORT_B_EXECUTION_CHECKLIST.md

# Verify no contradictions with existing docs
grep -c "Cohort B" docs/P5*.md  # Should include execution checklist

# Check markdown syntax
mdlint docs/P5_COHORT_B_EXECUTION_CHECKLIST.md
```

---

## Worker Prompt

### Summary of Task

You are tasked with writing **Phase 5 Cohort B Execution Checklist**, the operational foundation for the first limited production rollout of `simplified_scene` experiment results.

**Input:**
- P5-3c-verify passed with 4 themes confirmed, 32/32 pages completed, no duplicates, no early failures
- P5_SOFT_LAUNCH_INVITE_KIT.md defines invitation and operator procedures
- Phase 1 SLO baselines: book readable rate >= 98%, image_failed_rate <= 2%, p95 storyMs <= 120s
- Cohort A smoke checklist established operational pattern (1h monitoring window, stop conditions)
- PM approval is contingent on Cohort B execution following a documented, repeatable procedure

**Output:**
Create `docs/P5_COHORT_B_EXECUTION_CHECKLIST.md` as a step-by-step checklist that:
1. **Validates preconditions** (build health, test suite, SLO dashboard ready, alerts configured)
2. **Identifies rollout members** (3–5 testers by name/email, administrator responsibilities)
3. **Starts rollout** (time-stamped, PM sign-off gate, monitoring setup confirmation)
4. **Monitors 1-hour window** (concrete metrics, refresh cadence, decision points)
5. **Applies stop conditions** (kill switch, partial pause, rollback paths)
6. **Evaluates success** (readable_rate, image_failed_rate, no blocking errors)
7. **Gates Cohort C** (decision framework, next review date, PM approval required)
8. **Documents decisions** (approval dates, rationale, incident logs)

### Style

- Use checkbox format (`- [ ]`, `- [x]`) for actionable items
- Include timestamp placeholders (e.g., `[TIME: _____]`, `[DATE: 2026-05-24]`)
- Link to external resources (P5_SOFT_LAUNCH_INVITE_KIT.md, Cloud Monitoring dashboard, alert policies)
- Provide command/action snippets where applicable (e.g., disable invite URL, revert flag, query logs)
- Keep escalation path clear and short (PM → Ops → QA sign-offs)

### Example Structure

```markdown
# Phase 5 Cohort B Execution Checklist

## Pre-Flight (12 hours before rollout)

### Build & Tests
- [ ] npm run build --prefix functions ✓
- [ ] npm run test --prefix functions ✓
- [ ] npm run lint ✓
- [ ] Verify no uncommitted changes: git status

### SLO & Alerts
- [ ] SLO dashboard is live and accessible
- [ ] Cloud Logging saved queries operational
- [ ] Alert policies defined (CG-1 enabled, SJ/IM disabled)
- [ ] Ops team has alert notifications configured

### Cohort Identification
- [ ] Tester list: [3-5 names/emails]
- [ ] Admin contact: [name/role/phone]
- [ ] Escalation contact: [PM name/slack]

## Rollout Start (Day N, Time T)

### PM Sign-Off Gate
- [ ] PM approves go/no-go
- [ ] Timestamp: [_____]
- [ ] Rationale: [brief reason]

### Monitoring Setup
- [ ] Cloud Monitoring dashboard loaded
- [ ] Log Explorer open with saved queries
- [ ] Alert notification channels active
- [ ] Slack/email escalation configured

### Send Invites
- [ ] Use invite template from P5_SOFT_LAUNCH_INVITE_KIT.md
- [ ] Include release notes + feedback form link
- [ ] Timestamp invites sent: [_____]

## 1-Hour Monitoring Window (Time T+0 to T+1h)

### Metrics to Watch
| Metric | Target | Refresh | Status |
|--------|--------|---------|--------|
| `readable_rate` | >= 98% | 15 min | [ ] |
| `image_failed_rate` | <= 2% | 15 min | [ ] |
| `page_early_failed` | 0 | continuous | [ ] |
| `p95 storyMs` | <= 150s | 20 min | [ ] |
| Error rate (503/504) | <= 2% | 10 min | [ ] |

### Stop Conditions (Halt immediately if any occur)
- [ ] `page_early_failed` > 0 → STOP
- [ ] `image_failed_rate` > 5% → STOP
- [ ] Error rate > 2% → STOP
- [ ] PM reports user complaint → Escalate to Ops

## Success Criteria & Gates

### Cohort B Success (after 1h window)
- [x] `readable_rate` >= 98% → ✓
- [x] `image_failed_rate` <= 2% → ✓
- [x] No blocking errors logged → ✓
- [x] No stop conditions triggered → ✓

### Cohort C Decision Gate
- [ ] Review Cohort B metrics (aggregate after 48–72 hours)
- [ ] Compare to Cohort A baseline
- [ ] PM decision: expand to Cohort C or hold
- [ ] Date: [2026-05-24]
- [ ] Approved by: [PM name]
```

### Key Decisions You Must Document

1. **Who can trigger the kill switch?** (PM only, or Ops too?)
2. **Tester identification**: Are names/emails predetermined or TBD by PM?
3. **Monitoring window duration**: 1 hour or longer for Cohort B (vs. Cohort A)?
4. **Metrics threshold**: Are p95 storyMs = 150s and image_failed_rate = 5% acceptable stop thresholds, or different values?
5. **Cohort C criteria**: Should Cohort C be automatic after Cohort B PASS, or require additional gates?
6. **Feedback collection**: Should testers fill a form during rollout, or after?

### Questions to Answer in the Checklist

- **Pre-flight**: What "Build ✓" means (all tests pass + no linting errors + successful Functions build)
- **Monitoring**: How often to refresh metrics (every 5/10/15/20 minutes)
- **Stop logic**: Is one metric failure (e.g., `page_early_failed = 1`) grounds for stop, or does it require escalation first?
- **Rollback procedure**: Which Firebase config flag to revert, and how long does revert take to propagate?
- **Success evaluation**: Do we need PM sign-off for success, or is automated gate sufficient?

---

## Output Format

### Checklist Markdown Template

Create **`docs/P5_COHORT_B_EXECUTION_CHECKLIST.md`** with:

```
# Phase 5 Cohort B Execution Checklist
[Context + decision inputs from P5-3c-verify]

## Pre-Flight Validation (Timestamp: _____)
[Build, tests, SLO, alerts, admin contact]

## Cohort Identification
[Tester list with roles]

## Rollout Start (Timestamp: _____)
[PM sign-off, monitoring setup, invite send]

## 1-Hour Monitoring Window
[Metrics table, refresh cadence, stop conditions]

## Success Criteria & Gates
[Readable rate, image failed rate, error rate checks]

## Incident Response
[Escalation tree, kill switch command, rollback procedure]

## Cohort C Decision Gate
[Review criteria, timeline, PM sign-off]

## Approval Sign-Offs
[PM, Ops, QA dates and names]
```

### Tests to Execute

```bash
# 1. Verify checklist exists and has required sections
test -f docs/P5_COHORT_B_EXECUTION_CHECKLIST.md

# 2. Check cross-references
grep -q "P5_SOFT_LAUNCH_INVITE_KIT" docs/P5_COHORT_B_EXECUTION_CHECKLIST.md && echo "✓ Invite kit referenced"

# 3. Verify markdown syntax
mdlint docs/P5_COHORT_B_EXECUTION_CHECKLIST.md

# 4. Confirm key sections present
for section in "Pre-Flight" "Rollout Start" "Monitoring" "Stop Conditions" "Success Criteria" "Cohort C Gate"; do
  grep -q "## $section" docs/P5_COHORT_B_EXECUTION_CHECKLIST.md && echo "✓ $section found"
done
```

---

## Known Issues & Follow-Ups

### Resolved by P5-3c-verify

- ✅ `simplified_scene` experiment verified PASS (4 themes, 32/32 pages, no duplicates, no early failures)
- ✅ Cohort B preconditions met (Build ✓, Tests 1604/1604 ✓, Smoke Evidence ✓)

### Open Follow-Ups (Post-Cohort B)

1. **P5-4**: `prod-baseline` re-measurement after ≥30 real books → P4_PERMANENT §7.N update
2. **P5-5**: SJ/IM alert policy enablement & threshold tuning (after prod-baseline)
3. **P5-3f**: Safer High-Quality Retry (Option C) rollout decision (already implemented/smoke-passed, awaiting PM gate)
4. **Phase 1 Closure**: Production smoke results aggregation (post-Cohort B traffic)
5. **Phase 3 T1-Smoke**: Fixed template 6-template smoke checklist execution (parallel track)

---

## Suggested Next Task (After Cohort B Execution Checklist)

1. **Immediate (same cycle)**: Execute Cohort B rollout using this checklist (manual process, ~2–4 hours active monitoring)
2. **Follow-up (24–48h after Cohort B starts)**: Aggregate Phase 5-3c + Cohort B data → generate PM decision memo for Cohort C gate
3. **Parallel**: Execute Phase 3 T1-Smoke (fixed template 6-template smoke checklist) to unblock Phase 1 closure
4. **Optional Phase 1 closure** (if Cohort B traffic is adequate): Compile `PRODUCTION_SMOKE_RESULTS.md` with real evidence from Cohort A/B

---

**Priority:** 🔴 **HIGH** — Blocks Cohort B limited rollout and Phase 1 closure decision  
**Estimated Time:** 45–60 minutes  
**Reviewers:** PM (approval gate), Ops (monitoring setup), QA (success criteria validation)
