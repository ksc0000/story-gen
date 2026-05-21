# P2-8: Saved Cloud Logging Queries — Generation SLO Triage

**Status**: ✅ COMPLETE (docs, 2026-05-21)  
**Task**: P2-8 (Saved Cloud Logging query definitions)  
**Preceding work**: P2-12-live (CG-1 alert policy enabled with email notification)  
**References**:
- `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` — alert candidates (SJ/IM/CG/DQ), Cloud Logging filters
- `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` — metric definitions (P2-9)
- `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` — CG-1 live alert policy
- `docs/GENERATION_SLO_RUNBOOK.md` — incident response procedures
- `docs/GENERATION_SLO_THRESHOLD_POLICY.md` — thresholds and severity levels
- `functions/src/lib/generation-event-logger.ts` — event type definitions

---

## 1. Purpose

This document defines **saved Cloud Logging queries** for generation SLO triage and incident response. Using saved queries ensures:

- Repeatable triage without hand-writing filters during an incident
- Consistent query names across team members
- Quick navigation from alert → log evidence
- Coverage of all alert candidate groups (CG / SJ / IM / LAT / DQ / OUT)

**These queries are docs/config only.** They must be manually imported into Cloud Console Log Explorer (see §3) unless a Cloud Logging import tool is used. No live Cloud Monitoring resources are created by this document.

---

## 2. Scope and Current Monitoring State

| Component | Status |
|---|---|
| CG-1 alert policy | ✅ LIVE, **enabled** — `projects/story-gen-8a769/alertPolicies/16928978327782001994` |
| Email notification channel | ✅ LIVE — `notificationChannels/202814648286910376` (`kikushun0529@gmail.com`) |
| Log-based metrics (15) | ✅ Defined — `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md`; live creation requires gcloud |
| Saved queries | ✅ DEFINED in this document; import to Cloud Console is manual |
| SJ/IM alert policies | ⬜ NOT YET — pending P2-10b or separate task |
| Dashboard panels | ⬜ NOT YET — pending P2-11 |

### Saved query implementation options

**Option A (recommended — no tooling)**: Import manually via Cloud Console UI.  
**Option B**: Use Cloud Logging REST API to create saved views programmatically.  
**Option C**: Keep as reference-only; use copy-paste during triage.

This document supports all three options. The query text is identical regardless of method.

---

## 3. How to Use in Cloud Console Log Explorer

### 3.1 Opening a query

1. Navigate to: https://console.cloud.google.com/logs/query?project=story-gen-8a769
2. Paste the query filter text into the **Query** field
3. Set the time range (typically **Last 1 hour** for incident triage, **Last 24 hours** for trend review)
4. Click **Run Query**

### 3.2 Saving a query

1. Run the query as above
2. Click **Save** → **Save query**
3. Set **Name** to the exact name defined in §4 (e.g., `CG-1 candidateAllowed true`)
4. Set **Visibility** to `Project` (shared with project members) or `Personal`
5. Click **Save**

### 3.3 Accessing saved queries

- Cloud Console Log Explorer → **Saved queries** tab (left panel)
- Or navigate to: https://console.cloud.google.com/logs/saved-queries?project=story-gen-8a769

### 3.4 Time range guidelines

| Scenario | Recommended time range |
|---|---|
| CG-1 alert fired | Last 1 hour, then expand if needed |
| SJ/IM spike investigation | Last 24 hours |
| Weekly trend review | Last 7 days |
| Latency percentile audit | Last 24–48 hours |
| DQ data quality check | Last 24 hours |

---

## 4. Naming Convention

| Pattern | Meaning |
|---|---|
| `CG-N` prefix | Candidate gate queries |
| `SJ-N` prefix | Story JSON failure queries |
| `IM-N` prefix | Image generation failure queries |
| `LAT-N` prefix | Latency / duration queries |
| `OUT-N` prefix | Book outcome queries |
| `DQ-N` prefix | Data quality / missing metadata queries |

All queries use the global filter base:
```
jsonPayload.message="generation_event"
```

---

## 5. Saved Query Definitions

### Group CG — Candidate Gate

#### CG-1 candidateAllowed true

