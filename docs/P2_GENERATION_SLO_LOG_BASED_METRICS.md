# P2 Generation SLO Log-Based Metrics

**Status**: 📋 DEFINITIONS COMPLETE — live Cloud Monitoring metrics not yet created  
**Created**: 2026-05-21  
**Task**: P2-9 (Log-based metric definitions)  
**Depends on**: P2-7 (`docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §5`)  
**Required by**: P2-10 (alert policies must reference stable metric names from this doc)  
**Firebase project**: `story-gen-8a769`

---

## 1. Overview

This document defines the Cloud Monitoring log-based metrics for generation SLO alert automation.  
**These definitions are docs-only.** No metrics have been created in Cloud Monitoring yet.

### Purpose

Log-based metrics convert structured fields from Cloud Logging `generation_event` entries into
time-series metrics that Cloud Monitoring alert policies (P2-10) can threshold against.

### Source events

All metrics filter on:
```
jsonPayload.message="generation_event"
```

Events are emitted by `functions/src/lib/generation-event-logger.ts` (P2-2/P2-3/P4-2).
Log resource type is `cloud_run_revision` (Firebase Functions 2nd gen run on Cloud Run).

### Scope: what is NOT defined here

- Alert policies (P2-10)
- Notification channels (P2-12)
- Dashboard panels (P2-11)
- Admin SLO Dashboard Firestore-based metrics (`functions/src/lib/slo-metrics.ts`) — separate system

---

## 2. Naming Conventions and Global Rules

### 2.1 Metric name prefix

All metrics use the prefix `generation/`. In Cloud Monitoring, the full metric type becomes:
```
logging.googleapis.com/user/generation/<metric_name>
```

### 2.2 Name stability

> **CRITICAL**: Once a metric name is referenced by an alert policy (P2-10), renaming it requires
> updating all referencing policies first. Treat names in this document as **stable contracts**.

### 2.3 Label key conventions

| Convention | Rule |
|---|---|
| Key format | `snake_case`, matches JSON payload field name where possible |
| Optional fields | If the payload field is absent, the label value is `""` (empty string) |
| Maximum labels | 10 per metric (Cloud Monitoring limit) |
| Value types | All labels in this document use `STRING` value type |

### 2.4 metricKind and valueType

| Metric class | metricKind | valueType |
|---|---|---|
| Counter | `DELTA` | `INT64` |
| Distribution | `DELTA` | `DISTRIBUTION` |

### 2.5 Unit

| Metric class | Unit |
|---|---|
| Counter | `1` (dimensionless) |
| Story duration | `ms` (milliseconds) |

### 2.6 Privacy reminder

- `bookId` is a system-generated UUID — safe for labels
- Raw `userId` is **never** in any event payload — safe (no userId label possible)
- `templateId` is a key like `"animals"` — safe
- `creationMode` is one of `"fixed_template"` / `"guided_ai"` / `"original_ai"` — safe
- Never add labels that could contain user-provided text, child names, or story content

---

## 3. Metric Definitions

### 3.1 Candidate Gate Metric — CG-1 (HIGHEST PRIORITY)

> **Create this metric first.** Any non-zero count is CRITICAL (see P2-10 alert policy CG-1).
> In normal production, `candidateAllowed=true` should never appear without deliberate enrollment.

#### `generation/candidate_allowed`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/candidate_allowed` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Count `generation_started` events where the candidate profile was allowed. Any non-zero count without deliberate enrollment = CG-1 CRITICAL alert. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="generation_started"
AND jsonPayload.candidateAllowed=true
```

**Labels**:

| Label key | Extractor | Source field | Notes |
|---|---|---|---|
| `resolved_image_model_profile` | `EXTRACT(jsonPayload.resolvedImageModelProfile)` | `GenerationStartedEvent.resolvedImageModelProfile` | Identifies which candidate profile was allowed |
| `candidate_decision` | `EXTRACT(jsonPayload.candidateDecision)` | `GenerationStartedEvent.candidateDecision` | Expected value: `"pass"` (always, since we filter on `candidateAllowed=true`) |
| `template_id` | `EXTRACT(jsonPayload.templateId)` | `GenerationStartedEvent.templateId` | May be `""` if absent |

**YAML config**:
```yaml
name: "generation/candidate_allowed"
description: >
  Counter for generation_started events where candidateAllowed=true.
  Any non-zero value without deliberate user enrollment is a CRITICAL incident (CG-1).
  In normal production this metric should always read zero.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="generation_started"
  AND jsonPayload.candidateAllowed=true
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: resolved_image_model_profile
      valueType: STRING
      description: "Resolved image model profile after candidate gate check"
    - key: candidate_decision
      valueType: STRING
      description: "Candidate gate outcome (expected: pass)"
    - key: template_id
      valueType: STRING
      description: "Book template ID; empty string if not present"
