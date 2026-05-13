# Template Mode T3 Plan (Pre-implementation)

作成日: 2026-05-12  
対象リポジトリ: `ksc0000/story-gen`  
ステータス: planned (implementation pending)

---

## 0. Context

前提:

- fixed_template 10本体制は完了（T2-A / T2-B / T2-C）
- seed追加 / Firestore同期 / smoke は完了
- sync script / smoke script は fixed_template 全件追従済み
- UX-001 / ADMIN-001 / UI-002 / MSG-001 は resolved
- IMG-001 は MITIGATED_WITH_MINOR_FOLLOW_UP
- IMG-002 は VERIFIED_WITH_MINOR_FOLLOW_UP
- REF-001 は R1 Design 完了（設計のみ）

---

## 1. T3 Candidate Scope

### 1) Template selection UI 改善

- 10本テンプレートをカテゴリ別に選びやすくする
- bedtime / daily-life / imagination / growth-support などのグルーピング
- 推奨テンプレート表示
- smoke済み / stable badge 概念

### 2) 既存10テンプレート品質磨き込み

- 画像promptの scene anchor 強化
- 本文の読み聞かせ自然さ改善
- page 4 closing message の自然さ改善
- no-text artifact の minor follow-up

### 3) 8ページ / 12ページ対応

- fixed_template pageCount 拡張
- Reader UI / generation flow / smoke checklist への影響整理
- コスト / 生成時間 / 失敗率への影響評価

### 4) Admin quality review 連携強化

- templateId / source filter は実装済み
- 次段で template quality score / visual issue tags / smoke evidence link を設計

---

## 2. Recommended Order

推奨順序:

1. T3-1: Template selection UI改善
2. T3-2: 既存10本の品質磨き込み
3. T3-3: 8/12ページ対応（後続）

補足:

- T3-4（Admin連携強化）は T3-2 と並走可能だが、初手はユーザー体験改善を優先
- T3-3 は影響範囲が広いため、T3-1 / T3-2 で現行4ページ品質を固めてから着手

---

## 3. Why This Order

### T3-1 を先にやる理由

- 既存10本の価値を最短でユーザー体験に反映できる
- 失敗率に大きく触れずに改善効果を出しやすい

### T3-2 を次にやる理由

- 画像・本文品質の底上げは販売品質に直結
- IMG-001 minor follow-up を安全に継続できる

### T3-3 を後ろに置く理由

- 影響範囲が大きい（生成時間・失敗率・UI・運用チェックリスト）
- 先に4ページ運用を安定させたほうが品質評価がしやすい

---

## 4. Phase Plan (No Implementation Yet)

### Phase T3-1: Selection UX

- カテゴリグルーピング
- 推奨テンプレート導線
- stable/smoke badge 表示仕様

Definition of done:

- 10本を迷わず選べる UI 情報設計が成立
- 既存導線を壊さず適用可能

### Phase T3-2: Template Quality Polish

- scene anchor 表現の磨き込み
- closing message の自然さ確認
- no-text artifact の minor tuning 方針

Definition of done:

- 重大な可読文字混入なし（現状維持以上）
- 代表テンプレートの読み聞かせ自然さが改善

### Phase T3-3: 8/12 Page Expansion

- pageCount 拡張設計
- 生成時間/失敗率/コスト評価
- smoke checklist 拡張案

Definition of done:

- 8/12ページを段階導入できる設計が成立
- SLO 悪化リスクに対する運用策が明示される

---

## 5. Dependencies and Risks

依存:

- REF-001 の設計内容（identity-only reference）
- IMG-001/IMG-002 の follow-up 結果

主要リスク:

- UI改善だけ先行しても品質課題が見えづらくなる
- 8/12ページ導入で生成時間・失敗率が悪化する可能性
- 評価指標なしで品質磨き込みを進めると改善効果が測れない

緩和:

- T3-1 の時点で最小限の観測指標（選択率・完了率）を定義
- T3-2 で template 単位のレビュー観点を固定
- T3-3 は small rollout 前提

---

## 6. Non-goals (This Plan)

- 今回は実装しない
- provider 変更はしない
- 既存生成済み book を再生成しない
- Firestore rules や Functions 実装には入らない

---

## 7. T3-1 Verification Result (2026-05-12)

対象実装:

- commit: `6eeed5d`
- files:
	- `src/app/(app)/create/theme/page.tsx`
	- `src/components/theme-card.tsx`

実装確認（コードベース）:

- fixed_template + category=all で category grouping を表示
- template card に category / pageCount / recommendedAge / templateId を表示
- fixed_template に「安定テンプレート」「SMOKE済み」badge を表示
- guided_ai / original_ai の分岐・遷移ロジックは既存維持
- 遷移: `Next` ボタンで `/create/input?theme=...&mode=...` を維持

検証コマンド結果:

- `npx tsc --noEmit`: pass
- `npx next lint`: pass（既存 warning のみ）
- `npx vitest run src/__tests__/`: 69 pass

実機確認ステータス:

- user-side manual visual verification: **verified (2026-05-12)**
- 確認結果:
	- fixed_template 10本表示: PASS
	- category grouping: PASS
	- category / pageCount / 推奨年齢 / templateId 表示: PASS
	- 安定テンプレート / SMOKE済み badge 表示: PASS
	- テンプレート選択後に `/create/input` へ進める: PASS
	- PC / モバイルで大きなレイアウト崩れなし: PASS
	- guided_ai / original_ai の表示・遷移維持: PASS

判定:

- **Implemented + Code-verified**
- **Manual visual verification complete**

---

## 8. T3-2 Quality Review Started (2026-05-12)

対象: `fixed_template` 10本（`fixed-first-zoo` / `fixed-first-birthday` / `fixed-bedtime-good-day` / `fixed-brush-teeth` / `fixed-first-christmas` / `fixed-sharing-friends` / `fixed-sleepy-moon-adventure` / `fixed-cardboard-rocket` / `fixed-rainy-day-puddle` / `fixed-little-helper`）

ステータス: **review-started (docs only)**

成果物:

- 棚卸し docs: [Template Quality Review](./TEMPLATE_QUALITY_REVIEW.md)
- 観点: category fit / story structure / text quality / image prompt quality / visual role consistency / smoke readiness / product value

優先度サマリ:

