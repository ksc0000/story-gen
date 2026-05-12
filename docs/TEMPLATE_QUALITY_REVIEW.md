# Fixed Template Quality Review (T3-2 起点)

作成日: 2026-05-12
対象: `functions/src/seed-templates.ts` 上の `fixed_template` 10本
目的: T3-2「既存10本の品質磨き込み」の改善優先順位を決めるための棚卸し
方針: 本ドキュメントは棚卸しのみ。原則コード変更は伴わない。

---

## 1. Summary

- 10本すべて `creationMode: fixed_template` / 4ページ構成 / `withFixedImagePromptSafety` 適用済み
- 文章は `textTemplatesByAge` 5バケット（baby_toddler / preschool_3_4 / early_reader_5_6 / early_elementary_7_8 / general_child）で揃っており、年齢別の自然さは概ね担保されている
- 画像 prompt は scene anchor / reference image isolation / no-text constraints が網羅されており、IMG-001 由来の sign-like artifact は `MITIGATED_WITH_MINOR_FOLLOW_UP` 水準
- **主な棚卸し論点**は以下に集約される:
	1. `fixed-brush-teeth` の `pageVisualRole` 命名が他9本と非対称（`action` / `payoff` を使用）
	2. UI 上の `sampleImageUrl` 重複・ミスマッチ（bedtime / growth-support / first-birthday / rainy-day）
	3. `bedtime` カテゴリ2本（`fixed-bedtime-good-day` / `fixed-sleepy-moon-adventure`）の役割分担文書化
	4. `parentMessage` 依存ページの空入力フォールバック（MSG-001 で日本語デフォルトは入った前提）
	5. `early_elementary_7_8` 系の文がやや長く、読み聞かせのテンポ観点で P2 磨き込み余地

---

## 2. Review Criteria

| # | 観点 | 内容 |
| --- | --- | --- |
| 1 | Category fit | UI grouping と `categoryGroupId` が一致し、カテゴリ内で役割が被らないか |
| 2 | Story structure | page 1〜4 の起承転結（establishing → discovery → closeup → ending）が成立し、最終ページが自然に締まるか |
| 3 | Text quality | `textTemplatesByAge` が自然か、文量が読み聞かせに適切か、親が読んで違和感がないか |
| 4 | Image prompt quality | scene anchor が明確か、reference isolation / no-text constraints が維持され、文字誘発語が無いか |
| 5 | Visual role consistency | `pageVisualRole` のシーケンスが他テンプレートと整合しているか |
| 6 | Smoke readiness | smoke 実行可能性、image_failed 既知問題、manual review 要否 |
| 7 | Product value | ユーザーが選びたくなるテーマか、10本中で役割が被りすぎていないか |

---

## 3. 10 Templates Review Table

