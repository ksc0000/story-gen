import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

/**
 * サーバーが必ず自分で決める（クライアントの申告を採用しない）フィールド。
 * ここに挙げたキーは受け取っても捨てる。
 */
const SERVER_AUTHORITATIVE_KEYS = [
  "userId",
  "status",
  "progress",
  "createdAt",
  "createdAtMs",
  "createdAtSource",
  "updatedAt",
  "updatedAtMs",
  "expiresAt",
  "public",
  "favorite",
  "orgId",
  "errorMessage",
  "errorCode",
  "title",
] as const;

/** ネストを含めて undefined を落とす（Firestore は undefined を受け付けない） */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/** 絵本の保持期間（既存のクライアント実装と同じ 180 日） */
const RETENTION_DAYS = 180;

export interface CreateBookResult {
  bookId: string;
}

/**
 * 絵本ドキュメントの作成をサーバーに集約する Callable (#734 Phase 1)。
 *
 * これまでフロントが `addDoc(collection(db, "books"), payload)` で直接書いていたため、
 * 「Firestore のドキュメント形状」が事実上の公開 API になっていた。
 * ネイティブアプリを追加すると同じ形状を各言語で再実装することになるため、
 * 明示的な API 契約へ移行するための第一歩。
 *
 * Phase 1 の方針（意図的に保守的）:
 * - 受け取るペイロードの形は既存とほぼ同じにして、移行リスクを最小化する
 * - ただし **サーバーが決めるべき値（所有者・状態・時刻・公開フラグ等）は受け取らず上書きする**
 * - プラン/ページ数/作成モードの正規化は既存どおり generate-book.ts 側の
 *   ロジックが担当する（重複実装を避けるため、ここでは再実装しない）
 *
 * Phase 2 以降: 入力を最小限の request 形に絞り、firestore.rules の
 * `allow create` をクライアントに対して閉じる。
 */
export const createBook = onCall(
  {
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 60,
    consumeAppCheckToken: true,
  },
  async (request): Promise<CreateBookResult> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    const uid = request.auth.uid;

    const payload = request.data as Record<string, unknown> | undefined;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new HttpsError("invalid-argument", "作成内容が正しくありません");
    }

    // クライアント申告のうち、サーバー権威フィールドは捨てる
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if ((SERVER_AUTHORITATIVE_KEYS as readonly string[]).includes(k)) continue;
      sanitized[k] = v;
    }

    // 最低限の必須チェック（詳細な正規化は generate-book.ts が行う）
    if (typeof sanitized.theme !== "string" || sanitized.theme.length === 0) {
      throw new HttpsError("invalid-argument", "テーマが指定されていません");
    }

    const db = admin.firestore();
    const nowMs = Date.now();
    const doc = stripUndefined({
      ...sanitized,
      userId: uid,
      title: "",
      status: "generating",
      progress: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      createdAtSource: "server_create",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: nowMs,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        nowMs + RETENTION_DAYS * 24 * 60 * 60 * 1000
      ),
    });

    try {
      const ref = await db.collection("books").add(doc);
      logger.info("createBook: book created", { bookId: ref.id, uid });
      return { bookId: ref.id };
    } catch (err) {
      logger.error("createBook: failed to create book", { uid, error: String(err) });
      throw new HttpsError("internal", "絵本の作成中にエラーが発生しました");
    }
  }
);