- P0: 0
- P1: 3 観点（`fixed-brush-teeth` の `pageVisualRole` 整合 / sampleImage の重複・カテゴリ不一致が `fixed-first-birthday` / `fixed-sleepy-moon-adventure` / `fixed-little-helper` に該当）
- P2: 4 観点（bedtime 2本の役割記述 / `parentMessage` 空時のデフォルト仕様明記 / 7-8歳向け文の短文化 / IMG-001 観測継続）
- No action: `fixed-first-christmas` / `fixed-cardboard-rocket`

次アクション（T3-2 実装フェーズ着手時）:

- T3-2a: `fixed-brush-teeth` の `pageVisualRole`（`action` / `payoff`）を canonical（`discovery` / `emotional_closeup`）へ揃えるか、`PageVisualRole` 型を拡張して許容を明文化
- T3-2b: P1 該当テンプレの `sampleImageUrl` を既存資産で再アサイン
- T3-2c: bedtime 2本の役割記述 / `parentMessage` デフォルト仕様の docs 反映
- T3-2d: 代表テンプレで 7-8歳向け文の短文化トライアル

判定:

- **Review done (docs only)**
- **Implementation pending — to start with P1 items**

追記: T3-2 P1-2 sync completed (2026-05-12)

- 対象 commit: `d24efd789bf3f76b86594be2e8d79de31b4703b8`
- 同期手順: functions build 後に `template:sync:check -> template:sync:write -> template:sync:check` を実施
- 結果: `target templates count = 10`、10 fixed_template 全件 drift なし
- Firestore 実値確認:
	- `fixed-first-birthday` => `/images/templates/food.png`
	- `fixed-sleepy-moon-adventure` => `/images/templates/fantasy.png`
	- `fixed-little-helper` => `/images/templates/emotional-growth.png`
- UI 実装確認: theme card は `template.sampleImageUrl` を画像 src として使用

P1-2 final confirmation note:

- `/create/theme` の user-side UI目視確認: **verified (2026-05-12)**
- 確認結果:
	- `fixed-first-birthday`: `/images/templates/food.png` のカード画像表示 PASS
	- `fixed-sleepy-moon-adventure`: `/images/templates/fantasy.png` のカード画像表示 PASS
	- `fixed-little-helper`: `/images/templates/emotional-growth.png` のカード画像表示 PASS
	- 他 fixed_template カードの表示崩れなし
	- category grouping 維持
	- `/create/input` への遷移 OK

P2 review result: `fixed-rainy-day-puddle` sampleImageUrl

- 結論: **keep as-is** (`/images/templates/seasonal.png`)
- 理由: 既存アセット群の中に雨・水たまり・日常発見テーマへ明確により近い画像がなく、代替候補は意味のズレや既存重複が強くなる
- 実施内容: docs のみ更新、コード変更なし

T3-2 text quality review result:

- 棚卸し完了: [Template Quality Review](./TEMPLATE_QUALITY_REVIEW.md) に本文品質レビューを追加
- P1: `fixed-rainy-day-puddle` / `fixed-little-helper` / `fixed-sharing-friends` は code fix 済み（2026-05-13 時点）
- P2: ~~`fixed-first-zoo` / `fixed-bedtime-good-day` / `fixed-sleepy-moon-adventure` の文長・語り自然化~~ は code fix 済み（2026-05-13）。全体語彙の散らしは docs-only 棚卸し完了（2026-05-13、Section 14 参照）
- No action: `fixed-first-birthday` / `fixed-brush-teeth` / `fixed-first-christmas` / `fixed-cardboard-rocket`

T3-2 P1 text fix result:

- 対象: `fixed-rainy-day-puddle`, `fixed-little-helper`, `fixed-sharing-friends`
- 実施:
	- `fixed-rainy-day-puddle` / `fixed-little-helper`: page 4 `textTemplatesByAge` の全 age bucket に `{parentMessage}` を保持
	- `fixed-sharing-friends`: `openingNarrationTemplate` を教材トーンから物語導入トーンへ調整し、`{lessonToTeach}` を維持
- 非対象: story structure, image prompt, sampleImageUrl, UI, `generate-book.ts`
- 期待効果:
	- smoke script / user input の `parentMessage` が age band を問わず最終ページへ反映
	- `fixed-sharing-friends` の導入文が読み聞かせ向けの自然なトーンになる

T3-2 P1 text fix sync/smoke completed:

- Firestore sync: `template:sync:check -> template:sync:write -> template:sync:check` 完了
- 1回目 check: `fixed-rainy-day-puddle` / `fixed-little-helper` に drift
- write 後 check: fixed_template 10本すべて drift なし
- smoke book IDs:
	- `fixed-rainy-day-puddle`: `6Bq2ZTTQdePwEaBXgzDC`
	- `fixed-little-helper`: `RgKCsAYZY1T2BjTSwH4s`
- smoke verification:
	- 両方 `status = completed` / `progress = 100`
	- page 4 に `parentMessage` が反映
	- 未展開の `{parentMessage}` は残っていない

---

## T3-2 P2 vocabulary dispersion: fixed-first-birthday (2026-05-13)

- 対象: `fixed-first-birthday` のみ（`fixed-first-zoo` は変更なし）
- 実装 commit: `9f1eb8b`
- 変更内容:
  - Candidate A — `openingNarrationTemplate`:
    - 変更前: 「きょうは とくべつな おいわいの日。{childName}と {familyMembers}の たんじょうびの思い出が はじまります。」
    - 変更後: 「ろうそくの あかりが、そっと ゆれる日。{childName}と {familyMembers}の たんじょうびの思い出が はじまります。」
  - Candidate B — P3 `emotional_closeup` / `preschool_3_4` / `general_child`:
    - 変更前（両バケット共通末尾）: 「みんなの こころも ぽかぽかです。」
    - 変更後: 「みんなの えがおが、ろうそくのひかりみたいに ひろがります。」
