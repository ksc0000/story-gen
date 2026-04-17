# EhoNAI（えほんAI）Web MVP 設計書

## 概要

AIで子ども向けオリジナル絵本を生成するWebアプリケーション。子どもの名前・テーマ・好みを入力するだけで、LLMが物語を生成し、画像生成AIが挿絵を作成する。Web MVPでPMF検証後、Flutterでネイティブアプリ化する。

**UVP**: 「我が子が主人公になれる絵本を、誰でも5分で作れる。AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。」

---

## 開発アプローチ

Web MVP → PMF確認後にFlutterネイティブ化。

- **フェーズ1（本設計書の対象）**: Next.jsでWeb版をリリース、ストア審査不要で素早くPMF検証
- **フェーズ2**: PMF確認後（Day30リテンション15%以上、NPS 30以上）にFlutterでiOS/Android化

---

## 技術スタック

| 項目 | 選定 | 理由 |
|---|---|---|
| フロントエンド | Next.js 15 (App Router) | SSR/SSGでランディングSEO対応 + SPAライクな生成フロー |
| スタイリング | Tailwind CSS | ユーティリティファーストで高速開発、レスポンシブ対応が容易 |
| UIライブラリ | shadcn/ui | Tailwindベース、必要なコンポーネントだけ追加、カスタマイズ自由 |
| バックエンド | Firebase (Cloud Functions) | 認証・DB・ストレージ・ホスティング一体。サーバーレスでスケーリング自動 |
| データベース | Firestore | リアルタイムリスナーで生成進捗を即時反映 |
| ストレージ | Cloud Storage for Firebase | 生成画像の保存 |
| 認証 | Firebase Auth (Google Sign-In) | MVP段階はGoogleログインのみ。ネイティブ化時にApple Sign-In追加 |
| LLM | Gemini (via Vertex AI / Firebase Extensions) | Firebase連携がスムーズ、コスト有利、安全フィルタ標準搭載 |
| 画像生成 | Replicate API (FLUX Schnell) | 低コスト、高速、子ども向け絵本スタイルとの相性良好 |
| 状態管理 | React hooks + Firestore リアルタイムリスナー | 外部ライブラリ不要 |
| ホスティング | Firebase Hosting | Firebase一体でシンプル |

LLM-agnostic な設計とし、Gemini以外（Claude / GPT-4o）への切り替えも可能にする。

---

## 画面構成と画面遷移

### 全8画面

```
① ランディング → ② Googleログイン → ③ ホーム（本棚）
                                          │
                                    ④ テーマ選択
                                          │
                                    ⑤ 基本入力
                                          │
                                    ⑥ スタイル選択
                                          │
                                    ⑦ 生成中（リアルタイム進捗）
                                          │
                                    ⑧ 絵本ビューア → ③ ホームへ戻る
```

### 各画面の詳細

**① ランディング**
- キャッチコピー + サンプル絵本表示
- 「無料で絵本を作る」CTAボタン
- サービスの特徴3点紹介

**② Googleログイン**
- Firebase Auth によるGoogleログイン

**③ ホーム（本棚）**
- 生成済み絵本をカード形式で一覧（表紙サムネイル + タイトル + 作成日）
- 保存期限の残り日数表示（無料ユーザー）
- 「新しい絵本を作る」ボタン
- 月間残り生成数の表示（「今月あと2冊作れます」）

**④ テーマ選択**
- 6〜8テンプレートをカード形式で表示
- ステップインジケーター（1/3）

**⑤ 基本入力**
- 必須: 子どもの名前
- 「もっとカスタマイズ」展開ボタンで任意項目を表示:
  - 年齢
  - 好きなもの（動物/乗り物等）
  - ページ数（短い4p / ふつう8p / 長い12p）
  - 子どもに教えたいこと
  - 再現したい思い出
- ステップインジケーター（2/3）

