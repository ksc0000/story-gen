import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Core logic for deleting a child profile.
 * Separated for easier testing.
 */
export async function processDeleteChildProfile(
  childId: string,
  auth: { uid: string },
  db: admin.firestore.Firestore,
  storage: admin.storage.Storage
) {
  const uid = auth.uid;
  const childRef = db.collection("users").doc(uid).collection("children").doc(childId);
  const childSnap = await childRef.get();

  // 1. Existence check
  if (!childSnap.exists) {
    throw new HttpsError("not-found", "指定された子どもプロフィールが見つかりません");
  }

  try {
    // 2. Delete associated files in Cloud Storage
    // Path: users/{userId}/children/{childId}/
    const bucket = storage.bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/children/${childId}/` });

    // 3. Delete associated jobs in childAvatarGenerationJobs
    const jobsSnap = await db
      .collection("childAvatarGenerationJobs")
      .where("userId", "==", uid)
      .where("childId", "==", childId)
      .get();

    if (!jobsSnap.empty) {
      const batch = db.batch();
      jobsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // 4. Recursive deletion of the child profile and its subcollections (e.g., avatarGenerations)
    await db.recursiveDelete(childRef);

    return { success: true, childId };
  } catch (err) {
    console.error(`Error deleting child profile ${childId} for user ${uid}:`, err);
    throw new HttpsError("internal", "子どもプロフィールの削除中にエラーが発生しました");
  }
}

/**
 * Callable function to delete a child profile and its associated data (avatars, jobs).
 * Only the owner can delete their child's profile.
 */
export const deleteChildProfile = onCall(
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

    const { childId } = request.data as { childId: string };
    if (!childId || typeof childId !== "string") {
      throw new HttpsError("invalid-argument", "childId is required");
    }

    const db = admin.firestore();
    const storage = admin.storage();
    return processDeleteChildProfile(childId, request.auth, db, storage);
  }
);
