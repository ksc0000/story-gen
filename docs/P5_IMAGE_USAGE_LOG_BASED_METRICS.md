# P5 Image Usage Log-Based Metrics

**Status**: ⬜ DEFINED (Pending implementation)
**Created**: 2026-06-14
**Firebase project**: `story-gen-8a769`

---

## 1. Overview

This document defines the Cloud Monitoring log-based metrics for image generation usage monitoring and provider cost comparison.
These metrics supplement the SLO metrics defined in `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` by focusing on successful outcomes and model-level attribution.

### Source events

All metrics filter on:
```
jsonPayload.message="generation_event"
```

Events are emitted by `functions/src/lib/generation-event-logger.ts` and call sites in `generate-book.ts`, `imageGeneration.ts`, and `regenerate-page-image.ts`.

---

## 2. Metric Definitions

### 2.1 Image Success Metric

#### `generation/page_successes_total`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/page_successes_total` |
| **Kind** | Counter (DELTA / INT64) |
| **Purpose** | Count successful image generations (pages and covers). Used for volume-based cost estimation. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_succeeded"
```

**Labels**:

| Label key | Extractor | Notes |
|---|---|---|
| `provider` | `EXTRACT(jsonPayload.provider)` | `"replicate"` or `"openai"` |
| `image_model` | `EXTRACT(jsonPayload.imageModel)` | Actual model string (e.g. `black-forest-labs/flux-2-pro`) |
| `image_model_profile` | `EXTRACT(jsonPayload.imageModelProfile)` | Profile used (e.g. `pro_consistent`) |
| `fallback_used` | `EXTRACT(jsonPayload.fallbackUsed)` | `"true"` or `"false"` |

---

### 2.2 Image Latency Metric

#### `generation/page_image_duration_ms`

| Property | Value |
|---|---|
| **Full metric type** | `logging.googleapis.com/user/generation/page_image_duration_ms` |
| **Kind** | Distribution (DELTA / DISTRIBUTION) |
| **Unit** | `ms` |
| **Purpose** | Latency distribution of successful image generations. |

**Filter**:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="page_image_succeeded"
```

**Value extractor**:
```
EXTRACT(jsonPayload.durationMs)
```

**Bucket options** (explicit, in milliseconds):
```
[0, 5000, 10000, 20000, 30000, 45000, 60000, 90000, 120000, 180000, 300000]
```

**Labels**:

| Label key | Extractor | Notes |
|---|---|---|
| `provider` | `EXTRACT(jsonPayload.provider)` | `"replicate"` or `"openai"` |
| `image_model` | `EXTRACT(jsonPayload.imageModel)` | Actual model string |
| `image_model_profile` | `EXTRACT(jsonPayload.imageModelProfile)` | Profile used |

---

## 3. Creation Reference (gcloud Commands)

```bash
PROJECT=story-gen-8a769

# 1. Page Success Counter
gcloud logging metrics create generation/page_successes_total \
  --description="Counter for successful image generations (initial and regen)." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_succeeded"' \
  --project=$PROJECT

# 2. Page Image Duration Distribution
gcloud logging metrics create generation/page_image_duration_ms \
  --description="Distribution of successful image generation latency." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="page_image_succeeded"' \
  --value-extractor='EXTRACT(jsonPayload.durationMs)' \
  --project=$PROJECT
```

> **Note**: For full label support (extractors), use the Cloud Console or Cloud Logging API.
> See `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §4.3` for the Console procedure.
