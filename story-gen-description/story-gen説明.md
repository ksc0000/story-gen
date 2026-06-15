# story-gen / EhonAI 説明書

> 自動生成日: 2026-06-15（定期実行タスクによる更新）
> 解析対象 commit: `1ebade32fe33864dba2dc00032b53537e5058dda`（ローカル main、ネットワーク制限のため origin への fetch は失敗。詳細は update-log.md 参照）

---

## 1. 概要

story-gen（プロダクト名: **Ehoria** / 旧名 EhoNAI）は、子ども一人ひとりに合わせたオリジナル絵本を AI で生成する Web アプリケーション。Next.js 15（静的エクスポート）をフロントエンドとし、Firebase（Hosting / Cloud Functions / Firestore / Storage）をバックエンドに、ストーリー生成に Google Gemini、挿絵生成に Replicate（FLUX系モデル）/ OpenAI 画像モデルを利用する。

リポジトリ: https://github.com/ksc0000/story-gen
解析時点のブランチ: `main`

---

## 2. プロダクトの目的

`docs/PRODUCT_ROADMAP.md` および `product-brief-20260416-120000.md` によれば、目的は「子どもの名前・年齢・性格・好きなものなどの情報をもとに、AIが世界に一冊だけのオリジナル絵本（テキスト＋挿絵）を自動生成し、Webで読める形で届けること」。

主な利用シーンとして:
- 親が子どものプロフィール（名前・年齢・性格・好きなもの等）を登録
- テンプレート選択・AIおまかせ・自由入力のいずれかで絵本のテーマを決定
- 4/8/12ページの絵本をAIが自動生成
- 生成後はWeb上のビューアでページめくり形式で読める

マネタイズ方向性として `free` / `standard_paid` / `premium_paid` の3プラン体系と、単品購入（クレジット制）が `docs/PRODUCT_ROADMAP.md` Phase 5（Monetization）として位置づけられている。

---

## 3. 主な機能

`docs/PRODUCT_ROADMAP.md`「0. 現在の到達点」に基づく実装済み機能（要約）:

- 3種類の作成モード: `fixed_template`（テンプレートベース）/ `guided_ai`（アンケート+自由入力）/ `original_ai`（フリー入力フル生成）
  - ※ `docs/ai-loop/AI_STATE.json` の PR #342 により、AIモードは `guided_ai` に統合（オプションで自由入力可）
- 4/8/12ページの絵本生成（テンプレートは8/12ページバリアントあり）
- Gemini によるストーリーJSON一括生成（1冊分をまとめて生成）
- `storyQualityReport`（品質ゲート）・`premium` story rewrite pass（本文磨き直し）
- `styleBible` によるイラストスタイル一貫性制御（イラストスタイルは `functions/src/lib/illustration-styles.ts` に12種定義: soft_watercolor / fluffy_pastel / crayon / flat_illustration / anime_storybook / classic_picture_book / toy_3d / paper_collage / pencil_sketch / colorful_pop / watercolor / flat）
- recurring character reference（キャラクター一貫性のための参照画像生成、premium/qualityモード）
- 画像生成タイムアウト＋フォールバック（`pro_consistent` → `klein_fast`、現在360秒）
- `partial_completed` ステータス（一部ページ失敗でも全体failedにしない）＋ ユーザー向けページ再生成導線
- 子どもプロフィール（写真アップロード対応）、アバター非同期生成
- 「なかよし」コンパニオンキャラクター作成・絵本への統合（PR #246, #247, #251 等）
- 本棚UI（作成済み絵本一覧、PR #343）、サンプル絵本ギャラリー（PR #361）
- 共有URL（公開読み取り専用ビュー、Issue #68 / PR #204）
- Stripe Checkout によるサブスクリプション課金、単品購入＋クレジット制（PR #351）
- フィードバック送信UI（PR #355）
- Admin機能: Quality Review UI（Story/Illustration/Character/Personalization/Safetyスコア、ルーブリック定義済み）、SLOダッシュボード、画像生成使用状況モニタリング（PR #386）、プロバイダーコスト比較ダッシュボード（PR #394）、キャラクター一貫性診断UI（PR #388）、テンプレート生成UI