**⑥ スタイル選択**
- 3つの挿絵スタイルから選択:
  - 水彩画風（例: いわさきちひろ、ぐりとぐら）
  - フラットイラスト風（例: ミッフィー、しろくまちゃん）
  - クレヨン/パステル風（例: はらぺこあおむし、ノンタン）
- 各スタイルに代表的な絵本の例を表示
- ステップインジケーター（3/3）

**⑦ 生成中**
- ページ毎の進捗バー
- 完成したページのプレビューをリアルタイム表示
- 生成中のアニメーション演出

**⑧ 絵本ビューア**
- PC: 見開き2ページ表示（左:挿絵 / 右:テキスト）
- スマホ: 1ページ表示、左右スワイプで進む
- ブレークポイント: `md`(768px)でPC/スマホ切替
- 「本棚に戻る」「もう一冊作る」ボタン

---

## アーキテクチャ: キュー駆動型

```
ブラウザ(Next.js) → Firebase Auth → Firestore（生成リクエスト書き込み）
                                        ↓ onCreateトリガー
                                    Cloud Functions
                                        ├→ Gemini API → 物語生成
                                        └→ Replicate API → 挿絵生成（ページ毎）
                                    → Firestoreステータス更新 ← ブラウザがリアルタイム監視
```

HTTPタイムアウトの問題を回避し、ページ毎の段階的表示とリトライが可能。

---

## データモデル（Firestore）

### users/{userId}

| フィールド | 型 | 説明 |
|---|---|---|
| displayName | string | 表示名 |
| email | string | メールアドレス |
| plan | "free" \| "premium" | プラン |
| createdAt | timestamp | 登録日時 |
| monthlyGenerationCount | number | 当月の生成回数（月初リセット） |

### books/{bookId}

| フィールド | 型 | 説明 |
|---|---|---|
| userId | string | 所有者 |
| title | string | LLMが生成したタイトル |
| theme | string | テンプレートID |
| style | "watercolor" \| "flat" \| "crayon" | 挿絵スタイル |
| pageCount | 4 \| 8 \| 12 | ページ数 |
| status | "generating" \| "completed" \| "failed" | 生成ステータス |
| progress | number | 生成済みページ数 |
| input.childName | string | 子どもの名前（必須） |
| input.childAge | number? | 年齢（任意） |
| input.favorites | string? | 好きなもの（任意） |
| input.lessonToTeach | string? | 教えたいこと（任意） |
| input.memoryToRecreate | string? | 再現したい思い出（任意） |
| createdAt | timestamp | 作成日時 |
| expiresAt | timestamp \| null | 保存期限（無料: 作成日+30日 / 有料: null） |

### books/{bookId}/pages/{pageNumber}

| フィールド | 型 | 説明 |
|---|---|---|
| pageNumber | number | ページ番号 |
| text | string | 物語テキスト |
| imageUrl | string | Cloud Storage上の画像URL |
| imagePrompt | string | 画像生成プロンプト（デバッグ用） |
| status | "pending" \| "generating" \| "completed" \| "failed" | ページ生成ステータス |

### templates/{templateId}

| フィールド | 型 | 説明 |
|---|---|---|
| name | string | テーマ名 |
| description | string | 説明文 |
| icon | string | 絵文字アイコン |
| order | number | 表示順 |
| systemPrompt | string | LLMに渡すプロンプトテンプレート |
| active | boolean | 表示/非表示 |

---

## 絵本生成パイプライン

### フロー

1. ユーザーが「絵本を作る」を押下
2. Firestoreに`books`ドキュメント作成（`status: "generating"`）
3. `onCreate`トリガーでCloud Function `generateBook`が発火
4. **物語生成**: Gemini APIに テーマ + 子ども情報 + ページ数 + スタイルを送信。タイトル + 各ページのテキスト + 画像プロンプトをJSON形式で受け取る
5. **コンテンツフィルタ**: フィルタ通過後、ページ毎にループ
6. **画像生成**: 各ページについてReplicate API (FLUX Schnell)で挿絵を生成
7. 生成画像をCloud Storageにアップロード
8. `pages/{pageNumber}`ドキュメントを更新、`books/{bookId}.progress`をインクリメント
9. 全ページ完了後、`books/{bookId}.status = "completed"`に更新

