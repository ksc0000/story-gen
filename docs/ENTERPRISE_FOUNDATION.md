# エンタープライズ基盤（園・団体向け）

保育園・幼稚園などの団体で Ehoria を使うための基盤。段階的に構築する。

## データモデル

```
organizations/{orgId}
  { name, ownerUid, plan, status, inviteCode, memberCount, createdAt, updatedAt }
organizations/{orgId}/members/{uid}
  { role: "org_admin" | "teacher", displayName, joinedAt }

users/{uid}                       # 既存。所属を保持（クライアント判定用）
  { ..., orgId?, orgRole? }

# custom claims（Cloud Functions が付与）
  { orgId, orgRole }              # Firestore ルールの高速判定に使用
```

- **ロール**: `org_admin`（園長/管理者：招待・請求・全クラス）/ `teacher`（先生：担当クラス）
- **書き込みは全て callable(admin SDK) 経由**。クライアントからの org 直接書込は禁止（ルールで deny）。閲覧のみ所属メンバーに許可。

## Cloud Functions（callable, asia-northeast1）

- `createOrganization({ name })` → 組織作成・作成者を org_admin に・招待コード発行・claim 付与。
- `joinOrganizationByCode({ code, displayName })` → 招待コードで teacher として参加・claim 付与。レート制限（総当たり対策）。
- `rotateInviteCode()` → org_admin のみ、招待コード再発行。

参加後はクライアントで `getIdToken(true)` により claim を反映してから org を購読する。

## Firestore ルール

```
function isOrgMember(orgId) { return isAuthenticated() && request.auth.token.orgId == orgId; }
match /organizations/{orgId} {
  allow read: if isAdmin() || isOrgMember(orgId);
  allow write: if false;                 // callable 経由のみ
  match /members/{memberUid} { allow read: if isAdmin() || isOrgMember(orgId); allow write: if false; }
}
```

## UI

- `/(app)/organization` … 未所属: 作成 or 招待コードで参加 / 所属: 団体名・ロール・招待コード（admin）・メンバー一覧。
- 設定画面に「園・団体（エンタープライズ）」リンク。

## 段階計画

| Phase | 内容 | 状態 |
|---|---|---|
| **E1** | 組織・メンバー・ロール・招待コード参加・組織スコープのルール | ✅ 実装 |
| **E2** | クラス＆園児名簿。`organizations/{orgId}/classes/{classId}/students/{studentId}`。組織メンバーが直接CRUD（ルールで隔離）。`/organization` にクラス一覧＋追加、`/organization/class?orgId&classId` に名簿。 | ✅ 実装 |
| **E3** | 一括生成。`bulkGenerateClassBooks` callable（org_admin のみ）が名簿全員分の固定テンプレ絵本を作成。組織スポンサー(`orgId`付き)の絵本は generateBook で個人クォータ非消費。安全弁: 1回40人・組織月100冊(`organizations/{orgId}/usage/{YYYY-MM}.bulkBooks`)。組織メンバーは `orgId` 一致の books/pages を閲覧可。 | ✅ 実装 |
| **E4** | 法人請求（定額）＋プラン制上限。組織プラン `enterprise_trial/standard/pro`（`ORG_PLAN_CONFIGS`）。一括生成の上限は組織プラン駆動。`createOrgCheckoutSession`（org_admin・Stripe未設定なら `configured:false` で「準備中」）。stripeWebhook が org サブスクイベントで `organizations.plan` を更新。**実課金は Stripe 商品/価格・Webhook登録後に有効化**（現状は保留）。 | ✅ 実装（インフラ） |

## 実課金を有効化する手順（E4）

1. Stripe ダッシュボードで法人プランの商品/価格を作成（`enterprise_standard` / `enterprise_pro`、定額サブスク）。
2. 環境変数を設定: `STRIPE_PRICE_ID_ENTERPRISE_STANDARD`, `STRIPE_PRICE_ID_ENTERPRISE_PRO`。
3. Stripe Webhook を登録（`stripeWebhook` のURL、イベント: checkout.session.completed / customer.subscription.updated / customer.subscription.deleted）。
4. `ORG_PLAN_CONFIGS` の価格・上限を確定値に更新。

`STRIPE_PRICE_ID_ENTERPRISE_*` 未設定の間は `createOrgCheckoutSession` が `configured:false` を返し、UI は「準備中」を表示する（実決済は発生しない）。

## 運用（ops）

- `leaveOrganization`（本人が退会・作成者は不可）／`removeOrgMember({targetUid})`（管理者が削除・作成者/自分は不可）。detachMember が members削除・memberCount減・users解除・custom claim除去を実施。退会/削除後はクライアントで `getIdToken(true)`。
- クラスの名称変更・削除は組織メンバーのクライアント書込（ルールで許可）。削除時は名簿の園児をバッチ削除してからクラスを削除。UI は管理者に限定表示。
