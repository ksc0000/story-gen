# 定期実行ジョブ 結果回収レビュー（2026-08-25）

対象: `story-gen-8a769` にデプロイ済みの `onSchedule` Cloud Functions 7 本。
収集元: Cloud Functions ログ（`firebase functions:log --project story-gen-8a769`）。

## 1. 回収結果サマリ

| ジョブ | スケジュール（当時） | 直近実行 | 結果 | 判定 |
|---|---|---|---|---|
| `cleanupStaleGeneration` | 毎日 03:30 JST | 2026-08-24 03:30 | checkedPages 0 / stalePages 0 / updated 0 | 正常 |
| `saveDailySloSnapshot` | 毎日 03:00 JST | 2026-08-24 03:00 | totalBooks 200 / readable 77.5% / hardFailed 22.5% / P95 152,829ms | **異常**（5日連続で完全に同一値） |
| `saveDailyMetricsSnapshot` | 毎日 03:05 JST | 2026-08-24 03:05 | saved 2 | **異常**（前日以前の MRR を毎晩 0 で上書き） |
| `saveWeeklySloSnapshot` | 毎週月 03:15 JST | 2026-08-24 03:15 | daily とまったく同じ値 | **異常**（日次と週次が同一） |
| `saveWeeklyQualitySnapshot` | 毎週月 03:45 JST | 2026-08-24 03:45 | totalReviewed 10 / avgOverall 1.46 / regression 0 | **異常**（3週連続で同一値） |
| `cleanupExpired` | 毎日 18:00 JST | 2026-08-24 18:00 | "No expired books found." | **異常**（Storage 削除先のパスが実在しない／実行時刻が利用ピーク帯） |
| `resetMonthlyQuota` | 毎月1日 15:05 JST | 2026-08-01 15:05 | 18 users リセット | **異常**（月初 00:00〜15:05 はクォータが前月のまま） |

ジョブ自体のクラッシュ・タイムアウト・リトライ失敗は 1 件も無し。
問題はすべて「動いてはいるが、出している結果が間違っている／使えない」という種類のもの。

## 2. 検出した不具合と修正

### 2-1. SLO スナップショットが集計ウィンドウを一切適用していなかった

`saveSloSnapshot()` は `window: "daily" | "weekly"` を受け取りながら、実際には
`books` を `createdAt desc` で `sampleSize` 件取るだけで、期間で絞っていなかった。

その結果:
- daily と weekly が**同じ母集団**を見るため、両者の値が完全に一致する
- 「直近 200 冊（全期間）」の裾を見続けるので、値がほぼ動かない
  → 管理ダッシュボードの readable rate スパークラインは 77.5% の直線
- `bookHardFailedRate 22.5%` には開発初期の失敗本が恒久的に含まれ、
  SLO としてもリグレッション検知としても機能しない

**修正**: `resolveWindowStartMs()` を追加し、daily = 直近 24h / weekly = 直近 7d で
`createdAt >= windowStart` を絞り込む。`sampleSize` は上限キャップとして残す。
不明な window は従来どおり全期間（手動スナップショット互換）。
スナップショット文書に `windowStartMs` / `windowEndMs` を記録し、
後から「どの期間の値か」を判別できるようにした。

> 不等式と orderBy が同一フィールドのため、複合インデックスの追加は不要。

### 2-2. 品質スナップショットも同じくウィンドウ未適用

`saveQualitySnapshot()` も `qualityReviewedAtMs desc` で 500 件取るだけだった。
週次スナップショットが毎週「全期間のレビュー済み 10 冊」を集計しており、
`totalReviewed 10 / avgOverall 1.46` が 3 週連続で同一。

**修正**: 同じ `resolveWindowStartMs()` を用いて `qualityReviewedAtMs >= windowStart` で絞る。

### 2-3. 日次メトリクスが前日以前の MRR を毎晩消していた

`saveDailyMetricsSnapshot` は当日と前日を再計算する。
`paidUsersStandard` / `paidUsersPremium` / `estimatedMrrJpy` は「現在値しか取れない」ため
最新日にのみ実値を入れる設計だったが、**過去日には 0 を書き込んでいた**。
翌日の再計算で前日が「最新日」でなくなった瞬間に 0 で上書きされるため、
ダッシュボードの MRR 時系列は当日以外すべて 0 になっていた。

**修正**: 過去日については当該 3 フィールドを書き込みペイロードから**省略**し、
`merge: true` の意味論でその日に記録された値をそのまま保持する。

