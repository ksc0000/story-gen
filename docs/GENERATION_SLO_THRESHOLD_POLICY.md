# EhonAI Generation SLO Threshold Policy

**Version**: P2-10 (2026-05-20)  
**Status**: Provisional — thresholds should be reviewed and tuned after sufficient real traffic data  
**Scope**: Generation health monitoring thresholds, severity levels, decision matrix, and Phase 2 closure

---

## 1. Purpose

This document defines the initial SLO threshold policy for EhonAI generation health monitoring.

**Thresholds are provisional.** They are set conservatively to allow early incident detection without generating noise on low volumes. They should be reviewed and tuned after at least 2 weeks of real production data collected via the `report-generation-slo.mjs` script or the Admin SLO Dashboard.

This policy defines:
- Which metrics to monitor and what values are acceptable
- Severity levels and recommended actions
- Sample size rules (how to interpret low-volume periods)
- Decision matrix for common symptoms
- Weekly review process
- Release gate checklist
- Phase 2 closure summary

**This policy does not change production behavior.** No generation routing, candidate gating, provider selection, or fallback order is modified by this document.

---

## 2. Metric Catalog

### 2.1 Book-level metrics

| Metric | Description | Healthy | OK floor | Watch | Investigate | Incident |
|---|---|---|---|---|---|---|
| **Readable rate** | `(completed + partial_completed) / total book_outcomes` | ≥ 98% | ≥ 98% | 95–98% | 90–95% | < 90% |
| **Completion rate** | `completed / total book_outcomes` | ≥ 95% | ≥ 95% | 90–95% | 80–90% | < 80% |
| **Partial completion rate** | `partial_completed / total` | ≤ 5% | ≤ 5% | 5–10% | 10–20% | > 20% |
| **Failure rate** | `failed / total book_outcomes` | ≤ 2% | ≤ 2% | 2–5% | 5–10% | > 10% |
| **Early failure rate** | `book_early_failed / (started + early_failed)` | ≤ 2% | ≤ 2% | 2–5% | > 5% | > 10% |

> **Primary UX metric**: Readable rate. A user with a `partial_completed` book still has a usable product. Hard failures are the worst user experience.

### 2.2 Page / image-level metrics

| Metric | Description | Healthy | Watch | Investigate | Incident |
|---|---|---|---|---|---|
| **Page image failed rate** | `page_image_failed events / total pages attempted` | ≤ 2% | 2–5% | 5–10% | > 10% |
| **Fallback used rate** | Pages that required fallback to `klein_fast` | Informational | — | > 25% | > 50% |
| **E005 rate** | `page_image_failed with errorCode=E005 / total failures` | < 5% | 5–10% | > 10% | > 30% |
| **TIMEOUT rate** | `page_image_failed with errorCode=TIMEOUT / total failures` | < 15% | 15–25% | > 25% | > 50% |
| **PROVIDER_5XX rate** | Provider HTTP 5xx errors | 0 sustained | Any single | Recurring | > 5% of failures |
| **PROVIDER_4XX rate** | Provider HTTP 4xx (non-quota, non-E005) | 0 | Any | Recurring | — |
| **QUOTA_EXCEEDED rate** | Rate-limit / monthly quota errors | 0 | Any | Recurring | > 5% of failures |
| **VALIDATION_FAILED rate** | Input / schema / quality gate failures | 0 | Any | Recurring | — |

### 2.3 Latency metrics

| Metric | Description | Healthy | Watch | Investigate | Incident |
|---|---|---|---|---|---|
| **Book durationMs p50** | Median book generation time | ≤ 300 s | 300–450 s | 450–600 s | > 600 s |
| **Book durationMs p95** | 95th percentile book generation time | ≤ 600 s | 600–900 s | 900 s–15 min | > 15 min |
| **Page image p95** | p95 of `imageDurationMs` across pages | ≤ 120 s | 120–150 s | 150–240 s | > 240 s |

> **Note**: Story generation latency (Gemini) is not yet measurable from structured event logs. It contributes to book durationMs but cannot be disaggregated until Gemini latency events are added.

### 2.4 Candidate gate metrics

