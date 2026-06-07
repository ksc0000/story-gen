# AGENTS.md — story-gen (EhonAI)

> AI 絵本生成アプリ。Next.js 15 + Firebase (Hosting / Cloud Functions / Firestore / Storage) + Gemini + Replicate/FLUX

---

## ビルド・テスト・デプロイ

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build          # Next.js static export
npm run build:clean    # clean → build

# テスト (Vitest)
npm test               # src/ + functions/ 両方
npm run test:watch
npm run test:generation-guards   # candidate gate + event logger 統合テスト

# lint
npm run lint

# Firebase Hosting デプロイ（本番影響あり。必ずユーザー承認後に実行）
npm run deploy:hosting
```

### functions 単体テスト
```bash
cd functions && npm test
```

### Node バージョン注意
- Cloud Functions: **Node 20** (`functions/package.json` engines.node)
- ローカルルート: Node 24 (Next.js 側は問題なし)
- `functions/` を触る際は `cd functions && nvm use` で Node 20 に切り替えること

---

## Firebase Emulator

```bash
# ポート: Auth=9099, Firestore=8080, Functions=5001, Hosting=5000, Storage=9199, UI=4000
firebase emulators:start
```

Java インストール済み。`firestore.indexes.json` と `firestore.rules` はエミュレータに自動適用される。

---

## ディレクトリ構成

```
story-gen/
├── src/
│   ├── app/
│   │   ├── (app)/           # 認証済みルート
│   │   │   ├── home/        # ダッシュボード
│   │   │   ├── book/        # 絵本ビューア
│   │   │   ├── generating/  # 生成進捗 UI
│   │   │   ├── children/    # 子どもプロフィール
│   │   │   ├── create/      # 作成フロー (select-child → input → style → theme)
│   │   │   ├── onboarding/
│   │   │   └── admin/       # 管理パネル
│   │   └── (auth)/login/
│   ├── components/
│   ├── lib/                 # フロント共通ユーティリティ
│   └── __tests__/
├── functions/src/
│   ├── generate-book.ts     # メイン生成オーケストレーター (Firestoreトリガー)
│   ├── generate-child-character.ts
│   ├── regenerate-page-image.ts
│   ├── regenerate-cover-image.ts
│   ├── cleanup-stale-generation.ts
│   └── lib/
│       ├── gemini.ts              # Gemini API クライアント
│       ├── prompt-builder.ts      # Gemini システムプロンプト構築
│       ├── replicate-image-adapter.ts
│       ├── openai-image-adapter.ts
│       ├── image-provider.ts      # プロバイダー抽象化 (P3-15 完了)
│       ├── story-quality.ts       # ストーリー品質ゲート
│       ├── illustration-styles.ts # 11スタイル定義
│       └── age-reading-profile.ts
├── docs/                    # 設計ドキュメント・ランブック (51ファイル)
├── scripts/                 # スモークテスト・運用スクリプト
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

---

## Firebase 構成

| サービス | 設定 |
|---|---|
| Hosting | `out/` → SPA rewrite `/index.html` |
| Functions | Node 20、`functions/` |
| Firestore | `firestore.rules` + `firestore.indexes.json` |
| Storage | `storage.rules` |

### Composite Indexes
1. `books`: `userId` ASC + `createdAt` DESC
2. `templates`: `active` ASC + `order` ASC
3. `categoryGroups`: `active` ASC + `order` ASC

---

## 生成パイプライン概要

```
books/{id} create (Firestore トリガー)
  ↓
コンテンツフィルター → プラン確認 → Gemini ストーリー JSON 生成
  ↓
カバー画像生成 (Replicate / OpenAI)
  ↓
ページ画像生成 x 4/8/12 (並列, IMAGE_CONCURRENCY=2)
  ↓
Firestore 保存
```

### 作成モード（3種）

| モード | 概要 |
|---|---|
| `fixed_template` | テンプレートベース。テキスト・画像プロンプトとも事前定義。最速・安定 |
| `guided_ai` | アンケート回答 → Gemini がカスタムストーリー生成。中程度 |
| `original_ai` | フリー入力 → Gemini が完全生成。最も柔軟 |

### Gemini

- ライブラリ: `@google/generative-ai`
- モデル: `gemini-2.5-flash-lite`（第1候補）→ `gemini-2.5-flash` → `gemini-2.0-flash`（フォールバック）
- リトライ: 3回、指数バックオフ (1s + 500ms ジッター)
- **注意**: Gemini structured output (`ENABLE_RESPONSE_SCHEMA`) は本番非推奨 (P4-14決定: トークン切断の恐れ)

### 画像生成（Replicate / FLUX）

| プロファイル | モデル |
|---|---|
| `klein_fast` | flux-2-klein-9b |
| `klein_base` | flux-2-klein-9b-base |
| `pro_consistent` | flux-2-pro |
| `flux_kontext_pro` | flux-kontext-pro |
| `flux11_pro_candidate` | flux-1.1-pro (候補) |
| `openai_image_candidate` | DALL-E 3 (候補) |

