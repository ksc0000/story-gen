# P2-10b: Story JSON (SJ) and Image Failure (IM) Alert Policies

**Status**: ✅ LIVE (enabled, 2026-06-09) — 9 SJ/IM metrics created; 13 alert policies tuned and enabled
**Created**: 2026-05-21  
**Updated**: 2026-06-09 (Tuned thresholds and enabled for Cohort B rollout)
**Task**: P2-10b-live (SJ/IM metric + policy live creation)  
**Scope**: SJ-1 through SJ-4, IM-1 through IM-9. CG-1 is already live + enabled.  
**Depends on**: P2-9 (`docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md`) — metric definitions  
**Firebase project**: `story-gen-8a769`

---

## 1. Purpose

This document defines Cloud Monitoring alert policy specifications for:

- **SJ (Story JSON)** alerts: `schema_validation_failures`, `malformed_json_failures`, `field_type_mismatch_failures`, `storyDurationMs` latency
- **IM (Image)** alerts: page image failure rate, E005, TIMEOUT, PROVIDER_5XX

These definitions are **docs/config only**. No live policies are created in this task.  
Live creation commands are documented in §8 for future use after explicit approval.

### Why docs-first?

- Production traffic baseline is not yet available. Rate thresholds (e.g. 5% over 24h) need validation against real data before enabling.
- SJ/IM alerts are rate-based; a single failure should not page at low volume (see §3 for sample size rules).
- CG-1 is event-count based (any non-zero is CRITICAL) — already live and enabled.

---

## 2. Scope

### In scope

| Alert group | Alerts | Metrics (P2-9) |
|---|---|---|
| **SJ** — Story JSON quality | SJ-1, SJ-2 (schema_validation rate) | `generation/schema_validation_failures`, `generation/book_outcomes_total` |
| **SJ** — Story JSON quality | SJ-3 (malformed_json rate) | `generation/malformed_json_failures` |
| **SJ** — Story JSON quality | SJ-4 (field_type_mismatch rate) | `generation/field_type_mismatch_failures` |
| **SJ** — Story JSON latency | SJ-5, SJ-6 (storyDurationMs) | `generation/story_duration_ms` (distribution) |
| **IM** — Image failures | IM-1, IM-2 (book readable rate) | `generation/book_outcome_failed`, `generation/book_outcomes_total` |
| **IM** — Image failures | IM-3, IM-4 (E005 rate) | `generation/page_e005_failures`, `generation/page_failures_total` |
| **IM** — Image failures | IM-5, IM-6 (TIMEOUT rate) | `generation/page_timeout_failures`, `generation/page_failures_total` |
| **IM** — Image failures | IM-7, IM-8 (PROVIDER_5XX) | `generation/page_provider5xx_failures` |
| **IM** — Image failures | IM-9 (page failure spike) | `generation/page_failures_total` |

### Not in scope (separate tasks or already live)

| Item | Reason |
|---|---|
| **CG-1** alert policy | Already live + enabled in `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` |
| **DQ-1, DQ-2** data quality alerts | Not yet defined; future P2 slice |
| Response schema changes | Permanent non-goal (see §4) |
| Schema repair retry changes | Permanent non-goal (see §4) |
| ImageProvider routing changes | Permanent non-goal (see §4) |
| Firebase deploy | Not performed in this task |

---

## 3. Current Live State

| Resource | Status |
|---|---|
| CG-1 metric (`generation/candidate_allowed`) | **LIVE** |
| CG-1 alert policy (`alertPolicies/16928978327782001994`) | **LIVE, enabled: true** |
| CG-1 notification channel (`notificationChannels/202814648286910376`) | **LIVE** (email: kikushun0529@gmail.com) |
| SJ metrics (3) | **LIVE** — `schema_validation_failures`, `malformed_json_failures`, `field_type_mismatch_failures` |
| IM metrics (6) | **LIVE** — `book_outcomes_total`, `book_outcome_failed`, `page_failures_total`, `page_e005_failures`, `page_timeout_failures`, `page_provider5xx_failures` |
| SJ alert policies (SJ-1..SJ-4) | **LIVE, enabled: true** — see §9 for policy IDs |
| IM alert policies (IM-1..IM-9) | **LIVE, enabled: true** — see §9 for policy IDs |

All 9 SJ/IM metrics are live. All 13 SJ/IM alert policies are enabled and tuned based on the production baseline (§10).

---

## 4. Non-Goals

These must NOT be changed as part of implementing SJ/IM alert policies, regardless of what alerts fire:

| Non-goal | Policy source |
|---|---|
| Do NOT enable `ENABLE_RESPONSE_SCHEMA` | P4-15 §5 criteria not yet met in production |
| Do NOT enable `RESPONSE_SCHEMA_MODE` | Same as above |
| Do NOT enable `ENABLE_SCHEMA_REPAIR_RETRY` | Production baseline required first |
| Do NOT change Gemini prompts | Prompt changes require separate review and approval |
| Do NOT change retry behavior | Retry logic changes require evidence from production data |
| Do NOT change ImageProvider routing | Routing changes require explicit approval + smoke evidence |
| Do NOT change candidate gate logic | CG-1 gate changes are separate, high-risk operations |
| Do NOT change fallback order | Any fallback change requires smoke testing evidence |
| Do NOT deploy Firebase Functions or Hosting | No runtime changes in this task or in response to SJ/IM alerts |

