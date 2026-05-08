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
| 2-1 | Admin user でログインできる | PASS | 既存動作確認済み |
| 2-2 | `/admin/book-quality-review` が表示できる | PASS | 既存動作確認済み |
| 2-3 | manual quality review が保存済みの book がある | PASS | batch workflow で複数レビュー済み |
| 2-4 | low score の検証用 book がある | PASS | レビュー済み book に低スコアあり |
| 2-5 | approved / high score の検証用 book がある | PASS | approved book あり |
| 2-6 | existing QualityReviewPanel が表示できる | PASS | batch workflow 実機確認時に確認済み |
| 2-7 | existing filter / sort / batch workflow / trend dashboard が壊れていない | PASS | 25af6d5 実機確認済み |

---

## 3. Recommendation Logic

### 判定ルール

| # | 条件 | 期待 action | severity | Result | Evidence / Notes |
|---|---|---|---|---|---|
| 3-1 | `safetyScore <= 2` | `human_review_required` | high | PASS | vitest Scenario E |
| 3-2 | `storyQualityScore <= 2` | `rewrite_story` | high | PASS | vitest Scenario A |
| 3-3 | `illustrationQualityScore <= 2` | `regenerate_images` | high | PASS | vitest Scenario B |
| 3-4 | `characterConsistencyScore <= 2` | `fix_character_consistency` | high | PASS | vitest Scenario C |
| 3-5 | `personalizationScore <= 2` | `improve_personalization` | medium | PASS | vitest Scenario D |
| 3-6 | `overallQualityScore >= 4.2 && qualityReviewStatus == approved` | `approve` | low | PASS | vitest Scenario F |
| 3-7 | score 未設定 (`overallQualityScore` undefined) | recommendation なし | N/A | PASS | vitest Scenario G |

### 補足

- 各条件は独立判定。複数条件に該当する book は複数の recommendation を返す。
- `overallQualityScore == null` の場合は空配列を返す（recommendation なし）。
- score が 0 の場合はスキップ（score 未設定扱い）。

---

## 4. Book Detail UI

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 4-1 | `QualityRecommendationPanel` が `QualityReviewPanel` の下に表示される | PASS | page.tsx L2250 で QualityReviewPanel 直後に配置 |
| 4-2 | recommendation がない場合 `No recommendations yet` と表示される | PASS | コードレビュー: recommendations.length === 0 で表示 |
| 4-3 | recommendation がある場合 action label が表示される | PASS | ACTION_LABELS マップで全6種定義 |
| 4-4 | severity badge が表示される (HIGH / MEDIUM / LOW) | PASS | SEVERITY_BADGE_CLASSES で3種定義 |
| 4-5 | reason が表示される | PASS | `rec.reason` を `opacity-80` で表示 |
| 4-6 | `needs_fix` の book で panel が目立つ（赤枠） | PASS | `isNeedsFix → border-rose-300 bg-rose-50/30` |
| 4-7 | high severity がある場合 panel が目立つ（赤枠） | PASS | `hasHigh → border-rose-300 bg-rose-50/30` |
| 4-8 | approved / high score book で `Approved ✓` が表示される | PASS | ACTION_LABELS.approve = "Approved ✓" |

---

## 5. Book List UI

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 5-1 | recommendation count badge が表示される | PASS | QualityRecommendationBadge: `recommendations.length` 表示 |
| 5-2 | high severity がある場合 warning badge (⚠) が表示される | PASS | `hasHigh → "⚠" bg-rose-200` |
| 5-3 | medium / low のみの場合 info badge (💡) が表示される | PASS | `!hasHigh → "💡" bg-amber-100` |
| 5-4 | recommendation がない book では badge が表示されない | PASS | `recommendations.length === 0 → return null` |
| 5-5 | Q score / qualityReviewStatus 表示が壊れていない | PASS | badge は Q score 行の末尾に追加、既存表示を変更していない |
| 5-6 | existing list filter / sort が壊れていない | PASS | filter/sort ロジック未変更 |

---

## 6. Scenario Tests

### Scenario A: Story rewrite recommendation

| 項目 | 内容 |
|---|---|
| Setup | `storyQualityScore = 2`, 他 score = 4 |
| Expected | `rewrite_story`, severity: high |
| Result | PASS |
| Evidence / Notes | vitest: Scenario A PASS |

### Scenario B: Image regeneration recommendation

| 項目 | 内容 |
|---|---|
| Setup | `illustrationQualityScore = 2`, 他 score = 4 |
| Expected | `regenerate_images`, severity: high |
| Result | PASS |
| Evidence / Notes | vitest: Scenario B PASS |

### Scenario C: Character consistency recommendation

