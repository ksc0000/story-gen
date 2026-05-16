# Style Variant Validation Plan

作成日: 2026-05-16  
対象リポジトリ: `ksc0000/story-gen`  
対象 Track: T4 Style Variant Validation

---

## 0. Purpose

T4 は、既存 fixed-template の baseline 品質を壊さずに、複数の絵柄・タッチを検証可能な状態にするための validation track です。

T3 との役割分離:

- T3: fixed-template の story / prompt / BF-4 / BF-3 / smoke health を baseline 品質として成立させる
- T4: その baseline template を使って、style variation を別軸で比較・評価・採否判断する

T4 のゴール:

- style taxonomy を定義する
- style prompt contract を定義する
- style matrix smoke の評価手順を定義する
- BF-4 / BF-3 / style adherence / emotional fit の rubric を定義する
- rollout-ready な style variant 判定の基準を明文化する

非ゴール:

- 本ドキュメントでは code / seed / prompt 実装は行わない
- Firestore sync / smoke generation / image generation は行わない
- T3 approved baseline の再審査は行わない

---

## 1. Existing Style Surface

既存の style 周辺資産:

- `src/lib/types.ts`
  - `IllustrationStyle` 型あり
  - `IllustrationStyleProfile` 型あり
  - `InputImageRole` に `style_reference` あり
- `src/lib/illustration-styles.ts`
  - style profile 一覧あり
  - `styleBible`, `negativeStyleRules`, `previewImageUrl` を保有
- `src/components/style-picker.tsx`
  - UI 選択肢と style copy あり
- `src/app/(app)/create/style/page.tsx`
  - book 作成 payload に `style`, `selectedStyleId`, `selectedStyleName`, `styleBible`, `stylePreviewImageUrl` を保存
- `functions/src/test-image-models.ts`
  - admin test 用に `stylePreviewReference` を `style_reference` として input image に追加可能
- `functions/src/seed-templates.ts`
  - fixed template 側では `visualDirection` や prompt 本文に style 系の記述があるが、現時点では variant validation 専用 contract ではない

観察:

- style の vocabulary 自体は既に存在する
- ただし T3 fixed-template rollout は主に `soft watercolor / picture book` 前提で運用されており、style ごとの品質採否ルールは未定義
- style profile はあるが、「どの style がどの template と相性が良いか」「何をもって style pass とするか」は docs 上で未整備

---

## 2. Separation From T3

T4 では、style variation の評価を T3 baseline quality から明確に分離する。

分離原則:

- baseline template の story / text / ageBand / page structure は固定する
- style variation は image-side expression の比較対象として扱う
- T3 の approved smoke を baseline reference とし、T4 では story correctness の再発明をしない
- style fail は template fail と同義にしない

運用ルール:

- Template rollout status と Style rollout status は別テーブルで管理する
- T3 `Go` template でも、T4 style variant は `Hold` や `Conditional` になりうる
- T4 style validation 中は shared safety helper を広く触らず、まず style-specific prompt contract と evaluation policy で整理する

---

## 3. Baseline Templates

T4 で優先的に使う baseline template 候補:

| templateId | category | why it is useful for style validation |
| --- | --- | --- |
| `fixed-brush-teeth-8p` | growth-support | 室内、手順性、清潔感、 prop readability を見やすい |
| `fixed-first-zoo-8p` | memories | 屋外、動物、人物+背景のバランスを見るのに向く |
| `fixed-first-birthday-8p` | memories | 室内イベント、暖色、装飾、感情表現が多い |
| `fixed-sleepy-moon-adventure-8p` | bedtime | 静かな情緒、 moonlight、 BF-4 secondary prop リスクを見やすい |

選定原則:

- category が分散している
- lighting / mood / prop complexity が分散している
- approved no-reference smoke がある
- BF-4 / BF-3 の watchpoint を既に把握している

初期優先順位:

1. `fixed-sleepy-moon-adventure-8p`
2. `fixed-first-zoo-8p`
3. `fixed-brush-teeth-8p`
4. `fixed-first-birthday-8p`

理由:

- sleepy-moon は静かな情緒と non-readable surface の両方を見やすい
- zoo は outdoor / animal / signage risk を見やすい
- brush-teeth は clean-shape readability を見やすい
- birthday は decor clutter と emotional warmth を見やすい

---

## 4. Style Taxonomy

T4 taxonomy は、既存 `IllustrationStyle` をそのまま並べるのではなく、まず validation category にまとめる。

### 4.1 Validation Families

| family | styles | core characteristic | main validation risk |
| --- | --- | --- | --- |
| soft painterly | `soft_watercolor`, `fluffy_pastel`, `classic_picture_book` | やわらかい色、にじみ、絵本らしい空気感 | prop clutter, vague forms, BF-4 incidental marks |
| hand-drawn graphic | `crayon`, `pencil_sketch`, `paper_collage` | 手作業感、質感、素材感 | line noise, pseudo-text strokes, detail loss |
| clean simplified | `flat_illustration`, `colorful_pop` | 明快な形、読みやすい構図、現代的整理 | emotional thinness, over-brightness, toy-like flattening |
| character-forward stylized | `anime_storybook`, `toy_3d` | キャラクター性、表情の強さ、立体感 | age drift, overdrama, merch-like feel |

### 4.2 Initial Candidate Set

T4-1 時点の初回 validation 候補:

- `soft_watercolor`
- `fluffy_pastel`
- `crayon`
- `flat_illustration`
- `anime_storybook`
- `toy_3d`

後回し候補:

- `classic_picture_book`
- `paper_collage`
- `pencil_sketch`
- `colorful_pop`

後回し理由:

- baseline style との差分が読みにくいもの
- BF-4 / readability のリスク仮説がまだ粗いもの
- first matrix の軸数を絞りたいもの

### 4.3 Alias Handling

既存互換 alias:

- `watercolor` は validation 上 `soft_watercolor` に束ねる
- `flat` は validation 上 `flat_illustration` に束ねる

T4 docs では canonical id を使う。

---

## 5. Style Prompt Contract

T4 では style を「雰囲気メモ」ではなく、明示 contract として扱う。

style prompt contract の 4 レイヤ:

1. `styleBible`
2. `negativeStyleRules`
3. baseline template image prompt
4. shared safety / no-readable-text rules

優先順位:

1. safety / no-readable-text / BF-4 suppression
2. same-child continuity / BF-3 rules
3. baseline scene semantics
4. style rendering cues

設計原則:

- style は scene semantics を上書きしない
- style は child age impression を壊さない
- style は prop surfaces に readable text を誘発してはならない
- style は template emotional target を弱めすぎてはならない

style contract の期待構造:

```text
[baseline scene prompt]
[same-child / BF-3 continuity rules]
[no-readable-text / BF-4 safety rules]
[style bible]
[style negative rules]
```

style-specific negative rule 例:

- `anime_storybook`: do not age up the child, do not over-sharpen facial drama
- `toy_3d`: do not make surfaces look commercial, glossy, or logo-like
- `crayon`: do not let dense strokes resemble letters or handwriting
- `flat_illustration`: do not strip away emotional warmth or turn props into UI-like icons

---

## 6. Validation Matrix

T4 smoke は template × style の matrix として評価する。

### 6.1 Initial Matrix

Phase T4-A initial matrix:

| template | styles |
| --- | --- |
| `fixed-sleepy-moon-adventure-8p` | `soft_watercolor`, `fluffy_pastel`, `crayon`, `flat_illustration`, `anime_storybook`, `toy_3d` |
| `fixed-first-zoo-8p` | `soft_watercolor`, `fluffy_pastel`, `crayon`, `flat_illustration`, `anime_storybook`, `toy_3d` |

初回 matrix を 2 templates に絞る理由:

