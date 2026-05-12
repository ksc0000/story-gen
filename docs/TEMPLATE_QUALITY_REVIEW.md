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
| `fixed-rainy-day-puddle` | daily-life | 雨の日の前向きな発見 | 4ページの心情変化が自然 | "no road hazard context" まで明示、scene anchor強 | `sampleImageUrl: seasonal.png` が daily-life カテゴリと不一致 | sampleImage の最適化を T3-2 内で検討 | P2 |
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
| カテゴリ不一致 | `fixed-rainy-day-puddle` | `/images/templates/seasonal.png` |

- 影響: T3-1 で UI 上に sample が出る前提では、カードの視覚的識別性が弱い
- 対応（P1-2）: `fixed-first-birthday` / `fixed-sleepy-moon-adventure` / `fixed-little-helper` は既存アセットで再アサイン済み
- 残課題（P2）: `fixed-rainy-day-puddle` のカテゴリ整合は後続で再評価

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
| P2 (後続で改善) | 5 | 4.2 fixed-rainy-day-puddle のカテゴリ整合 / 4.3 bedtime 役割記述 / 4.4 parentMessage 仕様明記 / 4.5 7-8歳向け短文化 / 4.6 IMG-001 観測継続 |
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
