# P2 Generation SLO Alert Automation Plan

**Status**: 📋 PLAN COMPLETE — P2-9 metric definitions complete; P2-10 CG-1 policy definition complete; live metric/policy creation pending  
**Created**: 2026-05-21  
**Task**: P2-7 (SLO Alert Automation, post-P4 closure)  
**Preceding work**: P4-17 (Phase 4 Gemini JSON hardening closure), P2-6 (report-generation-slo.mjs)  
**References**:
- `docs/GENERATION_SLO_THRESHOLD_POLICY.md` — severity thresholds
- `docs/PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md` — P4 closure, story JSON SLO baselines
- `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` — story JSON SLO definitions and §7.2 baseline
- `docs/GENERATION_SLO_RUNBOOK.md` — operational response procedures
- `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` — P2-9 metric definitions (YAML configs, gcloud commands)
- `scripts/report-generation-slo.mjs` — manual SLO report tool (current operational baseline)
- `scripts/_export-cloud-logging.mjs` — manual Cloud Logging export helper

---

## 1. Objective

Design a Cloud Logging + Cloud Monitoring based alert system for generation SLO observability.  
This is a **docs-only plan**; no alert policies are live yet. Live implementation follows P2-8 through P2-12.

### Goals

- Detect schema_validation / malformed_json / field_type_mismatch spikes within one review cycle
- Alert on page image SLO degradation (E005, TIMEOUT, PROVIDER_5XX)
- Alert on candidate gate leak (`candidateAllowed` non-zero without enrollment) immediately
- Detect story generation latency (storyDurationMs) exceeding P4-15 SLO thresholds
- Provide manual fallback procedure until automation is live

### Non-Goals

- **No code path changes** — no changes to generate-book.ts, replicate.ts, or any generation logic
- **No generation behavior changes** — no prompt/retry/routing modifications
- **No model provider changes** — Replicate remains production default; OpenAI remains candidate-only
- **No ENABLE_RESPONSE_SCHEMA activation** — follow P4-15 §5 criteria before enabling
- **No ENABLE_SCHEMA_REPAIR_RETRY activation** — follow P4-15 §5 criteria based on production data
- **No Firebase Hosting or Functions deploy** in this task
- **No live Cloud Monitoring alert policies** created in this task (P2-9/P2-10 only)

---

## 2. Current Observability Inputs

### 2.1 Cloud Logging structured events

All generation events are written as `generation_event` log entries by `functions/src/lib/generation-event-logger.ts`.

| Event name | Emitted when | Key alert-relevant fields |
|---|---|---|
| `generation_started` | Before story generation | `candidateAllowed`, `candidateDecision`, `resolvedImageModelProfile` |
| `book_early_failed` | Gemini/schema failure before page generation | `failureStage`, `storyJsonFailureCategory`, `storyDurationMs`, `errorCategory` |
| `book_outcome` | After all pages processed | `bookStatus`, `totalPages`, `completedPages`, `failedPages`, `durationMs` |
| `page_image_failed` | After all image fallbacks exhausted | `errorCode`, `provider`, `primaryProfile`, `fallbackUsed`, `attemptCount` |

Global filter for all generation events:
```
jsonPayload.message="generation_event"
```

### 2.2 Existing SLO report tooling (manual, P2-6)

```bash
# Export from Cloud Logging (proxy-aware, no gcloud required)
node scripts/_export-cloud-logging.mjs --out tmp/events.json --days 7 --project story-gen-8a769

# Compute SLO report with full breakdowns
node scripts/report-generation-slo.mjs --input tmp/events.json --format console
```

Report output includes: story JSON failure categories, storyDurationMs percentiles, repair retry signals, page image SLOs.

### 2.3 Firestore-based SLO dashboard (Admin UI)

`functions/src/lib/slo-metrics.ts` is saved daily (03:00 JST via `save-daily-slo-snapshot.ts`) and weekly.  
Metrics: `bookReadableRate`, `bookHardFailedRate`, `pageImageFailureRate`, `fallbackRate`, `timeoutRate`, `imageP50/P90/P95`, `regenerationSuccessRate`.