| Metric | Description | Expected | Action if unexpected |
|---|---|---|---|
| **candidateRequested count** | Books where a candidate profile was requested | Low / zero in normal traffic | Informational if enrolled users; Investigate if from non-enrolled |
| **candidateAllowed count** | Books where gate allowed candidate profile | Should be 0 unless enrolled | **Incident** if non-zero without deliberate enrollment |
| **candidateBlocked count** | Requests blocked by gate | Equal to candidateRequested in normal traffic | Inform if count drops unexpectedly |
| **Candidate leakage suspicion** | `candidateAllowed > 0` and no enrollment session active | Not expected | **Incident** — treat as routing anomaly |

> `candidateAllowed` non-zero **for a non-enrolled user** is always an Incident regardless of traffic volume. This represents candidate profile leakage into production routing.

### 2.5 Asset metrics

| Metric | Description | Healthy | Investigate | Incident |
|---|---|---|---|---|
| **Public asset URL 200 rate** | All 37 WebP assets return HTTP 200 | 100% | Any non-200 response | Any asset used in active book generation returns non-200 |
| **Stale PNG references** | `.png` references in `sampleImageUrl` / asset source | 0 | > 0 | — |

### 2.6 Data quality metrics

| Metric | Description | Healthy | Watch | Investigate |
|---|---|---|---|---|
| **Missing event name** | Events where `eventName` is absent or unknown | 0 | Any | > 1% of events |
| **Parse warnings** | Events that failed JSON parsing in the report | 0 | Any | > 1% of events |

---

## 3. Severity Levels

### 3.1 OK

**Condition**: All metrics within healthy range.  
**Action**: No action required. Record in weekly review.  
**Routing changes**: Not needed.  
**Escalation**: None.

---

### 3.2 Watch

**Condition**: One or more metrics outside healthy range but above Investigate threshold.  
**Action**:
- Record the metric name, value, and time window in the weekly review notes.
- Re-check at next review cycle.
- Confirm whether the change is transient (single day) or persistent.

**Routing changes**: Do NOT change routing based on Watch alone.  
**Escalation**: None unless persists for 2+ review cycles.

---

### 3.3 Investigate

**Condition**: One or more metrics outside the Investigate threshold, or any asset failure, or any candidate leakage suspicion.  
**Action**:
- Run the SLO report against a fresh Cloud Logging export.
- Check the Admin SLO Dashboard for corroboration.
- Identify affected book IDs (bookId, not user identity) and profile/provider.
- Review recent deployment history — any routing, candidate, or provider change in the window?
- Consider whether a code fix is needed.

**Routing changes**: Allowed only if the investigation confirms a specific routing configuration as the cause, with explicit approval.  
**Escalation**: Notify team. Create a tracking issue.

---

### 3.4 Incident

**Condition**: Any metric at or beyond the Incident threshold, or `candidateAllowed` non-zero without deliberate enrollment.  
**Action**:
- Treat as active incident. Follow the relevant playbook in `docs/GENERATION_SLO_RUNBOOK.md §8`.
- Identify blast radius (how many users / books affected).
- Determine if a rollback is required.
- Do NOT make speculative routing changes without evidence.

**Routing changes**: Allowed only with explicit approval after blast-radius assessment.  
**Escalation**: Immediate notification to repo owner.

---

## 4. Initial Thresholds Summary Table

> All values are provisional. Review after ≥ 2 weeks of ≥ 30 books/day production data.

| Metric | OK | Watch | Investigate | Incident |
|---|---|---|---|---|
| Readable rate | ≥ 98% | 95–98% | 90–95% | < 90% |
| Completion rate | ≥ 95% | 90–95% | 80–90% | < 80% |
| Partial completion rate | ≤ 5% | 5–10% | 10–20% | > 20% |
| Failure rate | ≤ 2% | 2–5% | 5–10% | > 10% |
| Page image failed rate | ≤ 2% | 2–5% | 5–10% | > 10% |
| E005 rate (of failures) | < 5% | 5–10% | > 10% | > 30% |
| TIMEOUT rate (of failures) | < 15% | 15–25% | > 25% | > 50% |
| Book durationMs p95 | ≤ 600 s | 600–900 s | 900 s–15 min | > 15 min |
| Page image p95 | ≤ 120 s | 120–150 s | 150–240 s | > 240 s |
| candidateAllowed (unenrolled) | 0 | — | — | Any non-zero |
| Asset URL 200 rate | 100% | — | Any failure | Active asset failure |
| Stale PNG refs | 0 | — | > 0 | — |