**Purpose**: Investigate CG-1 alert. Should normally return **zero results** in production unless deliberate candidate enrollment is active. Any result is a CRITICAL incident.  
**Alert reference**: CG-1 (`docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md`)  
**Runbook**: `docs/GENERATION_SLO_RUNBOOK.md §8.5`

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="generation_started"
AND jsonPayload.candidateAllowed=true
```

---

#### CG-1 candidate generation context

**Purpose**: Inspect candidate gate decision metadata around a CG-1 event. Shows all generation starts with candidate-related fields populated, useful for tracing which book/template triggered the alert.  
**First-response action**: Check `resolvedImageModelProfile` and `candidateDecision` fields to identify the leaked profile.

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="generation_started"
AND (
  jsonPayload.candidateAllowed=true
  OR jsonPayload.candidateDecision!=""
  OR jsonPayload.resolvedImageModelProfile!=""
)
```

---

### Group SJ — Story JSON Failures

#### SJ-1 schema_validation failures

**Purpose**: Count and inspect `schema_validation` failures — Gemini responses that failed JSON schema validation. At dev/test baseline these were ~45% of early failures; production rate is the SLO target.  
**Threshold reference**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md §4` (Watch > 5%, Incident > 10% of early failures)

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.failureStage="schema_validation"
```

---

#### SJ-2 malformed_json failures

**Purpose**: Inspect `malformed_json` failures — Gemini returned text that could not be parsed as JSON at all.  
**Threshold reference**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md` (Watch > 2% of early failures)

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="malformed_json"
```

---

#### SJ-3 field_type_mismatch failures

**Purpose**: Inspect `field_type_mismatch` failures — Gemini returned valid JSON with wrong field types. Useful for detecting new prompt regression patterns.  
**Threshold reference**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md` (Watch > 1% of early failures)

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="field_type_mismatch"
```

---

#### SJ-4 story JSON parse diagnostics

**Purpose**: Surface events where Gemini returned a parseable response but structural validation failed. Exposes `parseFailureKind` for detailed sub-classification.

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonParseDiagnostics.parseFailureKind!=""
```

---

### Group IM — Image Generation Failures

#### IM-1 page image failures

**Purpose**: All page image failures, regardless of error code. Starting point for image SLO investigation.  
**Alert reference**: IM-1 through IM-9 (`docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §3.3`)

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
```

---

#### IM-2 E005 page failures

**Purpose**: E005 errors (content policy / safety filter rejection from image provider). High E005 rate indicates prompt or character reference image triggering safety filters.  
**Threshold reference**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2.2` (Watch > 10%, Incident > 30% of failures)

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="E005"
```

---

#### IM-3 TIMEOUT page failures

**Purpose**: TIMEOUT errors from image provider. High rate indicates provider latency degradation.  
**Threshold reference**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2.2` (Watch > 25%, Incident > 50% of failures)

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="TIMEOUT"
```

---

#### IM-4 PROVIDER_5XX page failures

**Purpose**: Provider HTTP 5xx errors. Even a single sustained occurrence is actionable.  
**Threshold reference**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2.2`

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="PROVIDER_5XX"
```

---

### Group OUT — Book Outcomes

#### OUT-1 book outcomes