---

## 5. Alert Policy Naming Convention

### Policy display names

```
<AlertID>: <brief description> (<severity>)
```

Examples:
- `SJ-1: schema_validation spike WARNING (> 5% / 24h)`
- `IM-1: book readable rate WARNING (< 98% / 24h)`

### Internal policy IDs

Policy IDs are assigned by Cloud Monitoring on creation. Record them in this doc after live creation.

### Notification channel

For live creation: reuse the CG-1 email channel.  
Channel: `projects/story-gen-8a769/notificationChannels/202814648286910376`  
Email: `kikushun0529@gmail.com`

> Do NOT create new notification channels in this task. Do NOT add additional email addresses
> beyond what is already approved (`202814648286910376`).

---

## 6. Alert Policy Definitions

> All policies are now **enabled** (`enabled: true`) following the P5-4 production baseline validation.

### 6.1 SJ-1: schema_validation failure spike (WARNING)

**Alert ID**: SJ-1  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `SJ-1: schema_validation spike WARNING (> 5% / 24h)` |
| Metric | `logging.googleapis.com/user/generation/schema_validation_failures` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `1` (≈5% of 20 books/day baseline; fires on 2+) |
| Duration | `0s` (fire as soon as condition is met in window) |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "SJ-1: schema_validation spike WARNING (> 5% / 24h)"
conditions:
  - displayName: "schema_validation failures > threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/schema_validation_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 1
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"  # 7 days
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    SJ-1 WARNING: schema_validation failure count exceeded 5% threshold over 24h.
    First response:
    1. Open saved query: "SJ-1 schema_validation failures" in Cloud Logging.
    2. Check storyJsonFailureCategory breakdown.
    3. Do NOT enable ENABLE_RESPONSE_SCHEMA or ENABLE_SCHEMA_REPAIR_RETRY.
    4. If rate > 10%, SJ-2 CRITICAL should also fire — treat as active incident.
    5. Follow GENERATION_SLO_RUNBOOK.md §8.1.
  mimeType: "text/markdown"
```

**Threshold tuning note**:  
The `thresholdValue: 1` assumes ~20 books/day. 1 failure / 20 books = 5%. Fires on 2+ failures (10%) to minimize noise from single transient errors during soft launch.

**First response**:
1. Open saved query: "SJ-1 schema_validation failures" (`docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md §CG-SJ`)
2. Check `storyJsonFailureCategory` distribution — is it dominated by `malformed_json` or `field_type_mismatch`?
3. Check `storyDurationMs` — is it elevated? Could indicate Gemini latency or truncation.
4. Do **NOT** enable `ENABLE_RESPONSE_SCHEMA` or `ENABLE_SCHEMA_REPAIR_RETRY`.
5. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.1`.

---

### 6.2 SJ-2: schema_validation failure spike (CRITICAL)

**Alert ID**: SJ-2  
**Severity**: CRITICAL

| Property | Value |
|---|---|
| Display name | `SJ-2: schema_validation spike CRITICAL (> 10% / 24h)` |
| Metric | `logging.googleapis.com/user/generation/schema_validation_failures` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `2` (≈10% of 20 books/day; fires on 3+) |
| Duration | `0s` |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "SJ-2: schema_validation spike CRITICAL (> 10% / 24h)"
conditions:
  - displayName: "schema_validation failures > critical threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/schema_validation_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 2
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: CRITICAL
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    SJ-2 CRITICAL: schema_validation failure count exceeded 10% threshold over 24h.
    This is an active incident.
    First response:
    1. Open saved query: "SJ-1 schema_validation failures" in Cloud Logging.
    2. Identify storyJsonFailureCategory — malformed_json, field_type_mismatch, or schema_structural.
    3. Do NOT enable ENABLE_RESPONSE_SCHEMA or ENABLE_SCHEMA_REPAIR_RETRY.
    4. Follow GENERATION_SLO_RUNBOOK.md §8.1 (Incident).
  mimeType: "text/markdown"
```

**Consecutive failure detection alternative**:  
For spike detection (3+ failures in a short window), create a separate policy with `alignmentPeriod: "3600s"` and `thresholdValue: 3` (fires if 3 schema_validation failures in 1h). This is a future enhancement after production data confirms rate vs. spike behavior.

**First response**:
1. Treat as active incident.
2. Open saved query: "SJ-1 schema_validation failures".
3. Check if failures cluster in a time window (spike vs. sustained).
4. Check `storyDurationMs` — if very high, suspect Gemini overload or prompt bloat.
5. Do **NOT** enable `ENABLE_RESPONSE_SCHEMA`.
6. Add targeted prompt hardening or `validateStory` hardening in a **separate task** after root cause analysis.
7. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.1`.