---

## 5. Sample Size Rules

### 5.1 Fewer than 10 book_outcome events

- Do not compute rates. Report counts only.
- Do not trigger Watch/Investigate based on rates alone.
- Note in weekly review as "insufficient sample".
- Readable rate cannot be meaningfully interpreted at this volume.

### 5.2 Fewer than 30 book_outcome events

- Rates are directional only. A single failure can push the failure rate above thresholds.
- Use severity levels as a guide, not a trigger for routing decisions.
- Do not escalate to Incident based on rate thresholds alone at < 30 samples.
- Exception: `candidateAllowed` non-zero is always Incident regardless of sample size.

### 5.3 Candidate traffic absent

- `candidateRequested = 0` is expected in normal production.
- Absence of candidate traffic does not indicate a problem.
- Report it as "no candidate traffic observed in window" — informational only.

### 5.4 No page_image_failed events

- Zero failures is the healthy state.
- Report as "no page image failures observed" — not a data quality issue unless total events is also very low.

### 5.5 Missing durationMs

- If `durationMs` is absent from many `book_outcome` events, the latency percentiles are unreliable.
- Report as a data quality note. Do not trigger latency-based severity on incomplete data.
- Check whether `durationMs` was being emitted correctly at the time of the window.

### 5.6 General guidance

**Never make a production routing decision based solely on a single metric in a small-sample window.**  
Use multiple signals, check the Admin SLO Dashboard (Firestore-based), and review recent change history before acting.

---

## 6. Decision Matrix

| Symptom | Severity | Immediate action | Routing change? | Reference |
|---|---|---|---|---|
| E005 spike (> 10% of failures) | Investigate | Filter by `primaryProfile`; identify affected template/style combos | No — unless root cause confirmed | RUNBOOK §8.1 |
| TIMEOUT spike (> 25% of failures) | Investigate | Check `primaryProfile` — `klein_fast` timeouts common; check provider queue | No — `klein_fast` is fallback-only | RUNBOOK §8.2 |
| QUOTA_EXCEEDED spike | Investigate / Incident | Check API key usage; check Replicate dashboard; check if candidate traffic increased | No — except to throttle if quota exhausted | RUNBOOK §8.3 |
| `candidateAllowed` non-zero (unenrolled) | Incident | Stop candidate traffic; review gate logic; verify no routing change was deployed | Yes — with explicit approval | RUNBOOK §8.5 |
| `provider=openai` in page_image_failed (unexpected) | Incident | Confirm no unauthorized candidate routing change | Yes — with explicit approval | RUNBOOK §8.6 |
| Asset URL non-200 | Investigate / Incident | Run `npm run check:public-assets`; check Firebase Hosting deploy history | No routing change | RUNBOOK §8.8 |
| Book durationMs p95 spike | Watch / Investigate | Check story generation vs image generation contribution; check provider queue | No | RUNBOOK §10 |
| Partial completion increase | Watch / Investigate | Check `page_image_failed` distribution; check if single template/page index | No | RUNBOOK §8.9 |
| Malformed log increase | Watch / Investigate | Check `dataQualityNotes` in report; review recent event logger changes | No | RUNBOOK §9.2 |
| No logs returned | Data issue | Confirm gcloud project, freshness, and filter; check log explorer manually | No | RUNBOOK §9 |
| Report parse warnings | Watch | Check event shape in raw export; review generation-event-logger changes | No | RUNBOOK §9 |
| Stale PNG refs > 0 | Investigate | Run `npm run check:public-assets --stale-png`; find and replace .png with .webp | No | RUNBOOK §8.9 |

---

## 7. Weekly Review Process

Run this process once per week when generation volume is sufficient (≥ 10 books in the review window).

### Step 1 — Run deterministic guards

```bash
npm run check:phase2
```

Expected: hygiene PASS, SLO self-test 49/49 PASS, guard tests 102/102 PASS.

### Step 2 — Check public assets (if network available)

