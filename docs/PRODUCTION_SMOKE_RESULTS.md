# Production Smoke Results

Production smoke checklist の実行結果・証跡・残課題を記録するためのテンプレート。

Related:

- [Production Smoke Checklist](./PRODUCTION_SMOKE_CHECKLIST.md)
- [Product Roadmap](./PRODUCT_ROADMAP.md)

Status values:

- `PASS`: 期待値どおり確認できた
- `FAIL`: 期待値を満たしていない、または blocker がある
- `N/A`: 今回の実行対象外、または確認データなし
- `NOT_RUN`: 未実行

Overall result values:

- `PASS`
- `PASS_WITH_FOLLOW_UP`
- `FAIL`
- `NOT_RUN`

---

## Summary

| Item | Value |
|---|---|
| 実行日 | YYYY-MM-DD |
| 実行者 |  |
| 対象環境 | production / staging / production-equivalent |
| Firebase project | `story-gen-8a769` |
| 対象 branch | main |
| 対象 commit SHA |  |
| checklist version |  |
| overall result | PASS / PASS_WITH_FOLLOW_UP / FAIL / NOT_RUN |
| 備考 |  |

| Check area | Result | Evidence / Notes | Issue / PR |
|---|---|---|---|
| Deploy Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| GitHub Actions / Build Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| Scheduled Functions Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| Firestore Rules / Index Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| Firestore Documents Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| Admin UI Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| Regeneration / Recovery Result | PASS / FAIL / N/A / NOT_RUN |  |  |
| Failure Handling Result | PASS / FAIL / N/A / NOT_RUN |  |  |

---

## Environment

| Item | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| Firebase project | `story-gen-8a769` |  | PASS / FAIL / N/A |  |
| Functions region | `asia-northeast1` |  | PASS / FAIL / N/A |  |
| Scheduler timezone | `Asia/Tokyo` |  | PASS / FAIL / N/A |  |
| Admin route | `/admin/book-quality-review` |  | PASS / FAIL / N/A |  |
| Hosting URL | production Hosting URL |  | PASS / FAIL / N/A |  |
| Firestore database | production database |  | PASS / FAIL / N/A |  |
| checked Firebase account | expected operator account |  | PASS / FAIL / N/A |  |

---

## Target Commit

| Item | Value | Result | Notes |
|---|---|---|---|
| commit SHA |  | PASS / FAIL / N/A |  |
| commit message |  | PASS / FAIL / N/A |  |
| branch |  | PASS / FAIL / N/A |  |
| pushed at |  | PASS / FAIL / N/A |  |
| GitHub Actions status | success / failed / skipped / unknown | PASS / FAIL / N/A |  |
| deployed | yes / no / unknown | PASS / FAIL / N/A |  |

---

## Deploy Result

Deploy command:

```bash
firebase deploy --only hosting,functions,firestore:rules,storage --project story-gen-8a769
```

| Deploy target | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| hosting | deployed |  | PASS / FAIL / N/A |  |
| functions | deployed |  | PASS / FAIL / N/A |  |
| firestore:rules | deployed |  | PASS / FAIL / N/A |  |
| storage | deployed |  | PASS / FAIL / N/A |  |

Optional targeted commands:

```bash
firebase deploy --only functions:saveDailySloSnapshot,functions:saveWeeklySloSnapshot,functions:cleanupStaleGeneration --project story-gen-8a769
firebase deploy --only firestore:rules --project story-gen-8a769
```

Notes:

- 

---

## GitHub Actions / Build Result

| Workflow name | Run URL | Commit SHA | Status | Failed step | Notes |
|---|---|---|---|---|---|
|  |  |  | success / failed / skipped / unknown |  |  |

Additional checks:

| Item | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| Build result | success |  | PASS / FAIL / N/A |  |
| Lint result | success / not required |  | PASS / FAIL / N/A |  |
| Typecheck result | success / not required |  | PASS / FAIL / N/A |  |
| Target commit SHA matches deployed build | yes |  | PASS / FAIL / N/A |  |

---

## Scheduled Functions Result

| Function | Expected | Last run | Next run | Result | Notes |
|---|---|---|---|---|---|
| `saveDailySloSnapshot` | daily 03:00 JST |  |  | PASS / FAIL / N/A |  |
| `saveWeeklySloSnapshot` | Monday 03:15 JST |  |  | PASS / FAIL / N/A |  |
| `cleanupStaleGeneration` | daily 03:30 JST |  |  | PASS / FAIL / N/A |  |

Confirmation items:

| Item | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| Cloud Scheduler job exists | yes |  | PASS / FAIL / N/A |  |
| timezone is `Asia/Tokyo` | yes |  | PASS / FAIL / N/A |  |
| region is `asia-northeast1` | yes |  | PASS / FAIL / N/A |  |
| at least one successful execution confirmed | yes |  | PASS / FAIL / N/A |  |
| no runtime errors in logs | yes |  | PASS / FAIL / N/A |  |

---

## Firestore Rules / Index Result

### Rules

| Rule check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| `adminMetrics/sloSnapshots/items` admin read | allowed |  | PASS / FAIL / N/A |  |
| `adminMetrics/staleCleanup` admin read | allowed |  | PASS / FAIL / N/A |  |
| `adminMetrics/staleCleanup/runs` admin read | allowed |  | PASS / FAIL / N/A |  |
| `regenerationHistory` admin read | allowed |  | PASS / FAIL / N/A |  |
| non-admin `adminMetrics` read/write | denied |  | PASS / FAIL / N/A |  |
| client write to runs | denied |  | PASS / FAIL / N/A |  |

