import { describe, it, expect } from "vitest";
import { isInternalAccount, isPayingUser } from "@/lib/internal-accounts";

describe("internal-accounts", () => {
  it("スモーク uid・internal フラグ・上限バイパスは内部", () => {
    expect(isInternalAccount("smoke-p53c-photo")).toBe(true);
    expect(isInternalAccount("registered-flow-smoke-t3-3i-4-1")).toBe(true);
    expect(isInternalAccount("abc", { internal: true })).toBe(true);
    expect(isInternalAccount("abc", { generationOverride: { bypassMonthlyLimit: true } })).toBe(true);
  });
  it("一般ユーザーは内部ではない", () => {
    expect(isInternalAccount("COSigq3JYAZCjZINZxJShmsLLWC3", { generationOverride: null })).toBe(false);
  });
  it("有料 = Stripe 契約 ID あり かつ productPlan 有料 かつ 非内部", () => {
    expect(isPayingUser("u", { productPlan: "standard_paid", stripeSubscriptionId: "sub_x" })).toBe(true);
    expect(isPayingUser("u", { productPlan: "standard_paid", stripeSubscriptionId: "sub_x", internal: true })).toBe(false);
    expect(isPayingUser("u", { productPlan: "standard_paid" })).toBe(false);
    expect(isPayingUser("u", { productPlan: "free", stripeSubscriptionId: "sub_x" })).toBe(false);
  });
});
