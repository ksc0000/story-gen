# P2-11: Generation SLO Dashboard Panels

**Status**: ✅ COMPLETE (docs/config, 2026-05-21)  
**Task**: P2-11 (Dashboard panel additions)  
**Preceding work**: P2-8 (saved queries), P2-9 (metric definitions), P2-10 (CG-1 live alert), P2-12 (notification routing live)  
**References**:
- `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` — metric definitions (P2-9)
- `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` — saved queries (P2-8)
- `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` — CG-1 live alert policy
- `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` — alert candidates and thresholds
- `docs/GENERATION_SLO_RUNBOOK.md` — incident response
- `docs/GENERATION_SLO_THRESHOLD_POLICY.md` — severity thresholds

---

## 1. Purpose

Define a Cloud Monitoring dashboard layout that summarizes all generation SLO signals (CG / SJ / IM / OUT / LAT / DQ) on a single operator-facing view. The dashboard:

- Surfaces incident-relevant signals at a glance
- Links each panel to the corresponding saved query (P2-8) for log drill-down
- References the alert policy and runbook for each signal
- Supports both normal weekly review and active incident triage

**This document is docs/config only.** No live Cloud Monitoring dashboard is created by this task. Live creation requires Cloud Console (or REST API) and `roles/monitoring.dashboardEditor`.

---

## 2. Scope and Current Monitoring State

| Component | Status |
|---|---|
| CG-1 alert policy | ✅ LIVE, **enabled** — `projects/story-gen-8a769/alertPolicies/16928978327782001994` |
| Email notification channel | ✅ LIVE — `notificationChannels/202814648286910376` |
| Log-based metric `generation/candidate_allowed` | ✅ LIVE — `projects/story-gen-8a769/metrics/generation%2Fcandidate_allowed` |
| Other 14 log-based metrics | ⬜ Defined only — live creation pending (gcloud commands in `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §4`) |
| Saved queries (15) | ✅ Defined — `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`; import to Cloud Console is manual |
| Dashboard panels (this doc) | ✅ Defined |
| Live Cloud Monitoring dashboard | ⬜ NOT CREATED — manual creation required |
| SJ/IM alert policies | ⬜ NOT YET — pending P2-10b |

### Panel implementation options

**Option A (recommended for now)**: Keep as docs-only spec; manually build the dashboard in Cloud Console when production traffic justifies it.  
**Option B**: Create the live Cloud Monitoring dashboard via Cloud Console UI using this spec as the source of truth.  
**Option C**: Define `monitoring/dashboards/generation-slo-dashboard.json` and apply via `gcloud monitoring dashboards create --config-from-file=...`. Not recommended until the metric set has been live-validated against real traffic.

---

## 3. Dashboard Target

**Primary target**: Cloud Monitoring Dashboard
- URL: https://console.cloud.google.com/monitoring/dashboards?project=story-gen-8a769
- Dashboard name (recommended): `EhonAI Generation SLO`
- Refresh interval: 1 minute (matches CG-1 alignment window)
- Default time range: Last 24 hours

**Secondary (future)**: Admin UI dashboard in `src/app/admin/slo/`
- Already populated by `functions/src/lib/slo-metrics.ts` (daily/weekly snapshots from Firestore)
- This is complementary; Cloud Monitoring dashboard handles real-time signals, Admin UI handles trend.

---

## 4. Layout Overview

Recommended ordering (top to bottom on the dashboard):

| Row | Group | Panels |
|---|---|---|
| 1 | **CG (highest severity)** | 1. CG-1 candidateAllowed count |
| 2 | **OUT (UX outcome)** | 2. OUT-1 book outcomes by status |
| 3 | **SJ (story JSON quality)** | 3. SJ-1 schema_validation, 4. SJ-2 malformed_json, 5. SJ-3 field_type_mismatch |
| 4 | **IM (image generation)** | 6. IM-1 page failures by error code |
| 5 | **LAT (latency)** | 7. LAT-1 storyDurationMs p95/p99 |
| 6 | **DQ (data quality)** | 8. DQ-1 generation_event volume |
| 7 | **Optional** | 9. Repair retry signals, 10. Candidate profile by resolvedImageModelProfile |