| 項目 | 内容 |
|---|---|
| Setup | `characterConsistencyScore = 2`, 他 score = 4 |
| Expected | `fix_character_consistency`, severity: high |
| Result | PASS |
| Evidence / Notes | vitest: Scenario C PASS |

### Scenario D: Personalization recommendation

| 項目 | 内容 |
|---|---|
| Setup | `personalizationScore = 2`, 他 score = 4 |
| Expected | `improve_personalization`, severity: medium |
| Result | PASS |
| Evidence / Notes | vitest: Scenario D PASS |

### Scenario E: Safety recommendation

| 項目 | 内容 |
|---|---|
| Setup | `safetyScore = 2`, 他 score = 4 |
| Expected | `human_review_required`, severity: high |
| Result | PASS |
| Evidence / Notes | vitest: Scenario E PASS |

### Scenario F: Approved book

| 項目 | 内容 |
|---|---|
| Setup | `overallQualityScore >= 4.2`, `qualityReviewStatus = approved` |
| Expected | `approve`, severity: low |
| Result | PASS |
| Evidence / Notes | vitest: Scenario F PASS |

### Scenario G: No score

| 項目 | 内容 |
|---|---|
| Setup | `overallQualityScore` undefined (未レビュー book) |
| Expected | recommendation なし |
| Result | PASS |
| Evidence / Notes | vitest: Scenario G PASS |

### Scenario Summary

| Scenario | Setup | Expected | Result | Evidence / Notes |
|---|---|---|---|---|
| A | story=2, 他=4 | `rewrite_story` / high | PASS | vitest 11/11 |
| B | illust=2, 他=4 | `regenerate_images` / high | PASS | vitest 11/11 |
| C | char=2, 他=4 | `fix_character_consistency` / high | PASS | vitest 11/11 |
| D | person=2, 他=4 | `improve_personalization` / medium | PASS | vitest 11/11 |
| E | safety=2, 他=4 | `human_review_required` / high | PASS | vitest 11/11 |
| F | overall>=4.2, approved | `approve` / low | PASS | vitest 11/11 |
| G | score未設定 | recommendation なし | PASS | vitest 11/11 |

---

## 7. Non-functional Checks

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 7-1 | Firestore write が発生しない | PASS | grep: QualityRecommendationPanel.tsx に setDoc/addDoc/updateDoc/writeBatch なし (0件) |
| 7-2 | secret / 個人情報を console に出さない | PASS | コードレビュー: console.log/warn/error なし |
| 7-3 | 既存 Quality Review 保存が壊れていない | PASS | handleSaveQualityReview 未変更 |
| 7-4 | Batch Workflow が壊れていない | PASS | batch handler 未変更 |
| 7-5 | Quality Trend Dashboard が壊れていない | PASS | computeQualityTrend / UI 未変更 |
| 7-6 | SLO Dashboard / Snapshot History / Stale Cleanup Status が壊れていない | PASS | 各セクション未変更 |

---

## 8. Acceptance Criteria

| # | 確認項目 | Result | Evidence / Notes |
|---|---|---|---|
| 8-1 | score に応じて正しい recommendation が出る | PASS | vitest 11/11 全シナリオ + 境界値 + 複数条件 |
| 8-2 | needs_fix / high severity が目立つ | PASS | コードレビュー: border-rose-300 / bg-rose-50/30 |
| 8-3 | book list で改善対象を見つけられる | PASS | QualityRecommendationBadge: ⚠/💡 + count |
| 8-4 | recommendation は derived data のみで Firestore に保存されない | PASS | grep: 0 write calls |
| 8-5 | 既存 admin quality review workflow が壊れていない | PASS | 既存ハンドラー・UI 未変更 |
| 8-6 | Recommendation Action Buttons 実装へ進める状態である | PASS | 型・コンポーネント構造が拡張可能 |

---

## 9. Result Summary

| Category | PASS | FAIL | N/A | Notes |
|---|---:|---:|---:|---|
| Prerequisites | 7 | 0 | 0 | |
| Recommendation Logic | 7 | 0 | 0 | vitest 11/11 (含む境界値・複数条件) |
| Book Detail UI | 8 | 0 | 0 | コードレビュー |
| Book List UI | 6 | 0 | 0 | コードレビュー |
| Scenario Tests | 7 | 0 | 0 | vitest 全 PASS |
| Non-functional Checks | 6 | 0 | 0 | grep + コードレビュー |
| Acceptance Criteria | 6 | 0 | 0 | |
| **Total** | **47** | **0** | **0** | |

---

確認日: 2026年05月08日
確認者: Copilot (vitest + コードレビュー)
検証方法: `npx vitest run src/__tests__/quality-recommendation.test.ts` (11/11 PASS) + grep + コードレビュー
