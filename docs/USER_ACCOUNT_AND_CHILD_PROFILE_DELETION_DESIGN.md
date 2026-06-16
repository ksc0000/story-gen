# Design Document for User Account and Child Profile Deletion

> Status: **Final (Draft)**
> Created: 2026-05-23
> Author: Jules (AI)
> Related: `docs/PRODUCT_ROADMAP.md` Section 0, Phase 5 Monetization

---

## 1. Overview

ユーザーが自身のアカウントおよび子どもプロフィールのデータを完全に削除できる機能を設計する。
Ehoria はお子さんの名前、写真、思い出などの機密性の高い個人情報を扱うため、ユーザーの信頼確保とプライバシー規制（GDPR, CCPA 等）への準拠、および適切なデータライフサイクル管理が不可欠である。

---

## 2. User Problem

### 現状の課題
1. **アカウント削除不可**: ユーザーがサービスを退会したい場合、自律的にデータを削除する手段がない。
2. **子どもプロフィールの整理**: 複数の子どもを登録できるようになったが、不要になったプロフィールの削除に伴う関連データ（画像等）のクリーニングが不透明。
3. **継続課金の懸念**: アカウントを削除した際に、Stripe のサブスクリプションが適切に解約されるかどうかの保証が必要。

---

## 3. Goals / Non-goals

### Goals
- ユーザーが自身の操作でアカウントを削除できる。
- 子どもプロフィールを削除し、関連するアセット（生成画像等）をクリーンアップする。
- 削除時に Stripe のサブスクリプションを適切に停止する。
- Firebase Auth, Firestore, Cloud Storage の関連データを一貫性を持って削除する。
- 誤操作防止のための確認プロセスを設ける。

### Non-goals
- 削除したデータの復旧機能（原則として不可逆的な削除とする）。
- 管理者による一括削除ツールの作成（本ドキュメントではユーザー主導の削除に焦点を当てる）。
- 退会後の再登録制限。

---

## 4. Technical Design

### 4.1 削除のスコープ

#### A. 子どもプロフィールの削除 (`deleteChildProfile`)
- **Firestore**:
  - `users/{userId}/children/{childId}` (Doc)
  - `users/{userId}/children/{childId}/avatarGenerations/{genId}` (Subcollection)
- **Cloud Storage**:
  - `users/{userId}/children/{childId}/` 配下の全ファイル (写真、生成アバター)
- **関連ジョブ**:
  - `childAvatarGenerationJobs` のうち `childId` が一致するものを削除。
- **ポリシー**: その子どもに関連して作成された「絵本（Books）」は削除せず、アセットとして維持する。

#### B. アカウント削除 (`deleteUserAccount`)
- **Firebase Auth**: ユーザーアカウント。
- **Firestore (User)**:
  - `users/{userId}` および配下の `children`, `usage`, `companions` などの全サブコレクション。
- **Firestore (Books)**:
  - `books` コレクションのうち `userId` が一致するもの。
  - `books/{bookId}/pages`, `books/{bookId}/feedback`, `books/{bookId}/qualityReviews` などの全サブコレクション。
- **Cloud Storage**:
  - `users/{userId}/` 配下の全アセット（絵本画像、カバー、相棒画像、子ども写真等）。
- **Stripe**:
  - `stripeSubscriptionId` が存在する場合、`stripe.subscriptions.cancel(id)` を実行。
  - `stripeCustomerId` の削除（推奨）。
- **関連ジョブ**:
  - `childAvatarGenerationJobs`, `companionImageJobs` のうち `userId` が一致するもの。

### 4.2 実装アプローチ (Cloud Functions)

サーバーサイドで一貫性を担保するために Callable Function を使用する。

#### `deleteChildProfile(data: { childId: string })`
1. 呼び出し元の `auth.uid` と `userId` を検証。
2. Firestore で対象ドキュメントの存在を確認。
3. Cloud Storage から `users/{uid}/children/{childId}/` フォルダを削除。
4. Firestore のサブコレクションを再帰的に削除。
5. 親ドキュメントを削除。

#### `deleteUserAccount()`
1. `auth.uid` を取得。
2. Stripe サブスクリプションの解約。
3. `books` コレクションを `userId` でクエリし、各ブックの `pages` 等を含めて再帰削除。
4. `childAvatarGenerationJobs`, `companionImageJobs` を `userId` でクエリし削除。
5. Cloud Storage の `users/{uid}/` フォルダを削除。
6. Firestore の `users/{uid}` を再帰削除。
7. Firebase Auth ユーザーを削除 (`admin.auth().deleteUser(uid)`)。

---

## 5. Security & Validation

- **認証チェック**: すべての Function は `request.auth` を必須とする。
- **権限チェック**: `userId` が `auth.uid` と一致するか、または管理権限があることを確認。
- **Stripe ID の保護**: Stripe API キーは Google Cloud Secret Manager で管理する。
- **再帰削除の制限**: 大量データの削除によるタイムアウトを防ぐため、バッチ処理または `admin.firestore().recursiveDelete()` を適切に使用。

---

## 6. UI/UX Impact

### 6.1 子どもプロフィール削除
- 導線: `src/app/(app)/children/page.tsx` の既存ゴミ箱ボタン。
- 変更: クライアントサイドの `deleteDoc` から Callable Function 呼び出しへ変更。
- 警告: 「このお子さんのアバターや写真も削除されます。作成済みの絵本は残ります。」

### 6.2 アカウント削除
- 導線: `src/app/(app)/settings/page.tsx` (新規作成) または `pricing` ページ付近。
- 手順:
  1. 「アカウント削除」ボタンをクリック。
  2. モーダルで「すべての絵本、プロフィール、定期購読が削除され、元に戻せません」と表示。
  3. 最終確認として「削除」と入力させる、またはチェックボックスを要求。
  4. 処理中は全画面ローディング。
  5. 完了後、ログアウトして `/` へリダイレクト。

---

## 7. Implementation Plan

1. **Backend**: `deleteChildProfile` Callable Function の実装。
2. **Backend**: `deleteUserAccount` Callable Function の実装 (Stripe 連携込み)。
3. **Frontend**: `children/page.tsx` の削除ロジック更新。
4. **Frontend**: アカウント設定画面の新設とアカウント削除導線の実装。

---

## 8. Acceptance Criteria

- [ ] `deleteChildProfile` で Storage 上の子ども関連画像が消えること。
- [ ] `deleteUserAccount` で Stripe サブスクリプションが解約されること。
- [ ] `deleteUserAccount` 後に Firestore/Storage/Auth のすべてからデータが消えること。
- [ ] 他人のデータを削除できないセキュリティが確保されていること。
