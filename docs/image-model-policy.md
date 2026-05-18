# 画像生成モデル方針

- Gemini は **1ページごと** ではなく、**絵本1冊分の story JSON をまとめて生成** します。
- 画像生成はその後、**各ページごとに Replicate を呼び出して実行** します。
- そのため、ページ間の人物揺らぎや構図の不安定さは、主に **画像生成側のモデル / prompt / reference image / 構図制御** の影響として扱います。
- 現時点の通常生成の本番候補は `pro_consistent` / `black-forest-labs/flux-2-pro` です。
- `free` / `light_paid` / `standard_paid` / `premium_paid` の通常生成では、PlanConfig から `imageModelProfile: "pro_consistent"` を渡し、結果的に `flux-2-pro` を使う方針です。
- `child_avatar` / `child_avatar_revision` は引き続き `black-forest-labs/flux-2-pro` を使います。
- `klein_fast` / `black-forest-labs/flux-2-klein-9b` は管理者検証用に残しますが、通常生成候補からは一旦外します。
- `klein_base` / `black-forest-labs/flux-2-klein-9b-base` も比較検証用の候補として残します。
- `kontext_reference` / `black-forest-labs/flux-kontext-pro` は将来の参照強化検証用です。
- `flux-schnell` は通常生成では使いません。

## 生成信頼性方針（2026-05 改定）

### 現在の実装（MVPフェーズ）: Bounded synchronous generation

- ページ画像は並列 concurrency=2 で生成（`IMAGE_CONCURRENCY` 環境変数で調整可）
- 1枚あたり timeout=120秒（`IMAGE_GENERATION_TIMEOUT_MS` 環境変数で調整可）
- timeout または失敗時は fallback model に切り替え（`pro_consistent` → `klein_fast`）
- 1ページ失敗でもBook全体をfailedにしない: `partial_completed` ステータスで継続
- recurring character reference 生成は `premium_paid` の `quality` モードのみ有効
  - `free` / `standard_paid` は `reliable_fast` モードで reference 生成をスキップ
- 生成メトリクス（imageDurationMs, imageAttemptCount, imageFallbackUsed 等）を Firestore に保存

### 次フェーズ候補: Async page jobs + Replicate webhooks

- **Why**: Functions タイムアウト問題を根本解決、ページ単位のジョブキューで resume/retry を可能にする
- **How**: Replicate の prediction webhook を利用し、ページ完了ごとに Cloud Functions を呼び出す
- **Benefit**: Functions を長時間占有しない、失敗ページのみ再生成可能、スケーリングが容易
- **Cost**: アーキテクチャの複雑性増加、webhook エンドポイントの追加、prediction ID 管理が必要

現時点では MVP の bounded synchronous 方式（timeout + fallback + partial_completed）で十分な信頼性を確保し、
需要増加時に webhook 化を検討する。

### SLO の考え方

- SLO は「画像1枚が必ず2分以内」ではなく「**p95 120秒以内**」として扱う
- 個別ページの一時的な遅延は許容し、全体の分布で管理する
- **Book hard failure** と **partial_completed** を分けて計測する
  - hard failure = ユーザーに何も残らない完全な失敗
  - partial_completed = 一部ページが欠けているが残りは読める
- `partial_completed` は page regeneration がある場合のみ商品UXとして許容する
  - 再生成導線がなければ、partial_completed は実質 failed と同じ

### Provider lock-in 回避

- provider lock-in を避けるため、ImageProvider abstraction を今後導入する（PRODUCT_ROADMAP Phase 3）
- Replicate webhook / polling / prediction ID 管理は Phase 3 以降の候補
- Firebase Functions `maxInstances` / `concurrency` も信頼性設計に含める

補足:

