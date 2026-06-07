# Quality Metrics

Phase 2: Story & Illustration Quality の評価仕様。

この文書は、実装前の仕様書として Story Quality / Illustration Quality / Character Consistency / Personalization / Safety を定義する。まずは human review で使い、将来は LLM auto review と admin quality analytics の土台にする。

Related:

- [Product Roadmap](./PRODUCT_ROADMAP.md)
- [Production Smoke Checklist](./PRODUCTION_SMOKE_CHECKLIST.md)

---

## Overview

Phase 2 の目的は、生成された絵本を「読める」から「売り物として満足できる」品質へ引き上げること。

| Score | Max | 主な用途 |
|---|---:|---|
| Story Quality Score | 100 | 物語構成・文量・読後感・年齢適合 |
| Illustration Quality Score | 100 | prompt品質・絵の一貫性・シーン適合 |
| Character Consistency Score | 100 | 主人公・相棒・登場人物の一貫性 |
| Personalization Score | 100 | 子ども情報・思い出・好みの反映度 |
| Safety Score | 100 | 年齢適合・安心感・NG表現回避 |

---

## Quality Score Principles

| Principle | 内容 |
|---|---|
| Human-first | 最初は admin / reviewer が目視で評価できる rubric にする。 |
| LLM-ready | 将来の LLM auto review が同じ軸で JSON 出力できるようにする。 |
| Axis-level | overall score だけでなく、どの軸が弱いかを保存する。 |
| Actionable | 低スコア時に rewrite / prompt repair / regeneration に接続する。 |
| Plan-aware | free / paid / premium で要求品質を分ける。 |
| Safety-first | safety / privacy issue は score と別に blocker 扱いできるようにする。 |

---

## Story Quality Score

Story Quality Score は 100 点満点。Book 単位で評価する。

| Axis | Points | 評価内容 |
|---|---:|---|
| child personalization | 20 | 子ども本人らしさが物語に自然に入っているか |
| story coherence | 20 | 起承転結・因果・ページ間接続が自然か |
| age appropriateness | 15 | 対象年齢に合った語彙・文章量・理解難度か |
| emotional satisfaction | 15 | 読後感・達成感・安心感・親子で読む満足感があるか |
| page length balance | 10 | ページごとの文量・テンポが適切か |
| character consistency | 10 | 主人公・相棒・登場人物の役割が一貫しているか |
| ending satisfaction | 10 | 終わり方が唐突でなく、物語として締まっているか |
| **Total** | **100** |  |

### Story rubric

| Axis | High | Medium | Low |
|---|---|---|---|
| child personalization | 名前・好きなもの・性格・思い出が自然に物語へ効いている | 名前や好みは出るが、物語上の意味は弱い | ほぼ generic。名前を差し替えても成立する |
| story coherence | 各ページが自然につながり、目的・行動・結果が明確 | 大筋は分かるが、場面転換や因果がやや弱い | 話が飛ぶ。なぜそうなったか分かりにくい |
| age appropriateness | 語彙・文章量・感情表現が対象年齢に合う | 一部だけ幼すぎる/難しすぎる | 年齢に合わず読み聞かせに向かない |
| emotional satisfaction | ワクワク・安心・達成感があり、もう一度読みたくなる | 悪くないが印象が薄い | 無機質、盛り上がり不足、読後感が弱い |
| page length balance | 各ページの文量が自然でテンポが良い | 1〜2ページに偏りがある | 長すぎる/短すぎるページが目立つ |
| character consistency | キャラの性格・役割・呼び方が安定している | 軽微な揺れがある | 主人公や相棒が別人のように振る舞う |
| ending satisfaction | 物語として自然に締まり、安心感がある | 終わりは分かるが余韻が弱い | 唐突に終わる。未完に感じる |

---

## Illustration Quality Score

Illustration Quality Score は 100 点満点。Book 単位で評価し、必要に応じて page 単位の補助スコアを持つ。

| Axis | Points | 評価内容 |
|---|---:|---|
| prompt completeness | 20 | prompt がキャラ・場面・構図・感情・style を十分に指定しているか |
| visual consistency | 20 | ページ間で絵柄・色味・世界観が揃っているか |
| character consistency | 20 | 同じ子ども/相棒が同じ存在として見えるか |
| scene relevance | 15 | 本文内容・ページ役割と絵が合っているか |
| style consistency | 15 | styleBible / target style に沿っているか |
| artifact avoidance | 10 | 破綻・不要文字・手足崩れ・不自然な物体を避けているか |
| **Total** | **100** |  |

