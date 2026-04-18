"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMonthlyQuota = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const firestore_1 = require("firebase-admin/firestore");
exports.resetMonthlyQuota = (0, scheduler_1.onSchedule)({ schedule: "5 15 1 * *", timeZone: "Asia/Tokyo", retryCount: 3, region: "asia-northeast1" }, async () => {
    const db = (0, firestore_1.getFirestore)();
    v2_1.logger.info("Starting monthly quota reset");
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
        v2_1.logger.info("No users found.");
        return;
    }
    v2_1.logger.info(`Resetting monthlyGenerationCount for ${usersSnapshot.size} user(s).`);
    const BATCH_LIMIT = 500;
    const userDocs = usersSnapshot.docs;
    let processedCount = 0;
    for (let i = 0; i < userDocs.length; i += BATCH_LIMIT) {
        const chunk = userDocs.slice(i, i + BATCH_LIMIT);
        const batch = db.batch();
        for (const userDoc of chunk) {
            batch.update(userDoc.ref, { monthlyGenerationCount: 0 });
        }
        await batch.commit();
        processedCount += chunk.length;
        v2_1.logger.info(`Processed ${processedCount}/${userDocs.length} users`);
    }
    v2_1.logger.info("Monthly quota reset complete", { totalUsers: processedCount });
});
//# sourceMappingURL=reset-monthly-quota.js.map