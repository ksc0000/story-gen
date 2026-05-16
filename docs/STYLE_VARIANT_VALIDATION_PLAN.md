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

---

## 13. T4-2 Current Style Asset Audit And Canonical Style List Cleanup Plan

Status: completed

Date: 2026-05-16

### 13.1 Purpose

Audit the current style assets and define a docs-only cleanup direction for canonical style ids, legacy aliases, preview reference handling, and style profile metadata before any T4 style-implementation work begins.

### 13.2 Files Reviewed

- `src/lib/types.ts`
- `src/lib/illustration-styles.ts`
- `src/components/style-picker.tsx`
- `src/app/(app)/create/style/page.tsx`
- `functions/src/test-image-models.ts`

### 13.3 Audit Findings

#### Type layer

`src/lib/types.ts`

- `IllustrationStyle` currently contains 12 ids
- 10 ids behave like canonical style ids
- 2 ids behave like legacy aliases:
  - `watercolor`
  - `flat`
- `IllustrationStyleProfile` has the right minimum fields for T4:
  - `id`
  - `name`
  - `previewImageUrl`
  - `styleBible`
  - `negativeStyleRules`
  - `usePreviewAsReference?`

Assessment:

- Type surface is functional, but canonical ids and compatibility aliases are mixed in one union.
- That is acceptable for runtime compatibility, but it is too ambiguous for validation reporting unless T4 explicitly separates the two classes.

#### Profile registry

`src/lib/illustration-styles.ts`

- `ILLUSTRATION_STYLE_PROFILES` contains 12 profiles
- All current profiles set `usePreviewAsReference: false`
- `watercolor` duplicates `soft_watercolor`
- `flat` duplicates `flat_illustration`
- duplicated alias profiles currently repeat:
  - display name
  - preview image
  - styleBible
  - negative rules

Assessment:

- The registry is usable today, but it includes data duplication for alias compatibility.
- T4 should treat alias entries as compatibility shims, not as independent validation targets.

#### UI layer

`src/components/style-picker.tsx`

- UI card copy exists for all 12 ids
- The picker filters out `watercolor` and `flat`
- Visible order is the source order of `ILLUSTRATION_STYLE_PROFILES` after filtering
- display names are user-friendly and already localized in Japanese

Assessment:

- UI behavior already implies a canonical-vs-alias distinction.
- The hidden alias rule is good, but it exists only as ad hoc filtering rather than a documented contract.

#### Saved payload

`src/app/(app)/create/style/page.tsx`

- New book payload stores:
  - `style`
  - `selectedStyleId`
  - `selectedStyleName`
  - `styleBible`
  - `stylePreviewImageUrl`
  - `stylePreviewUsedAsReference: false`
- default selected style is `soft_watercolor`

Assessment:

- Payload already persists enough information for later audit and reporting.
- `style` and `selectedStyleId` may become redundant if canonical / alias normalization is introduced later.
- For T4 validation, `selectedStyleId` should be interpreted as the canonical review key once cleanup is implemented.

#### Preview reference handling

`functions/src/test-image-models.ts`

- admin test endpoint accepts:
  - `style`
  - `stylePreviewReference`
- when enabled, preview image URL is appended to input images
- input role `style_reference` is added
- default is off

Assessment:

- This is a useful experiment path for later T4 work.
- For T4 baseline validation, preview reference should remain off by default so style adherence can first be judged from prompt-only behavior.

### 13.4 Canonical / Alias Table

| id | class | displayName | previewImageUrl | styleBible status | negativeStyleRules status | UI visible | preview ref default |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `soft_watercolor` | canonical | `やさしい水彩` | `/images/styles/soft_watercolor.png` | present | present | yes | false |
| `fluffy_pastel` | canonical | `ふんわりパステル` | `/images/styles/fluffy_pastel.png` | present | present | yes | false |
| `crayon` | canonical | `クレヨンで描いた絵本` | `/images/styles/crayon.png` | present | present | yes | false |
| `flat_illustration` | canonical | `シンプルフラット` | `/images/styles/flat_illustration.png` | present | present | yes | false |
| `anime_storybook` | canonical | `わくわくアニメ風` | `/images/styles/anime_storybook.png` | present | present | yes | false |
| `classic_picture_book` | canonical | `クラシック絵本` | `/images/styles/classic_picture_book.png` | present | present | yes | false |
| `toy_3d` | canonical | `ぷっくり3Dトイ風` | `/images/styles/toy_3d.png` | present | present | yes | false |
| `paper_collage` | canonical | `紙あそびコラージュ` | `/images/styles/paper_collage.png` | present | present | yes | false |
| `pencil_sketch` | canonical | `やさしい鉛筆スケッチ` | `/images/styles/pencil_sketch.png` | present | present | yes | false |
| `colorful_pop` | canonical | `カラフルポップ` | `/images/styles/colorful_pop.png` | present | present | yes | false |
| `watercolor` | legacy alias | `やさしい水彩` | `/images/styles/soft_watercolor.png` | duplicates `soft_watercolor` | duplicates `soft_watercolor` | no | false |
| `flat` | legacy alias | `シンプルフラット` | `/images/styles/flat_illustration.png` | duplicates `flat_illustration` | duplicates `flat_illustration` | no | false |

### 13.5 Canonical List For T4 Validation

Canonical list confirmed for T4 validation:

- `soft_watercolor`
- `fluffy_pastel`
- `crayon`
- `flat_illustration`
- `anime_storybook`
- `classic_picture_book`
- `toy_3d`
- `paper_collage`
- `pencil_sketch`
- `colorful_pop`

Legacy aliases kept for compatibility only:

- `watercolor` → `soft_watercolor`
- `flat` → `flat_illustration`

Validation rule:

- All T4 matrix planning, QA logs, and rollout decisions must use canonical ids only.
- Alias ids may still exist in runtime or old documents, but should be normalized in reporting.

### 13.6 Confirmed Initial And Deferred Style Sets

Initial T4 validation set confirmed:

- `soft_watercolor`
- `fluffy_pastel`
- `crayon`
- `flat_illustration`
- `anime_storybook`
- `toy_3d`

Deferred set confirmed:

- `classic_picture_book`
- `paper_collage`
- `pencil_sketch`
- `colorful_pop`

Reasoning:

- initial set gives enough spread across painterly, hand-drawn, clean, and stylized families
- deferred set is not rejected; it is simply lower-priority for first matrix execution

### 13.7 Preview Reference Policy

T4 policy for style preview reference:

- Baseline style validation should default to prompt-only behavior
- `stylePreviewReference` remains an explicit experimental path, not a default rollout setting
- preview reference comparisons should be labeled separately from prompt-only comparisons

Implication:

- A style should not be considered rollout-ready merely because it works with preview-reference assistance
- prompt-only viability is the primary bar for early T4 validation

### 13.8 Cleanup Candidates For T4-3+

Docs-only planning outcome:

- cleanup is needed, but not in T4-2

Recommended implementation candidates:

1. Introduce an explicit canonical-style metadata layer
2. Mark alias profiles as compatibility aliases instead of full duplicated peers
3. Normalize saved style ids for new payloads while preserving legacy read compatibility
4. Define a single canonical UI order source rather than relying on registry order plus ad hoc filtering
5. Decide whether `selectedStyleId` should become canonical-normalized even when `style` was supplied via alias
6. Add docs or utility support for style-level reporting keys in T4 smoke reviews

Not required yet:

- No immediate need to delete alias ids from types
- No immediate need to turn on preview-reference defaults
- No immediate need to rewrite styleBible prose unless later validation shows weak adherence

### 13.9 Decision

T4-2 decision:

- Canonical style list is confirmed as the 10 non-alias ids.
- `watercolor` and `flat` are confirmed as legacy aliases only.
- Preview reference remains off by default and should be treated as an experiment flag.
- Cleanup implementation should be deferred to T4-3 or later, after the first validation matrix design is finalized.

---

## 14. T4-3 Style Prompt Contract Hardening Design

Status: completed

Date: 2026-05-16

### 14.1 Purpose

Define a docs-only hardening design for style prompt contracts so that canonical style variants can express a distinct visual look without weakening fixed-template baseline safety, especially BF-4 no-readable-text behavior and BF-3 same-child continuity.

### 14.2 Contract Principles

T4 style prompt contract should follow these priority rules:

1. BF-4 safety constraints win over style cues
2. BF-3 same-child continuity constraints win over style exaggeration
3. baseline scene semantics win over stylistic scene drift
4. style rendering cues are additive, not scene-rewriting

Meaning:

- style must not reintroduce readable text surfaces
- style must not age up, re-costume, or re-characterize the child
- style must not convert quiet scenes into loud compositions unless the baseline template already wants that energy
- style should shape texture, color, edge quality, form language, and emotional temperature more than object inventory

### 14.3 Standard Prompt Contract Stack

For T4 validation, each style prompt contract should be understood as a five-layer stack:

1. baseline fixed-template image prompt
2. BF-3 continuity anchors
3. BF-4 no-readable-text and no-pseudo-text guardrails
4. styleBible rendering cues
5. style-specific negative rules

Target composition:

```text
[baseline scene and subject instruction]
[same-child / same outfit / same signature object continuity instruction]
[no readable text / no pseudo-text / no symbol drift safety instruction]
[styleBible visual instruction]
[style-specific negative rules]
```

Hardening intent:

- make style cues expressive enough to be visually testable
- keep style cues narrow enough that they do not compete with safety and continuity

### 14.4 Prompt-Only vs Preview-Reference Validation

Prompt-only validation:

- primary T4 baseline mode
- style is judged from prompt contract alone
- used for rollout decisions unless explicitly noted otherwise

Preview-reference validation:

- secondary experimental mode
- style preview image may be added as `style_reference`
- useful for diagnostic comparison when prompt-only adherence is weak
- must never be merged silently into prompt-only results

Required reporting split:

- every T4 result must state either:
  - `prompt_only`
  - `preview_reference_assisted`

Policy:

- a style cannot be declared rollout-ready on preview-reference evidence alone
- preview-reference success can justify further prompt tuning, but not immediate rollout approval

### 14.5 Initial Six Style Contracts

#### `soft_watercolor`

Contract role:

- baseline-friendly default
- emotional softness benchmark

Expected strengths:

- bedtime, family warmth, and picture-book calm
- smooth compatibility with current fixed-template baseline

Main BF-4 / BF-3 risks:

- low BF-4 risk overall
- medium risk of soft clutter in secondary props if prompts become too painterly and vague

Hardening direction:

- keep non-readable-surface rules explicit
- keep prop simplification stronger than atmosphere expansion
- avoid adding decorative brush marks near signs, books, or labels

Negative-rule improvement candidates:

- do not let painterly marks form letter-like clusters
- do not add decorative printed-book surfaces or label-like details in the background

#### `fluffy_pastel`

Contract role:

- toddler-friendly softness / plush comfort benchmark

Expected strengths:

- rounded forms
- comforting emotional tone
- good fit for bedtime and daily-life templates

Main BF-4 / BF-3 risks:

- BF-4 risk from cute accessory clutter or shelf-prop overload
- BF-3 risk from over-rounding faces until identity becomes too generic page-to-page

Hardening direction:

- keep background inventory sparse
- preserve same hair silhouette and same age impression explicitly
- treat plush softness as material quality, not as permission to multiply props

Negative-rule improvement candidates:

- do not add extra decorative accessories, labels, or printed toy details
- do not simplify the child into a generic baby-like face that loses page-to-page identity

#### `crayon`

Contract role:

- hand-drawn warmth / child-made feeling benchmark

Expected strengths:

- expressive handmade feel
- suitable for growth-support and playful themes

Main BF-4 / BF-3 risks:

- highest BF-4 risk in initial set for pseudo-text from dense strokes
- medium BF-3 risk if line looseness changes face proportions or outfit marks too much

Hardening direction:

- require broad waxy strokes rather than fine clustered scribbles
- avoid repeated short marks on books, signs, clothing, and toys
- preserve same face shape and same outfit palette more explicitly than usual

Negative-rule improvement candidates:

- do not let crayon strokes resemble handwriting, letters, numerals, or label marks
- do not use dense repeated stroke clusters on clothing, shelves, book covers, or props
- do not let sketch looseness change the child’s age impression

#### `flat_illustration`

Contract role:

- clarity / readability / modern simplified benchmark

Expected strengths:

- strong compositional clarity
- lower incidental texture noise
- promising for BF-4 control

Main BF-4 / BF-3 risks:

- BF-4 risk is lower than most styles, but icon-like signage or panel shapes may appear if scenes are over-simplified
- BF-3 risk from flattening emotion and making different pages feel like interchangeable stickers

Hardening direction:

- keep emotional warmth explicit
- forbid UI-like icon panels, card shapes, poster blocks, and badge-like elements
- preserve individualized face and pajama cues

Negative-rule improvement candidates:

