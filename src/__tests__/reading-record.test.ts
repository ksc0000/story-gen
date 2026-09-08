import { describe, it, expect } from "vitest";
import { shouldPingActivity, ACTIVITY_PING_INTERVAL_MS } from "@/lib/reading-record";

describe("shouldPingActivity", () => {
  it("初回・不正値は記録する", () => {
    expect(shouldPingActivity(null, 1000)).toBe(true);
    expect(shouldPingActivity(Number.NaN, 1000)).toBe(true);
  });
  it("間隔未満なら記録しない、間隔以上なら記録する", () => {
    expect(shouldPingActivity(0, ACTIVITY_PING_INTERVAL_MS - 1)).toBe(false);
    expect(shouldPingActivity(0, ACTIVITY_PING_INTERVAL_MS)).toBe(true);
  });
});
