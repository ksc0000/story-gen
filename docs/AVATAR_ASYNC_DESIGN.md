# アバター生成の非同期ジョブフロー移行設計 (Issue #108)

## 1. 現状の問題

### 現在の `generateChildCharacter` の同期フロー概要
現在、子どものアバター画像を生成する `generateChildCharacter` は Firebase Functions の `onCall` (Callable) を利用した同期的な実装となっている。

1. フロントエンドから `childId` や修正リクエスト（`revisionRequest`）を引数に呼び出し。
2. Backend (Cloud Functions) 内で Replicate API を呼び出し、画像生成が完了するまで待機。
3. 生成された画像を Cloud Storage にアップロードし、Firestore に履歴を保存。
4. 生成結果（候補画像 URL 等）を `onCall` のレスポンスとしてフロントエンドに返却。

### タイムアウトリスクと UX 上の課題
- **タイムアウトリスク:** 現在 `timeoutSeconds: 300` (5分) が設定されているが、画像生成モデルの負荷や API の遅延により、この制限時間を超える可能性がある。タイムアウトが発生すると、バックエンドで生成が継続されていてもフロントエンド側はエラーとなり、結果の受け取りに失敗する。
- **UX 上の課題:** 同期処理であるため、生成が終わるまでユーザーは画面を離れることができず、長い待機時間を強いることになる。また、通信断やブラウザの更新によりレスポンスを受け取れなかった場合、生成が成功したのか失敗したのかをユーザーが確認する手段が限られる。

## 2. 提案するアーキテクチャ

`generateBook` と同様に、Firestore の書き込みをトリガーとした非同期ジョブフローへ移行する。

### `childAvatarGenerationJobs/{jobId}` データモデル
非同期ジョブの状態を管理するための新しいコレクションを導入する。

```typescript
interface ChildAvatarGenerationJob {
  userId: string;
  childId: string;
  status: "pending" | "generating" | "completed" | "failed";
  // 生成リクエストのパラメータ
  request: {
    revisionRequest?: AvatarRevisionRequest;
    baseGenerationId?: string;
    variantStyle?: IllustrationStyle;
  };
  // 生成結果
  result?: {
    batchId: string;
    attemptNumber: number;
    candidates: Array<{
      generationId: string;
      imageUrl: string;
      style: IllustrationStyle;
      styleLabel: string;
      prompt: string;
    }>;
  };
  error?: {
    message: string;
    code: string;
  };
  createdAt: FieldValue; // serverTimestamp
  updatedAt: FieldValue; // serverTimestamp
}
```

### Firestore トリガー関数のシグネチャ案
新しいトリガー関数を `functions/src/` に追加する。

```typescript
export const onAvatarJobCreated = onDocumentCreated(
  {
    document: "childAvatarGenerationJobs/{jobId}",
    secrets: [replicateApiToken],
    region: "asia-northeast1",
    timeoutSeconds: 540, // 余裕を持たせた設定
    memory: "1GiB",
  },
  async (event) => {
    // 既存の generateChildCharacter のロジックを非同期実行
    // ステータスを "generating" -> "completed" or "failed" に更新
  }
);
```

### フロントエンドのステータス監視フロー
1. フロントエンドは `childAvatarGenerationJobs` コレクションに新しいジョブドキュメントを追加する。
2. 返された `jobId` を使って、Firestore の `onSnapshot` で対象ドキュメントを監視する。
3. `status` が `completed` になったら結果を表示し、`failed` の場合はエラーを表示する。

## 3. 既存フローとの比較

### `generateBook` の非同期フローとの類似点・相違点

| 項目 | `generateBook` フロー | 提案するアバターフロー |
| :--- | :--- | :--- |
| **トリガー** | `books/{bookId}` の作成 | `childAvatarGenerationJobs/{jobId}` の作成 |
| **状態管理** | `status` フィールドで管理 | 同様 |
| **監視方法** | `onSnapshot` による監視 | 同様 |
| **相違点** | 絵本データそのものを作成・更新する | 生成用の「使い捨てジョブ」を介して実行する |
| **相違点** | 1つのブックで複数の画像＋本文を生成 | 1つのジョブでアバター候補を生成し履歴に残す |

アバター生成は「試行錯誤」が多く発生するため、`books` コレクションのように実体データとジョブを一体化させるのではなく、独立したジョブコレクションを用いることで、クリーンなデータ構造を維持する。

## 4. 移行ステップ

### 1. バックエンド (Functions)
- `childAvatarGenerationJobs` トリガー関数の実装。
- 既存の `generateChildCharacter` ロジックをライブラリ化し、トリガーから呼び出せるように共通化。
- セキュリティルール（`firestore.rules`）の更新。

### 2. フロントエンド (Web)
- `useAvatarGenerationJob` フックの実装（ジョブ作成と監視）。
- アバター生成画面の UI を非同期対応（生成中のローディング表示、バックグラウンド実行の許容）。

### 3. テスト
- ジョブ作成から完了までの統合テストの作成。
- タイムアウト発生時の挙動（再試行やクリーンアップ）の確認。

## 5. 未解決事項・リスク

- **ジョブのクリーンアップ:** 完了または失敗した古いジョブドキュメントをいつ削除するか（`cleanup-stale-generation` と同様の仕組みが必要か）。
- **同時実行制限:** ユーザーが短時間に大量のジョブを投入できないようにするレートリミットの設計。
- **コスト:** 同期型（Callable）に比べ Firestore の書き込み回数がわずかに増えるが、許容範囲内か。
- **リビジョン履歴の整合性:** 非同期実行中に別の子どもプロフィール変更があった場合の排他制御。