未実装（roadmap上）: PDF出力、音声読み聞かせ、印刷注文、provider比較A/Bテスト、delete account/child profile、admin operation audit log、APIレベルrate limit、Replicate webhook管理 など。

---

## 4. 技術スタック

`package.json` より:

- フレームワーク: Next.js `^15.1.6`（静的エクスポート `next build`）、React `^18.3.1`
- UI: `@base-ui/react`, `shadcn ^4.3.0`, `tailwindcss ^3.4.14`, `tailwind-merge`, `tw-animate-css`, `lucide-react`, `framer-motion`, `lottie-react`
- バックエンド/インフラ: `firebase ^12.12.0`（Hosting / Cloud Functions / Firestore / Storage）
- AI: Gemini（`@google/generative-ai`、functions側）、Replicate（FLUX系）、OpenAI 画像API
- テスト: Vitest `^2.1.9`、`@testing-library/react`, `jsdom`
- Lint: ESLint `^9.17.0` + `eslint-config-next`, `typescript-eslint`
- 言語: TypeScript `^5.7.2`

Cloud Functions側 (`functions/package.json`) の `engines.node` は **`20`**。ローカルルートは Node 24（Next.js側は問題なし、`functions/`作業時は `nvm use` でNode 20に切替が必要、`CLAUDE.md`/`AGENTS.md`に明記）。

---

## 5. ディレクトリ構成

```
story-gen/
├── src/
│   ├── app/
│   │   ├── (app)/                       # 認証済みルート
│   │   │   ├── home/                    # ダッシュボード
│   │   │   ├── book/                    # 絵本ビューア
│   │   │   ├── bookshelf/               # 本棚UI
│   │   │   ├── gallery/                 # サンプル絵本ギャラリー
│   │   │   ├── generating/              # 生成進捗UI
│   │   │   ├── children/ , children/edit
│   │   │   ├── companions/ , companions/create , companions/profile
│   │   │   ├── create/                  # 作成フロー
│   │   │   │   ├── ai-brief/ , input/ , photo-upload/
│   │   │   │   ├── select-child/ , style/ , theme/
│   │   │   ├── feedback/
│   │   │   ├── pricing/ , pricing/success
│   │   │   ├── onboarding/ , onboarding/child
│   │   │   └── admin/
│   │   │       ├── book-quality-review/
│   │   │       ├── image-model-tests/
│   │   │       ├── login/
│   │   │       └── template-generator/
│   │   ├── (auth)/login/
│   │   ├── share/                       # 公開共有ビュー
│   │   └── fonts/
│   ├── components/
│   ├── lib/
│   └── __tests__/                       # 17項目
├── functions/src/
│   ├── generate-book.ts                 # メイン生成オーケストレーター (Firestoreトリガー)
│   ├── generate-child-character.ts
│   ├── generate-avatar-job.ts
│   ├── generate-companion-image.ts
│   ├── generate-story-pitch.ts
│   ├── generate-template.ts
│   ├── regenerate-page-image.ts
│   ├── regenerate-cover-image.ts
│   ├── update-book-title.ts
│   ├── delete-book.ts
│   ├── auto-review.ts
│   ├── bootstrap-admin.ts
│   ├── cleanup-expired.ts
│   ├── cleanup-stale-generation.ts
│   ├── reset-monthly-quota.ts
│   ├── save-daily-slo-snapshot.ts / save-weekly-slo-snapshot.ts
│   ├── seed-templates.ts
│   ├── stripe-checkout.ts
│   ├── submit-app-feedback.ts
│   ├── test-image-models.ts
│   ├── config/ , controllers/ , prompts/ , templates/
│   └── lib/
│       ├── gemini.ts                    # Gemini APIクライアント
│       ├── prompt-builder.ts            # Geminiシステムプロンプト構築
│       ├── prompt-analyzer.ts
│       ├── replicate.ts / replicate-image-adapter.ts
│       ├── openai-image.ts / openai-image-adapter.ts
│       ├── image-adapter-factory.ts
│       ├── image-provider.ts            # プロバイダー抽象化 (P3-15)
│       ├── image-model-policy.ts
│       ├── image-storage-uploader.ts
│       ├── story-quality.ts             # ストーリー品質ゲート
│       ├── story-response-schema.ts
│       ├── illustration-styles.ts       # 12スタイル定義
│       ├── age-reading-profile.ts
│       ├── avatar-generation.ts
│       ├── content-filter.ts
│       ├── entitlements.ts
│       ├── plans.ts                     # プラン定義 (free/standard_paid/premium_paid)
│       ├── usage.ts
│       ├── slo-metrics.ts / slo-snapshot.ts
│       ├── stale-detection.ts
│       ├── style-exposure.ts
│       ├── llm-json-repair.ts
│       ├── auto-review-llm.ts / auto-review-schema.ts
│       ├── generation-event-logger.ts
│       ├── provider-error-classifier.ts
│       ├── firestore-sanitize.ts
│       └── types.ts
├── functions/test/                      # 60ファイル（Vitest, Node環境）
├── docs/                                 # 設計ドキュメント・ランブック（60ファイル以上）
│   ├── ai-loop/                          # AI Loop運用（AI_STATE.json, NEXT_TASK.md 等）
│   ├── qa/ , reliability/ , smoke-results/ , template-smoke-results/ , superpowers/
├── scripts/                              # スモークテスト・運用スクリプト
├── firestore.rules / firestore.indexes.json / storage.rules
└── firebase.json
```