- 非対象: imagePromptTemplate / pageVisualRole / sampleImageUrl / generate-book.ts / Reader UI / Admin UI
- 検証: functions tsc / npm test (289 pass) / root tsc / lint / vitest (69 pass) すべて pass
- Firestore sync: `template:sync:check → npm run build → template:sync:write → template:sync:check` 完了
- sync 結果: `target templates count = 10`、fixed_template 10本すべて drift なし
- 単体 smoke:
	- template: `fixed-first-birthday`
	- bookId: `w5OMyZd6ox74K4wGzjva`
	- status: `completed` / progress: `100` / pages: 4 / page status: all `completed`
	- image generation: page 0: 29,210ms / page 1: 24,143ms / page 2: 15,518ms / page 3: 17,349ms (all successful)
	- characterConsistencyMode: all_pages ✓
	- hasOpeningNarration: true / placeholder 未展開残存: なし

---

## T3-2 Closure Summary (2026-05-13)

**Status: completed**

### Completed scope

| task | details | commit(s) |
| --- | --- | --- |
| P1 text correctness / placeholder consistency | fixed-rainy-day-puddle / fixed-little-helper parentMessage 修正 | `340eeed` |
| P1 opening narration tone fix | fixed-sharing-friends `openingNarrationTemplate` 修正 | `228f681` |
| P2 older-child text shortening | fixed-first-zoo 3ページ `early_elementary_7_8` 短縮 | `c8bd59c` |
| P2 bedtime text shortening | fixed-bedtime-good-day 3ページ `early_elementary_7_8` 短縮・自然化 | `61859ec` |
| P2 reassurance line naturalization | fixed-sleepy-moon-adventure page 3 語り自然化 | `4a89eea` |
| P2 vocabulary redundancy review | 全10本 docs-only 棚卸し（候補 A〜E 整理） | `0d6ae5d` |
| P2 vocabulary dispersion A/B | fixed-first-birthday opening / P3 散らし実装 | `9f1eb8b` |

### Verification method (all tasks)

- functions tsc + `seed-templates.test.ts` (289 tests) pass
- root tsc + `next lint` + `vitest run src/__tests__/` (69 tests) pass
- Firestore `template:sync:check → write → check` で drift なし
- 変更テンプレートごとに単体 smoke 完了

### Smoke coverage

| template | bookId | status |
| --- | --- | --- |
| fixed-rainy-day-puddle | `6Bq2ZTTQdePwEaBXgzDC` | completed |
| fixed-little-helper | `RgKCsAYZY1T2BjTSwH4s` | completed |
| fixed-sharing-friends | `IVNDnyyajAMmxLvuCKoz` | completed |
| fixed-first-zoo | `vMgnPuYNNdkzM71PTB37` | completed |
| fixed-bedtime-good-day | `KXXxdD2NhVb9Fh6OK3kM` | completed |
| fixed-sleepy-moon-adventure | `j9TMKRxoaPVNnaR3QClU` | completed |
| fixed-first-birthday | `w5OMyZd6ox74K4wGzjva` | completed |

### Remaining non-blocking items

- vocabulary Candidate C（「〜をみつけました」連続 / 4本）: P3 / T3-3 以降
- vocabulary Candidate D（「きらきら」多用 / 8本）: P3 / T3-3 以降
- vocabulary Candidate E（P3「にっこり」連続 / 5〜6本）: P3 / T3-3 以降
- P0/P1/P2 blockers: **0**。T3-2 正式クローズ

---

## T3-3 Kickoff Plan: Fixed Template Expansion Design (2026-05-13)

### Goal

既存 4-page fixed_template を壊さずに、8-page / 12-page variants をサポートする安全な拡張パスを設計する。

### Non-goals (この段階では実施しない)

- 8/12 ページテンプレートの実装
- `generate-book.ts` の変更
- Reader UI の変更
- Firestore rules の変更
- 既存 seed templates の変更

### Design Questions

| area | question | initial direction |
| --- | --- | --- |
| data model | `fixedStory.pages.length` を暗黙のページ数とするか、`pageCount` / `layoutVariant` を明示的に持つか | 後方互換性を保つ optional metadata を優先 |
| pricing | 4/8/12 ページを `priceTier` / `storyCostLevel` にどう対応させるか | 現行 4-page Ume をベースに将来 mapping を定義 |
| generation | `generate-book.ts` は任意の `fixedStory.pages` 長を既に扱えるか | 実装前に audit で確認（T3-3a） |
| smoke | smoke script はページ数を expected count でチェックできるか | expected-page-count checks を後で追加 |
| UI | Reader UI は 4 ページ固定を前提にしているか | 実装前に audit（T3-3a） |
| admin | Admin UI は 4 ページ固定を前提にしているか | 実装前に audit（T3-3a） |
| sync | template sync スクリプトは長い pages 配列を扱えるか | dry-run で確認（T3-3b） |
| compatibility | 既存生成済み book への影響は | pages は book ごとに保存されるため migration 不要 |

### Proposed Phases

#### T3-3a: Code audit only（次の推奨アクション）

以下を読むだけで変更しない:

- `generate-book.ts` の page ループが `pages.length` に依存しているか
- Reader UI のページレンダリングが `pages.length === 4` を前提にしているか
- Admin UI のテンプレート表示が 4 ページ固定か
- `scripts/create-template-smoke-books.js` / `inspect-template-smoke-book.js` のページ数検証ロジック
- `functions/test/seed-templates.test.ts` の page count 検証テスト

---

## T3-3a Code Audit: 4-page Assumption Inventory (2026-05-13)

### Status

docs-only audit completed.

### Audit Scope

| area | files inspected | result |
| --- | --- | --- |
| generation | `functions/src/generate-book.ts` | **low**（主要ループは `story.pages.length` 基準、4固定なし） |
| types / plans | `functions/src/lib/types.ts`, `functions/src/lib/plans.ts`, `src/lib/plans.ts` | **low**（`PageCount=4|8|12` 前提で拡張余地あり） |
| reader UI | `src/components/book-viewer.tsx`, `src/app/(app)/book/page.tsx`, `src/components/generation-progress.tsx`, `src/app/(app)/generating/page.tsx` | **low**（閲覧は動的、進捗表示も `pageCount`/配列長ベース） |
| create UI / template preview | `src/app/(app)/create/input/page.tsx`, `src/app/(app)/create/style/page.tsx` | **medium**（文言・役割ラベルが4ページ前提の表現を含む） |
| admin UI | `src/app/(app)/admin/book-quality-review/page.tsx` | **low**（page subcollection を動的取得） |
| smoke scripts | `scripts/create-template-smoke-books.js`, `scripts/inspect-template-smoke-book.js`, `scripts/inspect-smoke-book.js`, `scripts/sync-fixed-template-seeds.js` | **medium**（sync/check が `pages.length===4` を強制） |
| tests | `functions/test/seed-templates.test.ts`, `functions/test/generate-book.test.ts`, `src/__tests__/book-viewer.test.ts` | **medium**（seed系で4ページ固定テストが強い） |