---

### 6.3 SJ-3: malformed_json spike (WARNING)

**Alert ID**: SJ-3  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `SJ-3: malformed_json spike WARNING (> 2% / 24h proxy)` |
| Metric | `logging.googleapis.com/user/generation/malformed_json_failures` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `0` (≈2% of 20 books/day; fires on 1+) |
| Duration | `0s` |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "SJ-3: malformed_json spike WARNING (> 2% / 24h proxy)"
conditions:
  - displayName: "malformed_json failures > threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/malformed_json_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    SJ-3 WARNING: malformed_json failures exceeded 2% threshold over 24h.
    First response:
    1. Open saved query: "SJ-2 malformed_json failures" in Cloud Logging.
    2. Check parse diagnostics — markdown fencing, truncated output, non-JSON preamble.
    3. Check storyDurationMs — elevated latency may indicate truncation at context limit.
    4. Check provider/model — which Gemini model version was in use?
    5. Do NOT enable ENABLE_SCHEMA_REPAIR_RETRY based on dev/test data alone.
    6. Follow GENERATION_SLO_RUNBOOK.md §8.2.
  mimeType: "text/markdown"
```

**CRITICAL upgrade condition**:  
If `malformed_json` failures dominate `schema_validation_failures` (e.g. > 60% of all SJ failures) **and** user-visible readable rate is degraded (use `OUT-1` dashboard panel), treat as CRITICAL and follow §8.2 Incident track.

**First response**:
1. Open saved query: "SJ-2 malformed_json failures".
2. Check for parse diagnostics (`parseDiagnostics` field if available).
3. Review `storyDurationMs` — high latency may indicate Gemini output was truncated.
4. Do **NOT** enable `ENABLE_SCHEMA_REPAIR_RETRY` based on dev/test data.
5. Check if failures are from one `creationMode` only — could indicate a template-specific prompt issue.
6. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.2`.

---

### 6.4 SJ-4: field_type_mismatch spike (WARNING)

**Alert ID**: SJ-4  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `SJ-4: field_type_mismatch spike WARNING (> 1% / 24h proxy)` |
| Metric | `logging.googleapis.com/user/generation/field_type_mismatch_failures` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `0` (≈1% of 20 books/day; fires on 1+) |
| Duration | `0s` |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "SJ-4: field_type_mismatch spike WARNING (> 1% / 24h proxy)"
conditions:
  - displayName: "field_type_mismatch failures > threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/field_type_mismatch_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    SJ-4 WARNING: field_type_mismatch failures exceeded 1% threshold over 24h.
    First response:
    1. Open saved query: "SJ-3 field_type_mismatch failures" in Cloud Logging.
    2. Identify which field(s) are mismatching (check storyJsonFailureCategory details).
    3. If same field repeatedly, add targeted prompt hardening or validateStory fix in a separate task.
    4. Do NOT enable ENABLE_RESPONSE_SCHEMA as a workaround.
    5. Follow GENERATION_SLO_RUNBOOK.md §8.3.
  mimeType: "text/markdown"
```

**CRITICAL upgrade condition**:  
If the same field mismatch pattern repeats across many books and blocks generation (readable rate degrades), escalate to CRITICAL and open an incident.

**First response**:
1. Open saved query: "SJ-3 field_type_mismatch failures".
2. Identify the field pattern — is it the same field in every failure?
3. If yes: add targeted `validateStory` hardening or prompt hardening in a **separate task**.
4. Do **NOT** enable `ENABLE_RESPONSE_SCHEMA` as a workaround.
5. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.3`.

---

### 6.5 IM-1: book readable rate degradation (WARNING)

**Alert ID**: IM-1  
**Severity**: WARNING

Cloud Monitoring does not natively support ratio alerts between two log-based metrics.  
**Approach**: Alert on `book_outcome_failed` count directly as a proxy.  
Use the `OUT-1` dashboard panel (ratio) and manual SLO report for readable rate confirmation.

| Property | Value |
|---|---|
| Display name | `IM-1: book readable rate WARNING (failed books rising)` |
| Metric | `logging.googleapis.com/user/generation/book_outcome_failed` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `0` (≈2% of 20 books/day; fires on 1+) |
| Duration | `0s` |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-1: book readable rate WARNING (failed books rising)"
conditions:
  - displayName: "book_outcome_failed count > threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/book_outcome_failed"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-1 WARNING: book_outcome_failed count exceeded threshold over 24h.
    Indicates potential readable rate degradation (target >= 98%).
    First response:
    1. Open saved query: "OUT-1 book outcomes by status" in Cloud Logging.
    2. Compute readable rate manually: (completed + partial_completed) / total_outcomes.
    3. If readable rate < 98%: open "IM-1 page image failures" saved query.
    4. Break down by E005 / TIMEOUT / PROVIDER_5XX using IM-2/IM-3/IM-4 saved queries.
    5. Do not change candidate gate or ImageProvider routing without explicit approval.
    6. Follow GENERATION_SLO_RUNBOOK.md §8.4.
  mimeType: "text/markdown"