### コンテンツフィルタ（多層設計）

| 層 | 対象 | 手法 |
|---|---|---|
| 入力側 | ユーザー入力テキスト | NGワード検出 |
| LLM側 | Gemini出力 | Safety Settings `BLOCK_LOW_AND_ABOVE` |
| プロンプト側 | システムプロンプト | 「子ども向け・安全な内容のみ」を明示 |
| 画像側 | FLUX Schnellプロンプト | `safe for children, family friendly`を常に付与 |

### エラーハンドリング

- 画像生成失敗 → 該当ページを`status: "failed"`にし、最大2回リトライ
- 全体失敗 → `books/{bookId}.status = "failed"` + ユーザーに「もう一度試す」ボタン表示
- Geminiのコンテンツフィルタでブロック → テーマを穏やかに調整して1回リトライ、失敗なら「テーマを変更してください」と案内

---

## テーマテンプレート（MVP: 8種）

| # | テーマ | アイコン | 概要 | 想定シーン |
|---|---|---|---|---|
| 1 | おたんじょうび | 🎂 | 主人公の誕生日パーティーの冒険 | 誕生日プレゼント |
| 2 | おやすみなさい | 🌙 | 眠りにつくまでの穏やかな物語 | 寝かしつけ |
| 3 | おでかけぼうけん | 🌳 | 公園や動物園へのお出かけ | 日常の思い出 |
| 4 | きせつのおはなし | 🌸 | 春夏秋冬の季節イベント | 季節の行事 |
| 5 | どうぶつのともだち | 🐰 | 動物たちと友だちになる物語 | 動物好きな子に |
| 6 | たべものだいぼうけん | 🍙 | 好き嫌い克服や食の楽しさ | 食育 |
| 7 | できたよ！チャレンジ | 💪 | トイレ・着替え・お片付けなど成長体験 | しつけ・成長 |
| 8 | かぞくのおはなし | 👨‍👩‍👧 | 家族の絆や兄弟・祖父母との物語 | 家族へのプレゼント |

テンプレートはFirestoreの`templates`コレクションに格納。管理画面なしでDB直接編集で追加・変更可能。ユーザーの任意入力（教えたいこと・思い出）があればプロンプトにマージしてパーソナライズを実現。

---

## フロントエンド構成

```
app/
├── page.tsx                          # ① ランディング
├── (auth)/
│   └── login/page.tsx                # ② Googleログイン
├── (app)/                            # 認証必須レイアウト
│   ├── home/page.tsx                 # ③ 本棚（ホーム）
│   ├── create/
│   │   ├── theme/page.tsx            # ④ テーマ選択
│   │   ├── input/page.tsx            # ⑤ 基本入力
│   │   └── style/page.tsx            # ⑥ スタイル選択
│   ├── generating/[bookId]/page.tsx  # ⑦ 生成中
│   └── book/[bookId]/page.tsx        # ⑧ 絵本ビューア
components/
├── BookViewer/                       # 見開き/1ページ切替ビューア
├── BookCard/                         # 本棚のカード
├── ThemeCard/                        # テーマ選択カード
├── StylePicker/                      # スタイル選択（代表絵本例付き）
├── GenerationProgress/               # リアルタイム進捗表示
└── ui/                               # 共通UIコンポーネント (shadcn/ui)
lib/
├── firebase.ts                       # Firebase初期化
├── auth.ts                           # 認証ヘルパー
└── hooks/
    ├── useBook.ts                    # 絵本データ購読
    └── useGenerationProgress.ts      # 生成進捗リアルタイム監視
functions/                            # Cloud Functions（同一リポジトリ）
├── generateBook.ts                   # 生成パイプライン本体
├── cleanupExpired.ts                 # 期限切れ絵本削除（Scheduled）
└── lib/
    ├── gemini.ts                     # Gemini API呼び出し
    ├── replicate.ts                  # Replicate API呼び出し
    └── contentFilter.ts              # コンテンツフィルタ
```

