"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_PLAN_CONFIGS = void 0;
exports.getDefaultProductPlanForCreationMode = getDefaultProductPlanForCreationMode;
exports.getPlanConfig = getPlanConfig;
exports.SERVER_PLAN_CONFIGS = {
    free: {
        productPlan: "free",
        allowedPageCounts: [4],
        defaultPageCount: 4,
        imageQualityTier: "light",
        characterConsistencyMode: "all_pages",
        allowedCreationModes: ["fixed_template"],
        enabled: true,
    },
    light_paid: {
        productPlan: "light_paid",
        allowedPageCounts: [4, 8],
        defaultPageCount: 4,
        imageQualityTier: "light",
        characterConsistencyMode: "all_pages",
        allowedCreationModes: ["fixed_template", "guided_ai"],
        enabled: false,
    },
    standard_paid: {
        productPlan: "standard_paid",
        allowedPageCounts: [4, 8, 12],
        defaultPageCount: 8,
        imageQualityTier: "standard",
        characterConsistencyMode: "all_pages",
        allowedCreationModes: ["fixed_template", "guided_ai", "original_ai"],
        enabled: false,
    },
    premium_paid: {
        productPlan: "premium_paid",
        allowedPageCounts: [4, 8, 12],
        defaultPageCount: 8,
        imageQualityTier: "premium",
        characterConsistencyMode: "all_pages",
        allowedCreationModes: ["fixed_template", "guided_ai", "original_ai"],
        enabled: false,
    },
};
function getDefaultProductPlanForCreationMode(creationMode) {
    switch (creationMode) {
        case "original_ai":
            return "premium_paid";
        case "guided_ai":
            return "standard_paid";
        case "fixed_template":
        default:
            return "free";
    }
}
function getPlanConfig(productPlan) {
    return exports.SERVER_PLAN_CONFIGS[productPlan];
}
//# sourceMappingURL=plans.js.map