> 既に 0 で潰れてしまった過去分は、当時のプラン状態が記録されていないため復元不可。
> 今後の日次分から正しく積み上がる。

### 2-4. 期限切れ絵本の Storage ファイルが永久に残る

`cleanupExpired` は Firestore の `books/{id}` とページ サブコレクションを消した後、
`books/{bookId}/pages/` プレフィックスで Storage を削除していた。
実際の保存先は:

- ページ画像: `books/{bookId}/page-{N}.png`
- 表紙: `books/{bookId}/cover.png`
- PDF: `books/{bookId}/outputs/book.pdf`

つまり `pages/` というディレクトリは**存在せず**、削除は常に 0 件。
Firestore だけ消えて画像・PDF が孤児として残り続けていた（課金・個人データ両面で問題）。

**修正**: `bucket.deleteFiles({ prefix: `books/${bookId}/` })` に変更。

### 2-5. `timeZone: "Asia/Tokyo"` によりスケジュールが意図しない時刻にずれていた

`cleanupExpired` と `resetMonthlyQuota` は UTC 前提の cron 式に
`timeZone: "Asia/Tokyo"` が付いた状態で運用されていた。

| ジョブ | 修正前 | 影響 | 修正後 |
|---|---|---|---|
| `resetMonthlyQuota` | `5 15 1 * *` = 毎月1日 15:05 JST | 月初 00:00〜15:05 の約15時間、前月の生成回数が残りユーザーが不当にブロックされる | `5 0 1 * *` = 毎月1日 00:05 JST |
| `cleanupExpired` | `0 18 * * *` = 毎日 18:00 JST | 家庭の利用ピーク帯に絵本の一括削除が走る。かつ 03:00〜03:45 の集計より後でないと当日分が欠ける | `0 4 * * *` = 毎日 04:00 JST |

### 2-6. ダッシュボードのスパークラインが daily / weekly / 手動を混ぜていた

`adminMetrics/sloSnapshots/items` には daily・weekly・管理者の手動保存が混在する。
ダッシュボードは `createdAtMs desc` で 14 件取って readable rate の折れ線にしていたため、
2-1 の修正で daily と weekly の値が分かれた後は混線が実害になる。

**修正**: 多めに取得してクライアント側で `window === "daily"` に絞り、直近 14 点を使う
（複合インデックスを増やさないため）。

## 3. 変更ファイル

- `functions/src/lib/slo-snapshot.ts` — `resolveWindowStartMs()` 追加、ウィンドウ絞り込み
- `functions/src/lib/quality-snapshot.ts` — ウィンドウ絞り込み
- `functions/src/lib/daily-metrics.ts` — 過去日の現在値フィールドを保持
- `functions/src/cleanup-expired.ts` — Storage プレフィックス修正、04:00 JST へ変更
- `functions/src/reset-monthly-quota.ts` — 00:05 JST へ変更
- `src/app/(app)/admin/dashboard/page.tsx` — スパークラインを daily のみに
- `functions/test/snapshot-window.test.ts` — 新規（10 tests）
- `functions/test/daily-metrics-current-values.test.ts` — 新規（2 tests）
- `functions/test/slo-snapshot.benchmark.test.ts` — where() を含むクエリチェーンに追従

## 4. デプロイ後に確認すること

1. 翌朝 03:00〜03:45 JST の各ジョブ実行ログで、daily と weekly の値が**異なる**こと
2. 生成トラフィックが 0 の日は `"No books in window, skipping snapshot"` が出て
   スナップショットが書かれないこと（欠測は仕様。0% と誤表示しない）
3. `adminMetrics/dailyMetrics/items/{前日}` の `estimatedMrrJpy` が翌日以降も残ること
4. 期限切れ本が発生した日に、`books/{bookId}/` 配下の Storage が実際に消えること

## 5. 本レビューの対象外（別途対応）

- `deleteUserAccount` は `users/{uid}/` しか Storage を消しておらず、
  `books/{bookId}/` 配下の生成画像・PDF がアカウント削除後も残る（2-4 と同種の問題）。
- 週次品質スナップショットの `avgOverall 1.46 / 5`（LLM 自動レビューで約 29/100）は
  レビュー対象が 10 冊しかなく、傾向として評価できない。2-2 の修正で
  週ごとの母集団が分かれるため、サンプルが溜まってから改めて評価する。