### Findings

| id | area | file | finding | risk | recommendation |
| --- | --- | --- | --- | --- | --- |
| T3-3a-F1 | generation | `functions/src/generate-book.ts` | 画像生成タスクは `story.pages.map` で生成し、`totalPages = story.pages.length` を進捗/一貫性計算に使用。 | low | 生成パイプライン本体は現状維持。T3-3bで `fixedStory.pages.length` を source of truth と明記。 |
| T3-3a-F2 | generation | `functions/src/generate-book.ts` | fixed template の `pageCount` は `template.fixedStory?.pages.length` から正規化。ただし `isValidPageCount` は 4/8/12 のみ許可。 | low | T3-3b では 8/12 を正式対象として扱う（将来 16+ が必要なら別Decision）。 |
| T3-3a-F3 | generation/storage | `functions/src/generate-book.ts` | pages 保存は `books/{bookId}/pages/page-{pageNumber}`、`pageNumber` は 0-based。ループ由来なので任意ページ数に追従。 | low | 互換性維持のため 0-based のまま。UI側は表示時に +1 を継続。 |
| T3-3a-F4 | generation/text | `functions/src/generate-book.ts` | age別本文は `ageBand -> general_child -> textTemplate` のフォールバック。ページ数依存ロジックなし。 | low | 8/12 でも同フォールバックを維持。 |
| T3-3a-F5 | reader | `src/components/book-viewer.tsx` | `items.length` と `props.pages.length` でナビゲーション/表示を計算し、4固定なし。cover/title spread も独立項目化済み。 | low | Readerは大改修不要。8/12でUXのみ微調整。 |
| T3-3a-F6 | create UI | `src/app/(app)/create/input/page.tsx` | fixed_template の説明文が「4ページ構成で…」固定。`getFixedPageRoleLabel` も 0/1/2/last を前提。 | medium | 文言を pages.length 参照に変更し、role label を `pageVisualRole` 優先に置換。 |
| T3-3a-F7 | smoke/sync | `scripts/sync-fixed-template-seeds.js` | `pages.length !== 4` を issue として扱い、sync check/write 完了判定が4ページ前提。 | medium | `expectedPageCount`（4/8/12）導入、または `template.fixedStory.pages.length >= 1` + policy判定へ変更。 |
| T3-3a-F8 | smoke/create | `scripts/create-template-smoke-books.js` | 作成payloadの `pageCount: 4` が固定。 | medium | `--page-count` 引数追加（デフォルト4）、template由来値優先。 |
| T3-3a-F9 | tests | `functions/test/seed-templates.test.ts` | `preserves 4 pages` など 4固定アサーションがあり、8/12導入時に失敗予定。 | medium | 共通契約を「`fixedStory.pages.length === declaredPageCount`」へ置換し、4/8両fixture追加。 |
| T3-3a-F10 | tests | `functions/test/generate-book.test.ts` | 一部は `fixedStory.pages.length` で動的検証済み、拡張耐性あり。 | low | 既存動的テストを維持しつつ 8-page fixed template ケースを追加。 |

### 4-page Hard Assumptions

| area | file | assumption | impact for 8/12 page |
| --- | --- | --- | --- |
| sync validation | `scripts/sync-fixed-template-seeds.js` | `pages.length !== 4` をエラー扱い | sync check/write が常時NGになる |
| seed tests | `functions/test/seed-templates.test.ts` | `expect(template.fixedStory?.pages.length).toBe(4)` | CI失敗（template変更がマージ不能） |
| create UI copy | `src/app/(app)/create/input/page.tsx` | fixed_template説明文に「4ページ構成」固定文言 | 実装後もUI説明が誤案内 |
| smoke create script | `scripts/create-template-smoke-books.js` | smoke payload の `pageCount: 4` 固定 | 8/12 template smoke が作成不能 |

### Dynamic / Already-compatible Areas

| area | file | reason |
| --- | --- | --- |
| story->page generation | `functions/src/generate-book.ts` | `story.pages.map` / `totalPages=story.pages.length` で動的処理 |
| character reference policy | `functions/src/generate-book.ts` | `totalPages` から emotional peak / last page を計算 |
| page persistence | `functions/src/generate-book.ts` | `pageNumber` はループindex由来で任意ページ数対応 |
| reader navigation | `src/components/book-viewer.tsx` | `items.length` で prev/next と表示制御 |
| generating screen | `src/app/(app)/generating/page.tsx`, `src/components/generation-progress.tsx` | `book.pageCount` / `pages.length` ベースの進捗表示 |
| admin page list | `src/app/(app)/admin/book-quality-review/page.tsx` | pages subcollectionを `orderBy(pageNumber)` で動的取得 |
| inspect output | `scripts/inspect-template-smoke-book.js`, `scripts/inspect-smoke-book.js` | pages.size / docs配列で可変ページ数を表示 |

### Recommended T3-3b Direction

- data model:
	- add optional `pageCount` on fixed template metadata (document-level)
	- add optional `layoutVariant` (`"4_page" | "8_page" | "12_page"`)
	- keep runtime source of truth as `fixedStory.pages.length`
- smoke:
	- add expected page count validation (`--expected-page-count`)
	- add `--page-count` to smoke create script
- tests:
	- keep 4-page regression tests
	- add one 8-page fixed fixture path (sync + generation + reader)
- UI:
	- replace hard-coded copy "4ページ構成" with dynamic copy
	- move preview role label logic to `pageVisualRole`-first

### Go / No-go

**Go for T3-3b**

- high-risk blocker: **0**
- medium-risk findings: **4**（sync/test/smoke/create UI copy）
- low-risk findings: **6**

判断: 生成パイプライン（`generate-book.ts`）は `fixedStory.pages` を動的処理しており、ラスボスではない。先に sync/test/smoke/create UI の4ページ固定前提を設計で解消すれば、T3-3b に進行可能。

---

