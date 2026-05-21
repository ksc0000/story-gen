# P2 Production Monitoring Readiness

**Task**: P2-production-readiness  
**Created**: 2026-05-21  
**Status**: READY FOR FIRST PRODUCTION TRAFFIC  
**Scope**: Docs-only. No live resources created or modified.

---

## 1. Current Status

| Item | State |
|---|---|
| Monitoring readiness | ✅ **READY FOR FIRST PRODUCTION TRAFFIC** |
| CG-1 alert (CRITICAL) | ✅ **LIVE — enabled: true** |
| SJ/IM alert policies | ⏸ **LIVE — intentionally disabled** |
| Generation SLO Dashboard | ✅ **LIVE** |
| `story_duration_ms` distribution metric | ✅ **LIVE** |
| prod-baseline attempt | ⚠️ **ATTEMPTED (2026-05-21) — INSUFFICIENT DATA** |
| Required production baseline | ⏳ Pending ≥ 30 `book_outcome` events from real users |

### prod-baseline summary

| Detail | Value |
|---|---|
| Measurement window | 2026-05-14 – 2026-05-21 (7 days) |
| Total entries exported | 80 |
| `generation_started` | 40 |
| `book_outcome` | 19 (< 30-event threshold — **dev/test only**) |
| `book_early_failed` | 21 |
| Data verdict | Same dataset as P4-16-baseline; no production user traffic yet |

See `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7.3 for full measurement record.

---

## 2. Live Resources

### Cloud Monitoring resources

| Resource | Name / ID | State |
|---|---|---|
| **CG-1 log-based metric** | `logging.googleapis.com/user/generation/candidate_allowed` | ✅ LIVE |
| **CG-1 alert policy** | `projects/story-gen-8a769/alertPolicies/16928978327782001994` | ✅ LIVE — `enabled: true` |
| **Email notification channel** | `projects/story-gen-8a769/notificationChannels/202814648286910376` (kikushun0529@gmail.com) | ✅ LIVE |
| **Generation SLO Dashboard** | `projects/story-gen-8a769/dashboards/39c916aa-ea17-4487-80e1-9c81e47cee3b` | ✅ LIVE |
| **`story_duration_ms` distribution metric** | `logging.googleapis.com/user/generation/story_duration_ms` | ✅ LIVE |
| **SJ log-based metrics (3)** | `schema_validation_failures`, `malformed_json_failures`, `field_type_mismatch_failures` | ✅ LIVE |
| **IM log-based metrics (6)** | `book_outcomes_total`, `book_outcome_failed`, `page_failures_total`, `page_e005_failures`, `page_timeout_failures`, `page_provider5xx_failures` | ✅ LIVE |
| **SJ alert policies (SJ-1..SJ-4)** | 4 policies | ✅ LIVE — `enabled: false` |
| **IM alert policies (IM-1..IM-9)** | 9 policies | ✅ LIVE — `enabled: false` |

**Dashboard URL** (Cloud Console):  
https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769

### Dashboard panels

| Panel | Group | What it shows |
|---|---|---|
| 1 | CG | CG-1 candidateAllowed count (scorecard + sparkline) |
| 2 | OUT | Book outcomes by status (stacked area) |
| 3 | SJ | schema_validation failures (line) |
| 4 | SJ | malformed_json failures (line) |
| 5 | SJ | field_type_mismatch failures (line) |
| 6 | IM | Page failures by error code (stacked area) |
| 7 | LAT | storyDurationMs p95 / p99 XY chart — thresholds at 120,000ms / 180,000ms |
| 8 | DQ | generation_event volume proxy |

### Saved Cloud Logging queries (docs config, manual import)

15 queries are defined in `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`.  
Import to Cloud Console manually (Log Explorer → Saved queries → Create).

| Group | Query names |
|---|---|
| CG | CG-1 candidateAllowed true; CG-1 candidate generation context |
| SJ | SJ-1 schema_validation failures; SJ-2 malformed_json; SJ-3 field_type_mismatch; SJ-4 storyJsonParseDiagnostics |
| IM | IM-1 page image failures; IM-2 E005; IM-3 TIMEOUT; IM-4 PROVIDER_5XX |
| OUT | OUT-1 book outcomes; OUT-2 failed or partial |
| LAT | LAT-1 storyDurationMs > 120s; LAT-2 storyDurationMs > 180s |
| DQ | DQ-1 generation events missing bookId |

### Generation SLO scripts

| Script | Purpose |
|---|---|
| `scripts/_export-cloud-logging.mjs` | Export `generation_event` log entries to JSON file |
| `scripts/report-generation-slo.mjs` | Compute SLO metrics from exported JSON; output markdown or JSON |

---

## 3. Disabled by Design

The following items are intentionally inactive until a production baseline is established.

### Feature flags — permanently OFF

| Flag | Current Value | Why |
|---|---|---|
| `ENABLE_RESPONSE_SCHEMA` | OFF / absent | Gemini responseSchema rollout was abandoned (P4 closure). Re-enabling risks regression; JSON extraction path (`extractJsonFromLLMResponse`) is the permanent path. |
| `RESPONSE_SCHEMA_MODE` | OFF / absent | Same as above — companion flag for `ENABLE_RESPONSE_SCHEMA`. |
| `ENABLE_SCHEMA_REPAIR_RETRY` | OFF / absent | Decision deferred until production baseline shows schema_validation rate in steady state. Dev/test data (45% rate) is unrepresentative. See `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §5 for decision criteria. |

