import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

/**
 * Core logic for deleting a user account.
 * Separated for easier testing.
 */
export async function processDeleteUserAccount(
  auth: { uid: string },
  db: admin.firestore.Firestore,
  storage: admin.storage.Storage,
  stripe: Stripe
) {
  const uid = auth.uid;
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "ユーザーが見つかりません");
  }

  const userData = userSnap.data();
  const stripeSubscriptionId = userData?.stripeSubscriptionId;
  const stripeCustomerId = userData?.stripeCustomerId;

  try {
    // 1. Cancel Stripe subscription if it exists
    if (stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      } catch (err) {
        console.warn(`Failed to cancel Stripe subscription ${stripeSubscriptionId}:`, err);
      }
    }

    // 2. Delete Stripe customer (optional but recommended)
    if (stripeCustomerId) {
      try {
        await stripe.customers.del(stripeCustomerId);
      } catch (err) {
        console.warn(`Failed to delete Stripe customer ${stripeCustomerId}:`, err);
      }
    }

    // 3. Delete all books owned by the user
    const booksSnap = await db.collection("books").where("userId", "==", uid).get();
    for (const bookDoc of booksSnap.docs) {
      const bookId = bookDoc.id;

      // 3a. Delete qualityTasks associated with the book
      const tasksSnap = await db.collection("qualityTasks").where("bookId", "==", bookId).get();
      if (!tasksSnap.empty) {
        const taskBatch = db.batch();
        tasksSnap.docs.forEach((doc) => taskBatch.delete(doc.ref));
        await taskBatch.commit();
      }

      // 3b. Delete the book and its subcollections
      await db.recursiveDelete(bookDoc.ref);
    }

    // 4. Delete all companions owned by the user
    const companionsSnap = await db.collection("companions").where("userId", "==", uid).get();
    if (!companionsSnap.empty) {
      const companionBatch = db.batch();
      companionsSnap.docs.forEach((doc) => companionBatch.delete(doc.ref));
      await companionBatch.commit();
    }

    // 5. Delete all associated jobs
    const avatarJobsSnap = await db.collection("childAvatarGenerationJobs").where("userId", "==", uid).get();
    const companionJobsSnap = await db.collection("companionImageJobs").where("userId", "==", uid).get();

    if (!avatarJobsSnap.empty || !companionJobsSnap.empty) {
      const jobBatch = db.batch();
      avatarJobsSnap.docs.forEach((doc) => jobBatch.delete(doc.ref));
      companionJobsSnap.docs.forEach((doc) => jobBatch.delete(doc.ref));
      await jobBatch.commit();
    }

    // 6. Delete user assets in Cloud Storage
    const bucket = storage.bucket();
    await bucket.deleteFiles({ prefix: `users/${uid}/` });

    // 7. Recursive deletion of the user document and its subcollections (children, usage)
    await db.recursiveDelete(userRef);

    // 8. Delete the Firebase Auth user account
    await admin.auth().deleteUser(uid);

    return { success: true };
  } catch (err) {
    console.error(`Error deleting user account ${uid}:`, err);
    throw new HttpsError("internal", "アカウントの削除中にエラーが発生しました");
  }
}

/**
 * Callable function to securely delete a user account and all associated data.
 */
export const deleteUserAccount = onCall(
  {
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [stripeSecretKey],
    consumeAppCheckToken: true,
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const db = admin.firestore();
    const storage = admin.storage();
    const stripe = new Stripe(stripeSecretKey.value());

    return processDeleteUserAccount(request.auth, db, storage, stripe);
  }
);