## T3-3b Data Model Proposal: Page Count Contract (2026-05-13)

### Status

docs-only proposal.

### Decision Summary

| decision | value |
| --- | --- |
| runtime source of truth | `fixedStory.pages.length` |
| optional metadata | `pageCount?: 4 | 8 | 12` |
| optional layout metadata | `layoutVariant?: "4_page" | "8_page" | "12_page"` |
| compatibility | metadata なし既存テンプレは `fixedStory.pages.length` から解釈 |
| validation | `pageCount` が存在する場合、`fixedStory.pages.length` と一致必須 |
| allowed counts | T3-3 時点では 4 / 8 / 12 のみ |
| existing books | migration 不要（bookごとに pages を保持済み） |

### Proposed Type Contract (design only)

```ts
type FixedTemplateLayoutVariant = "4_page" | "8_page" | "12_page";

interface FixedStoryTemplate {
	pages: FixedStoryPageTemplate[];
	pageCount?: 4 | 8 | 12;
	layoutVariant?: FixedTemplateLayoutVariant;
}
```

補足:
- ここは設計案。実際の型名・配置は `functions/src/lib/types.ts` に合わせて実装時に調整。
- runtime は引き続き `fixedStory.pages.length` を使用し、metadata は契約チェックと可読性のために付加。

### Validation Rules

| rule | behavior |
| --- | --- |
| `fixedStory.pages.length` must be one of 4 / 8 / 12 | invalid otherwise |
| if `fixedStory.pageCount` exists, it must equal `fixedStory.pages.length` | invalid otherwise |
| if `layoutVariant` exists, it must match page count (`4_page`/`8_page`/`12_page`) | invalid otherwise |
| existing templates without metadata | accepted; infer count from `fixedStory.pages.length` |
| future 8/12 templates | metadata 推奨。ただし runtime source は `pages.length` |

### Implementation Impact

| area | change |
| --- | --- |
| sync script | `pages.length !== 4` を allowed-count contract 検証へ置換 |
| seed tests | `toBe(4)` 固定を contract-based 検証へ置換 |
| smoke create | `--page-count` 追加、または template から count を推論 |
| smoke inspect | expected/actual page count の表示を任意追加 |
| create UI | 固定文言「4ページ構成」を動的表示へ変更 |
| `generate-book.ts` | 原則変更不要（すでに `fixedStory.pages.length` runtime） |
| Reader UI | 構造変更は不要見込み |
| Admin UI | 構造変更は不要見込み |

### Mapping from T3-3a Findings

| finding | proposed resolution |
| --- | --- |
| T3-3a-F6 create UI copy | T3-3b-3 dynamic page count copy + role label pageVisualRole-first |
| T3-3a-F7 sync/check `pages.length !== 4` | T3-3b-1 allowed-count validation |
| T3-3a-F8 smoke create `pageCount: 4` | T3-3b-2 `--page-count` and/or template inferred count |
| T3-3a-F9 seed tests `toBe(4)` | T3-3b-1 contract-based tests |

### T3-3b Implementation Slice Recommendation

#### T3-3b-1 sync/test contract

- `scripts/sync-fixed-template-seeds.js` を contract 検証へ更新
- `functions/test/seed-templates.test.ts` を 4固定検証から契約検証へ更新
- テンプレ本文は変更しない

#### T3-3b-2 smoke script page count support

- `scripts/create-template-smoke-books.js` に `--page-count` 追加
- inspect系に `--expected-page-count`（または同等）を追加
- デフォルトは 4 を維持して後方互換

#### T3-3b-3 create UI dynamic copy

- `src/app/(app)/create/input/page.tsx` の「4ページ構成」固定文言を撤廃
- role label は `pageVisualRole` 優先の表示へ

#### T3-3b-4 docs/test verification

- compatibility policy を docs に明記
- 回帰テスト + 8-page fixture テスト追加

### Go / No-go for T3-3c Pilot

T3-3c pilot（8-page template）開始条件:

- sync が 4/8/12 を受理
- seed tests が「全 fixed template = 4 pages」前提を持たない
- smoke が expected 8 pages を作成・検証可能
- create UI が fixed_template を一律4ページと説明しない

## T3-3b-1 Implementation: Sync/Test Page Count Contract (2026-05-13)

### Scope

- Updated sync validation from fixed 4-page assumption to allowed page count contract.
- Updated seed template tests from `toBe(4)` to contract-based validation.
- Existing 10 fixed templates remain 4-page.
- No seed template text changes.
- Smoke script and create UI remain future slices.

### Contract

- Runtime source of truth: `fixedStory.pages.length`
- Allowed counts: `4 / 8 / 12`
- Optional `pageCount` must match `fixedStory.pages.length`
- Optional `layoutVariant` must match page count (`4_page` / `8_page` / `12_page`)
- Existing metadata-less 4-page templates remain valid

### Verification

- functions tsc: pass
- seed-templates.test.ts: pass
- template sync check: pass

## T3-3b-2 Implementation: Smoke Script Page Count Support (2026-05-13)

### Scope

- Added `--page-count` support to smoke create script.
- Added `--expected-page-count` support to smoke inspect scripts.
- Page count resolution order in create script:
	1. explicit `--page-count`
	2. `fixedStory.pageCount`
	3. `fixedStory.pages.length`
	4. default `4`
- Existing 4-page smoke flows remain backward-compatible.
- No seed template text changes.
- Sync script unchanged in this slice.

### Validation

- `--page-count=4` accepted
- invalid `--page-count=6` rejected
- `--expected-page-count=4` passes against existing 4-page smoke book
- `--expected-page-count=8` fails with non-zero exit against existing 4-page smoke book
- template sync check: pass

## T3-3b-3 Implementation: Create UI Dynamic Page Count Copy (2026-05-13)

### Scope

- Replaced hard-coded fixed template copy (`4ページ構成`) with dynamic page count copy.
- Page count resolution order in create UI:
	1. `fixedStory.pageCount`
	2. `fixedStory.pages.length`
	3. fallback `4`
- Updated fixed template page role labels to prefer `pageVisualRole`.
- Fallback role labeling keeps current behavior for existing 4-page templates.
- No seed template text changes.
- No generation / smoke / sync changes in this slice.

### Verification

