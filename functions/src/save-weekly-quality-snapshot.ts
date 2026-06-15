import { onSchedule } from "firebase-functions/v2/scheduler";
import { saveQualitySnapshot } from "./lib/quality-snapshot";

/**
 * Scheduled function to capture a weekly snapshot of quality metrics.
 * Runs every Monday at 03:45 JST.
 */
export const saveWeeklyQualitySnapshot = onSchedule(
  {
    schedule: "45 3 * * 1",
    timeZone: "Asia/Tokyo",
    retryCount: 2,
    region: "asia-northeast1",
    memory: "512MiB",
  },
  async () => {
    await saveQualitySnapshot({
      source: "scheduled-weekly-quality",
      window: "weekly",
      sampleSize: 500, // Look back at up to 500 reviewed books
    });
  },
);
