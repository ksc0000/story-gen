"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDailySloSnapshot = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const slo_snapshot_1 = require("./lib/slo-snapshot");
exports.saveDailySloSnapshot = (0, scheduler_1.onSchedule)({ schedule: "0 3 * * *", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" }, 
// 毎日 03:00 JST (timeZone 指定により cron は JST として解釈される)
async () => {
    await (0, slo_snapshot_1.saveSloSnapshot)({
        source: "scheduled-daily-slo",
        window: "daily",
        sampleSize: 200,
    });
});
//# sourceMappingURL=save-daily-slo-snapshot.js.map