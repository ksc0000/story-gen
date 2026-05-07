# Production Smoke Results

Production smoke checklist の実行結果を記録するためのテンプレート。

Reference:

- [Production Smoke Checklist](./PRODUCTION_SMOKE_CHECKLIST.md)
- [Product Roadmap](./PRODUCT_ROADMAP.md)

---

## Execution Metadata

| Item | Value |
|---|---|
| 実行日 | YYYY-MM-DD |
| 実行者 |  |
| 対象環境 | production / staging / production-equivalent |
| 対象 commit SHA |  |
| Firebase project | `story-gen-8a769` |
| Functions region | `asia-northeast1` |
| Scheduler timezone | `Asia/Tokyo` |
| Admin route | `/admin/book-quality-review` |
| Checklist version / commit |  |
| 備考 |  |

Status values:

- `PASS`: 期待値どおり確認できた
- `FAIL`: 期待値を満たしていない、または blocker がある
- `N/A`: 今回の実行対象外、または確認データなし

---

## Summary

| Check area | Status | Evidence / Notes | Issue ID / Link |
|---|---|---|---|
| Deploy Result |  |  |  |
| GitHub Actions / Build Result |  |  |  |
| Scheduled Functions Result |  |  |  |
| Firestore Rules / Index Result |  |  |  |
| Admin UI Result |  |  |  |
| Regeneration / Recovery Result |  |  |  |
| Failure Handling Result |  |  |  |
| Final Decision |  |  |  |

Overall notes:

- 

---

## Environment

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Firebase project | `story-gen-8a769` |  |  |  |
| Functions region | `asia-northeast1` |  |  |  |
| Scheduler timezone | `Asia/Tokyo` |  |  |  |
| Admin route | `/admin/book-quality-review` |  |  |  |
| Target commit SHA | recorded |  |  |  |
| Admin user available | yes |  |  |  |
| Non-admin user available | yes |  |  |  |
| Test `image_failed` page available | yes |  |  |  |
| Test `partial_completed` book available | yes |  |  |  |

Notes:

- 

---

## Deploy Result

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Firebase deploy | success |  |  |  |
| Hosting deploy | deployed |  |  |  |
| Functions deploy | deployed |  |  |  |
| Firestore rules deploy | deployed |  |  |  |
| Storage rules deploy | deployed |  |  |  |
| Production Admin UI uses latest build | yes |  |  |  |
| Deploy project | `story-gen-8a769` |  |  |  |

Commands used:

```bash
# Full deploy
firebase deploy --only hosting,functions,firestore:rules,storage --project story-gen-8a769

# Optional targeted deploy
firebase deploy --only functions:saveDailySloSnapshot,functions:saveWeeklySloSnapshot,functions:cleanupStaleGeneration --project story-gen-8a769
firebase deploy --only firestore:rules --project story-gen-8a769
```

Notes:

- 

---

## GitHub Actions / Build Result

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| GitHub Actions status | success |  |  |  |
| Build result | success |  |  |  |
| Lint result | success / not required |  |  |  |
| Typecheck result | success / not required |  |  |  |
| Target commit SHA matches deployed build | yes |  |  |  |

Commands / links:

- GitHub Actions run: 
- Build command: 
- Lint command: 
- Typecheck command: 

Notes:

- 

---

## Scheduled Functions Result

| Function | Expected schedule | Expected timezone | Expected region | Last execution | Status | Evidence / Notes |
|---|---|---|---|---|---|---|
| `saveDailySloSnapshot` | `0 3 * * *` / daily 03:00 JST | `Asia/Tokyo` | `asia-northeast1` |  |  |  |
| `saveWeeklySloSnapshot` | `15 3 * * 1` / Monday 03:15 JST | `Asia/Tokyo` | `asia-northeast1` |  |  |  |
| `cleanupStaleGeneration` | `30 3 * * *` / daily 03:30 JST | `Asia/Tokyo` | `asia-northeast1` |  |  |  |

Execution confirmation:

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Cloud Scheduler jobs registered | 3 jobs |  |  |  |
| Daily snapshot execution confirmed | at least once |  |  |  |
| Weekly snapshot execution confirmed | at least once |  |  |  |
| Cleanup execution confirmed | at least once |  |  |  |
| Functions logs have no scheduler runtime error | no errors |  |  |  |
| Functions logs have no permission denied | no errors |  |  |  |

Notes:

- 

---

## Firestore Rules / Index Result

### Permission checks

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Admin can read `adminMetrics/sloSnapshots/items` | allowed |  |  |  |
| Admin can read `adminMetrics/staleCleanup` | allowed |  |  |  |
| Admin can read `adminMetrics/staleCleanup/runs` | allowed |  |  |  |
| Admin can read `regenerationHistory` | allowed |  |  |  |
| Non-admin can read `adminMetrics` | denied |  |  |  |
| Non-admin can write `adminMetrics` | denied |  |  |  |
| Client can write `adminMetrics/staleCleanup/runs` | denied |  |  |  |

### Index checks

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Collection group query | `pages` |  |  |  |
| Query filter | `status == "generating"` |  |  |  |
| Function | `cleanupStaleGeneration` |  |  |  |
| `Firestore index required` in logs | none |  |  |  |
| `FAILED_PRECONDITION` in logs | none |  |  |  |
| Required index status | `Enabled` |  |  |  |

