/**
 * P3-8: Tests for image-model-policy.ts
 *
 * Coverage:
 *  1. CANDIDATE_IMAGE_PROFILES exact membership regression.
 *  2. isCandidateProfile: production vs candidate profiles.
 *  3. resolveImageModelProfile: default, explicit profile, purpose override, tier routing.
 *  4. resolveImageFallbackProfiles: order and length for all profiles.
 *  5. Compatibility: replicate.ts re-exports match policy module exports.
 *  6. Fallback regression: changing behavior would break these assertions.
 *  7. openai_image_candidate fallback isolation (no Replicate fallback).
 *
 * Design:
 *  - No Replicate SDK calls, no Firebase, no network.
 *  - All assertions cover behavior that MUST NOT change without explicit tests update.
 */

import { describe, it, expect } from "vitest";
import {
  CANDIDATE_IMAGE_PROFILES,
  isCandidateProfile,
  resolveImageModelProfile,
  resolveImageFallbackProfiles,
  isSaferRetryEnabled,
} from "../src/lib/image-model-policy";
// Compatibility check: replicate.ts must re-export the same bindings.
import {
  CANDIDATE_IMAGE_PROFILES as REPLICATE_CANDIDATE_IMAGE_PROFILES,
  isCandidateProfile as replicateIsCandidateProfile,
  resolveImageModelProfile as replicateResolveImageModelProfile,
  resolveImageFallbackProfiles as replicateResolveImageFallbackProfiles,
  isSaferRetryEnabled as replicateIsSaferRetryEnabled,
} from "../src/lib/replicate";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// 1. CANDIDATE_IMAGE_PROFILES membership
// -------------------------------------------------------------------------

describe("CANDIDATE_IMAGE_PROFILES membership", () => {
  it("contains exactly openai_image_candidate and flux11_pro_candidate", () => {
    expect([...CANDIDATE_IMAGE_PROFILES]).toHaveLength(2);
    expect(CANDIDATE_IMAGE_PROFILES).toContain("openai_image_candidate");
    expect(CANDIDATE_IMAGE_PROFILES).toContain("flux11_pro_candidate");
  });

  it("does NOT contain production profiles", () => {
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("klein_fast");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("klein_base");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("pro_consistent");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("kontext_reference");
  });

  it("is readonly (frozen behavior — exhaustive snapshot)", () => {
    const snapshot = ["openai_image_candidate", "flux11_pro_candidate"] as const;
    expect([...CANDIDATE_IMAGE_PROFILES]).toStrictEqual([...snapshot]);
  });
});

// -------------------------------------------------------------------------
// 2. isCandidateProfile
// -------------------------------------------------------------------------

