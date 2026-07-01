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
| E2 | クラス＆園児名簿（園所有の子ども）、先生の名簿管理 | 未 |
| E3 | 一括生成（クラス全員分の行事絵本を名前入りで） | 未 |
| E4 | 法人請求（Stripe法人顧客・席/従量・エンタイトルメント強制） | 未 |

E4 の課金方式（席課金／園児数／従量／定額）は未確定。E1〜E3 は課金非依存で構築する。
