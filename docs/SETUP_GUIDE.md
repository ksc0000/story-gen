# EhoNAI（えほんAI）セットアップ・運用ガイド

このガイドでは、EhoNAI をゼロからパブリック公開するまでの全手順を、IT初心者にもわかるように説明します。

---

## 目次

1. [このアプリの全体像](#1-このアプリの全体像)
2. [必要なもの（事前準備）](#2-必要なもの事前準備)
3. [Step 1: Firebase プロジェクトを作る](#3-step-1-firebase-プロジェクトを作る)
4. [Step 2: Firebase の機能を有効にする](#4-step-2-firebase-の機能を有効にする)
5. [Step 3: AI の API キーを取得する](#5-step-3-ai-の-api-キーを取得する)
6. [Step 4: ローカル環境をセットアップする](#6-step-4-ローカル環境をセットアップする)
7. [Step 5: テンプレートデータを投入する](#7-step-5-テンプレートデータを投入する)
8. [Step 6: ローカルで動作確認する](#8-step-6-ローカルで動作確認する)
9. [Step 7: 本番デプロイ（公開）](#9-step-7-本番デプロイ公開)
10. [Step 8: GitHub Actions で自動デプロイを設定する](#10-step-8-github-actions-で自動デプロイを設定する)
11. [運用時の注意点](#11-運用時の注意点)
12. [トラブルシューティング](#12-トラブルシューティング)
13. [費用の目安](#13-費用の目安)

---

## 1. このアプリの全体像

```
┌─────────────────────────────────────────────────────┐
│  ユーザー（親）のブラウザ                              │
│  ・子どもの名前やテーマを入力                          │
│  ・生成された絵本を閲覧                               │
└───────────────┬─────────────────────────────────────┘
                │ HTTPS
┌───────────────▼─────────────────────────────────────┐
│  Firebase Hosting（Webサイトを配信）                   │
│  ・Next.js で作った静的HTML/JS/CSS                    │
└───────────────┬─────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────┐
│  Firebase サービス群                                  │
│                                                      │
│  ・Auth（Googleログイン）                              │
│  ・Firestore（絵本データの保存）                       │
│  ・Cloud Storage（挿絵画像の保存）                     │
│  ・Cloud Functions（絵本生成の処理）                    │
│       │                                              │
│       ├→ Gemini API（物語テキスト生成）                │
│       └→ Replicate API（挿絵画像生成）                │
└──────────────────────────────────────────────────────┘
```

### 使うサービス一覧

| サービス | 役割 | 費用 |
|---------|------|------|
| **Firebase** | サーバー・データベース・ホスティング全般 | 無料枠あり（Blaze プランで従量課金） |
| **Google Cloud** | Firebase の裏側の基盤 | Firebase 経由で自動利用 |
| **Gemini API** | 物語のテキストを AI で生成 | 無料枠あり → 従量課金 |
| **Replicate** | 挿絵の画像を AI で生成 | 従量課金（1画像 約5〜10円） |
| **GitHub** | ソースコード管理 + 自動デプロイ | 無料 |

---

## 2. 必要なもの（事前準備）

### アカウント（すべて無料で作成可能）

- [ ] **Google アカウント** — Firebase と Gemini API に使用
- [ ] **GitHub アカウント** — ソースコード管理（既にリポジトリあり）
- [ ] **Replicate アカウント** — 画像生成 API（https://replicate.com で作成）

### パソコンにインストールするもの

- [ ] **Node.js 20** — https://nodejs.org からダウンロード（LTS 版を選ぶ）
- [ ] **Git** — https://git-scm.com からダウンロード
- [ ] **Firebase CLI** — Node.js インストール後にコマンドで入れる

```bash
# Firebase CLI をインストール（コマンドプロンプトやターミナルで実行）
npm install -g firebase-tools

# インストール確認
firebase --version
```

---

## 3. Step 1: Firebase プロジェクトを作る

### 3.1 Firebase コンソールにアクセス

1. https://console.firebase.google.com にアクセス
2. Google アカウントでログイン
3. 「プロジェクトを追加」をクリック

### 3.2 プロジェクトを作成

1. **プロジェクト名**: `ehonai-prod`（任意の名前でOK）
2. **Google アナリティクス**: MVP段階では「無効」でOK
3. 「プロジェクトを作成」をクリック → 数秒で完了

### 3.3 Blaze プラン（従量課金）に変更

Cloud Functions を使うには Blaze プラン（無料枠 + 超過分のみ課金）が必須です。

1. Firebase コンソールの左下「Spark」をクリック
2. 「Blaze にアップグレード」を選択
3. クレジットカードを登録（無料枠内なら課金されません）
4. 予算アラートを設定（例：月 1,000円でアラート）

> **安心ポイント**: 無料枠が非常に大きいので、テスト段階ではほぼ課金されません。予算アラートを設定しておけば安心です。

### 3.4 Web アプリを登録

1. Firebase コンソール > プロジェクト設定（歯車アイコン）
2. 「アプリを追加」 > Web（`</>`アイコン）をクリック
3. **アプリのニックネーム**: `EhoNAI Web`
4. 「Firebase Hosting も設定する」にチェック
5. 「アプリを登録」をクリック

登録後、**Firebase 設定情報**が表示されます。以下の値をメモしてください：

```
apiKey: "AIzaSy..."
authDomain: "ehonai-prod.firebaseapp.com"
projectId: "ehonai-prod"
storageBucket: "ehonai-prod.firebasestorage.app"
messagingSenderId: "123456789"
appId: "1:123456789:web:abcdef"
```

> これらは後で `.env.local` ファイルに設定します。

---

## 4. Step 2: Firebase の機能を有効にする

### 4.1 Authentication（ログイン機能）を有効にする

1. Firebase コンソール > 左メニュー「Authentication」
2. 「始める」をクリック
3. 「Sign-in method」タブ > 「Google」をクリック
4. 「有効にする」をオン
5. **プロジェクトのサポートメール** に自分のメールアドレスを入力
6. 「保存」

### 4.2 Firestore Database を作成する

1. Firebase コンソール > 左メニュー「Firestore Database」
2. 「データベースを作成」をクリック
3. **ロケーション**: `asia-northeast1`（東京）を選択
4. **セキュリティルール**: 「本番モードで開始」を選択
5. 「作成」をクリック

> セキュリティルールは後のデプロイで自動的に上書きされるので、ここでは気にしなくてOKです。

### 4.3 Cloud Storage を有効にする

1. Firebase コンソール > 左メニュー「Storage」
2. 「始める」をクリック
3. **セキュリティルール**: デフォルトのままでOK（デプロイ時に上書き）
4. **ロケーション**: Firestore と同じ `asia-northeast1`
5. 「完了」

### 4.4 Cloud Functions を確認

Blaze プランであれば Cloud Functions は自動的に利用可能です。特に設定は不要。

---

## 5. Step 3: AI の API キーを取得する

### 5.1 Gemini API キー（物語生成用）

Gemini は Google が提供する AI で、物語のテキストを生成します。

1. https://aistudio.google.com/apikey にアクセス
2. Google アカウントでログイン
3. 「Create API Key」をクリック
4. Firebase プロジェクト（`ehonai-prod`）を選択
5. 生成された API キーをコピーして安全な場所に保存

```
例: AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **無料枠**: Gemini API には寛大な無料枠があります（1分間15リクエスト、1日1,500リクエスト程度）。MVP テストには十分です。

### 5.2 Replicate API トークン（画像生成用）

Replicate は AI モデルを API で使えるサービスです。FLUX Schnell という画像生成モデルを使います。

1. https://replicate.com にアクセス
2. 「Sign up」でアカウント作成（GitHub アカウントでサインアップ可能）
3. https://replicate.com/account/api-tokens にアクセス
4. 「Create token」をクリック
5. 生成されたトークンをコピーして安全な場所に保存

```
例: r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **費用**: FLUX Schnell は 1画像あたり約 $0.003〜$0.01（約0.5〜1.5円）です。8ページの絵本1冊で約4〜12円。

### 5.3 API キーを Firebase に登録する

Cloud Functions が実行時に API キーを使えるように、Firebase のシークレット管理に登録します。

```bash
# Firebase にログイン（ブラウザが開くので Google アカウントでログイン）
firebase login

# プロジェクトを選択
firebase use ehonai-prod

# Gemini API キーを登録（入力を求められるのでキーを貼り付け）
firebase functions:secrets:set GEMINI_API_KEY

# Replicate API トークンを登録
firebase functions:secrets:set REPLICATE_API_TOKEN
```

> **セキュリティ**: これらのキーはコードに直接書かないでください。Firebase のシークレット管理を通じて安全に保管されます。

---

## 6. Step 4: ローカル環境をセットアップする

### 6.1 リポジトリをクローン

```bash
git clone https://github.com/ksc0000/story-gen.git
cd story-gen
```

### 6.2 依存パッケージをインストール

```bash
# フロントエンドの依存パッケージ
npm install

# Cloud Functions の依存パッケージ
cd functions && npm install && cd ..
```

### 6.3 環境変数ファイルを作成

プロジェクトのルートに `.env.local` ファイルを作成し、Step 1 でメモした Firebase 設定情報を入力します。

```bash
# テンプレートをコピー
cp .env.example .env.local
```

`.env.local` を開いて、以下のように書き換えてください：

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy（あなたのキー）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ehonai-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ehonai-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ehonai-prod.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=（あなたの値）
NEXT_PUBLIC_FIREBASE_APP_ID=（あなたの値）
```

> **重要**: `.env.local` は `.gitignore` に含まれているため、GitHub にアップロードされません（安全です）。

### 6.4 Firebase プロジェクトとの紐付け

```bash
firebase use ehonai-prod
```

`.firebaserc` というファイルが更新されます。

---

## 7. Step 5: テンプレートデータを投入する

絵本のテーマ（おたんじょうび、おやすみなさい等）のデータを Firestore に登録します。

```bash
# Firebase Admin SDK の認証情報を取得
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"

# テンプレートを投入
cd functions && npx ts-node src/seed-templates.ts && cd ..
```

### サービスアカウントキーの取得方法

1. Firebase コンソール > プロジェクト設定 > 「サービスアカウント」タブ
2. 「新しい秘密鍵の生成」をクリック
3. JSON ファイルがダウンロードされる
4. 上記コマンドの `path/to/service-account-key.json` をそのファイルのパスに置き換え

> **注意**: サービスアカウントキーは非常に重要な認証情報です。Git にコミットしたり、他人と共有しないでください。

### 投入後の確認

Firebase コンソール > Firestore Database で `templates` コレクションを確認。8つのドキュメント（birthday, bedtime, adventure 等）が表示されていればOK。

---

## 8. Step 6: ローカルで動作確認する

### 8.1 開発サーバーを起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス。

### 8.2 動作確認チェックリスト

- [ ] ランディングページが表示される
- [ ] 「無料で絵本を作る」をクリック → ログイン画面に遷移
- [ ] 「Google でログイン」をクリック → Google アカウント選択画面が表示される
- [ ] ログイン後 → 本棚ページに遷移（「あなたの本棚」と表示）
- [ ] 「新しい絵本を作る」→ テーマ選択画面（8テーマ表示）
- [ ] テーマ選択 → 入力画面（子どもの名前入力）
- [ ] 入力完了 → スタイル選択画面（水彩/フラット/クレヨン）
- [ ] 「絵本を作る！」→ 生成中画面（プログレスバーが進む）
- [ ] 生成完了 → 絵本ビューア（テキストと挿絵が表示）

> **初回ログイン時**: Google の認証画面が表示されます。「詳細」→「（安全でない）に移動」をクリックする必要がある場合があります（開発中の正常な動作です）。

---

## 9. Step 7: 本番デプロイ（公開）

### 9.1 ビルド

```bash
# フロントエンドをビルド（out/ フォルダに静的ファイルが生成される）
npm run build

# Cloud Functions をビルド
cd functions && npm run build && cd ..
```

### 9.2 デプロイ

```bash
# すべてを Firebase にデプロイ
firebase deploy
```

これにより以下が一括デプロイされます：
- **Hosting**: Webサイト本体（out/ フォルダの内容）
- **Functions**: generateBook, cleanupExpired, resetMonthlyQuota
- **Firestore Rules**: セキュリティルール
- **Storage Rules**: ストレージのセキュリティルール

### 9.3 公開URLを確認

デプロイ完了後、以下のようなURLが表示されます：

```
✔ Deploy complete!

Hosting URL: https://ehonai-prod.web.app
```

このURLがあなたのアプリの公開アドレスです。

### 9.4 カスタムドメイン（任意）

独自ドメイン（例: ehonai.jp）を設定する場合：

1. Firebase コンソール > Hosting > 「カスタムドメインを追加」
2. ドメイン名を入力
3. 表示される DNS レコードをドメイン管理画面で設定
4. SSL 証明書は Firebase が自動で発行（無料）

---

## 10. Step 8: GitHub Actions で自動デプロイを設定する

コードを GitHub に push するだけで自動的にテスト・デプロイが走るように設定します。

### 10.1 Firebase のCIトークンを取得

```bash
firebase login:ci
```

ブラウザが開いて認証後、ターミナルにトークンが表示されます。コピーしてください。

### 10.2 GitHub にシークレットを設定

1. https://github.com/ksc0000/story-gen/settings/secrets/actions にアクセス
2. 「New repository secret」をクリック
3. 以下を1つずつ追加：

| Name | Value |
|------|-------|
| `FIREBASE_TOKEN` | 上で取得した CI トークン |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase の apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase の authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase の projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase の storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase の messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase の appId |

### 10.3 自動デプロイの動作

設定完了後、`main` ブランチにコードを push すると：

1. **Lint & テスト** → コードの品質チェック + 全テスト実行
2. **ビルド** → フロントエンド + Cloud Functions をビルド
3. **デプロイ** → Firebase に自動デプロイ

すべて成功すれば、数分後に公開サイトに反映されます。

---

## 11. 運用時の注意点

### 自動で動く機能

| 機能 | タイミング | 内容 |
|------|-----------|------|
| 期限切れ絵本の削除 | 毎日 午前3時（JST） | 無料ユーザーの30日経過した絵本を自動削除 |
| 月間生成カウントのリセット | 毎月1日 午前0時（JST） | 全ユーザーの月間生成数を0にリセット |

### 監視すべきポイント

1. **Firebase コンソール > Functions > ログ** — エラーが出ていないか確認
2. **Firebase コンソール > 使用状況と請求** — 費用が予算内か確認
3. **Replicate ダッシュボード** — API 使用量の確認

### 無料枠の上限

| サービス | 無料枠 | 超過時の目安費用 |
|---------|--------|----------------|
| Firestore | 読み取り 50,000回/日 | $0.06/10万回 |
| Cloud Storage | 5GB | $0.026/GB |
| Cloud Functions | 200万回/月 | $0.40/100万回 |
| Gemini API | 1,500回/日 | $0.075/100万トークン |
| Replicate (FLUX) | なし（従量課金） | 約1〜2円/画像 |

---

## 12. トラブルシューティング

### 「Googleでログイン」が動かない

- Firebase コンソールで Authentication の Google プロバイダが有効になっているか確認
- `.env.local` の `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` が正しいか確認

### 絵本の生成が失敗する

- Firebase コンソール > Functions > ログ でエラーメッセージを確認
- 「GEMINI_API_KEY が設定されていない」→ `firebase functions:secrets:set GEMINI_API_KEY` を再実行
- 「REPLICATE_API_TOKEN が設定されていない」→ 同上
- Replicate の残高が不足していないか確認

### デプロイが失敗する

- `firebase login` でログインし直す
- `firebase use ehonai-prod` でプロジェクトが正しく選択されているか確認
- Node.js のバージョンが 20 であることを確認: `node --version`

### ビルドが失敗する

```bash
# キャッシュをクリアして再ビルド
rm -rf .next out node_modules
npm install
npm run build
```

---

## 13. 費用の目安

### テスト段階（月10冊程度生成）

| 項目 | 費用 |
|------|------|
| Firebase | 0円（無料枠内） |
| Gemini API | 0円（無料枠内） |
| Replicate | 約100〜200円 |
| **合計** | **約100〜200円/月** |

### 小規模運用（月100冊、ユーザー50人程度）

| 項目 | 費用 |
|------|------|
| Firebase | 0〜500円 |
| Gemini API | 0〜100円 |
| Replicate | 約1,000〜2,000円 |
| **合計** | **約1,000〜2,500円/月** |

### 中規模運用（月1,000冊、ユーザー500人程度）

| 項目 | 費用 |
|------|------|
| Firebase | 約1,000〜3,000円 |
| Gemini API | 約500〜1,000円 |
| Replicate | 約10,000〜20,000円 |
| **合計** | **約12,000〜24,000円/月** |

> 費用は利用状況により大きく変動します。Firebase と Google Cloud の予算アラートを必ず設定してください。

---

## クイックリファレンス

```bash
# --- 日常的に使うコマンド ---

# ローカル開発サーバー起動
npm run dev

# テスト実行
npm test                          # フロントエンド
cd functions && npm test && cd .. # バックエンド

# ビルド
npm run build                             # フロントエンド
cd functions && npm run build && cd ..    # バックエンド

# デプロイ
firebase deploy                   # 全部デプロイ
firebase deploy --only hosting    # Web サイトだけ
firebase deploy --only functions  # Cloud Functions だけ

# ログ確認
firebase functions:log

# プロジェクト切り替え
firebase use ehonai-prod
```
