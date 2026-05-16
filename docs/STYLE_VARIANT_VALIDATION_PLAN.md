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
