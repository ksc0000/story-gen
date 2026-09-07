import { describe, it, expect } from "vitest";
import {
  resolveUserProductPlan,
  getMonthlyBookLimitForPlan,
  canGenerateThisMonth,
  canUseRequestedPlan,
  isCreationModeAllowedForPlan,
} from "../src/lib/product-plans";

describe("resolveUserProductPlan（クライアント resolveProductPlan と同じ規則）", () => {
  it("productPlan を最優先、legacy premium は standard_paid、未設定は free", () => {
    expect(resolveUserProductPlan({ productPlan: "premium_paid", plan: "premium" })).toBe("premium_paid");
    expect(resolveUserProductPlan({ productPlan: "standard_paid", plan: "premium" })).toBe("standard_paid");
    expect(resolveUserProductPlan({ plan: "premium" })).toBe("standard_paid");
    expect(resolveUserProductPlan({ plan: "free" })).toBe("free");
    expect(resolveUserProductPlan(undefined)).toBe("free");
  });
  it("planOverride と bypassMonthlyLimit", () => {
    expect(resolveUserProductPlan({ productPlan: "free", planOverride: "premium_paid" })).toBe("premium_paid");
    expect(resolveUserProductPlan({ generationOverride: { bypassMonthlyLimit: true } })).toBe("premium_paid");
    expect(resolveUserProductPlan({ productPlan: "bogus" })).toBe("free");
  });
});

describe("月次上限とモード許可", () => {
  it("上限は 3 / 8 / 15", () => {
    expect(getMonthlyBookLimitForPlan("free")).toBe(3);
    expect(getMonthlyBookLimitForPlan("standard_paid")).toBe(8);
    expect(getMonthlyBookLimitForPlan("premium_paid")).toBe(15);
  });
  it("standard は 8 冊目まで、9 冊目は不可。管理者は常に可", () => {
    expect(canGenerateThisMonth({ userProductPlan: "standard_paid", currentCount: 7 })).toBe(true);
    expect(canGenerateThisMonth({ userProductPlan: "standard_paid", currentCount: 8 })).toBe(false);
    expect(canGenerateThisMonth({ userProductPlan: "free", currentCount: 3, isAdmin: true })).toBe(true);
  });
  it("要求プランは自分のプラン以下なら可", () => {
    expect(canUseRequestedPlan({ userProductPlan: "standard_paid", requestedPlan: "standard_paid" })).toBe(true);
    expect(canUseRequestedPlan({ userProductPlan: "standard_paid", requestedPlan: "premium_paid" })).toBe(false);
    expect(canUseRequestedPlan({ userProductPlan: "free", requestedPlan: "standard_paid", isAdmin: true })).toBe(true);
  });
  it("モード許可はプラン設定に従う", () => {
    expect(isCreationModeAllowedForPlan("free", "guided_ai")).toBe(false);
    expect(isCreationModeAllowedForPlan("standard_paid", "guided_ai")).toBe(true);
    expect(isCreationModeAllowedForPlan("standard_paid", "photo_story")).toBe(false);
    expect(isCreationModeAllowedForPlan("premium_paid", "photo_story")).toBe(true);
  });
});
