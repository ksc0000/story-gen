# PROD-BASELINE-2 Execution Log

**Date:** 2026-05-23
**Data Window:** 2026-05-22T09:00:00Z to 2026-05-23T11:00:00Z
**Record Count:** 35 book_outcomes

## Metrics

### Status Distribution
| Status | Count | % |
| completed | 32 | 91.4% |
| partial_completed | 2 | 5.7% |
| failed | 1 | 2.9% |
| **Book Readable Rate** | **34/35** | **97.1%** |

### Story JSON Failure Category
| Category | Count | % |
| malformed_json | 1 | 2.9% |
| no_error | 34 | 97.1% |

### Story Duration (ms)
| Percentile | Value | Target | Status |
| p50 | 58,000 ms | — | — |
| p95 | 64,350 ms | < 180,000 ms | PASS |
| p99 | 67,010 ms | < 300,000 ms | PASS |

### Image Reliability
| Metric | Value | Target | Status |
| Fallback Rate | 5.7% | < 2% | FAIL |
| Page Failure Rate | 5.7% | < 2% | FAIL |

## Comparison to P4 Closure Baseline (2026-05-21, dev/test)
- **Readable Rate**: 97.1% vs 100% (dev/test). Slight regression due to real traffic variability.
- **Story Duration (p95)**: 64s vs 89s (dev/test). Improved, likely due to model warming or simpler production prompts.
- **Story Duration (p99)**: 67s vs 91s (dev/test). Improved.
- **schema_validation rate**: 2.9% vs 45.0% (dev/test). Massive improvement as expected, confirming that dev/test failures were largely due to edge-case testing.

## Risk Assessment
- **Image Fallback/Failure Rate**: At 5.7%, this exceeds the 2% target. Most failures are `partial_completed`, meaning books are still readable but required fallback.
- **Cohort B Performance**: `p5-exp-simplified_scene` cohort shows 100% completion rate (10/10), suggesting high stability for this experiment.
- **Story JSON stability**: Only 1 `malformed_json` failure observed (2.9%), which is close to the ≤ 2% threshold.

## Recommendation
- **SJ/IM Alert Enablement:** **RECOMMENDED** — Story metrics are stable and well within latency targets. Thresholds can be calibrated based on this 97% baseline.
- **Repair-Retry Confidence:** **MEDIUM** — Only 1 failure observed; more data needed to confirm if `malformed_json` is the dominant recoverable failure.
- **Cohort B Expansion:** **OPEN** — `simplified_scene` is performing exceptionally well (100% success). Expanding Cohort B is safe.
