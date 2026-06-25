# App Check 有効化ランブック (#582)

Firebase App Check（reCAPTCHA v3）を**本番を壊さず**段階的に有効化する手順。
App Check は「正規の自社アプリからのリクエストか」を検証し、API の不正利用
（bot・スクレイピング・課金/生成の悪用）を防ぐ。

## 現状（コード側は準備済み）
- **フロント** `src/lib/firebase.ts`: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` が設定されている時だけ
  `initializeAppCheck` を実行（reCAPTCHA v3）。**未設定の現状は no-op で安全**。
- **関数**: 以下は `consumeAppCheckToken: true`（トークンがあれば検証・消費するが、
  無くても拒否しない soft 状態）:
  delete-child-profile / update-book-title / generate-book-pdf / delete-book /
  regenerate-page-image / regenerate-cover-image / delete-user-account。
- **未実施**: reCAPTCHA サイトキー発行・Console での App Check 登録・`enforceAppCheck`（強制）。

> ⚠️ いきなり `enforceAppCheck: true` を入れて本番デプロイすると、鍵未設定＝トークン無しの
> 全リクエストが弾かれ checkout・生成が壊れる（PR #583 をクローズした理由）。必ず下記順序で。

## Phase 1: reCAPTCHA v3 サイトキー発行（運用者）
1. Google Cloud / reCAPTCHA 管理画面で **reCAPTCHA v3** のサイトを新規作成。
   - ドメインに本番 `ehoria.app` と `story-gen-8a769.web.app`（および開発用 localhost）を登録。
   - **サイトキー**（公開・フロントで使う）と**シークレットキー**（App Check 設定用）が発行される。
2. Firebase Console → **App Check** → アプリ（Web）を選択 → プロバイダ **reCAPTCHA v3** を登録し、
   上記**シークレットキー**を入力。

## Phase 2: フロントにサイトキーを設定（コード/ビルド）
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<サイトキー>` を本番ビルド env に設定。
  - reCAPTCHA **サイトキーは公開情報**（フロントに露出）なので秘密ではない。`.env.production` 等でよい。
- `npm run build` → `npm run deploy:hosting`。これでアプリが App Check トークンを送り始める。
- 確認: ブラウザの devtools で reCAPTCHA が読み込まれ、Firebase リクエストに App Check ヘッダが付くこと。

## Phase 3: monitor（観測のみ・まだ弾かない）
- Firebase Console → App Check → 各サービス（Cloud Functions / Firestore / Storage）を
  **「監視（unenforced）」**のまま、メトリクスで「検証済みリクエストの割合」を観測。
- 正常クライアントからのトラフィックがほぼ 100% verified になることを数日確認。
  - 低い場合はキー設定・ドメイン・初期化の問題を潰す（enforce 前に必ず解消）。

## Phase 4: enforce（強制・段階的）
verified 率が十分に高いと確認できたら、影響の小さい順に enforce を入れる。
1. **まず非課金・非生成の管理/補助系**（例: submit-app-feedback, update-book-title）に
   `enforceAppCheck: true` を付けてデプロイ → 監視。
2. 次に **生成系**（regenerate-page-image, regenerate-cover-image, generate-book-pdf）。
3. 最後に **課金系**（createCheckoutSession, createSinglePurchaseCheckout）と
   生成トリガ（generateBook は Firestore トリガなので App Check 対象外＝書き込み元の
   onCall/クライアント側で担保）。
- Firestore/Storage は Console 側の enforce トグルで段階適用。
- 各段階で Console の拒否率・エラー率を監視し、異常が出たら即 unenforce/ロールバック。

## ロールバック
- 緊急時: Console で該当サービスを **unenforced** に戻す（即時）。
- コード側 enforce を入れていれば `enforceAppCheck` を外して再デプロイ、
  または `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` を外してフロント再デプロイ（トークン送信停止）。

## enforce 対象の関数（Phase 4 で順次）
| 段階 | 関数 |
|---|---|
| 1（低リスク） | submit-app-feedback, update-book-title, delete-book, delete-child-profile |
| 2（生成） | regenerate-page-image, regenerate-cover-image, generate-book-pdf |
| 3（課金・重要） | createCheckoutSession, createSinglePurchaseCheckout, redeemCoupon |
| Console側 | Firestore / Storage の enforce トグル |

## 完了の定義
- 全主要クライアント経路で verified 率が高位安定。
- 課金・生成・削除の各 onCall が enforce 済みで、正常クライアントは影響なし。
- 不正/トークン無しリクエストが拒否されることをログで確認。