- do not convert scene props into poster-like, sign-like, label-like, or UI-card-like shapes
- do not make expressions too neutral or generic across pages

#### `anime_storybook`

Contract role:

- expressive character-forward benchmark

Expected strengths:

- strong face readability
- emotional clarity
- fantasy scenes may feel lively and distinctive

Main BF-4 / BF-3 risks:

- BF-4 risk from decorative symbols, sparkles, framed effects, or stylized text-like flourishes
- BF-3 risk from age-up drift, oversized eyes changing age impression, or costume drift toward genre styling

Hardening direction:

- preserve preschool age impression as a hard constraint
- explicitly suppress emblematic symbols, dramatic speed lines, caption-like overlays, and logo-like motifs
- keep same pajamas and same plush object fixed even in fantasy scenes

Negative-rule improvement candidates:

- do not age up the child or shift toward school-age / teen anime proportions
- do not add speed lines, emblems, magical seals, caption-like overlays, or symbol strings
- do not exaggerate costume detail beyond the baseline outfit contract

#### `toy_3d`

Contract role:

- rounded diorama / tactile toy benchmark

Expected strengths:

- object clarity
- appealing child-safe volume
- strong differentiation from painterly baseline

Main BF-4 / BF-3 risks:

- BF-4 risk from product-like labels, box-like packaging cues, and merch-like surfaces
- BF-3 risk from turning the child or plush into generic toy mascots rather than the same story character

Hardening direction:

- emphasize handmade / matte / soft-playroom toy qualities, not commercial product styling
- suppress label areas, packaging logic, embossed marks, and brand-like surface accents
- preserve same child identity as a child first, toy-diorama rendering second

Negative-rule improvement candidates:

- do not add labels, embossed letters, packaging graphics, or product branding surfaces
- do not turn the child into a plastic figurine with reduced identity
- do not turn the teddy bear into a different manufactured toy character between pages

### 14.6 Cross-Style Hardening Themes

Across the initial six styles, the main hardening themes are:

- suppress pseudo-text generated by texture or line noise
- preserve same child identity under stylization pressure
- preserve same outfit / same plush anchor
- keep style expression on rendering surface, not on story structure
- keep background prop density lower than the model’s natural urge to decorate

These themes imply that future implementation should prefer:

- stronger style-specific negative rules
- clearer continuity reminders where stylization pressure is high
- explicit separation of “surface style” from “scene inventory”

### 14.7 Style-Specific Negative Rule Improvement Candidates

Recommended docs-only upgrade categories for future implementation:

| style | negative rule additions worth testing |
| --- | --- |
| `soft_watercolor` | no letter-like brush clusters; no decorative printed-book details |
| `fluffy_pastel` | no extra accessory clutter; no babyfied identity drift |
| `crayon` | no handwriting-like marks; no dense repeated scribble clusters on props |
| `flat_illustration` | no poster/sign/card-like shapes; no emotionally blank generic faces |
| `anime_storybook` | no speed lines, seals, symbol strings, or age-up proportions |
| `toy_3d` | no labels, embossed marks, packaging logic, or merch-like branding surfaces |

Rule-writing guidance:

- negative rules should target failure modes, not broad aesthetic bans
- they should stay short enough to remain composable with baseline prompts
- they should mention printed surfaces and identity drift explicitly when those are realistic risks

### 14.8 Acceptance Criteria For T4-4

Before moving into the first mini-matrix smoke design, T4-4 should assume the following acceptance criteria are now defined:

1. Canonical style ids are identified
2. Prompt-only validation is the default evaluation mode
3. Preview-reference-assisted runs are explicitly separate
4. Each initial style has:
   - contract role
   - main BF-4 risk hypothesis
   - main BF-3 risk hypothesis
   - style-specific hardening direction
5. Cross-style pass / hold logic is already defined in T4-1
6. Future implementation work can express hardening as:
   - styleBible shaping
   - negative rule additions
   - validation-only reporting distinctions

### 14.9 Decision

T4-3 decision:

- The style prompt contract should be hardened primarily through style-specific negative rules and explicit priority ordering, not by weakening T3 baseline prompts.
- Prompt-only validation remains the authoritative first gate.
- The initial six styles are sufficiently specified to move to T4-4 mini-matrix smoke design without code changes in this slice.

---

## 15. T4-4 First Mini-Matrix Smoke Design

Status: completed

Date: 2026-05-16

### 15.1 Purpose

Define the first executable style mini-matrix smoke plan for T4 without running generation yet. This slice fixes the initial target templates, target styles, execution unit, naming convention, record format, QA rubric, and decision rules so that T4-5 can move straight into controlled smoke execution.

### 15.2 Design Principles

The first mini-matrix should:

- stay small enough for careful human QA
- include both a quiet indoor template and an outdoor / signage-risk template
- include at least one low-risk style, one medium-risk style, and one high-risk style
- run in prompt-only mode first
- remain no-reference so style behavior is judged without style-preview assistance

### 15.3 Selected Templates

Initial mini-matrix templates:

1. `fixed-sleepy-moon-adventure-8p`
2. `fixed-first-zoo-8p`

Why these two:

- `fixed-sleepy-moon-adventure-8p`
  - approved T3 baseline exists
  - quiet emotional scenes make style drift and BF-3 identity drift easy to spot
  - prior BF-4 issues involved secondary room props, so style pressure on background clutter is observable
- `fixed-first-zoo-8p`
  - approved T3 baseline exists
  - outdoor setting plus enclosure / entrance context makes BF-4 signage-like drift more likely
  - animal scenes and larger spatial range make style adherence easier to compare

Not in first mini-matrix:

- `fixed-brush-teeth-8p`
- `fixed-first-birthday-8p`

Reason:

- both remain strong phase-2 candidates, but they are not needed for the first six-run cut

### 15.4 Selected Styles

Initial mini-matrix styles:

1. `soft_watercolor`
2. `crayon`
3. `anime_storybook`

Coverage logic:

- `soft_watercolor`
  - low-risk baseline-friendly anchor
  - helps distinguish template regressions from style regressions
- `crayon`
  - highest initial pseudo-text / BF-4 risk
  - good stress test for handwritten-mark suppression
- `anime_storybook`
  - highest identity / age-drift pressure
  - good stress test for BF-3 continuity under stylization

Deferred from first mini-matrix:

- `fluffy_pastel`
- `flat_illustration`
- `toy_3d`

Reason:

- they are still initial-set candidates, but the first cut should prioritize one anchor plus the two strongest watch styles

### 15.5 Matrix Shape

First mini-matrix size:

- 2 templates × 3 styles = 6 smoke books

Matrix table:

| templateId | `soft_watercolor` | `crayon` | `anime_storybook` |
| --- | --- | --- | --- |
| `fixed-sleepy-moon-adventure-8p` | run | run | run |
| `fixed-first-zoo-8p` | run | run | run |

Execution order recommendation:

1. `fixed-sleepy-moon-adventure-8p` × `soft_watercolor`
2. `fixed-first-zoo-8p` × `soft_watercolor`
3. `fixed-sleepy-moon-adventure-8p` × `crayon`
4. `fixed-first-zoo-8p` × `crayon`
5. `fixed-sleepy-moon-adventure-8p` × `anime_storybook`
6. `fixed-first-zoo-8p` × `anime_storybook`

Reason:

- start with the safest anchor style
- then move to BF-4 stress
- finish with BF-3 / stylization stress

### 15.6 Shared Input Assumptions

Initial mini-matrix should use:

- validation mode: `prompt_only`
- reference mode: `no_reference`
- ageBand: `preschool_3_4`
- childAge: `4`
- pageCount: template-native 8 pages

Input consistency rule:

- use identical or equivalent child-facing input across styles for the same template
- do not vary ageBand, childAge, or optional story inputs between styles within the same template row

Reason:

- style comparison should isolate visual-style behavior, not input variance

### 15.7 Smoke Execution Unit

Single execution unit:

- one book = one templateId × one canonical styleId × one ageBand × one validation mode

Required fields per run:

- templateId
- styleId
- validationMode
- referenceMode
- ageBand
- childAge
- pageCount
- run date
- resulting bookId

### 15.8 Naming And Run Labels

Suggested run label format:

`T4-5-mini-<template-short>-<styleId>-<validationMode>`

Examples:

- `T4-5-mini-sleepy-moon-soft_watercolor-prompt_only`
- `T4-5-mini-zoo-crayon-prompt_only`
- `T4-5-mini-sleepy-moon-anime_storybook-prompt_only`

Suggested template short labels:

- `sleepy-moon` → `fixed-sleepy-moon-adventure-8p`
- `zoo` → `fixed-first-zoo-8p`

Validation mode labels:

- `prompt_only`
- `preview_reference_assisted`

Reference mode labels:

- `no_reference`
- `style_reference_only`

### 15.9 Record Format

Use one row per smoke book.

Recommended record schema:

| field | description |
| --- | --- |
| track | fixed `T4` |
| slice | e.g. `T4-5` |
| runLabel | human-readable matrix label |
| templateId | canonical template id |
| styleId | canonical style id only |
| validationMode | `prompt_only` or `preview_reference_assisted` |
| referenceMode | `no_reference` or `style_reference_only` |
| ageBand | `preschool_3_4` |
| childAge | `4` |
| pageCount | `8` |
| bookId | generated smoke id |
| status | structural generation result |
| BF4 | `pass` / `watch` / `fail` |
| BF3 | `pass` / `watch` / `fail` |
| styleAdherence | `strong` / `acceptable` / `weak` / `off-target` |
| emotionalFit | `high fit` / `acceptable` / `mismatch` |
| decision | `Go` / `Conditional-Go` / `Conditional` / `Hold` |
| notes | short reviewer notes |

### 15.10 QA Table Design

Per-book QA rubric:

| area | allowed verdicts | primary questions |
| --- | --- | --- |
| BF-4 | `pass` / `watch` / `fail` | readable text, pseudo-text, labels, signage, symbol strings? |
| BF-3 | `pass` / `watch` / `fail` | same child, same age impression, same outfit, same recurring object? |
| style adherence | `strong` / `acceptable` / `weak` / `off-target` | does the styleBible read clearly and distinctly? |
| emotional fit | `high fit` / `acceptable` / `mismatch` | does this style serve the template mood? |
| operational health | `pass` / `watch` / `fail` | completed, no broken image, no black image, no obvious rendering collapse? |

Per-page focused notes should be captured when:

- BF-4 issue is local to a single page
- BF-3 identity drift starts on a specific page
- a style adherence success or failure is especially visible on one page

### 15.11 Decision Rules

Per-book decision:

- `Go`
  - BF-4 pass
  - BF-3 pass
  - style adherence acceptable or strong
  - emotional fit acceptable or high fit
  - operational health pass
- `Conditional-Go`
  - BF-4 pass
  - BF-3 pass
  - one low-severity watch item in style adherence or emotional fit
- `Conditional`
  - no hard safety/continuity blocker, but style adherence weak or emotional mismatch is material
- `Hold`
  - BF-4 fail
  - BF-3 fail
  - operational fail
  - or clearly off-target style behavior

Mini-matrix advancement rule:

- if both templates pass `soft_watercolor`, the baseline comparison anchor is considered stable
- if either `crayon` run hits BF-4 fail, the next design slice should focus on style-specific pseudo-text hardening before broadening matrix width
- if either `anime_storybook` run hits BF-3 fail, the next design slice should focus on age/identity hardening before expanding stylized families

### 15.12 Proposed T4-5 Command Outline

T4-5 should likely use a repeated command pattern based on the existing smoke path.

Execution outline per run:

1. confirm latest source / hygiene / credentials
2. prepare style-aware smoke input
3. create one no-reference smoke for one template × one style
4. monitor completion
5. inspect structural health
6. record result for later human QA

Proposed command shape candidates:

```powershell
node scripts/create-template-smoke-books.js --write --template-id=<templateId> --page-count=8 --age-band=preschool_3_4
```

If style-aware smoke support is added later, the target command shape should become:

```powershell
node scripts/create-template-smoke-books.js --write --template-id=<templateId> --page-count=8 --age-band=preschool_3_4 --style-id=<canonicalStyleId>
```

If preview-reference-assisted comparison is later enabled for experiments, a future command shape may look like:

```powershell
node scripts/create-template-smoke-books.js --write --template-id=<templateId> --page-count=8 --age-band=preschool_3_4 --style-id=<canonicalStyleId> --style-preview-reference
```

Important:

- T4-4 does not assert that all these flags already exist
- this section only defines the target execution model and naming needed for T4-5 planning

### 15.13 Expected Output Of T4-5

T4-5 should return:

- 6 generated bookIds or a documented reduced set if execution is intentionally phased
- structural health summary per run
- a ready-to-review matrix table with templateId / styleId / bookId / status
- explicit separation between prompt-only runs and any later preview-reference-assisted reruns

### 15.14 Acceptance Criteria

