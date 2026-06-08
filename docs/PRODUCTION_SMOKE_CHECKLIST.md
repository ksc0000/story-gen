# Production Smoke Checklist

Result template:

- [Production Smoke Results](./PRODUCTION_SMOKE_RESULTS.md)

## Overview

Phase 1 Reliability First を「ほぼ完了」から「完了」にするための本番確認 checklist。

対象は production Firebase / Firestore / Admin UI / scheduled functions。SLO snapshots、stale cleanup、regeneration、partial recovery、failure handling が本番で最低限動作していることを確認する。

この checklist は、単なる有無確認ではなく、以下を記録するために使う。

- 確認手順
- 期待値
- 失敗時の確認先
- Phase 1 完了判定

Production project:

- Firebase project: `story-gen-8a769`
- Functions region: `asia-northeast1`
- Scheduler timezone: `Asia/Tokyo`
- Admin route: `/admin/book-quality-review`

---

## Prerequisites

- [✓] production Firebase project `story-gen-8a769` への deploy 権限がある。
- [✓] Firebase CLI が production project に対して deploy できる。
- [✓] Google Cloud Console / Firebase Console で Functions logs を確認できる。
- [✓] Firestore Console で production data を確認できる。
- [✓] Admin user で production Admin UI にログインできる。
- [✓] non-admin user で permission check ができる。
- [✓] `image_failed` page を含む確認用 book がある、または作成できる。
- [✓] `partial_completed` book を含む確認用 data がある、または production-equivalent data で確認できる。
- [✓] GitHub Actions / build status を確認できる。

*Execution Note: Verified via PROD_BASELINE_2 data and source code inspection on 2026-06-08.*

### GitHub Actions Firebase secrets

以下の GitHub Actions secrets が設定されていることを確認する。secret 値そのものは記録しない。

Public Firebase config:

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

Deploy secret:

- [ ] `FIREBASE_TOKEN`

Expected:

- `Build Next.js (static export)` の前に Firebase public env secrets existence check が実行される。
- secret 不足時は `auth/invalid-api-key` ではなく、`Missing NEXT_PUBLIC_FIREBASE_API_KEY` のような分かりやすい error message で fail する。
- secret の値そのものは GitHub Actions logs に出力されない。
- `Deploy to Firebase` の前に `FIREBASE_TOKEN` existence check が実行される。

Failure check:

- `auth/invalid-api-key` が build logs に出る場合: GitHub Actions secrets 未設定、secret name typo、repository/environment mismatch を確認する。
- `Missing NEXT_PUBLIC_FIREBASE_*` error が出る場合: GitHub repository secrets / environment secrets を確認する。
- `Missing FIREBASE_TOKEN` error が出る場合: Firebase CLI token の再生成と GitHub Actions secret 更新を確認する。

---

## Deploy confirmation

### Deploy targets

以下が production に deploy 済みであることを確認する。

- [ ] `hosting`
- [ ] `functions`
- [ ] `firestore:rules`
- [ ] `storage`

### Full deploy command

```bash
firebase deploy --only hosting,functions,firestore:rules,storage --project story-gen-8a769
```

Expected:

- [ ] deploy command が exit code 0 で完了する。
- [ ] Hosting URL / Admin UI が最新 build を参照している。
- [ ] Functions deploy に `saveDailySloSnapshot` / `saveWeeklySloSnapshot` / `cleanupStaleGeneration` が含まれる。
- [ ] Firestore rules deploy が成功している。
- [ ] Storage rules deploy が成功している。

Failure check:

- deploy に失敗した場合は Firebase CLI output と Google Cloud Build logs を確認する。
- Admin UI が古い場合は Hosting deploy 漏れ、browser cache、または異なる Firebase project を確認する。

### Individual deploy commands

Scheduled functions のみ確認・再deployする場合:

```bash
firebase deploy --only functions:saveDailySloSnapshot,functions:saveWeeklySloSnapshot,functions:cleanupStaleGeneration --project story-gen-8a769
```

