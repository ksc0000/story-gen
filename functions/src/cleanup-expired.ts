import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export const cleanupExpired = onSchedule(
  { schedule: "0 4 * * *", timeZone: "Asia/Tokyo", retryCount: 3, region: "asia-northeast1" },
  // 毎日 04:00 JST。SLO/メトリクス/品質スナップショット(03:00〜03:45 JST)が
  // 当日分を集計し終えてから削除する。
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

    const chunkSize = 10;
    for (let i = 0; i < expiredBooksSnapshot.docs.length; i += chunkSize) {
      const chunk = expiredBooksSnapshot.docs.slice(i, i + chunkSize);

      await Promise.all(chunk.map(async (bookDoc) => {
        const bookId = bookDoc.id;
        try {
          const pagesSnapshot = await db.collection("books").doc(bookId).collection("pages").get();
          const batch = db.batch();
          for (const pageDoc of pagesSnapshot.docs) { batch.delete(pageDoc.ref); }
          batch.delete(bookDoc.ref);
          await batch.commit();

          try {
            // 画像は books/{bookId}/page-N.png / cover.png、PDF は
            // books/{bookId}/outputs/book.pdf に保存される。
            // 以前は存在しない `books/{bookId}/pages/` を指していたため、
            // Firestore だけ消えて Storage のファイルが残り続けていた。
            await bucket.deleteFiles({ prefix: `books/${bookId}/` });
          } catch (storageError) {
            logger.warn(`Failed to delete storage files for book ${bookId}`, { storageError });
          }

          deletedCount++;
          logger.info(`Deleted expired book: ${bookId}`);
        } catch (err) {
          errorCount++;
          logger.error(`Failed to delete expired book: ${bookId}`, { err });
        }
      }));
    }

    logger.info("Expired book cleanup complete", { deletedCount, errorCount });
  }
);