### Illustration rubric

| Axis | High | Medium | Low |
|---|---|---|---|
| prompt completeness | 主要キャラ、場面、構図、表情、style、NGが明確 | 必要情報はあるが構図や感情が弱い | generic prompt で生成結果がぶれやすい |
| visual consistency | 全ページが同じ絵本世界に見える | 一部で色味や質感が揺れる | ページごとに別作品に見える |
| character consistency | 顔・髪型・服・雰囲気が安定 | 軽微な揺れはあるが同一人物に見える | 同じ子どもがページごとに別人になる |
| scene relevance | 本文の場面・感情・行動と一致 | 雰囲気は合うが細部が違う | 本文と絵が噛み合わない |
| style consistency | styleBible に沿って安定 | 一部 style drift がある | style が大きく崩れる |
| artifact avoidance | 破綻や不要文字が目立たない | 軽微な artifact がある | 手足・顔・文字・物体破綻が目立つ |

---

## Character Consistency Score

Character Consistency Score は、Book 全体で主人公・相棒・登場人物が一貫しているかを評価する。

| 観点 | 確認内容 |
|---|---|
| recurring character visual bible | 主人公・相棒の visual bible が prompt / reference に反映されているか |
| `characterId` | 各キャラクターを安定した ID で追跡できるか |
| `appearingCharacterIds` | page ごとの登場キャラが story / prompt / image と一致しているか |
| `focusCharacterId` | page の主役が明確か |
| page-level character linkage | page text、prompt、image metadata が同じキャラを参照しているか |
| outfit / hairstyle consistency | 服装・髪型・特徴色がページ間で破綻していないか |
| color palette consistency | 主人公・相棒の key color が保たれているか |

NG例:

- 同じ子どもがページごとに別人になる
- 主人公が2人に増える
- 相棒キャラの種族や色が変わる
- `appearingCharacterIds` にいないキャラが主役化する
- `focusCharacterId` と画像の中心人物が一致しない

---

## Personalization Score

Personalization Score は、child profile / family context / memory context が自然に反映されているかを評価する。

| 観点 | High | Low |
|---|---|---|
| child profile usage | 性格・年齢・好きな遊びが行動に反映される | 名前以外ほぼ使われない |
| name / nickname usage | 呼び方が自然で過剰でない | 毎文のように名前が出て不自然 |
| favorite things | 好きなものが story goal や発見につながる | 単語だけ挿入される |
| family context | 家族や読み聞かせ文脈に合う | 家庭向けとして違和感がある |
| memory / event context | 思い出絵本として具体性がある | 事実の羅列または generic |
| over-personalization risk | 個人情報を出しすぎない | 住所・園名などが不用意に出る |

注意:

- personalization は多ければ良いわけではない。
- 子どもの情報は story に効く必要がある。
- privacy / safety に触れる情報は出力しすぎない。

---

## Safety / Age Appropriateness

Safety / Age Appropriateness は、家庭向け絵本として安心して読めるかを評価する。

| 観点 | 確認内容 |
|---|---|
| 対象年齢に合った語彙 | 難しすぎる言葉、抽象的すぎる表現を避ける |
| 怖すぎない表現 | 暗すぎる、脅かす、強い不安を残す描写を避ける |
| 危険行動の回避 | 子どもが真似しやすい危険行動を肯定しない |
| 家庭向けの安心感 | bedtime / parent-child reading に合う穏やかさがある |
| 個人情報配慮 | child profile を過度に露出しない |

NG内容の例:

- 子どもだけで危険な場所へ行くことを肯定する
- 暴力・自傷・脅迫・過度な恐怖
- 年齢に不適切な恋愛・性的・政治的表現
- 実在住所、園名、学校名などの不要な露出
- 子どもが真似しやすい危険行動を「楽しい冒険」として描く

---

## 生成モード別 品質目標

絵本の生成モードごとに期待される品質目標と特性。