This is a **complementary signal** — Cloud Logging alerts provide faster detection; Firestore snapshots provide weekly trend.

---

## 3. Alert Candidates

### 3.1 Severity levels

| Level | Response SLA | Action |
|---|---|---|
| INFO | Informational only | No action required; visible in log explorer |
| WARNING | Within 4h (business hours) | Run manual SLO report; review trend |
| CRITICAL | Within 1h (any hour) | Treat as active incident; follow RUNBOOK §8 |

### 3.2 Story JSON quality alerts (from P4-15 SLOs)

> Baseline: dev/test only (P4-15 §7.2). Production baseline pending.

| Alert ID | Condition | Window | Severity | Cloud Logging Filter |
|---|---|---|---|---|
| **SJ-1** | `schema_validation` count > 5% of `book_early_failed` | 24h rolling | WARNING | See §3.5.1 |
| **SJ-2** | `schema_validation` count > 10% of `book_early_failed` | 24h rolling | CRITICAL | See §3.5.1 |
| **SJ-3** | `malformed_json` count > 2% of `book_early_failed` | 24h rolling | WARNING | See §3.5.2 |
| **SJ-4** | `field_type_mismatch` count > 1% of `book_early_failed` | 24h rolling | WARNING | See §3.5.3 |
| **SJ-5** | `storyDurationMs` > 180,000ms on `book_early_failed` events | Per event | WARNING | See §3.5.4 |
| **SJ-6** | `storyDurationMs` > 200,000ms on `book_early_failed` events | Per event | CRITICAL | See §3.5.4 |

> **SJ-1/SJ-2 note**: `schema_validation` captures all Gemini response schema issues. At dev/test baseline 45% of early failures had schema_validation causes — this is unrepresentative. Watch Watch vs Incident thresholds from `GENERATION_SLO_THRESHOLD_POLICY.md §4`.

> **Sample size**: Per `GENERATION_SLO_THRESHOLD_POLICY.md §5`, do NOT trigger rate-based alerts below 10 `book_outcome` events. Rate alerts are directional only below 30 events.

### 3.3 Image generation alerts

| Alert ID | Condition | Window | Severity | Cloud Logging Filter |
|---|---|---|---|---|
| **IM-1** | book readable rate < 98% | 24h rolling | WARNING | See §3.5.5 |
| **IM-2** | book readable rate < 95% | 24h rolling | CRITICAL | See §3.5.5 |
| **IM-3** | E005 rate > 10% of `page_image_failed` | 24h rolling | WARNING | See §3.5.6 |
| **IM-4** | E005 rate > 30% of `page_image_failed` | 24h rolling | CRITICAL | See §3.5.6 |
| **IM-5** | TIMEOUT rate > 25% of `page_image_failed` | 24h rolling | WARNING | See §3.5.7 |
| **IM-6** | TIMEOUT rate > 50% of `page_image_failed` | 24h rolling | CRITICAL | See §3.5.7 |
| **IM-7** | PROVIDER_5XX count ≥ 1 | Per event | INFO | See §3.5.8 |
| **IM-8** | PROVIDER_5XX sustained (> 3 events / 1h) | 1h rolling | WARNING | See §3.5.8 |
| **IM-9** | `page_image_failed` spike (> 5 events / 1h) | 1h rolling | WARNING | See §3.5.9 |

### 3.4 Candidate gate alert (always CRITICAL)

| Alert ID | Condition | Window | Severity | Cloud Logging Filter |
|---|---|---|---|---|
| **CG-1** | `candidateAllowed=true` without deliberate enrollment | Per event | CRITICAL | See §3.5.10 |

> Per `GENERATION_SLO_THRESHOLD_POLICY.md §3.4`, `candidateAllowed` non-zero without enrollment is always Incident regardless of sample size.

### 3.5 SLO data quality alerts

| Alert ID | Condition | Window | Severity | Cloud Logging Filter |
|---|---|---|---|---|
| **DQ-1** | No `generation_event` logs received (if production active) | 6h | WARNING | See §3.5.11 |
| **DQ-2** | `book_early_failed` without `storyJsonFailureCategory` (schema drift) | Per event | WARNING | See §3.5.12 |

