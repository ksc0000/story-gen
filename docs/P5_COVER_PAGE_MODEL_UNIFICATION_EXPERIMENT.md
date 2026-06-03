# P5-3f: カバー／ページ 画像モデル統一実験計画

> **Status**: Planning (updated) — docs only. No code changes, no deploy, no production default changes.
> **Created**: 2026-06-03
> **Updated**: 2026-06-03 — per-page fallback root-cause investigation complete; Option C prioritized
> **Phase**: P5 (ソフトローンチ・本番トラフィック)
> **Trigger**: Cohort B フィードバック #2 調査（Issue #19 解消後の品質改善追跡）
> **Related**: `docs/PRODUCT_ROADMAP.md` §P5 ソフトローンチ

---

## 1. 背景と動機

### 1.1 調査で確認された品質ギャップのメカニズム

Cohort B フィードバック #2（8ページ書ページ、guided_ai、all_pages 一貫性モード）の調査で、以下の構造的品質ギャップを特定した。

| 対象 | モデル | フォールバック | 参照画像 |
|---|---|---|---|
| カバー画像 | `pro_consistent` | なし（1 attempt で成功） | なし（レガシーパス） |
| ページ 0 | `pro_consistent` | なし（1 attempt で成功） | あり（2枚） |
| ページ 1–7 | `klein_fast`（fallback from `pro_consistent`） | あり（2 attempts 失敗 → klein_fast 成功） | あり（2枚） |

- `pro_consistent` は 8 ページ中 7 ページで 2 回連続失敗（`timedOutPages=0` → タイムアウトではなく非タイムアウトエラー）
- **失敗理由は確定（§1.4 参照）**: 全 14 回の失敗が同一の安全性拒否クラス（E005 相当）。タイムアウト・5xx・Quota 超過・一時的エラーはゼロ。参照画像を含む入力への拒否が原因と考えられる（全ページで同一の拒否参照 ID）
- カバーは `pro_consistent` 品質・ページ 1–7 は `klein_fast` 品質 → ユーザーが知覚できる品質差が発生

### 1.2 現行フォールバック設計の制約

- 現行: `pro_consistent → klein_fast`（`resolveImageFallbackProfiles` in `image-model-policy.ts`）
- フォールバックはコンプリーション率を守るために設計されており、品質担保の目的はない
- `klein_fast` は最低コスト・最低品質モデルであり、`pro_consistent` とは画質が大きく異なる
- フォールバック発生時のページは `fallback_completed` ステータスになるが、ユーザーには理由が伝わらない
- 大量フォールバック（7/8 ページ等）が発生した場合、書全体として「低品質」と評価されるリスクがある

### 1.4 根本原因調査結果（P5-3f 計画後に判明）

> この調査は P5-3f 計画書公開後に実施した。結果を受けて §5 推奨実験順序を更新した。

**調査対象**: Cohort B feedback #2 の当該書（8 ページ、guided_ai、all_pages 一貫性モード）

**ログ取得結果（PII-safe）:**

| 項目 | 値 |
|---|---|
| `pro_consistent` 失敗イベント総数 | 14 件（ページ 1–7 × 2 attempt） |
| 確認された失敗クラス | 安全性拒否（E005 相当）— 14/14 |
| タイムアウト / 5xx / 4xx / Quota | **0 件** |
| 一時的エラー（transient） | **0 件** |
| 拒否参照 ID の種類 | **1 種類** — 全 14 失敗で同一 |
| 拒否レイテンシ（シーン記録から失敗まで） | 7–23 秒（完全生成サイクルより短い） |
| ページ 0 の失敗イベント | **0 件**（pro_consistent で 24.8 秒成功） |
| ページ 0 の参照画像数 | 2 枚（ページ 1–7 と同じ） |

**重要な観察:**
- ページ 0 とページ 1 は **同一バッチ・同時実行**（concurrency=2）。参照画像も同一（2 枚）。にもかかわらずページ 0 は成功、ページ 1 以降は全失敗。
- 失敗した全ページが **同一の拒否参照 ID** を返している。異なるシーン内容（長さ 358–535 文字）を持つにもかかわらず統一されている。
- 仮説: ページ 0 の生成リクエストが先に処理されて成功し、その後 Replicate の安全フィルターが参照画像入力を評価・フラグ付けした結果、以降の全リクエストが同一の参照 ID で拒否された。