T4-4 is considered complete if:

1. the initial matrix templates are fixed
2. the initial matrix styles are fixed
3. prompt-only / no-reference assumptions are explicit
4. execution unit and naming conventions are explicit
5. book-level record format is explicit
6. QA rubric is explicit
7. T4-5 can be written as an execution slice without re-deciding matrix scope

### 15.15 Decision

T4-4 decision:

- the first mini-matrix should start with 2 templates × 3 styles in prompt-only / no-reference mode
- `soft_watercolor` is the anchor style
- `crayon` is the first BF-4 stress style
- `anime_storybook` is the first BF-3 stress style
- this is small enough for careful QA and broad enough to test the first meaningful style tradeoffs

---

## 16. T4-5 Style Mini-Matrix Smoke Runner Support Check / Dry-Run

Status: completed

Date: 2026-05-16

### 16.1 Purpose

Check whether the current smoke runner can support the T4 style mini-matrix execution model, confirm whether a style-aware argument path already exists, and run safe dry-runs only. This slice does not perform write generation.

### 16.2 Scope Executed

- checked git worktree status
- ran `npm run guard:hygiene`
- reviewed `scripts/create-template-smoke-books.js`
- reviewed current style-related runner references
- ran representative dry-runs for:
  - `fixed-sleepy-moon-adventure-8p`
  - `fixed-first-zoo-8p`
- ran one dry-run with an unsupported-looking `--style-id=crayon` argument to test runner behavior

### 16.3 Runner Capability Findings

Current smoke runner reviewed:

- `scripts/create-template-smoke-books.js`

Confirmed supported arguments:

- `--dry-run`
- `--write`
- `--template-id=<id>`
- `--page-count=<4|8|12>`
- `--age-band=<ageBand>`
- `--with-reference`
- `--reference-image-url=<url>`
- `--list-templates`

Not found:

- `--style-id`
- `--style`
- `--selected-style-id`
- any equivalent documented style-selection argument

Assessment:

- the current runner is template-aware and age-band-aware
- the current runner is not style-aware

### 16.4 Payload Path Findings

Inside `buildBookPayload(...)` in `scripts/create-template-smoke-books.js`:

- payload currently hardcodes:
  - `style: "soft_watercolor"`
- payload does not set:
  - `selectedStyleId`
  - `selectedStyleName`
  - `styleBible`
  - `stylePreviewImageUrl`
  - `stylePreviewUsedAsReference`

Implication:

- even if a caller passes `--style-id=crayon`, the current payload creation path does not consume it
- all smoke books created by the current runner would still be tagged as `soft_watercolor`
- current runner output is therefore unsuitable for canonical T4 style comparison

### 16.5 Dry-Run Results

Executed dry-runs:

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
```

Observed behavior:

- dry-run itself works correctly for template / pageCount / ageBand preview
- `fixed-sleepy-moon-adventure-8p` resolves to `childAge=4`, `pageCount=8`
- `fixed-first-zoo-8p` resolves to `childAge=4`, `pageCount=8`, and includes `place` / `familyMembers`
- adding `--style-id=crayon` does not error
- adding `--style-id=crayon` does not change the dry-run output

Conclusion:

- unknown style args are currently ignored rather than validated or applied
- style-aware dry-run is not supported yet

### 16.6 Matrix Dry-Run Feasibility

T4-4 target matrix:

- 2 templates × 3 styles = 6 runs

Current feasibility verdict:

- template-axis dry-run: feasible
- ageBand / childAge dry-run: feasible
- style-axis dry-run: not feasible
- full prompt-only mini-matrix dry-run: not feasible with the current runner

Reason:

- the current runner cannot vary style payload fields per run
- therefore the 6-run matrix would collapse into repeated `soft_watercolor` payloads

### 16.7 Support Gap Summary

Gap severity:

- medium for planning
- blocking for T4-6 style-aware smoke execution

Specific gaps:

1. no parsed `--style-id` argument
2. no canonical style-id validation in runner
3. no style-aware payload mutation
4. no persistence of style metadata fields used by create flow
5. no explicit run labeling for `prompt_only` vs `preview_reference_assisted`
6. no guardrail to reject unknown style-related CLI args

### 16.8 Proposed Implementation Direction For T4-6+

Before T4 style smoke execution, the runner should eventually support:

1. `--style-id=<canonicalStyleId>`
2. canonical style-id validation against approved T4 canonical ids
3. payload fields:
   - `style`
   - `selectedStyleId`
   - `selectedStyleName`
   - `styleBible`
   - `stylePreviewImageUrl`
   - `stylePreviewUsedAsReference`
4. explicit validation mode labeling:
   - `prompt_only`
   - `preview_reference_assisted`
5. explicit failure on unsupported or malformed style args

Preferred behavior:

- dry-run should print effective style payload fields
- write mode should persist the same style metadata the create flow uses
- preview-reference experiments should be opt-in and clearly separated

### 16.9 Decision

T4-5 decision:

- Do not proceed to style mini-matrix write generation yet.
- Current runner support is insufficient for canonical style-aware smoke execution.
- T4 should switch next to a runner support design / implementation slice before any T4 style write smoke is attempted.

### 16.10 Recommended Next Step

Recommended next slice:

- T4-6: style-aware smoke runner support design / implementation planning or execution

That slice should define or implement:

- style-aware CLI argument support
- canonical style validation
- style metadata payload persistence
- prompt-only vs preview-reference run labeling

### 16.11 Exclusions

- No write generation performed
- No image generation performed
- No Firestore writes performed
- No code changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 17. T4-6 Style-Aware Smoke Runner Support Design

Status: completed

Date: 2026-05-16

### 17.1 Purpose

Define a docs-only implementation design for adding style-aware support to the smoke runner so that T4 mini-matrix execution can later run safely with explicit canonical style selection, dry-run visibility, and consistent payload persistence.

### 17.2 Current Gap Summary

From T4-5:

- current runner is template-aware but not style-aware
- unknown style-related CLI args are silently ignored
- payload hardcodes `style: "soft_watercolor"`
- runner does not persist style metadata used by the normal create flow
- prompt-only versus preview-reference-assisted runs are not distinguished

Design goal:

- make style-aware smoke execution explicit, validated, and observable
- do not break existing template-only smoke behavior

### 17.3 Non-Goals

T4-6 design does not propose:

- changing style profile content
- changing T3 fixed-template prompts
- enabling style-preview reference by default
- rewriting the generation pipeline outside the smoke-runner path

### 17.4 CLI Design

#### New arguments

Required new style-aware argument:

- `--style-id=<canonicalStyleId>`

Optional future-facing argument:

- `--validation-mode=<prompt_only|preview_reference_assisted>`

Optional future-facing convenience flag:

- `--style-preview-reference`

Recommended defaults:

- if `--style-id` is omitted:
  - keep current behavior for non-T4 smoke use
  - default effective style remains `soft_watercolor`
- if `--validation-mode` is omitted:
  - default to `prompt_only`
- if `--style-preview-reference` is omitted:
  - default to `false`

CLI usage examples:

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
```

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook --validation-mode=prompt_only
```

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon --validation-mode=preview_reference_assisted --style-preview-reference
```

### 17.5 Canonical Style Validation

Validation rule:

- `--style-id` must validate against the T4 canonical style list only

Canonical list:

- `soft_watercolor`
- `fluffy_pastel`
- `crayon`
- `flat_illustration`
- `anime_storybook`
- `classic_picture_book`
- `toy_3d`
- `paper_collage`
- `pencil_sketch`
- `colorful_pop`

Behavior on invalid value:

- exit with explicit error
- print allowed canonical ids
- do not fall back silently

Behavior on missing value:

- if style mode is not required for the command, keep current default behavior
- if future T4 execution wrapper requires style, that wrapper should enforce presence separately

### 17.6 Alias Handling

Alias policy:

- smoke runner should accept legacy aliases only if it normalizes them immediately
- canonical ids are the only ids that should appear in:
  - dry-run reporting
  - persisted metadata fields
  - T4 review tables

Alias normalization map:

- `watercolor` → `soft_watercolor`
- `flat` → `flat_illustration`

Recommended behavior:

- if alias is passed, emit a normalization note in dry-run and write logs
- persist canonical id, not alias id

Reason:

- preserves backward convenience
- keeps T4 reporting consistent

### 17.7 Payload Injection Design

T4-aware payload fields should align with the normal create flow as closely as practical.

Recommended payload fields:

- `style`
- `selectedStyleId`
- `selectedStyleName`
- `styleBible`
- `stylePreviewImageUrl`
- `stylePreviewUsedAsReference`

Recommended value mapping:

- `style`: canonical style id
- `selectedStyleId`: canonical style id
- `selectedStyleName`: profile display name
- `styleBible`: profile styleBible
- `stylePreviewImageUrl`: profile previewImageUrl
- `stylePreviewUsedAsReference`: boolean from validation mode / flag

Optional metadata additions inside `smokeTestMetadata`:

- `styleId`
- `validationMode`
- `stylePreviewReference`

Design principle:

- payload should be fully inspectable after creation without needing CLI reconstruction

### 17.8 Prompt-Only / No-Reference Defaults

T4 baseline-preserving default:

- `validationMode = prompt_only`
- `withReference = false`
- `stylePreviewUsedAsReference = false`

Important separation:

- `--with-reference` currently means character-reference path
- `--style-preview-reference` should not silently imply character-reference mode

Recommended model:

- character reference path remains controlled by existing `--with-reference`
- style preview reference remains separate and optional
- prompt-only no-reference is the default for T4 mini-matrix runs

### 17.9 Dry-Run Output Design

Dry-run should display effective style state explicitly.

Recommended additional dry-run lines:

- `styleId=<canonicalStyleId>`
- `selectedStyleName=<display name>`
- `validationMode=<prompt_only|preview_reference_assisted>`
- `stylePreviewUsedAsReference=<true|false>`
- `stylePreviewImageUrl=<preview url>`
- if alias was supplied: `normalizedStyleId=<canonicalStyleId>`

Example dry-run block:

```text
[1/1] templateId=fixed-sleepy-moon-adventure-8p
       styleId=crayon
       selectedStyleName=クレヨンで描いた絵本
       validationMode=prompt_only
       stylePreviewUsedAsReference=false
       pageCount=8
       ageBand=preschool_3_4
       childAge=4
```

Error behavior:

- unsupported style flags should no longer be silently ignored
- malformed style args should fail fast before payload preview

### 17.10 Backward Compatibility Policy

Must preserve:

- existing template-only dry-run
- existing template-only write flow
- existing `--age-band` behavior
- existing `--with-reference` character-reference behavior

Compatibility rule:

- no existing command without style args should change its output shape materially beyond optional extra fields

### 17.11 Suggested Implementation Scope For T4-7

Primary code scope:

- `scripts/create-template-smoke-books.js`

Potential read-only import dependency:

- `src/lib/illustration-styles.ts` or a shared equivalent style registry source

Recommended T4-7 work items:

1. add style arg parsing
2. add canonical / alias normalization
3. add style profile lookup
4. inject style fields into payload
5. add validation mode fields
6. add dry-run output lines
7. reject unknown style flags explicitly

Out of scope for T4-7 unless needed:

- modifying style profile prose
- changing UI picker
- altering Firestore generation pipeline logic outside smoke-runner payload preparation

### 17.12 Test Strategy

T4-7 should validate at least:

#### CLI parsing checks

- `--style-id=soft_watercolor` accepted
- `--style-id=crayon` accepted
- `--style-id=watercolor` normalized to `soft_watercolor`
- `--style-id=flat` normalized to `flat_illustration`
- invalid style rejected with clear error

#### Dry-run behavior checks

- dry-run prints canonical style id
- dry-run prints style display name
- dry-run prints validation mode
- dry-run prints preview-reference flag
- dry-run no longer silently ignores style args

#### Payload checks

- payload `style` equals canonical style id
- payload `selectedStyleId` equals canonical style id
- payload `selectedStyleName` matches profile
- payload `styleBible` and `stylePreviewImageUrl` populated from profile
- payload `stylePreviewUsedAsReference` matches mode

#### Regression checks

- old dry-run without style args still works
- old write path without style args still works
- `--with-reference` character-reference path still works

### 17.13 Decision

T4-6 decision:

- style-aware smoke runner support should be implemented as a narrow extension of `scripts/create-template-smoke-books.js`
- canonical style normalization and explicit dry-run visibility are mandatory
- prompt-only / no-reference must remain the default T4 baseline mode
- T4-7 can proceed safely once it stays within this runner-scoped implementation boundary

### 17.14 Exclusions

- No code changes performed
- No runner implementation performed
- No style profile changes performed
- No Firestore sync performed
- No smoke generation performed
- No image generation performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 18. T4-7 Style-Aware Smoke Runner Support

Status: completed

Date: 2026-05-16

### 18.1 Purpose

