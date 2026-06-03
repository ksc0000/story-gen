# P5-3f: カバー／ページ 画像モデル統一実験計画

> **Status**: Planning — docs only. No code changes, no deploy, no production default changes.
> **Created**: 2026-06-03
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
- 失敗理由は現行ログエクスポートでは確認不可（`page_image_failed` イベント未取得）；E005 コンテンツポリシーまたは Replicate API エラーが有力候補
- カバーは `pro_consistent` 品質・ページ 1–7 は `klein_fast` 品質 → ユーザーが知覚できる品質差が発生

### 1.2 現行フォールバック設計の制約

- 現行: `pro_consistent → klein_fast`（`resolveImageFallbackProfiles` in `image-model-policy.ts`）
- フォールバックはコンプリーション率を守るために設計されており、品質担保の目的はない
- `klein_fast` は最低コスト・最低品質モデルであり、`pro_consistent` とは画質が大きく異なる
- フォールバック発生時のページは `fallback_completed` ステータスになるが、ユーザーには理由が伝わらない
- 大量フォールバック（7/8 ページ等）が発生した場合、書全体として「低品質」と評価されるリスクがある

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

### Option B — Strict Profile Unification（厳格統一）

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
| デメリット | `partial_completed` 率が上昇する可能性；画像なしページが残る |
| 実装ポイント | `resolveImageFallbackProfiles("pro_consistent")` の書き換え、またはゲート付き条件分岐で fallback chain を空にする |
| ゲート | `generationOverride.allowCandidateProfile === true` + 新フラグ `p5ModelUnification: "strict"` |
| 実験リスク | 高（コンプリーション率低下の可能性）|

### Option C — Safer High-Quality Retry（安全優先 pro_consistent リトライ）

```
カバー:  pro_consistent（変更なし）

ページ:  pro_consistent + 通常プロンプト + 参照画像（attempt 1）
          → 失敗時: pro_consistent + 簡略プロンプト（simplified_scene 相当）+ 参照画像なし（attempt 2）
          → 失敗時: klein_fast（attempt 3 / 従来フォールバック、最終手段）
```

| 項目 | 内容 |
|---|---|
| 狙い | E005 等コンテンツポリシー失敗を簡略プロンプトで回避し、`pro_consistent` 品質を維持する |
| メリット | コンプリーション率を維持しながら `klein_fast` フォールバック発生率を減らす；`simplified_scene` 実験（P5-3c/d）の知見を活用できる |
| デメリット | 実装が複雑（リトライパスに別プロンプトビルダーが必要）；生成時間が若干増加；attempt 2 に pro_consistent コストが発生 |
| 実装ポイント | `generatePageImageWithFallback` にリトライパス追加；attempt 2 で `finalInputImageUrls=[]` + `buildP5SimplifiedPagePrompt` を呼ぶ |
| ゲート | `generationOverride.p5ModelUnification: "safer_retry"` |
| 実験リスク | 中（コンプリーション率は維持されやすいが生成コスト増の可能性）|

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

### Phase 1（推奨 First Experiment）: Option B — Strict Unification

**理由:**
- フォールバックを廃止することで、`pro_consistent` の**実失敗率**が直接観測できる
- 現状では `fallbackPages` だけが証拠だが、失敗の原因（E005 / 4xx / 5xx）は `page_image_failed` ログなしでは不明
- Option C の「安全なリトライパス」を設計するには、まず「何が失敗しているか」のデータが必要
- 候補ゲート（小規模コホート）で実行するため、コンプリーション率の低下リスクは限定的
- 実装範囲が最小（フォールバックチェーンを空にする条件分岐を追加するだけ）

**Phase 2（Option B の結果次第）:**
- **`fallbackRate < 10%` かつ `page_image_failed_rate < 5%`**: Option B を基本パスとして採用検討
- **`page_image_failed_rate >= 10%`**: Option C（Safer Retry）を実装し、E005 回避と品質維持を両立する経路を模索
- **原因が E005 content policy に集中**: Option D（OpenAI 候補）の比較実験に進む

---

## 6. 評価指標

### 6.1 定量指標（Cloud Logging / Firestore）

| 指標 | 取得元 | 目標方向 |
|---|---|---|
| `fallbackPages / pageCount` | `book_outcome` ログ | 減少 |
| `page_image_failed` count | `page_image_failed` イベント | 減少または同等 |
| `partial_completed` rate | `book_outcome.bookStatus` | Option B では一時増加を許容 |
| `completed` rate (8/8 pages) | `book_outcome.completedPages == totalPages` | 維持 |
| `imageDurationMs` p50 / p95 per page | PageDoc フィールド | Option C では若干増加を許容 |
| `imageAttemptCount` per page | PageDoc フィールド | 把握（比較基準） |
| `storyDurationMs` | `book_outcome` ログ | 変化なし（story は影響を受けない）|
| `durationMs` (book total) | `book_outcome` ログ | Option C では若干増加を許容 |
| `coverImageFallbackUsed` | BookDoc フィールド | 変化なし（カバーは変更なし） |
| `duplicate_page_image_urls_detected` | ログイベント | ゼロ維持 |
| E005 errorCode 比率 | `page_image_failed.errorCode` | 把握（原因特定のため）|

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

