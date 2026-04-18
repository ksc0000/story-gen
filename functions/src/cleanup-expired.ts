import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export const cleanupExpired = onSchedule(
  { schedule: "0 18 * * *", timeZone: "Asia/Tokyo", retryCount: 3, region: "asia-northeast1" },
  async () => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    const now = Timestamp.now();

    logger.info("Starting expired book cleanup", { now: now.toDate().toISOString() });

    const expiredBooksSnapshot = await db.collection("books").where("expiresAt", "<=", now).get();

    if (expiredBooksSnapshot.empty) { logger.info("No expired books found."); return; }

    logger.info(`Found ${expiredBooksSnapshot.size} expired book(s) to delete.`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const bookDoc of expiredBooksSnapshot.docs) {
      const bookId = bookDoc.id;
      try {
        const pagesSnapshot = await db.collection("books").doc(bookId).collection("pages").get();
        const batch = db.batch();
        for (const pageDoc of pagesSnapshot.docs) { batch.delete(pageDoc.ref); }
        batch.delete(bookDoc.ref);
        await batch.commit();

        try {
          const [files] = await bucket.getFiles({ prefix: `books/${bookId}/pages/` });
          if (files.length > 0) { await Promise.all(files.map((file) => file.delete())); }
        } catch (storageError) {
          logger.warn(`Failed to delete storage files for book ${bookId}`, { storageError });
        }

        deletedCount++;
        logger.info(`Deleted expired book: ${bookId}`);
      } catch (err) {
        errorCount++;
        logger.error(`Failed to delete expired book: ${bookId}`, { err });
      }
    }

    logger.info("Expired book cleanup complete", { deletedCount, errorCount });
  }
);
