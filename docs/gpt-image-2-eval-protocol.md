# gpt-image-2 評価プロトコル（本番採用判断用）

gpt-image-2 を本製品の画像モデルとして採用するかを、admin「画像モデル比較」画面で
厳密に評価するための手順とルーブリック。視覚判断とコストが伴うため運用者が実施する。

## 検証済みの前提（コード側）
- `openai/gpt-image-2` は OpenAI Images API の有効モデル（公式ドキュメント確認済み）。
- 参照画像なし → `images.generate(model: "gpt-image-2")` で実行。
- 参照画像あり → `images.edit(model: "gpt-image-2")` で実行（PR #609）。Responses API
  経由では gpt-image-2 を指定できないため、参照画像のキャラ一貫性も gpt-image-2 で
  正しく評価できる。

## 比較対象プロファイル
- `pro_consistent`（flux-2-pro / 現 Premium）
- `kontext_max`（flux-kontext-max / 参照一貫性の現実的ベスト）
- `openai_gpt_image_2`（gpt-image-2 / 候補）
- 任意: `openai_standard`（gpt-image-1）, `klein_fast`

## 評価軸（各5段階）
1. **画像内テキスト混入の無さ**（最重要 / 本番最多不具合）
2. **キャラ一貫性**（参照画像を入れて複数プロンプトで顔・髪・服が保たれるか）
3. **絵本らしさ・水彩スタイル忠実度**（本製品の世界観に合うか）
4. **指示追従**（構図・場所・小物の指定どおりか）
5. **生成時間・コスト**（画面に表示される latency / 概算コスト）

## 手順
1. /admin/image-model-tests を開く（管理者ログイン）。
2. 比較モード = modelProfiles。上記4プロファイルを選択。
3. 代表プロンプトを順に実行（各で「採用」候補を選ぶ）。
   - A. テキスト誘発シーン: 「誕生日の部屋、装飾やケーキ、窓辺」など文字が出やすい場面。
   - B. キャラ一貫性: 同じ子の参照画像を入れ、別シーン（公園/寝室/食卓）で3回。
   - C. 水彩スタイル: 「やわらかい水彩の、夕暮れの散歩」など世界観確認。
   - D. 構図指定: 「ワイドショット、左に犬、右に子ども」など指示追従確認。
4. 各軸をメモ。latency / 概算コストも記録。

## 採用判断の目安
- **テキスト混入で gpt-image-2 が明確に優れ、かつ水彩忠実度が許容範囲** → 本番ルーティング
  移行を検討（Premium を gpt-image-2 に。`image-model-policy` の resolve を変更し、
  monitor → 段階移行）。
- 水彩忠実度が落ちる / コストが見合わない → 現状維持、または text-to-image だけ gpt-image-2、
  参照ありは kontext_max など用途別ハイブリッド。

## 次の実装（採用が決まった場合）
- `resolveImageModelProfile` / `image-model-policy` の Premium ルートを gpt-image-2 に。
- フォールバック順序に gpt-image-2 → kontext_max → flux-2-pro を設定。
- 概算コスト $0.08/枚（high品質）で粗利を再計算（4〜12ページ分）。
