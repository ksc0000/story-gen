"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveWeeklySloSnapshot = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const slo_snapshot_1 = require("./lib/slo-snapshot");
exports.saveWeeklySloSnapshot = (0, scheduler_1.onSchedule)({ schedule: "15 3 * * 1", timeZone: "Asia/Tokyo", retryCount: 2, region: "asia-northeast1" }, 
// 毎週月曜 03:15 JST (timeZone 指定により cron は JST として解釈される)
async () => {
    await (0, slo_snapshot_1.saveSloSnapshot)({
        source: "scheduled-weekly-slo",
        window: "weekly",
        sampleSize: 200,
    });
});
//# sourceMappingURL=save-weekly-slo-snapshot.js.map