# Phase 2: Manual Quality Review — 実機確認チェックリスト

## Overview

| 項目 | 内容 |
|------|------|
| 対象機能 | Admin Manual Quality Review (Phase 2) |
| 対象 route | `/admin/book-quality-review` |
| Firestore path (review) | `books/{bookId}/qualityReviews/{reviewId}` |
| Firestore path (summary) | `books/{bookId}` |
| commit | `a1c0a714aef5235fb7b6860252cb4d45635bfd2a` |

---

## 実行記録

| 項目 | 実行日 | 実行者 | 環境 |
|------|--------|--------|------|
| 初回実機確認 | 2026-05-08 | admin | production (story-gen-8a769.web.app) |

---

## 1. Prerequisites

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 1.1 | Admin user でログインできる | ✅ PASS | |
| 1.2 | 対象 book が 1 冊以上存在する | ✅ PASS | |
| 1.3 | Firestore rules が deploy 済み (`firebase deploy --only firestore:rules`) | ✅ PASS | deploy 成功確認済み |
| 1.4 | quality review fields が未設定の既存 book でもページが開ける | ✅ PASS | |

---

## 2. Book List 表示

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 2.1 | `overallQualityScore` が表示される（Q score: X.X） | ✅ PASS | |
| 2.2 | `qualityReviewStatus` が表示される | ✅ PASS | |
| 2.3 | 未レビュー book は "—" / 空文字で表示される | ✅ PASS | |
| 2.4 | `needs_fix` ステータスが目立つ表示になっている | ☐ NOT_RUN | needs_fix での保存は未テスト |
| 2.5 | 既存の status badge 表示が壊れていない | ✅ PASS | |
| 2.6 | 既存の SLO / stale cleanup 表示が壊れていない | ✅ PASS | |

---

## 3. Book Detail Summary 表示

| # | 確認項目 | 期待値 | 結果 | 備考 |
|---|---------|--------|------|------|
| 3.1 | `overallQualityScore` | 数値 or "—" | ✅ PASS | |
| 3.2 | `storyQualityScore` | 数値 or "—" | ✅ PASS | |
| 3.3 | `illustrationQualityScore` | 数値 or "—" | ✅ PASS | |
| 3.4 | `characterConsistencyScore` | 数値 or "—" | ✅ PASS | |
| 3.5 | `personalizationScore` | 数値 or "—" | ✅ PASS | |
| 3.6 | `safetyScore` | 数値 or "—" | ✅ PASS | |
| 3.7 | `qualityReviewStatus` | badge 表示 or "Not reviewed" | ✅ PASS | |
| 3.8 | 未設定時は "—" / "Not reviewed" で表示される | — | ✅ PASS | |

---

## 4. Quality Review Panel — 入力

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 4.1 | Story Score を 1〜5 で選択できる | ✅ PASS | |
| 4.2 | Illustration Score を 1〜5 で選択できる | ✅ PASS | |
| 4.3 | Character Consistency Score を 1〜5 で選択できる | ✅ PASS | |
| 4.4 | Personalization Score を 1〜5 で選択できる | ✅ PASS | |
| 4.5 | Safety Score を 1〜5 で選択できる | ✅ PASS | |
| 4.6 | Status を reviewed / needs_fix / approved から選択できる | ✅ PASS | |
| 4.7 | Review Reason を入力できる（max 1000 文字） | ✅ PASS | |
| 4.8 | Flagged Issues を入力できる（1行1件） | ✅ PASS | |
| 4.9 | Recommended Fixes を入力できる（1行1件） | ✅ PASS | |
| 4.10 | Overall Score preview がリアルタイム表示される | ✅ PASS | |
| 4.11 | 全 score 未選択時は preview が "—" | ✅ PASS | |

---

## 5. Save — 保存

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 5.1 | "Save quality review" ボタンで保存成功する | ✅ PASS | |
| 5.2 | writeBatch により以下が**同時保存**される | | |
| 5.2a | — `books/{bookId}/qualityReviews/{reviewId}` が作成される | ✅ PASS | Firestore Console で確認 |
| 5.2b | — `books/{bookId}` summary fields が更新される | ✅ PASS | Firestore Console で確認 |
| 5.3 | 成功メッセージ「Quality review を保存しました」が表示される | ✅ PASS | |
| 5.4 | 保存後に form が初期化される | ✅ PASS | |
| 5.5 | 保存後に Quality Review History が更新される | ✅ PASS | |

---

## 6. Firestore Document Checks — qualityReviews

保存後に Firestore Console で `books/{bookId}/qualityReviews/{reviewId}` を確認する。

| # | Field | 期待値 | 結果 | 備考 |
|---|-------|--------|------|------|
| 6.1 | `bookId` | 親 book の ID と一致 | ✅ PASS | |
| 6.2 | `reviewerType` | `"human"` | ✅ PASS | |
| 6.3 | `reviewerId` | ログイン中 admin の UID | ✅ PASS | |
| 6.4 | `storyScore` | 1〜5 | ✅ PASS | |
| 6.5 | `illustrationScore` | 1〜5 | ✅ PASS | |
| 6.6 | `characterConsistencyScore` | 1〜5 | ✅ PASS | |
| 6.7 | `personalizationScore` | 1〜5 | ✅ PASS | |
| 6.8 | `safetyScore` | 1〜5 | ✅ PASS | |
| 6.9 | `overallScore` | 5 項目平均（小数1桁） | ✅ PASS | |
| 6.10 | `status` | reviewed / needs_fix / approved | ✅ PASS | |
| 6.11 | `reviewReason` | 入力値（trimmed） | ✅ PASS | |
| 6.12 | `flaggedIssues` | string[] | ✅ PASS | |
| 6.13 | `recommendedFixes` | string[] | ✅ PASS | |
| 6.14 | `rubricVersion` | `"phase2-quality-v1"` | ✅ PASS | |
| 6.15 | `createdAtMs` | ms timestamp | ✅ PASS | |
| 6.16 | `updatedAtMs` | ms timestamp | ✅ PASS | |