- 無料プランは「低品質モデルで原価を下げる」のではなく、**4ページ固定・作成モード制限・回数制限** で原価を管理します。
- 無料は「短いけれどきれい」、有料は「長い・自由度が高い・補正や保存性が高い」という差に寄せます。
- 管理者向け比較画面では、まず `pro_consistent` 単独で品質確認し、必要なときだけ `klein_fast` / `klein_base` / `kontext_reference` を比較します。
- `klein_fast` は Starting 滞留が確認されているため、通常生成候補から外し、管理者検証用に隔離しています。
- `flux-schnell` の入力 schema は緊急時の legacy fallback としてコード上に残していますが、通常ルートでは選択されません。
- ページ間の見た目の揺れを減らすため、参照画像を渡すページは `characterConsistencyMode` で制御します。
- スタイルカード画像は **UIで見せるプレビュー** であり、通常の絵本生成では input image に入れません。
- 通常生成のスタイル制御は `styleBible` とスタイル指示文で行い、input image は child protagonist / storyCast の一貫性維持用に限定します。
- seed はスタイル指定の道具ではなく、同一条件の再現比較用に扱います。
- 管理者向け `image-model-tests` だけは、比較のために `stylePreviewReference` を ON にして style preview image を `style_reference` として加えられます。
  - `cover_only`: 表紙または key image のみ
  - `key_pages`: 表紙、中盤〜後半の感情ピーク、最終ページ
  - `all_pages`: 全ページ
- 現在の品質検証フェーズでは、少なくとも `standard_paid` 以上を `all_pages` 参照に寄せ、全ページで人物一貫性を優先します。
- 原価最適化は後で `key_pages` / `cover_only` を再検討し、まずは全ページ参照画像で一貫性改善量を検証します。
- 現在の改善軸は「モデル切替」だけではなく、本文 quality gate、Gemini fallback、画像 prompt 最適化、reference all pages の組み合わせです。
- 満足度低下の主因が本文品質にある場合は、画像モデルをむやみに変更するよりも、story quality gate と story text rewrite pass の改善を優先します。

## E005 content sensitivity rejection — imagination カテゴリ固有の問題（2026-05 確認）

### 確認された事実（T6-27〜T6-30）

- `pro_consistent` (flux-2-pro) は `imagination` categoryGroupId のページ 1–7 に対して **E005** (content sensitivity rejection) を返す。
- E005 はプロンプト決定論的：同一プロンプトは毎回 E005。リトライ・バックオフでは回復しない（T6-27 確認）。
- `IMAGE_CONCURRENCY` の変更（2→1）は E005 に無効（T6-26 確認）。
- L1 (Gemini system prompt fantasy rule block) + L2 (runtime imagination guardrail) を実装・デプロイ（T6-29/T6-30）したが E005 は同率で継続。
- E005 は fantasy シーンのビジュアルコンテンツ自体（ロケット、グローオーブ、魔法的世界観）に対する flux-2-pro の感度閾値が原因。プロンプト文言の調整だけでは解消できない。

### klein_fast / klein_base を imagination の primary モデルにすることは NG

- T6-24 で確認：klein_fast フォールバックは BF-4/BF-3 を通過するが、**クレヨンスタイル遵守 Fail**（フォトリアルへの劣化）かつ **story-image match Fail**（ファンタジーシーン再現不可）。
- klein_fast / klein_base を primary にしても E005 は回避できるが **商品品質水準を満たさない**。
- 「klein primary 化＝E005 回避」は技術的に正しいが、製品として出せないトレードオフになる。
- このため **klein primary 化は正式に Reject**（T6-31 決定）。

### imagination × crayon ペアの現在の扱い（T6-31 時点）

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Hold** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2 実装済み、L3 regex sanitizer は未実装（deferred） |
| fallback | klein_fast が引き続き fallback として機能（品質問題あり）|
| 次フェーズ | L3 sanitizer 実装 → re-smoke → 改善不十分なら Replicate policy 確認または代替モデル評価 |

### T6-32 結果更新（2026-05-18）

L3 regex sanitizer を実装・デプロイし、`imagination × crayon` I1/I2 re-smoke を実施。

| 指標 | T6-30 (L1+L2) | T6-32 (L1+L2+L3) |
| --- | ---: | ---: |
| I1 fallback_completed | 6/8 | 5/8 |
| I2 fallback_completed | 7/8 | 6/8 |
| imageTimedOut | 0 | 0 |
| image_failed | 0 | 0 |

**評価:** L3 により各1ページ分の改善（marginal）。threshold (< 3/8) は未達。
E005 の主因は fantasy シーン内容に対する flux-2-pro のモデルレベルの content policy であり、
プロンプト側のサニタイザー3層すべて（L1+L2+L3）を適用しても根本解決に至らない。

**現在の対応状況（T6-32 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Hold** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 すべて実装・デプロイ済み |
| fallback | klein_fast が fallback として機能（スタイル品質問題あり）|
| 次フェーズ | T6-33: manual visual QA + Replicate policy inquiry 推進 |
