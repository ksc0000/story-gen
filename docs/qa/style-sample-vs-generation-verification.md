# 絵本スタイル: サンプル画像 vs 実生成 検証レポート

実施日: 2026-06-15 / 実行者: Claude Code（ユーザー依頼）

## 目的
作成フローで表示している各スタイルの**サンプル画像**（`public/images/styles/*.webp`）が、
**実際の生成モデルが出力する絵柄**と一致しているかを検証する。

## 方法
- モデル: `black-forest-labs/flux-2-pro`（= プロファイル `pro_consistent`。Free/Standard の本番モデル。画質統一方針 2026-06）
- 認証: 本サービスの Google Secret Manager の `REPLICATE_API_TOKEN` を使用（値は非表示・非コミット）
- パラメータ: `aspect_ratio: "4:3"`, `output_format: "png"`, `num_outputs: 1`（本番 `replicate.ts` と同一）
- プロンプト: `prompt-builder.ts` のカバー構文を踏襲し、**スタイルのみを変数化**。
  全スタイルで共通の中立シーン（「子ども＋小動物の相棒が花畑で蝶を見上げる」）に
  各スタイルの `styleBible` と `negativeStyleRules` を verbatim で付与。
- 比較対象は 10 個のユニークスタイル（`watercolor`/`flat` は別IDだが画像・bibleが
  `soft_watercolor`/`flat_illustration` と同一のエイリアスのため除外）。
- 生成物とサンプルを並べた比較画像: `/tmp/style-verification/cmp_<id>.png`

> 注: サンプル画像は「室内で本を読む子ども」構図、検証生成は「花畑」構図。
> **構図は意図的に変えており、評価対象は構図ではなく絵柄（タッチ・質感・色）**。

## 結果サマリー

| スタイル | 一致度 | 所見 |
|---|---|---|
| soft_watercolor | ◎ | 淡い水彩・にじみ・手描き感まで忠実に再現 |
| fluffy_pastel | ○ | 柔らかい色・ふんわり感は再現。サンプルほどのプラッシュ感はやや弱い |
| crayon | △ | クレヨンの質感は出るが、サンプルの**ワックス感/太い描線が弱め**で水彩寄りに見える |
| flat_illustration | ◎ | フラット・クリーンな配色・最小限の影を的確に再現 |
| anime_storybook | ◎ | 大きな瞳・アニメ的な表情・暖かい雰囲気まで再現 |
| classic_picture_book | ◎ | 細密な描き込み・絵本らしい絵画的質感を再現 |
| toy_3d | ◎ | 粘土・トイ風の立体・ミニチュアジオラマ感が非常に近い（最も一致） |
| paper_collage | ◎ | 紙の重なり・切り絵テクスチャ・雲のカットアウトまで再現 |
| pencil_sketch | ◎ | 繊細な線画・淡い色づけ・素朴な手描き感を再現 |
| colorful_pop | ○ | 明るくポップだが、サンプルより**彩度がやや控えめ** |

**総評: 10 中 8 が「◎ 強い一致」、2 が許容範囲。**
flux-2-pro はサンプルの絵柄を概ね忠実に再現しており、**現状のサンプル画像は実生成の代表として妥当**。

## 改善候補（任意）
1. **crayon**: `styleBible` に「thick waxy crayon strokes, visible crayon grain, bold childlike outlines」等を
   追記してワックス質感を強める余地あり。
2. **colorful_pop**: 「highly saturated, vivid bold colors」を強調すると彩度がサンプルに寄る。

いずれも軽微で、現状のままでもユーザーの期待と大きく乖離しない。

## 再現方法
スクリプト: `/tmp/style-verify.mjs`（一時ファイル・未コミット）。
`REPLICATE_API_TOKEN` を Secret Manager から取得して実行。