### Indexes

| Index check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| collection group | `pages` |  | PASS / FAIL / N/A |  |
| filter | `status == "generating"` |  | PASS / FAIL / N/A |  |
| index required error | no | yes / no / unknown | PASS / FAIL / N/A |  |
| index status | Enabled / Not Required | Enabled / Building / Not Required / Unknown | PASS / FAIL / N/A |  |

---

## Firestore Documents Result

| Path | Exists | Key fields checked | Result | Notes |
|---|---|---|---|---|
| `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}` | yes / no / N/A | `snapshotKey`, `source`, `window`, `sampleSize`, `sampleUnit`, `createdAtMs`, `updatedAtMs`, `readableRate`, `hardFailedRate`, `imageP95Ms`, `imageFailureRate`, `timeoutRate` | PASS / FAIL / N/A |  |
| `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}` | yes / no / N/A | `snapshotKey`, `source`, `window`, `sampleSize`, `sampleUnit`, `createdAtMs`, `updatedAtMs`, `readableRate`, `hardFailedRate`, `imageP95Ms`, `imageFailureRate`, `timeoutRate` | PASS / FAIL / N/A |  |
| `adminMetrics/staleCleanup` | yes / no / N/A | `lastRunAtMs`, `lastSummary.checkedPages`, `lastSummary.updatedPages`, `lastSummary.updatedBooks`, `lastSummary.skippedPages`, `lastSummary.skippedBooks` | PASS / FAIL / N/A |  |
| `adminMetrics/staleCleanup/runs/{daily-YYYY-MM-DD-HHmm}` | yes / no / N/A | run summary fields | PASS / FAIL / N/A |  |
| `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` | yes / no / N/A | `attemptedAtMs`, `attemptedBy`, `beforeStatus`, `afterStatus`, `success`, `durationMs`, `failureReason` | PASS / FAIL / N/A |  |

---

## Admin UI Result

Route: `/admin/book-quality-review`

| Check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| SLO Dashboard visible | yes |  | PASS / FAIL / N/A |  |
| sample size selector works | 50 / 100 / 200 |  | PASS / FAIL / N/A |  |
| Snapshot History visible | yes |  | PASS / FAIL / N/A |  |
| manual source visible | yes |  | PASS / FAIL / N/A |  |
| daily auto source visible | yes |  | PASS / FAIL / N/A |  |
| weekly auto source visible | yes |  | PASS / FAIL / N/A |  |
| Timeout column visible | yes |  | PASS / FAIL / N/A |  |
| Sample column visible | yes |  | PASS / FAIL / N/A |  |
| Stale Cleanup Status visible | yes |  | PASS / FAIL / N/A |  |
| cleanup run history visible | latest 10 |  | PASS / FAIL / N/A |  |
| no permission denied | yes |  | PASS / FAIL / N/A |  |
| no UI crash | yes |  | PASS / FAIL / N/A |  |

---

## Regeneration / Recovery Result

| Scenario | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| `image_failed` page regeneration | succeeds |  | PASS / FAIL / N/A |  |
| `regenerationHistory` created | yes |  | PASS / FAIL / N/A |  |
| page status after regeneration | `completed` / `fallback_completed` |  | PASS / FAIL / N/A |  |
| book metrics updated | yes |  | PASS / FAIL / N/A |  |
| `partial_completed` to `completed` recovery | succeeds |  | PASS / FAIL / N/A |  |
| `Check completion` button | works |  | PASS / FAIL / N/A |  |
| recovery metadata updated | `recoveredFromPartialCompleted`, `recoveredAtMs`, `lastCompletionCheckedAtMs` |  | PASS / FAIL / N/A |  |

---

## Failure Handling Result

| Check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| fallback metadata | `imageFallbackUsed` recorded when fallback used |  | PASS / FAIL / N/A |  |
| timeout metadata | `imageFailureReason`, `imageTimeoutCount`, `imageRetryable` recorded |  | PASS / FAIL / N/A |  |
| stale generating page cleanup | stale `generating` becomes `image_failed` |  | PASS / FAIL / N/A |  |
| book metrics recalculation after cleanup | metrics updated |  | PASS / FAIL / N/A |  |
| no data corruption after retry | existing successful data preserved |  | PASS / FAIL / N/A |  |
| known issues | documented |  | PASS / FAIL / N/A |  |

---

## Issues Found

| ID | Severity | Area | Description | Evidence / URL | Owner | Status | Follow-up issue / PR |
|---|---|---|---|---|---|---|---|
|  | High / Medium / Low |  |  |  |  | open / in progress / closed |  |

---

## Follow-up Actions

| Action | Owner | Due date | Priority | Related issue / PR | Status |
|---|---|---|---|---|---|
|  |  |  | High / Medium / Low |  | open / in progress / done |

---

## Final Decision

Select one:

- [ ] Phase 1 Complete
- [ ] Phase 1 Complete with follow-up
- [ ] Phase 1 Not Complete

Decision reason:

```md
Decision: <Phase 1 Complete / Phase 1 Complete with follow-up / Phase 1 Not Complete>
Date: YYYY-MM-DD
Commit SHA: <sha>
Firebase project: story-gen-8a769
Reason:
- <reason 1>
- <reason 2>
Issues:
- <issue or none>
Follow-up:
- <action or none>
```
