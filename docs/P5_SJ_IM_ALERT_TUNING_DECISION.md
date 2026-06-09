# P5_SJ_IM_ALERT_TUNING_DECISION.md — SJ/IM Alert Policy Tuning

**Status**: FINALIZED (2026-06-09)
**Decision Date**: 2026-06-09
**Based on**: P5-4 Production Baseline (2026-05-23)
**Implementation**: Enabled SJ-1..SJ-4, IM-1..IM-9

---

## 1. Summary

This document records the final tuning decisions for the 13 Story JSON (SJ) and Image Generation (IM) alert policies. These policies have been tuned based on the P5-4 production baseline and are now enabled to support the Cohort B rollout and wider Phase 1 operations.

---

## 2. Production Baseline Data (P5-4)

The baseline was established between 2026-05-22 and 2026-05-23 during limited Cohort A/B rollout.

- **Data Source**: Production users (Cohort A + Cohort B limited)
- **Total `book_outcome` events**: 35
- **Average Volume**: ~17.5 books/day (baseline used for tuning: **20 books/day**)

| Metric | Value | SLO Target | Baseline Status |
|---|---|---|---|
| schema_validation rate | 1/35 = **2.9%** | ≤ 2% | ⚠️ Slightly above |
| malformed_json rate | 1/35 = **2.9%** | ≤ 1% | ⚠️ Slightly above |
| field_type_mismatch rate | 0% | ≤ 0.5% | ✅ Healthy |
| Readable rate | 34/35 = **97.1%** | ≥ 98% | ⚠️ Slightly below |
| storyDurationMs p95 | **64.3s** | ≤ 120s | ✅ Healthy |
| page_image_failed rate | 2/35 = **5.7%** | ≤ 2% | ⚠️ Above |

---

## 3. Tuning Decisions

Thresholds are set to alert on significant regressions from the baseline while minimizing noise from single transient failures.

### 3.1 Story JSON (SJ) Alerts

| ID | Description | Formula (20/day) | Threshold | Rationale |
|---|---|---|---|---|
| **SJ-1** | schema_validation WARNING | > 5% / 24h | **> 1** (2+) | Alert if failure rate doubles from 2.9% baseline. Avoids noise on single error. |
| **SJ-2** | schema_validation CRITICAL | > 10% / 24h | **> 2** (3+) | Alert if failure rate reaches 15% (severe regression). |
| **SJ-3** | malformed_json WARNING | > 2% / 24h | **> 0** (1+) | Baseline is 2.9% (1 error). Any recurrence alerts. |
| **SJ-4** | field_type_mismatch WARNING | > 1% / 24h | **> 0** (1+) | Baseline is 0%. Any occurrence alerts for prompt regressions. |

### 3.2 Image Generation (IM) Alerts

| ID | Description | Formula (20/day) | Threshold | Rationale |
|---|---|---|---|---|
| **IM-1** | Readable rate WARNING | < 98% / 24h | **> 0** (1+) | Alert on any failed book (1/20 = 5% failure). |
| **IM-2** | Readable rate CRITICAL | < 95% / 24h | **> 1** (2+) | Alert on 10% failure rate. |
| **IM-3** | E005 failures WARNING | > 10% failures | **> 0** (1+) | Any safety rejection is worth investigation. |
| **IM-4** | E005 failures CRITICAL | > 30% failures | **> 1** (2+) | Clustered safety rejections indicate prompt/style issues. |
| **IM-5** | TIMEOUT failures WARNING | > 25% failures | **> 1** (2+) | Baselined against typical provider latency jitter. |
| **IM-6** | TIMEOUT failures CRITICAL | > 50% failures | **> 2** (3+) | Indicates major provider degradation. |
| **IM-7** | PROVIDER_5XX ANY | Any / 1h | **> 0** (1+) | Visibility on provider health. |
| **IM-8** | PROVIDER_5XX SUSTAINED | > 1 / 1h | **> 1** (2+) | Sustained 5xx requires incident check. |
| **IM-9** | Page failure spike | > 2 / 1h | **> 2** (3+) | Rapid failure detection within a single user session. |

---

## 4. Notification Strategy

- **Channel**: Reuse existing `CG-1` email notification channel.
- **Recipient**: `kikushun0529@gmail.com`
- **Severity Mapping**:
  - `CRITICAL` alerts require immediate investigation (Incident).
  - `WARNING` alerts are reviewed daily during soft launch.

---

## 5. Review and Iteration

These thresholds will be reviewed after:
1. **Completion of Cohort B limited rollout** (next 10 books).
2. **Phase 1 soft launch** (expected 100+ books).

If the volume increases significantly (e.g., > 100 books/day), absolute count thresholds must be updated to maintain the intended percentage ratios.

---

**Operator Signature**: AI Agent Jules (2026-06-09)
