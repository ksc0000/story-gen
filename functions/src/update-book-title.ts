import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Core logic for updating a book title.
 * Separated for easier testing.
 */
export async function processUpdateBookTitle(
  bookId: string,
  newTitle: string,
  auth: { uid: string },
  db: admin.firestore.Firestore
) {
  const uid = auth.uid;
  const bookRef = db.collection("books").doc(bookId);
  const bookSnap = await bookRef.get();

  // 1. Existence check
  if (!bookSnap.exists) {
    throw new HttpsError("not-found", "指定された絵本が見つかりません");
  }

  const bookData = bookSnap.data();
  if (!bookData) {
    throw new HttpsError("not-found", "絵本データの読み込みに失敗しました");
  }

  // 2. Authorization check
  if (bookData.userId !== uid) {
    throw new HttpsError("permission-denied", "この絵本のタイトルを編集する権限がありません");
  }

  // 3. Validation
  const trimmedTitle = newTitle.trim();
  if (trimmedTitle.length === 0) {
    throw new HttpsError("invalid-argument", "タイトルを入力してください");
  }
  if (trimmedTitle.length > 100) {
    throw new HttpsError("invalid-argument", "タイトルは100文字以内で入力してください");
  }

  try {
    // 4. Update the title and updatedAt timestamp
    await bookRef.update({
      title: trimmedTitle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, bookId, newTitle: trimmedTitle };
  } catch (err) {
    console.error(`Error updating book title for ${bookId}:`, err);
    throw new HttpsError("internal", "タイトルの更新中にエラーが発生しました");
  }
}

/**
 * Callable function to update a book title.
 */
export const updateBookTitle = onCall(
  {
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 60,
    consumeAppCheckToken: true,
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const { bookId, newTitle } = request.data as { bookId: string; newTitle: string };
    if (!bookId || typeof bookId !== "string") {
      throw new HttpsError("invalid-argument", "bookId is required");
    }
    if (typeof newTitle !== "string") {
      throw new HttpsError("invalid-argument", "newTitle must be a string");
    }

    const db = admin.firestore();
    return processUpdateBookTitle(bookId, newTitle, request.auth, db);
  }
);