| モード | Story Quality 目標 | Illustration 目標 | 主な強み | 主な弱点・注意点 |
|---|---:|---:|---|---|
| `fixed_template` | 90+ | 95+ | 高い構成美、安定した画風、検証済み構成 | 自由度の低さ、他ユーザーとの重複感 |
| `guided_ai` | 85+ | 80+ | 適度な自由度と構成の安定感、誘導の容易さ | 誘導の質に依存、AI特有の構成の癖 |
| `original_ai` | 75+ | 75+ | 高い独創性、完全オリジナルの物語 | 構成の破綻リスク、指示への忠実度低下 |
| `memory` | 80+ | 80+ | 事実に基づく強い感動、高いパーソナライズ | 事実の羅列になりがち、プライバシー配慮 |

### モード別品質チェックポイント

- **fixed_template**: 固定の型に基づき、一部の要素のみを差し替えるモード。
  - 差し替えた要素（名前や場所）が文脈に自然に馴染んでいるか。
  - イラストにおいて、固定背景と動的要素（キャラクター等）の合成に違和感がないか。
- **guided_ai**: 選択肢やキーワードを選んでAIと共創するモード。
  - ユーザーが選択した要素がストーリーの重要な転換点や解決策として機能しているか。
  - 選択したテーマに沿った一貫したトーンが全ページで保たれているか。
- **original_ai**: 自由なテキスト入力から完全に新しい物語を生成するモード。
  - 起承転結の論理的構成が破綻しておらず、物語として成立しているか。
  - ページ間での設定の矛盾（さっきまで昼だったのに急に夜になる等）がないか。
- **memory**: 写真や具体的なエピソードから「思い出」を絵本にするモード。
  - 提供された事実（場所・人物・出来事）が不自然に歪曲されていないか。
  - 単なる事実の羅列に留まらず、その時の感情や絆が物語として昇華されているか。

---

## カテゴリ別 品質観点

カテゴリ（categoryGroup）ごとの特性に応じた品質評価の重点。

| カテゴリ | 品質評価の重点 |
|---|---|
| **memories** (思い出) | 事実の正確な反映、家族の絆・感情的共鳴の深さ |
| **growth-support** (成長) | 小さな一歩への称賛、達成感、前向きな励ましのトーン |
| **emotional-growth** (こころ) | 登場人物への共感、感情を言語化する語彙の適切さ |
| **bedtime** (眠前) | 解決感・安心感、入眠を妨げない穏やかなリズム |
| **favorite-worlds** (好き) | 子どものこだわりへの合致度、没入感、ワクワク感 |
| **imagination** (想像) | 創造性・驚き、常識に囚われない自由な発想の豊かさ |
| **learning** (学び) | 知的好奇心の刺激、概念の自然な導入、楽しさとの両立 |
| **seasonal-events** (季節) | 季節の空気感、行事の具体的描写、時事的な適切さ |

### カテゴリ別代表例

- **memories**:
  - High: 具体的なエピソードが感動的に描かれ、本人にしか作れない物語になっている。
  - Medium: 事実は反映されているが、物語としての盛り上がりや感動が薄い。
  - Low: 事実誤認がある、または単なる日記の羅列で絵本としての体をなしていない。
- **growth-support**:
  - High: 挑戦と成功が丁寧に描写され、読むたびに子どもの自信に繋がる。
  - Medium: メッセージは良いが、描写が抽象的で具体性に欠ける。
  - Low: 説教臭いトーンが強い、または成長のプロセスが省略されすぎている。
- **emotional-growth**:
  - High: 複雑な感情を子どもが理解できる言葉で表現し、深い気づきを与えている。
  - Medium: 感情の描写が紋切り型で、深層心理に触れるような厚みがない。
  - Low: 感情の動きが唐突すぎる、または年齢に不適切な難しい言葉が使われている。
- **bedtime**:
  - High: 穏やかな文体と温かい絵で、安心して眠りにつける完璧な導入。
  - Medium: 物語は完結しているが、興奮させる要素が残り、寝かしつけには不向き。
  - Low: 結末が不安を残す、または刺激の強い色使いや描写が含まれる。
- **favorite-worlds**:
  - High: 子どもの「大好き」が全編に溢れ、自分のための物語である実感が強い。
  - Medium: 好きな要素は出ているが、ストーリー展開との必然性が低い。
  - Low: 好みの設定が表面的な差し替えのみで、ファンの期待を裏切る内容。