labelExtractors:
  resolved_image_model_profile: "EXTRACT(jsonPayload.resolvedImageModelProfile)"
  candidate_decision: "EXTRACT(jsonPayload.candidateDecision)"
  template_id: "EXTRACT(jsonPayload.templateId)"
```

**gcloud command**:
```bash
gcloud logging metrics create generation/candidate_allowed \
  --description="Counter: candidateAllowed=true events. Non-zero = CRITICAL (CG-1)." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="generation_started" AND jsonPayload.candidateAllowed=true' \
  --project=story-gen-8a769
```

> Note: Label extractors on `gcloud logging metrics create` require `--label-extractor` flags.
> For the full label configuration, use the Cloud Console UI or the Cloud Logging REST API
> (see §4 for the REST API approach using the existing `_export-cloud-logging.mjs` auth pattern).

---

### 3.2 Story JSON Failure Metrics

These metrics sub-classify `book_early_failed` events by failure cause.
`schema_validation_failures` is the parent metric; the others are sub-categories.

#### Relationship between metrics

```
schema_validation_failures  (failureStage="schema_validation")
  ├── malformed_json_failures
  ├── field_type_mismatch_failures
  ├── schema_structural_failures
  ├── (field_value_invalid — not tracked separately, included in story_json_unknown_failures)
  └── story_json_unknown_failures
```

> **Note**: `field_value_invalid` and `provider_error` categories exist in the type system
> (`StoryJsonFailureCategory`) but are not split into separate named metrics here.
> Monitor them through the manual SLO report (`scripts/report-generation-slo.mjs`) or by
> creating additional metrics in a future P2 slice.

#### `generation/schema_validation_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/schema_validation_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Total story JSON / schema validation failures before page generation. SJ-1 / SJ-2 alert denominator. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.failureStage="schema_validation"
```

**Labels**:

| Label key | Extractor | Notes |
|---|---|---|
| `template_id` | `EXTRACT(jsonPayload.templateId)` | `""` if absent |
| `creation_mode` | `EXTRACT(jsonPayload.creationMode)` | `fixed_template` / `guided_ai` / `original_ai` / `""` |
| `story_json_failure_category` | `EXTRACT(jsonPayload.storyJsonFailureCategory)` | Sub-category; `""` if not yet classified |

**YAML config**:
```yaml
name: "generation/schema_validation_failures"
description: >
  Counter for book_early_failed events where failureStage=schema_validation.
  This is the parent metric for all story JSON failure sub-categories.
  Alert thresholds: SJ-1 WARNING > 5% of outcomes / 24h; SJ-2 CRITICAL > 10%.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_early_failed"
  AND jsonPayload.failureStage="schema_validation"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
    - key: story_json_failure_category
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
  story_json_failure_category: "EXTRACT(jsonPayload.storyJsonFailureCategory)"
```

---

#### `generation/malformed_json_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/malformed_json_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | LLM output could not be parsed as JSON (markdown fencing, truncated, etc.). SJ-3 alert. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="malformed_json"
```

**Labels**: same as `generation/schema_validation_failures` (omit `story_json_failure_category` — it's fixed by the filter).

| Label key | Extractor |
|---|---|
| `template_id` | `EXTRACT(jsonPayload.templateId)` |
| `creation_mode` | `EXTRACT(jsonPayload.creationMode)` |

**YAML config**:
```yaml
name: "generation/malformed_json_failures"
description: >
  Counter for book_early_failed events where storyJsonFailureCategory=malformed_json.
  LLM output could not be parsed as JSON.
  Alert threshold: SJ-3 WARNING > 2% of outcomes / 24h.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_early_failed"
  AND jsonPayload.storyJsonFailureCategory="malformed_json"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
