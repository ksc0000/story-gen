import type { ProductPlan, UserPlan } from "./types";

export function canUseProductPlan(params: {
  userPlan: UserPlan;
  productPlan: ProductPlan;
  isAdmin?: boolean;
}): boolean {
  if (params.productPlan === "free") {
    return true;
  }

  if (params.isAdmin === true) {
    return true;
  }

  return params.userPlan === "premium";
}