- **imagination**:
  - High: 予測不能な展開で想像力を極限まで刺激し、新たな発見がある。
  - Medium: 一般的なファンタジーの枠内に収まっており、驚きが少ない。
  - Low: 設定に一貫性がなく混乱を招く、または独創性が全く感じられない。
- **learning**:
  - High: 遊びと学びが高度に融合し、自発的な「なぜ？」を引き出している。
  - Medium: 学習要素が説明的すぎて、物語としての楽しさが損なわれている。
  - Low: 内容に誤りがある、または子どもには難解すぎて興味を失わせる。
- **seasonal-events**:
  - High: 季節の移ろいや行事の背景が、五感を刺激する描写で美しく描かれている。
  - Medium: 季節感はあるが、ステレオタイプな描写に留まり新鮮味がない。
  - Low: 季節外れの要素が混入している、または行事の扱いが不自然。

---

## ページ役割別 Illustration 品質要件

ページ役割（imagePurpose）ごとの期待される視覚的品質。

### book_cover — 表紙
- **視認性と魅力**: 一目で内容が伝わり、手に取りたくなる魅力的な構図か。
- **主人公の提示**: 主人公の顔や特徴的なシルエットが明確に描かれているか。
- **デザイン余白**: タイトルや著者名を配置するための適切なネガティブスペースがあるか。
- **文字の排除**: AIが生成した無意味なアルファベットや記号が入っていないか。
- **世界観の象徴**: その絵本全体のトーンや色彩設計を代表する一枚になっているか。

### book_page (page 0/opening) — 扉・冒頭
- **世界観の導入**: 物語の舞台（場所・時間・季節）が視覚的に説明されているか。
- **期待感の醸成**: これから始まる冒険や物語へのワクワク感を与える構図か。
- **キャラの初期状態**: 冒頭時点での登場人物の感情や置かれた状況が読み取れるか。
- **ディテールの設定**: その後のページで基準となる背景の描き込みが十分か。

### book_page (story pages) — 本文
- **テキストとの整合**: そのページの文章で語られている行動や感情が正しく描かれているか。
- **連続性の維持**: 前後のページとキャラクターの容姿、服、背景が一貫しているか。
- **構図の多様性**: ページをめくる楽しさを損なわないよう、アングルや寄り・引きが変化しているか。
- **焦点の明確化**: そのページの主役（focusCharacterId）が視覚的に際立っているか。

### book_page (ending page) — 終わり
- **解決と充足**: 物語の課題が解決し、登場人物が満足している様子が描かれているか。
- **安心感の提供**: 寝かしつけや読後の語らいに繋がる、穏やかで温かい構成か。
- **象徴的な演出**: 物語を締めくくるにふさわしい、印象的な光や構図が使われているか。
- **余韻の醸成**: 「おしまい」の後に、子どもが物語の世界を振り返れるような深みがあるか。

---

## プラン別 品質ゲート

各利用プランにおいて、最低限満たすべき品質基準。

| Tier | Story Quality 最低 | Illustration 最低 | 追加条件 |
|---|---:|---:|---|
| **Free** | 60 | 60 | 致命的な構成の破綻や、著しい描画崩れ（Artifact）がないこと |
| **Paid** | 75 | 75 | ページ間の一貫性が概ね保たれ、読後感に満足感があること |
| **Premium** | 85 | 85 | 高い芸術性と深いパーソナライズを備え、商品として完成されていること |

---

## Admin Review Rubric

人間レビューでは 1〜5 点で簡易評価し、必要に応じて詳細 score に変換する。

| Score | story | illustration | personalization | safety | overall |
|---:|---|---|---|---|---|
| 5 | 商品品質として強い | 一貫性・構図・style が良い | 子ども本人らしい | 安心して読める | premium 候補 |
| 4 | 概ね良い | 軽微な揺れのみ | 自然に反映 | 問題なし | paid 品質 |
| 3 | 読めるが改善余地あり | 一部違和感 | やや浅い | 大きな問題なし | free / draft 品質 |
| 2 | 品質不足 | 崩れや不一致が目立つ | generic | 注意が必要 | 修正推奨 |
| 1 | 失敗 | 破綻 | 反映なし/不適切 | blocker | 配信不可 |

