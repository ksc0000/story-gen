import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logAdminOperation } from "./lib/audit-logger";

/**
 * Core logic for deleting a book.
 * Separated for easier testing.
 */
export async function processDeleteBook(
  bookId: string,
  auth: { uid: string; token: admin.auth.DecodedIdToken },
  db: admin.firestore.Firestore
) {
  const uid = auth.uid;
  const isAdmin = auth.token.admin === true;
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
  // Only the owner or an admin can delete the book
  if (bookData.userId !== uid && !isAdmin) {
    throw new HttpsError("permission-denied", "この絵本を削除する権限がありません");
  }

  try {
    // 3. Recursive deletion of the book and its subcollections
    await db.recursiveDelete(bookRef);

    // 4. Audit logging if performed by an admin
    if (isAdmin) {
      await logAdminOperation({
        operation: "delete_book",
        adminUid: uid,
        targetId: bookId,
        targetType: "book",
        payload: {
          title: bookData.title,
          ownerId: bookData.userId,
        },
        db,
      });
    }

    return { success: true, bookId };
  } catch (err) {
    console.error(`Error deleting book ${bookId}:`, err);
    throw new HttpsError("internal", "絵本の削除中にエラーが発生しました");
  }
}

/**
 * Callable function to delete a book and its associated data (pages, feedback).
 * Only the owner of the book or an admin can delete it.
 */
export const deleteBook = onCall(
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

    const { bookId } = request.data as { bookId: string };
    if (!bookId || typeof bookId !== "string") {
      throw new HttpsError("invalid-argument", "bookId is required");
    }

    const db = admin.firestore();
    return processDeleteBook(bookId, request.auth, db);
  }
);
