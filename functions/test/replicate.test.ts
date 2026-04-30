import { afterEach, describe, expect, it } from "vitest";
import { resolveReplicateModel } from "../src/lib/replicate";

describe("resolveReplicateModel", () => {
  const originalFlag = process.env.ENABLE_FLUX_KLEIN;

  afterEach(() => {
    process.env.ENABLE_FLUX_KLEIN = originalFlag;
  });

  it("keeps cover and avatar generation on flux-2-pro", () => {
    expect(resolveReplicateModel({ purpose: "book_cover", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
    expect(resolveReplicateModel({ purpose: "child_avatar_revision", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });

  it("falls back to flux-schnell for standard book pages when ENABLE_FLUX_KLEIN is false", () => {
    process.env.ENABLE_FLUX_KLEIN = "false";
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "standard" })).toBe(
      "black-forest-labs/flux-schnell"
    );
  });

  it("uses flux-2-klein-9b for standard book pages when ENABLE_FLUX_KLEIN is true", () => {
    process.env.ENABLE_FLUX_KLEIN = "true";
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "standard" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
  });

  it("uses flux-2-pro for premium book pages", () => {
    process.env.ENABLE_FLUX_KLEIN = "false";
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });
});