### Alert policies — live but disabled

| Policy group | Policies | Why disabled |
|---|---|---|
| **SJ-1..SJ-4** (Story JSON alerts) | 4 policies | Thresholds are calibrated to expected production volume (≈ 60 books/day). Without a production baseline, false-positive rate is unknown. Enable after ≥ 30 `book_outcome` events confirm steady-state rates. |
| **IM-1..IM-9** (Image generation alerts) | 9 policies | Same reason — no production page failure data to calibrate against. Enable together with SJ policies after baseline. |

> To verify current state: `gcloud monitoring policies list --project=story-gen-8a769 --format="table(displayName,enabled)"`

---

## 4. Alert Thresholds Reference

Once enabled (post-baseline), these are the configured thresholds for SJ/IM policies.

### Story JSON alerts (SJ)

| Policy | Condition | Severity |
|---|---|---|
| **SJ-1** | `schema_validation` failures > 5% of `book_early_failed` / 24h | WARNING |
| **SJ-2** | `schema_validation` failures > 10% of `book_early_failed` / 24h | CRITICAL |
| **SJ-3** | `malformed_json` failures > 2% of `book_early_failed` / 24h | WARNING |
| **SJ-4** | `field_type_mismatch` failures > 1% of `book_early_failed` / 24h | WARNING |

### Image generation alerts (IM)

| Policy | Condition | Severity |
|---|---|---|
| **IM-1** | Readable rate (`book_outcome`) < 98% / 24h | WARNING |
| **IM-2** | Readable rate (`book_outcome`) < 95% / 24h | CRITICAL |
| **IM-3** | E005 page failures > 10% of `page_image_failed` / 24h | WARNING |
| **IM-4** | E005 page failures > 30% of `page_image_failed` / 24h | CRITICAL |
| **IM-5** | TIMEOUT page failures > 25% of `page_image_failed` / 24h | WARNING |
| **IM-6** | TIMEOUT page failures > 50% of `page_image_failed` / 24h | CRITICAL |
| **IM-7** | PROVIDER_5XX page failure ≥ 1 | INFO |
| **IM-8** | PROVIDER_5XX failures > 3 events / 1h | WARNING |
| **IM-9** | `page_image_failed` spike > 5 events / 1h | WARNING |

### Candidate gate alert (CG — active now)

| Policy | Condition | Severity |
|---|---|---|
| **CG-1** | `candidateAllowed=true` on any `generation_started` event | CRITICAL |

CG-1 fires immediately and sends email to kikushun0529@gmail.com. Investigate any trigger — a user must be explicitly enrolled as a candidate before this is legitimate.

---

## 5. SLO Targets

| Metric | Target | Investigate | Alert |
|---|---|---|---|
| Book readable rate | ≥ 98% | < 98% | < 95% |
| Book hard failure rate | ≤ 2% | > 2% | > 5% |
| schema_validation failure rate | ≤ 2% | > 2% | > 5% |
| malformed_json rate | ≤ 1% | > 1% | > 2% |
| field_type_mismatch rate | ≤ 0.5% | > 0.5% | > 1% |
| storyDurationMs p95 | ≤ 120s | > 120s | > 180s |
| storyDurationMs p99 | ≤ 200s | > 200s | > 300s |
| Image failed rate | ≤ 2% | > 2% | > 5% |
| Page regeneration success | ≥ 95% | < 95% | < 90% |

---

## 6. First Production Traffic Procedure

When the first real production users generate books, follow this checklist in order.

### 6.1 Immediate checks (within 1 hour of first books)

- [ ] Open Generation SLO Dashboard:  
  https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769
