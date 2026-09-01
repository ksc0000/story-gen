import { describe, expect, it } from "vitest";

/**
 * Helper to determine redirection target after child profile / avatar creation onboarding.
 */
export function getOnboardingRedirectTarget(options: {
  isFirstParam?: string | null;
  existingChildrenCount?: number;
  loadingChildren?: boolean;
}): string {
  const { isFirstParam, existingChildrenCount, loadingChildren = false } = options;

  if (isFirstParam === "1") {
    return "/create/select-child";
  }

  if (!loadingChildren && typeof existingChildrenCount === "number" && existingChildrenCount <= 1) {
    return "/create/select-child";
  }

  return "/home";
}

describe("getOnboardingRedirectTarget", () => {
  it("returns /create/select-child when isFirstParam is '1'", () => {
    const target = getOnboardingRedirectTarget({ isFirstParam: "1" });
    expect(target).toBe("/create/select-child");
  });

  it("returns /create/select-child when user has 0 or 1 child (first child onboarding)", () => {
    const target0 = getOnboardingRedirectTarget({ existingChildrenCount: 0 });
    expect(target0).toBe("/create/select-child");

    const target1 = getOnboardingRedirectTarget({ existingChildrenCount: 1 });
    expect(target1).toBe("/create/select-child");
  });

  it("returns /home when user already has multiple children (2nd child or more)", () => {
    const target = getOnboardingRedirectTarget({ existingChildrenCount: 2 });
    expect(target).toBe("/home");
  });

  it("defaults to /home when loading children state and no explicit param", () => {
    const target = getOnboardingRedirectTarget({ loadingChildren: true, existingChildrenCount: 5 });
    expect(target).toBe("/home");
  });
});