CG-1 is placed first because any positive value is a CRITICAL incident.

---

## 5. Panel Definitions

### Panel 1 — CG-1 candidateAllowed count

| Property | Value |
|---|---|
| **Group** | CG |
| **Metric** | `logging.googleapis.com/user/generation/candidate_allowed` |
| **Live** | ✅ YES — metric exists |
| **Chart type** | Scorecard (current 24h sum) + secondary time series sparkline |
| **Aggregation** | `ALIGN_DELTA` over 60s, `REDUCE_SUM` cross-series |
| **Threshold** | `> 0` = CRITICAL (alert fires immediately) |
| **Color** | Red when > 0; gray when 0 |
| **Linked saved query** | `CG-1 candidateAllowed true` |
| **Linked alert policy** | `projects/story-gen-8a769/alertPolicies/16928978327782001994` |
| **Linked runbook** | `docs/GENERATION_SLO_RUNBOOK.md §8.5` |
| **Expected normal value** | **0** in all windows unless deliberate enrollment is active |

---

### Panel 2 — OUT-1 book outcomes by status

| Property | Value |
|---|---|
| **Group** | OUT |
| **Metrics** | `generation/book_outcomes_total`, `generation/book_outcome_completed`, `generation/book_outcome_partial_completed`, `generation/book_outcome_failed` |
| **Live** | ⬜ Defined only — live creation pending |
| **Chart type** | Stacked time series (1h aligned) or stacked bar |
| **Aggregation** | `ALIGN_RATE` per metric, stacked by metric name |
| **Threshold** | Readable rate `(completed + partial_completed) / total` < 98% = WARNING; < 95% = CRITICAL |
| **Linked saved query** | `OUT-1 book outcomes`, `OUT-2 failed or partial outcomes` |
| **Linked runbook** | `docs/GENERATION_SLO_RUNBOOK.md §8.1–§8.4` |
| **Threshold reference** | `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2.1` |

---

### Panel 3 — SJ-1 schema_validation failures

| Property | Value |
|---|---|
| **Group** | SJ |
| **Metric** | `logging.googleapis.com/user/generation/schema_validation_failures` |
| **Live** | ⬜ Defined only |
| **Chart type** | Time series count (1h aligned) |
| **Desired overlay** | If supported by Cloud Monitoring, overlay as rate vs `book_outcomes_total` |
| **Threshold** | > 5% of early failures = WARNING; > 10% = CRITICAL |
| **Linked saved query** | `SJ-1 schema_validation failures`, `SJ-4 story JSON parse diagnostics` |
| **Linked alert** | SJ-1 / SJ-2 (pending P2-10b) |
| **Threshold reference** | `docs/GENERATION_SLO_THRESHOLD_POLICY.md §4` |

---

### Panel 4 — SJ-2 malformed_json failures

| Property | Value |
|---|---|
| **Group** | SJ |
| **Metric** | `logging.googleapis.com/user/generation/malformed_json_failures` |
| **Live** | ⬜ Defined only |
| **Chart type** | Time series count (1h aligned) |
| **Threshold** | > 2% of early failures = WARNING |
| **Linked saved query** | `SJ-2 malformed_json failures` |
| **Linked alert** | SJ-3 (pending P2-10b) |

---

### Panel 5 — SJ-3 field_type_mismatch failures

