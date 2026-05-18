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

### T6-33 Closure（2026-05-18）

プロンプト側 E005 対策トラック（L1+L2+L3）を正式 closure。

**主要決定:**

- **プロンプト側対策トラック: クローズ** — L1+L2+L3 の全3層を実施。効果は marginal（+1ページ/book）のみ。E005 の根本原因はモデルレベルの content policy であり、プロンプト変更では解決できない。
- **Klein primary: Reject 確認** — T6-31 決定を T6-33 で再確認。変更なし。
- **ペアステータス変更:** Hold → **Blocked-on-model-policy**

**エスカレーション方針:**

| オプション | アクション |
| --- | --- |
| O2: Replicate policy inquiry | **T6-34 primary** — E005 閾値調整またはカスタムモデルの可否を問い合わせ |
| O3: 代替モデル評価 | T6-35 — O2 が1週間以内に有効な回答を得られない場合に発動 |
| O4: story narrative 再設計 | Defer — O2/O3 後に評価 |
| O5: E005 受容 + Klein 品質改善 | **Reject** — 商品品質基準未達 |
| O6: ペア一時停止 | Reserve — O2+O3 が2スライス失敗した場合に発動 |

**現在の対応状況（T6-33 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 実装済み — プロンプト側トラック closed |
| fallback | klein_fast が fallback として機能（スタイル品質問題あり）|
| 次フェーズ | T6-34: Replicate inquiry + 代替モデル候補調査（docs-only） |

### T6-34 Support Inquiry Package（2026-05-18）

Replicate support への問い合わせパッケージを docs-only で作成。コード変更・deploy なし。

**問い合わせの要点:**

| 項目 | 内容 |
| --- | --- |
| モデル | `black-forest-labs/flux-2-pro` via Replicate API |
| エラーコード | E005 |
| 頻度 | imagination カテゴリ: 5–6/8 ページで一貫して発生 |
| 期間 | 2026-05-04〜2026-05-18（2週間以上） |
| 内容 | 児童向け絵本（3〜6歳）のファンタジー/想像シーン — 有害コンテンツなし |
| 緩和試行 | プロンプトサニタイザー3層（L1+L2+L3）— 効果は marginal のみ |
| フォールバック | flux-2-klein は E005 を発生させないが品質が商品バー未満 |

**問い合わせ質問項目 (Q1〜Q5):**

1. ファンタジー/想像シーンで E005 が発火する属性は何か？
2. API リクエストを「児童コンテンツ」として分類する方法はあるか？
3. アカウント単位で E005 閾値を調整できるか？
4. 児童ファンタジーコンテンツに対して E005 発生率が低い代替モデルはあるか？
5. カスタムモデルデプロイ（児童コンテンツ向けポリシー）の選択肢はあるか？

**T6-35 分岐条件:**

| 結果 | T6-35 アクション |
| --- | --- |
| O2 成功 (回答あり・調整可) | 推奨ソリューションを実装・テスト → re-smoke |
| O2 部分的 (回答あり・調整不可) | O3 代替モデル候補評価に切り替え |
| O2 無回答 (7日以内に回答なし) | O3 並行起動 + フォローアップ問い合わせ |
| O2 拒否 (明確な拒否) | O3 即時発動 |

**現在の対応状況（T6-34 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 実装済み — プロンプト側トラック closed |
| Replicate inquiry | パッケージ作成済み — 送付準備完了 |
| fallback | klein_fast が fallback として機能（スタイル品質問題あり）|
| 次フェーズ | T6-35: O2 回答評価 + O3 代替モデル候補調査 |

### T6-35 Inquiry Submission Record / Alternate Model Selection（2026-05-18）

Replicate inquiry 送付状況の記録 + 代替 primary モデル候補選定設計を docs-only で実施。

**Replicate inquiry 送付状況:**

| 項目 | 状態 |
| --- | --- |
| 問い合わせドラフト | ✅ 完了（T6-34 `4bfe802`、§ 49.6） |
| 実際の送付 | ⏳ 未送付（手動ステップ — 送付後に記録） |
| 送付先 | Replicate support portal / `support@replicate.com` |
| Ticket ID | （送付後に記録） |
| 返答期限 | 送付日 + 7日 |

**代替 primary モデル候補ランキング（T6-36 smoke 対象）:**