```

**First response**:
1. Open saved query: "OUT-1 book outcomes by status".
2. Compute readable rate = `(completed + partial_completed) / book_outcomes_total`.
3. If rate < 98% (Watch): open "IM-1 page image failures" saved query.
4. Break down by error code using IM-2/IM-3/IM-4 queries.
5. Check `resolvedImageModelProfile` — is a specific profile failing?
6. Do **NOT** change `ImageProvider` routing or candidate gate without explicit approval.
7. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.4`.

---

### 6.6 IM-2: book readable rate CRITICAL

**Alert ID**: IM-2  
**Severity**: CRITICAL

| Property | Value |
|---|---|
| Display name | `IM-2: book readable rate CRITICAL (< 95% proxy)` |
| Metric | `logging.googleapis.com/user/generation/book_outcome_failed` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `1` (≈5% + of 20 books/day; fires on 2+) |
| Duration | `0s` |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-2: book readable rate CRITICAL (< 95% proxy)"
conditions:
  - displayName: "book_outcome_failed count > critical threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/book_outcome_failed"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 1
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: CRITICAL
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-2 CRITICAL: book_outcome_failed count exceeded critical threshold over 24h.
    Treat as active incident — readable rate may have dropped below 95%.
    First response:
    1. Run manual SLO report: node scripts/report-generation-slo.mjs --input tmp/events.json
    2. Confirm readable rate from report output.
    3. Open IM-1/IM-2/IM-3/IM-4 saved queries to identify error code breakdown.
    4. Check ImageProvider fallback status — is fallback also failing?
    5. Do NOT change routing without explicit approval + blast-radius assessment.
    6. Follow GENERATION_SLO_RUNBOOK.md §8.4 (Incident).
  mimeType: "text/markdown"
```

---

### 6.7 IM-3: E005 failure rate WARNING

**Alert ID**: IM-3  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `IM-3: E005 page failures WARNING (> 10% of page failures)` |
| Metric | `logging.googleapis.com/user/generation/page_e005_failures` |
| Condition type | Threshold on DELTA count |
| Alignment period | `86400s` (24h) |
| Cross-series reducer | `REDUCE_SUM` |
| Per-series aligner | `ALIGN_DELTA` |
| Threshold value | `0` (use count proxy; fires on 1+) |
| Duration | `0s` |
| Notification channels | `projects/story-gen-8a769/notificationChannels/202814648286910376` |
| Enabled (default) | `true` |

> **Note on ratio alerting**: Cloud Monitoring MQL supports ratio alerts. The threshold above uses
> an absolute count proxy. For accurate ratio alerting (E005 / page_failures_total), use MQL:
> `fetch cloud_run_revision | ... / ...`. See §8 for the MQL-based policy alternative.

**YAML spec**:
```yaml
displayName: "IM-3: E005 page failures WARNING (> 10% of page failures)"
conditions:
  - displayName: "page_e005_failures count > threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_e005_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-3 WARNING: E005 page failures rising.
    E005 = content-sensitivity rejection by Replicate.
    First response:
    1. Open saved query: "IM-2 E005 page failures" in Cloud Logging.
    2. Inspect safe metadata only — do NOT log or expose prompt content.
    3. Check primaryProfile and provider — is it a specific model profile?
    4. Investigate character reference or prompt safety triggers in a separate task.
    5. Do NOT change candidate gate or routing without explicit approval.
    6. Follow GENERATION_SLO_RUNBOOK.md §8.5.
  mimeType: "text/markdown"
```

**First response**:
1. Open saved query: "IM-2 E005 page failures".
2. Inspect safe metadata only (`primaryProfile`, `provider`, `fallbackUsed`, `attemptCount`).
3. Check if failures cluster on a specific `primaryProfile` (may indicate prompt or character reference trigger).
4. Do **NOT** log or expose prompt content.
5. Do **NOT** change candidate gate.
6. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.5`.

---

### 6.8 IM-4: E005 failure rate CRITICAL

**Alert ID**: IM-4  
**Severity**: CRITICAL

| Property | Value |
|---|---|
| Display name | `IM-4: E005 page failures CRITICAL (> 30% of page failures)` |
| Metric | `logging.googleapis.com/user/generation/page_e005_failures` |
| Threshold value | `1` (approximately 30% of estimated page failures/day; fires on 2+) |
| Alignment period | `86400s` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-4: E005 page failures CRITICAL (> 30% of page failures)"
conditions:
  - displayName: "page_e005_failures count > critical threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_e005_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 1
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: CRITICAL
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-4 CRITICAL: E005 page failures exceeded critical threshold.
    If affecting readable rate, treat as active incident.
    1. Open saved query: "IM-2 E005 page failures".
    2. Check if fallback (klein_fast) is also failing with E005.
    3. If both primary and fallback E005, readable rate degradation is likely.
    4. Follow GENERATION_SLO_RUNBOOK.md §8.5 (Incident).
  mimeType: "text/markdown"
