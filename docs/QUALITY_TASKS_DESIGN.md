# Quality Tasks — Persistence Design

> Status: **Draft**
> Created: 2026-05-08
> Author: Admin
> Related: `docs/PRODUCT_ROADMAP.md` Phase 2 Task 12 (Task Draft Panel)

---

## 1. 背景

Phase 2 で `buildTaskDraft()` + `RecommendationTaskDraftPanel` を実装した。
現在はクライアントサイドで生成 → 表示 → クリップボードにコピーのみ。

**課題**:

- タスクがどの Book に対して起票されたか追跡できない
- 複数 Admin 間でタスクの進捗を共有できない
- 完了したタスクのログが残らない
- コピーしたテキストの管理は個人に依存する

**この doc で決めること**:

1. 保存先（Firestore subcollection / top-level collection / 外部ツール連携）
2. データモデル（型設計）
3. Firestore security rules
4. PII 安全方針
5. UI フロー
6. 実装順序

---

## 2. 保存先の選択肢

| 案 | 構造 | メリット | デメリット |
|---|---|---|---|
| A. `books/{bookId}/qualityTasks/{taskId}` | Subcollection | Book に紐づく、既存パターンと同じ | Book 横断のタスク一覧が取りにくい |
| B. `qualityTasks/{taskId}` | Top-level | 横断クエリが容易 | bookId をフィールドで持つ必要あり |
| C. 外部ツール連携（GitHub Issues 等） | API 連携 | 既存ワークフローに統合 | 実装コスト大、認証設計が複雑 |

### 推奨: **案 B — `qualityTasks/{taskId}` top-level collection**

理由:

- Admin は「全 Book 横断で未完了タスクを見たい」ユースケースが主
- `bookId` フィールド + 複合インデックスで Book 単位のフィルタも可能
- `qualityReviews` も top-level にする案もあったが、既に `books/{bookId}/qualityReviews` として実装済みなので、タスクは別パターンで試す価値がある
- 将来的に外部連携する場合も、top-level の方が export しやすい

---

## 3. データモデル

```typescript
export type QualityTaskStatus = "open" | "in_progress" | "resolved" | "wont_fix";

export interface QualityTaskDoc {
  // === Identity ===
  bookId: string;
  intent: QualityRecommendationIntent;

  // === Content ===
  title: string;
  checklist: QualityTaskChecklistItem[];
  summary: string;

  // === Metadata ===
  status: QualityTaskStatus;
  createdBy: string;          // admin uid
  assignedTo: string | null;  // admin uid or null
  resolvedBy: string | null;
  resolvedAt: Timestamp | null;
  resolvedAtMs: number | null;
  resolutionNote: string;     // 完了時のメモ（空文字可）

  // === Source context (snapshot) ===
  sourceOverallScore: number | null;
  sourceQualityReviewStatus: QualityReviewStatus | null;

  // === Timestamps ===
  createdAt: Timestamp;
  createdAtMs: number;
  updatedAt: Timestamp;
  updatedAtMs: number;
}

export interface QualityTaskChecklistItem {
  label: string;
  detail: string;
  checked: boolean;  // persist check state
}
```

### フィールド設計の方針

| 方針 | 詳細 |
|---|---|
| **PII 除外** | `displayName` / `nickname` / 子どもの名前はフィールドに含めない。`buildTaskDraft()` で既に除外済み |
| **Book snapshot は最小限** | `sourceOverallScore` と `sourceQualityReviewStatus` のみ。Book の全データは `bookId` で参照 |
| **checklist の checked 状態** | Firestore に保存し、Admin 間で進捗共有可能にする |
| **assignedTo** | 初期実装では null 固定。将来のマルチ Admin 対応で使用 |

---

## 4. Firestore Security Rules

```
match /qualityTasks/{taskId} {
  // Read: admin only
  allow read: if isAdmin();

  // Create: admin only, required fields validation
  allow create: if isAdmin()
    && request.resource.data.bookId is string
    && request.resource.data.intent is string
    && request.resource.data.status == "open"
    && request.resource.data.createdBy == request.auth.uid;

  // Update: admin only, status transition + checklist update
  allow update: if isAdmin();

  // Delete: not allowed
  allow delete: if false;
}
```

