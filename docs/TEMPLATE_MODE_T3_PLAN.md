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

