# AI Loop: Next Task

**Generated:** 2026-05-23  
**Phase:** 1.5b (Production Smoke + Phase 2 Quality)  
**Priority:** Critical Path → Production Evidence

---

## Context

The roadmap shows:

1. **Phase 1** is functionally complete but requires **production smoke evidence** before moving to final decision
2. **Phase 2** (Quality) is actively being tracked with admin review UI, recommendation system, and quality task persistence implemented
3. **Phase 3** (Template Mode) has 10 templates seeded; T1–T2 mostly complete; T3 (8/12 pages) blocked pending 4-page stabilization
4. **Phase 4** (Gemini JSON) is **CLOSED** per `PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md`
5. **Phase 5** (Soft Launch) is **IN PROGRESS**:
   - Cohort A: ✅ COMPLETE (SLO pass)
   - Cohort B: 🟡 **GO decision made** but limited rollout pending (P5-3d + P5-3f implementations for reference image / model unification strategy)

**Critical blockers:**
- P5-3d (simplified_scene guard) implementation: ✅ COMPLETE, deployed, **smoke PASS** (2026-06-03)
- P5-3f (safer_retry option) implementation: ✅ COMPLETE, deployed, **smoke PASS** (2026-06-03)
- Cohort B rollout authorization: ⏳ **PM decision pending**

---

## Objective

**Execute the immediate next critical task** to unblock Cohort B limited rollout or advance the production smoke evidence baseline.

Based on roadmap state, the **highest-value next task** is:

### **PROD-BASELINE-2: Re-measure P4 permanent SLO metrics with ≥ 30 real book_outcomes**

**Why this task:**
- P4 closure requires prod-baseline with ≥ 30 `book_outcome` records to finalize `PERMANENT_STORY_JSON_SLO_PLAN` Section 7.2
- This baseline gates P5-5 (SJ/IM alert enablement) and validates repair-retry decision framework
- Cohort B rollout is limited (3–5 testers); 30-book baseline requires real production traffic accumulation or structured Cohort A/B analysis export
- Once completed, PM can make final SJ/IM alert enablement call and proceed with broader Cohort C rollout planning

**Alternative (if Cohort B rollout is *already authorized* and needs immediate execution):**

### **P5-B-ROLLOUT: Execute Cohort B limited rollout invitation + 1-hour monitoring window**

---

## Task Selection: **PROD-BASELINE-2**

Rationale: Cohort B rollout success depends on stable baseline metrics. Executing the baseline assessment in parallel with pending PM authorization maximizes velocity.

---

## Allowed Scope

### Editable Directories
- `docs/smoke-results/`
- `docs/` (analysis documents, decision logs)
- `scripts/analysis/` (data export, metric computation scripts)
- Firebase Cloud Logging (read-only query export)

### Files to Create/Modify
- `docs/smoke-results/PROD_BASELINE_2_EXECUTION_LOG.md` — execution record, query results, metric tables
- `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` — Section 7.2 (Actual Baseline 7-day Metrics) update
- `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` — Section P5-4 status update
- `scripts/analysis/export-prod-baseline-2-metrics.mjs` (new) — Cloud Logging export script for ≥ 30 `book_outcome` records
- `scripts/analysis/compute-slo-baseline-stats.mjs` (new) — statistical analysis: mean, p50, p95, p99, failure category breakdown

---

## Forbidden Scope

- Modifying Firebase schema or Firestore rules
- Creating/deploying Cloud Functions
- Modifying `functions/src/` or application code
- Changing Stripe configuration
- Modifying authentication
- Generating new assets (images, videos)
- Production deployment flags

---

## Acceptance Criteria

✅ **Task Complete When:**

1. **Data Collection**
   - [ ] Cloud Logging queries executed against last 7–14 days of `book_outcome` events
   - [ ] ≥ 30 valid `book_outcome` records extracted (or data insufficient → document and recommend wait period)
   - [ ] CSV export or JSON artifact saved to `docs/smoke-results/PROD_BASELINE_2_DATA.json`

2. **Metric Computation**
   - [ ] `storyJsonFailureCategory` distribution computed (histogram: `parse_error`, `validation_error`, `field_type_mismatch`, `repair_success`, `no_error`)
   - [ ] `storyDurationMs` percentiles computed: p50, p95, p99 (median, 95th, 99th)
   - [ ] `imageDurationMs` distribution (optional: p50, p95 if ≥ 20 image samples)
   - [ ] `pageVisualRole` confidence / mismatch rate (if data available)
   - [ ] Cohort A vs. Cohort B early stats (if ≥ 10 Cohort B outcomes available)