- root tsc: pass
- next lint: existing warnings only
- frontend vitest (`src/__tests__/`): pass

## T3-3b-4 Compatibility Verification / 8-page Pilot Readiness Check

### Status

completed.

### Verification Matrix

| area | check | result |
| --- | --- | --- |
| sync | accepts 4/8/12 page count contract | pass |
| tests | seed template tests no longer assume all templates are exactly 4 pages | pass |
| smoke create | `--page-count=4` and `--page-count=8` accepted | pass |
| smoke create | invalid `--page-count=6` rejected | pass |
| smoke inspect | `--expected-page-count=4` passes on existing 4-page book | pass |
| smoke inspect | `--expected-page-count=8` fails on existing 4-page book | pass |
| create UI | fixed template copy uses dynamic page count | pass |
| create UI | page role label prefers `pageVisualRole` | pass |

### Remaining Known Defaults

- `default 4` remains intentionally for backward compatibility.
- Existing fixed templates remain 4-page.
- No 8-page seed template has been added yet.

### Go / No-go

**Go for T3-3c pilot 8-page template.**

Reason:
- High blockers: 0
- sync/test/smoke/create UI are no longer hard-blocked by a 4-page-only assumption
- generation path was already `pages.length` based from T3-3a audit
- reader/admin were already dynamic enough for pilot verification

### Recommended T3-3c Pilot

Start with one low-risk 8-page template variant.

Recommended candidate:
- `fixed-first-birthday`

Reason:
- already recently cleaned up in T3-2
- simple narrative arc
- birthday scenes naturally split into more beats
- smoke and UI verification history exists

Non-goals for T3-3c:
- do not convert all templates
- do not add 12-page yet
- do not change pricing beyond documenting assumptions

## T3-3c Pilot: fixed-first-birthday-8p

### Scope

- Added one 8-page pilot fixed template: `fixed-first-birthday-8p`.
- Existing `fixed-first-birthday` 4-page template remains unchanged.
- Added `fixedStory.pageCount: 8`.
- Added `fixedStory.layoutVariant: "8_page"`.
- No 12-page template added.
- No pricing change.

### Pilot Scene Plan

| page | role | scene |
| --- | --- | --- |
| 1 | opening_establishing | birthday morning |
| 2 | action | decoration / preparation |
| 3 | discovery | cake / candle discovery |
| 4 | payoff | family celebration |
| 5 | object_detail | present / birthday object |
| 6 | emotional_closeup | feeling a little bigger |
| 7 | quiet_ending | smiles and afterglow |
| 8 | quiet_ending | parent message closing |

### Verification Plan

- functions tsc
- seed-templates.test.ts
- template sync check
- smoke create with `--template-id=fixed-first-birthday-8p --page-count=8 --write`
- inspect with `--expected-page-count=8`

### T3-3c Smoke Verification

- template: `fixed-first-birthday-8p`
- bookId: `cOhH25oa7cex7C0yEqB9`
- sync: completed / target templates count 11 / driftなし
- smoke: completed / progress 100 / pages 8 / all completed
- inspect: `--expected-page-count=8` PASS
- placeholder: 未展開残りなし（title/opening/pages確認）

## T3-3c-2 Review: fixed-first-birthday-8p Quality / Hardening

### Status

completed.

### Review Result

| area | result | notes |
| --- | --- | --- |
| page count metadata | pass | `pageCount=8`, `layoutVariant=8_page` |
| page count | pass | 8 pages |
| parent message | pass | final page includes `{parentMessage}` |
| placeholder expansion | pass | no unresolved placeholders in smoke |
| image prompts | pass / minor | scene variation confirmed |
| read-aloud pacing | pass / minor | 8-page pacing acceptable |
| pageVisualRole | pass | valid roles only |
| existing 4-page template | pass | unchanged |

### Decision

- No P0/P1 blockers.
- T3-3c pilot remains valid.
- Recommended next step: choose whether to add one more 8-page pilot or proceed to Reader/UI manual QA.

### Notes

- Page 7 and page 8 intentionally both close the story, but with different emphasis: afterglow scene, then parent message closing.
- No code changes were required for this review pass.

## T3-3d Manual QA Checklist: 8-page Reader/UI

### Status

planned.

### Target

- template: `fixed-first-birthday-8p`
- smoke bookId: `cOhH25oa7cex7C0yEqB9`
- expected page count: 8

### Preconditions

- Firestore sync completed
- smoke completed / progress 100
- inspect `--expected-page-count=8` PASS
- no P0/P1 blocker from T3-3c-2 review

### Data QA

| check | expected | result |
| --- | --- | --- |
| book document page count | `pageCount=8` | pending |
| pages subcollection count | 8 pages exist | pending |
| page numbering | pageNumber is 1〜8 or existing spec remains consistent | pending |
| page status coverage | all 8 pages are present and readable | pending |

### Reader QA

| check | expected | result |
| --- | --- | --- |
| book opens | Reader loads without error | pending |
| total page count | shows 8 pages or equivalent progress | pending |
| next navigation | can move from page 1 to page 8 | pending |
| previous navigation | can move backward without error | pending |
| final page | parent message closing displays naturally | pending |
| progress indicator | reflects 8-page sequence | pending |
| image rendering | all 8 images visible | pending |
| text rendering | all 8 page texts visible without overflow | pending |
| mobile viewport | no severe layout break | pending |

### Create UI QA

| check | expected | result |
| --- | --- | --- |
| 4-page template display | `fixed-first-birthday` shows 4-page copy | pending |
| 8-page template display | `fixed-first-birthday-8p` shows 8-page copy | pending |
| page role labels | preview uses pageVisualRole-based labels | pending |
| template selection | both birthday templates are distinguishable | pending |

### Admin / Review QA

| check | expected | result |
| --- | --- | --- |
| book page list | 8 pages are visible | pending |
| page status | all 8 completed statuses visible | pending |
| regeneration action | page-level action does not assume 4 pages | pending |
| quality review | 8-page book can be reviewed without layout issue | pending |

### Go / No-go Criteria

Go to second 8-page pilot only if:

- Reader can navigate all 8 pages
- Create UI correctly differentiates 4p vs 8p template
- Admin/review UI does not hide pages 5〜8
- No P0/P1 layout or data issue

### Recommended Next Step

Run manual QA against smoke book `cOhH25oa7cex7C0yEqB9`.

