import type {
  CharacterConsistencyMode,
  CreationMode,
  GenerationMode,
  ImageModelProfile,
  ImageQualityTier,
  PageCount,
  ProductPlan,
} from "./types";

export type ServerPlanConfig = {
  productPlan: ProductPlan;
  allowedPageCounts: PageCount[];
  defaultPageCount: PageCount;
  imageQualityTier: ImageQualityTier;
  imageModelProfile?: ImageModelProfile;
  characterConsistencyMode: CharacterConsistencyMode;
  allowedCreationModes: CreationMode[];
  generationMode: GenerationMode;
  monthlyBookQuota?: number;
  enabled: boolean;
};

export const SERVER_PLAN_CONFIGS: Record<ProductPlan, ServerPlanConfig> = {
  free: {
    productPlan: "free",
    allowedPageCounts: [4],
    defaultPageCount: 4,
    imageQualityTier: "light",
    imageModelProfile: "openai_mini",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template"],
    generationMode: "reliable_fast",
    monthlyBookQuota: 1,
    enabled: true,
  },
  light_paid: {
    productPlan: "light_paid",
    allowedPageCounts: [4, 8],
    defaultPageCount: 4,
    imageQualityTier: "standard",
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template", "guided_ai"],
    generationMode: "reliable_fast",
    enabled: true,
  },
  standard_paid: {
    productPlan: "standard_paid",
    allowedPageCounts: [4, 8],
    defaultPageCount: 8,
    imageQualityTier: "standard",
    imageModelProfile: "openai_standard",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template", "guided_ai"],
    generationMode: "reliable_fast",
    monthlyBookQuota: 5,
    enabled: true,
  },
  premium_paid: {
    productPlan: "premium_paid",
    allowedPageCounts: [4, 8, 12],
    defaultPageCount: 8,
    imageQualityTier: "premium",
    imageModelProfile: "kontext_max",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template", "guided_ai", "original_ai"],
    generationMode: "quality",
    monthlyBookQuota: 10,
    enabled: true,
  },
};

export function getDefaultProductPlanForCreationMode(creationMode: CreationMode): ProductPlan {
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

export function getPlanConfig(productPlan: ProductPlan): ServerPlanConfig {
  return SERVER_PLAN_CONFIGS[productPlan];
}