3. **Documentation**
   - [ ] `PROD_BASELINE_2_EXECUTION_LOG.md` created with:
     - Timestamp, query window, record count, data quality notes
     - Metric tables (failure categories, duration percentiles)
     - Comparison to P4 closure baseline (dev/test, 2026-05-21) — improvement or regression
     - Risk assessment: any new failure patterns emerged?
   - [ ] `P4_PERMANENT_STORY_JSON_SLO_PLAN.md` Section 7.2 updated with actual baseline
   - [ ] `P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` Section P5-4 marked **COMPLETE** with link to new baseline doc

4. **Decision Artifact**
   - [ ] Recommendation section in `PROD_BASELINE_2_EXECUTION_LOG.md` stating:
     - SJ/IM alert enablement: **recommended** / **defer** (with rationale)
     - Repair-retry confidence: **high** / **medium** / **low**
     - Cohort B expansion gate: **open** / **conditional** / **hold**

---

## Worker Prompt

You are preparing to execute **PROD-BASELINE-2: Re-measure P4 permanent SLO with ≥ 30 real book_outcomes**.

### Step 1: Review Baseline Definition
1. Read `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` Section 7.2 (Actual Baseline definition)
2. Read `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` Section 7.3 (P5-3a attempted notes from 2026-05-21)
3. Understand the metrics and failure taxonomy:
   - `storyJsonFailureCategory` values: `parse_error`, `validation_error`, `field_type_mismatch`, `repair_success`, `no_error`
   - `storyDurationMs` target: p95 < 180 000 ms (3 min), p99 < 300 000 ms (5 min)
   - Image fallback rate target: < 2%

### Step 2: Collect Production Data
1. **Query 1: Event count & time window**
   ```
   resource.type="cloud_function"
   resource.labels.function_name="generate-book"
   severity="INFO"
   jsonPayload.category="book_outcome"
   timestamp >= "2026-05-23T00:00:00Z"  # Adjust to last 7–14 days
   ```
   - Record: earliest timestamp, latest timestamp, total count

2. **Query 2: book_outcome detail extract**
   ```
   resource.type="cloud_function"
   resource.labels.function_name="generate-book"
   severity="INFO"
   jsonPayload.category="book_outcome"
   ```
   - Extract fields: `bookId`, `status` (completed / partial_completed / failed), `storyJsonFailureCategory`, `storyDurationMs`, `imageDurationMs`, `pageImageFailureCount`, `imageAttemptCount`, `imageFallbackUsed`, `imageModel`, `createdAt`
   - Export to JSON: `docs/smoke-results/PROD_BASELINE_2_DATA.json`

3. **Query 3: Cohort info (if available)**
   - If `generationOverride.p5PageExperiment` or `generationOverride.p5ModelUnification` logged: extract cohort indicator
   - Filter counts: Cohort A, Cohort B, default

### Step 3: Analyze Metrics
1. **Failure Category Breakdown:**
   - Count each `storyJsonFailureCategory` value
   - Compute %: (count / total) × 100
   - Compare to P4 closure baseline (Section 7.2)

2. **Story Duration Percentiles:**
   - Sort `storyDurationMs` by value
   - Compute: p50 (median), p95, p99
   - Compare to 180 000 ms (p95) and 300 000 ms (p99) targets

3. **Image Reliability:**
   - Count `imageFallbackUsed = true` → fallback rate
   - Count `pageImageFailureCount > 0` → page failure rate
   - Average `imageAttemptCount` per book

4. **Status Distribution:**
   - Count: completed, partial_completed, failed
   - Compute book readable rate: (completed + partial_completed) / total
   - Compare to ≥ 98% target