Implement the T4-6 runner design as a narrow extension of `scripts/create-template-smoke-books.js` so T4 style mini-matrix dry-runs and later write runs can target canonical styles explicitly without changing the broader generation flow.

### 18.2 Files Changed

- `scripts/create-template-smoke-books.js`
- `docs/STYLE_VARIANT_VALIDATION_PLAN.md`

### 18.3 Implemented Runner Support

Added runner-local style-aware support for:

- `--style-id=<id>`
- canonical style profile lookup
- legacy alias normalization
- fail-fast rejection for unknown style ids
- fail-fast rejection for unsupported style-related args
- style metadata injection into smoke payload
- style metadata visibility in dry-run output

Preserved behavior:

- no `--style-id` still defaults to `soft_watercolor`
- prompt-only remains the only supported validation mode in this runner
- `stylePreviewUsedAsReference` remains `false`
- character-reference flow still remains separate behind `--with-reference`

### 18.4 Canonical And Alias Behavior

Canonical ids accepted by the runner:

- `soft_watercolor`
- `fluffy_pastel`
- `crayon`
- `flat_illustration`
- `anime_storybook`
- `classic_picture_book`
- `toy_3d`
- `paper_collage`
- `pencil_sketch`
- `colorful_pop`

Legacy aliases normalized immediately:

- `watercolor` → `soft_watercolor`
- `flat` → `flat_illustration`

Normalization behavior:

- runner accepts the alias for compatibility
- dry-run surfaces `normalizedStyleId=...`
- payload persists only the canonical id

### 18.5 Payload Injection Result

`buildBookPayload(...)` now writes:

- `style`
- `selectedStyleId`
- `selectedStyleName`
- `styleBible`
- `stylePreviewImageUrl`
- `stylePreviewUsedAsReference`

And `smokeTestMetadata` now also records:

- `styleId`
- `validationMode`
- `stylePreviewReference`

Current T4-7 invariant:

- `validationMode = prompt_only`
- `stylePreviewUsedAsReference = false`
- `stylePreviewReference = false`

### 18.6 Unsupported Style-Related Args Policy

The runner no longer silently ignores style-shaped arguments that it does not support.

T4-7 explicitly rejects:

- `--style-preview-reference`
- `--validation-mode=...`
- `--style=...`
- `--selected-style-id=...`
- `--selected-style-name=...`
- `--style-preview-image-url=...`
- `--style-preview-used-as-reference=...`

Reason:

- T4 needs fail-fast behavior rather than false confidence from silently ignored inputs
- preview-reference-assisted mode remains a future extension, not an accidental partial mode

### 18.7 Dry-Run Verification

Executed checks:

```powershell
npm run guard:hygiene
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=watercolor
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=not_a_style
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-preview-reference
```

Observed results:

- default dry-run reports `styleId=soft_watercolor`
- canonical dry-run reports the requested canonical style, for example `crayon`
- alias dry-run normalizes `watercolor` to `soft_watercolor`
- invalid style ids now fail fast with the canonical list and alias map in the error
- unsupported style-related flags now fail fast instead of being ignored

### 18.8 T4-5 Gap Closure Assessment

T4-5 gaps and T4-7 status:

| gap from T4-5 | T4-7 status |
| --- | --- |
| no parsed `--style-id` | resolved |
| no canonical validation | resolved |
| no alias normalization | resolved |
| no style-aware payload mutation | resolved |
| no style metadata persistence | resolved |
| no dry-run style visibility | resolved |
| silent ignore of style args | resolved for style-related args |

Still intentionally deferred:

- preview-reference-assisted style mode
- style-aware write generation execution
- multi-run T4 mini-matrix generation itself

### 18.9 Decision

T4-7 decision:

- style-aware smoke runner support is now sufficient for T4 prompt-only dry-runs and for a later controlled write slice
- canonical style reporting is now possible from the runner path
- T4-8 can safely move to style-aware dry-run confirmation across the mini-matrix scope or the first staged write execution slice

### 18.10 Exclusions

- No write generation performed
- No image generation performed
- No Firestore sync performed
- No style profile content changed
- No UI changed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 19. T4-8 Full 6-Run Mini-Matrix Dry-Run

Status: completed

Date: 2026-05-16

### 19.1 Purpose

Run the full T4 initial mini-matrix in dry-run mode only and confirm that the style-aware runner can build the intended payload shape for every template/style combination before any write generation begins.

### 19.2 Scope Executed

- checked git worktree / branch sync state
- ran `npm run guard:hygiene`
- rechecked runner syntax and style-aware fields in `scripts/create-template-smoke-books.js`
- executed the full 6-run prompt-only / no-reference dry-run matrix
- recorded the effective style and input fields per run

No `--write` execution was performed.

### 19.3 Matrix Executed

Templates:

- `fixed-sleepy-moon-adventure-8p`
- `fixed-first-zoo-8p`

Styles:

- `soft_watercolor`
- `crayon`
- `anime_storybook`

Fixed run parameters:

- `pageCount=8`
- `ageBand=preschool_3_4`
- `childAge=4`
- `validationMode=prompt_only`
- `stylePreviewUsedAsReference=false`
- `withReference=false`

### 19.4 Commands Run

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=soft_watercolor
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=soft_watercolor
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
```

### 19.5 Dry-Run Result Table

| templateId | styleId | selectedStyleName | validationMode | stylePreviewUsedAsReference | pageCount | ageBand | childAge | withReference | result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `やさしい水彩` | `prompt_only` | `false` | `8` | `preschool_3_4` | `4` | `false` | pass |
| `fixed-sleepy-moon-adventure-8p` | `crayon` | `クレヨンで描いた絵本` | `prompt_only` | `false` | `8` | `preschool_3_4` | `4` | `false` | pass |
| `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `わくわくアニメ風` | `prompt_only` | `false` | `8` | `preschool_3_4` | `4` | `false` | pass |
| `fixed-first-zoo-8p` | `soft_watercolor` | `やさしい水彩` | `prompt_only` | `false` | `8` | `preschool_3_4` | `4` | `false` | pass |
| `fixed-first-zoo-8p` | `crayon` | `クレヨンで描いた絵本` | `prompt_only` | `false` | `8` | `preschool_3_4` | `4` | `false` | pass |
| `fixed-first-zoo-8p` | `anime_storybook` | `わくわくアニメ風` | `prompt_only` | `false` | `8` | `preschool_3_4` | `4` | `false` | pass |

### 19.6 Input And Reference Checks

Confirmed across all 6 runs:

- `validationMode` remained `prompt_only`
- `stylePreviewUsedAsReference` remained `false`
- `withReference` remained `false`
- no reference image URL was supplied
- no character-reference path was activated
- age band resolved consistently to `childAge=4`

Template-specific input confirmation:

- `fixed-sleepy-moon-adventure-8p`
  - input contained `childName`, `parentMessage`, `childAge`
- `fixed-first-zoo-8p`
  - input contained `childName`, `parentMessage`, `place`, `familyMembers`, `childAge`

Assessment:

- the runner is now correctly style-aware without leaking into reference-assisted behavior
- the T4 mini-matrix can proceed to a write slice without redefining payload shape

### 19.7 Decision

T4-8 decision:

- full 6-run mini-matrix dry-run is successful
- style-aware payload assembly is stable across both baseline templates and all 3 initial styles
- T4-9 can proceed to staged write generation for the same 6-run matrix if desired

### 19.8 Exclusions

- No write generation performed
- No image generation performed
- No Firestore writes performed
- No code changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 20. T4-9 Controlled Write Generation For 6-Run Style Mini-Matrix

Status: completed

Date: 2026-05-16

### 20.1 Purpose

Execute the first T4 style mini-matrix as controlled prompt-only / no-reference write generation, record the 6 resulting `bookId`s, and confirm structural generation health before any manual visual QA.

### 20.2 Preconditions Confirmed

- git worktree was clean and synced with `origin/main`
- `npm run guard:hygiene`: pass
- `GOOGLE_APPLICATION_CREDENTIALS` was set
- runner support from T4-7 was already in place
- full 6-run dry-run from T4-8 had already passed

No additional code changes were required for this slice.

### 20.3 Matrix Executed

Shared parameters:

- `pageCount=8`
- `ageBand=preschool_3_4`
- `childAge=4`
- `validationMode=prompt_only`
- `withReference=false`
- `stylePreviewUsedAsReference=false`
- reference image: not used
- style preview reference: not used

Runs executed:

| run | templateId | styleId |
| --- | --- | --- |
| 1 | `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` |
| 2 | `fixed-first-zoo-8p` | `soft_watercolor` |
| 3 | `fixed-sleepy-moon-adventure-8p` | `crayon` |
| 4 | `fixed-first-zoo-8p` | `crayon` |
| 5 | `fixed-sleepy-moon-adventure-8p` | `anime_storybook` |
| 6 | `fixed-first-zoo-8p` | `anime_storybook` |

### 20.4 Write Commands

Executed as six controlled single-book writes:

```powershell
node scripts/create-template-smoke-books.js --write --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=soft_watercolor
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=soft_watercolor
node scripts/create-template-smoke-books.js --write --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --write --template-id=fixed-sleepy-moon-adventure-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
```

### 20.5 Generated BookIds

| run | templateId | styleId | bookId | smokeRunId |
| --- | --- | --- | --- | --- |
| 1 | `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `h3QDTgIjGTwBOGYRkgzC` | `template-t2a-20260516083825` |
| 2 | `fixed-first-zoo-8p` | `soft_watercolor` | `LBzamVYJs1CDv3dRwE9L` | `template-t2a-20260516083826` |
| 3 | `fixed-sleepy-moon-adventure-8p` | `crayon` | `r5R8Q5nCTv2DB5pB8ahl` | `template-t2a-20260516083830` |
| 4 | `fixed-first-zoo-8p` | `crayon` | `d6dzSFiudIAPKuMa5IN7` | `template-t2a-20260516083830` |
| 5 | `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `8kT3VwB8pZSwrWWuLqwB` | `template-t2a-20260516083831` |
| 6 | `fixed-first-zoo-8p` | `anime_storybook` | `T7LGTZZGfN0enFgLM6at` | `template-t2a-20260516083831` |

### 20.6 Monitor Summary

The 6 books were polled until all statuses left `generating`.

Observed progress snapshots:

- sleepy-moon `soft_watercolor`: `38 → 50 → 63 → 75 → 100 → completed`
- first-zoo `soft_watercolor`: `25 → 50 → 50 → 75 → 100 → completed`
- sleepy-moon `crayon`: `25 → 38 → 50 → 50 → 75 → 100 → completed`
- first-zoo `crayon`: `25 → 38 → 50 → 50 → 75 → 100 → completed`
- sleepy-moon `anime_storybook`: `25 → 38 → 50 → 50 → 75 → 100 → completed`
- first-zoo `anime_storybook`: `25 → 25 → 50 → 50 → 75 → 100 → completed`

No run became stuck, failed, or required regeneration during this slice.

### 20.7 Structural Inspect Result