**Purpose**: All book outcome events. Use to review completion/failure/partial distribution.  
**Key fields**: `bookStatus` (`completed` / `partial_completed` / `failed`), `totalPages`, `completedPages`, `failedPages`

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
```

---

#### OUT-2 failed or partial outcomes

**Purpose**: Book outcomes where the user received a degraded or failed product. Readable rate SLO = (completed + partial_completed) / total ≥ 98%.

```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
AND (
  jsonPayload.bookStatus="failed"
  OR jsonPayload.bookStatus="partial_completed"
)
```

---

### Group LAT — Latency

#### LAT-1 story duration over 120s

**Purpose**: Story generation events where Gemini took more than 120 seconds. P4-15 SLO target is p95 ≤ 120s.  
**Alert reference**: SJ-5/SJ-6 (`docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §3.2`)

```
jsonPayload.message="generation_event"
AND (
  jsonPayload.eventName="book_outcome"
  OR jsonPayload.eventName="book_early_failed"
)
AND jsonPayload.storyDurationMs>120000
```

---

#### LAT-2 story duration over 180s

**Purpose**: Severe latency — story generation took more than 180 seconds. CRITICAL threshold.  
**Alert reference**: SJ-6 WARNING at > 180s

```
jsonPayload.message="generation_event"
AND (
  jsonPayload.eventName="book_outcome"
  OR jsonPayload.eventName="book_early_failed"
)
AND jsonPayload.storyDurationMs>180000
```

---

### Group DQ — Data Quality

#### DQ-1 generation events missing bookId

**Purpose**: Detect events where `bookId` is absent, indicating a schema drift or logging regression.  
**Note on Cloud Logging syntax**: The `NOT` form below is the recommended approach. If the Log Explorer rejects `NOT jsonPayload.bookId:*`, use the alternative form:  
`jsonPayload.bookId=""` — this matches events where bookId is an empty string.  
Events with a truly missing field will not be matched by either form; check with `NOT jsonPayload.bookId!=""` in the Cloud Console UI if needed.

```
jsonPayload.message="generation_event"
NOT jsonPayload.bookId:*
```

> **Cloud Console alternative** (if the above syntax is unsupported in the Log Explorer filter bar):
> ```
> jsonPayload.message="generation_event"
> jsonPayload.bookId=""
> ```
> In Cloud Console, you can also use the **Field explorer** panel on the right to filter by field absence.

---

## 6. Quick-Reference: Alert → Query Mapping

When a Cloud Monitoring alert fires, use the corresponding saved query to start investigation:

| Alert | Start with | Then expand to |
|---|---|---|
| **CG-1** (candidateAllowed=true) | `CG-1 candidateAllowed true` | `CG-1 candidate generation context` |
| **SJ schema_validation spike** | `SJ-1 schema_validation failures` | `SJ-4 story JSON parse diagnostics` |
| **SJ malformed_json spike** | `SJ-2 malformed_json failures` | `OUT-2 failed or partial outcomes` |
| **SJ field_type_mismatch spike** | `SJ-3 field_type_mismatch failures` | `SJ-4 story JSON parse diagnostics` |
| **IM image failure spike** | `IM-1 page image failures` | `IM-2` / `IM-3` / `IM-4` by error code |
| **LAT latency spike** | `LAT-1 story duration over 120s` | `LAT-2 story duration over 180s` |
| **Readable rate degraded** | `OUT-2 failed or partial outcomes` | `IM-1 page image failures` |
| **DQ missing metadata** | `DQ-1 generation events missing bookId` | Raw `generation_event` stream |

---

## 7. Manual Fallback (No Cloud Console Access)

If Cloud Console is unavailable, use the existing SLO report tool:

```bash
# Export generation events (proxy-aware, no gcloud required)
node scripts/_export-cloud-logging.mjs --out tmp/events.json --days 1 --project story-gen-8a769

# Run full SLO report
node scripts/report-generation-slo.mjs --input tmp/events.json --format console
```

This provides: book outcome rates, story JSON failure categories, storyDurationMs percentiles, page image SLOs.

---

## 8. Import Reference (Cloud Logging REST API)

For programmatic saved query creation (Option B from §2), the Cloud Logging API supports saved views via:

```
POST https://logging.googleapis.com/v2/projects/story-gen-8a769/locations/global/savedViews
```

Payload structure (example for CG-1):
```json
{
  "displayName": "CG-1 candidateAllowed true",
  "filter": "jsonPayload.message=\"generation_event\" AND jsonPayload.eventName=\"generation_started\" AND jsonPayload.candidateAllowed=true"
}
```

This requires `roles/logging.admin` or `logging.views.create` permission. The operator account `kikushun0529@gmail.com` has the necessary roles from P2-10/P2-12.

---

## 9. Implementation Status

| Action | Status | Notes |
|---|---|---|
| Query definitions (all 15) | ✅ COMPLETE (docs, 2026-05-21) | This document §5 |
| Saved queries imported to Cloud Console | ⬜ NOT DONE | Manual import per §3.2; Option A recommended |
| Alert → query mapping documented | ✅ COMPLETE | §6 |
| Manual fallback documented | ✅ COMPLETE | §7 |
| CG-1 alert live + enabled | ✅ LIVE | `projects/story-gen-8a769/alertPolicies/16928978327782001994` |
| SJ/IM alert policies | ⬜ NOT DONE | Pending separate task |
| Dashboard panels (P2-11) | ⬜ NOT DONE | Pending P2-11 |

---

## 10. References

| Document | Purpose |
|---|---|
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §4` | Cloud Logging filters for all alert candidates (SJ/IM/CG/DQ) |
| `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` | 15 metric definitions (P2-9) |
| `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` | CG-1 live policy + runbook |
| `docs/GENERATION_SLO_RUNBOOK.md §8` | Incident response procedures |
| `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2` | Thresholds (Watch/Investigate/Incident levels) |
| `functions/src/lib/generation-event-logger.ts` | Event type definitions (field names used in filters) |
| `scripts/report-generation-slo.mjs` | Manual SLO report tool (fallback) |
| `scripts/_export-cloud-logging.mjs` | Manual Cloud Logging export helper |