```

---

#### `generation/field_type_mismatch_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/field_type_mismatch_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | JSON parsed but a field has the wrong type. SJ-4 alert. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="field_type_mismatch"
```

**YAML config**:
```yaml
name: "generation/field_type_mismatch_failures"
description: >
  Counter for book_early_failed events where storyJsonFailureCategory=field_type_mismatch.
  Field present but wrong type (array where string expected, null, etc.).
  Alert threshold: SJ-4 WARNING > 1% of outcomes / 24h.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_early_failed"
  AND jsonPayload.storyJsonFailureCategory="field_type_mismatch"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
```

---

#### `generation/schema_structural_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/schema_structural_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | JSON parsed but required fields absent or structurally wrong. Informational; no dedicated SLO threshold yet. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="schema_structural"
```

**YAML config**:
```yaml
name: "generation/schema_structural_failures"
description: >
  Counter for book_early_failed events where storyJsonFailureCategory=schema_structural.
  JSON parsed but required fields are absent or structurally wrong.
  No dedicated SLO threshold; monitor as part of schema_validation_failures total.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_early_failed"
  AND jsonPayload.storyJsonFailureCategory="schema_structural"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
```

---

#### `generation/story_json_unknown_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/story_json_unknown_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Story JSON failure category could not be determined. A sustained increase may indicate a change in Gemini error format. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyJsonFailureCategory="unknown"
```

**YAML config**:
```yaml
name: "generation/story_json_unknown_failures"
description: >
  Counter for book_early_failed events where storyJsonFailureCategory=unknown.
  A sustained increase may indicate a Gemini error format change or a gap in classifyStoryJsonFailure().
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_early_failed"
  AND jsonPayload.storyJsonFailureCategory="unknown"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
```

---

### 3.3 Book Outcome Metrics

These metrics enable computation of book readable rate, failure rate, and completion rate.

#### `generation/book_outcomes_total`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/book_outcomes_total` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Denominator for book readable rate, failure rate, and partial completion rate. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
```

**Labels**:

| Label key | Extractor | Notes |
|---|---|---|
| `template_id` | `EXTRACT(jsonPayload.templateId)` | `""` if absent |
| `creation_mode` | `EXTRACT(jsonPayload.creationMode)` | `""` if absent |
| `resolved_image_model_profile` | `EXTRACT(jsonPayload.resolvedImageModelProfile)` | `""` if absent |

**YAML config**:
```yaml
name: "generation/book_outcomes_total"
description: >
  Counter for all book_outcome events. Denominator for book readable rate
  and failure rate alert thresholds (IM-1/IM-2).
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_outcome"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
    - key: resolved_image_model_profile
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
  resolved_image_model_profile: "EXTRACT(jsonPayload.resolvedImageModelProfile)"
```

---

#### `generation/book_outcome_failed`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/book_outcome_failed` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Books that reached `status=failed` (all pages failed). Numerator for failure rate (IM-1/IM-2). |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
AND jsonPayload.bookStatus="failed"
```

**YAML config**:
```yaml
name: "generation/book_outcome_failed"
description: >
  Counter for book_outcome events where bookStatus=failed.
  Alert thresholds: IM-1 WARNING readable rate < 98%; IM-2 CRITICAL readable rate < 95%.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_outcome"
  AND jsonPayload.bookStatus="failed"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
    - key: resolved_image_model_profile
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
  resolved_image_model_profile: "EXTRACT(jsonPayload.resolvedImageModelProfile)"
```

---

#### `generation/book_outcome_completed`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/book_outcome_completed` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Books that reached `status=completed` (all pages succeeded). Informational; healthy baseline signal. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
AND jsonPayload.bookStatus="completed"
```

**YAML config**:
```yaml
name: "generation/book_outcome_completed"
description: >
  Counter for book_outcome events where bookStatus=completed (all pages succeeded).
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_outcome"
  AND jsonPayload.bookStatus="completed"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
    - key: resolved_image_model_profile
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
  resolved_image_model_profile: "EXTRACT(jsonPayload.resolvedImageModelProfile)"