### Firestore document checks

| Path | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}` | exists |  |  |  |
| `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}` | exists |  |  |  |
| `adminMetrics/staleCleanup` | exists |  |  |  |
| `adminMetrics/staleCleanup/runs/{daily-YYYY-MM-DD-HHmm}` | exists |  |  |  |
| `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` | exists after regeneration |  |  |  |

Notes:

- 

---

## Admin UI Result

Admin route:

- `/admin/book-quality-review`

### SLO Dashboard

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| SLO Dashboard visible | yes |  |  |  |
| total books visible | yes |  |  |  |
| total pages visible | yes |  |  |  |
| readable rate visible | yes |  |  |  |
| hard failed rate visible | yes |  |  |  |
| image p95 visible | yes |  |  |  |
| timeout rate visible | yes |  |  |  |
| sample size 50 works | yes |  |  |  |
| sample size 100 works | yes |  |  |  |
| sample size 200 works | yes |  |  |  |

### Snapshot History

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Snapshot History visible | yes |  |  |  |
| `manual` source visible | yes |  |  |  |
| `daily auto` source visible | yes |  |  |  |
| `weekly auto` source visible | yes |  |  |  |
| `Source` column visible | yes |  |  |  |
| `Timeout` column visible | yes |  |  |  |
| `Sample` column visible | yes |  |  |  |

### Stale Cleanup Status

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| Stale Cleanup Status visible | yes |  |  |  |
| last run visible | yes |  |  |  |
| checkedPages visible | yes |  |  |  |
| checkedBooks visible | yes |  |  |  |
| updatedPages visible | yes |  |  |  |
| updatedBooks visible | yes |  |  |  |
| skippedPages visible | yes |  |  |  |
| skippedBooks visible | yes |  |  |  |
| latest 10 runs visible | yes |  |  |  |

Notes:

- 

---

## Regeneration / Recovery Result

### Regeneration

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| `image_failed` page selected | yes |  |  |  |
| Admin UI regeneration action succeeds | yes |  |  |  |
| page.status after regeneration | `completed` or `fallback_completed` |  |  |  |
| page image metadata updated | yes |  |  |  |
| `regenerationHistory` created | yes |  |  |  |
| `attemptedAtMs` saved | yes |  |  |  |
| `attemptedBy` saved | yes |  |  |  |
| `beforeStatus` saved | yes |  |  |  |
| `afterStatus` saved | yes |  |  |  |
| `success` saved | yes |  |  |  |
| `durationMs` saved | yes |  |  |  |
| `failureReason` saved when failed | yes / N/A |  |  |  |

### Recovery

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| `partial_completed` book selected | yes |  |  |  |
| failed pages regenerated | yes |  |  |  |
| `Check completion` button works | yes |  |  |  |
| Book metrics updated | yes |  |  |  |
| book.status after recovery | `completed` |  |  |  |
| `recoveredFromPartialCompleted` updated | yes |  |  |  |
| `recoveredAtMs` updated | yes |  |  |  |
| `lastCompletionCheckedAtMs` updated | yes |  |  |  |

Notes:

- 

---

## Failure Handling Result

| Item | Expected | Actual | Status | Evidence / Notes |
|---|---|---|---|---|
| fallback model usage recorded | `imageFallbackUsed` saved |  |  |  |
| timeout failure reason recorded | `imageFailureReason` saved |  |  |  |
| timeout count recorded | `imageTimeoutCount` saved |  |  |  |
| retryable flag recorded | `imageRetryable` saved |  |  |  |
| old generating page cleaned up | status becomes `image_failed` |  |  |  |
| cleanup recalculates book metrics | metrics updated |  |  |  |
| partial completed and hard failed distinguishable | yes |  |  |  |
| Admin UI handles failure state | no crash |  |  |  |

Notes:

- 

---

## Issues Found

| ID | Severity | Area | Description | Evidence / Link | Owner | Status |
|---|---|---|---|---|---|---|
|  | blocker / major / minor |  |  |  |  | open / closed |

Severity guide:

- `blocker`: Phase 1 Complete 判定不可
- `major`: Phase 1 Complete with follow-up の候補
- `minor`: Phase 1 完了後に改善可能

Notes:

- 

---

## Follow-up Actions

| Action | Reason | Owner | Due date | Linked issue / PR | Status |
|---|---|---|---|---|---|
|  |  |  |  |  | open / in progress / done |

Notes:

- 

---

## Final Decision

Select one:

- [ ] Phase 1 Complete
- [ ] Phase 1 Complete with follow-up
- [ ] Phase 1 Not Complete

Decision criteria:

| Decision | Meaning |
|---|---|
| Phase 1 Complete | Acceptance criteria をすべて満たし、blocker / major issue がない。 |
| Phase 1 Complete with follow-up | 本番運用上の blocker はないが、minor / non-blocking follow-up が残る。 |
| Phase 1 Not Complete | blocker が残り、Phase 1 を完了扱いにできない。 |

Decision note:

```md
Decision: <Phase 1 Complete / Phase 1 Complete with follow-up / Phase 1 Not Complete>
Date: YYYY-MM-DD
Commit SHA: <sha>
Firebase project: story-gen-8a769
Summary:
- <summary item 1>
- <summary item 2>
Issues:
- <issue or none>
Follow-up:
- <action or none>
```
