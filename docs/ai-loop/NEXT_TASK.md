# NEXT_TASK.md

## Context

Based on the roadmap analysis:

- **Phase 1** (Reliability): Production smoke checklist pending. Scheduler automation is implemented but needs live evidence.
- **Phase 3** (Template Mode): 10 templates seeded, smoke checklist defined, but not yet executed on production-like scale.
- **Phase 4** (Gemini JSON): Hardening complete with permanent SLO monitoring in place. responseSchema rollout abandoned.
- **Phase 5** (Soft Launch): Cohort A completed successfully. Cohort B limited rollout is GO with `simplified_scene` experiment active. P5-3d ガード実装 complete, awaiting PM deployment approval.

**Current blocking item**: Phase 1 production smoke checklist execution. Without live evidence from production Firestore + Cloud Scheduler, the "production smoke evidence pending" gate cannot close, and Phase 2 quality work remains at lower priority.

**Recommended next step**: Execute Phase 1 production smoke checklist to unblock Phase 2 quality focus.

---

## Objective

Write the **Phase 1 Production Smoke Results** document (`docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md`) by executing the checklist items against the live production environment and recording:

1. **Scheduler execution evidence** (saveDailySloSnapshot, saveWeeklySloSnapshot, cleanupStaleGeneration)
2. **Firestore rules + index verification** (composite index for collection group query, runs subcollection read permissions)
3. **SLO metrics from production** (book readable rate, failure rate, p95 latency, fallback usage)
4. **Pass/fail summary** against MVP baseline criteria
5. **Known issues discovered** (if any)

This document will close the "production smoke evidence pending" gate and unlock Phase 2 prioritization.

---

## Allowed Scope

You may create and edit:

- `docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md` (new file)
- `docs/PRODUCTION_SMOKE_CHECKLIST.md` (read existing, may add notes/timestamps)
- `docs/AI-LOOP/NEXT_TASK.md` (update with follow-up)

You may **read**:

- Cloud Console (Firestore, Cloud Scheduler, Cloud Logging, Cloud Monitoring)
- Admin dashboard (SLO Dashboard, Quality Review UI)
- Existing roadmap docs

---

## Forbidden Scope

- **Do not** modify code (Firebase Functions, React, Node.js)
- **Do not** change Firestore rules or indexes (read-only verification only)
- **Do not** modify environment variables
- **Do not** deploy or trigger scheduler jobs manually (observe only)
- **Do not** modify product data or user accounts

---

## Requirements

### Evidence to Collect

1. **Scheduler Execution Logs**
   - Verify `saveDailySloSnapshot` ran at 03:00 JST (last 7 days)
   - Verify `saveWeeklySloSnapshot` ran on Monday 03:15 JST (last 2 weeks)
   - Verify `cleanupStaleGeneration` ran at 03:30 JST (last 7 days)
   - Cloud Scheduler UI + Cloud Logging queries

2. **Firestore Index + Rules**
   - Confirm `books` collection group index exists for `createdAt DESC` queries
   - Confirm `runs` subcollection can be read by admin (check Firestore Rules UI)
   - Screenshot or note the index status (should be "Enabled")

3. **SLO Metrics from Admin Dashboard**
   - Book readable rate (last 7 days, target >= 98%)
   - Book hard failed rate (target <= 2%)
   - Page image p95 latency (target <= 120s)
   - Image failed rate (target <= 2%)
   - Regeneration success rate (target >= 95%)

4. **Live Book Outcomes**
   - Count total `book_outcomes` in production (last 30 days)
   - Sample 3–5 books: check `book.status` / `partial_completed` / `failedPageIndices` presence

5. **Fallback Usage**
   - From SLO Dashboard: count timeout → fallback events
   - Verify timeout + fallback (pro_consistent → klein_fast, 120s) is working

### Document Structure