| Property | Value |
|---|---|
| **Group** | SJ |
| **Metric** | `logging.googleapis.com/user/generation/field_type_mismatch_failures` |
| **Live** | ⬜ Defined only |
| **Chart type** | Time series count (1h aligned) |
| **Threshold** | > 1% of early failures = WARNING |
| **Linked saved query** | `SJ-3 field_type_mismatch failures` |
| **Linked alert** | SJ-4 (pending P2-10b) |
| **Operational note** | New patterns observed here should trigger targeted prompt enhancements (PRODUCT_ROADMAP "on-demand" task) |

---

### Panel 6 — IM-1 page failures by error code

| Property | Value |
|---|---|
| **Group** | IM |
| **Metrics** | `generation/page_failures_total`, `generation/page_e005_failures`, `generation/page_timeout_failures`, `generation/page_provider5xx_failures` |
| **Live** | ⬜ Defined only |
| **Chart type** | Stacked time series (1h aligned) or grouped count by error code |
| **Aggregation** | `ALIGN_RATE` per metric, grouped by metric name |
| **Threshold** | Per `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2.2`: E005 > 10% WARNING / > 30% CRITICAL; TIMEOUT > 25% WARNING / > 50% CRITICAL; PROVIDER_5XX > 3 events/1h WARNING |
| **Linked saved query** | `IM-1 page image failures`, `IM-2 E005`, `IM-3 TIMEOUT`, `IM-4 PROVIDER_5XX` |
| **Linked alert** | IM-1 through IM-9 (pending P2-10b) |
| **Linked runbook** | `docs/GENERATION_SLO_RUNBOOK.md §8.2–§8.3` |

---

### Panel 7 — LAT-1 storyDurationMs p95/p99

| Property | Value |
|---|---|
| **Group** | LAT |
| **Metric** | `logging.googleapis.com/user/generation/story_duration_ms` (Distribution type) |
| **Live** | ⬜ Defined only |
| **Chart type** | Line chart with p95 and p99 series |
| **Aggregation** | `ALIGN_PERCENTILE_95` and `ALIGN_PERCENTILE_99` over 1h |
| **Threshold** | p95 > 120s = WARNING; p95 > 180s = CRITICAL; p99 > 200s = CRITICAL |
| **Linked saved query** | `LAT-1 story duration over 120s`, `LAT-2 story duration over 180s` |
| **Linked alert** | SJ-5 / SJ-6 (pending P2-10b) |
| **Linked runbook** | `docs/GENERATION_SLO_RUNBOOK.md §8.4` |
| **SLO target** | P4-15: p95 ≤ 120s |

---

### Panel 8 — DQ-1 generation_event volume

| Property | Value |
|---|---|
| **Group** | DQ |
| **Source** | Log-based count of `jsonPayload.message="generation_event"` events (no dedicated metric required; use built-in log-based count) |
| **Chart type** | Time series count (1h aligned) |
| **Purpose** | Detect missing logs or instrumentation gap. Sudden drops to zero indicate logger/deploy regression. |
| **Threshold** | No fixed numeric threshold; alert is comparative (drop > 50% vs prior 24h baseline) |
| **Linked saved query** | `DQ-1 generation events missing bookId` (companion view for schema drift) |
| **Operational note** | Pair with weekly `report-generation-slo.mjs` output for cross-validation |

---

### Optional Panel 9 — Repair retry signals

| Property | Value |
|---|---|
| **Group** | Optional |
| **Metric** | `logging.googleapis.com/user/generation/story_generation_attempts` |
| **Live** | ⬜ Defined only |
| **Chart type** | Time series count or scorecard |
| **Expected current value** | **0** — `ENABLE_SCHEMA_REPAIR_RETRY` is OFF in production |
| **Action if non-zero** | Verify `ENABLE_SCHEMA_REPAIR_RETRY` flag state; non-zero without flag enable indicates a logic regression |
| **Operational note** | This panel becomes meaningful only after the prod-baseline → repair retry enable decision (PRODUCT_ROADMAP "本番稼働後") |

---

### Optional Panel 10 — Candidate profile by resolvedImageModelProfile