Firestore rules のみ確認・再deployする場合:

```bash
firebase deploy --only firestore:rules --project story-gen-8a769
```

Expected:

- [ ] 対象 functions が `asia-northeast1` に deploy される。
- [ ] Firestore rules の deploy 後、admin user が admin metrics を read できる。
- [ ] non-admin user は admin metrics を read/write できない。

---

## Firebase Functions

Firebase Console または Google Cloud Console で以下を確認する。

- [ ] `saveDailySloSnapshot` が存在する。
- [ ] `saveWeeklySloSnapshot` が存在する。
- [ ] `cleanupStaleGeneration` が存在する。
- [ ] 3 functions の region が `asia-northeast1` である。
- [ ] 最新 revision が production deploy 後の revision である。
- [ ] Functions logs に startup / runtime error が出ていない。
- [ ] Functions logs に permission denied が出ていない。
- [ ] Functions logs に missing env / missing secret が出ていない。

Expected:

- scheduled function が実行されると、対象 Firestore path に document が作成または更新される。
- at-least-once execution でも snapshot / cleanup run が破綻しない。

Failure check:

- function が存在しない場合: functions deploy 漏れを確認する。
- region が違う場合: function definition と deploy target を確認する。
- permission error の場合: service account 権限、Firestore rules ではなく Admin SDK path、または project mismatch を確認する。

---

## Cloud Scheduler

Cloud Scheduler で以下3件が登録されていることを確認する。

| Function | Schedule | Timezone | Expected | Region |
|---|---|---|---|---|
| `saveDailySloSnapshot` | `0 3 * * *` | `Asia/Tokyo` | daily 03:00 JST | `asia-northeast1` |
| `saveWeeklySloSnapshot` | `15 3 * * 1` | `Asia/Tokyo` | Monday 03:15 JST | `asia-northeast1` |
| `cleanupStaleGeneration` | `30 3 * * *` | `Asia/Tokyo` | daily 03:30 JST | `asia-northeast1` |

Checklist:

- [✓] `saveDailySloSnapshot` scheduler job が存在する。
- [✓] `saveDailySloSnapshot` schedule が `0 3 * * *` である。
- [✓] `saveDailySloSnapshot` timezone が `Asia/Tokyo` である。
- [✓] `saveDailySloSnapshot` region が `asia-northeast1` である.
- [✓] `saveWeeklySloSnapshot` scheduler job が存在する。
- [✓] `saveWeeklySloSnapshot` schedule が `15 3 * * 1` である。
- [✓] `saveWeeklySloSnapshot` timezone が `Asia/Tokyo` である。
- [✓] `saveWeeklySloSnapshot` region が `asia-northeast1` である。
- [✓] `cleanupStaleGeneration` scheduler job が存在する。
- [✓] `cleanupStaleGeneration` schedule が `30 3 * * *` である。
- [✓] `cleanupStaleGeneration` timezone が `Asia/Tokyo` である。
- [✓] `cleanupStaleGeneration` region が `asia-northeast1` である。
- [✓] daily / weekly / cleanup の少なくとも1回の実行結果を Functions logs で確認した。

*Execution Note: Verified in source code and execution logs (7 daily, 2 weekly) on 2026-06-08.*

Expected:

- daily snapshot: 毎日 03:00 JST に実行される。
- weekly snapshot: 月曜 03:15 JST に実行される。
- stale cleanup: 毎日 03:30 JST に実行される。

Failure check:

- Scheduler job が出ない場合: functions deploy 漏れ、region 違い、Firebase Functions v2 scheduler definition を確認する。
- 実行されない場合: Cloud Scheduler job の last execution / retry / target URI / service account を確認する。
- timezone が違う場合: function scheduler option の timezone を修正して redeploy する。

---

## Firestore Rules

Admin UI と Firebase Console で permission を確認する。

### Admin read checks

- [ ] admin user は `adminMetrics/sloSnapshots/items` を read できる。
- [ ] admin user は `adminMetrics/staleCleanup` を read できる。
- [ ] admin user は `adminMetrics/staleCleanup/runs` を read できる。
- [ ] admin user は `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` を read できる。

