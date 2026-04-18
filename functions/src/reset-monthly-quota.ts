import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";

export const resetMonthlyQuota = onSchedule(
  { schedule: "5 15 1 * *", timeZone: "Asia/Tokyo", retryCount: 3, region: "asia-northeast1" },
  async () => {
    const db = getFirestore();

    logger.info("Starting monthly quota reset");

    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) { logger.info("No users found."); return; }

    logger.info(`Resetting monthlyGenerationCount for ${usersSnapshot.size} user(s).`);

    const BATCH_LIMIT = 500;
    const userDocs = usersSnapshot.docs;
    let processedCount = 0;

    for (let i = 0; i < userDocs.length; i += BATCH_LIMIT) {
      const chunk = userDocs.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      for (const userDoc of chunk) { batch.update(userDoc.ref, { monthlyGenerationCount: 0 }); }
      await batch.commit();
      processedCount += chunk.length;
      logger.info(`Processed ${processedCount}/${userDocs.length} users`);
    }

    logger.info("Monthly quota reset complete", { totalUsers: processedCount });
  }
);
