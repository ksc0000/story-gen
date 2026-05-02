import { describe, expect, it } from "vitest";
import { SERVER_PLAN_CONFIGS } from "../src/lib/plans";

describe("SERVER_PLAN_CONFIGS", () => {
  it("uses all_pages character consistency for every current product plan", () => {
    expect(SERVER_PLAN_CONFIGS.free.characterConsistencyMode).toBe("all_pages");
    expect(SERVER_PLAN_CONFIGS.light_paid.characterConsistencyMode).toBe("all_pages");
    expect(SERVER_PLAN_CONFIGS.standard_paid.characterConsistencyMode).toBe("all_pages");
    expect(SERVER_PLAN_CONFIGS.premium_paid.characterConsistencyMode).toBe("all_pages");
  });
});