| templateId | styleId | bookId | status | progress | pagesTotal | pagesCompleted | pagesFailed | fallbackCount | timedOutCount | inputReferenceCountTotal | usedCharacterReferenceAny | result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `h3QDTgIjGTwBOGYRkgzC` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |
| `fixed-first-zoo-8p` | `soft_watercolor` | `LBzamVYJs1CDv3dRwE9L` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |
| `fixed-sleepy-moon-adventure-8p` | `crayon` | `r5R8Q5nCTv2DB5pB8ahl` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |
| `fixed-first-zoo-8p` | `crayon` | `d6dzSFiudIAPKuMa5IN7` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |
| `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `8kT3VwB8pZSwrWWuLqwB` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |
| `fixed-first-zoo-8p` | `anime_storybook` | `T7LGTZZGfN0enFgLM6at` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |

Confirmed across all 6 books:

- `styleId` persisted as requested canonical id
- `selectedStyleName` matched the requested style
- `validationMode` remained `prompt_only`
- `stylePreviewUsedAsReference` remained `false`
- `withReference` remained `false`
- `inputReferenceCount` stayed `0`
- `usedCharacterReference` stayed `false`
- no fallback pages detected
- no timeout markers detected
- no page-level failure provider was recorded

### 20.8 Health Assessment

T4-9 generation health verdict:

- 6 / 6 books completed
- 48 / 48 pages completed
- 0 / 48 pages failed
- no fallback usage observed
- no timeout usage observed
- no reference path usage observed
- no structural blockers found

Implication:

- the first style mini-matrix is structurally healthy and ready for manual visual QA
- T4-10 should focus on BF-4, BF-3, style adherence, and emotional fit, not on operational recovery

### 20.9 Decision

T4-9 decision:

- controlled write generation for the 6-run style mini-matrix succeeded
- all books are structurally healthy
- proceed to T4-10 manual visual QA for the six generated books

### 20.10 Exclusions

- No manual visual QA performed
- No image regeneration performed
- No Admin regeneration performed
- No reference-flow generation performed
- No code changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 21. T4-10 Manual Visual QA For 6 Generated Style Books

Status: completed

Date: 2026-05-16

### 21.1 Purpose

Perform manual visual QA for the first 6 generated T4 style books and record BF-4, BF-3, style adherence, style consistency, emotional fit, story-image match, and per-book rollout decisions before any follow-up remediation or matrix expansion.

### 21.2 Review Scope

Books reviewed:

| run | templateId | styleId | bookId |
| --- | --- | --- | --- |
| 1 | `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `h3QDTgIjGTwBOGYRkgzC` |
| 2 | `fixed-first-zoo-8p` | `soft_watercolor` | `LBzamVYJs1CDv3dRwE9L` |
| 3 | `fixed-sleepy-moon-adventure-8p` | `crayon` | `r5R8Q5nCTv2DB5pB8ahl` |
| 4 | `fixed-first-zoo-8p` | `crayon` | `d6dzSFiudIAPKuMa5IN7` |
| 5 | `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `8kT3VwB8pZSwrWWuLqwB` |
| 6 | `fixed-first-zoo-8p` | `anime_storybook` | `T7LGTZZGfN0enFgLM6at` |

Method:

- reviewed page `0` through `7` for all 6 books
- used local contact sheets for sequence comparison
- opened high-risk single pages for BF-4 spot checks
- kept this slice read-only

### 21.3 High-Level Findings

Overall pattern:

- `fixed-sleepy-moon-adventure-8p` is materially more stable across style variation than `fixed-first-zoo-8p`
- `soft_watercolor` is the safest overall anchor style
- `crayon` and `anime_storybook` both preserved strong style identity
- the main blocker in this matrix is not structural health but zoo-side BF-4 signage / printed-surface emergence in the more stylized runs

Most important blockers:

1. `fixed-first-zoo-8p × anime_storybook`
   - page `1` contains clearly readable Japanese signage at the zoo gate
   - page `7` also contains readable background sign text
2. `fixed-first-zoo-8p × crayon`
   - page `7` contains readable Latin-letter signage (`SMOK...`) in the background

Most important non-blocking watch item:

- `fixed-sleepy-moon-adventure-8p × soft_watercolor`
  - page `6` contains a small red seal-like corner mark that reads as watermark/signature-like

### 21.4 Per-Book QA Table

| templateId | styleId | bookId | BF-4 | BF-3 | style adherence | style consistency | emotional fit | story-image match | decision | key notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `h3QDTgIjGTwBOGYRkgzC` | `watch` | `pass` | `strong` | `strong` | `high fit` | `acceptable` | `Conditional-Go` | page `6` has a small seal-like corner artifact; otherwise very strong sleepy baseline |
| `fixed-first-zoo-8p` | `soft_watercolor` | `LBzamVYJs1CDv3dRwE9L` | `pass` | `watch` | `strong` | `acceptable` | `high fit` | `acceptable` | `Conditional-Go` | safe composition and gentle zoo mood; some outfit / staging drift across pages but still readable as one outing |
| `fixed-sleepy-moon-adventure-8p` | `crayon` | `r5R8Q5nCTv2DB5pB8ahl` | `pass` | `pass` | `strong` | `strong` | `high fit` | `acceptable` | `Go` | style reads clearly as waxy crayon without pseudo-text collapse |
| `fixed-first-zoo-8p` | `crayon` | `d6dzSFiudIAPKuMa5IN7` | `fail` | `watch` | `strong` | `acceptable` | `acceptable` | `acceptable` | `Hold` | page `7` background sign introduces readable Latin letters; outfit continuity is also looser than sleepy runs |
| `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `8kT3VwB8pZSwrWWuLqwB` | `pass` | `pass` | `strong` | `strong` | `high fit` | `acceptable` | `Go` | expressive but still preschool-appropriate; same child / pajamas / teddy continuity holds |
| `fixed-first-zoo-8p` | `anime_storybook` | `T7LGTZZGfN0enFgLM6at` | `fail` | `watch` | `strong` | `acceptable` | `acceptable` | `acceptable` | `Hold` | page `1` readable Japanese signage and page `7` readable background sign are BF-4 blockers |

### 21.5 BF-4 Assessment By Style

#### `soft_watercolor`

Result:

- strongest overall BF-4 performer in this matrix

Book-level summary:

- sleepy-moon: low-severity watch only
- first-zoo: pass

Notes:

- sleepy-moon page `6` includes a small red seal-like mark in the lower-right corner
- this does not read like large overlay text, but it does resemble a watermark/signature artifact and should stay on the watch list
- zoo soft-watercolor avoided the explicit signage problem seen in the stylized runs

#### `crayon`

Result:

- mixed

Book-level summary:

- sleepy-moon: pass
- first-zoo: fail

Notes:

- sleepy-moon preserved hand-drawn texture without obvious pseudo-text
- first-zoo page `7` produced readable background lettering, which is a BF-4 blocker

#### `anime_storybook`

Result:

- mixed with the strongest zoo-side BF-4 failure

Book-level summary:

- sleepy-moon: pass
- first-zoo: fail

Notes:

- anime sleepy remained clean and did not introduce bubble / caption artifacts
- anime zoo page `1` generated clearly readable Japanese information boards at the entrance
- anime zoo page `7` also retained readable sign text in the background

### 21.6 BF-3 Assessment By Style

#### `soft_watercolor`

- sleepy-moon: pass
- first-zoo: watch

Notes:

- sleepy-moon preserved the clearest same-child / same-pajama / same-teddy continuity
- zoo remained understandable as the same child, but outfit and scene-stage continuity were looser across the sequence

#### `crayon`

- sleepy-moon: pass
- first-zoo: watch

Notes:

- sleepy-moon kept strong same-child identity despite the stylized texture
- zoo child identity remained understandable, but wardrobe / staging consistency varied more page-to-page

#### `anime_storybook`

- sleepy-moon: pass
- first-zoo: watch

Notes:

- anime sleepy stayed preschool-appropriate and consistent
- anime zoo did not age the child up severely, but wardrobe and family-scene continuity were still looser than the sleepy template

### 21.7 Style Adherence And Emotional Fit

`soft_watercolor`

- style adherence: strong on both templates
- emotional fit: especially strong on sleepy-moon, also high on zoo

`crayon`

- style adherence: strong on both templates
- emotional fit: very good on sleepy-moon, acceptable on zoo

`anime_storybook`

- style adherence: strong on both templates
- emotional fit: high on sleepy-moon, acceptable on zoo

Interpretation:

- the style system can express all 3 target styles distinctly in prompt-only mode
- the main issue is not “style fails to appear”
- the main issue is that zoo-specific rendered signage becomes more likely in the stylized variants

### 21.8 Story-Image Match

General verdict:

- all 6 books remained broadly aligned with their template stories

Template-specific notes:

- sleepy-moon across all 3 styles
  - story-image match remained solid
  - bedtime calm, moon gaze, dream transition, reassurance, and sleep ending all read correctly
- first-zoo across all 3 styles
  - scene sequence remained understandable
  - animals, family outing beats, and sunset close all read correctly
  - the concern is not semantic mismatch but BF-4 signage emergence and somewhat looser continuity

### 21.9 Matrix Decision

Per-book rollout summary:

- `Go`
  - `fixed-sleepy-moon-adventure-8p × crayon`
  - `fixed-sleepy-moon-adventure-8p × anime_storybook`
- `Conditional-Go`
  - `fixed-sleepy-moon-adventure-8p × soft_watercolor`
  - `fixed-first-zoo-8p × soft_watercolor`
- `Hold`
  - `fixed-first-zoo-8p × crayon`
  - `fixed-first-zoo-8p × anime_storybook`

Matrix-level decision:

- `Conditional`

Reason:

- the mini-matrix proves that prompt-only style variation is viable
- sleepy-moon is effectively style-ready across the first 3 styles
- first-zoo still needs style-specific BF-4 suppression for signage / printed surfaces before the crayon and anime variants can be considered rollout-ready

### 21.10 Recommended Next Step

Recommended next slice:

- T4-11: zoo-style BF-4 remediation planning focused on entrance signs, background boards, and printed zoo surfaces for `crayon` and `anime_storybook`

Secondary note:

- sleepy soft-watercolor page `6` seal-like artifact can stay as a low-severity watch item unless it recurs systematically

### 21.11 Exclusions

- No image regeneration performed
- No Admin regeneration performed
- No Firestore writes performed
- No code or runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 22. T4-11 Zoo-Style BF-4 Remediation Planning

Status: completed

Date: 2026-05-16

### 22.1 Purpose

Define a docs-only remediation plan for the remaining T4 zoo-style BF-4 blockers, limited to `fixed-first-zoo-8p × crayon` and `fixed-first-zoo-8p × anime_storybook`, without changing runner behavior or style profiles.

### 22.2 Scope

Targeted variants only:

- `fixed-first-zoo-8p × crayon`
- `fixed-first-zoo-8p × anime_storybook`

Out of scope:

- sleepy-moon variants
- `soft_watercolor` zoo variant
- style profile prose changes
- runner changes
- Firestore sync or re-smoke execution

### 22.3 Failure Recap

From T4-10:

`fixed-first-zoo-8p × crayon`

- BF-4: `fail`
- primary blocker:
  - page `7` readable Latin-letter sign in the background

`fixed-first-zoo-8p × anime_storybook`

- BF-4: `fail`
- primary blockers:
  - page `1` readable Japanese zoo gate signage
  - page `7` readable background sign

Shared pattern:

- failures cluster around entrance / exit / wayfinding surfaces
- they are not random page-wide text collapses
- they are scene-specific printed-surface reintroductions

### 22.4 Cause Hypothesis

Primary hypothesis:

- `fixed-first-zoo-8p` still semantically invites “real zoo entrance” and “real zoo exit” rendering
- once the style becomes more graphic or more cinematic, the model tends to complete that realism with signage, maps, gate boards, nameplates, and facility markers

Why this persists despite existing no-text clauses:

1. current wording is broad but still coexists with entrance/gate/exit semantics
2. the model may treat zoo signs as “scene structure” rather than optional clutter
3. stylized renderers often simplify environments into iconic features
4. zoo iconic features frequently include signs, maps, directional boards, and labeled gates

Secondary hypothesis:

- page `1` and page `7` are the highest-risk compositions because they are naturally “gateway” scenes
- page `2` and page `4` remain secondary risk pages because enclosure placards and warning panels are plausible completions there

### 22.5 Why `crayon` And `anime_storybook` Worsen The Risk

`crayon`

- simplifies real-world structures into bold symbolic shapes
- signboards can become attractive “clean rectangles” for the renderer
- once a rectangle is placed, hand-drawn letter-like marks can appear more easily

`anime_storybook`

- tends to dramatize arrival and farewell beats with stronger environment staging
- gates, boards, and name signs are reinforced as part of a cinematic establishing shot
- readable signage is more likely because the style leans into location identity cues

Important interpretation:

- this is not mainly a style-profile problem
- this is a zoo-template-local prompt contract problem revealed by stylized rendering pressure

### 22.6 Template-Local Remediation Direction

T4-11 decision is to strengthen `fixed-first-zoo-8p` locally rather than adding style-specific prompt forks first.

Recommended direction:

1. introduce a stronger zoo-template-local no-sign / no-board / no-printed-surface clause
2. apply it at least to page `1`, `2`, `4`, `6`, and `7`
3. reframe risky scenes away from “official facility signage” and toward natural or decorative cues
4. keep the style contract untouched for now so T4 reporting stays comparable across styles

Core principle:

- suppress zoo-specific printed surfaces at the template layer
- let style variation continue to operate above that safer baseline

### 22.7 Proposed Guardrail Focus

Proposed new zoo-local suppression targets:

- no entrance signs
- no zoo name boards
- no map boards
- no ticket boards
- no information panels
- no directional markers
- no exit markers
- no facility placards
- no enclosure labels
- no warning notices
- no posted notices
- no hanging banners
- no printed gate surfaces

Preferred replacement language:

- use leafy arches
- use plain fence posts
- use natural path framing
- use animal silhouettes only
- use unmarked lanterns
- use plain wooden or leafy structures with no printed surfaces

### 22.8 Page-Specific Remediation Plan

#### Page 1

Current risk:

- zoo entrance shot strongly invites gate signage and map boards

Remediation direction:

- keep the arrival beat
- remove any implication of formal admission signage
- describe the entrance as a leafy arch, trees, path, and open gate only
- explicitly forbid side boards, map panels, admission notices, and posted signs

Suggested design intent:

- “arrival at a welcoming leafy threshold”
- not “arrival at an information-rich facility gate”

#### Page 2

Current risk:

- enclosure scene can still pull in animal-name placards

Remediation direction:

- strengthen “plain fence / natural habitat / no placards in view”
- reduce background opportunity for panel-like objects