```

---

#### `generation/book_outcome_partial_completed`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/book_outcome_partial_completed` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Books that reached `status=partial_completed` (some pages failed). SLO: partial rate ≤ 5% (Watch), > 10% (Investigate). |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_outcome"
AND jsonPayload.bookStatus="partial_completed"
```

**YAML config**:
```yaml
name: "generation/book_outcome_partial_completed"
description: >
  Counter for book_outcome events where bookStatus=partial_completed.
  SLO: partial rate <= 5% (OK), 5-10% (Watch), > 10% (Investigate).
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_outcome"
  AND jsonPayload.bookStatus="partial_completed"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: creation_mode
      valueType: STRING
    - key: resolved_image_model_profile
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
  resolved_image_model_profile: "EXTRACT(jsonPayload.resolvedImageModelProfile)"
```

---

### 3.4 Page Image Failure Metrics

#### `generation/page_failures_total`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/page_failures_total` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Denominator for E005 rate, TIMEOUT rate, and PROVIDER_5XX rate alert conditions. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
```

**Labels**:

| Label key | Extractor | Notes |
|---|---|---|
| `provider` | `EXTRACT(jsonPayload.provider)` | `"replicate"` / `"openai"` |
| `primary_profile` | `EXTRACT(jsonPayload.primaryProfile)` | Originally requested profile |
| `error_code` | `EXTRACT(jsonPayload.errorCode)` | Normalized error code |

**YAML config**:
```yaml
name: "generation/page_failures_total"
description: >
  Counter for all page_image_failed events (all fallback profiles exhausted).
  Denominator for E005 rate (IM-3/IM-4), TIMEOUT rate (IM-5/IM-6), PROVIDER_5XX (IM-7/IM-8).
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="page_image_failed"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: provider
      valueType: STRING
      description: "Image provider: replicate or openai"
    - key: primary_profile
      valueType: STRING
      description: "Originally requested image model profile (before fallback)"
    - key: error_code
      valueType: STRING
      description: "Normalized error code (E005, TIMEOUT, PROVIDER_5XX, etc.)"
labelExtractors:
  provider: "EXTRACT(jsonPayload.provider)"
  primary_profile: "EXTRACT(jsonPayload.primaryProfile)"
  error_code: "EXTRACT(jsonPayload.errorCode)"
```

---

#### `generation/page_e005_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/page_e005_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Replicate content-sensitivity rejections (E005). SLO: < 5% of failures (OK), > 10% (Investigate / IM-3), > 30% (CRITICAL / IM-4). |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="E005"
```

**YAML config**:
```yaml
name: "generation/page_e005_failures"
description: >
  Counter for page_image_failed events where errorCode=E005 (content-sensitivity rejection).
  Alert: IM-3 WARNING > 10% of page_failures_total; IM-4 CRITICAL > 30%.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="page_image_failed"
  AND jsonPayload.errorCode="E005"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: provider
      valueType: STRING
    - key: primary_profile
      valueType: STRING
labelExtractors:
  provider: "EXTRACT(jsonPayload.provider)"
  primary_profile: "EXTRACT(jsonPayload.primaryProfile)"
```

---

#### `generation/page_timeout_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/page_timeout_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Image generation timeouts. SLO: < 15% of failures (OK), > 25% (Investigate / IM-5), > 50% (CRITICAL / IM-6). |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="TIMEOUT"
```

**YAML config**:
```yaml
name: "generation/page_timeout_failures"
description: >
  Counter for page_image_failed events where errorCode=TIMEOUT.
  Alert: IM-5 WARNING > 25% of page_failures_total; IM-6 CRITICAL > 50%.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="page_image_failed"
  AND jsonPayload.errorCode="TIMEOUT"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: provider
      valueType: STRING
    - key: primary_profile
      valueType: STRING
labelExtractors:
  provider: "EXTRACT(jsonPayload.provider)"
  primary_profile: "EXTRACT(jsonPayload.primaryProfile)"
