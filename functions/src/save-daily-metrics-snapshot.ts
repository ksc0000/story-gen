import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { computeAndSaveDailyMetrics, jstDayKey } from "./lib/daily-metrics";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 毎日 03:05 JST に当日の日次メトリクスを集計・保存する。
 * （SLO スナップショットの 03:00 とずらして負荷を分散）
 */
export const saveDailyMetricsSnapshot = onSchedule(
  { schedule: "5 3 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" },
  async () => {
    const today = jstDayKey(Date.now());
    // 当日と前日を再計算（前日の遅延データを取りこぼさないため）
    const yesterday = jstDayKey(Date.now() - DAY_MS);
    await computeAndSaveDailyMetrics({
      startDayKey: yesterday,
      endDayKey: today,
      source: "scheduled-daily-metrics",
    });
  }
);

/**
 * 過去 N 日分の日次メトリクスを遡及計算する管理者向け callable。
 * 既存の users / books / processedStripeSessions の作成日時から再構築する。
 * ※ 有料内訳・MRR は現在値のみ（過去のプラン状態は記録が無いため最新日に付与）。
 */
export const backfillDailyMetrics = onCall(
  { region: "asia-northeast1", timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    if (request.auth?.token.admin !== true) {
      throw new HttpsError("permission-denied", "管理者のみ実行できます。");
    }
    const days = Math.min(Math.max(Number(request.data?.days ?? 90), 1), 365);
    const endDayKey = jstDayKey(Date.now());
    const startDayKey = jstDayKey(Date.now() - (days - 1) * DAY_MS);

    logger.info("Backfilling daily metrics", { days, startDayKey, endDayKey });
    const result = await computeAndSaveDailyMetrics({
      startDayKey,
      endDayKey,
      source: "admin-backfill",
    });
    return { ok: true, days, ...result };
  }
);