## T3-3d-1 Manual QA Execution Result

### Status

partial.

### Date

2026-05-13

### Target

- template: `fixed-first-birthday-8p`
- smoke bookId: `cOhH25oa7cex7C0yEqB9`
- expected page count: 8

### Summary

- Data QA: pass
- Reader QA: partial
- Create UI QA: not run
- Admin / Review QA: not run
- P0/P1 blocker: none found in the checked paths

### Data QA Result

| check | expected | result |
| --- | --- | --- |
| book document page count | `pageCount=8` | pass |
| pages subcollection count | 8 pages exist | pass |
| page numbering | pageNumber is 1〜8 or existing spec remains consistent | pass |
| page status coverage | all 8 pages are present and readable | pass |
| all page status | completed | pass |

Evidence:

- `inspect-smoke-book.js` PASS (`pagesCount=8`, `expectedPageCount=8`, `pageCountCheck=PASS`)
- `inspect-template-smoke-book.js` PASS
- page numbers observed: `0..7`
- all 8 pages status: `completed`

### Reader QA Result

| check | expected | result |
| --- | --- | --- |
| book opens | Reader loads without error | pass |
| total page count | shows 8 pages or equivalent progress | not run |
| next navigation | can move from page 1 to page 8 | not run |
| previous navigation | can move backward without error | not run |
| final page | parent message closing displays naturally | not run |
| progress indicator | reflects 8-page sequence | not run |
| image rendering | all 8 images visible | not run |
| text rendering | all 8 page texts visible without severe overflow | not run |
| mobile viewport | no severe layout break | not run |

Evidence:

- `http://localhost:3000/book/?id=cOhH25oa7cex7C0yEqB9` returned `200` for the initial shell.
- `BookViewer` uses `props.pages.length` for `totalPages` and page label generation, and navigation clamps to `[0, totalPages - 1]`.

### Create UI QA Result

| check | expected | result |
| --- | --- | --- |
| 4-page template display | `fixed-first-birthday` shows 4-page copy | not run |
| 8-page template display | `fixed-first-birthday-8p` shows 8-page copy | not run |
| page role labels | preview uses pageVisualRole-based labels | not run |
| template selection | both birthday templates are distinguishable | not run |

Evidence:

- `create/input` initial shell returned `200`.
- Source review confirms `getFixedTemplatePageCount()` accepts `4 | 8 | 12` and `getFixedPageRoleLabel()` prefers `pageVisualRole`.

### Admin / Review QA Result

| check | expected | result |
| --- | --- | --- |
| book page list | 8 pages are visible | not run |
| page status | all 8 completed statuses visible | not run |
| regeneration action | page-level action does not assume 4 pages | not run |
| quality review | 8-page book can be reviewed without layout issue | not run |

Evidence:

- `admin/book-quality-review` initial shell returned `200`.
- Source review confirms page queries are ordered by `pageNumber`, regeneration uses `page.pageNumber`, and review panel itself is page-count agnostic.

### Follow-up

- Run actual browser interaction for Reader page turning, mobile layout, Create UI template comparison, and Admin page list rendering once the browser agent/chat tool is enabled.

### Go / No-go Result

**Go / No-go:** Hold

Reason:

- Data QA passed and no P0/P1 blocker was found in the inspected paths.
- However, the interactive Reader / Create / Admin UI checks were not fully exercised in-browser, so the manual QA checklist is not complete yet.
- The code paths inspected are compatible with 8 pages, but the remaining UI confirmations still need a real browser pass.

#### T3-3b: Data model proposal

- optional `pageCount` フィールド（backward-compatible）
- optional `layoutVariant`: `"4_page"` / `"8_page"` / `"12_page"`
- optional `expansionLevel` の検討
- breaking changes なし

#### T3-3c: One pilot 8-page template

- リスクの低いテンプレート 1 本を選択
- 候補: `fixed-first-birthday` または `fixed-first-zoo`
- 既存 `fixed_template` パスを維持したまま実装

#### T3-3d: Smoke and UX verification

- Firestore sync
- 単体 smoke（page count の確認）
- Reader UI 手動確認
- テキストペーシングレビュー

### Risk Register

| risk | impact | mitigation |
| --- | --- | --- |
| UI が 4 ページを前提 | Reader が壊れる | T3-3a audit 先行 |
| smoke script が 4 ページ前提 | 誤検知 failure | expected count の追加 |
| ページ数増加で生成コスト増加 | コスト影響 | priceTier/storyCostLevel との対応定義 |
| ストーリーペーシングが薄くなる | 品質低下 | page role plan を先に設計してから本文を書く |
| 多ページでの画像一貫性低下 | ビジュアルドリフト | `characterConsistencyMode` の動作確認 |

### Recommended Next Action

**T3-3a code audit** から開始。`generate-book.ts` / Reader UI / Admin UI / smoke scripts の 4 ページ前提箇所を洗い出してリスト化。実装は audit 完了後。

	- image generation: page 0: 29,210ms / page 1: 24,143ms / page 2: 15,518ms / page 3: 17,349ms (all successful)
	- characterConsistencyMode: all_pages ✓
	- hasOpeningNarration: true / placeholder 展開: 未展開残存なし