| rank | モデル | 評価理由 | リスク |
| --- | --- | --- | --- |
| 1（推奨） | `black-forest-labs/flux-1.1-pro` | FLUX family で flux-2-pro より早期リリース。E005 ポリシーが異なる可能性が最も高い。input_images サポート済み。既存 `buildReplicateInput()` 構造と互換性高い | E005 動作未確認 — T6-36 smoke で検証必須 |
| 2（バックアップ） | `black-forest-labs/flux-dev` | オープンウェイト FLUX ベース。コンテンツフィルター緩め。Fine-tune 可能 | 品質天井が 1.1-pro より低い可能性 |
| 3（第三候補） | `stability-ai/stable-diffusion-3.5-large` | 独立アーキテクチャ＋独立コンテンツポリシー | API payload 構造変更が必要; スタイル適合未検証 |

**通過基準（T6-36 smoke）:**

| 基準 | 閾値 |
| --- | --- |
| E005 rate | ≤ 2/8 ページ（I1 + I2 両方） |
| crayon texture スコア | ≥ 3/5（主観評価） |
| p95 latency | ≤ 120 s |

**現在の対応状況（T6-35 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 実装済み — プロンプト側トラック closed |
| Replicate inquiry | パッケージ完了 — 送付待ち（手動）|
| 代替候補選定 | 設計完了 — T6-36 smoke 対象: `flux-1.1-pro` |
| fallback | klein_fast が fallback として機能（スタイル品質問題あり）|
| 次フェーズ | T6-36: O2 回答評価 OR `flux-1.1-pro` controlled smoke |

### T6-36 flux-1.1-pro Smoke Design（2026-05-18）

`flux-1.1-pro` を `imagination × crayon` の alternate primary candidate として検証するための
smoke design を docs-only で作成。T6-37 が実装 + smoke を実行する。

**新規 diagnostic profile 設計:**

| 項目 | 値 |
| --- | --- |
| 新プロファイル名 | `flux11_pro_candidate`（診断専用 — 本番公開しない）|
| モデル定数 | `FLUX_11_PRO_MODEL = "black-forest-labs/flux-1.1-pro"` |
| 変更ファイル (T6-37) | `types.ts`, `replicate.ts`, `create-nonfixed-smoke-book.js` |
| `pro_consistent` への影響 | **なし** — 既存パスは変更しない |

**API 互換性確認事項（T6-37 実装前に必須）:**

| フィールド | 確認内容 |
| --- | --- |
| `input_images` | flux-1.1-pro で有効か（vs `image_prompt` 等の別フィールド名）|
| `safety_tolerance` | 公開パラメータか確認 — 1–6 スケール、children's content に `5` または `6` が有効か |
| `aspect_ratio: "4:3"` | サポート確認 |
| `output_format: "png"` | サポート確認 |

**smoke 実行計画:**

| フェーズ | 内容 | 判定 |
| --- | --- | --- |
| Phase 1 | I1 smoke（flux11_pro_candidate）→ E005 rate 確認 | ≥ 5/8 → disqualify; ≤ 4/8 → Phase 2 |
| Phase 2 | I2 smoke（条件付き）→ E005 rate 確認 | 両方 ≤ 2/8 → PASS |

**通過基準:**

| 基準 | 閾値 |
| --- | --- |
| E005 rate (I1 + I2) | ≤ 2/8 ページ（両方） |
| crayon texture | ≥ 3/5 主観評価 |
| p95 latency | ≤ 120 s |

**ベースライン（T6-32 結果）:**

| 書籍 | モデル | E005/8 |
| --- | --- | --- |
| I1 T6-32 | flux-2-pro | 5 |
| I2 T6-32 | flux-2-pro | 6 |

**現在の対応状況（T6-36 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 実装済み — プロンプト側トラック closed |
| Replicate inquiry | パッケージ完了 — 送付待ち（手動）|
| smoke design | ✅ 設計完了（T6-36 section 51）|
| 次フェーズ | T6-37: `flux11_pro_candidate` 実装 + I1/I2 controlled smoke |

**T6-37 結果（2026-05-18）:**

| 書籍 | モデル | safety_tolerance | E005/8 | 判定 |
| --- | --- | --- | --- | --- |
| I1 T6-37 | flux-1.1-pro | 5 | **6/8** | ❌ Clear Fail |

- 2/8 ページ: flux-1.1-pro 1 回で成功（completed）
- 6/8 ページ: flux-1.1-pro × 2 で E005 → klein_fast fallback（fallback_completed）
- `safety_tolerance=5` はプラットフォームレベルの E005 フィルタに効果なし
- **判定: flux-1.1-pro DISQUALIFIED（I2 skip）**