```

---

#### `generation/page_provider5xx_failures`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/page_provider5xx_failures` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Provider HTTP 5xx failures. Single occurrence is INFO; sustained (> 3 / 1h) is WARNING (IM-7/IM-8). |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_failed"
AND jsonPayload.errorCode="PROVIDER_5XX"
```

**YAML config**:
```yaml
name: "generation/page_provider5xx_failures"
description: >
  Counter for page_image_failed events where errorCode=PROVIDER_5XX.
  Alert: IM-7 INFO on first occurrence; IM-8 WARNING if > 3 events in 1h.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="page_image_failed"
  AND jsonPayload.errorCode="PROVIDER_5XX"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: provider
      valueType: STRING
    - key: primary_profile
      valueType: STRING
labelExtractors:
  provider: "EXTRACT(jsonPayload.provider)"
  primary_profile: "EXTRACT(jsonPayload.primaryProfile)"
```

---

### 3.5 Story Duration Distribution Metric

> This is the only **distribution** metric in this set.
> Distribution metrics allow Cloud Monitoring to compute percentiles (p50, p95, p99) for alert policies.
> P4-15 SLO: storyDurationMs p95 ≤ 120s. P2-10 alert threshold: p95 > 180s (SJ-5/SJ-6).

#### `generation/story_duration_ms`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/story_duration_ms` |
| **Kind** | Distribution (DELTA / DISTRIBUTION) |
| **Unit** | `ms` |
| **Purpose** | Distribution of story generation latency in milliseconds. Enables p95/p99 percentile alert policies. Field source: `storyDurationMs` on `book_early_failed` and `book_outcome` events (P4-2). |

**Filter**:
```
jsonPayload.message="generation_event"
AND (jsonPayload.eventName="book_early_failed" OR jsonPayload.eventName="book_outcome")
AND jsonPayload.storyDurationMs>0
```

> `storyDurationMs>0` excludes events where the field is absent or zero (pre-P4-2 events, or
> events where story generation was not attempted).

**Value extractor**:
```
EXTRACT(jsonPayload.storyDurationMs)
```

**Bucket options** (explicit, in milliseconds):
```
[0, 1000, 5000, 10000, 30000, 60000, 90000, 120000, 150000, 180000, 240000, 300000, 600000]
```

Rationale: fine-grained below 180s (the SJ-5 alert threshold), coarser above.

**Labels**:

| Label key | Extractor | Notes |
|---|---|---|
| `event_name` | `EXTRACT(jsonPayload.eventName)` | `"book_early_failed"` or `"book_outcome"` |
| `creation_mode` | `EXTRACT(jsonPayload.creationMode)` | `""` if absent |
| `failure_stage` | `EXTRACT(jsonPayload.failureStage)` | Only meaningful for `book_early_failed` events; `""` for `book_outcome` |

**YAML config**:
```yaml
name: "generation/story_duration_ms"
description: >
  Distribution of story generation latency in milliseconds.
  Covers both book_early_failed (story failed) and book_outcome (story succeeded, images generated).
  P4-15 SLO: p95 <= 120,000ms. Alert thresholds: SJ-5 WARNING p95 > 180,000ms; SJ-6 CRITICAL p99 > 200,000ms.
filter: |
  jsonPayload.message="generation_event"
  AND (jsonPayload.eventName="book_early_failed" OR jsonPayload.eventName="book_outcome")
  AND jsonPayload.storyDurationMs>0
valueExtractor: "EXTRACT(jsonPayload.storyDurationMs)"
bucketOptions:
  explicitBuckets:
    bounds:
      - 1000
      - 5000
      - 10000
      - 30000
      - 60000
      - 90000
      - 120000
      - 150000
      - 180000
      - 240000
      - 300000
      - 600000
metricDescriptor:
  metricKind: DELTA
  valueType: DISTRIBUTION
  unit: "ms"
  labels:
    - key: event_name
      valueType: STRING
      description: "book_early_failed or book_outcome"
    - key: creation_mode
      valueType: STRING
    - key: failure_stage
      valueType: STRING
      description: "failureStage value; empty string for book_outcome events"
labelExtractors:
  event_name: "EXTRACT(jsonPayload.eventName)"
  creation_mode: "EXTRACT(jsonPayload.creationMode)"
  failure_stage: "EXTRACT(jsonPayload.failureStage)"
```

