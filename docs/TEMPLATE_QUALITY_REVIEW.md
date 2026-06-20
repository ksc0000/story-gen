# Fixed Template Quality Review (T3-2 起点)

作成日: 2026-06-20
対象: `functions/src/seed-templates.ts` 上の `fixed_template` 10本
目的: T3-2「既存10本の品質磨き込み」の実施完了報告
ステータス: **Complete**

---

## 1. Summary

- 10本すべて `creationMode: fixed_template` / 4ページ構成 / `withFixedImagePromptSafety` 適用済み
- Phase 3 (T3-2) における品質磨き込みはすべて完了。
- 文章は `textTemplatesByAge` 5バケット（baby_toddler / preschool_3_4 / early_reader_5_6 / early_elementary_7_8 / general_child）で揃っており、年齢別の自然さは担保されている。
- 画像 prompt は scene anchor / reference image isolation / no-text constraints が網羅されており、看板・文字混入（IMG-001）は `MITIGATED` 水準に達している。
- 以下の主要な論点はすべて解消済み:
	1. `fixed-brush-teeth` の `pageVisualRole` 命名の整合性。
	2. UI 上の `sampleImageUrl` 重複・ミスマッチの解消。
	3. `parentMessage` 依存ページの空入力フォールバック（MSG-001）の実装と、年齢別テンプレートでの `{parentMessage}` 保持。
	4. `early_elementary_7_8` 系の文量調整による読み聞かせテンポの改善。
	5. 語彙・表現の重複緩和。

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

| templateId | category | user-facing value | story quality | image prompt quality | recommended action | priority | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fixed-first-zoo` | memories | はじめてのお出かけ思い出を素早く形に | 起承転結が明快、年齢別文が自然 | scene anchor 強、ref isolation OK | 7-8歳向け短文化・sampleImage最適化済み | P2 | Done |
| `fixed-first-birthday` | memories | はじめての誕生日の記念 | 文・流れともに自然 | 室内ろうそく光・家族距離感が明確 | 語彙の散らし実装済み、sampleImage調整済み | Done | Done |
| `fixed-bedtime-good-day` | bedtime | 1日の振り返り + 安心して眠る | 流れ良好、closing が `parentMessage` で自然 | 光源設計が一貫 | 7-8歳向け短文化・自然化済み | P2 | Done |
| `fixed-brush-teeth` | growth-support | はみがき習慣を応援 | テンポの良い4ページ、達成感の payoff が明確 | bathroom scene anchor 明瞭 | `pageVisualRole` 整合済み | Done | Done |
| `fixed-first-christmas` | seasonal-events | はじめてのクリスマスの記念 | 安心感のある4ページ | 室内クリスマスのscene anchor明瞭 | No action（観察継続） | No action | Done |
| `fixed-sharing-friends` | emotional-growth | わけっこ→自己肯定 | `lessonToTeach` 受け取りが自然 | playroom anchor 明瞭 | opening narration 物語トーンへ調整済み | P2 | Done |
| `fixed-sleepy-moon-adventure` | bedtime | 月あかりで安心の眠り | 想像→安心→quiet ending の流れ良好 | dream symbol overlay 表現 | 語り自然化済み、sampleImage調整済み | Done | Done |
| `fixed-cardboard-rocket` | imagination | ごっこ遊び応援 | discovery→emotional の流れが自然 | playroom anchor が常時可視 | No action（観察継続） | No action | Done |
| `fixed-rainy-day-puddle` | daily-life | 雨の日の前向きな発見 | 4ページの心情変化が自然 | "no road hazard" 明示 | page 4 年齢別文での `parentMessage` 保持済み | Done | Done |
| `fixed-little-helper` | growth-support | 小さなお手伝いで自己効力感 | 4ページの達成感が自然 | "no hazardous tools" 明示 | page 4 年齢別文での `parentMessage` 保持済み | Done | Done |

---

## 4. Issues Found & Resolved

### 4.1 Visual role naming inconsistency （**resolved 2026-06-10**）

- 対応: `fixed-brush-teeth` の `pageVisualRole` を canonical sequence に揃えた後、テーマに合わせて `action` / `payoff` を再適用し、一貫性を高めるためのガードレールを適用。

### 4.2 Sample image duplication / mismatch （**resolved 2026-05-12**）

- 対応: `fixed-first-birthday` / `fixed-sleepy-moon-adventure` / `fixed-little-helper` は既存アセットで再アサインし、UI上での識別性を向上させた。

### 4.3 Bedtime カテゴリ2本の役割重複 （**resolved**）

- 判断: category grouping + description での差別化文追記により解消。

### 4.4 `parentMessage` 依存 quiet_ending （**resolved 2026-05-12**）

- 対応: `fixed-rainy-day-puddle` および `fixed-little-helper` の年齢別テンプレートに `{parentMessage}` を追加し、ユーザー入力が全年齢帯で反映されるように修正。

### 4.5 7-8歳向け文長の微調整 （**resolved 2026-05-13**）

- 対応: `fixed-first-zoo` / `fixed-bedtime-good-day` / `fixed-sleepy-moon-adventure` の 7-8歳向け文を短文化し、読み聞かせのリズムを改善。

### 4.6 語彙・表現の重複緩和 （**resolved 2026-05-13**）

- 対応: `fixed-first-birthday` の opening / P3 などを修正し、全体的な語彙の散らしを実施。

---

## 5. Priority Ranking (Closing State)

| Priority | 状態 | 内容 |
| --- | --- | --- |
| P1 | **Resolved** | `fixed-brush-teeth` role / sampleImage 重複 / `parentMessage` 整合性 / opening tone |
| P2 | **Resolved** | 7-8歳向け短文化 / 語彙分散 / bedtime 役割記述 |
| P3 (Deferred) | Monitoring | 「〜をみつけました」等の細かい表現の散らし（T3-3以降で継続観察） |

---

## 6. Implemented T3-2 Actions

T3-2 で実施された全ての改善アクション:

1. **T3-2a: `fixed-brush-teeth` の `pageVisualRole` 整合と強化** (Implemented)
2. **T3-2b: Sample image 再アサイン** (Implemented)
3. **T3-2c: docs 仕様の明文化とデフォルト文言の整理** (Implemented)
4. **T3-2d: 7-8歳向け文の短文化と語彙分散** (Implemented)

---

## 7. Conclusion

T3-2「既存10本の品質磨き込み」は計画通り完了した。本ドキュメントをもって Phase 3 における初期10テンプレートの棚卸しと改善を締めくくる。今後は 8/12 ページバリアント（T3-3）およびスタイルバリアント（T4）の拡張フェーズにおいて、本工程で確立された品質基準を維持・適用していく。

---
## 8. Appendix: Sync & Smoke History

- 2026-05-12: P1 parentMessage 整合性修正、Firestore 同期完了
- 2026-05-13: P1 opening tone 修正、P2 短文化・語彙分散修正完了
- 2026-05-15: 8ページ版 `fixed-first-birthday-8p` 等の検証開始
- 2026-05-16: `fixed-sleepy-moon-adventure-8p` 品質強化完了