**実験設計への影響:**
- 失敗原因は「一時的エラー」ではなく「参照画像を含む入力に対する安全性拒否」が確定的
- 同一参照画像で再試行しても拒否が繰り返される（2 attempt とも拒否）
- **参照画像を除いたリトライ**（Option C の attempt 2）が拒否をバイパスする最も直接的な対策
- Option B（フォールバックなし）は失敗時に画像なしページが残るため、参照画像が原因の拒否が継続する場合にユーザー UX が著しく悪化する

### 1.3 目的

本実験は以下を目的とする:

1. カバーとページの画像品質差を縮小し、書全体のビジュアル一貫性を高める
2. `pro_consistent` の実際の失敗率・失敗原因を測定可能にする（現在はフォールバック成功により隠蔽されている）
3. フォールバック設計の改善方向性（Strict / Safer / Candidate 置換）を比較実験で検証する

---

## 2. スコープ

### 対象
- 高品質モードの書（`imageModelProfile: "pro_consistent"` が設定されたすべての書）
- 該当するコホート: Cohort B（現在）および将来の有料ユーザー

### 対象外（このドキュメントでは扱わない）
- `klein_fast` / `klein_base` がデフォルトの low-quality モード書
- テンプレートモード（`fixed_template`）の生成品質
- Story / テキスト品質
- UI / UX 変更（`GenerationProgress` フォールバック表示改善は Issue #19 で対応済み）
- Firestore ルール・インデックス変更

---

## 3. ベースライン（Option A）

```
カバー:  pro_consistent（レガシーパス、参照画像なし）
         ↓ fallback なし（失敗時は coverStatus=failed、book は partial 扱いせず）

ページ:  pro_consistent（アダプターパス、all_pages 時は参照画像あり）
         ↓ fallback → klein_fast（現行動作）
```

**観測された問題点:**
- `pro_consistent` が高頻度で失敗すると 7/8 ページが `klein_fast` にフォールバック
- カバーと大半のページの間に著しい品質差が生じる
- フォールバックが多発しても `bookStatus=completed` になるため、品質問題が SLO に現れにくい

---

## 4. 実験マトリクス

### Option B — Strict Profile Unification（厳格統一）⚠️ 内部診断専用

> **PM 判断（2026-06-03）**: 根本原因調査の結果、参照画像を含む入力への安全性拒否が原因と特定された。Option B をコホートテスターに適用すると画像なしページが多発しユーザー UX が著しく悪化するため、**Cohort B 向けの実験対象から除外**。内部テストアカウントでの診断実験としてのみ使用可。

```
カバー:  pro_consistent（変更なし）

ページ:  pro_consistent（attempt 1）
          → 失敗時: pro_consistent retry（attempt 2）
          → 失敗時: image_failed（klein_fast フォールバックなし）
          → book は partial_completed になり得る
```

| 項目 | 内容 |
|---|---|
| 狙い | klein_fast フォールバックを廃止し、品質差をなくす |
| メリット | カバー/ページ品質が完全統一される；`pro_consistent` 実失敗率が直接観測可能になる |
| デメリット | 参照画像が安全性拒否トリガーである場合、7/8 ページが `image_failed` → `partial_completed` 書になる；実ユーザーには不適切 |
| 適用範囲 | **内部テストアカウントのみ**（Cohort B テスター不可）|
| 実装ポイント | `resolveImageFallbackProfiles("pro_consistent")` の書き換え、またはゲート付き条件分岐で fallback chain を空にする |
| ゲート | `generationOverride.allowCandidateProfile === true` + 新フラグ `p5ModelUnification: "strict"` |
| 実験リスク | 高（コンプリーション率低下の可能性）— Cohort B 適用禁止 |

### Option C — Safer High-Quality Retry（安全優先 pro_consistent リトライ）★ 推奨 First Experiment

> **PM 判断（2026-06-03）**: 根本原因調査により「参照画像を含む入力への安全性拒否」が確定。参照画像を除いたリトライが拒否をバイパスする直接的な対策であるため、Option C を最初の本番向け実験として優先する。

