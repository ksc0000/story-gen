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

## Stage 1 有効化手順（ユーザー作業・約5分）
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