| templateId | category | user-facing value | story quality | image prompt quality | risk | recommended action | priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-first-zoo` | memories | はじめてのお出かけ思い出を素早く形に | 起承転結が明快、年齢別文が自然 | scene anchor 強（"NOT a sandbox..." 明示）、ref isolation OK | sampleImage が `animals.png` 流用で zoo 感はやや薄い | sampleImage の最適化は T3-2 内で検討（差し替え案出し） | P2 |
| `fixed-first-birthday` | memories | はじめての誕生日の記念 | 文・流れともに自然 | 室内ろうそく光・家族距離感が明確、ref isolation OK | ~~`sampleImageUrl: seasonal.png` がカテゴリ memories と不一致~~ → `food.png` に調整済み | — | Done |
| `fixed-bedtime-good-day` | bedtime | 1日の振り返り + 安心して眠る | 4ページの流れが寝かしつけ用途に最適、closing が `parentMessage` で自然 | 寝室の establishing 〜 quiet_ending まで光源設計が一貫 | bedtime 2本との役割重複の説明が docs にないと UI で見分け辛い | T3-1 で表示済みのカテゴリ説明文 + テンプレ description の差別化を文章で強化 | P2 |
| `fixed-brush-teeth` | growth-support | はみがき習慣を怒らず応援 | テンポの良い4ページ、達成感の payoff が明確 | bathroom scene anchor 明瞭、safety suffix 入り | ~~`pageVisualRole` が `action` / `payoff` で他9本（discovery / emotional_closeup）と非対称~~ → **resolved (2026-05-12)** | — | Done |
| `fixed-first-christmas` | seasonal-events | はじめてのクリスマスの記念 | 4ページとも家族/光/装飾の安心感あり | sampleImage が `seasonal.png` で整合、室内クリスマスのscene anchor明瞭 | 取り立てた懸念なし | No action（観察継続） | No action |
| `fixed-sharing-friends` | emotional-growth | わけっこ→自己肯定 | `lessonToTeach` 受け取りが自然、感情曲線が明確 | playroom anchor 明瞭、表情指示が child-safe | `requiredInputs` に `lessonToTeach` があり、入力UI/プリセット文の整備が必要 | `lessonToTeach` のサジェスト/プリセットを UI 側で整備（T3-4 とも連動） | P2 |
| `fixed-sleepy-moon-adventure` | bedtime | 月あかりで安心の眠り | 想像→安心→quiet ending の流れ良好 | dream symbol を overlay 表現に限定、安全配慮あり | ~~`fixed-bedtime-good-day` と sampleImage が同一 (`bedtime.png`) で UI 上の差別化が弱い~~ → `fantasy.png` に調整済み | — | Done |
| `fixed-cardboard-rocket` | imagination | ごっこ遊び応援 | discovery→emotional の流れが自然、安全に寄せた pretend play | playroom anchor が常時可視で安全感あり | sampleImage が `adventure.png` 流用（許容範囲） | No action（観察継続） | No action |
| `fixed-rainy-day-puddle` | daily-life | 雨の日の前向きな発見 | 4ページの心情変化が自然 | "no road hazard context" まで明示、scene anchor強 | `sampleImageUrl: seasonal.png` は daily-life 専用ではないが、既存アセット内では許容範囲 | **Keep as-is**（より適切な既存画像なし） | Done |
| `fixed-little-helper` | growth-support | 小さなお手伝いで自己効力感 | 4ページの達成感が自然、`parentMessage` 締めが効く | "no hazardous tools" 明示、安全配慮あり | ~~sampleImage が `daily-habits.png` で `fixed-brush-teeth` と重複~~ → `emotional-growth.png` に調整済み | — | Done |

---

## 4. Issues Found

### 4.1 Visual role naming inconsistency （優先度 P1 → **resolved 2026-05-12**）

- 9本: `opening_establishing` → `discovery` → `emotional_closeup` → `quiet_ending`
- ~~`fixed-brush-teeth` のみ: `opening_establishing` → `action` → `payoff` → `quiet_ending`~~
- 対応: `fixed-brush-teeth` の page 2 / page 3 を canonical sequence (`discovery` / `emotional_closeup`) に揃えた
- 検証: `functions/test/seed-templates.test.ts` の `EXPECTED_PAGE_ROLES` も同じく揃えるよう更新、vitest 256 tests pass

### 4.2 Sample image duplication / mismatch （優先度 P1〜P2、**partially resolved 2026-05-12**）

| 重複 / ミスマッチ | テンプレ | 現状 sampleImageUrl |
| --- | --- | --- |
| ~~重複（bedtime内）~~ resolved | `fixed-bedtime-good-day` / `fixed-sleepy-moon-adventure` | `bedtime.png` / `fantasy.png` |
| ~~重複（growth-support内）~~ resolved | `fixed-brush-teeth` / `fixed-little-helper` | `daily-habits.png` / `emotional-growth.png` |
| ~~カテゴリ不一致~~ resolved | `fixed-first-birthday` | `/images/templates/food.png` |
| review result: keep as-is | `fixed-rainy-day-puddle` | `/images/templates/seasonal.png` |

- 影響: T3-1 で UI 上に sample が出る前提では、カードの視覚的識別性が弱い
- 対応（P1-2）: `fixed-first-birthday` / `fixed-sleepy-moon-adventure` / `fixed-little-helper` は既存アセットで再アサイン済み
- 同期（P1-2）: functions build 後に `template:sync:check -> template:sync:write -> template:sync:check` を実施し、`target templates count = 10` / drift なしを確認
- Firestore 値確認:
	- `fixed-first-birthday` => `/images/templates/food.png`
	- `fixed-sleepy-moon-adventure` => `/images/templates/fantasy.png`
	- `fixed-little-helper` => `/images/templates/emotional-growth.png`
- UI 実装確認: theme card は `template.sampleImageUrl` を画像 src として使用
- 再評価結果（P2）: `fixed-rainy-day-puddle` は **keep as-is**。理由は、既存アセットの中で `daily-habits.png` は歯みがき専用色が強く、`adventure.png` は冒険テーマへの誤読を招きやすく、`emotional-growth.png` は情緒/友情テーマへ寄りすぎるため。`seasonal.png` は厳密一致ではないが、屋外・天候・季節変化の連想を最も維持でき、副作用が最小。

### 4.3 Bedtime カテゴリ2本の役割重複 （優先度 P2）

- `fixed-bedtime-good-day`: その日を振り返って安心して眠る
- `fixed-sleepy-moon-adventure`: 月あかりの安心 + 軽いごっこ要素
- 影響: UI上の選択でユーザーが迷いやすい
- 判断: T3-1 の category grouping + description で差別化文を追記する程度で十分（T3-2の最小磨き込み）

### 4.4 `parentMessage` 依存 quiet_ending （優先度 P2）

- 多くのテンプレが最終ページ本文を `{parentMessage}` で締める
- MSG-001 で日本語デフォルト `きょうもすてきな一日だったね` を導入済み
- 影響: 個別ユーザー入力が空かつ smoke 以外の通常生成でフォールバックが効く前提が docs に明示されていない
- 判断: docs 側で「`parentMessage` 空時のデフォルト文言」を最終ページ仕様として明記

### 4.5 `early_elementary_7_8` の文長 （優先度 P2）

- 7〜8歳向け文が読み聞かせとしてやや長い箇所が散見
- 影響: 親が読み上げるリズムが乱れる
- 判断: T3-2 で代表テンプレ（`fixed-first-zoo` / `fixed-sharing-friends`）から短文化を試行

### 4.6 IMG-001 follow-up （優先度 P2、継続観察）

- 稀な sign-like artifact は `MITIGATED_WITH_MINOR_FOLLOW_UP`
- 画像 prompt 側の safety suffix で十分緩和されている
- 判断: T3-2 で新規対策は入れず、観測のみ継続

---

## 5. Priority Ranking

| Priority | 件数 | 内容 |
| --- | --- | --- |
| P0 (すぐ修正) | 0 | なし |
| **P1 (T3-2 で修正)** | **3 (項目)** | ~~4.1 brush-teeth の visual role 整合性~~ **(resolved 2026-05-12)** / ~~4.2 fixed-first-birthday の sampleImage~~ **(resolved 2026-05-12)** / ~~4.2 fixed-sleepy-moon-adventure の sampleImage 差別化~~ **(resolved 2026-05-12)** / ~~4.2 fixed-little-helper の sampleImage 差別化~~ **(resolved 2026-05-12)** |
| P2 (後続で改善) | 4 | 4.3 bedtime 役割記述 / 4.4 parentMessage 仕様明記 / 4.5 7-8歳向け短文化 / 4.6 IMG-001 観測継続 |
| No action | 2 | `fixed-first-christmas` / `fixed-cardboard-rocket` |

> 注: 4.2 は1項目だが、対象テンプレが複数なので影響は3〜4本に広がる。

---

## 6. Recommended T3-2 Actions

T3-2 の最小スコープ案（コード変更を含む段階に移行する場合）:

1. **T3-2a: `fixed-brush-teeth` の `pageVisualRole` 整合**
	- option A: `action` → `discovery`, `payoff` → `emotional_closeup` に揃える
	- option B: `action` / `payoff` を許容として `lib/types.ts` の `PageVisualRole` を拡張し、docs に明文化
	- 影響範囲: `functions/src/seed-templates.ts` + テスト
2. **T3-2b: Sample image 再アサイン**
	- 既存資産の中で次案を仮置き:
		- `fixed-first-birthday` → `/images/templates/emotional-growth.png` または既存ファミリー系
		- `fixed-rainy-day-puddle` → `/images/templates/daily-habits.png` よりも雨に近い既存資産があれば検討、なければ description で識別性を補強
		- `fixed-sleepy-moon-adventure` → `/images/templates/fantasy.png`（月夜寄り）
		- `fixed-little-helper` → `/images/templates/emotional-growth.png` または family 系
	- 新規アセット追加は T3-3 以降のスコープ
3. **T3-2c: docs 仕様の明文化**
	- bedtime 2本の差別化記述（description / category 説明）
	- `parentMessage` 空時のデフォルト文言を `docs/EHONAI_STORY_CREATION_CONTENT_DESIGN.md` 等に追記（本ドキュメントから参照）
4. **T3-2d: 代表テンプレで 7-8歳向け文の短文化トライアル**
	- まず `fixed-first-zoo` の `early_elementary_7_8` を1ページ短文化して読み聞かせテンポを確認
	- 効果が確認できれば他テンプレに横展開

---

## 7. Non-goals (This Review)

- 本レビューは棚卸しのみ。`seed-templates.ts` の改変は行わない。
- 新規 sampleImage アセットの追加は行わない（既存資産での差し替え提案のみ）。
- IMG-001 への追加対策は行わない（観測継続）。
- 8/12ページ拡張（T3-3）はスコープ外。
- `original_ai` / `guided_ai` テンプレートは対象外。

---

## 8. Next Step

- 本ドキュメントを T3-2 着手判断のインプットとする
- 着手時は P1 項目 (`fixed-brush-teeth` visual role / sample image 重複) から段階適用する（P1-1, P1-2 は完了）
- 各変更は smoke で `fixed_template` 個別検証 + Admin review で目視確認する

---

## 9. P1-2 Final Confirmation (2026-05-12)

- P1-2 code commit: `d24efd789bf3f76b86594be2e8d79de31b4703b8`
- P1-2 sync/docs commit: `8a9dabc053897ed91d026ce21b8619195e178558`
- Firestore 同期: functions build 後に `template:sync:check -> template:sync:write -> template:sync:check` を実施し、`target templates count = 10` / drift なし
- Firestore 実値確認:
	- `fixed-first-birthday` => `/images/templates/food.png`
	- `fixed-sleepy-moon-adventure` => `/images/templates/fantasy.png`
	- `fixed-little-helper` => `/images/templates/emotional-growth.png`
- UI 実装確認: theme card は `template.sampleImageUrl` を画像 src として使用

実機確認メモ:

- `/create/theme` の user-side UI目視確認: **verified (2026-05-12)**
- 確認結果:
	- `fixed-first-birthday`: `/images/templates/food.png` のカード画像表示 PASS
	- `fixed-sleepy-moon-adventure`: `/images/templates/fantasy.png` のカード画像表示 PASS
	- `fixed-little-helper`: `/images/templates/emotional-growth.png` のカード画像表示 PASS
	- 他 fixed_template カードの表示崩れなし
	- category grouping 維持
	- `/create/input` への遷移 OK

---

## 10. P2 fixed-rainy-day-puddle sampleImageUrl Review Result (2026-05-12)

- 対象: `fixed-rainy-day-puddle`
- 現在値: `/images/templates/seasonal.png`
- 結論: **Keep as-is**
- 判断理由:
	- 既存 `public/images/templates/` の中に、雨・水たまり・日常発見テーマへ明確により近い画像はない
	- `daily-habits.png` は歯みがきテーマが強すぎ、`adventure.png` は冒険テーマへの誤読、`emotional-growth.png` は情緒成長テーマへの誤読を招きやすい
	- `seasonal.png` は厳密な雨テーマではないが、屋外・天候・季節変化の連想を保てるため、既存候補の中では副作用が最小
	- UI上の重複は `fixed-first-christmas` とあるが、P1項目ほどの誤認リスクはなく、P2としては許容範囲
- 実施内容: **コード変更なし / docs のみ更新**

---

## 11. T3-2 Text Quality Review (2026-05-12)

レビュー観点:

- page 1〜4 の流れが自然か
- page 4 の締めがテンプレートごとに自然か
- `parentMessage` の入り方が違和感ないか
- `textTemplatesByAge` の文量が長すぎないか
- 3-4歳 / 5-6歳 / 7-8歳で難易度差が適切か
- 読み聞かせ時に親が読みやすいか
- 同じ表現が10本で繰り返されすぎていないか
- ユーザーが「この本を選びたい」と思える本文になっているか

### 11.1 Text Quality Review Table

| templateId | story flow | closing quality | age text quality | parentMessage fit | risk | recommended action | priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-first-zoo` | はじめてのおでかけの高揚感から笑顔の思い出へ自然につながる | page 4 を `parentMessage` に委ねる構成は素直で自然 | 7-8歳向けはやや長めだが理解可能 | 問題なし | 「きらきら」「やさしい」が他テンプレと少し重なる | 7-8歳向けの文長を後続で軽く圧縮 | P2 |
| `fixed-first-birthday` | 準備→ろうそく→祝福→締め が明快 | page 4 の余韻は自然 | 年齢差は十分、読みやすさも高い | 問題なし | 一部表現は定番だが許容範囲 | No action | No action |
| `fixed-bedtime-good-day` | ふりかえり→安心→入眠 の流れが強い | page 4 の `parentMessage` 締めは寝かしつけ用途に合う | 7-8歳向けはやや抽象的で長め | 問題なし | 詩的で良いが、最年長帯は少し説明的 | 7-8歳向けを少し短文化する候補 | P2 |
| `fixed-brush-teeth` | 導入→実践→達成感→締め が端的で読みやすい | page 4 は余韻として機能 | 年齢差は適切、3-4歳にも読みやすい | 問題なし | 語彙の伸びしろはあるが急ぎではない | No action | No action |
| `fixed-first-christmas` | 祝祭感から家族の余韻まで自然 | page 4 を `parentMessage` に預ける形は相性が良い | 文量・難易度とも安定 | 問題なし | 「きらきら」系表現がやや多いがテーマ適合 | No action | No action |
| `fixed-sharing-friends` | 葛藤→選択→共有→締め が自然 | 終わり方は穏やかで良い | 7-8歳向けはやや説明的、説話寄り | page 4 自体は問題なし | opening narration の「きょうのテーマは」が教材感を出す | opening narration を物語寄りにやわらげる候補 | **P1** |
| `fixed-sleepy-moon-adventure` | 月の発見→想像→安心→入眠 が安定 | page 4 は寝かしつけとして自然 | 年齢差は適切、5-8歳も無理がない | 問題なし | page 3 の安心メッセージがやや直接的 | 文調は維持しつつ、必要なら page 3 を少しだけ自然化 | P2 |
| `fixed-cardboard-rocket` | 発見→ごっこ→高揚→余韻 が明快 | page 4 の余韻も自然 | 各年齢帯で無理なく楽しい | 問題なし | 大きな課題なし | No action | No action |
| `fixed-rainy-day-puddle` | 雨の発見→外へ→反射の喜び→帰宅 が自然 | page 4 の本文はよいが、年齢別 override では `parentMessage` が乗らない | 7-8歳向けも読みやすい | **age別文で `parentMessage` が実質消える** | user入力メッセージが年齢帯によって反映されない | page 4 の age別文でも `parentMessage` を保持する設計へ修正候補 | **P1** |
| `fixed-little-helper` | 役に立ちたい→実践→感謝→次もやりたい が自然 | page 4 の締めは良いが、age別 override では `parentMessage` が乗らない | 7-8歳向けはやや説明的だが許容 | **age別文で `parentMessage` が実質消える** | user入力メッセージが年齢帯によって反映されない | page 4 の age別文でも `parentMessage` を保持する設計へ修正候補 | **P1** |

