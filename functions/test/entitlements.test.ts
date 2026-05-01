import { describe, expect, it } from "vitest";
import { canUseProductPlan } from "../src/lib/entitlements";
import { canGenerateBookThisMonth, FREE_MONTHLY_BOOK_LIMIT } from "../src/lib/usage";

describe("product plan entitlements", () => {
  it("always allows the free product plan", () => {
    expect(canUseProductPlan({ userPlan: "free", productPlan: "free" })).toBe(true);
  });

  it("allows paid product plans for premium users", () => {
    expect(
      canUseProductPlan({ userPlan: "premium", productPlan: "premium_paid" })
    ).toBe(true);
  });

  it("blocks paid product plans for free users", () => {
    expect(
      canUseProductPlan({ userPlan: "free", productPlan: "standard_paid" })
    ).toBe(false);
  });
});

describe("monthly book usage guard", () => {
  it("allows free users below the monthly limit", () => {
    expect(
      canGenerateBookThisMonth({
        userPlan: "free",
        currentCount: FREE_MONTHLY_BOOK_LIMIT - 1,
      })
    ).toBe(true);
  });

  it("blocks free users at the monthly limit", () => {
    expect(
      canGenerateBookThisMonth({
        userPlan: "free",
        currentCount: FREE_MONTHLY_BOOK_LIMIT,
      })
    ).toBe(false);
  });

  it("always allows admins", () => {
    expect(
      canGenerateBookThisMonth({
        userPlan: "free",
        currentCount: FREE_MONTHLY_BOOK_LIMIT,
        isAdmin: true,
      })
    ).toBe(true);
  });
});