> **Note on percentile alerting**: Cloud Monitoring can alert on distribution metric percentiles
> using MQL (Monitoring Query Language). Example P2-10 alert condition:
> ```mql
> fetch generic_task::logging.googleapis.com/user/generation/story_duration_ms
> | align delta(1d)
> | every 1d
> | percentile(95)
> | condition val() > 180000  # 180s threshold for SJ-5 WARNING
> ```

---

### 3.6 Optional: Story Generation Attempt Metric

> **Status**: Optional. Only meaningful when `ENABLE_SCHEMA_REPAIR_RETRY=true`.  
> While repair retry is OFF (current state), this metric should always count zero.  
> Create it in P2-9 implementation so the metric stream exists before enabling the flag.

#### `generation/story_generation_attempts`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/story_generation_attempts` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Count `book_early_failed` events where `storyGenerationAttempts > 1` (retry was attempted). Zero while ENABLE_SCHEMA_REPAIR_RETRY is OFF. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="book_early_failed"
AND jsonPayload.storyGenerationAttempts>1
```

> `storyGenerationAttempts` is only present when `ENABLE_SCHEMA_REPAIR_RETRY=true` (P4-5 field).
> The filter will match zero events while the flag is OFF.

**YAML config**:
```yaml
name: "generation/story_generation_attempts"
description: >
  Counter for book_early_failed events where storyGenerationAttempts > 1 (retry was attempted).
  Only populated when ENABLE_SCHEMA_REPAIR_RETRY=true. Expected to be zero in normal production.
  Do NOT enable ENABLE_SCHEMA_REPAIR_RETRY until production data meets P4-15 §5 criteria.
filter: |
  jsonPayload.message="generation_event"
  AND jsonPayload.eventName="book_early_failed"
  AND jsonPayload.storyGenerationAttempts>1
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: "1"
  labels:
    - key: template_id
      valueType: STRING
    - key: story_json_failure_category
      valueType: STRING
labelExtractors:
  template_id: "EXTRACT(jsonPayload.templateId)"
  story_json_failure_category: "EXTRACT(jsonPayload.storyJsonFailureCategory)"
```

---

## 4. Creation Reference

### 4.1 Priority order

Create metrics in this order — prioritize the candidate gate metric first:

| Priority | Metric name | Reason |
|---|---|---|
| **1st** | `generation/candidate_allowed` | CG-1 alert depends on this; fire-on-first-event |
| **2nd** | `generation/schema_validation_failures` | SJ-1/SJ-2 alerts; broadest story JSON signal |
| **3rd** | `generation/book_outcomes_total` | Rate denominators for IM-1/IM-2 |
| **4th** | `generation/book_outcome_failed` | IM-1/IM-2 failure rate numerator |
| **5th** | `generation/page_failures_total` | Rate denominator for IM-3 through IM-8 |
| **6th** | `generation/page_e005_failures` | IM-3/IM-4 (most impactful page failure type) |
| **7th** | `generation/story_duration_ms` | SJ-5/SJ-6 latency alerts |
| After 7th | All remaining metrics | Complete the set |

### 4.2 gcloud CLI commands (simple counters, no labels)

These create the metrics without label extractors. For full label support, use the Cloud Console or REST API.

```bash
PROJECT=story-gen-8a769

# 1. Candidate gate (HIGHEST PRIORITY)
gcloud logging metrics create generation/candidate_allowed \
  --description="Counter: candidateAllowed=true in generation_started. Non-zero = CG-1 CRITICAL." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="generation_started" AND jsonPayload.candidateAllowed=true' \
  --project=$PROJECT

# 2. Schema validation failures
gcloud logging metrics create generation/schema_validation_failures \
  --description="Counter: book_early_failed with failureStage=schema_validation." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.failureStage="schema_validation"' \
  --project=$PROJECT

# 3. Story JSON sub-categories
gcloud logging metrics create generation/malformed_json_failures \
  --description="Counter: book_early_failed with storyJsonFailureCategory=malformed_json." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyJsonFailureCategory="malformed_json"' \
  --project=$PROJECT

gcloud logging metrics create generation/field_type_mismatch_failures \
  --description="Counter: book_early_failed with storyJsonFailureCategory=field_type_mismatch." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyJsonFailureCategory="field_type_mismatch"' \
  --project=$PROJECT

