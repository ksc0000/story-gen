# gpt-image-2 全面刷新 計画（実装前のドラフト）

## 1. 決定の根拠
admin 比較ツールでの視覚A/B（参照画像あり・複数シーン）の結論：
- **flux-2-pro (pro_consistent) は参照画像に引っ張られすぎる** — キャラだけでなく
  背景・構図・ポーズまで参照を写してしまう（reference bleed）。
- **gpt-image-2 はこの弱点を完全に脱却** — 参照はキャラの同一性維持に使いつつ、
  本文プロンプトの新しいシーンを正しく描く。絵の品質は同等。
- この差は「同じ子が毎ページ別シーンで自然に登場する」絵本商品にとって本質的。

→ 画像生成モデルを **gpt-image-2 に全面刷新**する方向。

## 2. スコープ（どこを刷新するか）
| 用途 | 現状 | 刷新後（案） |
|---|---|---|
| Premium ページ | flux-2-pro | **gpt-image-2 high** |
| Standard ページ | klein_fast/base | **gpt-image-2 medium** |
| Free ページ | klein_fast | **gpt-image-2 low**（または据置 klein）※要判断 |
| child_avatar（基準像） | flux-2-pro | **gpt-image-2 high** |
| recurring キャラ参照 | flux系 | **gpt-image-2** |
| photo_story（写真参照） | flux | **gpt-image-2 edit**（reference bleed 解消の主目的） |

## 3. コストモデル（OpenAI公式単価・確定）
gpt-image-2 単価（1024×1024）: **low $0.006 / medium $0.053 / high $0.211**（high は当初見積$0.08の誤りを訂正）。
※ Premium 等の参照画像(edit)は入力トークン増で +α。

### 採用マッピング（収益モデルで品質を出し分け）
| 区分 | 品質 | 単価/枚 | 9枚/冊 |
|---|---|---|---|
| Free（上限1冊） | low | $0.006 | 約$0.05（klein より安い） |
| Standard サブスク ¥1480（上限5冊） | medium | $0.053 | 約$0.48 → max ¥370/月・粗利75% |
| Premium サブスク ¥2980（上限10冊） | **medium** | $0.053 | 約$0.48 → max ¥716/月・**粗利75%（高でも安定黒字）** |
| 単品 ¥1500/¥2000・エンタープライズ | high | $0.211 | 約$1.90 → 1冊あたり粗利80%+ |
| child_avatar（基準像） | high | $0.211 | — |

- **Premium を high にすると上限10冊でほぼ赤字**になるため medium を採用（決定B）。
- 単品/エンタープライズは1冊高収益なので high で品質最優先。

## 4. 技術的に必要な変更
- **追加プロファイル**: `openai_gpt_image_2`（high）に加え medium/low 変種を openai-image.ts に定義。
- **ルーティング**: `resolveImageModelProfile` で tier→gpt-image-2 変種を返す。child_avatar の
  pro_consistent 固定も gpt-image-2 high に。
- **フォールバック**: 各 gpt-image-2 プロファイル → flux-2-pro → klein_fast（Premium分は実装済 #613）。
- **既に完了**: OpenAIImageAdapter の gpt-image-2 対応（#604）、参照画像の Images edit 経路（#609）、
  Premium フラグgate（#613）。
- **生成経路**: PROFILE_PROVIDER_MAP により OpenAIImageAdapter へルーティング済み（実装済）。

## 5. レイテンシ・レート制限
- gpt-image-2 は flux より遅い。generateBook タイムアウト 540s、IMAGE_CONCURRENCY=2。
  12ページ本でも概ね収まる見込みだが、**実測で監視**。
- **OpenAI のレート制限（RPM/TPM）はアカウント tier 依存**。ローンチ想定ボリュームで
  上限に当たらないか要確認（必要なら tier 引上げ or キューイング）。

## 6. ロールアウト段階
- **Phase 0（完了）**: gpt-image-2 配線・edit経路・Premium フラグgate・比較ツール。
- **Phase 1**: Premium を gpt-image-2 high に（`ENABLE_GPT_IMAGE_2_PREMIUM=true`）。premium 実績0のため低リスク。
- **Phase 2**: Standard を gpt-image-2 medium に。SLO（成功率/レイテンシ/フォールバック率）監視。
- **Phase 3**: child_avatar / recurring 参照 / photo_story を gpt-image-2 に。
- **Phase 4**: Free を gpt-image-2 low に（or 据置判断）。
- 各段階で `report:generation-slo` と quality-report で before/after を確認。

## 7. リスクと緩和
| リスク | 緩和 |
|---|---|
| 単一プロバイダ依存 | flux-2-pro/klein への自動フォールバックを全 gpt-image-2 プロファイルに維持 |
| レート制限（スケール時） | アカウント tier 確認・上限監視・必要ならキュー |
| moderation 拒否 | moderation=low 設定済 + フォールバック |
| 11スタイルの再現性未検証 | 全面切替前に主要スタイルを比較ツールで確認 |
| レイテンシ増 | concurrency/timeout 監視、必要なら並列度調整 |

## 8. 未確定（要判断）
1. **Free ティア**: gpt-image-2 low で全冊高品質化（安価）か、コスト厳格化で klein 据置か。
2. **medium/low の実単価**確定（OpenAI pricing 確認）。
3. **全11スタイル**を gpt-image-2 で事前検証するか（水彩のみ確認済）。
4. **OpenAI アカウント tier / レート上限**のローンチ耐性。
5. 切替方式：一気に全ティアか、Phase 段階かの最終判断。