```
カバー:  pro_consistent（変更なし、参照画像なし）

ページ（3 ステップ）:
  Step a: pro_consistent + 通常プロンプト + 参照画像あり（利用可能な場合）（attempt 1）
            ↓ 失敗（安全性拒否等）の場合
  Step b: pro_consistent + 簡略プロンプト（simplified_scene 相当）+ 参照画像なし（attempt 2）
          ※ 参照画像ありユーザーも含む — 参照画像を意図的に除去してリトライ
            ↓ 失敗の場合のみ
  Step c: klein_fast（attempt 3 / 最終手段のみ）
```

**Step b の役割（すべてのユーザーに適用）:** Step a が参照画像ありで失敗した場合、Step b では参照画像を意図的に除去（`inputImageUrls=[]`）して `pro_consistent` でリトライする。参照画像が安全性拒否のトリガーである場合、Step b は拒否をバイパスする。

**写真ありユーザーでのトレードオフ:** Step b では子どもの似顔絵の再現性（likeness）・パーソナライゼーションが低下する。しかし Step c（`klein_fast`）への即時フォールバックや画像なしページ（Step b スキップ）と比べると、`pro_consistent` 品質を保てるため全体的な視覚品質は上回る。

> **P5-3d との違い**: `simplified_scene`（P5-3c/d）は「誤って参照画像を除去しないため」写真ありユーザーに適用しないというガードを持つ。Option C Step b は逆に「参照画像を意図的に除去してリトライする」ため、P5-3d のガード（`!hasReferenceImage`）は引き継がない。

| 項目 | 内容 |
|---|---|
| 狙い | 安全性拒否（参照画像トリガー）を Step b でバイパスし、`pro_consistent` 品質を維持する |
| メリット | 写真あり・なしを問わず `klein_fast` フォールバック発生率を減らす；Step c（klein_fast）到達を例外的ケースに限定できる；コンプリーション率を維持する |
| デメリット | Step b では参照画像を除くため写真ありユーザーの似顔絵再現性が低下する；生成時間が若干増加（安全性拒否が発生したページで Step b の追加呼び出し分）；Step b に pro_consistent コストが発生 |
| Step b の適用対象 | **写真あり・なしを問わずすべてのユーザー**。Step b は `inputImageUrls=[]` で参照画像を意図的に除去する。P5-3d の `!hasReferenceImage` ガードは引き継がない |
| 実装ポイント | `generatePageImageWithFallback` にリトライパス追加；attempt 2 で `finalInputImageUrls=[]` + `buildP5SimplifiedPagePrompt` を呼ぶ；hasReferenceImage によるスキップなし |
| ゲート | `generationOverride.p5ModelUnification: "safer_retry"` |
| 実験リスク | 中（コンプリーション率は維持されやすいが生成コスト増の可能性；写真ありユーザーで Step b 到達時に似顔絵再現性が低下する）|

### Option D — Candidate Model Comparison（候補モデル比較）

```
カバー:  openai_image_candidate または flux11_pro_candidate
ページ:  同上（カバー/ページ同一モデル）
フォールバック: openai_image_candidate はフォールバックなし（openai only）
```

| 項目 | 内容 |
|---|---|
| 狙い | Replicate 以外のモデルでカバー/ページの品質ギャップと E005 発生率を比較する |
| メリット | Replicate E005 を根本回避できる可能性；カバー/ページが同一モデルで統一される |
| デメリット | 候補ゲートが必要（`allowCandidateProfile: true`）；コスト差が大きい；OpenAI はフォールバックなし設計 |
| 実装ポイント | 既存 `CANDIDATE_IMAGE_PROFILES` / `openai_image_candidate` パスを活用；カバーのレガシーパスも候補モデルに切り替えが必要 |
| ゲート | `generationOverride.allowCandidateProfile === true` + `imageModelProfile: "openai_image_candidate"` または `"flux11_pro_candidate"` |
| 実験リスク | 中（候補ゲートにより一般ユーザーへのリスクはなし；コスト超過に注意）|

---

## 5. 推奨実験順序

> **2026-06-03 更新**: per-page fallback 根本原因調査（§1.4）の結果を受けて推奨順序を変更した。