---

## 4. Cloud Logging Filters Reference

These filters are ready to paste into Cloud Logging > Log Explorer or `_export-cloud-logging.mjs`.

### 4.1 SJ-1 / SJ-2: schema_validation failures
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.failureStage="schema_validation"
```

### 4.2 SJ-3: malformed_json failures
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="malformed_json"
```

### 4.3 SJ-4: field_type_mismatch failures
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="field_type_mismatch"
```

### 4.4 SJ-5 / SJ-6: storyDurationMs latency threshold
```
jsonPayload.message="generation_event"
AND (jsonPayload.eventName="book_early_failed" OR jsonPayload.eventName="book_outcome")
AND jsonPayload.storyDurationMs>180000
```

Replace `180000` with `200000` for SJ-6 (CRITICAL threshold).

### 4.5 IM-1 / IM-2: book readable rate (proxy: book_outcome with failed/partial_completed)
```
# Failed books (not readable)
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
AND jsonPayload.bookStatus="failed"

# All book outcomes (denominator)
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
```

### 4.6 IM-3 / IM-4: E005 rate
```
# E005 page failures (numerator)
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="E005"

# All page failures (denominator)
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
```

### 4.7 IM-5 / IM-6: TIMEOUT rate
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="TIMEOUT"
```

### 4.8 IM-7 / IM-8: PROVIDER_5XX events
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="PROVIDER_5XX"
```

### 4.9 IM-9: page_image_failed spike
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
```

### 4.10 CG-1: candidateAllowed without enrollment
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="generation_started"
AND jsonPayload.candidateAllowed=true
```

> In normal production, `candidateAllowed` should always be `false` unless an operator has explicitly enrolled a user. Any `true` result without a deliberate enrollment action is a CRITICAL incident.

### 4.11 DQ-1: No generation events (data quality)
```
# Expected: > 0 results in 6h if production is active
jsonPayload.message="generation_event"
```

### 4.12 DQ-2: book_early_failed without storyJsonFailureCategory (schema drift)
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND NOT jsonPayload.storyJsonFailureCategory:*
```

---

## 5. Cloud Monitoring Log-Based Metric Definitions (P2-9)

> These metrics are not yet created. Definition reference for P2-9 implementation.

| Metric name | Log filter | Metric type | Labels |
|---|---|---|---|
| `generation/schema_validation_failures` | §4.1 filter | Counter | `templateId`, `creationMode` |
| `generation/malformed_json_failures` | §4.2 filter | Counter | `templateId` |
| `generation/field_type_mismatch_failures` | §4.3 filter | Counter | `templateId` |
| `generation/book_outcome_failed` | §4.5 (failed filter) | Counter | `templateId`, `creationMode` |
| `generation/book_outcomes_total` | §4.5 (all outcomes) | Counter | `templateId`, `creationMode` |
| `generation/page_e005_failures` | §4.6 E005 filter | Counter | `imageModelProfile` |
| `generation/page_timeout_failures` | §4.7 filter | Counter | `imageModelProfile` |
| `generation/page_provider5xx_failures` | §4.8 filter | Counter | `provider` |
| `generation/page_failures_total` | §4.9 filter | Counter | `provider` |
| `generation/candidate_allowed` | §4.10 filter | Counter | `resolvedImageModelProfile` |

### Distribution metric (for latency)

| Metric name | Log filter | Value extractor | Labels |
|---|---|---|---|
| `generation/story_duration_ms` | `eventName="book_early_failed" OR eventName="book_outcome"` | `jsonPayload.storyDurationMs` | `creationMode` |

> Distribution metric enables p95/p99 alerting in Cloud Monitoring without requiring client-side percentile computation.

---

## 6. Alert Policy Configuration (P2-10)

> Alert policies are not yet created. Configuration reference for P2-10 implementation.

### Alert policy approach

Use Cloud Monitoring MQL (Monitoring Query Language) or metrics-based alerting on log-based metrics defined in §5.

**Recommended project**: `story-gen-8a769`  
**Notification channels** (to be configured in P2-12): email (operator), PagerDuty or similar (CRITICAL only)

### Sample policy definition: SJ-1 (schema_validation spike)

