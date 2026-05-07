import { onSchedule } from "firebase-functions/v2/scheduler";
import { saveSloSnapshot } from "./lib/slo-snapshot";

export const saveWeeklySloSnapshot = onSchedule(
  { schedule: "15 3 * * 1", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" },
  // 毎週月曜 03:15 JST (timeZone 指定により cron は JST として解釈される)
  async () => {
    await saveSloSnapshot({
      source: "scheduled-weekly-slo",
      window: "weekly",
      sampleSize: 200,
    });
  },
);