---

## 7. Firestore Document Checks — book summary

保存後に Firestore Console で `books/{bookId}` を確認する。

| # | Field | 期待値 | 結果 | 備考 |
|---|-------|--------|------|------|
| 7.1 | `latestQualityReviewId` | 作成した reviewId | ✅ PASS | |
| 7.2 | `qualityReviewStatus` | reviewed / needs_fix / approved | ✅ PASS | |
| 7.3 | `storyQualityScore` | 1〜5 | ✅ PASS | |
| 7.4 | `illustrationQualityScore` | 1〜5 | ✅ PASS | |
| 7.5 | `characterConsistencyScore` | 1〜5 | ✅ PASS | |
| 7.6 | `personalizationScore` | 1〜5 | ✅ PASS | |
| 7.7 | `safetyScore` | 1〜5 | ✅ PASS | |
| 7.8 | `overallQualityScore` | 5 項目平均（小数1桁） | ✅ PASS | |
| 7.9 | `qualityReviewedAtMs` | ms timestamp | ✅ PASS | |
| 7.10 | `qualityReviewerType` | `"human"` | ✅ PASS | |

---

## 8. Quality Review History 表示

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 8.1 | 直近 5 件が `createdAtMs` desc で表示される | ✅ PASS | リロード後も維持 |
| 8.2 | 各 review に status badge / overall score / 日時が表示される | ✅ PASS | |
| 8.3 | 各 review に 5 軸 score が表示される | ✅ PASS | |
| 8.4 | reviewReason が表示される | ✅ PASS | |
| 8.5 | flaggedIssues がリスト表示される | ✅ PASS | |
| 8.6 | データなしの場合 "No quality reviews yet" と表示される | ✅ PASS | |
| 8.7 | loading 中は「読み込み中...」と表示される | ☐ NOT_RUN | |
| 8.8 | error 時はエラーメッセージが表示される | ☐ NOT_RUN | |

---

## 9. Validation / Failure Cases

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 9.1 | score 未入力時に validation error が表示される | ☐ NOT_RUN | |
| 9.2 | 1〜5 以外の score は保存不可 | ☐ NOT_RUN | |
| 9.3 | reviewReason > 1000 文字で validation error | ☐ NOT_RUN | |
| 9.4 | Firestore permission denied 時に UI message が表示される | ☐ NOT_RUN | |
| 9.5 | secret / 個人情報が console.log に出力されない | ☐ NOT_RUN | |

---

## 10. Firestore Rules

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 10.1 | admin は `qualityReviews` を read できる | ✅ PASS | 保存後の history 表示で確認 |
| 10.2 | admin は `qualityReviews` を create できる | ✅ PASS | Save 成功で確認 |
| 10.3 | non-admin は `qualityReviews` を read/write できない | ☐ NOT_RUN | |
| 10.4 | `reviewerId == request.auth.uid` が enforce されている | ☐ NOT_RUN | |
| 10.5 | `reviewerType == "human"` が enforce されている | ☐ NOT_RUN | |
| 10.6 | status は `reviewed / needs_fix / approved` のみ create 可 | ☐ NOT_RUN | |
| 10.7 | `not_reviewed` は create では使わない（Book summary / UI fallback 用） | ✅ PASS | 設計意図通り |
| 10.8 | `onlyAdminReviewFieldsChanged()` に quality summary fields が含まれている | ✅ PASS | batch.update 成功で確認 |
| 10.9 | update / delete は false | ☐ NOT_RUN | |

---

## 11. Acceptance Criteria

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 11.1 | manual quality review を保存できる | ✅ PASS | basic flow verified |
| 11.2 | book summary が更新される | ✅ PASS | Firestore Console で確認 |
| 11.3 | Quality Review History が表示される | ✅ PASS | リロード後も維持 |
| 11.4 | 既存 book が壊れない | ✅ PASS | |
| 11.5 | admin / non-admin の rules が期待通り | ☐ NOT_RUN | admin のみ確認。non-admin は未テスト |
| 11.6 | Phase 2 の次実装に進める状態である | ✅ PASS | manual quality review basic flow verified |

---

## 結果サマリ

| カテゴリ | PASS | FAIL | NOT_RUN | 備考 |
|---------|------|------|---------|------|
| Prerequisites | 4 | 0 | 0 | |
| Book List | 5 | 0 | 1 | needs_fix 表示未テスト |
| Book Detail | 8 | 0 | 0 | |
| Quality Review Panel | 11 | 0 | 0 | |
| Save | 6 | 0 | 0 | |
| Firestore (qualityReviews) | 16 | 0 | 0 | |
| Firestore (book summary) | 10 | 0 | 0 | |
| History | 6 | 0 | 2 | loading / error 表示未テスト |
| Validation | 0 | 0 | 5 | |
| Rules | 4 | 0 | 5 | non-admin / enforcement 未テスト |
| Acceptance | 5 | 0 | 1 | non-admin rules 未テスト |
| **合計** | **75** | **0** | **14** | basic flow verified, 0 failures |