### 11.2 Findings

#### A. `parentMessage` fit の実装一貫性不足（優先度 P1）

- `fixed-rainy-day-puddle` と `fixed-little-helper` は page 4 の `textTemplate` に `parentMessage` を含む一方、`textTemplatesByAge` 側の override 文では `parentMessage` を含まない
- そのため、年齢別テキストを採用する実行経路では user の `parentMessage` が反映されない可能性がある
- これは「page 4 の締めを親の言葉で残す」という fixed_template の価値を弱める

#### B. opening narration / didactic tone（優先度 P1）

- `fixed-sharing-friends` の `openingNarrationTemplate` は「きょうの テーマは…」で始まり、絵本というより教材・課題提示のトーンに寄る
- テンプレートの価値自体は高いが、ユーザーが「選びたい本文」にするにはもう少し物語導入寄りが望ましい

#### C. 7-8歳向け文長の微調整余地（優先度 P2）

- `fixed-first-zoo` / `fixed-bedtime-good-day` / `fixed-sleepy-moon-adventure` は 7-8歳向け文がやや長めで、読み聞かせテンポが少し落ちる
- 難語ではないため緊急度は低いが、1文削るだけで改善余地がある

#### D. 表現の重複（優先度 P2）

- 10本全体で「にっこり」「きらきら」「ぽかぽか」「やさしい」が繰り返し出る
- ブランドトーンとしては許容範囲だが、代表テンプレから少しずつ語彙を散らす余地がある

