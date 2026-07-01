# バックログ / 検討中の機能

## ナレーション音声（読み上げ）— バックログ
- 要件: **日本語で温かみのある**読み上げ音声を絵本に付ける。
- 状態: 声質が要件を満たせるか不透明なため保留。要望が来たら着手。
- 着手時の最初のステップ: 日本語TTSの声質評価（候補: OpenAI TTS、Google/Gemini TTS、ElevenLabs 日本語、にじボイス等）。子ども向けの柔らかさ・自然さで比較 → 採用可否を判断してから実装。

## 製本（オンデマンド印刷）— 方針調査済み・実装前に業者決定
- 方針: 生成した絵本から**印刷用データを作成 → オンデマンド印刷業者にAPI発注 → ユーザーへ配送**。PDFダウンロードは提供しない（物理本の価値を保つ）。
- 推奨業者: **Gelato**
  - 子ども向け書籍/フォトブックの製品ライン、RESTful API（Order Flow・Webhook）、**日本国内で現地生産**（平均5〜6日配送）、無在庫ドロップシップ。
  - 参考: https://www.gelato.com/products/childrens-books , https://www.gelato.com/order-flow , https://www.gelato.com/print-on-demand/japan
- 代替: Lulu / Prodigi / Peecho（API可だが日本は海外拠点で日数・送料増）、国内高品質の TOLOT/Photoback/しまうまプリント（公開APIなし→手動/サイト誘導）。
- 実装前に決めること:
  1. 業者（Gelato で自動化 or 国内サービスへ誘導）
  2. Gelato の場合、アカウント/APIキーの取得（ユーザー側）＋技術検証（サンプル1冊をAPI発注できるか）
- 実装イメージ（Gelato採用時）: 絵本完成 → サーバで印刷用PDF/画像（表紙+本文・断ち落とし込み）生成 → Gelato API 発注（住所・仕様）→ Webhookでステータス反映 → 既存 Stripe で決済。