---

## Future LLM Auto Review

将来、LLM evaluator で自動評価する。

### Input data

- book metadata
- plan / quality mode
- child profile summary
- memory / event context
- story JSON
- page text
- page prompts
- `storyCast`
- `appearingCharacterIds`
- `focusCharacterId`
- styleBible
- generated image URLs or image descriptions
- existing admin feedback

### Output JSON schema draft

```ts
interface QualityAutoReviewResult {
  storyQualityScore: number;
  illustrationQualityScore: number;
  characterConsistencyScore: number;
  personalizationScore: number;
  safetyScore: number;
  overallQualityScore: number;
  confidence: number;
  reviewReason: string;
  flaggedIssues: Array<{
    severity: 'low' | 'medium' | 'high' | 'blocker';
    area: 'story' | 'illustration' | 'character' | 'personalization' | 'safety';
    message: string;
    pageNumber?: number;
  }>;
  recommendedFixes: Array<{
    action:
      | 'rewrite_story'
      | 'repair_prompt'
      | 'regenerate_page_image'
      | 'fix_character_reference'
      | 'reduce_personal_data'
      | 'human_review_required';
    reason: string;
    pageNumber?: number;
  }>;
}
```

Guidelines:

- `confidence < 0.7` は human review required。
- safety blocker は overall score に関係なく配信停止候補。
- LLM score は人間レビューを置き換えず、初期は補助 signal として使う。

---

## Firestore Field Design Draft

### `books/{bookId}`

| Field | Type | Purpose |
|---|---|---|
| `storyQualityScore` | number | Book単位の story score |
| `illustrationQualityScore` | number | Book単位の illustration score |
| `personalizationScore` | number | child profile 反映度 |
| `characterConsistencyScore` | number | story / image 両面のキャラ一貫性 |
| `safetyScore` | number | safety / age appropriateness |
| `overallQualityScore` | number | 総合品質 |
| `qualityReviewStatus` | string | `not_reviewed` / `human_reviewed` / `llm_reviewed` / `needs_fix` |
| `qualityReviewedAtMs` | number | review timestamp |
| `qualityReviewer` | string | human reviewer id or model name |
| `qualityReviewReason` | string | 評価理由 |
| `qualityFlaggedIssues` | array | blocker / issue 一覧 |
| `qualityRecommendedFixes` | array | rewrite / regenerate など |

### `books/{bookId}/pages/{pageId}`

| Field | Type | Purpose |
|---|---|---|
| `pageIllustrationQualityScore` | number | page単位の illustration score |
| `pagePromptQualityScore` | number | prompt completeness score |
| `pageCharacterConsistencyScore` | number | page単位の character consistency |
| `pageReviewIssues` | array | page-specific issues |
| `pageRecommendedFixes` | array | page-specific fixes |
| `pageReviewStatus` | string | `not_reviewed` / `needs_regeneration` / `approved` |

---

## Phase 2 Backlog

- [ ] Add quality score types.
- [ ] Add admin quality review panel.
- [ ] Add story rubric UI.
- [ ] Add illustration rubric UI.
- [ ] Save manual quality review.
- [ ] Add quality review history.
- [ ] Add LLM review prompt draft.
- [ ] Add character consistency diagnostics.
- [ ] Add page prompt completeness checker.
- [ ] Add premium story quality gate.
- [ ] Add personalization depth checker.
- [ ] Add safety / age appropriateness checker.
- [ ] Add page-level review issue storage.
- [ ] Add recommended fixes display in admin UI.
- [ ] Add quality trend dashboard by plan.

---

## Acceptance Criteria

Phase 2 quality foundation is ready when:

- [ ] Story Quality Score rubric is documented.
- [ ] Illustration Quality Score rubric is documented.
- [ ] Character Consistency Score is documented.
- [ ] Personalization Score is documented.
- [ ] Safety / Age Appropriateness rules are documented.
- [ ] Admin Review Rubric is usable by a human reviewer.
- [ ] Future LLM Auto Review schema draft exists.
- [ ] Firestore field draft exists for Book and Page.
- [ ] Phase 2 backlog has at least 10 actionable tasks.
- [ ] Product Roadmap links to this document as the first Phase 2 task.