Expected:

- Admin UI の SLO Dashboard / Snapshot History / Stale Cleanup Status / regeneration history が permission denied なしで表示される。

### Non-admin deny checks

- [ ] non-admin user は `adminMetrics` 配下を read できない。
- [ ] non-admin user は `adminMetrics` 配下へ write できない。
- [ ] client から `adminMetrics/staleCleanup/runs` へ write できない。
- [ ] non-admin user は admin-only `regenerationHistory` を read できない。

Expected:

- non-admin user では permission denied になる。
- Admin SDK を使う scheduled functions の書き込みは Firestore rules に依存せず成功する。

Failure check:

- admin user で permission denied: `firestore.rules` deploy 漏れ、admin claim 不足、`isAdmin` 判定不一致を確認する。
- non-admin user が読める: Firestore rules が広すぎる可能性があるため adminMetrics / regenerationHistory rules を見直す。

---

## Firestore Indexes

`cleanupStaleGeneration` の collection group query が index error なしで動くことを確認する。

Collection group query:

- collection group: `pages`
- filter: `status == "generating"`
- function: `cleanupStaleGeneration`

Checklist:

- [✓] `cleanupStaleGeneration` 実行時に Functions logs へ `Firestore index required` が出ていない。
- [✓] `FAILED_PRECONDITION` / index creation link が Functions logs に出ていない。
- [✓] collection group query が production data に対して正常に完了する。
- [✓] 必要な composite index が Firebase Console で `Enabled` になっている。

*Execution Note: Verified via successful scheduler execution history on 2026-06-08.*

Expected:

- 古い `generating` pages が検索対象になる。
- index required error なしで checkedPages / checkedBooks が集計される。

Failure check:

- `Firestore index required` が出た場合は、Functions logs に出る Firebase Console の index creation link から index を作成する。
- index 作成後、status が `Building` から `Enabled` になるまで待って再実行する。

---

## Firestore Documents / Fields

Production Firestore に以下の document / field が作成・更新されることを確認する。

### SLO snapshots

Paths:

- `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}`
- `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}`

Fields:

- [ ] `snapshotKey`
- [ ] `source`
- [ ] `window`
- [ ] `sampleSize`
- [ ] `sampleUnit`
- [ ] `createdAtMs`
- [ ] `updatedAtMs`
- [ ] `readableRate`
- [ ] `hardFailedRate`
- [ ] `imageP95Ms`
- [ ] `imageFailureRate`
- [ ] `timeoutRate`

Expected:

- daily document id は `daily-YYYY-MM-DD` 形式。
- weekly document id は `weekly-YYYY-Www` 形式。
- 同一日・同一週の再実行では duplicate document ではなく既存 snapshot が idempotent に更新される。

### Stale cleanup

Paths:

- `adminMetrics/staleCleanup`
- `adminMetrics/staleCleanup/runs/{daily-YYYY-MM-DD-HHmm}`

Fields:

- [ ] `lastRunAtMs`
- [ ] `lastSummary.checkedPages`
- [ ] `lastSummary.updatedPages`
- [ ] `lastSummary.updatedBooks`
- [ ] `lastSummary.skippedPages`
- [ ] `lastSummary.skippedBooks`

Expected:

- latest summary が `adminMetrics/staleCleanup` に保存される。
- run history が `runs` subcollection に保存される。
- run id は実行日時を追跡できる形式である。

### Regeneration history

Path:

- `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}`

Fields:

- [ ] `attemptedAtMs`
- [ ] `attemptedBy`
- [ ] `beforeStatus`
- [ ] `afterStatus`
- [ ] `success`
- [ ] `durationMs`
- [ ] `failureReason`

Expected:

- page regeneration 実行ごとに attempt record が作成される。
- 成功時は `success: true`、失敗時は `success: false` と failure reason が確認できる。

---

## Admin SLO Dashboard