### Phase 1（推奨 First Experiment）: Option C — Safer High-Quality Retry ★

**理由（根本原因調査を踏まえた判断）:**
- 失敗原因が「参照画像を含む入力への安全性拒否」として確定した。同一の参照画像で再試行しても拒否が繰り返される（観測済み）
- Option C の Step b（参照画像なし + 簡略プロンプト + `pro_consistent`）は拒否トリガーを直接バイパスする
- Option C はコンプリーション率を維持しながら `klein_fast` 品質への劣化を防ぐ
- `simplified_scene` 実験（P5-3c/d）で同様のアプローチが PASS 済みであり、実装リスクが低い
- Cohort B テスターへの安全な適用が可能

**Option B の位置づけ（内部診断のみ）:**
- 参照画像が安全性拒否トリガーの場合、Option B はページ 1–7 が `image_failed` になり、テスターへの UX が著しく悪化する
- 内部テストアカウントで「安全性拒否率」を計測するためには有効だが、Cohort B には適用しない

**Phase 2（Option C の結果次第）:**
- **`fallbackPages / pageCount ≤ 10%`（Step c に到達するページが少ない）**: Option C を標準パスとして採用検討
- **`fallbackPages / pageCount` が依然高い**: Step b の簡略プロンプト設計を改善するか、Option D（OpenAI 候補）の比較実験へ
- **Step b でも安全性拒否が発生**: 参照画像 URL 自体が問題の可能性→参照画像の再生成や別ストレージパスを検討

---

## 6. 評価指標

### 6.1 定量指標（Cloud Logging / Firestore）

| 指標 | 取得元 | 目標方向 |
|---|---|---|
| `fallbackPages / pageCount` | `book_outcome` ログ | **減少**（Option C 優先指標）|
| **高品質試行の安全性拒否件数**（per page） | `Image generation attempt failed` ログ（attempt 0/1 失敗数） | 減少（Step a での拒否が減るほど良い）|
| **同一拒否参照 ID を持つ失敗の連続数**（同一書内） | `Image generation attempt failed.error` の参照 ID 重複計数 | 1 冊あたり 0 が理想；≥ 3 ページで同一 ID → 参照画像フラグの可能性 |
| **参照画像ありページの `fallback_completed` 率** | PageDoc `imageFallbackUsed === true AND inputImageUrlsCount > 0` | 減少（参照画像起因フォールバックの根本指標）|
| `page_image_failed` count（Step c 到達） | `page_image_failed` イベント（Option C では Step c 失敗のみ） | 減少または同等 |
| `partial_completed` rate | `book_outcome.bookStatus` | 維持（Option C では上昇しないことが目標）|
| `completed` rate (全ページ成功) | `book_outcome.completedPages == totalPages` | 維持 |
| `imageDurationMs` p50 / p95 per page | PageDoc フィールド | Option C では若干増加を許容（Step b 呼び出し分）|
| `imageAttemptCount` per page | PageDoc フィールド | 把握（Step b 到達率の確認）|
| `storyDurationMs` | `book_outcome` ログ | 変化なし（story は影響を受けない）|
| `durationMs` (book total) | `book_outcome` ログ | Option C では若干増加を許容 |
| `coverImageFallbackUsed` | BookDoc フィールド | 変化なし（カバーは変更なし） |
| `duplicate_page_image_urls_detected` | ログイベント | ゼロ維持 |

### 6.2 定性指標（テスター評価）

| 指標 | 評価方法 |
|---|---|
| カバー/ページ品質ギャップの主観評価 | フィードバックフォーム（現行 1–5 スケール継続）|
| ページ間スタイル一貫性 | テスター評価フォーム `pageConsistency` 項目 |
| キャラクター一貫性（all_pages モード） | テスター評価フォーム `characterConsistency` 項目 |
| 子ども似顔絵の維持（写真ありユーザー） | テスター評価フォーム `childLikeness` 項目 |
| 参照画像スタイルリーク（P5-3c 観点） | 目視確認：背景や構図が参照画像に引っ張られていないか |
| 全体的な「また作りたい」スコア | フィードバックフォーム `regenerate` 項目 |

---

## 7. 成功・失敗・停止基準

### 7.1 成功基準（Option C で達成を目指す状態）