- [ ] Panel 1 (CG-1): Confirm value = **0**. Any non-zero value → investigate immediately (email alert will fire automatically).
- [ ] Panel 2 (OUT-1): Confirm `book_outcomes_total` begins incrementing. Confirm no `book_outcome_failed` entries appear.
- [ ] Panel 7 (LAT-1): Confirm storyDurationMs p95 is below the 120,000ms threshold line.
- [ ] Panel 6 (IM-1): Confirm no page failure spikes on first books.

### 6.2 If dashboard shows anomalies

Run the appropriate saved query in Cloud Console Log Explorer (Log Explorer → Saved queries). Use CG/SJ/IM/OUT/LAT query groups as appropriate. See `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` for full query definitions.

**Do not** enable SJ/IM alert policies based on first-book anomalies — sample size is too small.  
**Do not** enable `ENABLE_SCHEMA_REPAIR_RETRY` even if schema_validation failures appear.

### 6.3 Do not do (regardless of observations)

- Do NOT enable `ENABLE_RESPONSE_SCHEMA`, `RESPONSE_SCHEMA_MODE`, or `ENABLE_SCHEMA_REPAIR_RETRY`.
- Do NOT enable SJ/IM alert policies (wait for ≥ 30 `book_outcome` events — see §7).
- Do NOT deploy Firebase Functions or Hosting.
- Do NOT change prompts, fallback order, or ImageProvider routing.

---

## 7. Baseline Rerun Procedure

Once ≥ 30 real production `book_outcome` events have accumulated:

### Step 1: Export Cloud Logging data

```powershell
$env:HTTPS_PROXY = 'http://proxy.hq.melco.co.jp:9515'
node scripts/_export-cloud-logging.mjs --out tmp/prod-baseline-events.json --days 7
```

### Step 2: Run SLO report

```powershell
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format markdown
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format json > tmp/prod-baseline-report.json
```

### Step 3: Evaluate

Check the report output against SLO targets in §5.  
Specifically, evaluate the `ENABLE_SCHEMA_REPAIR_RETRY` decision criteria in `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §5.3:

| Criterion | Threshold | Action if exceeded |
|---|---|---|
| schema_validation rate | > 5% of total books | Evaluate enabling repair retry |
| malformed_json rate | > 2% of total books | Evaluate enabling repair retry |
| field_type_mismatch rate | > 1% of total books | Evaluate enabling repair retry |
| storyDurationMs p95 (book_outcome) | > 120s | Investigate story generation latency |

### Step 4: Confirm ≥ 30 book_outcome events

```powershell
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format json |
  ConvertFrom-Json | Select-Object -ExpandProperty outcome | Select-Object total
```

If `total` ≥ 30, the production baseline is valid. Proceed to §8.

### Step 5: Update docs

- Add §7.4 to `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` with production baseline metrics.
- Update `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` §3.2 baseline note.
- Update `docs/PRODUCT_ROADMAP.md` prod-baseline row status.

### Step 6: Delete temp files

```powershell
Remove-Item tmp\prod-baseline-events.json
Remove-Item tmp\prod-baseline-report.json
```

---

## 8. P2-10b-enable Procedure (post-baseline only)

After confirming a valid production baseline (≥ 30 `book_outcome` events, steady-state rates within SLO):

1. Review SJ/IM alert policy thresholds in `docs/P2_SJ_IM_ALERT_POLICIES.md`.
2. Tune `thresholdValue` in each policy YAML if production rates differ significantly from the dev/test baseline.
3. Enable policies one group at a time:
   - Enable SJ policies first (story JSON quality).
   - Observe for 24h, then enable IM policies.
4. Update `docs/P2_SJ_IM_ALERT_POLICIES.md` with enable date and final threshold values.

> **Decision gate**: Do not enable any SJ/IM policies until the production baseline shows schema_validation rate is < 5% steady-state. The dev/test rate of 45% is anomalous and must not be used to calibrate thresholds.

---

## 9. Operations References

| Document | Purpose |
|---|---|
| `docs/GENERATION_SLO_RUNBOOK.md` | Operator runbook: log collection, SLO report, incident playbooks |
| `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` | Permanent safety stack, §5 repair-retry criteria, §7 baseline history |
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` | Alert policy definitions, recommended ordering |
| `docs/P2_SJ_IM_ALERT_POLICIES.md` | SJ/IM policy YAML and enable procedure |
| `docs/P2_GENERATION_SLO_DASHBOARD_PANELS.md` | Dashboard panel spec and usage guide |
| `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` | 15 saved Cloud Logging query definitions |
| `docs/PHASE2_GENERATION_SLO_PLAN.md` | Full P2 task history and completion status |
| `docs/PRODUCT_ROADMAP.md` | Roadmap rows: prod-baseline, P2-10b-enable |

---

*Last updated: 2026-05-21 (P2-production-readiness)*