### Step 4: Document Findings
1. **Create `docs/smoke-results/PROD_BASELINE_2_EXECUTION_LOG.md`:**
   ```markdown
   # PROD-BASELINE-2 Execution Log

   **Date:** 2026-05-23
   **Data Window:** [earliest_timestamp] to [latest_timestamp]
   **Record Count:** [count] book_outcomes

   ## Metrics

   ### Status Distribution
   | Status | Count | % |
   | completed | X | Y% |
   | partial_completed | X | Y% |
   | failed | X | Y% |
   | **Book Readable Rate** | **X/total** | **Y%** |

   ### Story JSON Failure Category
   | Category | Count | % |
   | parse_error | X | Y% |
   | validation_error | X | Y% |
   | field_type_mismatch | X | Y% |
   | repair_success | X | Y% |
   | no_error | X | Y% |

   ### Story Duration (ms)
   | Percentile | Value | Target | Status |
   | p50 | X ms | — | — |
   | p95 | X ms | < 180 000 ms | PASS/FAIL |
   | p99 | X ms | < 300 000 ms | PASS/FAIL |

   ### Image Reliability
   | Metric | Value | Target | Status |
   | Fallback Rate | X% | < 2% | PASS/FAIL |
   | Page Failure Rate | X% | < 2% | PASS/FAIL |

   ## Comparison to P4 Closure Baseline (2026-05-21, dev/test)
   [Compare each metric, note improvements/regressions]

   ## Risk Assessment
   - [Any new failure patterns?]
   - [Outliers or data quality issues?]
   - [Cohort A vs. B differences?]

   ## Recommendation
   - **SJ/IM Alert Enablement:** [RECOMMENDED / DEFER / CONDITIONAL] — rationale
   - **Repair-Retry Confidence:** [HIGH / MEDIUM / LOW]
   - **Cohort B Expansion:** [OPEN / CONDITIONAL / HOLD]
   ```

2. **Update `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` Section 7.2:**
   - Replace dev/test baseline with new prod baseline metrics
   - Add note: "Actual 7-day prod baseline: [date], [count] outcomes"

3. **Update `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` Section P5-4:**
   - Mark P5-4 **COMPLETE**
   - Link to `PROD_BASELINE_2_EXECUTION_LOG.md`

### Step 5: Decision Gate
- **If book readable rate ≥ 98% AND p95 storyDurationMs < 180 000 ms:**
  - Recommend P5-5 (SJ/IM alert enablement) **GO**
  - Recommend Cohort B expansion gate **OPEN**
- **Else:**
  - Document blockers
  - Recommend hold and root-cause investigation

### Data Constraints
- Minimum sample: 30 `book_outcome` records
- If < 30 available: document wait time estimate and recommend retry date
- If data unavailable (e.g., Cohort A/B not yet logged): proceed with available data and note limitations

---

## Test / Verification

### Manual Verification
- [ ] Open `docs/smoke-results/PROD_BASELINE_2_EXECUTION_LOG.md` and review metrics table
- [ ] Cross-check one metric (e.g., p95 storyDurationMs) by hand using raw JSON export
- [ ] Verify no sensitive data in artifact (no PII, child names, etc.)

### Script Execution
```bash
# If scripts created:
node scripts/analysis/export-prod-baseline-2-metrics.mjs
node scripts/analysis/compute-slo-baseline-stats.mjs < docs/smoke-results/PROD_BASELINE_2_DATA.json > docs/smoke-results/PROD_BASELINE_2_STATS.json
```

---

## Known Issues & Follow-ups

### Known Limitations
- If Cohort B outcomes < 10: cohort comparison deferred
- Image metric availability depends on `imageDurationMs` logging coverage (may be incomplete early in Cohort A)
- GCP quota/export delay: allow up to 1 hour for recent logs to become queryable

### Suggested Next Task (After PROD-BASELINE-2)

**Option A: P5-5 (If baseline gates OPEN)**
- **P5-5: Enable SJ/IM Alert Policies** — finalize threshold values, set `enabled: true` on 13 alert policies, configure notification channels

**Option B: P5-B-ROLLOUT (If Cohort B PM approval pending)**
- **P5-B-ROLLOUT: Execute Cohort B Limited Rollout** — send invitations to 3–5 testers, activate 1-hour monitoring window, follow `P5_COHORT_B_EXECUTION_CHECKLIST.md`

**Option C: P3-Smoke (If baseline indicates template readiness)**
- **TEMPLATE-SMOKE: Execute fixed_template 6-template smoke checklist** — generate 6 books (1 per template: brush-teeth, brush-teeth-8p, first-birthday, sleepy-moon, little-helper, memories), validate cover/title/narration, confirm no regressions

---

## Summary

This task collects actual production SLO evidence to:
1. Validate P4 closure decisions (repair-retry framework)
2. Gate P5-5 alert enablement (SJ/IM policies)
3. Authorize Cohort B expansion

**Estimated effort:** 2–4 hours (data export + analysis + documentation)  
**Blocker removal:** High (unblocks P5-5 and Cohort B decisions)

---

**End NEXT_TASK.md**