| 条件 | 基準 |
|---|---|
| `fallbackPages / pageCount`（Step c 到達） | ≤ 10%（現行 Cohort B ベースライン ~87.5% からの大幅改善）|
| `completed` rate（全ページ成功） | ≥ 90%（Option C ではコンプリーション率の低下を許容しない）|
| `partial_completed` rate | ≤ 5%（ベースラインと同等以下）|
| テスター品質ギャップ評価 | 「ページとカバーの品質差が気になった」割合 < 30% |
| `duplicate_page_image_urls_detected` | ゼロ |
| Step b 到達ページ（参照画像なし pro_consistent）での成功率 | ≥ 80%（Step b が有効に機能していることの確認）|

### 7.2 失敗基準（実験失敗 → 次オプションへ）

| 条件 | 判断 |
|---|---|
| `fallbackPages / pageCount`（Step c 到達）が改善しない（≥ 50% のまま） | Option C Step b の実装を見直す→簡略プロンプトでも拒否が継続している可能性 |
| Step b でも安全性拒否が発生（参照 ID が Step a と同一） | 参照画像 URL 自体が問題の可能性→参照画像再生成フローを検討 |
| テスター「また作りたい」スコア低下（ベースライン比 -1.0 以上） | Option C 廃止 → 設計再検討 |

### 7.3 停止基準（実験即時中断）

| 条件 | アクション |
|---|---|
| `bookStatus=failed`（生成完全失敗）率 > 5% | 即時停止・PM 通知・ロールバック |
| `partial_completed` かつ 0 ページ成功の事例 ≥ 2 件 | 即時停止・原因調査 |
| 候補ゲートが一般ユーザーに適用されたことが確認された場合 | 即時停止 |

---

## 8. コスト管理計画

### 8.1 実験規模上限

| パラメーター | 上限 |
|---|---|
| 実験対象テスター数 | 最大 3 名（`generationOverride` 手動設定）|
| 実験期間 | 最長 7 日間（結果が出次第早期終了）|
| 1 テスターあたり実験対象書数 | 最大 3 冊（計 9 冊上限）|
| Option B: `page_image_failed` が多発した場合 | 3 冊時点で中間評価→続行判断 |

### 8.2 モデルコスト試算（参考）

| シナリオ | カバー | ページ/8p | 合計/冊（概算）|
|---|---|---|---|
| Baseline A（全成功） | pro_consistent ×1 | pro_consistent ×8 | 高 |
| Baseline A（7 fallback） | pro_consistent ×1 | pro_consistent ×2失敗×7 + klein_fast ×7 + pro_consistent ×1 | 中（pro 失敗分は無駄コスト）|
| Option B（全成功） | pro_consistent ×1 | pro_consistent ×8 | ベースラインより低（失敗プリコストなし）|
| Option B（7 page_failed） | pro_consistent ×1 | pro_consistent ×2失敗×7（失敗費）+ 成功 ×1 | 低（klein_fast 不使用）|
| Option C（全成功 2nd attempt） | pro_consistent ×1 | pro_consistent ×1失敗+simplified×1成功 ×8 | 中（retry コストあり）|
| Option D（openai_image_candidate） | openai ×1 | openai ×8 | 別途見積もり要 |

### 8.3 コスト超過防止

- `generationOverride` による手動ゲートを使用し、実験フラグなしの一般ユーザーへの適用を完全に防ぐ
- 実験開始前に PM が生成コスト上限を設定し、超えた時点で停止する
- `book_outcome` ログの `fallbackPages` / `completedPages` をリアルタイムで監視する

---

## 9. リスク評価