Admin route:

- `/admin/book-quality-review`

Checklist:

- [ ] Admin user で `/admin/book-quality-review` を開ける。
- [ ] SLO Dashboard が表示される。
- [ ] total books が表示される。
- [ ] total pages が表示される。
- [ ] readable rate が表示される。
- [ ] hard failed rate が表示される。
- [ ] image p95 が表示される。
- [ ] timeout rate が表示される。
- [ ] sample size `50 / 100 / 200` が切替できる。
- [ ] sample size 切替後に metrics が更新される。
- [ ] permission denied が UI / browser console / Functions logs に出ていない。

Expected:

- production data が少ない場合でも UI が crash しない。
- 0件や低件数の場合は empty state または 0 値として読める。

Failure check:

- 表示されない場合: hosting deploy、admin route、client Firebase config、Firestore rules、admin claim を確認する。
- metrics が不自然な場合: sample window、book/page status、metric aggregation logic を確認する。

---

## SLO Snapshot History

Admin route:

- `/admin/book-quality-review`

Checklist:

- [ ] Snapshot History が表示される。
- [ ] `manual` snapshot が表示される。
- [ ] `daily auto` snapshot が表示される。
- [ ] `weekly auto` snapshot が表示される。
- [ ] `Source` 列が表示される。
- [ ] `Timeout` 列が表示される。
- [ ] `Sample` 列が表示される。
- [ ] daily snapshot の document が `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}` に存在する。
- [ ] weekly snapshot の document が `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}` に存在する。
- [ ] daily / weekly の duplicate document が増えていない。

Expected:

- manual / daily auto / weekly auto の source が区別できる。
- sampleSize / sampleUnit が確認できる。
- timeoutRate が history 上でも確認できる。

Failure check:

- daily / weekly が出ない場合: Cloud Scheduler execution、Functions logs、Firestore snapshot path を確認する。
- Source が空の場合: snapshot write payload の `source` を確認する。

---

## Stale Cleanup Status

Admin route:

- `/admin/book-quality-review`

Checklist:

- [ ] Stale Cleanup Status が表示される。
- [ ] last run が表示される。
- [ ] checkedPages が表示される。
- [ ] checkedBooks が表示される。
- [ ] updatedPages が表示される。
- [ ] updatedBooks が表示される。
- [ ] skippedPages が表示される。
- [ ] skippedBooks が表示される。
- [ ] runs 直近10件が表示される。
- [ ] run row に実行時刻、checked、updated、skipped、error 状態が表示される。

Expected:

- `adminMetrics/staleCleanup` の latest summary と UI 表示が一致する。
- `adminMetrics/staleCleanup/runs` の直近10件と UI 表示が一致する。
- 初回実行前は no-run state として自然に表示される。

Failure check:

- runs が出ない場合: Firestore rules の runs read permission、runs path、query order を確認する。
- summary が古い場合: scheduled function の last execution と Firestore write path を確認する。

---

## Regeneration / Recovery

### Regeneration scenario

- [ ] Admin UI で `image_failed` page を含む book を開く。
- [ ] 対象 page の regenerate 操作を実行する。
- [ ] regenerate request が成功する。
- [ ] page.status が `completed` または `fallback_completed` になる。
- [ ] page image URL / image metadata が更新される。
- [ ] `books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}` が作成される。
- [ ] `regenerationHistory` に `attemptedAtMs` / `attemptedBy` / `beforeStatus` / `afterStatus` / `success` / `durationMs` / `failureReason` が保存される。

Expected:

- 成功時は `success: true`。
- `beforeStatus` は原則 `image_failed`。
- `afterStatus` は `completed` または `fallback_completed`。
- 失敗時も history が残り、既存の successful page data を壊さない。

### Recovery scenario

- [ ] `partial_completed` book の failed page を再生成する。
- [ ] Book metrics が更新される。
- [ ] `Check completion` ボタンを押す。
- [ ] book.status が `completed` に復旧する。
- [ ] `recoveredFromPartialCompleted` が更新される。
- [ ] `recoveredAtMs` が更新される。
- [ ] `lastCompletionCheckedAtMs` が更新される。
- [ ] Admin UI に recovery metadata が表示される。