```markdown
# Production Smoke Results

**Date**: YYYY-MM-DD
**Environment**: Production
**Tester**: [AI Loop Worker]

## 1. Scheduler Execution Evidence

### saveDailySloSnapshot (03:00 JST)
- [✓/✗] Last 7 days: [count] executions, [status]
- Log query: [Cloud Logging filter]
- Screenshot: [path or "verified in console"]

### saveWeeklySloSnapshot (Monday 03:15 JST)
- [✓/✗] Last 2 weeks: [count] executions, [status]

### cleanupStaleGeneration (03:30 JST)
- [✓/✗] Last 7 days: [count] executions, [status]

## 2. Firestore Index + Rules Verification

- [✓/✗] `books` collection group index exists
- [✓/✗] `runs` subcollection read permission confirmed
- Index status: [screenshot/note]

## 3. SLO Metrics (Last 7 days)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Book readable rate | X% | >= 98% | ✓/✗ |
| Book hard failed rate | X% | <= 2% | ✓/✗ |
| Page image p95 (sec) | X | <= 120 | ✓/✗ |
| Image failed rate | X% | <= 2% | ✓/✗ |
| Regen success rate | X% | >= 95% | ✓/✗ |

## 4. Live Book Outcomes Sample

- Total books (30d): [count]
- Sample books: [3 IDs + status summary]

## 5. Fallback + Timeout Evidence

- Timeout → fallback events (7d): [count]
- pro_consistent → klein_fast recorded: [✓/✗]

## 6. Pass/Fail Summary

| Item | Pass/Fail | Notes |
|------|-----------|-------|
| Phase 1 MVP criteria | ✓/✗ | [brief summary] |
| Scheduler automation | ✓/✗ | |
| Firestore structure | ✓/✗ | |
| SLO monitoring | ✓/✗ | |

## 7. Known Issues Discovered

- [Issue 1]: [brief description + mitigation]
- [No issues found]

## 8. Gate Status

**Phase 1 Production Smoke**: [✓ PASS / ✗ FAIL]

**Recommendation**: 
- If PASS: "Proceed to Phase 2 quality focus. Update roadmap Final Decision."
- If FAIL: "Resolve issues in [area]. Rerun checklist."

## 9. Appendix

- Cloud Logging queries used: [links]
- SLO Dashboard: [link]
- Scheduler logs: [query or screenshot]
```

### Acceptance Criteria

- [ ] `PRODUCTION_SMOKE_RESULTS.md` created with all 9 sections completed
- [ ] All 5 MVP baseline criteria have measured values (not estimates)
- [ ] Scheduler execution verified for last 7 days (all 3 jobs)
- [ ] At least 1 live book outcome examined
- [ ] Pass/Fail summary is clear and actionable
- [ ] No code changes or infrastructure modifications
- [ ] Document is Markdown-formatted and ready for commit

### Required Test Commands

None (this is documentation-only). However, verify:

```bash
# Check that the document is well-formed Markdown
npm run lint -- docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md
# or
cat docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md | head -20
```

---

## Known Issues

- Cloud Scheduler timezone display may be UTC in UI; verify against job schedule definition (JST offset)
- SLO Dashboard metrics may have a 5–10 minute delay; allow for eventual consistency
- If fewer than 5 production books exist in the last 7 days, note this and recommend re-running after more real user traffic

---

## Suggested Follow-up Task

Once Phase 1 smoke results are **PASS**:

1. **Update `docs/FINAL_DECISION.md`** to mark Phase 1 as "Complete" and remove "production smoke evidence pending"
2. **Prioritize Phase 2 quality checklist** (manual QA of 10 template books + quality rubric refinement)
3. **Execute Phase 3 template smoke** (fixed_template 6 books smoke checklist) in parallel

If Phase 1 smoke results are **FAIL**:

1. **File issue for the discovered problem** (e.g., missing index, scheduler not running)
2. **Re-run checklist after fix** is deployed
3. **Block Phase 2 until Phase 1 is stable**

---

## Worker Prompt

### Task Summary

You are the AI Loop worker. Your job is to **execute Phase 1 production smoke checklist** and **document results** in `docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md`.

### Steps

1. **Access Production Environment**
   - Open Google Cloud Console (project: `story-gen`)
   - Verify you have read-only access to Firestore, Cloud Scheduler, Cloud Logging