| リスク | 深刻度 | 可能性 | 軽減策 |
|---|---|---|---|
| Option B をテスターに誤適用する | 高 | 低 | Option B は内部診断専用と明記（§4）；`p5ModelUnification: "strict"` フラグを Cohort B テスターに付与しない |
| Option C Step b でも安全性拒否が継続する（参照画像 URL 自体が問題） | 中 | 低〜中 | Step b ではすでに参照画像を除外するため直接的な拒否は回避される見込み；万一継続する場合は参照画像再生成を検討 |
| カバーのレガシーパス（参照画像なし）との構造差が Option C でも品質差を生む | 中 | 低 | カバーパスのアダプター移行（`P4-cover` タスク）を将来検討；Step b 生成（参照画像なし）はカバーと同等のシンプルパスになる |
| Option C Step b（参照画像なし）で写真ありユーザーの似顔絵再現性が低下する | 中 | 中 | Step b は参照画像を除去して pro_consistent でリトライするため、子どもの似顔絵再現性は低下する。ただし Step c（klein_fast）への即時フォールバックより品質は上回る。テスターフィードバックの `childLikeness` 項目で実測する |
| Step b 適用によるページ生成時間増加（安全性拒否ページで +1 呼び出し） | 低 | 中 | 書全体の `durationMs` をモニタリング；許容範囲: 現行 203s + 約 10–25s/拒否ページ |
| Option D の OpenAI フォールバックなし設計でページ失敗率が上昇する | 中 | 中 | openai_image_candidate は失敗時に `image_failed`、book は `partial_completed`；受け入れ基準を事前合意 |
| 候補ゲート外のユーザーへ実験設定が漏洩する | 高 | 低 | `generationOverride` は管理者のみが Firestore 直書き可能；deploy 前チェックリストで確認 |
| P5-3f 実験と `simplified_scene`（P5-3c/d）実験が同時に有効になる | 低 | 低 | 2 つの `generationOverride` フラグを同一ユーザーに設定しない運用ルールを規定する |

---

## 10. 実装スケッチ（参考 — 現時点では実装しない）

> 以下は将来の実装タスクのための参考メモ。コード変更はこのドキュメントが PM に承認された後に別タスクとして実施する。

### Option B 実装ポイント

```typescript
// generate-book.ts — generatePageImageWithFallback 呼び出し前

const useStrictUnification =
  generationOverride?.p5ModelUnification === "strict" &&
  normalizedBookData.imageModelProfile === "pro_consistent";

// useStrictUnification が true の場合、fallback chain を pro_consistent のみに限定
// resolveImageFallbackProfiles をバイパスして ["pro_consistent"] を直接渡す
```

関連ファイル:
- `functions/src/generate-book.ts` — `generatePageImageWithFallback` 呼び出し箇所
- `functions/src/lib/image-model-policy.ts` — `resolveImageFallbackProfiles`（変更不要、呼び出し元で分岐）
- `src/lib/types.ts` — `generationOverride.p5ModelUnification` フィールド追加

### Option C 実装ポイント

```typescript
// Option C: 3 ステップ リトライ（参照画像起因の安全性拒否をバイパス）

// Step a: attempt 1 = 通常プロンプト + 参照画像あり + pro_consistent
//   → 成功: そのまま完了（現行と同品質）
//   → 失敗（安全性拒否等）: Step b へ

// Step b: attempt 2 = buildP5SimplifiedPagePrompt + 参照画像なし (inputImageUrls=[]) + pro_consistent
//   対象: 写真あり・なしを問わずすべてのユーザー（P5-3d の !hasReferenceImage ガードは引き継がない）
//   意図: 参照画像を除去することで安全性拒否トリガーをバイパスする
//   トレードオフ: 写真ありユーザーは Step b で似顔絵再現性が低下するが、
//                Step c（klein_fast）より pro_consistent 品質を維持できる
//   → 成功: pro_consistent 品質（参照画像なし）で完了（fallback_completed ではなく completed 扱い）
//   → 失敗: Step c へ

// Step c: attempt 3 = klein_fast（最終手段、現行フォールバック）
//   → 成功: fallback_completed（現行と同等の最終保険）

// 実装箇所: generatePageImageWithFallback（generate-book.ts）
// 追加ロジック: attempt 失敗後に pro_consistent の再試行パスを挿入
// 既存: resolveImageFallbackProfiles("pro_consistent") = ["pro_consistent", "klein_fast"]
// 変更案: ["pro_consistent", "pro_consistent_simplified", "klein_fast"] に相当する分岐を追加
```

### Firestore `generationOverride` 拡張案

```typescript
generationOverride?: {
  allowCandidateProfile?: boolean;
  bypassMonthlyLimit?: boolean;
  p5PageExperiment?: "simplified_scene";
  p5ModelUnification?: "strict" | "safer_retry";  // ← 新規（P5-3f 用）
};
```

