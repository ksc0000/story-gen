import { onSchedule } from "firebase-functions/v2/scheduler";
import { saveSloSnapshot } from "./lib/slo-snapshot";

export const saveDailySloSnapshot = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" },
  // 毎日 03:00 JST (timeZone 指定により cron は JST として解釈される)
  async () => {
    await saveSloSnapshot({
      source: "scheduled-daily-slo",
      window: "daily",
      sampleSize: 200,
    });
  },
);
