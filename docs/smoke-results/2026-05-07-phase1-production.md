# Production Smoke Result — 2026-05-07 Phase 1 Production

このファイルは production smoke test 実行結果の記録ファイル。

Template:

- [Production Smoke Results Template](../PRODUCTION_SMOKE_RESULTS.md)

Checklist:

- [Production Smoke Checklist](../PRODUCTION_SMOKE_CHECKLIST.md)

Evidence / Notes には、確認後に以下のような証跡を記録する。

- GitHub Actions run URL
- Firebase deploy output
- Cloud Scheduler last run / next run
- Functions logs URL または log timestamp
- Firestore document path
- Admin UI route / screenshot

---

## Summary

| Item | Value |
|---|---|
| 実行日 | 2026-05-07 |
| 実行者 |  |
| 対象環境 | production |
| Firebase project | `story-gen-8a769` |
| 対象 branch | main |
| 対象 commit SHA | `a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1` |
| checklist version | `docs/PRODUCTION_SMOKE_CHECKLIST.md` |
| overall result | NOT_RUN |
| 備考 | Production smoke 未実行。確認済み項目はまだないため、各 result は NOT_RUN / N/A を維持する。 |

| Check area | Result | Evidence / Notes | Issue / PR |
|---|---|---|---|
| Deploy Result | NOT_RUN | Firebase deploy output を記録予定 |  |
| GitHub Actions / Build Result | NOT_RUN | GitHub Actions run URL を記録予定 |  |
| Scheduled Functions Result | NOT_RUN | Cloud Scheduler last run / next run、Functions logs を記録予定 |  |
| Firestore Rules / Index Result | NOT_RUN | Firebase Console / Firestore rules / Functions logs を記録予定 |  |
| Firestore Documents Result | NOT_RUN | Firestore document path を記録予定 |  |
| Admin UI Result | NOT_RUN | `/admin/book-quality-review` route / screenshot を記録予定 |  |
| Regeneration / Recovery Result | NOT_RUN | Admin UI 操作結果、Firestore path、Functions logs を記録予定 |  |
| Failure Handling Result | NOT_RUN | Functions logs、Firestore metadata、cleanup result を記録予定 |  |

---

## Environment

| Item | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| Firebase project | `story-gen-8a769` | `story-gen-8a769` | NOT_RUN | production project として記録済み。Firebase Console での確認は未実行。 |
| Functions region | `asia-northeast1` |  | NOT_RUN | Functions list / deploy output で確認予定。 |
| Scheduler timezone | `Asia/Tokyo` |  | NOT_RUN | Cloud Scheduler job detail で確認予定。 |
| Admin route | `/admin/book-quality-review` |  | NOT_RUN | Admin UI で確認予定。 |
| Hosting URL | production Hosting URL |  | NOT_RUN | Firebase Hosting / browser で確認予定。 |
| Firestore database | production database |  | NOT_RUN | Firebase Console で確認予定。 |
| checked Firebase account | expected operator account |  | NOT_RUN | 実行者アカウント確認予定。 |

---

## Target Commit

| Item | Value | Result | Notes |
|---|---|---|---|
| commit SHA | `a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1` | NOT_RUN | 対象 commit として記録。deployed confirmation は未実行。 |
| commit message | `docs: refine production smoke results template` | NOT_RUN | GitHub commit page で確認予定。 |
| branch | `main` | NOT_RUN | GitHub branch / deploy target で確認予定。 |
| pushed at |  | NOT_RUN | GitHub commit metadata で確認予定。 |
| GitHub Actions status | unknown | NOT_RUN | GitHub Actions run URL を記録予定。 |
| deployed | unknown | NOT_RUN | Firebase deploy output / Hosting version で確認予定。 |

---

## Deploy Result

| Deploy target | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| hosting | deployed |  | NOT_RUN | Firebase deploy output を記録予定。 |
| functions | deployed |  | NOT_RUN | `saveDailySloSnapshot`, `saveWeeklySloSnapshot`, `cleanupStaleGeneration` を含むか確認予定。 |
| firestore:rules | deployed |  | NOT_RUN | rules release / deploy output を確認予定。 |
| storage | deployed |  | NOT_RUN | storage rules deploy output を確認予定。 |

---

## GitHub Actions / Build Result

| Workflow name | Run URL | Commit SHA | Status | Failed step | Notes |
|---|---|---|---|---|---|
|  |  | `a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1` | NOT_RUN |  | GitHub Actions run URL を記録予定。 |

---

## Scheduled Functions Result

| Function | Expected | Last run | Next run | Result | Notes |
|---|---|---|---|---|---|
| `saveDailySloSnapshot` | daily 03:00 JST |  |  | NOT_RUN | Cloud Scheduler job exists / timezone / region / logs を確認予定。 |
| `saveWeeklySloSnapshot` | Monday 03:15 JST |  |  | NOT_RUN | Cloud Scheduler job exists / timezone / region / logs を確認予定。 |
| `cleanupStaleGeneration` | daily 03:30 JST |  |  | NOT_RUN | Cloud Scheduler job exists / timezone / region / logs を確認予定。 |

