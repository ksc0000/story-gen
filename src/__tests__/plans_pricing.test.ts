import { describe, it, expect } from "vitest";
import { PLAN_CONFIGS, SINGLE_PURCHASE_PRICES } from "@/lib/plans";

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
