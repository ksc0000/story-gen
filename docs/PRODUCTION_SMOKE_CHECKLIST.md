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

- [ ] production Firebase project `story-gen-8a769` への deploy 権限がある。
- [ ] Firebase CLI が production project に対して deploy できる。
- [ ] Google Cloud Console / Firebase Console で Functions logs を確認できる。
- [ ] Firestore Console で production data を確認できる。
- [ ] Admin user で production Admin UI にログインできる。
- [ ] non-admin user で permission check ができる。
- [ ] `image_failed` page を含む確認用 book がある、または作成できる。
- [ ] `partial_completed` book を含む確認用 data がある、または production-equivalent data で確認できる。
- [ ] GitHub Actions / build status を確認できる。

### GitHub Actions Firebase secrets

以下の GitHub Actions secrets が設定されていることを確認する。

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

- [ ] `saveDailySloSnapshot` scheduler job が存在する。
- [ ] `saveDailySloSnapshot` schedule が `0 3 * * *` である。
- [ ] `saveDailySloSnapshot` timezone が `Asia/Tokyo` である。
- [ ] `saveDailySloSnapshot` region が `asia-northeast1` である。
- [ ] `saveWeeklySloSnapshot` scheduler job が存在する。
- [ ] `saveWeeklySloSnapshot` schedule が `15 3 * * 1` である。
- [ ] `saveWeeklySloSnapshot` timezone が `Asia/Tokyo` である。
- [ ] `saveWeeklySloSnapshot` region が `asia-northeast1` である。
- [ ] `cleanupStaleGeneration` scheduler job が存在する。
- [ ] `cleanupStaleGeneration` schedule が `30 3 * * *` である。
- [ ] `cleanupStaleGeneration` timezone が `Asia/Tokyo` である。
- [ ] `cleanupStaleGeneration` region が `asia-northeast1` である。
- [ ] daily / weekly / cleanup の少なくとも1回の実行結果を Functions logs で確認した。

Expected:

- daily snapshot: 毎日 03:00 JST に実行される。
- weekly snapshot: 月曜 03:15 JST に実行される。
- stale cleanup: 毎日 03:30 JST に実行される。

Failure check:

- Scheduler job が出ない場合: functions deploy 漏れ、region 違い、Firebase Functions v2 scheduler definition を確認する。
- 実行されない場合: Cloud Scheduler job の last execution / retry / target URI / service account を確認する。
- timezone が違う場合: function scheduler option の timezone を修正して redeploy する。

---

(remaining content unchanged)
