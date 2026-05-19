/**
 * P2-4: Candidate image profile gate regression tests.
 *
 * Purpose: Lock down the gating behavior so candidate profiles
 * (openai_image_candidate, flux11_pro_candidate) cannot leak into
 * production default routing or reach unauthorized users.
 *
 * Tests intentionally use no mocks — all helpers are pure functions.
 * No Firestore writes, no image generation, no Firebase deploy.
 *
 * Helpers under test:
 * - gateImageModelProfile (generate-book.ts) — gate logic
 * - isCandidateProfile (replicate.ts) — candidate classification
 * - CANDIDATE_IMAGE_PROFILES (replicate.ts) — allowlist constant
 * - resolveImageModelProfile (replicate.ts) — default routing resolution
 * - resolveImageFallbackProfiles (replicate.ts) — fallback chain
 *
 * Coverage:
 * 1. CANDIDATE_IMAGE_PROFILES exact membership regression
 * 2. isCandidateProfile: production profiles never classified as candidate
 * 3. Default routing: resolveImageModelProfile never returns a candidate
 * 4. Gate-block: candidate → undefined when allowCandidateProfile is not exactly true
 * 5. Gate-pass: candidate preserved when allowCandidateProfile === true
 * 6. allowCandidateProfile call-site semantics (=== true strictness)
 * 7. Non-candidate profiles pass through gate without modification
 * 8. Combined gate + resolve: blocked candidate → safe production default
 * 9. openai_image_candidate fallback isolation (no Replicate fallback)
 * 10. Regression guards: explicit assertions that would fail if behavior changes
 */

import { describe, it, expect } from "vitest";
import {
  isCandidateProfile,
  CANDIDATE_IMAGE_PROFILES,
  resolveImageModelProfile,
  resolveImageFallbackProfiles,
} from "../src/lib/replicate";
import { gateImageModelProfile } from "../src/generate-book";

// ---------------------------------------------------------------------------
// 1. CANDIDATE_IMAGE_PROFILES exact membership regression
// ---------------------------------------------------------------------------
describe("CANDIDATE_IMAGE_PROFILES registry (P2-4 regression)", () => {
  it("contains exactly openai_image_candidate and flux11_pro_candidate", () => {
    expect(CANDIDATE_IMAGE_PROFILES).toContain("openai_image_candidate");
    expect(CANDIDATE_IMAGE_PROFILES).toContain("flux11_pro_candidate");
  });

  it("has exactly 2 entries — fails if a new candidate is added without this test being updated", () => {
    // INTENT: if a new candidate profile is added silently, this test fails and forces
    // the author to review gating coverage for the new profile.
    expect(CANDIDATE_IMAGE_PROFILES).toHaveLength(2);
  });

  it("does not include any current production routing profiles", () => {
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("pro_consistent");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("klein_fast");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("klein_base");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("kontext_reference");
  });
});

