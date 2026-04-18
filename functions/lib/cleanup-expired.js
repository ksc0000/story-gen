"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpired = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
exports.cleanupExpired = (0, scheduler_1.onSchedule)({ schedule: "0 18 * * *", timeZone: "Asia/Tokyo", retryCount: 3, region: "asia-northeast1" }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const bucket = (0, storage_1.getStorage)().bucket();
    const now = firestore_1.Timestamp.now();
    v2_1.logger.info("Starting expired book cleanup", { now: now.toDate().toISOString() });
    const expiredBooksSnapshot = await db.collection("books").where("expiresAt", "<=", now).get();
    if (expiredBooksSnapshot.empty) {
        v2_1.logger.info("No expired books found.");
        return;
    }
    v2_1.logger.info(`Found ${expiredBooksSnapshot.size} expired book(s) to delete.`);
    let deletedCount = 0;
    let errorCount = 0;
    for (const bookDoc of expiredBooksSnapshot.docs) {
        const bookId = bookDoc.id;
        try {
            const pagesSnapshot = await db.collection("books").doc(bookId).collection("pages").get();
            const batch = db.batch();
            for (const pageDoc of pagesSnapshot.docs) {
                batch.delete(pageDoc.ref);
            }
            batch.delete(bookDoc.ref);
            await batch.commit();
            try {
                const [files] = await bucket.getFiles({ prefix: `books/${bookId}/pages/` });
                if (files.length > 0) {
                    await Promise.all(files.map((file) => file.delete()));
                }
            }
            catch (storageError) {
                v2_1.logger.warn(`Failed to delete storage files for book ${bookId}`, { storageError });
            }
            deletedCount++;
            v2_1.logger.info(`Deleted expired book: ${bookId}`);
        }
        catch (err) {
            errorCount++;
            v2_1.logger.error(`Failed to delete expired book: ${bookId}`, { err });
        }
    }
    v2_1.logger.info("Expired book cleanup complete", { deletedCount, errorCount });
});
//# sourceMappingURL=cleanup-expired.js.map