#### Page 4

Current risk:

- larger-animal tension beat can attract warning notices or caution boards

Remediation direction:

- explicitly replace caution signage with plain fence rhythm and family posture
- use body language, not notice boards, to communicate tension

#### Page 6

Current risk:

- exit path at golden hour can still generate direction boards or facility markers

Remediation direction:

- simplify into trees, path, sky glow, and back-view family silhouette
- forbid wayfinding, maps, exit labels, and facility markers

#### Page 7

Current risk:

- closing shot can still place readable sign text near zoo buildings or the path edge

Remediation direction:

- make the ending about parent-child silhouette, dusk light, and quiet path
- keep any background architecture plain and distant
- explicitly forbid background signboards, building labels, and printed structures

### 22.9 Minimal Code-Change Strategy For T4-12

Recommended implementation scope:

- limit changes to `functions/src/seed-templates.ts`
- keep them inside `fixed-first-zoo-8p` prompt helpers and page bodies

Preferred implementation shape:

1. add or strengthen one zoo-8p-local printed-surface clause
2. route the highest-risk pages through that stronger clause
3. minimally harden page `1` and page `7` body text
4. lightly harden page `2`, `4`, and `6`

Do not change in T4-12:

- runner
- style profile registry
- styleBible
- negativeStyleRules
- shared global suffix
- unrelated templates

### 22.10 T4-12 Implementation Plan

T4-12 should execute:

1. inspect the current `fixed-first-zoo-8p` prompt helper structure
2. strengthen zoo-template-local no-sign / no-board / no-printed-surface guard
3. page `1` focused hardening
4. page `7` focused hardening
5. secondary hardening for page `2`, `4`, and `6`
6. keep `soft_watercolor` success path intact
7. run `npm run guard:hygiene`
8. run targeted build / tests as needed
9. record implementation result in this doc

Follow-up after T4-12:

- targeted re-smoke for:
  - `fixed-first-zoo-8p × crayon`
  - `fixed-first-zoo-8p × anime_storybook`
- then manual rerun QA for those two variants

### 22.11 Decision

T4-11 decision:

- zoo-style BF-4 remediation should be handled as a zoo-template-local hardening step, not as a style-profile rewrite
- page `1` and page `7` are the first blockers to fix
- page `2`, `4`, and `6` should receive lighter preventive hardening in the same slice
- T4-12 can proceed as a narrow prompt-hardening implementation

### 22.12 Exclusions

- No code or prompt changes performed
- No Firestore sync performed
- No smoke generation performed
- No image generation performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 23. T4-12 Zoo-Style BF-4 Prompt Hardening

Status: completed

Date: 2026-05-17

### 23.1 Purpose

Implement the narrow zoo-template-local BF-4 hardening planned in T4-11 for `fixed-first-zoo-8p`, without changing style profiles, runner behavior, or unrelated templates.

### 23.2 Files Changed

- `functions/src/seed-templates.ts`
- `functions/test/seed-templates.test.ts`
- `docs/STYLE_VARIANT_VALIDATION_PLAN.md`

### 23.3 Implementation Summary

Implemented a new zoo-8p-local printed-surface suppression layer and threaded it through the highest-risk `fixed-first-zoo-8p` pages.

New prompt clause:

- `ZOO_8P_NO_PRINTED_SURFACES_CLAUSE`

Purpose of the new clause:

- forbid entrance signs
- forbid zoo name boards
- forbid map boards
- forbid ticket boards
- forbid information panels
- forbid directional markers
- forbid exit markers
- forbid facility placards
- forbid enclosure labels
- forbid warning notices
- forbid posted notices
- forbid hanging banners
- forbid printed gate or building surfaces

Guardrail integration:

- `withZoo8pImagePromptGuardrail(...)` now appends the new printed-surface clause whenever `signText: true` is used

### 23.4 Page-Level Hardening Applied

#### Page 1

Hardening added:

- reframed the arrival scene as a welcoming leafy threshold
- explicitly forbids:
  - side boards
  - map panels
  - admission notices
  - posted signs

Goal:

- keep the arrival beat while removing “official zoo gate signage” affordances

#### Page 2

Hardening added:

- strengthens enclosure scene toward natural habitat framing
- explicitly says:
  - plain fence rhythm only
  - no panel-like objects in view

Goal:

- reduce the chance of animal placards or board-like props appearing

#### Page 4

Hardening added:

- explicitly says caution / surprise should be conveyed by body language and fence rhythm only

Goal:

- avoid warning boards, caution notices, and other signage-like surfaces in the larger-animal beat

#### Page 6

Hardening added:

- simplifies the exit scene to:
  - trees
  - path
  - sky glow
  - family silhouette only
- explicitly requires background structures to remain plain, distant, and unmarked

Goal:

- suppress wayfinding, exit labels, and facility markers in the golden-hour departure scene

#### Page 7

Hardening added:

- explicitly requires background buildings, lamps, fences, and zoo structures to remain plain, distant, and unmarked
- explicitly forbids:
  - signboards
  - building labels
  - printed surfaces anywhere in view

Goal:

- directly target the T4-10 page `7` BF-4 blocker in `crayon` and `anime_storybook`

### 23.5 Scope Guardrails Preserved

Explicitly unchanged in T4-12:

- style profiles
- styleBible / negativeStyleRules
- smoke runner
- sleepy-moon prompts
- `textTemplate`
- `textTemplatesByAge`
- shared `withFixedImagePromptSafety(...)`
- unrelated templates

### 23.6 Test Coverage Added

Added / updated tests in `functions/test/seed-templates.test.ts` for:

- sign-guarded zoo pages `1 / 2 / 4 / 6 / 7` inheriting the stronger printed-surface suppression
- page `1` explicitly forbidding gate-side boards / map panels / admission notices / posted signs
- page `7` explicitly forcing plain distant unmarked background zoo structures
- page `2`, `4`, and `6` containing the intended light hardening language

### 23.7 Validation Result

Executed:

```powershell
npm run guard:hygiene
npm --prefix functions run build
npm --prefix functions test -- test/seed-templates.test.ts
```

Results:

- `npm run guard:hygiene`: pass
- `npm --prefix functions run build`: pass
- `npm --prefix functions test -- test/seed-templates.test.ts`: pass
- seed-template test count: `384 passed`

### 23.8 Decision

T4-12 decision:

- zoo-style BF-4 hardening is now implemented as a narrow template-local change
- page `1` and page `7` received the strongest targeted cleanup
- page `2`, `4`, and `6` received preventive supporting hardening
- the change is ready for the next re-smoke slice

### 23.9 Recommended Next Step

Recommended next slice:

- T4-13: targeted re-smoke for
  - `fixed-first-zoo-8p × crayon`
  - `fixed-first-zoo-8p × anime_storybook`

Then:

- T4-14: manual visual QA rerun focused on page `1` and page `7`

### 23.10 Exclusions

- No Firestore sync performed
- No smoke generation performed
- No image generation performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

---

## 24. T4-13 Firestore Sync And Targeted Style Re-Smoke

Status: completed

Date: 2026-05-17

### 24.1 Purpose

Sync the T4-12 zoo prompt hardening into Firestore for `fixed-first-zoo-8p` and run a targeted 2-book style re-smoke for the previously failing `crayon` and `anime_storybook` variants before manual visual QA rerun.

### 24.2 Target Scope

Template synced:

- `fixed-first-zoo-8p`

Targeted re-smoke runs:

| run | templateId | styleId |
| --- | --- | --- |
| 1 | `fixed-first-zoo-8p` | `crayon` |
| 2 | `fixed-first-zoo-8p` | `anime_storybook` |

Shared generation parameters:

- `pageCount=8`
- `ageBand=preschool_3_4`
- `childAge=4`
- `validationMode=prompt_only`
- `withReference=false`
- `stylePreviewUsedAsReference=false`
- reference image: not used
- style preview reference: not used

### 24.3 Preconditions Confirmed

- git worktree clean and synced with `origin/main`
- `npm run guard:hygiene`: pass
- `npm --prefix functions run build`: pass
- `GOOGLE_APPLICATION_CREDENTIALS` set
- T4-12 implementation already merged locally and pushed

### 24.4 Targeted Template Sync

Executed sync check:

```powershell
node scripts/sync-fixed-template-seeds.js --dry-run --template-id=fixed-first-zoo-8p
```

Result:

- pre-sync report: `[]`
- target template already passed the sync checker

Executed targeted sync write:

```powershell
node scripts/sync-fixed-template-seeds.js --write --template-id=fixed-first-zoo-8p
```

Result:

- before report: `[]`
- after report: `[]`
- targeted write completed successfully

Executed post-sync check:

```powershell
node scripts/sync-fixed-template-seeds.js --dry-run --template-id=fixed-first-zoo-8p
```

Result:

- post-sync report: `[]`

Assessment:

- Firestore template state is aligned with the local hardened seed

### 24.5 Targeted Re-Smoke Dry-Run

Executed:

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
```

Dry-run confirmation for both:

- correct `styleId`
- correct `selectedStyleName`
- `validationMode=prompt_only`
- `stylePreviewUsedAsReference=false`
- `withReference=false`
- `pageCount=8`
- `ageBand=preschool_3_4`
- `childAge=4`

### 24.6 Targeted Write Generation

Executed:

```powershell
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=crayon
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
```

Generated book ids:

| styleId | bookId | smokeRunId |
| --- | --- | --- |
| `crayon` | `43luvSMHYiQJZIMEcYz4` | `template-t2a-20260516154717` |
| `anime_storybook` | `kdX8Mvy7mSOJTGTou9Kq` | `template-t2a-20260516154720` |

### 24.7 Monitor And Inspect Result

Both books reached terminal status without retries or structural problems.

Summary table:

| templateId | styleId | bookId | status | progress | pagesTotal | pagesCompleted | pagesFailed | fallbackCount | timedOutCount | inputReferenceCountTotal | usedCharacterReferenceAny | result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-first-zoo-8p` | `crayon` | `43luvSMHYiQJZIMEcYz4` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |
| `fixed-first-zoo-8p` | `anime_storybook` | `kdX8Mvy7mSOJTGTou9Kq` | `completed` | `100` | `8` | `8` | `0` | `0` | `0` | `0` | `false` | pass |

Confirmed across both books:

- `selectedStyleId` persisted as requested canonical id
- `selectedStyleName` matched the requested style
- `validationMode` remained `prompt_only`
- `stylePreviewUsedAsReference` remained `false`
- `withReference` remained `false`
- `inputReferenceCount` stayed `0`
- `usedCharacterReference` stayed `false`
- no fallback pages detected
- no timeout markers detected
- no page-level failure provider was recorded

### 24.8 Health Assessment

T4-13 generation health verdict:

- 2 / 2 books completed
- 16 / 16 pages completed
- 0 / 16 pages failed
- no fallback usage observed
- no timeout usage observed
- no reference path usage observed
- no structural blockers found

Implication:

- the hardened zoo variants are structurally ready for manual visual QA rerun
- the remaining question is purely visual: whether page `1` and page `7` signage is now suppressed

### 24.9 Decision

T4-13 decision:

- targeted Firestore sync succeeded
- targeted 2-run style re-smoke succeeded
- proceed to T4-14 manual visual QA rerun for:
  - `43luvSMHYiQJZIMEcYz4`
  - `kdX8Mvy7mSOJTGTou9Kq`

### 24.10 Exclusions

- No manual visual QA performed
- No image regeneration performed
- No Admin regeneration performed
- No reference-flow generation performed
- No code changes performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 25. T4-14 Targeted Zoo-Style Manual Visual QA Rerun

Date: 2026-05-17

Scope:

- manual visual QA rerun for the two T4-13 targeted re-smoke books
- template fixed to `fixed-first-zoo-8p`
- styles under review:
  - `crayon`
  - `anime_storybook`
- mode remains `prompt_only`
- reference image remains unused

Target books:

| styleId | rerun bookId | previous failed bookId | prior blocker |
| --- | --- | --- | --- |
| `crayon` | `43luvSMHYiQJZIMEcYz4` | `d6dzSFiudIAPKuMa5IN7` | page `7` readable Latin-letter background sign |
| `anime_storybook` | `kdX8Mvy7mSOJTGTou9Kq` | `T7LGTZZGfN0enFgLM6at` | page `1` readable Japanese gate signage; page `7` readable background sign |

### 25.1 Visual Review Method

Reviewed:

- page `0` through page `7` for both rerun books
- contact-sheet level sequence continuity
- focused close review on:
  - `crayon` page `7`
  - `anime_storybook` page `1`
  - `anime_storybook` page `7`

Primary evaluation axes:

- BF-4 readable text / sign / printed-surface suppression
- BF-3 continuity regression check
- style adherence
- style consistency
- emotional fit
- story-image match

### 25.2 Crayon Rerun Result

Book:

- templateId: `fixed-first-zoo-8p`
- styleId: `crayon`
- bookId: `43luvSMHYiQJZIMEcYz4`

Visual findings:

- page `7` no longer shows the previous readable Latin-letter background sign
- exit/final-scene structures read as plain enough and non-readable
- no new obvious signage blocker was observed across pages `0` through `7`
- crayon rendering remains strong and recognizable across the full sequence
- child continuity remains acceptable for this template and does not show a major regression
- zoo mood, animal beats, and story-image match remain intact after the no-sign hardening

Assessment:

- BF-4: pass
- BF-3: pass
- style adherence: strong
- style consistency: strong
- emotional fit: pass
- story-image match: pass

Decision:

- `Go`

### 25.3 Anime Storybook Rerun Result

Book:

- templateId: `fixed-first-zoo-8p`
- styleId: `anime_storybook`
- bookId: `kdX8Mvy7mSOJTGTou9Kq`

Visual findings:

- previous page `1` gate-side signage issue appears improved; the entrance scene no longer depends on readable zoo gate signage
- previous page `7` background sign issue also appears improved; no readable final-scene sign was observed
- however, page `1` now contains a new readable text-like artifact on the child's shirt/chest area
- this clothing print reads as clear alphanumeric text rather than harmless decorative texture
- aside from that blocker, the anime storybook look remains vivid, emotionally appropriate, and sequence-consistent enough
- BF-3 continuity did not show a major regression during the rerun

Assessment:

- BF-4: fail
- BF-3: watch
- style adherence: strong
- style consistency: acceptable
- emotional fit: pass
- story-image match: pass

Decision:

- `Hold`

### 25.4 Targeted Rerun Summary

Summary table:

| templateId | styleId | bookId | BF-4 | BF-3 | style adherence | decision | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-first-zoo-8p` | `crayon` | `43luvSMHYiQJZIMEcYz4` | pass | pass | strong | `Go` | previous page `7` sign blocker resolved |
| `fixed-first-zoo-8p` | `anime_storybook` | `kdX8Mvy7mSOJTGTou9Kq` | fail | watch | strong | `Hold` | page `1` new readable shirt text; page `7` sign blocker resolved |

Targeted rerun decision:

- `Conditional`

Interpretation:

- the zoo-template-local hardening successfully addressed the original page `7` crayon sign issue
- the same hardening also improved anime page `1` gate signage and anime page `7` background signage
- however, `anime_storybook` still remains blocked by a new BF-4 clothing-text artifact on page `1`
- this means the zoo style track is improved but not yet fully cleared for both stylized reruns

### 25.5 Recommended Next Step

Recommended follow-up:

- plan a narrow BF-4 cleanup for `fixed-first-zoo-8p` that suppresses readable clothing prints or letter-like shirt graphics in the page `1` entrance beat
- preserve the successful no-sign / no-board / no-printed-surface improvements already achieved on page `7`
- keep the scope template-local and avoid changing style profiles unless the next rerun proves template-only suppression is insufficient

### 25.6 Exclusions

- No image regeneration performed
- No Admin regeneration performed
- No Firestore write performed in this slice
- No template sync performed in this slice
- No smoke regeneration performed in this slice
- No code changes performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 26. T4-15 Anime Storybook Page-1 Clothing-Text BF-4 Remediation Plan

Date: 2026-05-17

Scope:

- docs-only remediation planning
- target template: `fixed-first-zoo-8p`
- target style: `anime_storybook`
- target failed rerun book: `kdX8Mvy7mSOJTGTou9Kq`
- target issue: page `1` child clothing readable alphanumeric text

### 26.1 Residual Failure Summary

Current state after T4-14:

- previous zoo-gate signage issue on page `1`: improved / resolved
- previous background sign issue on page `7`: improved / resolved
- remaining blocker: page `1` child shirt/chest area contains readable alphanumeric text
- BF-4 outcome for `fixed-first-zoo-8p × anime_storybook`: fail
- BF-3 outcome: watch but not release-blocking by itself

Interpretation:

- T4-12 zoo printed-surface hardening successfully reduced environmental signage risk
- the remaining BF-4 issue is no longer a board / gate / placard problem
- the current failure has shifted to character apparel rendering inside the entrance scene

### 26.2 Cause Hypothesis

Working hypothesis:

- `anime_storybook` tends to enrich character outfits with stronger graphic detail than `soft_watercolor` or `crayon`
- once gate signage and environmental boards were suppressed, the model may have moved decorative high-contrast detail onto the child outfit
- page `1` is especially vulnerable because it is an establishing scene with a front-facing child pose and high visible torso area
- the current zoo template hardening covers printed surfaces in the environment more directly than printed marks on clothing

Risk model:

- signage suppression alone is insufficient for stylized entrance scenes
- if outfit graphics are not explicitly constrained, anime rendering may introduce letters, patches, logos, badges, or emblem-like shirt prints
- this is still a template-local BF-4 problem because the issue occurs inside a concrete page context, not as a general failure of the style runner or style payload path

### 26.3 Prompt Remediation Direction

Recommended suppression direction:

- add explicit no-readable-text clothing guidance for the zoo `page 1` prompt
- suppress:
  - shirt text
  - logo text
  - badge text
  - jersey numbers
  - word marks
  - alphabet prints
  - slogan graphics
  - letter patches
- steer the outfit toward:
  - plain child-safe clothing
  - simple solid colors
  - small non-readable shapes only
  - unmarked fabric surfaces

Desired wording characteristics:

- narrow and local to the page `1` entrance beat
- framed as visual constraints, not as a global anti-style clause
- compatible with the existing no-sign / no-board / no-printed-surface guidance

### 26.4 Template-Local vs Style-Specific Decision

Decision:

- use zoo template-local hardening first

Reasoning:

- the failure occurs in a specific template scene with a specific body framing, not across the full style matrix
- runner behavior is already validated and not implicated
- style adherence for `anime_storybook` is strong, so broad style-profile edits would risk overcorrecting the style track
- template-local page `1` outfit suppression is the smallest viable intervention

Escalation rule:

- if a page `1` outfit-text artifact persists after a template-local rerun, then consider a secondary anime-style-specific negative rule candidate
- do not escalate to style-profile changes until template-local suppression has been tested first

### 26.5 T4-16 Implementation Plan

Planned implementation scope for T4-16:

- inspect `functions/src/seed-templates.ts` for the current zoo 8p guard path and page `1` prompt body
- extend zoo 8p local prompt hardening with a clothing-text suppression clause
- apply the new clause at minimum to zoo `page 1`
- optionally allow very light reuse on other zoo pages only if the wording stays narrow and non-disruptive
- preserve:
  - `crayon` rerun success on page `7`
  - existing page `1` gate-sign suppression
  - existing page `7` background-sign suppression
  - runner behavior
  - style profiles
  - text templates and ageBand text

Validation target for T4-16:

- `npm run guard:hygiene`
- `npm --prefix functions run build`
- `npm --prefix functions test -- test/seed-templates.test.ts`
- docs update in this plan

Follow-up after T4-16:

- T4-17 targeted Firestore sync + `anime_storybook` re-smoke for `fixed-first-zoo-8p`
- T4-18 manual visual QA focused on page `1` clothing print suppression and regression check for page `7`

### 26.6 Acceptance Criteria

T4-16 / rerun success should mean:

- page `1` no longer shows readable clothing text, alphanumeric marks, or logo-like shirt graphics
- page `1` still reads as a warm zoo entrance beat
- `anime_storybook` style adherence remains recognizably strong
- no regression on page `7` sign suppression
- no new BF-4 blocker appears on page `2`, `4`, or `6`

### 26.7 Out Of Scope

- No code or prompt changes in this slice
- No Firestore sync in this slice
- No smoke generation in this slice
- No image regeneration in this slice
- No Admin regeneration in this slice
- No reference-flow generation in this slice
- No runner changes
- No style profile changes
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 27. T4-16 Anime Storybook Page-1 Clothing-Text BF-4 Hardening Implementation

Date: 2026-05-17

Scope:

- source prompt cleanup for `fixed-first-zoo-8p`
- target issue limited to `anime_storybook` rerun book `kdX8Mvy7mSOJTGTou9Kq`
- target failure surface limited to page `1` child clothing readable alphanumeric text

### 27.1 Implementation Summary

Updated files:

- `functions/src/seed-templates.ts`
- `functions/test/seed-templates.test.ts`

Implemented changes:

- strengthened `ZOO_8P_NO_CLOTHING_TEXT_CLAUSE`
  - expanded beyond generic no-print language
  - now explicitly suppresses:
    - visible print
    - logo
    - badge text
    - letters
    - numbers
    - mascot word marks
    - slogan graphics
    - patches
    - readable marks of any kind
- applied zoo clothing-text guard directly to page `1`
  - page `1` now uses `withZoo8pImagePromptGuardrail(..., { signText: true, clothingText: true })`
- hardened page `1` prompt body with explicit apparel constraints
  - plain child-safe clothing
  - simple solid-color fabric only
  - no shirt lettering
  - no logo patches
  - no mascot prints
  - no badge text
  - no decorative number or alphabet graphics
  - suppression applies to clothing, backpack, hat, and shoes

### 27.2 Scope Control

Preserved intentionally:

- T4-12 signage hardening
- zoo page `7` background-sign success path
- `crayon` rerun success path
- style profiles
- smoke runner
- sleepy-moon prompts
- `textTemplate`
- `textTemplatesByAge`
- shared global suffix behavior

Not changed:

- Firestore state
- smoke generation state
- any style profile content
- any runner payload logic

### 27.3 Test Coverage

Added / updated assertions in `functions/test/seed-templates.test.ts`:

- page `1` still removes gate-side boards and admission signage
- page `1` now explicitly includes zoo-local clothing text suppression
- page `1` now explicitly includes no shirt lettering / no logo patches / no mascot prints / no alphabet graphics wording

### 27.4 Validation

Executed:

```powershell
npm run guard:hygiene
npm --prefix functions run build
npm --prefix functions test -- test/seed-templates.test.ts
```

Result:

- `guard:hygiene`: pass
- functions build: pass
- seed template test: pass (`385` tests passed)

### 27.5 Assessment

T4-16 implementation verdict:

- narrow prompt hardening completed as planned
- intervention stayed template-local and page-local
- existing signage remediation path was preserved
- codebase is ready for targeted rerun validation

### 27.6 Next Step

Proceed to:

- T4-17 targeted Firestore sync + `fixed-first-zoo-8p × anime_storybook` re-smoke
- then T4-18 manual visual QA focused on:
  - page `1` clothing print suppression
  - page `7` no-sign regression check

### 27.7 Exclusions

- No Firestore sync performed in this slice
- No smoke generation performed in this slice
- No image generation performed in this slice
- No Admin regeneration performed
- No reference-flow generation performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 28. T4-17 Anime Storybook Firestore Sync And Targeted Re-Smoke

Date: 2026-05-17

Scope:

- target template: `fixed-first-zoo-8p`
- target style: `anime_storybook`
- target mode: `prompt_only`
- reference image: not used
- style preview reference: not used

### 28.1 Preconditions

Confirmed before running:

- git working tree was clean
- `npm run guard:hygiene`: pass
- `npm --prefix functions run build`: pass
- T4-16 prompt hardening had already landed on `main`

### 28.2 Targeted Template Sync

Executed pre-check:

```powershell
node scripts/sync-fixed-template-seeds.js --dry-run --template-id=fixed-first-zoo-8p
```

Result:

- pre-sync report for `fixed-first-zoo-8p`: `[]`

Executed write:

```powershell
node scripts/sync-fixed-template-seeds.js --write --template-id=fixed-first-zoo-8p
```

Write result:

- before report: `[]`
- after report: `[]`
- targeted sync completed successfully

Executed post-check:

```powershell
node scripts/sync-fixed-template-seeds.js --dry-run --template-id=fixed-first-zoo-8p
```

Result:

- post-sync report for `fixed-first-zoo-8p`: `[]`

Assessment:

- Firestore template state is aligned with the local T4-16 clothing-text hardening

### 28.3 Targeted Anime Re-Smoke Dry-Run

Executed:

```powershell
node scripts/create-template-smoke-books.js --dry-run --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
```

Dry-run confirmed:

- `styleId=anime_storybook`
- `selectedStyleName=わくわくアニメ風`
- `validationMode=prompt_only`
- `stylePreviewUsedAsReference=false`
- `pageCount=8`
- `ageBand=preschool_3_4`
- `childAge=4`
- `withReference=false`

### 28.4 Targeted Anime Re-Smoke Write

Executed:

```powershell
node scripts/create-template-smoke-books.js --write --template-id=fixed-first-zoo-8p --page-count=8 --age-band=preschool_3_4 --style-id=anime_storybook
```

Generated:

| templateId | styleId | bookId | smokeRunId |
| --- | --- | --- | --- |
| `fixed-first-zoo-8p` | `anime_storybook` | `BDKHvJt4J7Bfzwx4IZAg` | `template-t2a-20260516165104` |

### 28.5 Monitor And Inspect Result

Monitor progression observed:

- `generating / 0`
- `generating / 25`
- `generating / 50`
- `generating / 88`
- `generating / 100`
- `completed / 100`

Executed:

```powershell
npm run smoke:monitor -- BDKHvJt4J7Bfzwx4IZAg
npm run smoke:inspect -- BDKHvJt4J7Bfzwx4IZAg --expected-page-count=8
```

Final structural summary:

| templateId | styleId | bookId | status | progress | pagesTotal | pagesCompletedOrFallback | pagesFailed | fallbackCount | timedOutCount | inputReferenceCountTotal | usedCharacterReferenceAny | validationMode | result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-first-zoo-8p` | `anime_storybook` | `BDKHvJt4J7Bfzwx4IZAg` | `completed` | `100` | `8` | `8` | `0` | `1` | `0` | `0` | `false` | `prompt_only` | pass-with-watch |

