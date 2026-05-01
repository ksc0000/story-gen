import type { UserPlan } from "./types";

export const FREE_MONTHLY_BOOK_LIMIT = 3;
export const PREMIUM_MONTHLY_BOOK_LIMIT = 999;

export function getMonthlyBookLimit(userPlan: UserPlan): number {
  return userPlan === "premium" ? PREMIUM_MONTHLY_BOOK_LIMIT : FREE_MONTHLY_BOOK_LIMIT;
}

export function canGenerateBookThisMonth(params: {
  userPlan: UserPlan;
  currentCount: number;
  isAdmin?: boolean;
}): boolean {
  if (params.isAdmin === true) {
    return true;
  }

  return params.currentCount < getMonthlyBookLimit(params.userPlan);
}