**現在の対応状況（T6-37 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 実装済み — プロンプト側トラック closed |
| Replicate inquiry | パッケージ完了 — 送付待ち（手動）|
| flux-1.1-pro smoke | ❌ Clear Fail（E005 6/8、T6-37 section 52）|
| 次フェーズ | T6-38: flux-dev（rank 2）candidate smoke または O2 Replicate 回答待機 |

**T6-38 決定（2026-05-18）:**

| 項目 | 決定内容 |
| --- | --- |
| O2 Replicate inquiry | **Critical Path** — draft 完成済み、手動送付デッドライン: 2026-05-25 |
| flux-dev (rank 2) | Low-expectation diagnostic。商用ライセンス（C1）・schema（C3）・E005 行動差分根拠（C5）を docs-only audit で確認してから判断 |
| BFL ファミリー継続 | flux-2-pro ❌、flux-1.1-pro ❌ → BFL系追加試行は低期待値。O2 結果次第 |
| T6-39 推奨 | O2 送付確認（手動） + flux-dev docs-only audit（C1–C5 確認）— コード変更・smoke なし |

**O2 応答シナリオ別の次アクション:**

| シナリオ | T6-40 方向 |
| --- | --- |
| O2-Success | Replicate 指示に従い実装 + smoke |
| O2-Partial | 代替手段を T6-40 で実装・評価 |
| O2-NoResponse（期限内未応答） | flux-dev audit 結果に基づき判断 → NG なら Tier B（SD3.5-L）へ |
| O2-Decline | Tier B（SD3.5-L）または Tier C（代替プロバイダ）評価へ |

**現在の対応状況（T6-38 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| E005 対応状況 | L1+L2+L3 closed / flux-2-pro ❌ / flux-1.1-pro ❌ |
| Replicate inquiry | draft 完了 — **手動送付待ち（デッドライン: 2026-05-25）** |
| flux-dev | docs-only audit（C1–C5）待ち |
| 次フェーズ | T6-39: O2 送付確認 + flux-dev docs-only audit |

**T6-39 決定（2026-05-18）:**

| 項目 | 決定内容 |
| --- | --- |
| Primary conclusion | **External dependency not activated yet** — Replicate inquiry 未送付 |
| Pending blocker | B-O2: Replicate inquiry not submitted。担当: human operator, 期限: 2026-05-25 |
| flux-dev feasibility audit | C1 ✅ / C2 ✅ / C3 ⚠️ / C4 ❌ / C5 ❌ → **NO-GO** for smoke |

**flux-dev Feasibility Matrix (T6-39 audit):**

| check | 項目 | 判定 |
| --- | --- | --- |
| C1 | 商用ライセンス（Replicate API） | ✅ RESOLVED |
| C2 | Replicate 可用性 | ✅ CONFIRMED |
| C3 | Input schema 互換性 | ⚠️ PARTIAL（`input_images` / `image_prompt` / `safety_tolerance` なし） |
| C4 | キャラクター参照対応 | ❌ INCOMPATIBLE |
| C5 | E005 行動差分の根拠 | ❌ NO EVIDENCE（`disable_safety_checker` 無効化不可、pro より調整余地が少ない） |

**flux-dev smoke 禁止条件**:
- O2 inquiry 未送付（B-O2 未解消）
- C5（E005 行動差分根拠）なし
- O2-Success / O2-Partial（Replicate が直接解決策を提供している）

**T6-40 branch rules:**

| O2 状態 | T6-40 方向 |
| --- | --- |
| Branch A: 未送付 | B-O2 escalation docs + 送付要求（flux-dev smoke は実施しない） |
| Branch B: O2-Success / Partial | Replicate 提案実装を優先（flux-dev は後回し） |
| Branch C: O2-NoResponse / Decline + C5 解消 | flux-dev smoke design → T6-41 実装 |
| Branch C: O2-NoResponse / Decline + C5 未解消 | Tier B（SD3.5-L 等）評価へ移行 |

**現在の対応状況（T6-39 時点）:**

| 項目 | 状態 |
| --- | --- |
| ペアステータス | **Blocked-on-model-policy** |
| primary モデル | flux-2-pro (`pro_consistent`) のまま変更しない |
| 実装変更 | なし |
| Replicate inquiry | ❌ 未送付 — B-O2 blocker active（期限: 2026-05-25） |
| flux-dev | ❌ NO-GO（C4・C5 失敗） |
| 次フェーズ | T6-40: B-O2 状態確認 → Branch A/B/C に従い scope 決定 |