---

## セキュリティ

### Firestoreセキュリティルール

- `users/{userId}`: 自分のドキュメントのみ読み書き可
- `books/{bookId}`: `userId`フィールドが自分のもののみ読み取り可。作成は認証ユーザーのみ。更新・削除はCloud Functionsのみ
- `books/{bookId}/pages/{pageId}`: 親bookの所有者のみ読み取り可。書き込みはCloud Functionsのみ
- `templates/{templateId}`: 全認証ユーザーが読み取り可。書き込み不可（DB直接編集）

### APIキー管理

- Gemini API Key / Replicate API Token → Cloud Functionsの環境変数（`firebase functions:secrets:set`）
- クライアントには一切露出しない

---

## 無料枠・課金

| 項目 | 無料プラン | プレミアムプラン |
|---|---|---|
| 月間生成数 | 3冊 | 無制限 |
| 絵本保存期間 | 30日 | 無期限 |
| ウォーターマーク | あり | なし |

- 月間生成数: Cloud Function内で`users/{userId}.monthlyGenerationCount`をチェック。Cloud Schedulerで月初リセット
- 保存期間: `books/{bookId}.expiresAt`で管理。Cloud Scheduler（日次）で期限切れデータを削除
- プレミアム課金の決済実装はMVP後。MVP段階では無料枠のみ提供

---

## デプロイ

```
GitHub リポジトリ
  ├── mainブランチにpush
  │     ↓
  ├── GitHub Actions
  │     ├── lint + type check
  │     ├── firebase deploy --only hosting
  │     └── firebase deploy --only functions
  │
  └── 環境
        ├── dev:  Firebaseプロジェクト (dev)
        └── prod: Firebaseプロジェクト (prod)
```

---

## テスト戦略（MVP）

| 種別 | 対象 | ツール |
|---|---|---|
| ユニットテスト | コンテンツフィルタ、プロンプト生成ロジック | Vitest |
| 統合テスト | Cloud Functionsの生成パイプライン | Firebase Emulator Suite |
| E2Eテスト | MVP段階では手動確認 | グロースフェーズでPlaywright導入 |

---

## MVPスコープまとめ

### 含む（Must + テーマテンプレート）

- AI物語生成（Gemini）
- AI挿絵生成（FLUX Schnell via Replicate）
- 絵本ビューア（見開き/1ページ レスポンシブ）
- コンテンツフィルタ（多層設計）
- テーマテンプレート（8種）
- Googleログイン
- 本棚（生成履歴一覧）
- 無料枠制限（月3冊、30日保存）
- 挿絵スタイル選択（水彩/フラット/クレヨン）
- カスタマイズ入力（教えたいこと/再現したい思い出）

### 含まない（将来対応）

- 写真入力による主人公生成（写真の人物を絵本の主人公として挿絵に反映）
- 読み上げ機能（TTS）
- 物理本印刷注文
- キャラクター一貫性設定
- SNSシェア機能
- Apple Sign-In（ネイティブ化時に追加）
- プレミアムプラン決済
- 多言語対応
- 絵本コミュニティ

---

## 未決定事項（product-briefより引継ぎ）

- プレミアムプランの価格設定（月980円 vs 月1,480円）→ ユーザーインタビューで検証
- 物理本印刷パートナーの選定 → グロースフェーズで対応
- 無料プランの保存期間（30日で適切か）→ βテストで検証
- 子どもカテゴリとしてストア申請するか → ネイティブ化フェーズで判断