```bash
npm run check:public-assets
```

Expected: 37/37 HTTP 200. Note any failures.

### Step 3 — Generate Cloud Logging query

```bash
npm run logs:generation-query -- --project story-gen-8a769 --hours 168
```

Copy the printed gcloud command, authenticate, and export events to `tmp/generation-events.json`.

### Step 4 — Run SLO report

```bash
node scripts/report-generation-slo.mjs --input tmp/generation-events.json
```

Review console output. Key metrics to check:
- Readable rate vs ≥ 98%
- Failure rate vs ≤ 2%
- E005 and TIMEOUT counts
- candidateAllowed count (expect 0)
- p95 duration

### Step 5 — Compare against thresholds

Use Section 4 of this document as the reference table.

### Step 6 — Record summary

Record:
- Review date and window
- Readable rate, completion rate, failure rate
- Any metrics at Watch / Investigate / Incident
- Total book_outcome events (sample size)
- Action taken or deferred

Store in `tmp/` or in a shared internal doc. Do NOT commit raw event data.

### Step 7 — Create follow-up if needed

If any metric is at Investigate or above:
- Create a task/issue with the symptom, metric value, and review date.
- Assign severity using Section 3.
- Reference the relevant incident playbook from `docs/GENERATION_SLO_RUNBOOK.md §8`.

---

## 8. Release Gate Recommendation

Before deploying code that touches generation routing, provider selection, candidate gate, or public assets, confirm:

| Gate | Check | Command |
|---|---|---|
| Deterministic guards | PASS | `npm run check:phase2` |
| Public assets | 37/37 PASS | `npm run check:public-assets` |
| Candidate gate tests | 48/48 PASS | (included in `check:phase2`) |
| Generation event logger tests | 54/54 PASS | (included in `check:phase2`) |
| No routing change without review | Confirm `resolveImageModelProfile` diff | Manual review |
| No candidate gate behavior change | Confirm `isCandidateProfile` diff | Manual review |
| SLO from recent sample | Readable rate ≥ 98%, failure rate ≤ 2% | Run report if data available |

**For docs-only changes**: `npm run check:phase2` is sufficient.  
**For generation code changes**: All gates above must be verified before merge.

---

## 9. Phase 2 Closure Summary

Phase 2 reliability work is now complete. The following 10 slices were delivered:

| Slice | Title | Deliverable | Commit |
|---|---|---|---|
| **P2-1** | Generation SLO and regression guard inventory | `docs/PHASE2_GENERATION_SLO_PLAN.md` — SLO targets, risk inventory, gap analysis | c975dd1 |
| **P2-2** | Structured generation event logging | `functions/src/lib/generation-event-logger.ts` — typed events at all lifecycle points | b98f887 |
| **P2-3** | Normalized provider error taxonomy | `classifyError()` + `resolveProviderFromProfile()` — `ErrorCode`/`ImageProvider` fields | 48dcfb1 |
| **P2-4** | Candidate gate regression tests | `functions/test/candidate-gate.test.ts` — 48 pure regression tests locking gate behavior | 57c0e9a |
| **P2-5** | Public asset URL smoke checker | `scripts/check-public-assets.mjs` — HTTP HEAD all 37 WebP URLs | 2abd169 |
| **P2-6** | Generation SLO report script | `scripts/report-generation-slo.mjs` — NDJSON/JSON → console/markdown/json report | 53ee790 |
| **P2-7** | Operational runbook | `docs/GENERATION_SLO_RUNBOOK.md` — export, report, interpret, incident playbooks | 7909689 |
| **P2-8** | Deterministic CI/local guardrails | `.github/workflows/ci-phase2.yml` + `check:phase2` script; 102 tests, no credentials | 36a048b |
| **P2-9** | Scheduled reporting automation design | `docs/GENERATION_SLO_AUTOMATION_PLAN.md` + `scripts/print-generation-log-query.mjs` | 7e0aa70 |
| **P2-10** | SLO threshold policy and Phase 2 closure | `docs/GENERATION_SLO_THRESHOLD_POLICY.md` (this document) | — |

### What Phase 2 established