---

## 6. フロントエンド構成

- Next.js 15 の App Router（`src/app`）構成。`(app)` グループは認証済みルート、`(auth)` グループはログイン。
- 作成フローは `create/select-child → create/input または create/ai-brief → create/style → create/theme` の多段ステップ（PR #224, #295, #301 等でUX改善が継続的に実施）。
- 生成中は `generating/` で進捗表示。
- 完成した絵本は `book/` でページめくり形式（Framer Motion `drag="x"` によるスワイプ対応、PR #349）。
- `bookshelf/` で作成済み絵本一覧、`gallery/` でサンプル絵本ギャラリー。
- `companions/` で「なかよし」キャラクター（companion）の作成・プロフィール管理。
- `share/` は公開読み取り専用の絵本共有ビュー（Issue #68）。
- `admin/` 配下に管理者向けダッシュボード群（品質レビュー、画像モデルテスト、テンプレート生成、ログイン）。
- UIライブラリは shadcn/ui ベース＋Tailwind CSS、アニメーションは Framer Motion / lottie-react。

---

## 7. Firebase / Backend 構成

| サービス | 設定 |
|---|---|
| Hosting | `out/`（Next.js静的エクスポート） → SPA rewrite `/index.html` |
| Functions | Node 20、`functions/`、Firestoreトリガー中心 |
| Firestore | `firestore.rules` + `firestore.indexes.json` |
| Storage | `storage.rules` |

### Composite Indexes（`firestore.indexes.json`、CLAUDE.md記載）
1. `books`: `userId` ASC + `createdAt` DESC
2. `templates`: `active` ASC + `order` ASC
3. `categoryGroups`: `active` ASC + `order` ASC

### スケジュール実行（functions）
- `save-daily-slo-snapshot.ts` / `save-weekly-slo-snapshot.ts`: SLOスナップショット（Daily 03:00 JST / Weekly Mon 03:15 JST）
- `cleanup-stale-generation.ts`: stale generation cleanup（Daily 03:30 JST）
- `reset-monthly-quota.ts`: 月次クォータリセット
- `cleanup-expired.ts`: 期限切れデータクリーンアップ

### 課金
- `stripe-checkout.ts`: Stripe Checkoutによるサブスクリプション課金、単品購入・クレジット制（PR #351）

