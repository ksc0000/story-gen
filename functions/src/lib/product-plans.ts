/**
 * ユーザーの「本当のプラン」（productPlan）をサーバで解決する。
 *
 * これまでサーバは legacy の `plan: "free" | "premium"` しか見ず（上限 3 / 20 冊、premium なら全モード可）、
 * クライアントは `productPlan`（free / standard_paid / premium_paid、上限 3 / 8 / 15 冊）で表示していた。
 * Stripe は standard も premium も `plan: "premium"` を書くため、standard 契約者がサーバでは premium 相当に
 * なっていた。ここで解決規則をクライアント（src/lib/plans.ts resolveProductPlan）と一致させる。
 */
import type { CreationMode, ProductPlan } from "./types";
import { getPlanConfig } from "./plans";

export interface UserPlanSource {
  plan?: string;
  productPlan?: string;
  planOverride?: string;
  generationOverride?: { bypassMonthlyLimit?: boolean };
}

const PRODUCT_PLANS: readonly ProductPlan[] = ["free", "standard_paid", "premium_paid"];
const PLAN_RANK: Record<ProductPlan, number> = { free: 0, standard_paid: 1, premium_paid: 2 };

function asProductPlan(value: unknown): ProductPlan | undefined {
  return typeof value === "string" && (PRODUCT_PLANS as readonly string[]).includes(value)
    ? (value as ProductPlan)
    : undefined;
}

/**
 * クライアントの resolveProductPlan と同じ優先順:
 * 1. bypassMonthlyLimit（開発用）は premium_paid 相当
 * 2. planOverride（管理者のプレビュー）
 * 3. productPlan（Stripe webhook が書く）
 * 4. legacy plan === "premium" は standard_paid 相当
 * 5. free
 */
export function resolveUserProductPlan(user: UserPlanSource | undefined | null): ProductPlan {
  if (user?.generationOverride?.bypassMonthlyLimit === true) return "premium_paid";
  return (
    asProductPlan(user?.planOverride) ??
    asProductPlan(user?.productPlan) ??
    (user?.plan === "premium" ? "standard_paid" : "free")
  );
}

export function getMonthlyBookLimitForPlan(productPlan: ProductPlan): number {
  return getPlanConfig(productPlan).monthlyBookQuota ?? 3;
}

export function canGenerateThisMonth(params: {
  userProductPlan: ProductPlan;
  currentCount: number;
  isAdmin?: boolean;
}): boolean {
  if (params.isAdmin === true) return true;
  return params.currentCount < getMonthlyBookLimitForPlan(params.userProductPlan);
}

/** 要求された絵本のプラン設定を、ユーザーのプランで使ってよいか（同格以下なら可） */
export function canUseRequestedPlan(params: {
  userProductPlan: ProductPlan;
  requestedPlan: ProductPlan;
  isAdmin?: boolean;
}): boolean {
  if (params.isAdmin === true) return true;
  return PLAN_RANK[params.requestedPlan] <= PLAN_RANK[params.userProductPlan];
}

export function isCreationModeAllowedForPlan(userProductPlan: ProductPlan, mode: CreationMode): boolean {
  return getPlanConfig(userProductPlan).allowedCreationModes.includes(mode);
}