2. **Verify Scheduler Execution** (Section 1)
   - Go to **Cloud Scheduler** UI
   - Find jobs: `saveDailySloSnapshot`, `saveWeeklySloSnapshot`, `cleanupStaleGeneration`
   - For each job, click **View logs** and filter logs from the last 7 days
   - Count successful executions
   - Note any FAILED or SKIPPED status
   - Copy Cloud Logging filter query (e.g., `resource.labels.job_name="saveDailySloSnapshot"`)

3. **Verify Firestore Index + Rules** (Section 2)
   - Go to **Firestore** → **Indexes**
   - Search for index on `books` with `createdAt DESC`
   - Note status (Enabled / Building / etc.)
   - Go to **Firestore Rules** → review `rules for 'books'` section
   - Confirm that admin role can read `runs` subcollection
   - Screenshot or copy the relevant rule lines

4. **Extract SLO Metrics** (Section 3)
   - Go to **Admin Dashboard** (React app, `/admin/slo-dashboard`)
   - Select last 7 days
   - Read the 5 metrics from the dashboard:
     - Book readable rate
     - Book hard failed rate
     - Page image p95
     - Image failed rate
     - Regeneration success rate
   - If dashboard shows N/A, go to **Cloud Logging** and run manual SLO queries:
     - Query: `resource.type="cloud_function" AND jsonPayload.event_type="book_outcome"`
     - Count outcomes by status (completed / partial_completed / failed)
   - Record exact values in table format

5. **Sample Live Book Outcomes** (Section 4)
   - Go to **Firestore** → `books` collection
   - Click on 3–5 books created in the last 7 days
   - Note: `status`, `partial_completed` (true/false), `failedPageIndices` (if present)
   - Record book IDs and brief summary (e.g., "Book A: status=completed, pages=4/4")

6. **Verify Fallback Evidence** (Section 5)
   - Go to **Cloud Logging**
   - Query: `jsonPayload.imageFallbackUsed=true`
   - Count fallback events in the last 7 days
   - Verify log entries contain `imageModel` transition (e.g., `pro_consistent` → `klein_fast`)

7. **Summarize Pass/Fail** (Section 6)
   - For each MVP criterion, decide ✓ PASS or ✗ FAIL:
     - Book readable rate >= 98% → ✓ or ✗
     - Book hard failed rate <= 2% → ✓ or ✗
     - Page image p95 <= 120s → ✓ or ✗
     - Image failed rate <= 2% → ✓ or ✗
     - Regen success rate >= 95% → ✓ or ✗
   - If all ✓, mark "Phase 1 Production Smoke: **PASS**"
   - If any ✗, mark "Phase 1 Production Smoke: **FAIL**" and note the failing criterion

8. **Document Known Issues** (Section 7)
   - If you discover scheduler failures, missing metrics, or data anomalies, list them
   - Suggest short mitigation (e.g., "Rerun snapshot after rebuilding index")

9. **Write the Document**
   - Create `docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md`
   - Use the structure above
   - Commit with message: `docs: Phase 1 production smoke results [date]`
   - Push to branch (no PR required for docs-only)

### Tips

- **Timezones**: Cloud Scheduler may show UTC in logs; 03:00 JST = 18:00 UTC (previous day)
- **Metrics delay**: SLO Dashboard updates every 5–10 minutes; refresh browser if needed
- **No manual triggers**: Do not manually run scheduler jobs; only observe past executions
- **Sample size**: If < 5 books in production, note this but proceed with smoke results
- **Fallback queries**: Cloud Logging may require 30 seconds to return large result sets; be patient

### Questions?

- Refer to `docs/PRODUCTION_SMOKE_CHECKLIST.md` for detailed step-by-step instructions per item
- Refer to `docs/PHASE1_DESIGN.md` for SLO metric definitions and baseline thresholds
- If blocked on Google Cloud Console access, escalate to PM

---

**Objective**: Complete and commit `docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md` with all 9 sections filled, MVP criteria measured, and a clear PASS/FAIL determination.
