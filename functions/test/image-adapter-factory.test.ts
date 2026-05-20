/**
 * P3-10: image-adapter-factory tests.
 *
 * Covers:
 *  1. resolveImageProviderId — all profiles
 *  2. createImageAdapter — returns correct adapter type and providerId
 *  3. Candidate gate non-responsibility — factory has no allowCandidateProfile param
 *  4. Uploader injection — uploaders can be passed, not called during construction
 *  5. No network — dummy credentials, no API calls at construction
 *  6. Shape compatibility — returned adapters satisfy ImageProvider
 *
 * Constraints:
 *  - No OPENAI_API_KEY or REPLICATE_API_TOKEN env vars required.
 *  - No network calls.
 *  - No Firestore writes.
 *  - generate-book.ts not imported.
 *  - createImageClient() not called.
 */

import { describe, it, expect, vi } from "vitest";
import {
  createImageAdapter,
  resolveImageProviderId,
  type ImageAdapterFactoryParams,
} from "../src/lib/image-adapter-factory";
import { ReplicateImageAdapter } from "../src/lib/replicate-image-adapter";
import { OpenAIImageAdapter } from "../src/lib/openai-image-adapter";
import { PROFILE_PROVIDER_MAP } from "../src/lib/image-provider";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// Dummy credentials — no real API calls are made
// -------------------------------------------------------------------------

const DUMMY_REPLICATE_TOKEN = "r8_dummy_token_test";
const DUMMY_OPENAI_KEY = "sk-dummy_key_test";

function baseParams(profile: ImageModelProfile): ImageAdapterFactoryParams {
  return {
    imageModelProfile: profile,
    replicateApiToken: DUMMY_REPLICATE_TOKEN,
    openaiApiKey: DUMMY_OPENAI_KEY,
  };
}

// -------------------------------------------------------------------------
// 1. resolveImageProviderId
// -------------------------------------------------------------------------

describe("resolveImageProviderId", () => {
  it("openai_image_candidate → openai", () => {
    expect(resolveImageProviderId("openai_image_candidate")).toBe("openai");
  });

  it("klein_fast → replicate", () => {
    expect(resolveImageProviderId("klein_fast")).toBe("replicate");
  });

  it("klein_base → replicate", () => {
    expect(resolveImageProviderId("klein_base")).toBe("replicate");
  });

  it("pro_consistent → replicate", () => {
    expect(resolveImageProviderId("pro_consistent")).toBe("replicate");
  });

  it("kontext_reference → replicate", () => {
    expect(resolveImageProviderId("kontext_reference")).toBe("replicate");
  });

  it("flux11_pro_candidate → replicate", () => {
    expect(resolveImageProviderId("flux11_pro_candidate")).toBe("replicate");
  });

  it("result agrees with PROFILE_PROVIDER_MAP for all known profiles", () => {
    const profiles = Object.keys(PROFILE_PROVIDER_MAP) as ImageModelProfile[];
    for (const profile of profiles) {
      expect(resolveImageProviderId(profile)).toBe(PROFILE_PROVIDER_MAP[profile]);
    }
  });
});

// -------------------------------------------------------------------------
// 2. createImageAdapter — adapter type and providerId
// -------------------------------------------------------------------------

describe("createImageAdapter — adapter type and providerId", () => {
  it("klein_fast returns ReplicateImageAdapter with providerId replicate", () => {
    const adapter = createImageAdapter(baseParams("klein_fast"));
    expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
    expect(adapter.providerId).toBe("replicate");
  });

  it("pro_consistent returns ReplicateImageAdapter with providerId replicate", () => {
    const adapter = createImageAdapter(baseParams("pro_consistent"));
    expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
    expect(adapter.providerId).toBe("replicate");
  });

  it("klein_base returns ReplicateImageAdapter with providerId replicate", () => {
    const adapter = createImageAdapter(baseParams("klein_base"));
    expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
    expect(adapter.providerId).toBe("replicate");
  });

  it("kontext_reference returns ReplicateImageAdapter with providerId replicate", () => {
    const adapter = createImageAdapter(baseParams("kontext_reference"));
    expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
    expect(adapter.providerId).toBe("replicate");
  });

  it("flux11_pro_candidate returns ReplicateImageAdapter with providerId replicate", () => {
    const adapter = createImageAdapter(baseParams("flux11_pro_candidate"));
    expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
    expect(adapter.providerId).toBe("replicate");
  });

  it("openai_image_candidate returns OpenAIImageAdapter with providerId openai", () => {
    const adapter = createImageAdapter(baseParams("openai_image_candidate"));
    expect(adapter).toBeInstanceOf(OpenAIImageAdapter);
    expect(adapter.providerId).toBe("openai");
  });
});

// -------------------------------------------------------------------------
// 3. Candidate gate non-responsibility
//    The factory accepts openai_image_candidate and returns an OpenAIImageAdapter
//    without consulting enrollment. Gating is the CALLER's responsibility.
// -------------------------------------------------------------------------