### 11.3 Priority Summary

| Priority | 件数 | 内容 |
| --- | --- | --- |
| P0 | 0 | なし |
| P1 | 3 | `fixed-rainy-day-puddle` page 4 の `parentMessage` 反映一貫性 / `fixed-little-helper` page 4 の `parentMessage` 反映一貫性 / `fixed-sharing-friends` opening narration の教材感 |
| P2 | 4 | `fixed-first-zoo` の 7-8歳文長 / `fixed-bedtime-good-day` の 7-8歳文長 / `fixed-sleepy-moon-adventure` の語り自然化 / 全体の語彙重複緩和 |
| No action | 4 | `fixed-first-birthday` / `fixed-brush-teeth` / `fixed-first-christmas` / `fixed-cardboard-rocket` |

### 11.4 Recommended Next Fix Order

1. `fixed-rainy-day-puddle`: page 4 の age別文にも `parentMessage` を保持
2. `fixed-little-helper`: page 4 の age別文にも `parentMessage` を保持
3. `fixed-sharing-friends`: opening narration を教材トーンから物語導入へ調整
4. `fixed-first-zoo` または `fixed-bedtime-good-day`: 7-8歳向け文の短文化トライアル

---

## 12. P1 parentMessage consistency fix (2026-05-12)

- 対象: `fixed-rainy-day-puddle`, `fixed-little-helper`
- 修正内容:
	- page 4 `textTemplatesByAge` の全 age bucket (`baby_toddler` / `preschool_3_4` / `early_reader_5_6` / `early_elementary_7_8` / `general_child`) に `{parentMessage}` を保持
	- ageごとに短い接続句を変え、同一文の単純複製を避けながら読み聞かせしやすさを維持
- 意図:
	- smoke script / user input の `parentMessage` が最終ページで age band に依存せず反映されるようにする
	- story structure / imagePromptTemplate / sampleImageUrl / cover / title / opening は非変更
- テスト:
	- `seed-templates.test.ts` に 2テンプレートの最終ページ age templates が `{parentMessage}` を含むことを追加
	- 既存の placeholder 展開テストは維持し、展開側の回帰確認ラインは残す