---

## 8. AI画像生成・テンプレート生成の構成

### 生成パイプライン（CLAUDE.md より）

```
books/{id} create (Firestoreトリガー: generate-book.ts)
  ↓
コンテンツフィルター → プラン確認 → Gemini ストーリーJSON生成
  ↓
カバー画像生成 (Replicate / OpenAI)
  ↓
ページ画像生成 x 4/8/12 (並列, IMAGE_CONCURRENCY=2)
  ↓
Firestore保存
```

### Gemini
- ライブラリ: `@google/generative-ai`
- モデル: `gemini-2.5-flash-lite`（第1候補）→ `gemini-2.5-flash` → `gemini-2.0-flash`（フォールバック）
- リトライ: 3回、指数バックオフ（1s + 500msジッター）
- `ENABLE_RESPONSE_SCHEMA`（Gemini structured output）は **本番非推奨**: Phase 4（P4-1〜P4-17）で検証した結果、`docs/PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md` にてロールアウト断念が決定済み。代わりにプロンプト強化 + `validateStory()` + parse diagnosticsで対応。

### 画像生成（Replicate / FLUX / OpenAI）

| プロファイル | モデル |
|---|---|
| `klein_fast` | flux-2-klein-9b |
| `klein_base` | flux-2-klein-9b-base |
| `pro_consistent` | flux-2-pro |
| `flux_kontext_pro` | flux-kontext-pro |
| `flux11_pro_candidate` | flux-1.1-pro（候補） |
| `openai_image_candidate` | DALL-E 3（候補） |

- タイムアウト: `IMAGE_GENERATION_TIMEOUT_MS`（PR #384により120s→360sへ3倍化、デフォルト変更済み）
- フォールバック: `pro_consistent` → `klein_fast`
- `partial_completed` ステータス: 一部ページ失敗でも完了扱い（個別再生成可、PR #347でユーザー向け再生成導線実装）
- 画像プロバイダーは `image-provider.ts` / `image-adapter-factory.ts` で抽象化（P3-15, PR #241/#250で各経路をアダプター化）

### キャラクター一貫性
- モード: `cover_only` / `key_pages` / `all_pages`
- カバー・各ページでキャラクタービジュアルビブル＋参照画像（`character_reference`, `style_reference`）を使用
- 実験フラグ `generationOverride.p5PageExperiment = "simplified_scene"`: カバーと同形式の短いプロンプト（キャラクタービブルなし、参照画像なし）
- Admin Character Consistency Diagnostics UI（PR #388）でキャラ一貫性スコアを可視化

### Feature Flags（環境変数、CLAUDE.md）

| 変数 | 説明 |
|---|---|
| `IMAGE_CONCURRENCY` | 並列画像生成数（デフォルト2） |
| `IMAGE_GENERATION_TIMEOUT_MS` | 画像生成タイムアウト（デフォルト120000、PR #384で360000相当に変更） |
| `ENABLE_SCHEMA_REPAIR_RETRY` | JSONスキーマ修復リトライ実験 |
| `ENABLE_RESPONSE_SCHEMA` | Gemini structured output（本番非推奨、断念決定済み） |
| `ENABLE_KLEIN_BASE` | klein_baseモデル有効化 |
| `RESPONSE_SCHEMA_MODE` | `minimal`等のスキーマ変形 |

---

## 9. 開発・検証コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build          # Next.js static export
npm run build:clean    # clean → build

# テスト
npm test                          # src/ + functions/ 両方
npm run test:watch
npm run test:generation-guards    # candidate gate + event logger 統合テスト
npm run test:slo-report

# Lint
npm run lint

# 品質ゲート一式
npm run check:phase2   # guard:hygiene + report:generation-slo:self-test + test:slo-report + test:generation-guards