Page-level watch item:

- page `1`: `fallback_completed` after `3` attempts

Confirmed:

- `selectedStyleId` persisted as `anime_storybook`
- `selectedStyleName` persisted as `わくわくアニメ風`
- `stylePreviewUsedAsReference=false`
- `withReference=false`
- `inputReferenceCountTotal=0`
- `usedCharacterReference=false`
- expected page count check: `PASS`

### 28.6 Health Assessment

T4-17 generation health verdict:

- targeted sync: pass
- book creation: pass
- final book status: `completed`
- pages structurally available: `8/8`
- failed pages: `0/8`
- reference path usage: none
- timeout usage: none
- fallback usage: present on page `1` only

Interpretation:

- the rerun is structurally usable for manual visual QA
- however, page `1` should be reviewed carefully because the successful output came through fallback completion rather than a clean first-pass completion

### 28.7 Decision

T4-17 decision:

- proceed to T4-18 manual visual QA for `BDKHvJt4J7Bfzwx4IZAg`
- prioritize:
  - page `1` clothing-text suppression result
  - page `1` fallback side effects
  - page `7` no-sign regression check

### 28.8 Exclusions

- No manual visual QA performed in this slice
- No image regeneration performed
- No Admin regeneration performed
- No reference-flow generation performed
- No code changes performed
- No style profile changes performed
- No runner changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 29. T4-18 Anime Storybook Manual Visual QA Rerun

Date: 2026-05-17

Scope:

- manual visual QA rerun for the T4-17 targeted anime re-smoke
- templateId: `fixed-first-zoo-8p`
- styleId: `anime_storybook`
- bookId: `BDKHvJt4J7Bfzwx4IZAg`
- mode: `prompt_only`
- reference image: not used

### 29.1 Review Focus

Reviewed:

- pages `0` through `7`
- page `1` clothing-text suppression outcome
- page `1` fallback side effects
- page `1` gate signage regression risk
- page `7` background sign regression risk
- sequence-level BF-3 continuity
- style adherence / consistency
- commercial suitability

### 29.2 Page-Level Visual Findings

Page `0`:

- anime-storybook look is strong and commercially appealing at first glance
- however, a visible watermark-like text mark appears at the lower-left corner: `© SmokeKid1`
- this is a clear BF-4 blocker
- the child presentation here also reads as a different child from the later zoo pages

Page `1`:

- the original target issue is improved: the child clothing no longer shows the previous readable alphanumeric chest print
- the earlier gate-signage problem also appears suppressed
- however, the page now introduces a strong sequence-level continuity shift
- the child reads as a different hairstyle / outfit / silhouette from page `0`
- fallback completion likely did not create obvious image corruption, but the page does appear to have taken a different character path than the opener

Pages `2` through `6`:

- BF-4 is mostly acceptable across the interior zoo beats
- style adherence remains strong and recognizably anime-storybook
- emotional tone and animal interaction beats remain commercially appealing
- continuity is more stable within pages `1` through `6` than between page `0` and page `1`

Page `7`:

- background sign regression is present
- a left-side posted sign and a central information-board-like surface both contain readable Japanese text
- this reintroduces a direct BF-4 blocker at the ending scene

### 29.3 BF-4 Assessment

Result:

- `fail`

Blockers observed:

- page `0`: visible watermark-like text `© SmokeKid1`
- page `7`: readable Japanese text on background sign / board surfaces

Improved item:

- page `1` clothing-text suppression appears effective

Regression summary:

- the page `1` shirt-text issue improved
- but the rerun is not approvable because different BF-4 failures remain elsewhere in the book

### 29.4 BF-3 Assessment

Result:

- `fail`

Primary issue:

- page `0` presents a child who reads as a different character from the child shown from page `1` onward
- this is stronger than a minor outfit drift; it looks like a child identity reset between the opener and the zoo entrance sequence

Secondary note:

- pages `1` through `7` are more internally coherent than the opener-to-main-sequence transition
- age impression remains preschool-compatible, but identity continuity across the full 8-page sequence is not acceptable

### 29.5 Style And Story Assessment

Style adherence:

- strong

Style consistency:

- acceptable for rendering language
- not acceptable for full-sequence character continuity

Emotional fit:

- pass

Story-image match:

- conditional
- individual zoo beats read well, but opener continuity reduces narrative coherence

Commercial suitability:

- `fail`

Reason:

- visible text artifacts and sequence-level character inconsistency make the book not yet release-ready

### 29.6 Decision

Per-book decision:

- `Hold`

Overall interpretation:

- T4-16 succeeded at the narrow page `1` clothing-text target
- however, the rerun still fails approval because:
  - BF-4 remains blocked by page `0` watermark-like text and page `7` readable signage
  - BF-3 regressed through a page `0` to page `1` identity discontinuity

### 29.7 Recommended Next Step

Recommended follow-up:

- plan another narrow remediation slice for `fixed-first-zoo-8p × anime_storybook`
- next slice should explicitly address:
  - page `0` watermark-like lower-corner text artifact
  - page `7` posted-sign / board text regression
  - opener-to-page-1 same-child continuity anchoring
- because page `1` was `fallback_completed`, keep special attention on whether fallback behavior is correlated with the continuity reset

### 29.8 Exclusions

- No image regeneration performed
- No Admin regeneration performed
- No Firestore write performed in this slice
- No template sync performed in this slice
- No smoke regeneration performed in this slice
- No code changes performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded

## 30. T4-19 Anime-Zoo Remediation Continuation Decision And Style Matrix Ranking Update

Date: 2026-05-17

Scope:

- docs-only decision slice
- target case under review: `fixed-first-zoo-8p × anime_storybook`
- objective:
  - decide whether to continue remediation immediately
  - or block / defer this candidate and move T4 toward matrix closure and candidate ranking

### 30.1 Anime-Zoo Remediation History

Relevant history:

- T4-10:
  - initial matrix QA found `fixed-first-zoo-8p × anime_storybook` on `Hold`
  - blockers:
    - page `1` readable Japanese gate signage
    - page `7` readable background sign
- T4-11:
  - created zoo-style BF-4 remediation plan
- T4-12:
  - implemented zoo-template-local signage / printed-surface hardening
- T4-13:
  - ran targeted sync + style re-smoke
- T4-14:
  - signage improved
  - new blocker appeared:
    - page `1` child clothing readable alphanumeric text
- T4-15:
  - created clothing-text remediation plan
- T4-16:
  - implemented zoo page `1` clothing/apparel no-text hardening
- T4-17:
  - ran targeted anime-only sync + re-smoke
  - page `1` generation finished as `fallback_completed` after `3` attempts
- T4-18:
  - page `1` clothing-text issue improved / resolved
  - but new or reintroduced blockers remained:
    - page `0` watermark-like text `© SmokeKid1`
    - page `7` readable Japanese sign / board text
    - BF-3 continuity reset between page `0` and page `1`

### 30.2 What Improved vs What Remains Blocked

Improved through remediation:

- page `1` gate signage was successfully suppressed
- page `1` clothing text was successfully suppressed
- page `7` sign issue was improved in an earlier rerun, though not stably eliminated
- style adherence remained consistently strong
- emotional fit remained passable throughout

Remaining / reintroduced blockers:

- BF-4 remains unstable
  - surface moved from gate signage to clothing text
  - then moved again to watermark-like text and end-scene signage
- BF-3 regressed in the latest rerun
  - opener child no longer matches the child from page `1` onward
- page `1` required fallback completion
  - this raises concern that the model path is not converging cleanly under current constraints

Interpretation:

- narrow fixes are improving the last observed issue
- but the failure surface keeps relocating instead of converging toward release-ready stability

### 30.3 Cost / Risk Evaluation For Further Remediation

Potential benefit of continuing immediately:

- anime-storybook is visually attractive
- style adherence is one of the strongest in the matrix
- if stabilized, it could become a premium-looking exposure candidate

Current cost / risk:

- remediation is no longer isolated to a single page or single BF-4 surface
- the latest rerun introduced cross-page BF-3 instability, which is more expensive to fix safely than a narrow no-text clause
- additional hardening may start overconstraining the zoo baseline or harming already-approved crayon / soft-watercolor paths if not kept extremely narrow
- repeated targeted reruns consume time while other T4 closure work is already sufficiently informed by existing Go / Conditional-Go candidates

Assessment:

- immediate continuation has diminishing returns for the current T4 phase
- the next likely remediation would be multi-surface:
  - page `0` watermark-like text
  - page `7` signage
  - opener-to-page-1 continuity anchor
- that scope is materially larger than the prior narrow fixes

### 30.4 Blocked / Deferred Decision

Decision:

- mark `fixed-first-zoo-8p × anime_storybook` as `Blocked / Deferred`

Why this is justified:

- the issue surface has shifted across three remediation rounds:
  - signage
  - clothing text
  - watermark / signage / continuity reset
- convergence is currently low
- commercial suitability is still not close enough to `Conditional-Go`
- T4 already has enough strong candidates to support matrix learning and ranking without forcing this case to closure now

Severity:

- medium-high for this candidate
- low for the T4 program overall, because the matrix is not blocked on this one pairing

### 30.5 Updated Matrix Ranking

Updated candidate ranking after T4-18:

| rank tier | templateId | styleId | current decision | notes |
| --- | --- | --- | --- | --- |
| A | `fixed-sleepy-moon-adventure-8p` | `crayon` | `Go` | strongest clean style/template fit in current matrix |
| A | `fixed-sleepy-moon-adventure-8p` | `anime_storybook` | `Go` | strong expressive fit with acceptable safety and continuity |
| A | `fixed-first-zoo-8p` | `crayon` | `Go` | remediation converged successfully |
| B | `fixed-sleepy-moon-adventure-8p` | `soft_watercolor` | `Conditional-Go` | minor watchpoint only |
| B | `fixed-first-zoo-8p` | `soft_watercolor` | `Conditional-Go` | commercially viable with light continuity watch |
| D | `fixed-first-zoo-8p` | `anime_storybook` | `Blocked / Deferred` | strong style fit but poor convergence under prompt-only safety constraints |

Interpretation:

- `crayon` is currently the most robust style across both baseline templates
- `anime_storybook` is template-sensitive
  - excellent on sleepy-moon
  - unstable on zoo
- `soft_watercolor` remains the safest broad default but not the most distinctive visual differentiator

### 30.6 Product Exposure Candidates

Current product exposure candidates:

- `fixed-sleepy-moon-adventure-8p × crayon`
- `fixed-sleepy-moon-adventure-8p × anime_storybook`
- `fixed-first-zoo-8p × crayon`

Secondary / cautious exposure candidates:

- `fixed-sleepy-moon-adventure-8p × soft_watercolor`
- `fixed-first-zoo-8p × soft_watercolor`

Blocked / deferred candidate:

- `fixed-first-zoo-8p × anime_storybook`

### 30.7 Program Decision

Decision for next step:

- do **not** continue immediate remediation as T4-20
- proceed with `T4-20 style validation closure / candidate ranking`

Reasoning:

- the matrix already has enough high-signal outcomes to close the first validation pass
- additional work on anime-zoo is better treated as a deferred follow-up track after closure
- closure now will preserve the learning:
  - style-template compatibility is real
  - crayon is robust
  - anime-storybook needs template-specific caution

Deferred follow-up option after closure:

- open a later subtrack specifically for `anime_storybook × zoo`
- treat it as an exploratory stabilization effort, not as a blocker for T4 initial conclusions

### 30.8 Exclusions

- No code or prompt changes performed
- No Firestore sync performed
- No smoke generation performed
- No image generation performed
- No Admin regeneration performed
- No reference-flow generation performed
- No runner changes performed
- No style profile changes performed
- No Firebase Auth changes
- No Storage token rotation/revocation
- No service account JSON, secrets, URLs, or tokens recorded