gcloud logging metrics create generation/schema_structural_failures \
  --description="Counter: book_early_failed with storyJsonFailureCategory=schema_structural." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyJsonFailureCategory="schema_structural"' \
  --project=$PROJECT

gcloud logging metrics create generation/story_json_unknown_failures \
  --description="Counter: book_early_failed with storyJsonFailureCategory=unknown." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyJsonFailureCategory="unknown"' \
  --project=$PROJECT

# 4. Book outcomes
gcloud logging metrics create generation/book_outcomes_total \
  --description="Counter: all book_outcome events. Denominator for readable/failure rate." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome"' \
  --project=$PROJECT

gcloud logging metrics create generation/book_outcome_failed \
  --description="Counter: book_outcome with bookStatus=failed." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome" AND jsonPayload.bookStatus="failed"' \
  --project=$PROJECT

gcloud logging metrics create generation/book_outcome_completed \
  --description="Counter: book_outcome with bookStatus=completed." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome" AND jsonPayload.bookStatus="completed"' \
  --project=$PROJECT

gcloud logging metrics create generation/book_outcome_partial_completed \
  --description="Counter: book_outcome with bookStatus=partial_completed." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_outcome" AND jsonPayload.bookStatus="partial_completed"' \
  --project=$PROJECT

# 5. Page image failures
gcloud logging metrics create generation/page_failures_total \
  --description="Counter: all page_image_failed events. Denominator for E005/TIMEOUT/5XX rates." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed"' \
  --project=$PROJECT

gcloud logging metrics create generation/page_e005_failures \
  --description="Counter: page_image_failed with errorCode=E005 (content-sensitivity rejection)." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed" AND jsonPayload.errorCode="E005"' \
  --project=$PROJECT

gcloud logging metrics create generation/page_timeout_failures \
  --description="Counter: page_image_failed with errorCode=TIMEOUT." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed" AND jsonPayload.errorCode="TIMEOUT"' \
  --project=$PROJECT

gcloud logging metrics create generation/page_provider5xx_failures \
  --description="Counter: page_image_failed with errorCode=PROVIDER_5XX." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_failed" AND jsonPayload.errorCode="PROVIDER_5XX"' \
  --project=$PROJECT

# 6. Story duration distribution (requires --value-extractor)
gcloud logging metrics create generation/story_duration_ms \
  --description="Distribution: storyDurationMs in ms from book_early_failed and book_outcome events." \
  --log-filter='jsonPayload.message="generation_event" AND (jsonPayload.eventName="book_early_failed" OR jsonPayload.eventName="book_outcome") AND jsonPayload.storyDurationMs>0' \
  --value-extractor='EXTRACT(jsonPayload.storyDurationMs)' \
  --project=$PROJECT

# 7. Optional: repair retry counter
gcloud logging metrics create generation/story_generation_attempts \
  --description="Counter: book_early_failed with storyGenerationAttempts>1. Meaningful only when ENABLE_SCHEMA_REPAIR_RETRY=true." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="book_early_failed" AND jsonPayload.storyGenerationAttempts>1' \
  --project=$PROJECT
```

### 4.3 Adding label extractors via Cloud Console

For the full label configuration defined in §3 (which gcloud CLI does not easily support via flags alone):

1. Go to Cloud Logging > Log-based Metrics in the Google Cloud Console for project `story-gen-8a769`
2. Click the metric name to edit it
3. Under "Labels" section, add each label key with:
   - **Label type**: String
   - **Field name**: e.g. `jsonPayload.resolvedImageModelProfile`
   - **Extraction regular expression**: `(.*)` (to extract the full value)
4. Save

Or use the Cloud Logging API method `projects.metrics.create` / `projects.metrics.update` with the full YAML config body.

### 4.4 Verification after creation

After creating each metric:

```bash
# List all created metrics
gcloud logging metrics list --project=story-gen-8a769

# Describe a specific metric
gcloud logging metrics describe generation/candidate_allowed --project=story-gen-8a769