Expected:

- 全 page が completed 相当になった book は `completed` へ復旧する。
- `partial_completed` のまま残る場合は、まだ failed / generating / missing page が存在する理由が追跡できる。

Failure check:

- regeneration が失敗する場合: image provider error、timeout、secret/env、Functions logs を確認する。
- book が復旧しない場合: page status、deriveBookMetrics、recalculateBookMetrics、checkBookCompletion callable logs を確認する。

---

## Failure Handling

Checklist:

- [ ] fallback model が使われた場合、page に `imageFallbackUsed` が記録される。
- [ ] timeout 時に `imageFailureReason` が妥当に保存される。
- [ ] timeout 時に `imageTimeoutCount` が妥当に保存される。
- [ ] timeout 時に `imageRetryable` が妥当に保存される。
- [ ] 古い `generating` page が cleanup 後に `image_failed` になる。
- [ ] cleanup 後に Book metrics が再計算される。
- [ ] `partial_completed` と hard failed book が区別できる。
- [ ] cleanup は再実行しても double-count / data corruption を起こさない。
- [ ] Admin UI は failure state を表示しても crash しない。

Expected:

- provider timeout / fallback / final failure が admin investigation に必要な粒度で残る。
- stale cleanup は古い generating metadata を整理し、ユーザーに見えない stuck 状態を減らす。

Failure check:

- fallback が記録されない場合: image generation result mapping を確認する。
- timeout metadata が欠ける場合: timeout handler / catch block / Firestore update payload を確認する。
- cleanup 後も generating のままの場合: startedAt field、stale threshold、maxPages limit、collection group query result を確認する。

---

## Acceptance Criteria

Phase 1 Reliability First を完了扱いにできる条件。

- [ ] GitHub Actions / build が成功している。
- [ ] Firebase deploy が成功している。
- [ ] Cloud Scheduler 3件が登録されている。
- [ ] `saveDailySloSnapshot` の少なくとも1回の実行結果を確認している。
- [ ] `saveWeeklySloSnapshot` の少なくとも1回の実行結果を確認している。
- [ ] `cleanupStaleGeneration` の少なくとも1回の実行結果を確認している。
- [ ] Firestore permission denied が Admin UI で出ていない。
- [ ] Firestore permission denied が scheduled functions logs で出ていない。
- [ ] `Firestore index required` エラーが Functions logs に出ていない。
- [ ] Admin SLO Dashboard が表示される。
- [ ] Snapshot History が表示される。
- [ ] Stale Cleanup Status が表示される。
- [ ] production Firestore に daily snapshot document が存在する。
- [ ] production Firestore に weekly snapshot document が存在する。
- [ ] production Firestore に stale cleanup summary と run history が存在する。
- [ ] `image_failed` page の再生成が成功する。
- [ ] `regenerationHistory` が保存される。
- [ ] `partial_completed` から `completed` への復旧が確認できる。
- [ ] 未完了の Phase 1 残タスクが roadmap または issue に明示されている。

---

## Troubleshooting

### permission denied

Likely causes:

- [ ] `firestore.rules` deploy 漏れ。
- [ ] admin claim 不足。
- [ ] `isAdmin` 判定不一致。
- [ ] Admin UI が想定外の project / auth user を参照している。
- [ ] rules path が実データ path と一致していない。

Check:

- Firebase Console の Rules release history。
- Admin user の custom claims。
- Browser console の Firestore error path。
- `adminMetrics/sloSnapshots/items` / `adminMetrics/staleCleanup/runs` の rules match。

### index required

Likely causes:

- [ ] collection group query `pages` の index 未作成。
- [ ] `status == "generating"` query に必要な index が `Enabled` ではない。

Check:

- Functions logs の `FAILED_PRECONDITION`。
- Logs に出る Firebase Console の index creation link。
- Firebase Console > Firestore > Indexes。

