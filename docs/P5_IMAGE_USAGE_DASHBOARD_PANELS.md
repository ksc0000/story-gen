# P5 Image Usage Monitoring Dashboard

**Status**: ⬜ DEFINED (Pending implementation in Cloud Console)
**Created**: 2026-06-14
**Firebase project**: `story-gen-8a769`

---

## 1. Purpose

The Image Usage Monitoring Dashboard provides visibility into the consumption and performance of different image generation models and providers.
It enables:
- Cost monitoring by counting usage per model.
- Provider comparison (Replicate vs OpenAI) in terms of volume and latency.
- Performance tracking (p95 latency) per model profile.

---

## 2. Layout Overview

Recommended dashboard name: `Ehoria Image Generation Usage`

| Row | Panel | Metric | Group By | Chart Type |
|---|---|---|---|---|
| 1 | **Total Usage by Provider** | `page_successes_total` | `provider` | Pie Chart |
| 1 | **Total Usage by Model** | `page_successes_total` | `image_model` | Horizontal Bar |
| 2 | **Usage Trend by Profile** | `page_successes_total` | `image_model_profile` | Stacked Area (1h) |
| 3 | **Latency p95 by Profile** | `page_image_duration_ms` | `image_model_profile` | XY Chart (Line) |
| 3 | **Latency p50 by Profile** | `page_image_duration_ms` | `image_model_profile` | XY Chart (Line) |

---

## 3. Panel Definitions

### Panel 1 — Total Usage by Provider

| Property | Value |
|---|---|
| **Title** | Usage by Provider (Total) |
| **Metric** | `logging.googleapis.com/user/generation/page_successes_total` |
| **Aggregation** | `ALIGN_DELTA` (sum), `REDUCE_SUM` |
| **Group By** | `provider` |
| **Chart type** | Pie Chart |

---

### Panel 2 — Total Usage by Model

| Property | Value |
|---|---|
| **Title** | Usage by Model (Total) |
| **Metric** | `logging.googleapis.com/user/generation/page_successes_total` |
| **Aggregation** | `ALIGN_DELTA` (sum), `REDUCE_SUM` |
| **Group By** | `image_model` |
| **Chart type** | Horizontal Bar Chart |

---

### Panel 3 — Usage Trend by Profile

| Property | Value |
|---|---|
| **Title** | Usage Trend by Profile |
| **Metric** | `logging.googleapis.com/user/generation/page_successes_total` |
| **Aggregation** | `ALIGN_DELTA` (sum over 1h), `REDUCE_SUM` |
| **Group By** | `image_model_profile` |
| **Chart type** | Stacked Area Chart |

---

### Panel 4 — Latency p95 by Profile

| Property | Value |
|---|---|
| **Title** | Latency p95 by Profile |
| **Metric** | `logging.googleapis.com/user/generation/page_image_duration_ms` |
| **Aggregation** | `ALIGN_PERCENTILE_95` (1h) |
| **Group By** | `image_model_profile` |
| **Chart type** | XY Chart (Line) |
| **Threshold** | 120,000 ms (SLO) |

---

### Panel 5 — Latency p50 by Profile

| Property | Value |
|---|---|
| **Title** | Latency p50 (Median) by Profile |
| **Metric** | `logging.googleapis.com/user/generation/page_image_duration_ms` |
| **Aggregation** | `ALIGN_PERCENTILE_50` (1h) |
| **Group By** | `image_model_profile` |
| **Chart type** | XY Chart (Line) |

---

## 4. Usage Guide

### Monthly Cost Review
1. Set time range to **Last 30 days**.
2. Check **Total Usage by Model**.
3. Multiply counts by provider unit costs to estimate monthly spend.

### Provider Latency Comparison
1. Check **Latency p95 by Profile**.
2. Compare `openai_mini`/`openai_standard` vs `pro_consistent`/`klein_fast`.
3. High latency in specific profiles may justify adjusting plan defaults or fallback strategies.