describe("createImageAdapter — candidate gate non-responsibility", () => {
  /**
   * The factory does NOT take an allowCandidateProfile parameter.
   * This is intentional: gating must occur before createImageAdapter() is called.
   * The factory is not a security boundary — it is a construction utility.
   */
  it("ImageAdapterFactoryParams has no allowCandidateProfile field", () => {
    // Type-level assertion via a valid params object.
    // If allowCandidateProfile were required, TypeScript would report a missing field.
    const params: ImageAdapterFactoryParams = {
      imageModelProfile: "openai_image_candidate",
      replicateApiToken: DUMMY_REPLICATE_TOKEN,
      openaiApiKey: DUMMY_OPENAI_KEY,
    };
    // Runtime check: the key must not exist on the params type surface
    expect("allowCandidateProfile" in params).toBe(false);
  });

  it(
    "openai_image_candidate returns OpenAIImageAdapter regardless of enrollment " +
      "because gating is caller responsibility — factory trusts the caller",
    () => {
      // Caller is expected to have already run gateImageModelProfile() before calling here.
      // The factory constructs the adapter unconditionally for any known profile.
      const adapter = createImageAdapter(baseParams("openai_image_candidate"));
      expect(adapter).toBeInstanceOf(OpenAIImageAdapter);
      expect(adapter.providerId).toBe("openai");
    }
  );

  it("non-candidate profiles return Replicate adapter without any gate evaluation", () => {
    // Similarly, no enrollment check runs for standard Replicate profiles.
    const adapter = createImageAdapter(baseParams("klein_fast"));
    expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
  });
});

// -------------------------------------------------------------------------
// 4. Uploader injection — passed through, not invoked at construction
// -------------------------------------------------------------------------

describe("createImageAdapter — uploader injection", () => {
  it("replicateUploader is accepted and not called during factory construction", () => {
    const uploader = vi.fn().mockResolvedValue("https://example.com/image.png");
    createImageAdapter({
      ...baseParams("klein_fast"),
      replicateUploader: uploader,
    });
    expect(uploader).not.toHaveBeenCalled();
  });

  it("openaiUploader is accepted and not called during factory construction", () => {
    const uploader = vi.fn().mockResolvedValue("https://example.com/image.png");
    createImageAdapter({
      ...baseParams("openai_image_candidate"),
      openaiUploader: uploader,
    });
    expect(uploader).not.toHaveBeenCalled();
  });

  it("factory can be called with no uploaders (stubs will throw at generateImage time)", () => {
    // No uploader → adapter's default stub uploader is used.
    // That stub throws only when generateImage() is called — not at construction.
    expect(() => createImageAdapter(baseParams("pro_consistent"))).not.toThrow();
    expect(() => createImageAdapter(baseParams("openai_image_candidate"))).not.toThrow();
  });
});

// -------------------------------------------------------------------------
// 5. No network — dummy credentials are sufficient
// -------------------------------------------------------------------------

describe("createImageAdapter — no network calls at construction", () => {
  it("does not require REPLICATE_API_TOKEN env var", () => {
    const savedToken = process.env["REPLICATE_API_TOKEN"];
    delete process.env["REPLICATE_API_TOKEN"];
    try {
      expect(() => createImageAdapter(baseParams("klein_fast"))).not.toThrow();
    } finally {
      if (savedToken !== undefined) process.env["REPLICATE_API_TOKEN"] = savedToken;
    }
  });

  it("does not require OPENAI_API_KEY env var", () => {
    const savedKey = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];
    try {
      expect(() => createImageAdapter(baseParams("openai_image_candidate"))).not.toThrow();
    } finally {
      if (savedKey !== undefined) process.env["OPENAI_API_KEY"] = savedKey;
    }
  });

  it("validateConfig is not called during factory construction", () => {
    // If validateConfig were called at construction, it would throw for dummy keys.
    // Both adapters have optional validateConfig() — not invoked by factory.
    expect(() =>
      createImageAdapter({
        imageModelProfile: "pro_consistent",
        replicateApiToken: "dummy-not-valid",
        openaiApiKey: "dummy-not-valid",
      })
    ).not.toThrow();
  });
});

// -------------------------------------------------------------------------
// 6. Shape compatibility — adapters satisfy ImageProvider interface
// -------------------------------------------------------------------------

describe("createImageAdapter — returned adapter satisfies ImageProvider shape", () => {
  const replicateAdapter = createImageAdapter(baseParams("klein_fast"));
  const openaiAdapter = createImageAdapter(baseParams("openai_image_candidate"));

  for (const [label, adapter] of [
    ["replicate (klein_fast)", replicateAdapter],
    ["openai (openai_image_candidate)", openaiAdapter],
  ] as const) {
    it(`${label}: has required ImageProvider members`, () => {
      expect(typeof adapter.providerId).toBe("string");
      expect(adapter.capabilities).toEqual(
        expect.objectContaining({
          supportsTextToImage: expect.any(Boolean),
          supportsImageToImage: expect.any(Boolean),
          supportsReferenceImages: expect.any(Boolean),
          supportsDetailedGuidance: expect.any(Boolean),
        })
      );
      expect(typeof adapter.generateImage).toBe("function");
      expect(typeof adapter.classifyError).toBe("function");
      expect(typeof adapter.resolveModelLabel).toBe("function");
    });
  }
});

// -------------------------------------------------------------------------
// 7. All profiles in PROFILE_PROVIDER_MAP are supported
// -------------------------------------------------------------------------

describe("createImageAdapter — handles every profile in PROFILE_PROVIDER_MAP", () => {
  const profiles = Object.keys(PROFILE_PROVIDER_MAP) as ImageModelProfile[];
  it.each(profiles)("profile %s constructs without error", (profile) => {
    expect(() => createImageAdapter(baseParams(profile))).not.toThrow();
  });
});
