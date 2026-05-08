# Phase 2: Quality Recommendation 実機確認チェックリスト

## 1. Overview

| 項目 | 値 |
|---|---|
| 対象機能 | Rewrite / Regeneration Recommendation |
| 対象 route | `/admin/book-quality-review` |
| 対象 commit | `14befd15daaf8fc92e4d14ad48c8ff0226d4aaf5` |
| Firestore 書き込み | なし。derived data のみ |
| 使用データ | `storyQualityScore`, `illustrationQualityScore`, `characterConsistencyScore`, `personalizationScore`, `safetyScore`, `overallQualityScore`, `qualityReviewStatus` |

関連ファイル:

- `src/lib/quality-review.ts` — `buildQualityRecommendations(book)`
- `src/components/admin/QualityRecommendationPanel.tsx` — `QualityRecommendationPanel`, `QualityRecommendationBadge`
- `src/app/(app)/admin/book-quality-review/page.tsx` — Admin UI 統合

---

## 2. Prerequisites

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 2-1 | Admin user でログインできる | | |
| 2-2 | `/admin/book-quality-review` が表示できる | | |
| 2-3 | manual quality review が保存済みの book がある | | |
| 2-4 | low score の検証用 book がある | | |
| 2-5 | approved / high score の検証用 book がある | | |
| 2-6 | existing QualityReviewPanel が表示できる | | |
| 2-7 | existing filter / sort / batch workflow / trend dashboard が壊れていない | | |

---

## 3. Recommendation Logic

### 判定ルール

| # | 条件 | 期待 action | severity | Result | Evidence / Notes |
|---|---|---|---|---|---|
| 3-1 | `safetyScore <= 2` | `human_review_required` | high | | |
| 3-2 | `storyQualityScore <= 2` | `rewrite_story` | high | | |
| 3-3 | `illustrationQualityScore <= 2` | `regenerate_images` | high | | |
| 3-4 | `characterConsistencyScore <= 2` | `fix_character_consistency` | high | | |
| 3-5 | `personalizationScore <= 2` | `improve_personalization` | medium | | |
| 3-6 | `overallQualityScore >= 4.2 && qualityReviewStatus == approved` | `approve` | low | | |
| 3-7 | score 未設定 (`overallQualityScore` undefined) | recommendation なし | N/A | | |

### 補足

- 各条件は独立判定。複数条件に該当する book は複数の recommendation を返す。
- `overallQualityScore == null` の場合は空配列を返す（recommendation なし）。
- score が 0 の場合はスキップ（score 未設定扱い）。

---

## 4. Book Detail UI

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 4-1 | `QualityRecommendationPanel` が `QualityReviewPanel` の下に表示される | | |
| 4-2 | recommendation がない場合 `No recommendations yet` と表示される | | |
| 4-3 | recommendation がある場合 action label が表示される | | |
| 4-4 | severity badge が表示される (HIGH / MEDIUM / LOW) | | |
| 4-5 | reason が表示される | | |
| 4-6 | `needs_fix` の book で panel が目立つ（赤枠） | | |
| 4-7 | high severity がある場合 panel が目立つ（赤枠） | | |
| 4-8 | approved / high score book で `Approved ✓` が表示される | | |

---

## 5. Book List UI

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 5-1 | recommendation count badge が表示される | | |
| 5-2 | high severity がある場合 warning badge (⚠) が表示される | | |
| 5-3 | medium / low のみの場合 info badge (💡) が表示される | | |
| 5-4 | recommendation がない book では badge が表示されない | | |
| 5-5 | Q score / qualityReviewStatus 表示が壊れていない | | |
| 5-6 | existing list filter / sort が壊れていない | | |

---

## 6. Scenario Tests

### Scenario A: Story rewrite recommendation

| 項目 | 内容 |
|---|---|
| Setup | `storyQualityScore = 2`, 他 score = 4 |
| Expected | `rewrite_story`, severity: high |
| Result | |
| Evidence / Notes | |

### Scenario B: Image regeneration recommendation

| 項目 | 内容 |
|---|---|
| Setup | `illustrationQualityScore = 2`, 他 score = 4 |
| Expected | `regenerate_images`, severity: high |
| Result | |
| Evidence / Notes | |

### Scenario C: Character consistency recommendation

| 項目 | 内容 |
|---|---|
| Setup | `characterConsistencyScore = 2`, 他 score = 4 |
| Expected | `fix_character_consistency`, severity: high |
| Result | |
| Evidence / Notes | |

### Scenario D: Personalization recommendation

| 項目 | 内容 |
|---|---|
| Setup | `personalizationScore = 2`, 他 score = 4 |
| Expected | `improve_personalization`, severity: medium |
| Result | |
| Evidence / Notes | |

### Scenario E: Safety recommendation

| 項目 | 内容 |
|---|---|
| Setup | `safetyScore = 2`, 他 score = 4 |
| Expected | `human_review_required`, severity: high |
| Result | |
| Evidence / Notes | |

### Scenario F: Approved book

| 項目 | 内容 |
|---|---|
| Setup | `overallQualityScore >= 4.2`, `qualityReviewStatus = approved` |
| Expected | `approve`, severity: low |
| Result | |
| Evidence / Notes | |

### Scenario G: No score

| 項目 | 内容 |
|---|---|
| Setup | `overallQualityScore` undefined (未レビュー book) |
| Expected | recommendation なし |
| Result | |
| Evidence / Notes | |

### Scenario Summary

| Scenario | Setup | Expected | Result | Evidence / Notes |
|---|---|---|---|---|
| A | story=2, 他=4 | `rewrite_story` / high | | |
| B | illust=2, 他=4 | `regenerate_images` / high | | |
| C | char=2, 他=4 | `fix_character_consistency` / high | | |
| D | person=2, 他=4 | `improve_personalization` / medium | | |
| E | safety=2, 他=4 | `human_review_required` / high | | |
| F | overall>=4.2, approved | `approve` / low | | |
| G | score未設定 | recommendation なし | | |

---

## 7. Non-functional Checks

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 7-1 | Firestore write が発生しない | | |
| 7-2 | secret / 個人情報を console に出さない | | |
| 7-3 | 既存 Quality Review 保存が壊れていない | | |
| 7-4 | Batch Workflow が壊れていない | | |
| 7-5 | Quality Trend Dashboard が壊れていない | | |
| 7-6 | SLO Dashboard / Snapshot History / Stale Cleanup Status が壊れていない | | |

---

## 8. Acceptance Criteria

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 8-1 | score に応じて正しい recommendation が出る | | |
| 8-2 | needs_fix / high severity が目立つ | | |
| 8-3 | book list で改善対象を見つけられる | | |
| 8-4 | recommendation は derived data のみで Firestore に保存されない | | |
| 8-5 | 既存 admin quality review workflow が壊れていない | | |
| 8-6 | Recommendation Action Buttons 実装へ進める状態である | | |

---

## 9. Result Summary

| Category | PASS | FAIL | N/A | Notes |
|---|---:|---:|---:|---|
| Prerequisites | 0 | 0 | 0 | |
| Recommendation Logic | 0 | 0 | 0 | |
| Book Detail UI | 0 | 0 | 0 | |
| Book List UI | 0 | 0 | 0 | |
| Scenario Tests | 0 | 0 | 0 | |
| Non-functional Checks | 0 | 0 | 0 | |
| Acceptance Criteria | 0 | 0 | 0 | |
| **Total** | **0** | **0** | **0** | |

---

確認日: ____年__月__日
確認者: ________________