// ---------------------------------------------------------------------------
// 2. isCandidateProfile: production profiles never classified as candidate
// ---------------------------------------------------------------------------
describe("isCandidateProfile — production profiles are never candidates (P2-4 regression)", () => {
  it("pro_consistent is not a candidate profile", () => {
    expect(isCandidateProfile("pro_consistent")).toBe(false);
  });

  it("klein_fast is not a candidate profile", () => {
    expect(isCandidateProfile("klein_fast")).toBe(false);
  });

  it("klein_base is not a candidate profile", () => {
    expect(isCandidateProfile("klein_base")).toBe(false);
  });

  it("kontext_reference is not a candidate profile", () => {
    expect(isCandidateProfile("kontext_reference")).toBe(false);
  });

  it("undefined is not a candidate profile", () => {
    expect(isCandidateProfile(undefined)).toBe(false);
  });

  it("openai_image_candidate IS a candidate profile", () => {
    expect(isCandidateProfile("openai_image_candidate")).toBe(true);
  });

  it("flux11_pro_candidate IS a candidate profile", () => {
    expect(isCandidateProfile("flux11_pro_candidate")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Default routing: resolveImageModelProfile never returns a candidate
// ---------------------------------------------------------------------------
describe("resolveImageModelProfile — default routing never returns a candidate (P2-4 regression)", () => {
  it("default routing (no profile, no tier) never returns openai_image_candidate", () => {
    const profile = resolveImageModelProfile({});
    expect(isCandidateProfile(profile)).toBe(false);
    expect(profile).not.toBe("openai_image_candidate");
  });

  it("default routing (no profile, no tier) never returns flux11_pro_candidate", () => {
    const profile = resolveImageModelProfile({});
    expect(profile).not.toBe("flux11_pro_candidate");
  });

  it("light tier never returns a candidate profile", () => {
    const profile = resolveImageModelProfile({ imageQualityTier: "light" });
    expect(isCandidateProfile(profile)).toBe(false);
  });

  it("standard tier never returns a candidate profile", () => {
    const profile = resolveImageModelProfile({ imageQualityTier: "standard" });
    expect(isCandidateProfile(profile)).toBe(false);
  });

  it("premium tier never returns a candidate profile", () => {
    const profile = resolveImageModelProfile({ imageQualityTier: "premium" });
    expect(isCandidateProfile(profile)).toBe(false);
  });

  it("child_avatar purpose never returns a candidate profile", () => {
    const profile = resolveImageModelProfile({ purpose: "child_avatar" });
    expect(isCandidateProfile(profile)).toBe(false);
    expect(profile).toBe("pro_consistent");
  });

  it("child_avatar_revision purpose never returns a candidate profile", () => {
    const profile = resolveImageModelProfile({ purpose: "child_avatar_revision" });
    expect(isCandidateProfile(profile)).toBe(false);
    expect(profile).toBe("pro_consistent");
  });

  it("default result is a known production-safe profile", () => {
    // Regression: production default must be one of the documented production profiles.
    const profile = resolveImageModelProfile({});
    const productionSafeProfiles = ["pro_consistent", "klein_fast", "klein_base", "kontext_reference"];
    expect(productionSafeProfiles).toContain(profile);
  });
});

// ---------------------------------------------------------------------------
// 4. Gate-block: candidate → undefined when not enrolled
// ---------------------------------------------------------------------------
describe("gateImageModelProfile — gate-block case (P2-4)", () => {
  it("blocks openai_image_candidate when candidateProfileEnabled=false", () => {
    expect(gateImageModelProfile("openai_image_candidate", false)).toBeUndefined();
  });

  it("blocks flux11_pro_candidate when candidateProfileEnabled=false", () => {
    expect(gateImageModelProfile("flux11_pro_candidate", false)).toBeUndefined();
  });

  it("blocks all CANDIDATE_IMAGE_PROFILES when candidateProfileEnabled=false", () => {
    for (const profile of CANDIDATE_IMAGE_PROFILES) {
      expect(
        gateImageModelProfile(profile, false),
        `${profile} should be blocked when not enrolled`
      ).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Gate-pass: candidate preserved when enrolled
// ---------------------------------------------------------------------------
describe("gateImageModelProfile — gate-pass case (P2-4)", () => {
  it("allows openai_image_candidate when candidateProfileEnabled=true", () => {
    expect(gateImageModelProfile("openai_image_candidate", true)).toBe("openai_image_candidate");
  });

  it("allows flux11_pro_candidate when candidateProfileEnabled=true", () => {
    expect(gateImageModelProfile("flux11_pro_candidate", true)).toBe("flux11_pro_candidate");
  });

  it("allows all CANDIDATE_IMAGE_PROFILES when candidateProfileEnabled=true", () => {
    for (const profile of CANDIDATE_IMAGE_PROFILES) {
      expect(
        gateImageModelProfile(profile, true),
        `${profile} should pass through when enrolled`
      ).toBe(profile);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. allowCandidateProfile call-site semantics (=== true strictness)
//
// In the Cloud Function:
//   const candidateProfileEnabled = userData?.generationOverride?.allowCandidateProfile === true;
//   gateImageModelProfile(profile, candidateProfileEnabled);
//
// Only the boolean value `true` (===) enables candidate profiles.
// All other values — including truthy non-boolean — must be treated as disabled.
// ---------------------------------------------------------------------------
describe("allowCandidateProfile === true strictness (P2-4 regression)", () => {
  // Helper that simulates the Cloud Function call-site expression
  const deriveEnabled = (rawValue: unknown): boolean =>
    rawValue === true;

  it("undefined allowCandidateProfile → candidateProfileEnabled=false → candidate blocked", () => {
    const enabled = deriveEnabled(undefined);
    expect(enabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", enabled)).toBeUndefined();
  });

  it("null allowCandidateProfile → candidateProfileEnabled=false → candidate blocked", () => {
    const enabled = deriveEnabled(null);
    expect(enabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", enabled)).toBeUndefined();
  });

  it("false allowCandidateProfile → candidateProfileEnabled=false → candidate blocked", () => {
    const enabled = deriveEnabled(false);
    expect(enabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", enabled)).toBeUndefined();
  });

  it("string '1' allowCandidateProfile → candidateProfileEnabled=false → candidate blocked", () => {
    // String "1" is truthy but not === true — must still block
    const enabled = deriveEnabled("1");
    expect(enabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", enabled)).toBeUndefined();
  });

  it("number 1 allowCandidateProfile → candidateProfileEnabled=false → candidate blocked", () => {
    // Number 1 is truthy but not === true — must still block
    const enabled = deriveEnabled(1);
    expect(enabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", enabled)).toBeUndefined();
  });

  it("boolean true allowCandidateProfile → candidateProfileEnabled=true → candidate passes", () => {
    const enabled = deriveEnabled(true);
    expect(enabled).toBe(true);
    expect(gateImageModelProfile("openai_image_candidate", enabled)).toBe("openai_image_candidate");
  });
});

// ---------------------------------------------------------------------------
// 7. Non-candidate profiles pass through gate without modification
// ---------------------------------------------------------------------------
describe("gateImageModelProfile — non-candidate profiles pass through (P2-4)", () => {
  const nonCandidateProfiles = [
    "pro_consistent",
    "klein_fast",
    "klein_base",
    "kontext_reference",
  ] as const;

  it("non-candidate profiles pass through unchanged when not enrolled", () => {
    for (const profile of nonCandidateProfiles) {
      expect(
        gateImageModelProfile(profile, false),
        `${profile} should pass through gate even when not enrolled`
      ).toBe(profile);
    }
  });

  it("non-candidate profiles pass through unchanged when enrolled", () => {
    for (const profile of nonCandidateProfiles) {
      expect(
        gateImageModelProfile(profile, true),
        `${profile} should pass through gate when enrolled`
      ).toBe(profile);
    }
  });

  it("undefined profile passes through unchanged regardless of enrollment", () => {
    expect(gateImageModelProfile(undefined, false)).toBeUndefined();
    expect(gateImageModelProfile(undefined, true)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Combined gate + resolve: blocked candidate → safe production default
//
// When gateImageModelProfile blocks a candidate (returns undefined) and the
// caller passes undefined to resolveImageModelProfile, the result must be a
// production-safe profile (never a candidate).
// ---------------------------------------------------------------------------
describe("combined gate + resolve — blocked candidate yields safe default (P2-4)", () => {
  const productionSafeProfiles = ["pro_consistent", "klein_fast", "klein_base", "kontext_reference"];

  it("openai_image_candidate blocked → undefined → resolveImageModelProfile returns safe default", () => {
    const gated = gateImageModelProfile("openai_image_candidate", false);
    expect(gated).toBeUndefined();
    const resolved = resolveImageModelProfile({ imageModelProfile: gated });
    expect(isCandidateProfile(resolved)).toBe(false);
    expect(productionSafeProfiles).toContain(resolved);
  });

  it("flux11_pro_candidate blocked → undefined → resolveImageModelProfile returns safe default", () => {
    const gated = gateImageModelProfile("flux11_pro_candidate", false);
    expect(gated).toBeUndefined();
    const resolved = resolveImageModelProfile({ imageModelProfile: gated });
    expect(isCandidateProfile(resolved)).toBe(false);
    expect(productionSafeProfiles).toContain(resolved);
  });

  it("resolved default after gate block is never openai_image_candidate", () => {
    const resolved = resolveImageModelProfile({
      imageModelProfile: gateImageModelProfile("openai_image_candidate", false),
    });
    expect(resolved).not.toBe("openai_image_candidate");
  });

  it("resolved default after gate block is never flux11_pro_candidate", () => {
    const resolved = resolveImageModelProfile({
      imageModelProfile: gateImageModelProfile("flux11_pro_candidate", false),
    });
    expect(resolved).not.toBe("flux11_pro_candidate");
  });

  it("gate-pass preserves openai_image_candidate through resolve", () => {
    const gated = gateImageModelProfile("openai_image_candidate", true);
    expect(gated).toBe("openai_image_candidate");
    const resolved = resolveImageModelProfile({ imageModelProfile: gated });
    // When passed explicitly, resolveImageModelProfile returns it as-is
    expect(resolved).toBe("openai_image_candidate");
  });
});

// ---------------------------------------------------------------------------
// 9. openai_image_candidate fallback isolation (no Replicate fallback)
//
// openai_image_candidate uses OpenAI only — if it fails, there is no automatic
// Replicate fallback in the profile chain. This isolates OpenAI failures from
// the Replicate fallback path, which is the intended design.
// ---------------------------------------------------------------------------
describe("resolveImageFallbackProfiles — openai_image_candidate has no Replicate fallback (P2-4)", () => {
  it("openai_image_candidate fallback chain is exactly [openai_image_candidate]", () => {
    expect(resolveImageFallbackProfiles("openai_image_candidate")).toEqual(["openai_image_candidate"]);
  });

  it("openai_image_candidate fallback chain does not include any Replicate profiles", () => {
    const chain = resolveImageFallbackProfiles("openai_image_candidate");
    expect(chain).not.toContain("pro_consistent");
    expect(chain).not.toContain("klein_fast");
    expect(chain).not.toContain("klein_base");
    expect(chain).not.toContain("flux11_pro_candidate");
    expect(chain).not.toContain("kontext_reference");
  });

  it("openai_image_candidate fallback chain has exactly 1 entry", () => {
    // Regression: if a Replicate fallback were added silently, this test would catch it.
    expect(resolveImageFallbackProfiles("openai_image_candidate")).toHaveLength(1);
  });

  it("flux11_pro_candidate fallback chain includes klein_fast as safety net", () => {
    // flux11_pro_candidate differs from openai: has a Replicate fallback
    const chain = resolveImageFallbackProfiles("flux11_pro_candidate");
    expect(chain[0]).toBe("flux11_pro_candidate");
    expect(chain).toContain("klein_fast");
  });
});

// ---------------------------------------------------------------------------
// 10. Regression guards — explicit assertions that would fail if behavior changes
// ---------------------------------------------------------------------------
describe("regression guards — would fail if production routing changes (P2-4)", () => {
  it("REGRESSION: openai_image_candidate must not become production default without test update", () => {
    // If this test starts failing, someone changed production default routing.
    // Review gating and CANDIDATE_IMAGE_PROFILES before merging.
    const defaultProfile = resolveImageModelProfile({});
    expect(defaultProfile).not.toBe("openai_image_candidate");
    expect(isCandidateProfile(defaultProfile)).toBe(false);
  });

  it("REGRESSION: allowCandidateProfile missing must block candidates", () => {
    // Simulates user document with no generationOverride field at all.
    type GenerationOverride = { allowCandidateProfile?: boolean };
    const userData: { generationOverride?: GenerationOverride } = {};
    const candidateProfileEnabled = userData?.generationOverride?.allowCandidateProfile === true;
    expect(candidateProfileEnabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", candidateProfileEnabled)).toBeUndefined();
    expect(gateImageModelProfile("flux11_pro_candidate", candidateProfileEnabled)).toBeUndefined();
  });

  it("REGRESSION: allowCandidateProfile=false must block candidates", () => {
    type GenerationOverride = { allowCandidateProfile?: boolean };
    const userData: { generationOverride?: GenerationOverride } = {
      generationOverride: { allowCandidateProfile: false },
    };
    const candidateProfileEnabled = userData?.generationOverride?.allowCandidateProfile === true;
    expect(candidateProfileEnabled).toBe(false);
    expect(gateImageModelProfile("openai_image_candidate", candidateProfileEnabled)).toBeUndefined();
  });

  it("REGRESSION: allowCandidateProfile=true must pass candidates", () => {
    type GenerationOverride = { allowCandidateProfile?: boolean };
    const userData: { generationOverride?: GenerationOverride } = {
      generationOverride: { allowCandidateProfile: true },
    };
    const candidateProfileEnabled = userData?.generationOverride?.allowCandidateProfile === true;
    expect(candidateProfileEnabled).toBe(true);
    expect(gateImageModelProfile("openai_image_candidate", candidateProfileEnabled)).toBe("openai_image_candidate");
    expect(gateImageModelProfile("flux11_pro_candidate", candidateProfileEnabled)).toBe("flux11_pro_candidate");
  });

  it("REGRESSION: pro_consistent must not be classified as a candidate", () => {
    // pro_consistent is the production premium default — must never be gated.
    expect(isCandidateProfile("pro_consistent")).toBe(false);
    expect(gateImageModelProfile("pro_consistent", false)).toBe("pro_consistent");
  });

  it("REGRESSION: klein_fast must not be classified as a candidate", () => {
    expect(isCandidateProfile("klein_fast")).toBe(false);
    expect(gateImageModelProfile("klein_fast", false)).toBe("klein_fast");
  });
});