### ルール詳細

- **Read**: Admin のみ。一般ユーザーはタスクを見る必要がない
- **Create**: Admin が自分の uid を `createdBy` に設定する必要がある
- **Update**: ステータス変更、checklist の checked 更新、assignedTo 変更を許可
- **Delete**: 禁止。`wont_fix` ステータスで論理削除

---

## 5. PII 安全方針

| レイヤー | 対策 |
|---|---|
| `buildTaskDraft()` | `displayName` を「設定あり（画面上で確認）」に置換済み（テスト 13/13 PASS） |
| `QualityTaskDoc` | PII フィールドを型に含めない。`childProfileSnapshot` は保存しない |
| Firestore Rules | Admin のみ read/write。一般ユーザーからは不可視 |
| クリップボード | コピーテキストに `displayName` が含まれないことをテスト済み |
| 将来の外部連携 | export 時も `buildTaskDraft()` 経由で生成するため PII は入らない |

### 禁止事項

- `QualityTaskDoc` に `childProfileSnapshot` を保存しない
- `QualityTaskDoc` に `displayName` / `nickname` を保存しない
- `checklist[].detail` に子どもの名前を含めない（`buildTaskDraft()` が保証）
- `summary` に子どもの名前を含めない（`buildTaskDraft()` が保証）

---

## 6. UI フロー

### 6a. タスク起票

```
RecommendationTaskDraftPanel
  ↓ 「タスクとして保存」ボタン
  ↓ buildTaskDraft() の結果を Firestore に書き込み
  ↓ qualityTasks/{taskId} を create
  ↓ Toast: "タスクを保存しました"
```

### 6b. タスク一覧（将来）

```
Admin Quality Review ページ
  ↓ サイドパネル or タブで qualityTasks 一覧
  ↓ フィルタ: status (open / in_progress / resolved / wont_fix)
  ↓ フィルタ: intent 種別
  ↓ ソート: createdAt desc
```

### 6c. タスク更新

```
タスク詳細
  ↓ checklist item の checked を toggle
  ↓ status を変更（open → in_progress → resolved）
  ↓ resolutionNote を記入
  ↓ Firestore update
```

---

## 7. インデックス設計

```json
{
  "collectionGroup": "qualityTasks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAtMs", "order": "DESCENDING" }
  ]
}
```

追加候補（必要に応じて）:

- `intent` + `createdAtMs` desc
- `bookId` + `createdAtMs` desc
- `assignedTo` + `status` + `createdAtMs` desc

---

## 8. 実装順序

| Step | 内容 | Firestore write | Status |
|---|---|---|---|
| **Step 1** | `QualityTaskDoc` 型を `src/lib/types.ts` に追加 + payload builder + tests | No | **done** |
| **Step 2** | Firestore rules に `qualityTasks` ルールを追加 | No (rules deploy) | **done** |
| **Step 3** | `RecommendationTaskDraftPanel` に「タスクとして保存」ボタン追加 | **Yes** (create) | **done** |
| **Step 4** | Task 保存のテスト（Firestore emulator or mock） | No | **done** |
| **Step 5** | Task 一覧 UI（Admin ページ内タブ or セクション） | Read only | **done** |
| **Step 6** | Task 更新 UI（checklist toggle, status change） | **Yes** (update) | **done** |
| **Step 7** | Task count badge（未完了タスク数の表示） | Read only | |

### Step 1–2 は安全（型 + rules のみ）

Step 3 で初めて Firestore write が発生する。
Step 3 の実装前に、この design doc のレビューを完了すること。

---

## 9. 決定事項チェックリスト

- [ ] 保存先: `qualityTasks/{taskId}` top-level collection で合意
- [ ] データモデル: `QualityTaskDoc` 型で合意
- [ ] PII 方針: displayName / nickname を保存しない方針で合意
- [ ] Firestore rules: admin-only CRUD（delete 禁止）で合意
- [ ] 実装順序: Step 1 (型) → Step 2 (rules) → Step 3 (save) で合意
- [ ] 初期実装で `assignedTo` は null 固定で合意
- [ ] `wont_fix` による論理削除で合意（物理削除なし）
