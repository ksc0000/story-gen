"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREMIUM_MONTHLY_BOOK_LIMIT = exports.FREE_MONTHLY_BOOK_LIMIT = void 0;
exports.getMonthlyBookLimit = getMonthlyBookLimit;
exports.canGenerateBookThisMonth = canGenerateBookThisMonth;
exports.FREE_MONTHLY_BOOK_LIMIT = 3;
exports.PREMIUM_MONTHLY_BOOK_LIMIT = 999;
function getMonthlyBookLimit(userPlan) {
    return userPlan === "premium" ? exports.PREMIUM_MONTHLY_BOOK_LIMIT : exports.FREE_MONTHLY_BOOK_LIMIT;
}
function canGenerateBookThisMonth(params) {
    if (params.isAdmin === true) {
        return true;
    }
    return params.currentCount < getMonthlyBookLimit(params.userPlan);
}
//# sourceMappingURL=usage.js.map