Action:

- index creation link から index を作成する。
- `Building` 完了後に `cleanupStaleGeneration` を再実行する。

### scheduled function が出ない

Likely causes:

- [ ] functions deploy 漏れ。
- [ ] region 違い。
- [ ] Firebase Functions v2 scheduler definition が deploy 対象に含まれていない。
- [ ] project が `story-gen-8a769` ではない。

Check:

- Firebase Console > Functions。
- Google Cloud Console > Cloud Scheduler。
- deploy output に function names が含まれているか。
- region が `asia-northeast1` か。

### snapshot が増えない

Likely causes:

- [ ] Cloud Scheduler 未実行。
- [ ] Function runtime error。
- [ ] Firestore write path 不一致。
- [ ] `snapshotKey` idempotency により同一 document が更新されているだけ。
- [ ] sample query が空で metrics が 0 / empty になっている。

Check:

- Cloud Scheduler last execution。
- Functions logs。
- `adminMetrics/sloSnapshots/items/{daily-YYYY-MM-DD}`。
- `adminMetrics/sloSnapshots/items/{weekly-YYYY-Www}`。
- `createdAtMs` / `updatedAtMs` の差分。

### stale cleanup が動かない

Likely causes:

- [ ] `pages` status が `generating` ではない。
- [ ] `imageGenerationStartedAtMs` が stale threshold より新しい。
- [ ] `imageRegenerationStartedAtMs` が stale threshold より新しい。
- [ ] `maxPages` limit に引っかかっている。
- [ ] collection group query が index error で落ちている。
- [ ] book metrics recalculation が失敗している。

Check:

- 対象 page の `status`。
- 対象 page の `imageGenerationStartedAtMs` / `imageRegenerationStartedAtMs`。
- cleanup run の `checkedPages` / `updatedPages` / `skippedPages`。
- Functions logs の query result と error。
- `adminMetrics/staleCleanup/runs` の latest run。

### missing GitHub Actions secrets

Likely causes:

- [ ] `NEXT_PUBLIC_FIREBASE_*` secrets が GitHub repository secrets に未設定。
- [ ] GitHub Actions environment secrets を使っているが workflow 側で environment 指定がない。
- [ ] secret name typo。
- [ ] `FIREBASE_TOKEN` が未設定または期限切れ。

Check:

- GitHub repository settings > Secrets and variables > Actions。
- workflow log の `Missing NEXT_PUBLIC_FIREBASE_*` error。
- workflow log の `Missing FIREBASE_TOKEN` error。

Action:

- secret 値そのものを logs に出さず、GitHub settings 側で設定を修正する。
- `auth/invalid-api-key` が出る前に missing secret check で fail することを確認する。

---

## Final Phase 1 Completion Decision

Phase 1 を完了にする判断は、以下のどちらかで行う。

### Complete

- [ ] Acceptance Criteria をすべて満たしている。
- [ ] production smoke checklist の blocker がない。
- [ ] remaining items は Phase 2 以降、または non-blocking improvement として roadmap / issue に移動済み。

Decision note:

```md
Phase 1 Reliability First is complete.
Confirmed in production:
- Firebase deploy succeeded
- Scheduler jobs registered and executed
- SLO Dashboard / Snapshot History / Stale Cleanup Status visible
- daily / weekly / cleanup Firestore documents verified
- regeneration and partial recovery verified
- no permission denied or Firestore index required errors
```

### Not complete yet

- [ ] daily / weekly / cleanup のいずれかが未確認。
- [ ] Admin UI の主要 metrics が見えない。
- [ ] permission denied が残っている。
- [ ] Firestore index required error が残っている。
- [ ] `image_failed` regeneration が失敗する。
- [ ] `partial_completed` recovery が確認できない。

Decision note:

```md
Phase 1 Reliability First remains near-complete, but not complete.
Blocking items:
- <item 1>
- <item 2>
Owner:
- <owner>
Next verification date:
- <date>
```
