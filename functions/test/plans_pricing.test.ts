import { describe, it, expect } from "vitest";
import { SERVER_PLAN_CONFIGS, SINGLE_PURCHASE_PRICES } from "../src/lib/plans";

describe("SERVER_PLAN_CONFIGS Pricing", () => {
  it("has the updated standard_paid price", () => {
    expect(SERVER_PLAN_CONFIGS.standard_paid.priceJpy).toBe(1480);
  });

  it("has the updated premium_paid price", () => {
    expect(SERVER_PLAN_CONFIGS.premium_paid.priceJpy).toBe(2980);
  });

  it("has definition for single purchase prices", () => {
    expect(SINGLE_PURCHASE_PRICES.ai_guided).toBe(1500);
    expect(SINGLE_PURCHASE_PRICES.photo_story).toBe(2000);
  });
});
