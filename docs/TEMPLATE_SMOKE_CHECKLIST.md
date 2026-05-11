# Template Mode Smoke Checklist

作成日: 2026-05-08  
対象リポジトリ: `ksc0000/story-gen`  
対象 Phase: Template Mode Phase T1 + T2-A / fixed_template 6本

---

## 0. Overview

このチェックリストは、Template Mode Phase T1 + T2-A の fixed_template 6本が、実際に安定して絵本生成できるかを確認するための smoke checklist です。

対象テンプレート:

| Template ID | Title | Category | Page count |
|---|---|---|---:|
| `fixed-first-zoo` | はじめてのどうぶつえん | memories | 4 |
| `fixed-first-birthday` | はじめてのたんじょうび | memories | 4 |
| `fixed-bedtime-good-day` | きょうもいい日だったね | bedtime | 4 |
| `fixed-brush-teeth` | はみがきできたよ | growth-support | 4 |
| `fixed-first-christmas` | はじめてのクリスマス | seasonal-events | 4 |
| `fixed-sharing-friends` | おともだちとわけっこできたね | emotional-growth | 4 |

確認目的:

- fixed_template が Gemini story generation に依存せず生成できること
- cover / title spread / opening narration が template 由来で保存されること
- page image prompts が強化済み seed 由来で使われること
- 画像内文字を誘発しない prompt になっていること
- Reader UI で Cover → Title Spread → Story pages の流れが確認できること
- fixed_template 6テンプレートを T2-B 着手前の品質ゲートとして確認すること

---

## 1. Summary

| Item | Value |
|---|---|
| 実行日 |  |
| 実行者 |  |
| 対象環境 | local / staging / production |
| Firebase project |  |
| 対象 branch |  |
| 対象 commit SHA |  |
| checklist version | `docs/TEMPLATE_SMOKE_CHECKLIST.md` |
| overall result | PASS / PASS_WITH_FOLLOW_UP / FAIL / NOT_RUN |

---

## 2. Prerequisites

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 最新 `main` または対象branchが反映されている | ☐ | ☐ | ☐ |  |
| `functions/src/seed-templates.ts` に fixed_template 6テンプレートが存在する | ☐ | ☐ | ☐ |  |
| fixed_template 6テンプレートに `coverImagePromptTemplate` がある | ☐ | ☐ | ☐ |  |
| fixed_template 6テンプレートに `titleSpreadTextTemplate` がある | ☐ | ☐ | ☐ |  |
| fixed_template 6テンプレートに `openingNarrationTemplate` がある | ☐ | ☐ | ☐ |  |
| 全24ページに `pageVisualRole` がある | ☐ | ☐ | ☐ |  |
| `.env` / Firebase env secrets が生成に必要な状態になっている | ☐ | ☐ | ☐ |  |

---

## 3. Build / Test Result

| Command | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `npx tsc --noEmit` | ☐ | ☐ | ☐ |  |
| `npx next lint` | ☐ | ☐ | ☐ |  |
| `npx vitest run src/__tests__/` | ☐ | ☐ | ☐ |  |
| `cd functions && npx tsc --noEmit` | ☐ | ☐ | ☐ |  |
| `cd functions && npm test` | ☐ | ☐ | ☐ |  |
| `git diff --check` | ☐ | ☐ | ☐ |  |
| `grep -R "remaining content unchanged" .` | ☐ | ☐ | ☐ | 該当なしが期待値 |
| `grep -R "... (truncated)" .` | ☐ | ☐ | ☐ | 該当なしが期待値 |

---

## 4. Seed Template Static Checks

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `fixed-first-zoo` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-first-birthday` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-bedtime-good-day` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-brush-teeth` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-first-christmas` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| `fixed-sharing-friends` が `creationMode: "fixed_template"` | ☐ | ☐ | ☐ |  |
| 各テンプレートが4ページを維持している | ☐ | ☐ | ☐ |  |
| 既存 `textTemplate` が消えていない | ☐ | ☐ | ☐ |  |
| 既存 `textTemplatesByAge` が維持されている | ☐ | ☐ | ☐ |  |
| 既存 `titleTemplate` が維持されている | ☐ | ☐ | ☐ |  |

---

## 5. Cover / Title / Opening Template Checks

| Template ID | coverImagePromptTemplate | titleSpreadTextTemplate | openingNarrationTemplate | Negative text instructions | PASS/FAIL | Notes |
|---|---|---|---|---|---|---|
| `fixed-first-zoo` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-first-birthday` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-bedtime-good-day` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-brush-teeth` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-first-christmas` | ☐ | ☐ | ☐ | ☐ |  |  |
| `fixed-sharing-friends` | ☐ | ☐ | ☐ | ☐ |  |  |

