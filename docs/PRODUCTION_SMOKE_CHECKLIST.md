# Production Smoke Checklist

Purpose: confirm that Phase 1 Reliability First is working in production before marking the phase as complete.

Scope: production Firebase / Firestore / Admin UI checks for SLO snapshots, stale cleanup, regeneration, recovery, and failure handling.

---

## Deploy confirmation

- [ ] Production deployment completed successfully.
- [ ] Deployed Firebase Functions are using the expected production project.
- [ ] Deployed Admin UI is using the expected production Firebase config.
- [ ] No deployment-time errors are present in Firebase / Google Cloud logs.
- [ ] Required environment variables and secrets for image generation are configured in production.
- [ ] Latest production build includes Phase 1 Reliability First changes.

---

## Scheduled functions

- [ ] `saveDailySloSnapshot` is deployed.
- [ ] `saveDailySloSnapshot` is scheduled for daily 03:00 JST.
- [ ] `saveWeeklySloSnapshot` is deployed.
- [ ] `saveWeeklySloSnapshot` is scheduled for Monday 03:15 JST.
- [ ] `cleanupStaleGeneration` is deployed.
- [ ] `cleanupStaleGeneration` is scheduled for daily 03:30 JST.
- [ ] Cloud Scheduler timezone is `Asia/Tokyo` for all scheduled jobs.
- [ ] Scheduled functions region is `asia-northeast1`.
- [ ] Production logs show at least one successful `saveDailySloSnapshot` execution.
- [ ] Production logs show at least one successful `saveWeeklySloSnapshot` execution.
- [ ] Production logs show at least one successful `cleanupStaleGeneration` execution.
- [ ] No scheduled function fails due to timeout, permission, missing config, or region mismatch.

---

## Firestore permissions / indexes

- [ ] Daily SLO snapshots are written to `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}`.
- [ ] Weekly SLO snapshots are written to `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}`.
- [ ] Latest stale cleanup summary is written to `adminMetrics/staleCleanup`.
- [ ] Stale cleanup run history is written to `adminMetrics/staleCleanup/runs/{daily-YYYY-MM-DD-HHmm}`.
- [ ] Collection group query for `pages` where `status == generating` runs without errors.
- [ ] Required Firestore composite indexes are created and active.
- [ ] No `Firestore index required` error appears in production logs.
- [ ] Admin users can read `adminMetrics/{docId}/runs/{runId}`.
- [ ] Non-admin users cannot read admin metrics documents or run history.
- [ ] Firestore rules allow admin read access for SLO snapshots, stale cleanup summary, and cleanup runs.

---

## Admin SLO Dashboard

- [ ] Admin SLO Dashboard is visible in production.
- [ ] Book sample size selector works for 50 / 100 / 200.
- [ ] Book readable rate is displayed.
- [ ] Book hard failed rate is displayed.
- [ ] Page image p50 / p90 / p95 are displayed.
- [ ] Image failed rate is displayed.
- [ ] Timeout rate is displayed.
- [ ] Fallback rate is displayed.
- [ ] Regeneration metrics are displayed when data exists.
- [ ] Metrics load without permission errors.
- [ ] Empty or low-volume production data is handled gracefully.

---

## SLO Snapshot History

- [ ] Snapshot History is visible in production.
- [ ] Manual snapshots are displayed with source `manual`.
- [ ] Daily automatic snapshots are displayed with source `daily auto`.
- [ ] Weekly automatic snapshots are displayed with source `weekly auto`.
- [ ] Snapshot rows show created time, source, sample size, and major SLO metrics.
- [ ] Trend comparison is visible when previous snapshot data exists.
- [ ] Daily snapshot IDs are idempotent and do not create duplicate documents for the same date.
- [ ] Weekly snapshot IDs are idempotent and do not create duplicate documents for the same week.

---

## Stale Cleanup Status

- [ ] Stale Cleanup Status is visible in production Admin UI.
- [ ] Latest stale cleanup summary is displayed.
- [ ] Last run time is displayed.
- [ ] Detected stale generating pages count is displayed.
- [ ] Updated pages count is displayed.
- [ ] Error count is displayed.
- [ ] Recent cleanup runs table shows the latest 10 runs.
- [ ] Cleanup run rows include run time, status, checked count, updated count, and error count.
- [ ] UI handles no-run state gracefully before the first production execution.

---

## Regeneration / Recovery

- [ ] An `image_failed` page can be regenerated from the Admin UI.
- [ ] Successful regeneration updates the page image status and image metadata.
- [ ] `regenerationHistory` is saved for regenerated pages.
- [ ] `regenerationHistory` shows timestamp, status, duration, fallback, timeout, and failure reason when available.
- [ ] `partial_completed` book can be recovered to `completed` after failed pages are fixed.
- [ ] Manual completion check recalculates book status correctly.
- [ ] Recovery metadata is visible in the Admin UI.
- [ ] Regeneration failure does not corrupt existing successful page data.

---

## Failure handling

- [ ] Image generation timeout is recorded as timeout metadata.
- [ ] Fallback model usage is recorded when fallback is used.
- [ ] Failed image pages keep enough failure reason data for admin investigation.
- [ ] `partial_completed` is used when at least one readable page remains but one or more page images fail.
- [ ] Hard failed books are distinguishable from partial completed books.
- [ ] Stale `generating` pages are moved to `image_failed` by cleanup.
- [ ] Cleanup can be re-run safely without double-counting or corrupting page data.
- [ ] Scheduled functions are idempotent enough for at-least-once execution.
- [ ] Admin UI shows failure states without crashing.

---

## Acceptance criteria

Phase 1 Reliability First can be marked complete when all of the following are confirmed in production:

- [ ] Daily SLO snapshot execution has been confirmed at least once in production.
- [ ] Weekly SLO snapshot execution has been confirmed at least once in production.
- [ ] Stale cleanup execution has been confirmed at least once in production.
- [ ] No permission errors are present for scheduled functions, Admin UI metrics, SLO snapshots, cleanup summary, or cleanup runs.
- [ ] No `Firestore index required` errors are present in production logs.
- [ ] Admin UI shows the major production metrics required for Phase 1.
- [ ] Admin UI shows SLO Dashboard, Snapshot History, and Stale Cleanup Status.
- [ ] Production Firestore contains daily / weekly SLO snapshot documents.
- [ ] Production Firestore contains stale cleanup summary and at least one cleanup run document.
- [ ] `image_failed` page regeneration has been verified in production or production-equivalent data.
- [ ] `partial_completed` to `completed` recovery has been verified in production or production-equivalent data.
- [ ] Any remaining Phase 1 Reliability First items are explicitly tracked outside this smoke checklist.