---

## 11. 未解決事項

| 事項 | 優先度 | ステータス | 補足 |
|---|---|---|---|
| `pro_consistent` 失敗の `errorCode`（E005 / 4xx / 5xx） | ~~最高~~ | **✅ 解決済み** | 安全性拒否（E005 相当）と確定。全 14 失敗が同一クラス、タイムアウト・5xx・Quota ゼロ（§1.4）|
| 参照画像が安全性拒否のトリガーかどうか（写真なし vs 写真あり） | 中 | 調査中 | 当該書はすべてのページが参照画像を使用。写真ありユーザーでの失敗パターンは未観測。**Option C Step b は写真あり・なしを問わず参照画像を除去してリトライするため、失敗パターンの差は Step b 有効性の判定には影響しない** |
| Option C Step b（参照画像なし）での品質・一貫性・似顔絵再現性の実測 | 中 | 実験前 | `simplified_scene` 実験（P5-3c）で間接的に PASS 済み（写真なしケース）。写真ありユーザーの似顔絵再現性低下は Step b の既知トレードオフとして文書化済み（§4 Option C）。Step b 専用の品質評価は Option C 実験で取得 |
| カバーのレガシーパス（参照画像なし）を pages と揃えるべきか（`P4-cover`） | 低 | 将来検討 | Option C Step b はカバーと同等のシンプルパス。大きな差は縮まる見込み |
| Option B（Strict）を内部診断で実行する具体的な手順・タイミング | 低 | 将来 | Cohort B と無関係な内部テストアカウントで P5-3f-implement 後に実施 |

---

## 12. 次アクション

### 前提条件ステータス

| 前提条件 | ステータス |
|---|---|
| per-page 失敗 `errorCode` の確認 | **✅ 完了**（安全性拒否・E005 相当、参照画像トリガーと判断）|
| 根本原因に基づく推奨実験オプション決定 | **✅ 完了**（Option C に変更、§5 更新済み）|
| Cohort B 継続可否の判断 | **✅ 完了**（継続可、安全性拒否は当該書固有）|
| PM による Option C 優先の承認 | **✅ 完了**（2026-06-03）|

### 実装タスク（PM 承認後、別タスク P5-3f-implement として実施）

1. **必須**: `generatePageImageWithFallback` に Option C の 3 ステップリトライを実装する
2. **必須**: `generationOverride.p5ModelUnification: "safer_retry"` フラグを `src/lib/types.ts` に追加する
3. **必須**: 参照画像なし pro_consistent リトライの単体テストを追加する（P5-3d のテストパターンを踏襲）
4. **推奨**: 安全性拒否カスケード（同一拒否参照 ID の連続）を検出するログイベントを追加する
5. **推奨**: 新モニタリング指標（§6.1 追加行）を Cloud Logging クエリに反映する

---

## Appendix A: 実験対応表

| 実験 ID | Option | フォールバック | ゲートフラグ | 主目的 | 対象 |
|---|---|---|---|---|---|
| P5-3f-C | C — Safer Retry ★ | pro(通常) → pro(簡略) → klein_fast | `p5ModelUnification: "safer_retry"` | 安全性拒否バイパス + 品質維持 | **Cohort B（推奨 First）** |
| P5-3f-B | B — Strict ⚠️ | なし | `p5ModelUnification: "strict"` | 実失敗率・安全性拒否率の診断計測 | **内部テストのみ** |
| P5-3f-D-oai | D — OpenAI Candidate | なし（OpenAI only） | `allowCandidateProfile: true` + `imageModelProfile: "openai_image_candidate"` | 別モデルとのベンチマーク | 候補ゲート限定 |

## Appendix B: ベースラインログクエリ（参考）

```
# page_image_failed 詳細取得（特定 bookId 用）
jsonPayload.message = "generation_event"
AND jsonPayload.eventName = "page_image_failed"

# 全 book_outcome 取得（実験期間中）
jsonPayload.message = "generation_event"
AND jsonPayload.eventName = "book_outcome"

# カバー vs ページ プロファイル診断ログ
jsonPayload.message = "cover_vs_page_profile_diagnostic"
```

詳細クエリ例: `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` 参照