# Verify in Cloud Monitoring (metric should appear within a few minutes)
# Navigate to: Cloud Monitoring > Metrics Explorer
# Metric: logging.googleapis.com/user/generation/candidate_allowed
# Confirm the metric time series appears (may show no data if no events yet)
```

---

## 5. Metrics Summary Table

| Metric name | Kind | P2-10 alert(s) | Priority |
|---|---|---|---|
| `generation/candidate_allowed` | Counter | CG-1 (CRITICAL) | ★★★ Highest |
| `generation/schema_validation_failures` | Counter | SJ-1, SJ-2 | ★★★ High |
| `generation/malformed_json_failures` | Counter | SJ-3 | ★★ Medium |
| `generation/field_type_mismatch_failures` | Counter | SJ-4 | ★★ Medium |
| `generation/schema_structural_failures` | Counter | (informational) | ★ Low |
| `generation/story_json_unknown_failures` | Counter | (informational) | ★ Low |
| `generation/book_outcomes_total` | Counter | IM-1, IM-2 (denominator) | ★★★ High |
| `generation/book_outcome_failed` | Counter | IM-1, IM-2 (numerator) | ★★★ High |
| `generation/book_outcome_completed` | Counter | (baseline signal) | ★ Low |
| `generation/book_outcome_partial_completed` | Counter | (trend signal) | ★ Low |
| `generation/page_failures_total` | Counter | IM-3–IM-8 (denominator) | ★★ Medium |
| `generation/page_e005_failures` | Counter | IM-3, IM-4 | ★★ Medium |
| `generation/page_timeout_failures` | Counter | IM-5, IM-6 | ★★ Medium |
| `generation/page_provider5xx_failures` | Counter | IM-7, IM-8 | ★ Low |
| `generation/story_duration_ms` | Distribution | SJ-5, SJ-6 | ★★ Medium |
| `generation/story_generation_attempts` | Counter | (zero while retry OFF) | Optional |

**Total**: 15 metrics (14 required + 1 optional)

---

## 6. Privacy and Safety Notes

### 6.1 What is safe to use as labels

| Field | Safe? | Reason |
|---|---|---|
| `bookId` | ✅ | System-generated UUID; no user-identifying information |
| `templateId` | ✅ | Template key (e.g. `"animals"`); no user data |
| `creationMode` | ✅ | One of 3 enum values; no user data |
| `resolvedImageModelProfile` | ✅ | Profile key (e.g. `"pro_consistent"`); no user data |
| `eventName` | ✅ | Constant per event type |
| `failureStage` | ✅ | Stage identifier; no user data |
| `errorCode` | ✅ | Normalized enum; no user data |
| `provider` | ✅ | `"replicate"` or `"openai"` |
| `primaryProfile` | ✅ | Profile key; no user data |

### 6.2 What must NOT be used as labels

| Field | Forbidden | Reason |
|---|---|---|
| `userId` | ❌ | Never in event payload (by design) |
| `bookStatus` (as raw label on distribution metrics) | ⚠️ Avoid | Use separate counter metrics per status instead |
| Any user-provided text | ❌ | Never in event payload (enforced by type signatures) |

### 6.3 Metric data retention

Cloud Monitoring retains metric data for 6 weeks (for DELTA metrics) by default.
This is sufficient for weekly SLO review cycles.

---

## 7. Naming Stability Contract

Once alert policies in P2-10 reference these metric names, renaming a metric requires:
1. Creating a new metric with the new name
2. Updating all referencing alert policies to use the new metric name
3. Deleting the old metric (optional, after policy update verified)

**Do not rename** the following metrics once P2-10 alert policies are live:
- `generation/candidate_allowed`
- `generation/schema_validation_failures`
- `generation/book_outcomes_total`
- `generation/book_outcome_failed`

---

## 8. References

| Document | Purpose |
|---|---|
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §5` | Alert automation plan; §5 = metric definitions precursor |
| `docs/GENERATION_SLO_THRESHOLD_POLICY.md` | Severity thresholds (Watch / Investigate / Incident) |
| `docs/GENERATION_SLO_RUNBOOK.md §14` | Alert automation status and operational procedure |
| `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` | Story JSON SLO definitions; §7.2 dev/test baseline |
| `functions/src/lib/generation-event-logger.ts` | Authoritative source for all event field names and types |
| `scripts/_export-cloud-logging.mjs` | Manual Cloud Logging export helper (proxy-aware, SA JWT auth) |
