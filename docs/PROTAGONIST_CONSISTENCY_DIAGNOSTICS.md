# 主人公・キャラクター視覚一貫性 診断レポート (#554)

> 生成済み絵本の本番データを分析し、主人公および登場キャラの「ページ間で見た目が
> 変わる」失敗パターンを体系化する。読み取り専用分析。

作成: 2026-06（gpt-image-2 全面切替の前後）

## 1. 方法とデータ
- 対象: `books`（直近90日・`storyQualityReport` 保持）**261冊**。
- 出典: Firestore `books` / `books/{id}/pages` / `storyQualityReport.issues` の集計、
  admin 比較ツールでの視覚 A/B、生成ログ。

### 主要分布
| 指標 | 値 |
|---|---|
| 子の写真参照あり（visualProfile.referenceImageUrl/approvedImageUrl） | **27冊 (10%)** |
| 非主人公キャラが登場（兄弟/友達/祖父母/動物） | **69冊 (26%)** |
| characterConsistencyMode = all_pages / cover_only / 未設定 | 197 / 45 / 19 |
| `cast_missing_for_recurring_character` | **58冊 (22%)** |
| `missing_appearing_character_ids` | 4冊 |

## 2. 失敗パターン

### パターンA — 参照画像への過剰追従（reference bleed）【最重要】
写真参照ありの本（10%）で、従来モデル **flux-2-pro / flux-kontext** が参照画像の
**キャラだけでなく背景・構図・ポーズまで複製**してしまう。結果、本文プロンプトで
指定した別シーンが描かれず、毎ページ似た構図になる／意図した情景にならない。
- 確認: admin 比較ツールで同一参照画像＋別シーン3回を flux-2-pro と gpt-image-2 で
  比較。flux は背景まで引っ張られ、gpt-image-2 は脱却（運用者判定）。

### パターンB — 非主人公キャラに参照が無く毎ページ変わる
`cast_missing_for_recurring_character` が **22%（58冊）**。兄弟・友達・祖父母などの
人間キャラは、従来 recurring reference 画像の自動生成が **animal/magical/object のみ**
対象で、人間が除外されていた。参照が無いため visual bible（テキスト）だけが頼りで、
ページ間でドリフトする。

### パターンC — visual-bible 依存（写真参照なしが90%）
本の **90%** は写真参照を持たず、キャラ一貫性は完全に「テキストの visual bible に
モデルがどれだけ忠実か」に依存する。従来 flux 系は指示追従が相対的に弱く、髪型・服・
顔の細部がページ間でばらつく。

## 3. 根本原因
1. **flux-2-pro/kontext の reference bleed**（参照の背景・構図まで複製）。
2. **指示追従の弱さ**（visual bible の細部がページ間で保たれにくい）。
3. **非主人公の人間キャラが reference 生成対象外**（兄弟/友達/祖父母）。

## 4. 対応（本セッションで実装・本番反映済み）
| 施策 | 内容 | PR |
|---|---|---|
| **gpt-image-2 全面切替** | reference bleed を脱却し、指示追従が強い。参照は同一性維持のみに使い、新シーンを正しく描く。参照画像は Images edit API で本モデルに直接渡す | #604/#609/#614/#615/#616/#617 |
| **recurring reference を全キャラ種別へ** | human_child/human_adult（兄弟・友達・親・祖父母）も参照画像を自動生成 | #571 |
| **テンプレ別キャラ anchor 句** | new_baby/thank_you_grandparent/farewell 等にキャラ一貫の anchor を追加 | #603 |

→ パターンA は gpt-image-2、パターンB は #571＋#603、パターンC は gpt-image-2 の
指示追従強化で、それぞれ根本対応済み。

## 5. 効果測定（before/after）
- ツール: `scripts/quality-report.js --compare 2026-06-23`（gpt-image-2 切替日で前後分割）。
- 指標: `cast_missing_for_recurring_character` の出現率、ページ間一貫性の目視。
- 切替後の新規生成が一定数たまった時点で再測定する（本レポートを更新）。

## 6. 結論・残課題
- 主要な3失敗パターンの根本原因は本セッションで対応済み。**#554 の診断目的は達成**。
- 残: ①切替後データでの定量再測定 ②写真参照あり本での多ページ一貫性の継続監視
  ③#542 identity-only 参照戦略は gpt-image-2 が reference bleed を解消したため**優先度低下**
  （flux 前提の workaround のため、本番が gpt-image-2 主体になった現状では再評価が必要）。
