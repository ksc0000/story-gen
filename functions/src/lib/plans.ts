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
  priceJpy?: number;
  enabled: boolean;
};

/**
 * 価格改訂案I: 2026-06 改訂
 * TODO: 既存契約ユーザーのグランドファザリング（旧価格維持）は Stripe 側で旧 Price ID を維持することで対応。
 */
export const SINGLE_PURCHASE_PRICES = {
  ai_guided: 1500,
  photo_story: 2000,
} as const;

export const SERVER_PLAN_CONFIGS: Record<ProductPlan, ServerPlanConfig> = {
  free: {
    productPlan: "free",
    allowedPageCounts: [4],
    defaultPageCount: 4,
    imageQualityTier: "light",
    // 画質統一方針 (2026-06): Free/Standard は flux-2-pro (pro_consistent) を使用。
    // 無料お試しでも本物の画質を体験してもらい定着率を上げる。差別化は冊数・ページ数・モード。
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template"],
    generationMode: "reliable_fast",
    // 2026-07: 1→3。集客強化のため無料枠を拡大。
    monthlyBookQuota: 3,
    enabled: true,
  },
  standard_paid: {
    productPlan: "standard_paid",
    allowedPageCounts: [4, 8],
    defaultPageCount: 8,
    imageQualityTier: "standard",
    // 画質統一方針 (2026-06): Standard も Free と同じ flux-2-pro。差別化は冊数・ページ数・AIモード。
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template", "guided_ai"],
    generationMode: "reliable_fast",
    // 2026-06: 5→8。上限消化(8p)でも画像原価は売上の約38%、粗利60%超。
    monthlyBookQuota: 8,
    priceJpy: 1480,
    enabled: true,
  },
  premium_paid: {
    productPlan: "premium_paid",
    allowedPageCounts: [4, 8, 12],
    defaultPageCount: 8,
    imageQualityTier: "premium",
    imageModelProfile: "kontext_max",
    characterConsistencyMode: "all_pages",
    allowedCreationModes: ["fixed_template", "guided_ai", "original_ai", "photo_story"],
    generationMode: "quality",
    // 2026-06: 10→15。8p想定で画像原価は売上の約35%、粗利65%。
    monthlyBookQuota: 15,
    priceJpy: 2980,
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

// ─── エンタープライズ（法人）プラン: 定額 ───────────────────────────────
export type OrgPlan = "enterprise_trial" | "enterprise_standard" | "enterprise_pro";

export interface OrgPlanConfig {
  plan: OrgPlan;
  label: string;
  priceJpy: number; // 0 = 無料トライアル
  /** 一括生成: 1回あたりの人数上限 */
  studentsPerRun: number;
  /** 一括生成: 組織の月次冊数上限 */
  monthlyBooks: number;
}

// 価格は暫定値。実課金有効化時に Stripe 商品と合わせて調整する。
export const ORG_PLAN_CONFIGS: Record<OrgPlan, OrgPlanConfig> = {
  enterprise_trial: { plan: "enterprise_trial", label: "トライアル", priceJpy: 0, studentsPerRun: 40, monthlyBooks: 100 },
  enterprise_standard: { plan: "enterprise_standard", label: "スタンダード", priceJpy: 9800, studentsPerRun: 80, monthlyBooks: 500 },
  enterprise_pro: { plan: "enterprise_pro", label: "プロ", priceJpy: 29800, studentsPerRun: 200, monthlyBooks: 2000 },
};

export function getOrgPlanConfig(plan: string | undefined): OrgPlanConfig {
  return ORG_PLAN_CONFIGS[(plan as OrgPlan)] ?? ORG_PLAN_CONFIGS.enterprise_trial;
}