# スモークテスト
npm run smoke:create-template-books
npm run smoke:create-nonfixed-book
npm run smoke:monitor
npm run smoke:inspect
npm run smoke:verify-images
npm run e2e:visual-verify
npm run report:generation-slo
```

functions単体テスト:
```bash
cd functions && npm test
```

Firebase Emulator:
```bash
firebase emulators:start
# ポート: Auth=9099, Firestore=8080, Functions=5001, Hosting=5000, Storage=9199, UI=4000
```

---

## 10. デプロイ手順

```bash
npm run deploy:hosting   # build:clean → firebase deploy --only hosting
```

- 本番影響操作（`firebase deploy`、`firestore.rules`/`firestore.indexes.json`変更）は**必ずユーザー承認後に実行**（CLAUDE.md / AGENTS.md 記載の安全ルール）。
- `main`への直接コミットは禁止。feature ブランチ経由（PRベース、AI Loopによる自動運用が `docs/ai-loop/` に記録されている）。

---

## 11. 現在の開発状況

`docs/ai-loop/AI_STATE.json` (`current_phase: "5"`) および `docs/PRODUCT_ROADMAP.md` より:

- **Phase 1（Reliability First）**: Complete（2026-06-12）。Production smoke evidence確認済み（`docs/PRODUCTION_SMOKE_RESULTS.md`）。
- **Phase 2（Story & Illustration Quality）**: Admin Quality Review UI、manual quality score保存、quality review history、filter/sort、batch review workflow、Quality Trend Dashboard、Rewrite/Regeneration Recommendation 等が「done」。
- **Phase 3（Template Mode）**: P3-15s（ページ生成のProvider抽象化）COMPLETE。カバー画像・キャラ参照は P4 で追跡。
- **Phase 4（Gemini JSON Hardening）**: P4-1〜P4-17 すべてCOMPLETE。クローズ済み（`docs/PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md`）。responseSchemaは本番導入しない方針確定。
- **Phase 5（Monetization / 本番トラフィック）**: ソフトローンチ計画（P5-1）完了、Cohort A/B実行（PR #256等）、SJ/IMアラートポリシー有効化（P2-10b-enable, 2026-06-09 COMPLETE）。
- **Phase 6（User Experience）**: 本棚UI・絵本閲覧UI・swipeナビゲーション・cover/title spread・opening narration は実装済み。animated page transition、失敗ページ再生成導線（ユーザー向け）、作成履歴表示、feedback送信UIは roadmap上「一部 [ ]」表記だが、`completed_tasks`一覧ではPR #347（再生成フロー）, #349（page transition）, #355（feedback UI）が merged 済みと記録されており、roadmap側の更新が追従していない可能性がある（要確認）。

直近の `completed_tasks`（`AI_STATE.json`末尾、新しい順）:
- PR #398: スタイル選択サンプルを本番パイプライン(flux-2-pro+styleBible)で作り直し
- PR #397: 絵本のページごとにスタイル・背景がバラバラになる不具合修正
- PR #396: User-Editable Book Title
- PR #394: Provider Cost Comparison Dashboard (Admin UI)
- PR #392: プラン別ページ数制限（UIロック＋日本語メッセージ込み）
- PR #390: Quality Review Rubrics定義（Story/Illustration/Character/Personalization/Safety）
- PR #388: Admin UI for Character Consistency Diagnostics

`failed_tasks` / `in_progress_tasks` はいずれも空（2026-06-15時点）。

---

## 12. 直近の重要なコミットまたは変更点

`git log --oneline -15`（ローカルmain、HEAD = `1ebade32`）:

```
1ebade32 chore(ai-loop): mark PR #388 completed in AI_STATE
04debacd Implement Admin UI for Character Consistency Diagnostics (#388)
60d3b596 chore(ai-loop): mark PR #394 completed in AI_STATE
def91a8f Implement Provider Cost Comparison Dashboard in Admin UI (#394)
aa71405d chore(ai-loop): mark PR #386 completed in AI_STATE
a6ffc0d5 Implement Image Generation Usage Monitoring Dashboard (#386)
a66f0af7 chore(ai-loop): mark PR #390 completed in AI_STATE
e6ee5fd9 docs: define detailed 1-5 quality review rubrics (#390)
25689832 docs: update NEXT_TASK.md via AI Loop Controller
0d91424a chore(ai-loop): mark PR #392 completed in AI_STATE
58cc10d1 プラン別ページ数制限（UIロック＋日本語メッセージ込み） (#392)
03350d8e chore(ai-loop): mark PR #396 completed in AI_STATE
1429689f feat: Implement user-editable book title (#396)
08f099ee docs: update NEXT_TASK.md via AI Loop Controller
defb7aaa chore(ai-loop): mark PR #398 completed in AI_STATE
```

開発は「AI Loop Controller」による自動PR生成 → mark completed in AI_STATE のサイクルで運用されている（`docs/ai-loop/AI_AGENT_LOOP_DESIGN.md`参照）。

---

## 13. 未完了タスク・注意点

- **ネットワーク制限**: 本タスクの実行環境からは `github.com` へのアクセスがプロキシで `403` 拒否され、`git fetch origin` が失敗した。このため本ドキュメントはローカルmain（HEAD `1ebade32`）の内容に基づいており、origin/mainの最新状態とは異なる可能性がある。詳細は `update-log.md` を参照。
- **未コミットの未追跡ファイル**（リポジトリ作業ツリー、本タスクでは変更せず）:
  - `docs/qa/image-quality-test-procedure.md`
  - `scripts/generate-species-preview-images.js`
  - `story-gen-description/`（本ドキュメント自体を含む出力フォルダ。過去の定期実行が本来の出力先ではなくリポジトリ直下に書き込んだもの）
- `docs/ai-loop/NEXT_TASK.md` には現在「Implement PDF Output Feature Design Document」が記載されているが、本文は冒頭のみで詳細未確認（roadmap上もPDF出力は未実装項目）。
- `docs/PRODUCT_ROADMAP.md` Phase 6セクションの `[ ]`/`[x]` 表記が、`AI_STATE.json`の`completed_tasks`（PR #347, #349, #355等）と一部食い違っている可能性があり、roadmap文書の更新漏れの疑いがある（リポジトリ上の事実としてはAI_STATE側がより新しい）。
- Phase 5（Monetization）セクションは roadmap上「(既存内容維持)」のみの記載で詳細が省略されている。

---

## 14. 次にやるべきこと

`docs/ai-loop/NEXT_TASK.md` の冒頭に基づくと、次タスクは **PDF出力機能の設計ドキュメント作成**（"Implement PDF Output Feature Design Document"）。docs-first制約に基づき、まず設計ドキュメントを作成するフェーズ。

その他、roadmap上で優先度が高いとされていた項目（"Now"セクション）:
- IMG-002 verification（fixed_template 6本での背景リーク再発有無の継続確認）
- REF-001（neutral character reference image / identity-only reference strategy設計）
- Phase T2-C: テンプレート9〜10追加（learning + favorite-worlds）

加えて、本タスク運用上の確認事項として:
- 実行環境からのgithub.comアクセス制限の解消（次回pull成功のため）
- 出力先パス（`/Users/shunsuke/Documents/story-gen-description/`）へのアクセス権限確認

---

## 15. 参照した主要ファイル

- `CLAUDE.md`, `AGENTS.md`
- `package.json`, `functions/package.json`
- `docs/PRODUCT_ROADMAP.md`
- `docs/ai-loop/AI_STATE.json`, `docs/ai-loop/NEXT_TASK.md`
- `docs/PHASE4_GEMINI_JSON_HARDENING_CLOSURE.md`（参照のみ、内容詳細は本文中で要約）
- `functions/src/lib/illustration-styles.ts`
- `functions/src/lib/plans.ts`
- `functions/src/lib/image-model-policy.ts`
- `src/app` ディレクトリ構成（find結果）
- `functions/src` および `functions/src/lib` ディレクトリ構成
- `git log`（直近15件）, `git status`