---

## Firestore Rules / Index Result

| Rule / Index check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| adminMetrics admin read | allowed |  | NOT_RUN | Admin user で `adminMetrics` read を確認予定。 |
| non-admin deny | denied |  | NOT_RUN | non-admin user で deny を確認予定。 |
| collection group `pages` index | enabled |  | NOT_RUN | `pages` collection group query / Functions logs で確認予定。 |
| `Firestore index required` error | none |  | NOT_RUN | Functions logs で確認予定。 |

---

## Firestore Documents Result

| Path | Exists | Key fields checked | Result | Notes |
|---|---|---|---|---|
| `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}` | unknown | snapshot fields | NOT_RUN | Firestore document path を確認予定。 |
| `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}` | unknown | snapshot fields | NOT_RUN | Firestore document path を確認予定。 |
| `adminMetrics/staleCleanup` | unknown | cleanup summary fields | NOT_RUN | Firestore document path を確認予定。 |
| `adminMetrics/staleCleanup/runs/{daily-YYYY-MM-DD-HHmm}` | unknown | run summary fields | NOT_RUN | Firestore document path を確認予定。 |
| `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` | unknown | regeneration fields | NOT_RUN | Regeneration 実行後に Firestore path を確認予定。 |

---

## Admin UI Result

| Check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| SLO Dashboard visible | yes |  | NOT_RUN | `/admin/book-quality-review` で確認予定。 |
| sample size selector works | 50 / 100 / 200 |  | NOT_RUN | Admin UI screenshot / route を記録予定。 |
| Snapshot History visible | yes |  | NOT_RUN | Admin UI screenshot / route を記録予定。 |
| Stale Cleanup Status visible | yes |  | NOT_RUN | Admin UI screenshot / route を記録予定。 |
| no permission denied | yes |  | NOT_RUN | Browser console / Firestore error を確認予定。 |
| no UI crash | yes |  | NOT_RUN | Browser console / UI 状態を確認予定。 |

---

## Regeneration / Recovery Result

| Scenario | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| `image_failed` page regeneration | succeeds |  | NOT_RUN | Admin UI 操作 / Functions logs / Firestore update を確認予定。 |
| `regenerationHistory` created | yes |  | NOT_RUN | `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` を確認予定。 |
| `partial_completed` to `completed` recovery | succeeds |  | NOT_RUN | Check completion button / book status を確認予定。 |
| recovery metadata updated | yes |  | NOT_RUN | `recoveredFromPartialCompleted`, `recoveredAtMs`, `lastCompletionCheckedAtMs` を確認予定。 |

---

## Failure Handling Result

| Check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| fallback metadata | recorded |  | NOT_RUN | `imageFallbackUsed` を確認予定。 |
| timeout metadata | recorded |  | NOT_RUN | `imageFailureReason`, `imageTimeoutCount`, `imageRetryable` を確認予定。 |
| stale generating page cleanup | works |  | NOT_RUN | stale `generating` page が `image_failed` になるか確認予定。 |
| metrics recalculation | works |  | NOT_RUN | cleanup 後の book metrics を確認予定。 |
| no data corruption after retry | yes |  | NOT_RUN | 既存成功データが保持されるか確認予定。 |

---

## Issues Found

| ID | Severity | Area | Description | Evidence / URL | Owner | Status | Follow-up issue / PR |
|---|---|---|---|---|---|---|---|
|  | High / Medium / Low |  |  |  |  | open / in progress / closed |  |

---

## Follow-up Actions

| Action | Owner | Due date | Priority | Related issue / PR | Status |
|---|---|---|---|---|---|
| Execute Firebase deploy confirmation |  |  | High |  | open |
| Verify Cloud Scheduler jobs |  |  | High |  | open |
| Verify Firestore rules and indexes |  |  | High |  | open |
| Verify Admin SLO Dashboard |  |  | High |  | open |
| Verify regeneration and recovery |  |  | High |  | open |

---

## Final Decision

Select one:

- [ ] Phase 1 Complete
- [ ] Phase 1 Complete with follow-up
- [x] Phase 1 Not Complete

Decision reason:

```md
Decision: Phase 1 Not Complete
Date: 2026-05-07
Commit SHA: a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1
Firebase project: story-gen-8a769
Reason:
- Production smoke execution is not yet performed.
- All Acceptance Criteria are not yet verified.
- No item has been changed to PASS without evidence.
Issues:
- None yet
Follow-up:
- Execute Firebase deploy confirmation
- Verify Cloud Scheduler jobs
- Verify Firestore rules and indexes
- Verify Admin SLO Dashboard
- Verify regeneration and recovery
```