- indoor / quiet mood と outdoor / active mood の両端を早く見られる
- style adherence と BF-4/BF-3 の tradeoff を読みやすい
- smoke 実行コストと manual QA コストを抑えられる

### 6.2 Smoke Levels

| level | purpose | scope |
| --- | --- | --- |
| L0 static | docs / seed / style contract review | no generation |
| L1 spot smoke | 1 template × 1 style | first viability check |
| L2 mini matrix | 2 templates × 3-6 styles | first comparative validation |
| L3 rollout matrix | approved template set × approved styles | rollout gate |

---

## 7. Evaluation Axes

T4 の primary axes:

### 7.1 BF-4 Safety

見るもの:

- readable text
- pseudo-text
- signage-like marks
- panel / label / book-cover text
- style-induced line clusters that look linguistic

判定:

- `pass`
- `watch`
- `fail`

### 7.2 BF-3 Continuity

見るもの:

- same child identity
- age impression
- hairstyle continuity
- outfit continuity
- signature plush / object continuity
- dream / fantasy shift でも人物同一性が維持されるか

判定:

- `pass`
- `watch`
- `fail`

### 7.3 Style Adherence

見るもの:

- styleBible の主要特徴が見えるか
- 他 style と見分けがつくか
- prompt だけで style が十分立っているか
- style preview reference なしでも style が再現できるか

判定:

- `strong`
- `acceptable`
- `weak`
- `off-target`

### 7.4 Emotional Fit

見るもの:

- template mood と style が合っているか
- 読み聞かせの文脈で温度感が適切か
- scene の意味が style で崩れていないか

判定:

- `high fit`
- `acceptable`
- `mismatch`

### 7.5 Secondary Operational Checks

見るもの:

- smoke structural completion
- broken / black image
- over-clutter
- under-detail
- reference path misuse

---

## 8. Pass / Hold Rules

style variant rollout decision:

- `Go`: BF-4 pass, BF-3 pass, style adherence acceptable+, emotional fit acceptable+, structural health pass
- `Conditional-Go`: BF-4/BF-3 pass, style adherence acceptable, but one low-severity watch item remains
- `Conditional`: no blocker in structure, but visual fit or style adherence is too unstable for rollout
- `Hold`: BF-4 fail, BF-3 fail, broken image, or clearly off-target style behavior

重要:

- style adherence が strong でも BF-4 fail なら `Hold`
- BF-4/BF-3 pass でも emotional mismatch が大きければ `Conditional` 以下
- T3 baseline `Go` は T4 style `Go` を自動保証しない

---

## 9. Review Workflow

想定 T4 workflow:

1. baseline template を選ぶ
2. target style family / canonical style id を選ぶ
3. style contract review を行う
4. targeted smoke を作成する
5. BF-4 / BF-3 / style adherence / emotional fit を human QA する
6. style-level verdict を記録する
7. template-level style matrix を更新する

manual QA で最低限残す evidence:

- bookId
- templateId
- style id
- ageBand
- childAge
- BF-4 verdict
- BF-3 verdict
- style adherence verdict
- emotional fit verdict
- recommended action

---

## 10. Initial Deliverables

T4-1 で定義する deliverables:

- style taxonomy
- style prompt contract
- style validation matrix
- evaluation rubric
- baseline template selection policy

次スライス候補:

- T4-2: current style asset audit and canonical style list cleanup
- T4-3: first mini-matrix experiment design for `fixed-sleepy-moon-adventure-8p`
- T4-4: style prompt integration design

---

## 11. Open Questions

- style preview image を validation で reference として使う段階をどこに置くか
- canonical style ids と legacy alias ids の整理を code 側でどこまで行うか
- T4 rollout status をどの docs / admin UI に持たせるか
- template-by-style 相性を docs 管理にするか data 管理にするか

---

## 12. Current Decision

T4-1 decision:

- Start T4 as a separate validation track
- Use approved T3 templates as baseline references
- Begin with taxonomy / contract / matrix design before any style implementation work
