import { describe, it, expect } from "vitest";
import { PLAN_CONFIGS, SINGLE_PURCHASE_PRICES, resolveProductPlan } from "@/lib/plans";

describe("resolveProductPlan", () => {
  it("uses productPlan when present", () => {
    expect(resolveProductPlan({ productPlan: "premium_paid", plan: "premium" })).toBe("premium_paid");
    expect(resolveProductPlan({ productPlan: "standard_paid", plan: "free" })).toBe("standard_paid");
  });

  it("falls back to standard_paid when productPlan is missing but legacy plan is premium", () => {
    expect(resolveProductPlan({ plan: "premium" })).toBe("standard_paid");
    // standard プランの月次上限は 8 冊（2026-06 上限引き上げ。home の 0/1 表示バグの回帰防止）
    expect(PLAN_CONFIGS[resolveProductPlan({ plan: "premium" })].monthlyBookQuota).toBe(8);
  });

  it("falls back to free when neither productPlan nor premium plan is set", () => {
    expect(resolveProductPlan({ plan: "free" })).toBe("free");
    expect(resolveProductPlan(undefined)).toBe("free");
    expect(resolveProductPlan(null)).toBe("free");
  });

  it("planOverride takes precedence over productPlan (admin dev panel)", () => {
    expect(
      resolveProductPlan({ productPlan: "free", plan: "free", planOverride: "premium_paid" })
    ).toBe("premium_paid");
    expect(
      resolveProductPlan({ productPlan: "premium_paid", plan: "premium", planOverride: "free" })
    ).toBe("free");
  });
});

describe("PLAN_CONFIGS Pricing", () => {
  it("has the updated standard_paid price", () => {
    expect(PLAN_CONFIGS.standard_paid.priceJpy).toBe(1480);
  });

  it("has the updated premium_paid price", () => {
    expect(PLAN_CONFIGS.premium_paid.priceJpy).toBe(2980);
  });

  it("has definition for single purchase prices", () => {
    expect(SINGLE_PURCHASE_PRICES.ai_guided).toBe(1500);
    expect(SINGLE_PURCHASE_PRICES.photo_story).toBe(2000);
  });
});