タイムアウト: `IMAGE_GENERATION_TIMEOUT_MS`（デフォルト 120s）  
フォールバック: `pro_consistent` → `klein_fast`  
`partial_completed` ステータス: 一部ページ失敗でも完了扱い（個別再生成可）

---

## キャラクター一貫性

- モード: `cover_only` / `key_pages` / `all_pages`
- カバーと各ページでキャラクタービジュアルビブル + 参照画像（`character_reference`, `style_reference`）を使用
- 実験フラグ: `generationOverride.p5PageExperiment = "simplified_scene"` → カバーと同形式の短いプロンプト（キャラクタービブルなし、参照画像なし）

---

## Feature Flags（環境変数）

| 変数 | 説明 |
|---|---|
| `IMAGE_CONCURRENCY` | 並列画像生成数（デフォルト 2） |
| `IMAGE_GENERATION_TIMEOUT_MS` | 画像生成タイムアウト（デフォルト 120000） |
| `ENABLE_SCHEMA_REPAIR_RETRY` | JSON スキーマ修復リトライ実験 |
| `ENABLE_RESPONSE_SCHEMA` | Gemini structured output（本番非推奨） |
| `ENABLE_KLEIN_BASE` | klein_base モデル有効化 |
| `RESPONSE_SCHEMA_MODE` | `minimal` 等のスキーマ変形 |

### ユーザードキュメントの `generationOverride` フィールド

```typescript
generationOverride?: {
  allowCandidateProfile?: boolean;        // 候補プロファイルへのアクセス許可 (T6-59)
  bypassMonthlyLimit?: boolean;           // 月次クォータ無効化（開発用）
  p5PageExperiment?: "simplified_scene";  // P5-3c 実験
  p5ModelUnification?: "safer_retry";     // P5-3f Option C: Step b safer retry（候補ゲート）
}
```

セットアップスクリプト:
- `scripts/enroll-candidate-profile.js` — `allowCandidateProfile: true`
- `scripts/set-p5-page-experiment.js` — `p5PageExperiment: "simplified_scene"`

---

## テスト構成

- **テストフレームワーク**: Vitest 2.0
- **src/ テスト**: `src/__tests__/`（jsdom 環境）
- **functions テスト**: `functions/test/`（Node 環境、48ファイル）
  - `generate-book.test.ts` — メイン生成フロー
  - `candidate-gate.test.ts`, `image-model-policy.test.ts`, `entitlements.test.ts` — ゲート系
  - `story-quality.test.ts`, `content-filter.test.ts` — 品質・安全系
  - `slo-metrics.test.ts`, `slo-snapshot.test.ts` — SLO 計測系

変更後は必ず `npm test` でパス確認すること。

---

## スモークテスト・運用スクリプト

```bash
npm run smoke:create-books    # テスト絵本作成
npm run smoke:monitor         # 生成監視
npm run smoke:inspect         # 結果検査
npm run report:generation-slo # SLO レポート
```

---

## Jules / AI エージェント ワークフロー

### PR ルール

| ルール | 内容 |
|---|---|
| サイズ上限 | diff 150 行以内（src/ + functions/ 合計） |
| スコープ | 1 Issue = 1 PR。複数 Issue を混在させない |
| ドラフト | 実装完了後に Draft → Ready for review に変更する |
| CI 必須 | `npm test` + `npm run lint` + `npm run build` がすべてパスすること |
| Node バージョン | functions/ 変更時は Node 20 で確認すること |

### レビューフロー（二段階）

```text
Jules PR 作成
  ↓ CI パス確認
  ↓ request-ai-review ラベル追加（human または Jules）
  ↓ @codex review（コード正確性・テスト漏れ・スコープ逸脱）
  ↓ Codex LGTM または token limit 到達の場合
  ↓ @claude review（設計・保守性・プロダクト一貫性）—— 自動トリガー
  ↓ human merge
```

Codex がブロッキング指摘を出した場合は Claude は自動トリガーされない。Jules が修正してから再度 `request-ai-review` ラベルを追加すること。

### Jules 禁止操作

- `firebase deploy` / `firebase functions:deploy` などのデプロイコマンド
- `.env.local` / service account JSON / API キーへの変更・コミット
- `firestore.rules` / `firestore.indexes.json` の変更（セキュリティルール変更は human が行う）
- `main` への直接コミット
- PR のマージ
- 複数 Issue にまたがる大規模リファクタリング
- `package.json` の依存関係追加（要 human 承認）

---

## 安全ルール

- `firebase deploy`・本番影響操作はユーザー承認後のみ実行
- `firestore.rules` / `firestore.indexes.json` の変更も承認後に適用
- `.env.local` / service account JSON / API キーはコミット・表示しない
- `main` への直接コミット禁止。必ず feature ブランチ経由