T3-2 P1 opening narration tone fix sync/smoke completed (Issue #8):

- 対象 commit: `228f681`
- Firestore sync: `template:sync:check -> template:sync:write -> template:sync:check` 完了
- sync 結果: `target templates count = 10`、fixed_template 10本すべて drift なし
- 単体 smoke:
	- template: `fixed-sharing-friends`
	- bookId: `IVNDnyyajAMmxLvuCKoz`
	- status: `completed` / pages: 4 / page status: all `completed`
	- openingNarration（実測）: `きょうは、SmokeKid1が おともだちと すごすなかで、sharingの あたたかさに そっと きづいていく おはなしです。`
	- page 4（実測）: `きょうもすてきな一日だったね`
	- placeholder 展開: `{lessonToTeach}` は openingNarration で展開済み、未展開残存なし

---

## T3-2 P2 early_elementary_7_8 shortening: fixed-first-zoo (2026-05-13)

- 対象: `fixed-first-zoo` の 3ページ（page 0, 1, 2）の `early_elementary_7_8` テキスト
- 修正内容:
	- page 0: 黄色い星の詳細説明を削除し、シンプルな期待感に「きょうの ぼうけんが はじまります。」
	- page 1: 動き方・暮らし方の違い・黄色い星の補足を削除「大きなどうぶつ、小さなどうぶつ。{childName}は 夢中になります。」
	- page 2: 迷いから発見への長い流れを、結果に焦点を当てて短縮「いちばんうれしかったのは、{childName}が にっこり笑った そのしゅんかんでした。どうぶつたちの やさしさが 分かったのです。」
- 目的: 読み聞かせテンポの改善、親が読み上げる際のリズム自然化
- 非対象: story structure / openingNarrationTemplate / imagePromptTemplate / sampleImageUrl / pageVisualRole / generate-book.ts
- 検証: functions tsc / npm test / root tsc / lint / vitest すべて pass
- 対象 commit: `c8bd59c`
- Firestore sync: `template:sync:check -> template:sync:write -> template:sync:check` 完了
- sync 結果: `target templates count = 10`、fixed_template 10本すべて drift なし
- 単体 smoke:
	- template: `fixed-first-zoo`
	- bookId: `vMgnPuYNNdkzM71PTB37`
	- status: `completed` / pages: 4 / page status: all `completed`
	- image generation: 18,802–20,851 ms (all successful, no failures)
	- characterConsistencyMode: all_pages ✓
	- 結果: 短文化されたテキストで問題なく生成完了

---

## T3-2 P2 early_elementary_7_8 shortening: fixed-bedtime-good-day (2026-05-13)

- 対象: `fixed-bedtime-good-day` の 3ページ（page 0, 1, 2）の `early_elementary_7_8` テキスト
- 修正内容:
	- page 0: 抽象的な「こころの本だなへ しまっていきます」を削除し、感覚的な「こころが やさしくなっていきます」に変更
	- page 1: 説明文「それぞれの いろがあり...はっきりしてきました」を削除し、視覚的「ふんわり 光っています」に簡潔化
	- page 2: 未来志向「あしたへ つながる だいじな...」を削除し、現在の入眠感「やさしい くものような ことばで つつまれていきます」に変更
- 目的: 寝る前の読み聞かせに合う、静かで安心感のあるテンポ改善
- 非対象: story structure / openingNarrationTemplate / imagePromptTemplate / sampleImageUrl / pageVisualRole / generate-book.ts
- 検証: functions tsc / npm test / root tsc / lint / vitest すべて pass
- 対象 commit: `61859ec`
- Firestore sync: `template:sync:check -> template:sync:write -> template:sync:check` 完了
- sync 結果: `target templates count = 10`、fixed_template 10本すべて drift なし
- 単体 smoke:
	- template: `fixed-bedtime-good-day`
	- bookId: `KXXxdD2NhVb9Fh6OK3kM`
	- status: `completed` / progress: `100` / pages: 4 / page status: all `completed`
	- image generation: 17,332–30,653 ms (all successful, no failures)
	- characterConsistencyMode: all_pages ✓
	- 結果: 短文化・入眠感優先のテキストで問題なく生成完了

---

## T3-2 P2 narrative naturalization: fixed-sleepy-moon-adventure (2026-05-13)

- 対象: `fixed-sleepy-moon-adventure` page 3（`emotional_closeup`）の `early_elementary_7_8` テキスト
- 修正内容:
	- 変更前: `おつきさまが「きょうも だいじょうぶ」と そっと 見まもってくれているようでした。{childName}は、じぶんの きもちが しずかに ととのっていくのを かんじます。`
	- 変更後: `おつきさまが「きょうも だいじょうぶ」と そっと 見まもってくれているようでした。{childName}の こころは、しずかに ほぐれていきます。`
- 目的: 直接的な説明感を弱め、寝る前に読みやすい余韻へ自然化
- 非対象: story structure / openingNarrationTemplate / imagePromptTemplate / sampleImageUrl / pageVisualRole / generate-book.ts
- 検証: functions tsc / npm test / root tsc / lint / vitest すべて pass
- 対象 commit: `4a89eea`
- Firestore sync: `template:sync:check -> template:sync:write -> template:sync:check` 完了
- sync 結果: `target templates count = 10`、fixed_template 10本すべて drift なし
- 単体 smoke:
	- template: `fixed-sleepy-moon-adventure`
	- bookId: `j9TMKRxoaPVNnaR3QClU`
	- status: `completed` / progress: `100` / pages: 4 / page status: all `completed`
	- image generation: page 0: 30,045ms / page 1: 17,064ms / page 2: 16,094ms / page 3: 18,796ms (all successful, no failures)
	- characterConsistencyMode: all_pages ✓
	- 結果: 語り自然化テキストで問題なく生成完了

---

## T3-2 P2 全体語彙棚卸し（docs-only、2026-05-13）

- 対象: `functions/src/seed-templates.ts` fixed_template 10本の全 `textTemplatesByAge` バケット・`openingNarrationTemplate`
- 実施内容: docs-only 棚卸し（コード変更なし）
- 棚卸し結果詳細: [TEMPLATE_QUALITY_REVIEW.md Section 14](./TEMPLATE_QUALITY_REVIEW.md)

### 維持判定（絵本らしい反復）

- 「やさしい」「うれしい」: 各テンプレで対象が異なるため文脈干渉なし → **維持**
- 「ふわっと」: bedtime カテゴリ内に収まる → **維持**
- 「ぽかぽか」（baby_toddler / preschool_3_4）: 幼児向け定型語 → **維持**
- page 4 `{parentMessage}` 統一: 仕様 → **維持**

### 散らし候補サマリ

| 候補 | 対象 | 優先度 |
| --- | --- | --- |
| A: Opening「とくべつな日」構文 | first-birthday（1本主対象） | P2 |
| B: P3「みんなのこころもぽかぽか」重複 | first-zoo / first-birthday（2本） | P2 |
| C: 「〜をみつけました」連続 | 4本 | P3 |
| D: 「きらきら」多用（8/10本） | 8本 | P3 |
| E: P3「にっこり」連続 | 5〜6本 | P3 |

- P2 候補（A・B）: T3-2 完了後、次イテレーションで個別修正推奨
- P3 候補（C〜E）: T3-3 以降の計画的な散らし対応として記録