### 7.1 成功基準（Option B で達成を目指す状態）

| 条件 | 基準 |
|---|---|
| `fallbackPages / pageCount` | ≤ 10%（現行 Cohort B ベースラインの ~87.5% からの改善）|
| `completed` rate（全ページ成功） | ≥ 80%（Option B 試験期間中の暫定許容ライン）|
| テスター品質ギャップ評価 | 「ページとカバーの品質差が気になった」割合 < 30% |
| `duplicate_page_image_urls_detected` | ゼロ |

### 7.2 失敗基準（実験失敗 → 次オプションへ）

| 条件 | 判断 |
|---|---|
| `partial_completed` rate（全コホート平均） > 20% | Option B 廃止 → Option C |
| `page_image_failed_rate` > 25% | Option B 廃止 → 根本原因調査（E005 詳細分析）|
| テスター「また作りたい」スコア低下（ベースライン比 -1.0 以上） | Option B 廃止 → 再設計 |

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
| Option B でコンプリーション率が著しく低下する | 高 | 中 | 候補ゲートによる小規模実験、停止基準 §7.3 の即時適用 |
| E005 原因が特定できず Option C も失敗する | 中 | 中 | `page_image_failed` イベントを毎冊後に手動確認、errorCode 集計 |
| カバーのレガシーパス（参照画像なし）との構造差が Option C でも品質差を生む | 中 | 低 | カバーパスのアダプター移行（`P4-cover` タスク）を前提条件に追加することを将来検討 |
| `simplified_scene` リトライ（Option C attempt 2）がキャラクター一貫性を破壊する | 中 | 中 | 写真なしユーザー限定適用（P5-3d のガードロジック流用）|
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
// attempt 2 を "simplified_scene + 参照画像なし" で pro_consistent にリトライ
// P5-3d の hasReferenceImage ガードを流用し、写真なしユーザーのみ適用

// Step 1: attempt 1 = 通常プロンプト + 参照画像 + pro_consistent
// Step 2: 失敗時 attempt 2 = buildP5SimplifiedPagePrompt + 参照画像なし + pro_consistent
// Step 3: 失敗時 attempt 3 = klein_fast（従来フォールバック）
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

| 事項 | 優先度 | 補足 |
|---|---|---|
| `pro_consistent` が pages 1–7 で失敗した実際の `errorCode`（E005 / 4xx / 5xx） | 最高 | 実験設計の前提。次回生成時に `page_image_failed` イベントを必ず取得すること |
| カバーのレガシーパス（参照画像なし）を pages と揃えるべきか（`P4-cover`） | 中 | Option C/D の品質評価精度に影響する |
| `all_pages` + 写真なし vs 写真あり で失敗パターンが異なるか | 中 | Option C の attempt 2 設計に影響する |
| Option B でページが `image_failed` になった場合のユーザー向け再生成導線が十分か | 中 | Phase 6 「失敗ページ再生成導線（ユーザー向け）」との関係整理が必要 |

---

## 12. 次アクション

実験開始前の前提条件:

1. **必須**: 次回 pro_consistent 失敗発生時に `page_image_failed` イベントを含む Cloud Logging エクスポートを取得し、`errorCode` を確認する
2. **必須**: PM が実験対象コホート・上限冊数・停止基準を承認する
3. **推奨**: `P4-cover`（カバーのアダプター移行）の実施スケジュールを確認し、Option C/D の前提にするか判断する
4. **推奨**: Cohort B フィードバック #2 の `page_image_failed` ログを `gcloud logging read` で直接取得し、エラーコードを特定する

PM 承認後、別タスク（P5-3f-implement）として実装を開始する。

---

## Appendix A: 実験対応表

| 実験 ID | Option | フォールバック | ゲートフラグ | 主目的 |
|---|---|---|---|---|
| P5-3f-B | B — Strict | なし | `p5ModelUnification: "strict"` | 実失敗率計測 |
| P5-3f-C | C — Safer Retry | pro × 2 → klein_fast | `p5ModelUnification: "safer_retry"` | E005 回避 + 品質維持 |
| P5-3f-D-oai | D — OpenAI Candidate | なし（OpenAI only） | `allowCandidateProfile: true` + `imageModelProfile: "openai_image_candidate"` | 別モデルとのベンチマーク |

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