Expected negative text instructions:

- `no text`
- `no letters`
- `no Japanese characters`
- `no readable signs`
- `no logo`
- `no watermark`

---

## 6. Page Visual Role Checks

Expected role sequence:

| Template ID | Expected roles |
|---|---|
| `fixed-first-zoo` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-first-birthday` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-bedtime-good-day` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-brush-teeth` | `opening_establishing` → `action` → `payoff` → `quiet_ending` |
| `fixed-first-christmas` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |
| `fixed-sharing-friends` | `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending` |

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 全24ページに `pageVisualRole` がある | ☐ | ☐ | ☐ |  |
| 先頭ページが `opening_establishing` | ☐ | ☐ | ☐ |  |
| 最終ページが `quiet_ending` | ☐ | ☐ | ☐ |  |
| `fixed-brush-teeth` の3ページ目が `payoff` | ☐ | ☐ | ☐ |  |
| role sequence が seed test と一致 | ☐ | ☐ | ☐ |  |

---

## 7. Image Prompt Quality Checks

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 全24ページの `imagePromptTemplate` が100文字以上 | ☐ | ☐ | ☐ |  |
| 全24ページに構図・画角表現がある | ☐ | ☐ | ☐ | `wide shot`, `medium shot`, `close-up`, etc. |
| 全24ページに主人公の行動・表情がある | ☐ | ☐ | ☐ |  |
| 全24ページに背景・照明・雰囲気がある | ☐ | ☐ | ☐ |  |
| 全24ページに `watercolor` または `storybook` style がある | ☐ | ☐ | ☐ |  |
| 全24ページに child-safe / gentle な方針がある | ☐ | ☐ | ☐ |  |
| 全24ページに negative text instructions がある | ☐ | ☐ | ☐ |  |
| 未展開 placeholder typo がない | ☐ | ☐ | ☐ |  |

---

## 8. Generation Smoke — Per Template

各テンプレートにつき、最低1回は実生成してください。可能なら主人公を変えて2回以上確認します。

| Template ID | Book ID | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|---|
| `fixed-first-zoo` |  | ☐ | ☐ | ☐ |  |
| `fixed-first-birthday` |  | ☐ | ☐ | ☐ |  |
| `fixed-bedtime-good-day` |  | ☐ | ☐ | ☐ |  |
| `fixed-brush-teeth` |  | ☐ | ☐ | ☐ |  |
| `fixed-first-christmas` |  | ☐ | ☐ | ☐ |  |
| `fixed-sharing-friends` |  | ☐ | ☐ | ☐ |  |

Per-book checks:

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| Book status が `completed` または `partial_completed` | ☐ | ☐ | ☐ |  |
| hard failed していない | ☐ | ☐ | ☐ |  |
| pages subcollection が4ページ | ☐ | ☐ | ☐ |  |
| pageNumber が0〜3で維持 | ☐ | ☐ | ☐ |  |
| 各pageの本文がtemplate由来 | ☐ | ☐ | ☐ |  |
| 各page画像が生成される、またはfallback/partialとして扱われる | ☐ | ☐ | ☐ |  |
| BookDoc に `coverImagePrompt` が保存される | ☐ | ☐ | ☐ |  |
| BookDoc に `titleSpreadText` が保存される | ☐ | ☐ | ☐ |  |
| BookDoc に `openingNarration` が保存される | ☐ | ☐ | ☐ |  |

---

## 9. Firestore Document Checks

BookDoc:

| Field | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `coverImagePrompt` | ☐ | ☐ | ☐ |  |
| `titleSpreadText` | ☐ | ☐ | ☐ |  |
| `openingNarration` | ☐ | ☐ | ☐ |  |
| `coverStatus` | ☐ | ☐ | ☐ | `completed` / `failed` / `generating` |
| `hasCoverPage` | ☐ | ☐ | ☐ | cover completed 時は true |
| `readingStructureVersion` | ☐ | ☐ | ☐ | cover completed 時は `v2_cover_title_story` |
| `coverImageUrl` | ☐ | ☐ | ☐ | cover completed 時に存在 |
| `coverImageDurationMs` | ☐ | ☐ | ☐ |  |
| `coverImageFallbackUsed` | ☐ | ☐ | ☐ | boolean / undefined を確認 |

Pages:

| Field | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| `books/{bookId}/pages/{pageId}` が4件 | ☐ | ☐ | ☐ |  |
| `pageNumber` が0〜3 | ☐ | ☐ | ☐ |  |
| page status が `completed` / `fallback_completed` / `image_failed` の想定範囲 | ☐ | ☐ | ☐ |  |
| page image prompt が強化済み構図に沿っている | ☐ | ☐ | ☐ |  |

---

## 10. Reader UI Checks

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| cover completed book で Cover が最初に表示される | ☐ | ☐ | ☐ |  |
| 次へ進むと Title Spread が表示される | ☐ | ☐ | ☐ |  |
| 次へ進むと story page 0 が表示される | ☐ | ☐ | ☐ |  |
| 左右スワイプでページ移動できる | ☐ | ☐ | ☐ |  |
| 前/次ボタンも動作する | ☐ | ☐ | ☐ |  |
| cover failed book は従来どおり page 0 から表示される | ☐ | ☐ | ☐ |  |
| 画像内にタイトル文字・日本語文字・ロゴ・透かしが目立って出ていない | ☐ | ☐ | ☐ |  |

---

## 11. Admin UI Checks

Route: `/admin/book-quality-review`

| Check | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| generated fixed_template book が一覧に表示される | ☐ | ☐ | ☐ |  |
| Book detail で cover fields が確認できる | ☐ | ☐ | ☐ |  |
| coverImagePrompt が表示される | ☐ | ☐ | ☐ |  |
| titleSpreadText / openingNarration が確認できる | ☐ | ☐ | ☐ |  |
| page statuses が確認できる | ☐ | ☐ | ☐ |  |
| Quality Review を保存できる | ☐ | ☐ | ☐ |  |
| cover regeneration button が表示・動作する | ☐ | ☐ | ☐ | 必要時のみ |

---

## 12. Quality Review Criteria

各生成結果を人間レビューしてください。

| Axis | PASS | FAIL | N/A | Evidence / Notes |
|---|---|---|---|---|
| 物語が4ページで自然に読める | ☐ | ☐ | ☐ |  |
| title spread / opening narration が読み聞かせ導入として自然 | ☐ | ☐ | ☐ |  |
| 各ページの絵が本文と一致している | ☐ | ☐ | ☐ |  |
| 主人公がページ間で大きく別人化していない | ☐ | ☐ | ☐ |  |
| 絵柄・色味・雰囲気が概ね一貫 | ☐ | ☐ | ☐ |  |
| 表紙がテンプレートのテーマを表している | ☐ | ☐ | ☐ |  |
| 画像内文字が出ていない、または許容範囲 | ☐ | ☐ | ☐ |  |
| 子ども向け・家庭向けとして安心 | ☐ | ☐ | ☐ |  |

Recommended score gate:

| Score | Meaning |
|---:|---|
| 5 | excellent / template ready |
| 4 | good / minor improvements |
| 3 | acceptable / monitor |
| 2 | needs prompt/template fix |
| 1 | should not ship |

Template smoke PASS の目安:

- fixed_template 6テンプレートすべて overall 4 以上
- safety は全テンプレート 5 推奨
- 画像内文字混入が重大でないこと

---

## 13. Issues Found

| ID | Severity | Template ID | Area | Description | Evidence / URL | Owner | Status | Follow-up issue / PR |
|---|---|---|---|---|---|---|---|---|
|  | High / Medium / Low |  | story / image / cover / UI / Firestore |  |  |  | open / in_progress / resolved |  |

---

## 14. Follow-up Actions

| Action | Owner | Due date | Priority | Related issue / PR | Status |
|---|---|---|---|---|---|
| Execute smoke generation for all 4 fixed templates |  |  | High |  | NOT_RUN |
| Record Firestore evidence for generated books |  |  | High |  | NOT_RUN |
| Review output quality in Admin UI |  |  | High |  | NOT_RUN |
| Decide whether Phase T2 template expansion can start |  |  | High |  | NOT_RUN |

---

## 15. Acceptance Criteria

Phase T1 can be treated as verified when all of the following are true:

- [ ] Build / typecheck / functions tests pass
- [ ] Existing 4 fixed templates generate without hard failure
- [ ] Each generated book has 4 story pages
- [ ] `coverImagePrompt`, `titleSpreadText`, `openingNarration` are saved for each template
- [ ] Cover image generation succeeds or fails non-fatally
- [ ] Reader UI displays Cover → Title Spread → Story pages when cover is completed
- [ ] Existing pageNumber / pages subcollection structure is unchanged
- [ ] No major image text / logo / watermark issue is observed
- [ ] Admin can inspect generated books and quality review them
- [ ] All high severity issues are resolved or documented as follow-up

---

## 16. Final Decision

Choose one:

- [ ] Template Phase T1 Verified
- [ ] Template Phase T1 Verified with follow-up
- [ ] Template Phase T1 Not Verified

Decision reason:

```text

```

Next recommended step:

- [ ] Start Phase T2-A: add templates 5〜6
- [ ] Fix prompt/template issues before expansion
- [ ] Add Template Smoke Results file
- [ ] Re-run smoke after fixes
