# Production Smoke Result — 2026-05-07 Phase 1 Production

このファイルは production smoke test 実行結果の記録ファイル。

Template:

- [Production Smoke Results Template](../PRODUCTION_SMOKE_RESULTS.md)

Checklist:

- [Production Smoke Checklist](../PRODUCTION_SMOKE_CHECKLIST.md)

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
| 備考 | 初回 production smoke result template |

| Check area | Result | Evidence / Notes | Issue / PR |
|---|---|---|---|
| Deploy Result | NOT_RUN |  |  |
| GitHub Actions / Build Result | NOT_RUN |  |  |
| Scheduled Functions Result | NOT_RUN |  |  |
| Firestore Rules / Index Result | NOT_RUN |  |  |
| Firestore Documents Result | NOT_RUN |  |  |
| Admin UI Result | NOT_RUN |  |  |
| Regeneration / Recovery Result | NOT_RUN |  |  |
| Failure Handling Result | NOT_RUN |  |  |

---

## Environment

| Item | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| Firebase project | `story-gen-8a769` | `story-gen-8a769` | NOT_RUN |  |
| Functions region | `asia-northeast1` |  | NOT_RUN |  |
| Scheduler timezone | `Asia/Tokyo` |  | NOT_RUN |  |
| Admin route | `/admin/book-quality-review` |  | NOT_RUN |  |
| Hosting URL | production Hosting URL |  | NOT_RUN |  |
| Firestore database | production database |  | NOT_RUN |  |
| checked Firebase account | expected operator account |  | NOT_RUN |  |

---

## Target Commit

| Item | Value | Result | Notes |
|---|---|---|---|
| commit SHA | `a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1` | NOT_RUN |  |
| commit message | `docs: refine production smoke results template` | NOT_RUN |  |
| branch | `main` | NOT_RUN |  |
| pushed at |  | NOT_RUN |  |
| GitHub Actions status | unknown | NOT_RUN |  |
| deployed | unknown | NOT_RUN |  |

---

## Deploy Result

| Deploy target | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| hosting | deployed |  | NOT_RUN |  |
| functions | deployed |  | NOT_RUN |  |
| firestore:rules | deployed |  | NOT_RUN |  |
| storage | deployed |  | NOT_RUN |  |

---

## GitHub Actions / Build Result

| Workflow name | Run URL | Commit SHA | Status | Failed step | Notes |
|---|---|---|---|---|---|
|  |  | `a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1` | NOT_RUN |  |  |

---

## Scheduled Functions Result

| Function | Expected | Last run | Next run | Result | Notes |
|---|---|---|---|---|---|
| `saveDailySloSnapshot` | daily 03:00 JST |  |  | NOT_RUN |  |
| `saveWeeklySloSnapshot` | Monday 03:15 JST |  |  | NOT_RUN |  |
| `cleanupStaleGeneration` | daily 03:30 JST |  |  | NOT_RUN |  |

---

## Firestore Rules / Index Result

| Rule / Index check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| adminMetrics admin read | allowed |  | NOT_RUN |  |
| non-admin deny | denied |  | NOT_RUN |  |
| collection group `pages` index | enabled |  | NOT_RUN |  |
| `Firestore index required` error | none |  | NOT_RUN |  |

---

## Firestore Documents Result

| Path | Exists | Key fields checked | Result | Notes |
|---|---|---|---|---|
| `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}` | unknown | snapshot fields | NOT_RUN |  |
| `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}` | unknown | snapshot fields | NOT_RUN |  |
| `adminMetrics/staleCleanup` | unknown | cleanup summary fields | NOT_RUN |  |
| `adminMetrics/staleCleanup/runs/{daily-YYYY-MM-DD-HHmm}` | unknown | run summary fields | NOT_RUN |  |
| `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` | unknown | regeneration fields | NOT_RUN |  |

---

## Admin UI Result

| Check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| SLO Dashboard visible | yes |  | NOT_RUN |  |
| sample size selector works | 50 / 100 / 200 |  | NOT_RUN |  |
| Snapshot History visible | yes |  | NOT_RUN |  |
| Stale Cleanup Status visible | yes |  | NOT_RUN |  |
| no permission denied | yes |  | NOT_RUN |  |
| no UI crash | yes |  | NOT_RUN |  |

---

## Regeneration / Recovery Result

| Scenario | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| `image_failed` page regeneration | succeeds |  | NOT_RUN |  |
| `regenerationHistory` created | yes |  | NOT_RUN |  |
| `partial_completed` to `completed` recovery | succeeds |  | NOT_RUN |  |
| recovery metadata updated | yes |  | NOT_RUN |  |

---

## Failure Handling Result

| Check | Expected | Actual | Result | Notes |
|---|---|---|---|---|
| fallback metadata | recorded |  | NOT_RUN |  |
| timeout metadata | recorded |  | NOT_RUN |  |
| stale generating page cleanup | works |  | NOT_RUN |  |
| metrics recalculation | works |  | NOT_RUN |  |
| no data corruption after retry | yes |  | NOT_RUN |  |

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
Decision: Phase 1 Not Complete
Date: 2026-05-07
Commit SHA: a5db89a403da3c1a1cc4cf87f7bea70e9e62e0a1
Firebase project: story-gen-8a769
Reason:
- Initial template only
- Production smoke execution not started
Issues:
- None yet
Follow-up:
- Execute production smoke checklist
```