| Property | Value |
|---|---|
| **Group** | Optional |
| **Metric** | `generation/candidate_allowed`, grouped by label `resolved_image_model_profile` |
| **Live** | ✅ Metric exists; label extraction requires re-creating the metric with label extractors (see `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §3.1`) |
| **Chart type** | Stacked bar grouped by `resolved_image_model_profile` |
| **Purpose** | If CG-1 fires, immediately identifies which candidate profile leaked (openai_i2, openai_i3, etc.) |
| **Linked saved query** | `CG-1 candidate generation context` |
| **Caveat** | Current live metric was created without label extractors. Re-creating to add labels requires deleting and recreating the metric; defer until needed. |

---

## 6. Dashboard Usage Guide

### Normal review (weekly)

1. Open dashboard, set time range to **Last 7 days**
2. Verify Panel 1 (CG-1) reads `0` for the entire window
3. Verify Panel 2 (OUT) readable rate ≥ 98%
4. Spot-check Panels 3–6 for any unusual spikes
5. Confirm Panel 7 (LAT p95) ≤ 120s
6. Cross-reference with `node scripts/report-generation-slo.mjs --input tmp/events.json --format console`

### Active incident triage

1. Identify the alerting signal on the dashboard (which panel is red?)
2. Click the panel to expand
3. Use the linked saved query (P2-8) to inspect raw `generation_event` logs
4. Follow the linked runbook section (`docs/GENERATION_SLO_RUNBOOK.md §8.x`)
5. For CG-1 specifically: incident is CRITICAL; follow `§8.5` immediately

### Manual fallback (no Cloud Console access)

```bash
node scripts/_export-cloud-logging.mjs --out tmp/events.json --days 1 --project story-gen-8a769
node scripts/report-generation-slo.mjs --input tmp/events.json --format console
```

---

## 7. Live Creation Procedure (when approved)

Steps to create the live Cloud Monitoring dashboard from this spec:

1. **Verify metrics exist**: All 8–15 log-based metrics referenced above must be live in Cloud Monitoring. Currently only `generation/candidate_allowed` is live. Create the rest using commands in `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §4`.
2. **Required IAM**: Operator needs `roles/monitoring.dashboardEditor`.
3. **Cloud Console UI**: https://console.cloud.google.com/monitoring/dashboards?project=story-gen-8a769 → **Create dashboard**
4. **Add widgets** for each panel in order (§4 layout)
5. **Save** with name `EhonAI Generation SLO`
6. **Verify** by opening the dashboard and confirming the CG-1 panel reads 0

REST API alternative:
```
POST https://monitoring.googleapis.com/v1/projects/story-gen-8a769/dashboards
```
Body: dashboard JSON per Cloud Monitoring Dashboard schema.

---

## 8. Implementation Status

| Action | Status | Notes |
|---|---|---|
| Panel definitions (8 required + 2 optional) | ✅ COMPLETE (docs, 2026-05-21) | This document §5 |
| Dashboard usage guide | ✅ COMPLETE | §6 |
| Live Cloud Monitoring dashboard | ⬜ NOT CREATED | Manual creation per §7 when approved |
| Required log-based metrics | ⬜ 1 of 15 live | Only `candidate_allowed`; remaining 14 pending |
| SJ/IM alert policies | ⬜ NOT YET | Pending P2-10b |

---

## 9. References

| Document | Purpose |
|---|---|
| `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` | All 15 metric definitions referenced by panels |
| `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` | Saved queries linked from each panel |
| `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` | CG-1 live alert policy spec |
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §3` | All alert candidate thresholds |
| `docs/GENERATION_SLO_RUNBOOK.md §8` | Per-signal incident playbooks |
| `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2–§4` | Severity thresholds for each metric |
| `scripts/report-generation-slo.mjs` | Manual SLO report fallback |
| `functions/src/lib/slo-metrics.ts` | Firestore SLO snapshot (Admin UI source) |
