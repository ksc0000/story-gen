import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { containsNGWords } from "./lib/content-filter";

const MAX_PAGE_TEXT_LENGTH = 300;

/**
 * Core logic for editing a single story page's text. Pages are otherwise
 * written only by Cloud Functions (Firestore rules deny client writes), so
 * user edits go through this callable, which enforces ownership and a basic
 * content-safety check before persisting.
 */
export async function processUpdatePageText(
  bookId: string,
  pageNumber: number,
  text: string,
  auth: { uid: string },
  db: admin.firestore.Firestore
) {
  const uid = auth.uid;
  const bookRef = db.collection("books").doc(bookId);
  const bookSnap = await bookRef.get();

  if (!bookSnap.exists) {
    throw new HttpsError("not-found", "指定された絵本が見つかりません");
  }
  const bookData = bookSnap.data();
  if (!bookData) {
    throw new HttpsError("not-found", "絵本データの読み込みに失敗しました");
  }
  if (bookData.userId !== uid) {
    throw new HttpsError("permission-denied", "この絵本を編集する権限がありません");
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new HttpsError("invalid-argument", "本文を入力してください");
  }
  if (trimmed.length > MAX_PAGE_TEXT_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `本文は${MAX_PAGE_TEXT_LENGTH}文字以内で入力してください`
    );
  }

  const ng = containsNGWords(trimmed);
  if (!ng.safe) {
    throw new HttpsError("invalid-argument", "使用できない言葉が含まれています。表現を見直してください。");
  }

  const pageRef = bookRef.collection("pages").doc(`page-${pageNumber}`);
  const pageSnap = await pageRef.get();
  if (!pageSnap.exists) {
    throw new HttpsError("not-found", "指定されたページが見つかりません");
  }

  try {
    await pageRef.update({
      text: trimmed,
      textEditedByUser: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await bookRef.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
    });
    return { success: true, bookId, pageNumber, text: trimmed };
  } catch (err) {
    console.error(`Error updating page text for ${bookId}/page-${pageNumber}:`, err);
    throw new HttpsError("internal", "本文の更新中にエラーが発生しました");
  }
}

/** Callable function to edit a story page's text. */
export const updateBookPageText = onCall(
  {
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 60,
    consumeAppCheckToken: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    const { bookId, pageNumber, text } = request.data as {
      bookId: string;
      pageNumber: number;
      text: string;
    };
    if (!bookId || typeof bookId !== "string") {
      throw new HttpsError("invalid-argument", "bookId is required");
    }
    if (typeof pageNumber !== "number" || !Number.isInteger(pageNumber) || pageNumber < 0) {
      throw new HttpsError("invalid-argument", "pageNumber must be a non-negative integer");
    }
    if (typeof text !== "string") {
      throw new HttpsError("invalid-argument", "text must be a string");
    }

    const db = admin.firestore();
    return processUpdatePageText(bookId, pageNumber, text, request.auth, db);
  }
);
