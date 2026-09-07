/**
 * 内部アカウント（スモークテスト・管理者の検証・Stripe テスト契約）の判定。
 *
 * ダッシュボードの「利用者数」「有料」「絵本数」に内部アカウントが混ざり、
 * 18 人 / 有料 12 人 / MRR ¥17,760 のうち本物が 5 人 / 0 人 / ¥0 という状態だった（2026-09-08 監査）。
 * 判定規則はサーバ側 functions/src/lib/internal-accounts.ts と同一に保つこと。
 */
export interface InternalAccountSource {
  internal?: boolean;
  generationOverride?: { bypassMonthlyLimit?: boolean } | null;
}

const INTERNAL_UID_PATTERN = /^(smoke|registered-flow-smoke|test-user|e2e-)/;

export function isInternalAccount(uid: string, user?: InternalAccountSource | null): boolean {
  if (user?.internal === true) return true;
  if (INTERNAL_UID_PATTERN.test(uid)) return true;
  // 上限バイパスは検証用の付与（オーナー・スモーク）。一般ユーザーには付かない
  if (user?.generationOverride?.bypassMonthlyLimit === true) return true;
  return false;
}

/** 有料ユーザーの定義: Stripe の契約 ID があり、productPlan が有料で、内部ではない */
export function isPayingUser(
  uid: string,
  user?: (InternalAccountSource & { productPlan?: string; stripeSubscriptionId?: string | null }) | null
): boolean {
  if (!user || isInternalAccount(uid, user)) return false;
  const paidPlan = user.productPlan === "standard_paid" || user.productPlan === "premium_paid";
  return paidPlan && typeof user.stripeSubscriptionId === "string" && user.stripeSubscriptionId.length > 0;
}
