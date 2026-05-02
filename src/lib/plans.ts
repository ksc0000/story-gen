import type {
  CharacterConsistencyMode,
  CreationMode,
  ImageModelProfile,
  ImageQualityTier,
  PageCount,
  ProductPlan,
} from "@/lib/types";

export type PlanConfig = {
  productPlan: ProductPlan;
  label: string;
  shortLabel: string;
  description: string;
  badgeLabels: string[];
  allowedPageCounts: PageCount[];
  defaultPageCount: PageCount;
  imageQualityTier: ImageQualityTier;
  characterConsistencyMode: CharacterConsistencyMode;
  imageModelProfile?: ImageModelProfile;
  allowedCreationModes: CreationMode[];
  isPaid: boolean;
  enabled: boolean;
  sampleCtaLabel?: string;
};

export const CREATION_MODE_LABELS: Record<CreationMode, string> = {
  fixed_template: "テンプレート",
  guided_ai: "かんたんカスタム",
  original_ai: "オリジナル",
};

export const CHARACTER_CONSISTENCY_LABELS: Record<
  CharacterConsistencyMode,
  { label: string; description: string }
> = {
  cover_only: {
    label: "表紙・主要イメージ中心",
    description: "まずは短く自然に仕上げたい方向けです。",
  },
  key_pages: {
    label: "重要ページで雰囲気をそろえる",
    description: "思い出の見せ場をきれいに残しやすくなります。",
  },
  all_pages: {
    label: "全体の一貫性を重視",
    description: "1冊を通したまとまりを大切にします。",
  },
};

export const OUTFIT_MODE_LABELS: Record<
  "profile_default" | "theme_auto" | "user_custom",
  string
> = {
  profile_default: "いつもの服装",
  theme_auto: "テーマに合わせる",
  user_custom: "自分で指定した服装",
};

export const PLAN_CONFIGS: Record<ProductPlan, PlanConfig> = {
  free: {
    productPlan: "free",
    label: "無料でためす",
    shortLabel: "無料",
    description:
      "まずは気軽に1冊作ってみたい方向け。テンプレートにお子さんの名前や思い出を入れて、すぐに絵本を作れます。",
    badgeLabels: ["無料", "4ページ", "すぐ作れる"],
    allowedPageCounts: [4],
    defaultPageCount: 4,
    imageQualityTier: "light",
    characterConsistencyMode: "key_pages",
    imageModelProfile: "klein_fast",
    allowedCreationModes: ["fixed_template"],
    isPaid: false,
    enabled: true,
  },
  light_paid: {
    productPlan: "light_paid",
    label: "ライト",
    shortLabel: "ライト",
    description:
      "ページ数やテーマを少し広げて、手軽に作りたい方向け。画質と作りやすさのバランスを重視します。",
    badgeLabels: ["有料", "高速", "手軽"],
    allowedPageCounts: [4, 8],
    defaultPageCount: 4,
    imageQualityTier: "light",
    characterConsistencyMode: "key_pages",
    imageModelProfile: "klein_fast",
    allowedCreationModes: ["fixed_template", "guided_ai"],
    isPaid: true,
    enabled: false,
  },
  standard_paid: {
    productPlan: "standard_paid",
    label: "スタンダード",
    shortLabel: "おすすめ",
    description:
      "思い出や成長を、よりきれいな絵本として残したい方向け。画質と作りやすさのバランスが良いおすすめプランです。",
    badgeLabels: ["おすすめ", "高品質", "思い出向き"],
    allowedPageCounts: [4, 8, 12],
    defaultPageCount: 8,
    imageQualityTier: "standard",
    characterConsistencyMode: "all_pages",
    imageModelProfile: "klein_fast",
    allowedCreationModes: ["fixed_template", "guided_ai", "original_ai"],
    isPaid: true,
    enabled: false,
  },
  premium_paid: {
    productPlan: "premium_paid",
    label: "プレミアム",
    shortLabel: "高精細",
    description:
      "特別な思い出やギフト向け。お子さんらしさや絵本全体の仕上がりを重視して作ります。",
    badgeLabels: ["高精細", "ギフト向き", "特別な1冊"],
    allowedPageCounts: [4, 8, 12],
    defaultPageCount: 8,
    imageQualityTier: "premium",
    characterConsistencyMode: "all_pages",
    imageModelProfile: "pro_consistent",
    allowedCreationModes: ["fixed_template", "guided_ai", "original_ai"],
    isPaid: true,
    enabled: false,
    sampleCtaLabel: "高品質サンプルを見る",
  },
};

export const IMAGE_QUALITY_LABELS: Record<
  ImageQualityTier,
  { label: string; description: string }
> = {
  light: {
    label: "標準生成",
    description: "手軽さとかわいさのバランス",
  },
  standard: {
    label: "高品質生成",
    description: "よりきれいに残したい方向け",
  },
  premium: {
    label: "高精細生成",
    description: "特別な1冊向けの高品質",
  },
};

export function getCompatiblePlanConfigs(creationMode: CreationMode): PlanConfig[] {
  return Object.values(PLAN_CONFIGS).filter((plan) =>
    plan.allowedCreationModes.includes(creationMode)
  );
}

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

export function getPlanDisplayLabel(productPlan: ProductPlan): string {
  return PLAN_CONFIGS[productPlan]?.label ?? PLAN_CONFIGS.free.label;
}