describe("isCandidateProfile", () => {
  it("returns true for openai_image_candidate", () => {
    expect(isCandidateProfile("openai_image_candidate")).toBe(true);
  });

  it("returns true for flux11_pro_candidate", () => {
    expect(isCandidateProfile("flux11_pro_candidate")).toBe(true);
  });

  it("returns false for klein_fast (production default)", () => {
    expect(isCandidateProfile("klein_fast")).toBe(false);
  });

  it("returns false for pro_consistent", () => {
    expect(isCandidateProfile("pro_consistent")).toBe(false);
  });

  it("returns false for klein_base", () => {
    expect(isCandidateProfile("klein_base")).toBe(false);
  });

  it("returns false for kontext_reference", () => {
    expect(isCandidateProfile("kontext_reference")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCandidateProfile(undefined)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// 3. resolveImageModelProfile
// -------------------------------------------------------------------------

describe("resolveImageModelProfile — default routing", () => {
  it("returns klein_fast when no params provided", () => {
    expect(resolveImageModelProfile({})).toBe("klein_fast");
  });

  it("returns klein_fast for light quality tier", () => {
    expect(resolveImageModelProfile({ imageQualityTier: "light" })).toBe("klein_fast");
  });

  it("returns klein_fast for standard tier when ENABLE_KLEIN_BASE is unset", () => {
    const prev = process.env.ENABLE_KLEIN_BASE;
    delete process.env.ENABLE_KLEIN_BASE;
    try {
      expect(resolveImageModelProfile({ imageQualityTier: "standard" })).toBe("klein_fast");
    } finally {
      if (prev !== undefined) process.env.ENABLE_KLEIN_BASE = prev;
    }
  });

  it("returns klein_base for standard tier when ENABLE_KLEIN_BASE=true", () => {
    const prev = process.env.ENABLE_KLEIN_BASE;
    process.env.ENABLE_KLEIN_BASE = "true";
    try {
      expect(resolveImageModelProfile({ imageQualityTier: "standard" })).toBe("klein_base");
    } finally {
      if (prev !== undefined) {
        process.env.ENABLE_KLEIN_BASE = prev;
      } else {
        delete process.env.ENABLE_KLEIN_BASE;
      }
    }
  });

  it("returns pro_consistent for premium quality tier (flag off, default)", () => {
    delete process.env.ENABLE_GPT_IMAGE_2;
    expect(resolveImageModelProfile({ imageQualityTier: "premium" })).toBe("pro_consistent");
  });

  describe("full cutover — ENABLE_GPT_IMAGE_2=true", () => {
    let prev: string | undefined;
    beforeEach(() => {
      prev = process.env.ENABLE_GPT_IMAGE_2;
      process.env.ENABLE_GPT_IMAGE_2 = "true";
    });
    afterEach(() => {
      if (prev === undefined) delete process.env.ENABLE_GPT_IMAGE_2;
      else process.env.ENABLE_GPT_IMAGE_2 = prev;
    });

    it("free/light → gpt-image-2 low", () => {
      expect(resolveImageModelProfile({ imageQualityTier: "light" })).toBe("openai_gpt_image_2_low");
      expect(resolveImageModelProfile({})).toBe("openai_gpt_image_2_low");
    });

    it("standard / premium subscription → gpt-image-2 medium", () => {
      expect(resolveImageModelProfile({ imageQualityTier: "standard" })).toBe("openai_gpt_image_2_medium");
      expect(resolveImageModelProfile({ imageQualityTier: "premium" })).toBe("openai_gpt_image_2_medium");
    });

    it("single purchase → gpt-image-2 high (overrides tier)", () => {
      expect(
        resolveImageModelProfile({ imageQualityTier: "premium", isSinglePurchase: true })
      ).toBe("openai_gpt_image_2");
      expect(
        resolveImageModelProfile({ imageQualityTier: "light", isSinglePurchase: true })
      ).toBe("openai_gpt_image_2");
    });

    it("child_avatar → gpt-image-2 high", () => {
      expect(resolveImageModelProfile({ purpose: "child_avatar", imageQualityTier: "premium" })).toBe(
        "openai_gpt_image_2"
      );
    });

    it("ignores legacy flux plan-default profiles so the cutover applies", () => {
      // 実ユーザー本はプラン設定から pro_consistent/kontext_max が焼かれる。切替時は無視。
      expect(
        resolveImageModelProfile({ imageQualityTier: "premium", imageModelProfile: "pro_consistent" })
      ).toBe("openai_gpt_image_2_medium");
      expect(
        resolveImageModelProfile({ imageQualityTier: "standard", imageModelProfile: "kontext_max" })
      ).toBe("openai_gpt_image_2_medium");
      expect(
        resolveImageModelProfile({ imageQualityTier: "light", imageModelProfile: "klein_fast" })
      ).toBe("openai_gpt_image_2_low");
    });

    it("honors a genuine non-legacy override (e.g. explicit gpt-image-2 high)", () => {
      expect(
        resolveImageModelProfile({
          imageQualityTier: "standard",
          imageModelProfile: "openai_gpt_image_2",
        })
      ).toBe("openai_gpt_image_2");
    });
  });

  it("legacy flux profile still wins when cutover flag is OFF", () => {
    delete process.env.ENABLE_GPT_IMAGE_2;
    expect(
      resolveImageModelProfile({ imageQualityTier: "premium", imageModelProfile: "kontext_max" })
    ).toBe("kontext_max");
  });

  it("gpt-image-2 fallback chains", () => {
    expect(resolveImageFallbackProfiles("openai_gpt_image_2")).toEqual([
      "openai_gpt_image_2",
      "pro_consistent",
      "klein_fast",
    ]);
    expect(resolveImageFallbackProfiles("openai_gpt_image_2_medium")).toEqual([
      "openai_gpt_image_2_medium",
      "pro_consistent",
      "klein_fast",
    ]);
    expect(resolveImageFallbackProfiles("openai_gpt_image_2_low")).toEqual([
      "openai_gpt_image_2_low",
      "klein_fast",
    ]);
  });
});

describe("resolveImageModelProfile — purpose override", () => {
  it("always returns pro_consistent for child_avatar purpose (overrides tier)", () => {
    expect(resolveImageModelProfile({ purpose: "child_avatar", imageQualityTier: "light" })).toBe("pro_consistent");
    expect(resolveImageModelProfile({ purpose: "child_avatar" })).toBe("pro_consistent");
  });

  it("always returns pro_consistent for child_avatar_revision purpose", () => {
    expect(resolveImageModelProfile({ purpose: "child_avatar_revision" })).toBe("pro_consistent");
    expect(resolveImageModelProfile({ purpose: "child_avatar_revision", imageQualityTier: "light" })).toBe("pro_consistent");
  });

  it("non-avatar purposes do not force pro_consistent", () => {
    expect(resolveImageModelProfile({ purpose: "book_page", imageQualityTier: "light" })).toBe("klein_fast");
    expect(resolveImageModelProfile({ purpose: "book_cover", imageQualityTier: "light" })).toBe("klein_fast");
  });
});

describe("resolveImageModelProfile — explicit profile override", () => {
  it("explicit imageModelProfile takes precedence over tier", () => {
    expect(resolveImageModelProfile({ imageModelProfile: "pro_consistent", imageQualityTier: "light" })).toBe("pro_consistent");
    expect(resolveImageModelProfile({ imageModelProfile: "klein_base", imageQualityTier: "premium" })).toBe("klein_base");
  });

  it("explicit candidate profile passes through (gate handled by caller)", () => {
    expect(resolveImageModelProfile({ imageModelProfile: "openai_image_candidate" })).toBe("openai_image_candidate");
    expect(resolveImageModelProfile({ imageModelProfile: "flux11_pro_candidate" })).toBe("flux11_pro_candidate");
  });

  it("explicit profile takes precedence over purpose for non-avatar", () => {
    expect(resolveImageModelProfile({ purpose: "book_page", imageModelProfile: "pro_consistent" })).toBe("pro_consistent");
  });

  it("child_avatar purpose overrides explicit imageModelProfile", () => {
    // Purpose check happens before imageModelProfile check
    expect(resolveImageModelProfile({ purpose: "child_avatar", imageModelProfile: "klein_fast" })).toBe("pro_consistent");
  });
});

// -------------------------------------------------------------------------
// 4. resolveImageFallbackProfiles — order regression
// -------------------------------------------------------------------------

describe("resolveImageFallbackProfiles — order and isolation", () => {
  it("pro_consistent → [pro_consistent, klein_fast]", () => {
    expect(resolveImageFallbackProfiles("pro_consistent")).toStrictEqual(["pro_consistent", "klein_fast"]);
  });

  it("klein_base → [klein_base, klein_fast]", () => {
    expect(resolveImageFallbackProfiles("klein_base")).toStrictEqual(["klein_base", "klein_fast"]);
  });

  it("kontext_reference → [kontext_reference, klein_fast]", () => {
    expect(resolveImageFallbackProfiles("kontext_reference")).toStrictEqual(["kontext_reference", "klein_fast"]);
  });

  it("flux11_pro_candidate → [flux11_pro_candidate, klein_fast]", () => {
    expect(resolveImageFallbackProfiles("flux11_pro_candidate")).toStrictEqual(["flux11_pro_candidate", "klein_fast"]);
  });

  it("openai_image_candidate → [openai_image_candidate] (NO Replicate fallback)", () => {
    const chain = resolveImageFallbackProfiles("openai_image_candidate");
    expect(chain).toStrictEqual(["openai_image_candidate"]);
    expect(chain).toHaveLength(1);
    expect(chain).not.toContain("klein_fast");
    expect(chain).not.toContain("pro_consistent");
  });

  it("klein_fast → [klein_fast] (terminal — no further fallback)", () => {
    expect(resolveImageFallbackProfiles("klein_fast")).toStrictEqual(["klein_fast"]);
  });

  it("first element always equals the requested profile", () => {
    const profiles: ImageModelProfile[] = [
      "klein_fast", "klein_base", "pro_consistent",
      "kontext_reference", "flux11_pro_candidate", "openai_image_candidate",
    ];
    for (const profile of profiles) {
      const chain = resolveImageFallbackProfiles(profile);
      expect(chain[0]).toBe(profile);
    }
  });

  it("fallback chain always has at least one element", () => {
    const profiles: ImageModelProfile[] = [
      "klein_fast", "klein_base", "pro_consistent",
      "kontext_reference", "flux11_pro_candidate", "openai_image_candidate",
    ];
    for (const profile of profiles) {
      expect(resolveImageFallbackProfiles(profile).length).toBeGreaterThanOrEqual(1);
    }
  });
});

// -------------------------------------------------------------------------
// 5. Compatibility: replicate.ts re-exports match policy module exports
// -------------------------------------------------------------------------

describe("replicate.ts compatibility re-exports — P3-8", () => {
  it("CANDIDATE_IMAGE_PROFILES is the same reference", () => {
    // Both should point to the same constant
    expect(REPLICATE_CANDIDATE_IMAGE_PROFILES).toBe(CANDIDATE_IMAGE_PROFILES);
  });

  it("isCandidateProfile re-export is the same function", () => {
    expect(replicateIsCandidateProfile).toBe(isCandidateProfile);
  });

  it("resolveImageModelProfile re-export is the same function", () => {
    expect(replicateResolveImageModelProfile).toBe(resolveImageModelProfile);
  });

  it("resolveImageFallbackProfiles re-export is the same function", () => {
    expect(replicateResolveImageFallbackProfiles).toBe(resolveImageFallbackProfiles);
  });

  it("replicate.ts isCandidateProfile produces same results as policy module", () => {
    const profiles: ImageModelProfile[] = [
      "klein_fast", "klein_base", "pro_consistent",
      "kontext_reference", "flux11_pro_candidate", "openai_image_candidate",
    ];
    for (const profile of profiles) {
      expect(replicateIsCandidateProfile(profile)).toBe(isCandidateProfile(profile));
    }
  });

  it("replicate.ts resolveImageFallbackProfiles produces same results as policy module", () => {
    const profiles: ImageModelProfile[] = [
      "klein_fast", "klein_base", "pro_consistent",
      "kontext_reference", "flux11_pro_candidate", "openai_image_candidate",
    ];
    for (const profile of profiles) {
      expect(replicateResolveImageFallbackProfiles(profile)).toStrictEqual(
        resolveImageFallbackProfiles(profile)
      );
    }
  });

  it("replicate.ts resolveImageModelProfile (default) produces same result as policy module", () => {
    expect(replicateResolveImageModelProfile({})).toBe(resolveImageModelProfile({}));
    expect(replicateResolveImageModelProfile({ imageQualityTier: "premium" })).toBe(
      resolveImageModelProfile({ imageQualityTier: "premium" })
    );
    expect(replicateResolveImageModelProfile({ purpose: "child_avatar" })).toBe(
      resolveImageModelProfile({ purpose: "child_avatar" })
    );
  });

  it("replicate.ts isSaferRetryEnabled re-export is the same function", () => {
    expect(replicateIsSaferRetryEnabled).toBe(isSaferRetryEnabled);
  });
});

// -------------------------------------------------------------------------
// 6. isSaferRetryEnabled
// -------------------------------------------------------------------------

describe("isSaferRetryEnabled", () => {
  it("returns true for pro_consistent (P5-4a)", () => {
    expect(isSaferRetryEnabled("pro_consistent")).toBe(true);
  });

  it("returns false for klein_fast", () => {
    expect(isSaferRetryEnabled("klein_fast")).toBe(false);
  });

  it("returns false for klein_base", () => {
    expect(isSaferRetryEnabled("klein_base")).toBe(false);
  });

  it("returns false for kontext_reference", () => {
    expect(isSaferRetryEnabled("kontext_reference")).toBe(false);
  });

  it("returns false for candidate profiles", () => {
    expect(isSaferRetryEnabled("openai_image_candidate")).toBe(false);
    expect(isSaferRetryEnabled("flux11_pro_candidate")).toBe(false);
  });
});
