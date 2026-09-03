import type { UserPlan } from "./types";

export const FREE_MONTHLY_BOOK_LIMIT = 3;
export const PREMIUM_MONTHLY_BOOK_LIMIT = 20;

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

/**
 * 月次使用量ドキュメントのキー（UTC の YYYY-MM）。
 * クライアント side の src/lib/monthly-usage.ts と同じ計算にすること（画面の残り冊数表示が
 * ここで数えた値を読むため）。
 */
export function currentUsageYearMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

