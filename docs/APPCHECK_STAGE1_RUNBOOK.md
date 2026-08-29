# App Check 段階導入ランブック — Stage 1: 監視モード (#582)

3段階導入の第1段階。**強制(enforce)は一切行わず**、正規クライアントのトークン送信率を計測する。

## 現状（2026-08-28 監査結果）
- ✅ クライアント初期化は実装済み: `src/lib/firebase.ts` — `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` があれば `ReCaptchaV3Provider` で initializeAppCheck。開発時はデバッグトークン対応済み
- ✅ 一部callable関数は `consumeAppCheckToken: true` 済み（enforceは無いのでトークン無しでも通る＝監視段階と互換）
- ✅ `enforceAppCheck: true` は全コードに存在しない（Stage 3まで導入しない）
- ❌ reCAPTCHA v3 キー未登録・環境変数未設定 ← **これだけが欠けている**

## 進捗 (2026-08-29)
- ✅ reCAPTCHA v3キー作成済み (ラベル: ehoria-app-check)
- ✅ サイトキーを `.env.local` と GitHub secret `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` に登録
- ✅ deploy.yml のビルドenvに追加、本番反映済み（reCAPTCHAスクリプトのロードを実機確認）
- ⏳ **残: Firebase Console でのシークレット登録（下記Step 2）** — 完了までApp Checkは403を返す（監視モードのため実害なし）

### この作業中に発見・修正した本番バグ2件
1. **自動デプロイが8/28以降全失敗**: `cinematic-viewer.test.tsx` の型エラーで `tsc --noEmit` が停止していた → #729で修正、自動デプロイ復旧
2. **GitHub secret `NEXT_PUBLIC_FIREBASE_APP_ID` に measurementId(`G-GBBQBFPDVN`) が入っていた** → 自動デプロイのたびにAnalyticsのInstallations 400とApp Checkの宛先誤りが発生。正しいappIdに修正済み。他5項目(apiKey/authDomain/projectId/storageBucket/messagingSenderId/measurementId)は照合して正常

## ⚠️ 方式変更: reCAPTCHA v3 → reCAPTCHA Enterprise (2026-08-29)
クラシック reCAPTCHA は 2024 Q3 以降キーの新規発行が停止し、2026 Q1 に移行が完了。
Firebase Console の v3 登録フォーム（秘密鍵の入力欄）は無効化されており、**新規登録は Enterprise のみ**。
- コードは両対応済み（`NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` があれば Enterprise、無ければ従来の v3）
- **Enterprise はサイトキーのみ。シークレットは存在しない**
- 料金: 組織あたり月 10,000 アセスメント無料。Blaze のため超過分は 10,001〜100,000 で $8 固定。
  **トークンTTLを延ばすほどアセスメント数が減る**（既定1時間 → 開きっぱなしのタブ1つで約24回/日）。
  Ehoria の規模では TTL を長め（例: 7日）にすれば無料枠内で十分収まる見込み
- 電話番号認証との既知バグ（firebase-js-sdk#9405）は Ehoria が Google ログインのみのため影響なし

### Enterprise キー作成手順（ユーザー作業）
1. https://console.cloud.google.com/security/recaptcha?project=story-gen-8a769 （Fraud Defense）
   → 必要なら reCAPTCHA Enterprise API を有効化
2. 「キーを作成」: 表示名 `appcheck-web-prod` / プラットフォーム **ウェブサイト**
3. **「チェックボックスチャレンジを使用」はオフのまま**（App Check はスコアベース必須）
4. ドメイン: `ehoria.app` と `story-gen-8a769.web.app`。**localhost は追加しない**（開発はデバッグトークンを使う）
5. WAF/Cloud Armor 連携は有効にしない
6. 作成後の**サイトキー**（`6L`で始まる公開値）を控える
7. Firebase Console → App Check → アプリ → **reCAPTCHA Enterprise**（⊕ の方）→ サイトキーを貼って保存
   - トークンTTLはコスト削減のため長め推奨
   - **「適用/Enforce」は押さない**

## Stage 1 有効化手順（ユーザー作業・約5分）※以下はv3時代の手順。参考用に残置
1. https://www.google.com/recaptcha/admin/create で reCAPTCHA **v3** キーを作成
   - ラベル: `ehoria-app-check`
   - ドメイン: `ehoria.app` と `story-gen-8a769.web.app` と `localhost`
2. Firebase Console → story-gen-8a769 → **App Check** → アプリ「Ehoria(web)」→ reCAPTCHA v3 で登録
   - reCAPTCHAの**シークレットキー**を貼り付け
   - トークンTTLは既定(1時間)のまま
3. ローカル `.env.local` に追記: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<サイトキー>`
   - サイトキーは公開値なのでシークレット扱い不要（GitHub secretsへの登録は任意: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`）
4. Claude に「App Check Stage 1 のデプロイして」と指示（build:clean → hosting デプロイ → 本番でトークン送信開始）

## Stage 1 の観測（有効化後 1〜2週間）
- Firebase Console → App Check → **APIs** タブで Firestore / Cloud Functions / Storage ごとの
  「検証済みリクエスト」比率を確認
- 判定基準: **検証済み ≥ 99%** が1週間継続 → Stage 2 へ
- 未検証が多い場合の主因: 旧キャッシュのクライアント / Bot / デバッグトークン未設定のCI

## Stage 2: 部分強制（callable のみ・要ユーザー承認）
- 破壊的影響が小さい callable（delete-book 等、既に `consumeAppCheckToken: true` の4関数）へ
  `enforceAppCheck: true` を追加 → functions デプロイ
- 24時間エラー率監視。問題あれば即ロールバック（フラグ削除→再デプロイ）

## Stage 3: 全面強制（要ユーザー承認）
- Firebase Console で Firestore / Storage / Functions の enforce を ON
- ロールバック: Console から即時 OFF 可能

## 禁止事項
- Stage 1〜2 の間、Console 側の enforce トグルには触れない
- 自動化ルーチンはこのランブックの操作を行わない（人間の承認ゲート必須）