```yaml
# Cloud Monitoring alert policy definition (YAML reference — not yet deployed)
displayName: "generation/schema_validation_failures spike (SJ-1)"
conditions:
  - displayName: "schema_validation failure count > threshold"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/schema_validation_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 3          # ~5% of 60 books/day = 3 events/day threshold
      duration: 3600s            # sustained over 1 hour
      aggregations:
        - alignmentPeriod: 3600s
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_RATE
notificationChannels: [/* P2-12 */]
severity: WARNING
```

### Sample policy definition: CG-1 (candidate gate leak)

```yaml
displayName: "candidateAllowed=true without enrollment (CG-1)"
conditions:
  - displayName: "candidateAllowed is non-zero"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/candidate_allowed"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s               # fire immediately on first occurrence
notificationChannels: [/* P2-12 */]
severity: CRITICAL
```

---

## 7. Dashboard Panel Additions (P2-11)

> Dashboard panels are not yet configured. Definition reference for P2-11.

Add to the existing Admin SLO Dashboard or create a dedicated "Generation SLO — Alert Signals" dashboard.

| Panel | Metric | Chart type |
|---|---|---|
| Schema validation rate (7d) | `generation/schema_validation_failures` / `generation/book_outcomes_total` | Line |
| malformed_json / field_type_mismatch (7d) | `generation/malformed_json_failures`, `generation/field_type_mismatch_failures` | Stacked bar |
| storyDurationMs p95 (7d) | `generation/story_duration_ms` p95 | Line |
| Page image E005 rate (7d) | `generation/page_e005_failures` / `generation/page_failures_total` | Line |
| Page image TIMEOUT rate (7d) | `generation/page_timeout_failures` / `generation/page_failures_total` | Line |
| candidateAllowed events (7d) | `generation/candidate_allowed` | Counter / anomaly detector |
| Book failure rate (7d) | `generation/book_outcome_failed` / `generation/book_outcomes_total` | Line |

---

## 8. Manual Fallback Procedure (Current Operational Baseline)

Until P2-9/P2-10 alert policies are live, use this manual procedure for weekly SLO review.

```bash
# Step 1: Export Cloud Logging data (proxy-aware, no gcloud required)
node scripts/_export-cloud-logging.mjs \
  --out tmp/gen-events-$(Get-Date -Format yyyyMMdd).json \
  --days 7 \
  --project story-gen-8a769

# Step 2: Run SLO report
node scripts/report-generation-slo.mjs \
  --input tmp/gen-events-$(Get-Date -Format yyyyMMdd).json \
  --format console

# Step 3: Compare against P4-15 SLO thresholds
#   schema_validation ≤ 2% (P4-15 SLO)
#   malformed_json ≤ 1%
#   field_type_mismatch ≤ 0.5%
#   storyDurationMs p95 ≤ 120s (P4-15 SLO)
#   storyDurationMs p99 ≤ 200s
#   book readable rate ≥ 98%

# Step 4: If any threshold exceeded, follow GENERATION_SLO_RUNBOOK.md
#   §3.3 Investigate (near threshold) or §3.4 Incident (exceeded threshold)
```

**Do NOT activate `ENABLE_SCHEMA_REPAIR_RETRY`** based on dev/test data.  
Wait for production data ≥ 30 `book_outcome` events; then evaluate against P4-15 §5 criteria.

---

## 9. Do-Not-Do Rules

| Rule | Reason |
|---|---|
| Do NOT enable `ENABLE_RESPONSE_SCHEMA` | Not validated in production; P4-15 §5 criteria must be met first |
| Do NOT enable `RESPONSE_SCHEMA_MODE` | Same as above |
| Do NOT enable `ENABLE_SCHEMA_REPAIR_RETRY` | Dev/test baseline (P4-15 §7.2) is not representative; production data required |
| Do NOT use alert signals to trigger ImageProvider routing changes | Routing changes require explicit approval + smoke evidence; see RUNBOOK §4 |
| Do NOT make routing changes for `schema_validation` spikes | schema_validation is a Gemini story issue, not an image provider issue |
| Do NOT trigger rate-based severity below 10 `book_outcome` events | Per `GENERATION_SLO_THRESHOLD_POLICY.md §5.1` |
| Do NOT commit raw Cloud Logging exports | `tmp/` is gitignored; export data contains book IDs |

