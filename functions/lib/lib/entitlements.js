"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canUseProductPlan = canUseProductPlan;
function canUseProductPlan(params) {
    if (params.productPlan === "free") {
        return true;
    }
    if (params.isAdmin === true) {
        return true;
    }
    return params.userPlan === "premium";
}
//# sourceMappingURL=entitlements.js.map