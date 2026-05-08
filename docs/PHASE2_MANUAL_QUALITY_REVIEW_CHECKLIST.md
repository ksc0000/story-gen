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
| — | — | — | staging / production |

---

## 1. Prerequisites

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 1.1 | Admin user でログインできる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 1.2 | 対象 book が 1 冊以上存在する | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 1.3 | Firestore rules が deploy 済み (`firebase deploy --only firestore:rules`) | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 1.4 | quality review fields が未設定の既存 book でもページが開ける | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 2. Book List 表示

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 2.1 | `overallQualityScore` が表示される（Q score: X.X） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 2.2 | `qualityReviewStatus` が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 2.3 | 未レビュー book は "—" / 空文字で表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 2.4 | `needs_fix` ステータスが目立つ表示になっている | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 2.5 | 既存の status badge 表示が壊れていない | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 2.6 | 既存の SLO / stale cleanup 表示が壊れていない | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 3. Book Detail Summary 表示

| # | 確認項目 | 期待値 | 結果 | 備考 |
|---|---------|--------|------|------|
| 3.1 | `overallQualityScore` | 数値 or "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.2 | `storyQualityScore` | 数値 or "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.3 | `illustrationQualityScore` | 数値 or "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.4 | `characterConsistencyScore` | 数値 or "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.5 | `personalizationScore` | 数値 or "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.6 | `safetyScore` | 数値 or "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.7 | `qualityReviewStatus` | badge 表示 or "Not reviewed" | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 3.8 | 未設定時は "—" / "Not reviewed" で表示される | — | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 4. Quality Review Panel — 入力

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 4.1 | Story Score を 1〜5 で選択できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.2 | Illustration Score を 1〜5 で選択できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.3 | Character Consistency Score を 1〜5 で選択できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.4 | Personalization Score を 1〜5 で選択できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.5 | Safety Score を 1〜5 で選択できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.6 | Status を reviewed / needs_fix / approved から選択できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.7 | Review Reason を入力できる（max 1000 文字） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.8 | Flagged Issues を入力できる（1行1件） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.9 | Recommended Fixes を入力できる（1行1件） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.10 | Overall Score preview がリアルタイム表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 4.11 | 全 score 未選択時は preview が "—" | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 5. Save — 保存

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 5.1 | "Save quality review" ボタンで保存成功する | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 5.2 | writeBatch により以下が**同時保存**される | | |
| 5.2a | — `books/{bookId}/qualityReviews/{reviewId}` が作成される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 5.2b | — `books/{bookId}` summary fields が更新される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 5.3 | 成功メッセージ「Quality review を保存しました」が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 5.4 | 保存後に form が初期化される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 5.5 | 保存後に Quality Review History が更新される | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 6. Firestore Document Checks — qualityReviews

保存後に Firestore Console で `books/{bookId}/qualityReviews/{reviewId}` を確認する。

| # | Field | 期待値 | 結果 | 備考 |
|---|-------|--------|------|------|
| 6.1 | `bookId` | 親 book の ID と一致 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.2 | `reviewerType` | `"human"` | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.3 | `reviewerId` | ログイン中 admin の UID | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.4 | `storyScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.5 | `illustrationScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.6 | `characterConsistencyScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.7 | `personalizationScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.8 | `safetyScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.9 | `overallScore` | 5 項目平均（小数1桁） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.10 | `status` | reviewed / needs_fix / approved | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.11 | `reviewReason` | 入力値（trimmed） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.12 | `flaggedIssues` | string[] | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.13 | `recommendedFixes` | string[] | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.14 | `rubricVersion` | `"phase2-quality-v1"` | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.15 | `createdAtMs` | ms timestamp | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 6.16 | `updatedAtMs` | ms timestamp | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 7. Firestore Document Checks — book summary

保存後に Firestore Console で `books/{bookId}` を確認する。

| # | Field | 期待値 | 結果 | 備考 |
|---|-------|--------|------|------|
| 7.1 | `latestQualityReviewId` | 作成した reviewId | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.2 | `qualityReviewStatus` | reviewed / needs_fix / approved | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.3 | `storyQualityScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.4 | `illustrationQualityScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.5 | `characterConsistencyScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.6 | `personalizationScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.7 | `safetyScore` | 1〜5 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.8 | `overallQualityScore` | 5 項目平均（小数1桁） | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.9 | `qualityReviewedAtMs` | ms timestamp | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 7.10 | `qualityReviewerType` | `"human"` | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 8. Quality Review History 表示

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 8.1 | 直近 5 件が `createdAtMs` desc で表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.2 | 各 review に status badge / overall score / 日時が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.3 | 各 review に 5 軸 score が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.4 | reviewReason が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.5 | flaggedIssues がリスト表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.6 | データなしの場合 "No quality reviews yet" と表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.7 | loading 中は「読み込み中...」と表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 8.8 | error 時はエラーメッセージが表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 9. Validation / Failure Cases

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 9.1 | score 未入力時に validation error が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 9.2 | 1〜5 以外の score は保存不可 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 9.3 | reviewReason > 1000 文字で validation error | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 9.4 | Firestore permission denied 時に UI message が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 9.5 | secret / 個人情報が console.log に出力されない | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 10. Firestore Rules

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 10.1 | admin は `qualityReviews` を read できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.2 | admin は `qualityReviews` を create できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.3 | non-admin は `qualityReviews` を read/write できない | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.4 | `reviewerId == request.auth.uid` が enforce されている | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.5 | `reviewerType == "human"` が enforce されている | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.6 | status は `reviewed / needs_fix / approved` のみ create 可 | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.7 | `not_reviewed` は create では使わない（Book summary / UI fallback 用） | ☐ PASS / ☐ FAIL / ☐ N/A | 設計意図 |
| 10.8 | `onlyAdminReviewFieldsChanged()` に quality summary fields が含まれている | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 10.9 | update / delete は false | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 11. Acceptance Criteria

| # | 確認項目 | 結果 | 備考 |
|---|---------|------|------|
| 11.1 | manual quality review を保存できる | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 11.2 | book summary が更新される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 11.3 | Quality Review History が表示される | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 11.4 | 既存 book が壊れない | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 11.5 | admin / non-admin の rules が期待通り | ☐ PASS / ☐ FAIL / ☐ N/A | |
| 11.6 | Phase 2 の次実装に進める状態である | ☐ PASS / ☐ FAIL / ☐ N/A | |

---

## 結果サマリ

| カテゴリ | PASS | FAIL | N/A | 備考 |
|---------|------|------|-----|------|
| Prerequisites | | | | |
| Book List | | | | |
| Book Detail | | | | |
| Quality Review Panel | | | | |
| Save | | | | |
| Firestore (qualityReviews) | | | | |
| Firestore (book summary) | | | | |
| History | | | | |
| Validation | | | | |
| Rules | | | | |
| Acceptance | | | | |
| **合計** | | | | |