---

## 10. Implementation Slices (P2-8 through P2-12)

> These are **alert automation sub-slices** added after P4 closure. The original P2-1 through P2-10 are all complete; see `docs/PHASE2_GENERATION_SLO_PLAN.md §11 (Runbook) and §12–§13`.

| Slice | Title | Scope | Priority |
|---|---|---|---|
| **P2-8** | Saved Cloud Logging query definitions | ✅ COMPLETE (docs, 2026-05-21) — `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`; 15 queries (CG/SJ/IM/LAT/OUT/DQ); import to Cloud Console is manual | MEDIUM |
| **P2-9** | Cloud Monitoring log-based metric definitions | ✅ COMPLETE (2026-05-21) — `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md`; 15 metrics defined (14 required + 1 optional); live creation commands in §4 of that doc | HIGH |
| **P2-10** | Alert policies | ✅ COMPLETE (live, 2026-05-21) — CG-1 policy live + enabled in `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` | HIGH |
| **P2-11** | Dashboard panel additions | ✅ COMPLETE (live, 2026-05-21) — `docs/P2_GENERATION_SLO_DASHBOARD_PANELS.md`; 8 required + 2 optional panels; live dashboard `projects/story-gen-8a769/dashboards/39c916aa-ea17-4487-80e1-9c81e47cee3b`; LAT-1 is text placeholder | MEDIUM |
| **P2-12** | Notification routing + incident runbook integration | ✅ COMPLETE (live, 2026-05-21) — Email channel `notificationChannels/202814648286910376` (kikushun0529@gmail.com) 接続済み; CG-1 `enabled: true` | HIGH |
| **P2-10b** | SJ/IM alert policy definitions + live creation (disabled) | ✅ COMPLETE (live disabled, 2026-05-21) — `docs/P2_SJ_IM_ALERT_POLICIES.md`; 9 metrics live; 13 policies live `enabled: false`; enable after production baseline | HIGH |

### Recommended ordering

```
prod-baseline (collect ≥ 30 book_outcomes) → P2-10b-enable (tune thresholds + enable SJ/IM policies)
  ↑ P2-10b-live complete (2026-05-21) — metrics live, policies disabled
  ↑ P2-dashboard-live complete (2026-05-21) — live dashboard `dashboards/39c916aa-ea17-4487-80e1-9c81e47cee3b`
```

**P2-10b status**: 9 SJ/IM metrics live, 13 alert policies created with `enabled: false`. Policy IDs in `docs/P2_SJ_IM_ALERT_POLICIES.md §9`. Enable after production baseline ≥ 30 book_outcome events and threshold tuning (§10 of that doc).

---

## 11. References

| Document | Purpose |
|---|---|
| `docs/GENERATION_SLO_THRESHOLD_POLICY.md` | Severity threshold definitions (Watch / Investigate / Incident) |
| `docs/GENERATION_SLO_RUNBOOK.md` | Operational response procedures (§8 incident playbooks) |
| `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` | Story JSON SLO definitions; §7.2 dev/test baseline |
| `docs/PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md` | P4 closure; remaining follow-ups list |
| `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` | P2-10 CG-1 alert policy — YAML spec, gcloud commands, first-response runbook, verification steps |
| `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` | P2-9 metric definitions — YAML configs, gcloud commands, label specs |
| `docs/P2_SJ_IM_ALERT_POLICIES.md` | P2-10b SJ/IM alert policy specs — YAML, gcloud commands, first-response, threshold tuning |
| `docs/GENERATION_SLO_AUTOMATION_PLAN.md` | Earlier scheduled reporting design (P2-9 predecessor) |
| `scripts/report-generation-slo.mjs` | Manual SLO computation tool (93 self-test assertions) |
| `scripts/_export-cloud-logging.mjs` | Manual Cloud Logging export (proxy-aware, SA JWT auth) |
| `functions/src/lib/generation-event-logger.ts` | Event type definitions; all log fields |