```

---

### 6.9 IM-5: TIMEOUT failure rate WARNING

**Alert ID**: IM-5  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `IM-5: TIMEOUT page failures WARNING (> 25% of page failures)` |
| Metric | `logging.googleapis.com/user/generation/page_timeout_failures` |
| Threshold value | `1` (≈25% of estimated page failures/day; fires on 2+) |
| Alignment period | `86400s` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-5: TIMEOUT page failures WARNING (> 25% of page failures)"
conditions:
  - displayName: "page_timeout_failures count > threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_timeout_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 1
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-5 WARNING: TIMEOUT page failures rising.
    Indicates provider latency degradation or generation timeout configuration issues.
    First response:
    1. Open saved query: "IM-3 TIMEOUT page failures" in Cloud Logging.
    2. Check imageDurationMs and imageTimedOut fields.
    3. Check provider status page — is Replicate experiencing degradation?
    4. Check fallbackUsed — is fallback profile (klein_fast) absorbing timeouts?
    5. Do not change timeout configuration or routing without explicit approval.
    6. Follow GENERATION_SLO_RUNBOOK.md §8.6.
  mimeType: "text/markdown"
```

**First response**:
1. Open saved query: "IM-3 TIMEOUT page failures".
2. Check `imageDurationMs`, `imageTimedOut`, `imageAttemptCount`.
3. Check provider status page (Replicate: https://status.replicate.com).
4. Check `fallbackUsed` — is `klein_fast` fallback also timing out?
5. Do **NOT** change timeout configuration or routing without explicit approval.
6. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.6`.

---

### 6.10 IM-6: TIMEOUT failure rate CRITICAL

**Alert ID**: IM-6  
**Severity**: CRITICAL

| Property | Value |
|---|---|
| Display name | `IM-6: TIMEOUT page failures CRITICAL (> 50% of page failures)` |
| Metric | `logging.googleapis.com/user/generation/page_timeout_failures` |
| Threshold value | `2` (≈50% of estimated page failures/day; fires on 3+) |
| Alignment period | `86400s` |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-6: TIMEOUT page failures CRITICAL (> 50% of page failures)"
conditions:
  - displayName: "page_timeout_failures count > critical threshold over 24h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_timeout_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 2
      duration: "0s"
      aggregations:
        - alignmentPeriod: "86400s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: CRITICAL
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-6 CRITICAL: TIMEOUT page failures at critical level — provider degradation suspected.
    Treat as active incident.
    1. Check Replicate status: https://status.replicate.com
    2. Open saved query: "IM-3 TIMEOUT page failures".
    3. Run manual SLO report to confirm readable rate impact.
    4. If sustained, follow GENERATION_SLO_RUNBOOK.md §8.6 (Incident).
  mimeType: "text/markdown"
```

---

### 6.11 IM-7: PROVIDER_5XX (informational count alert)

**Alert ID**: IM-7  
**Severity**: WARNING (promoted from INFO — Cloud Monitoring does not support INFO severity)

| Property | Value |
|---|---|
| Display name | `IM-7: PROVIDER_5XX page failures (any occurrence)` |
| Metric | `logging.googleapis.com/user/generation/page_provider5xx_failures` |
| Threshold value | `0` (any occurrence; fires on 1+) |
| Alignment period | `3600s` (1h) |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-7: PROVIDER_5XX page failures (any occurrence)"
conditions:
  - displayName: "page_provider5xx_failures > 0 in 1h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_provider5xx_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: "0s"
      aggregations:
        - alignmentPeriod: "3600s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-7 WARNING: PROVIDER_5XX page failures detected.
    Single occurrences are expected occasionally; watch for recurrence.
    First response:
    1. Open saved query: "IM-4 PROVIDER_5XX page failures" in Cloud Logging.
    2. Check provider and fallbackUsed — did fallback succeed?
    3. If sustained (> 3 / 1h), IM-8 should also fire.
    4. Follow GENERATION_SLO_RUNBOOK.md §8.7.
  mimeType: "text/markdown"
```

---

### 6.12 IM-8: PROVIDER_5XX sustained (WARNING)

**Alert ID**: IM-8  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `IM-8: PROVIDER_5XX sustained (> 1 in 1h)` |
| Metric | `logging.googleapis.com/user/generation/page_provider5xx_failures` |
| Threshold value | `1` (fires on 2+ in 1h) |
| Alignment period | `3600s` (1h) |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-8: PROVIDER_5XX sustained (> 1 in 1h)"
conditions:
  - displayName: "page_provider5xx_failures > 1 in 1h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_provider5xx_failures"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 1
      duration: "0s"
      aggregations:
        - alignmentPeriod: "3600s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-8 WARNING: PROVIDER_5XX sustained (> 1 in 1h).
    Check provider status and fallback behavior.
    1. Check Replicate status: https://status.replicate.com
    2. Open saved query: "IM-4 PROVIDER_5XX page failures".
    3. Check if fallback is absorbing failures.
    4. Follow GENERATION_SLO_RUNBOOK.md §8.7.
  mimeType: "text/markdown"
```

**First response**:
1. Check Replicate status page: https://status.replicate.com
2. Open saved query: "IM-4 PROVIDER_5XX page failures".
3. Check `fallbackUsed` — is `klein_fast` fallback absorbing errors?
4. If readable rate is degrading, treat as Incident.
5. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.7`.

---

### 6.13 IM-9: page image failure spike (WARNING)

**Alert ID**: IM-9  
**Severity**: WARNING

| Property | Value |
|---|---|
| Display name | `IM-9: page image failure spike (> 2 in 1h)` |
| Metric | `logging.googleapis.com/user/generation/page_failures_total` |
| Threshold value | `2` (fires on 3+ in 1h) |
| Alignment period | `3600s` (1h) |
| Enabled (default) | `true` |

**YAML spec**:
```yaml
displayName: "IM-9: page image failure spike (> 2 in 1h)"
conditions:
  - displayName: "page_failures_total > 2 in 1h"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/page_failures_total"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 2
      duration: "0s"
      aggregations:
        - alignmentPeriod: "3600s"
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
alertStrategy:
  autoClose: "604800s"
severity: WARNING
notificationChannels:
  - "projects/story-gen-8a769/notificationChannels/202814648286910376"
enabled: true
documentation:
  content: |
    IM-9 WARNING: page image failure spike (> 2 in 1h).
    Broad signal — break down by error code.
    1. Open saved query: "IM-1 page image failures" in Cloud Logging.
    2. Break down by errorCode using IM-2/IM-3/IM-4 saved queries.
    3. Check if spike is E005 (content), TIMEOUT (latency), or PROVIDER_5XX (provider health).
    4. Follow the relevant per-error-code runbook section.
  mimeType: "text/markdown"
```

**First response**:
1. Open saved query: "IM-1 page image failures".
2. Break down by `errorCode` using IM-2/IM-3/IM-4 saved queries.
3. Route to the appropriate sub-alert response based on dominant error code.
4. Follow `docs/GENERATION_SLO_RUNBOOK.md §8.4` (general page failure).

---

## 7. Alert Summary Table

| Alert ID | Display name | Severity | Metric | Threshold | Window | Enabled |
|---|---|---|---|---|---|---|
| **SJ-1** | schema_validation spike WARNING | WARNING | `schema_validation_failures` | > 1 / 24h | 24h | **true** |
| **SJ-2** | schema_validation spike CRITICAL | CRITICAL | `schema_validation_failures` | > 2 / 24h | 24h | **true** |
| **SJ-3** | malformed_json spike WARNING | WARNING | `malformed_json_failures` | > 0 / 24h | 24h | **true** |
| **SJ-4** | field_type_mismatch spike WARNING | WARNING | `field_type_mismatch_failures` | > 0 / 24h | 24h | **true** |
| **IM-1** | book readable rate WARNING | WARNING | `book_outcome_failed` | > 0 / 24h | 24h | **true** |
| **IM-2** | book readable rate CRITICAL | CRITICAL | `book_outcome_failed` | > 1 / 24h | 24h | **true** |
| **IM-3** | E005 failures WARNING | WARNING | `page_e005_failures` | > 0 / 24h | 24h | **true** |
| **IM-4** | E005 failures CRITICAL | CRITICAL | `page_e005_failures` | > 1 / 24h | 24h | **true** |
| **IM-5** | TIMEOUT failures WARNING | WARNING | `page_timeout_failures` | > 1 / 24h | 24h | **true** |
| **IM-6** | TIMEOUT failures CRITICAL | CRITICAL | `page_timeout_failures` | > 2 / 24h | 24h | **true** |
| **IM-7** | PROVIDER_5XX any occurrence | WARNING | `page_provider5xx_failures` | > 0 / 1h | 1h | **true** |
| **IM-8** | PROVIDER_5XX sustained | WARNING | `page_provider5xx_failures` | > 1 / 1h | 1h | **true** |
| **IM-9** | page failure spike | WARNING | `page_failures_total` | > 2 / 1h | 1h | **true** |
| ~~**CG-1**~~ | ~~candidateAllowed=true~~ | ~~CRITICAL~~ | ~~`candidate_allowed`~~ | ~~> 0~~ | ~~60s~~ | **true (live)** |

---

## 8. Live Creation Commands (Do Not Execute Without Explicit Approval)

These commands are documented for use after the following prerequisites are confirmed:
1. All 14 SJ/IM metrics from P2-9 are verified as live in Cloud Monitoring.
2. Production traffic baseline ≥ 30 `book_outcome` events is available.
3. Threshold values reviewed against actual production data.
4. Explicit operator approval to enable.

### 8.1 Prerequisite: create P2-9 metrics (if not yet created)

```bash
# Story JSON metrics (SJ)
gcloud logging metrics create generation/schema_validation_failures \
  --project=story-gen-8a769 \
  --description="Counter: book_early_failed where failureStage=schema_validation. SJ-1/SJ-2 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.failureStage="schema_validation"'

gcloud logging metrics create generation/malformed_json_failures \
  --project=story-gen-8a769 \
  --description="Counter: book_early_failed where storyJsonFailureCategory=malformed_json. SJ-3 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyJsonFailureCategory="malformed_json"'

gcloud logging metrics create generation/field_type_mismatch_failures \
  --project=story-gen-8a769 \
  --description="Counter: book_early_failed where storyJsonFailureCategory=field_type_mismatch. SJ-4 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyJsonFailureCategory="field_type_mismatch"'

# Book outcome metrics (IM)
gcloud logging metrics create generation/book_outcomes_total \
  --project=story-gen-8a769 \
  --description="Counter: all book_outcome events. Denominator for readable rate." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome"'

gcloud logging metrics create generation/book_outcome_failed \
  --project=story-gen-8a769 \
  --description="Counter: book_outcome events where bookStatus=failed. IM-1/IM-2 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome" AND jsonPayload.bookStatus="failed"'

# Page image failure metrics (IM)
gcloud logging metrics create generation/page_failures_total \
  --project=story-gen-8a769 \
  --description="Counter: all page_image_failed events. Denominator for E005/TIMEOUT/PROVIDER_5XX rates." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed"'

gcloud logging metrics create generation/page_e005_failures \
  --project=story-gen-8a769 \
  --description="Counter: page_image_failed where errorCode=E005. IM-3/IM-4 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed" AND jsonPayload.errorCode="E005"'

gcloud logging metrics create generation/page_timeout_failures \
  --project=story-gen-8a769 \
  --description="Counter: page_image_failed where errorCode=TIMEOUT. IM-5/IM-6 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed" AND jsonPayload.errorCode="TIMEOUT"'

gcloud logging metrics create generation/page_provider5xx_failures \
  --project=story-gen-8a769 \
  --description="Counter: page_image_failed where errorCode=PROVIDER_5XX. IM-7/IM-8 alert." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed" AND jsonPayload.errorCode="PROVIDER_5XX"'
```

### 8.2 Verify metrics before creating policies

```bash
# List all generation/* metrics
gcloud logging metrics list --project=story-gen-8a769 \
  --filter="name:generation/" \
  --format="table(name, description)"
```

Expected output: at minimum `generation/candidate_allowed` (live) + the 9 metrics created above.

### 8.3 Create alert policies from YAML files

Save each YAML spec from §6 to a file (e.g. `tmp/policy-sj1.yaml`) then:

```bash
# WARNING policies (--enabled flag omitted = policy is disabled by default)
gcloud monitoring policies create \
  --policy-from-file=tmp/policy-sj1.yaml \
  --project=story-gen-8a769

gcloud monitoring policies create \
  --policy-from-file=tmp/policy-sj3.yaml \
  --project=story-gen-8a769

gcloud monitoring policies create \
  --policy-from-file=tmp/policy-sj4.yaml \
  --project=story-gen-8a769

# ... etc for each policy

# CRITICAL policies (SJ-2, IM-2, IM-4, IM-6)
gcloud monitoring policies create \
  --policy-from-file=tmp/policy-sj2.yaml \
  --project=story-gen-8a769
```

### 8.4 Enable all policies (Cohort B Soft Launch)

Run these commands to enable the 13 SJ/IM policies.

> **Important**: These commands only toggle the `enabled` state. To update the thresholds for existing policies, you must also use `--policy-from-file` with the YAML specs in §6 or use `gcloud alpha monitoring policies update POLICY_ID --set-threshold=VALUE` if supported.

```bash
# SJ-1
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/2513526464198067799 --enabled --project=story-gen-8a769

# SJ-2
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/4893251868647628500 --enabled --project=story-gen-8a769

# SJ-3
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/14364886655881563701 --enabled --project=story-gen-8a769

# SJ-4
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/10504437645741432748 --enabled --project=story-gen-8a769

# IM-1
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/6672566375930316929 --enabled --project=story-gen-8a769

# IM-2
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/4601285944978493813 --enabled --project=story-gen-8a769

# IM-3
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/10504437645741432726 --enabled --project=story-gen-8a769

# IM-4
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/17509905302009062853 --enabled --project=story-gen-8a769

# IM-5
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/17901603525203439569 --enabled --project=story-gen-8a769

# IM-6
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/17901603525203439157 --enabled --project=story-gen-8a769

# IM-7
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/10504437645741431479 --enabled --project=story-gen-8a769

# IM-8
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/10504437645741432289 --enabled --project=story-gen-8a769

# IM-9
gcloud alpha monitoring policies update projects/story-gen-8a769/alertPolicies/17901603525203436195 --enabled --project=story-gen-8a769
```

> Note: Thresholds are defined in the alert conditions. If policies were already created with old thresholds, they must be updated using `--policy-from-file` with the YAML specs in §6 or by using specific field updates if supported by the CLI.

### 8.5 Attach notification channel if not already included

```bash
gcloud monitoring policies update POLICY_ID \
  --project=story-gen-8a769 \
  --set-notification-channels=projects/story-gen-8a769/notificationChannels/202814648286910376
```

### 8.6 Verify policy state after creation

```bash
gcloud monitoring policies describe POLICY_ID \
  --project=story-gen-8a769 \
  | grep -E "enabled:|displayName:|notificationChannels"
```

> **Do NOT execute these commands in this task.** Record policy IDs in this document after live creation.

---

## 9. Live Policy ID Registry (Updated 2026-06-03)

| Alert ID | Policy resource name | Enabled | Threshold | Updated |
|---|---|---|---|---|
| SJ-1 | `projects/story-gen-8a769/alertPolicies/2513526464198067799` | **true** | > 1 / 24h | 2026-06-09 |
| SJ-2 | `projects/story-gen-8a769/alertPolicies/4893251868647628500` | **true** | > 2 / 24h | 2026-06-09 |
| SJ-3 | `projects/story-gen-8a769/alertPolicies/14364886655881563701` | **true** | > 0 / 24h | 2026-06-09 |
| SJ-4 | `projects/story-gen-8a769/alertPolicies/10504437645741432748` | **true** | > 0 / 24h | 2026-06-09 |
| IM-1 | `projects/story-gen-8a769/alertPolicies/6672566375930316929` | **true** | > 0 / 24h | 2026-06-09 |
| IM-2 | `projects/story-gen-8a769/alertPolicies/4601285944978493813` | **true** | > 1 / 24h | 2026-06-09 |
| IM-3 | `projects/story-gen-8a769/alertPolicies/10504437645741432726` | **true** | > 0 / 24h | 2026-06-09 |
| IM-4 | `projects/story-gen-8a769/alertPolicies/17509905302009062853` | **true** | > 1 / 24h | 2026-06-09 |
| IM-5 | `projects/story-gen-8a769/alertPolicies/17901603525203439569` | **true** | > 1 / 24h | 2026-06-09 |
| IM-6 | `projects/story-gen-8a769/alertPolicies/17901603525203439157` | **true** | > 2 / 24h | 2026-06-09 |
| IM-7 | `projects/story-gen-8a769/alertPolicies/10504437645741431479` | **true** | > 0 / 1h | 2026-06-09 |
| IM-8 | `projects/story-gen-8a769/alertPolicies/10504437645741432289` | **true** | > 1 / 1h | 2026-06-09 |
| IM-9 | `projects/story-gen-8a769/alertPolicies/17901603525203436195` | **true** | > 2 / 1h | 2026-06-09 |
| **CG-1** | `projects/story-gen-8a769/alertPolicies/16928978327782001994` | **true** | 2026-05-21 |

---

## 10. Threshold Tuning After Production Baseline

The absolute count thresholds in §6 are provisional estimates based on an assumed ~60 books/day volume.  
After collecting ≥ 2 weeks of production data:

1. Run `node scripts/report-generation-slo.mjs --input tmp/events.json --format console`.
2. Record daily `book_outcomes_total`, `schema_validation_failures`, and `page_failures_total`.
3. Recompute thresholds as:
   - SJ-1 threshold = `ceil(avg_daily_outcomes × 0.05)`
   - SJ-2 threshold = `ceil(avg_daily_outcomes × 0.10)`
   - SJ-3 threshold = `ceil(avg_daily_outcomes × 0.02)`
   - IM-1 threshold = `ceil(avg_daily_outcomes × 0.02)`
   - etc.
4. Update policy thresholds via `gcloud monitoring policies update`.
5. Record updated values in §9 registry.

---

## 11. References

| Document | Purpose |
|---|---|
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` | Master alert automation plan; SJ/IM alert candidate definitions §3.2/§3.3 |
| `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` | P2-9 metric YAML specs and gcloud commands |
| `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md` | CG-1 alert policy (live + enabled) — reference for policy format |
| `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` | Saved query definitions for first-response investigation |
| `docs/P2_GENERATION_SLO_DASHBOARD_PANELS.md` | P2-11 dashboard panel spec — use for visual triage before saved queries |
| `docs/GENERATION_SLO_RUNBOOK.md` | Operational incident response procedures (§8.x playbooks) |
| `docs/GENERATION_SLO_THRESHOLD_POLICY.md` | Severity thresholds, sample size rules, decision matrix |
| `scripts/report-generation-slo.mjs` | Manual SLO report (used as fallback and for threshold validation) |
| `functions/src/lib/generation-event-logger.ts` | Event field definitions for all generation_event log payloads |
