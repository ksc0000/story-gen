"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTemplates = exports.resetMonthlyQuota = exports.cleanupExpired = exports.generateChildCharacter = exports.generateBook = void 0;
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
var generate_book_1 = require("./generate-book");
Object.defineProperty(exports, "generateBook", { enumerable: true, get: function () { return generate_book_1.generateBook; } });
var generate_child_character_1 = require("./generate-child-character");
Object.defineProperty(exports, "generateChildCharacter", { enumerable: true, get: function () { return generate_child_character_1.generateChildCharacter; } });
var cleanup_expired_1 = require("./cleanup-expired");
Object.defineProperty(exports, "cleanupExpired", { enumerable: true, get: function () { return cleanup_expired_1.cleanupExpired; } });
var reset_monthly_quota_1 = require("./reset-monthly-quota");
Object.defineProperty(exports, "resetMonthlyQuota", { enumerable: true, get: function () { return reset_monthly_quota_1.resetMonthlyQuota; } });
var seed_templates_1 = require("./seed-templates");
Object.defineProperty(exports, "seedTemplates", { enumerable: true, get: function () { return seed_templates_1.seedTemplates; } });
//# sourceMappingURL=index.js.map