- **Observability**: Structured events are now emitted at every key generation lifecycle point. Error codes and providers are normalized. Cloud Logging is the source of truth for generation health beyond the Firestore SLO snapshots.
- **Guards**: 102 deterministic tests run on every push. Hygiene, SLO report logic, candidate gate behavior, and event shapes are all locked.
- **Process**: Weekly review process, incident playbooks, and release gate checklist are documented and operationally ready.
- **Safety**: No production behavior was changed in any Phase 2 slice. All work is additive: logging, tests, docs, and scripts.

### What Phase 2 did NOT change

- Production default generation routing (Replicate `pro_consistent` primary, `klein_fast` fallback)
- Candidate gate behavior (`isCandidateProfile`, enrollment check)
- Provider selection logic
- Fallback order
- Firestore schema
- Public assets
- Firebase deployment behavior

---

## 10. Remaining Work After Phase 2

### P2 follow-up items

| Item | Priority | Description |
|---|---|---|
| Fix 3 pre-existing test failures | Medium | `test/generate-book.test.ts` x1, `test/prompt-builder.test.ts` x1, `test/test-image-models.test.ts` x1 — unrelated to P2 work; tracked separately |
| P2-9c: manual-dispatch SLO report workflow | Low | GitHub Actions `workflow_dispatch` workflow; requires repo-owner credential provisioning review |
| Threshold tuning after real traffic | Medium | After ≥ 2 weeks of ≥ 30 books/day, revisit Section 4 thresholds with measured baselines |
| Gemini latency structured event | Low | Add story-generation duration to `generation_started` or `book_outcome` to make Gemini p95 measurable |

### Phase 3 candidates (from `docs/PRODUCT_ROADMAP.md`)

| Item | Priority | Description |
|---|---|---|
| **ImageProvider abstraction** | High | Decouple image generation code from Replicate-specific APIs. Define an `ImageProvider` interface. Enables safe multi-provider routing without ad-hoc conditionals. See `docs/PRODUCT_ROADMAP.md Phase 3`. |
| Dashboard automation | Low | Automate periodic SLO report via scheduled GitHub Actions + GCS sink, after P2-9c/d is validated |
| Alerting policy | Low | Define Cloud Monitoring alerting on the SLO thresholds in Section 4, after threshold validation |

> **Update (2026-05-21)**: SJ/IM alert policy definitions are now complete (P2-10b) — `docs/P2_SJ_IM_ALERT_POLICIES.md`.
> 13 policies (SJ-1..SJ-4, IM-1..IM-9) defined with YAML specs and gcloud live creation commands.
> All policies `enabled: false` pending P2-9 metric live creation and production baseline validation.
> Threshold values in §6 of `docs/P2_SJ_IM_ALERT_POLICIES.md` correspond to the Investigate/Incident levels in §4 of this document.

### Decision needed before Phase 3

Before starting the ImageProvider abstraction:
1. Confirm the current candidate/non-candidate routing split in Firestore SLO data.
2. Ensure P2 tests remain green against any refactored provider interface.
3. Confirm OpenAI candidate path continues to be gated — not promoted to default — during abstraction.

---

## Appendix: Related Documents

| Document | Purpose |
|---|---|
| `docs/GENERATION_SLO_RUNBOOK.md` | Operational runbook: how to collect, report, and respond |
| `docs/P2_SJ_IM_ALERT_POLICIES.md` | P2-10b SJ/IM alert policy definitions (YAML specs + gcloud commands) |
| `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` | CG-1 candidate gate alert policy (live + enabled) |
| `docs/GENERATION_SLO_AUTOMATION_PLAN.md` | Staged automation design (P2-9) |
| `docs/PHASE2_GENERATION_SLO_PLAN.md` | Full Phase 2 design doc with all implementation notes |
| `docs/PRODUCT_ROADMAP.md` | Commercialization roadmap; SLO targets; Phase 3 plan |
| `docs/image-model-policy.md` | Provider selection rationale and policy |
| `scripts/report-generation-slo.mjs` | SLO report script |
| `scripts/print-generation-log-query.mjs` | Cloud Logging query helper (P2-9b) |
| `scripts/check-public-assets.mjs` | Public asset URL smoke checker |
| `.github/workflows/ci-phase2.yml` | Deterministic CI workflow |
