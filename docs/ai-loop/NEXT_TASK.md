# NEXT_TASK.md

## Context
Phase 1 Production Smoke Result has been documented in `docs/smoke-results/PRODUCTION_SMOKE_RESULTS.md`.
The results indicate that while scheduler automation and Firestore infrastructure are stable, the generation SLO metrics (Readable Rate 97.1%, Image failure rate 5.7%, p95 latency 152s) are currently failing to meet the strict Phase 1 targets (>=98%, <=2%, <=120s).

## Objective
The "production smoke evidence pending" gate is technically closed as documentation now exists, but the status is FAIL.
The next step is to investigate the root causes of image reliability and latency regressions in production, and decide whether to calibrate thresholds or implement stability fixes.

## Recommended Follow-up Task
1. Investigate the cause of `partial_completed` books in production (Image failed rate 5.7%).
2. Perform latency analysis for the `pro_consistent` profile to understand why p95 exceeds 120s.
3. Update `docs/FINAL_DECISION.md` to reflect Phase 1 status as "FAIL/INVESTIGATING" and adjust Roadmap accordingly.
4. If stability improvements are required, prioritize Phase 2 Quality focus items that overlap with reliability (e.g., prompt stabilization).
