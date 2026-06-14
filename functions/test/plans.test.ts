import { describe, expect, it } from "vitest";
import { SERVER_PLAN_CONFIGS } from "../src/lib/plans";

describe("SERVER_PLAN_CONFIGS", () => {
  it("uses all_pages character consistency for every current product plan", () => {
    expect(SERVER_PLAN_CONFIGS.free.characterConsistencyMode).toBe("all_pages");
    expect(SERVER_PLAN_CONFIGS.standard_paid.characterConsistencyMode).toBe("all_pages");
    expect(SERVER_PLAN_CONFIGS.premium_paid.characterConsistencyMode).toBe("all_pages");
  });

  it("uses appropriate image model profile for each product plan", () => {
    // 画質統一方針 (2026-06): Free/Standard は flux-2-pro (pro_consistent)、Premium は flux-kontext-max。
    expect(SERVER_PLAN_CONFIGS.free.imageModelProfile).toBe("pro_consistent");
    expect(SERVER_PLAN_CONFIGS.standard_paid.imageModelProfile).toBe("pro_consistent");
    expect(SERVER_PLAN_CONFIGS.premium_paid.imageModelProfile).toBe("kontext_max");
  });
});
