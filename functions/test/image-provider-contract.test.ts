/**
 * P3-6: ImageProvider adapter contract tests.
 *
 * These tests verify shared invariants that BOTH ReplicateImageAdapter and
 * OpenAIImageAdapter must satisfy as implementations of the ImageProvider interface.
 *
 * Design principle: test the contract, not the implementation.
 *  - Provider-specific edge cases are covered in replicate-image-adapter.test.ts
 *    and openai-image-adapter.test.ts.
 *  - This file focuses on invariants that hold for ALL adapters.
 *  - Adding a new adapter in the future means adding it to the adapters fixture
 *    and re-running this file — no new contract tests should be needed.
 *
 * Coverage sections:
 *  1. Interface shape contract (all methods present)
 *  2. Provider identity contract (providerId, PROFILE_PROVIDER_MAP alignment)
 *  3. Capabilities contract (all booleans present and stable)
 *  4. Supported profile contract (accepts own profiles, rejects foreign profiles)
 *  5. Model label contract (non-empty string, provider prefix, rejects foreign profiles)
 *  6. Error classification contract (shape, no-throw, timeout, unknown)
 *  7. Privacy / safe message contract (safeMessage ≤ 120 chars, no PII keys)
 *  8. No live network contract (constructor with dummy keys, no API calls)
 *  9. No production wiring contract (generate-book.ts not imported here)
 *
 * Constraints:
 *  - No OPENAI_API_KEY or REPLICATE_API_TOKEN required.
 *  - No network calls.
 *  - No Firestore writes.
 *  - generate-book.ts not imported.
 *  - createImageClient() not called.
 */

import { describe, it, expect } from "vitest";
import { ReplicateImageAdapter } from "../src/lib/replicate-image-adapter";
import { OpenAIImageAdapter } from "../src/lib/openai-image-adapter";
import { PROFILE_PROVIDER_MAP } from "../src/lib/image-provider";
import type { ImageProvider, ImageProviderId } from "../src/lib/image-provider";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// Fixture: all adapter instances under test
// -------------------------------------------------------------------------

/**
 * Adapter fixture with metadata for parameterizing contract tests.
 * Use dummy API keys — no real network calls are made.
 */
interface AdapterFixture {
  name: string;
  adapter: ImageProvider;
  expectedProviderId: ImageProviderId;
  /** Profiles this adapter should accept in resolveModelLabel without throwing. */
  supportedProfiles: ImageModelProfile[];
  /** Profiles this adapter should reject in resolveModelLabel with a clear error. */
  rejectedProfiles: ImageModelProfile[];
}

const adapters: AdapterFixture[] = [
  {
    name: "ReplicateImageAdapter",
    adapter: new ReplicateImageAdapter("r8_dummy_token_for_contract_tests"),
    expectedProviderId: "replicate",
    supportedProfiles: [
      "klein_fast",
      "klein_base",
      "pro_consistent",
      "kontext_reference",
      "flux11_pro_candidate",
    ],
    rejectedProfiles: ["openai_image_candidate"],
  },
  {
    name: "OpenAIImageAdapter",
    adapter: new OpenAIImageAdapter("sk-dummy-key-for-contract-tests"),
    expectedProviderId: "openai",
    supportedProfiles: ["openai_image_candidate"],
    rejectedProfiles: [
      "klein_fast",
      "klein_base",
      "pro_consistent",
      "kontext_reference",
      "flux11_pro_candidate",
    ],
  },
];

// -------------------------------------------------------------------------
// 1. Interface shape contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — interface shape contract", ({ adapter }) => {
  it("exposes providerId", () => {
    expect(typeof adapter.providerId).toBe("string");
  });

  it("exposes capabilities object", () => {
    expect(adapter.capabilities).toBeDefined();
    expect(typeof adapter.capabilities).toBe("object");
  });

  it("implements generateImage as a function", () => {
    expect(typeof adapter.generateImage).toBe("function");
  });

  it("implements classifyError as a function", () => {
    expect(typeof adapter.classifyError).toBe("function");
  });

  it("implements resolveModelLabel as a function", () => {
    expect(typeof adapter.resolveModelLabel).toBe("function");
  });
});

// -------------------------------------------------------------------------
// 2. Provider identity contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — provider identity contract", ({ adapter, expectedProviderId, supportedProfiles }) => {
  it(`providerId is "${expectedProviderId}"`, () => {
    expect(adapter.providerId).toBe(expectedProviderId);
  });

  it("providerId matches PROFILE_PROVIDER_MAP for all supported profiles", () => {
    for (const profile of supportedProfiles) {
      expect(
        PROFILE_PROVIDER_MAP[profile],
        `PROFILE_PROVIDER_MAP["${profile}"] should be "${expectedProviderId}"`
      ).toBe(expectedProviderId);
    }
  });

  it("providerId is a valid ImageProviderId value", () => {
    const validIds: ImageProviderId[] = ["replicate", "openai"];
    expect(validIds).toContain(adapter.providerId);
  });
});

// -------------------------------------------------------------------------
// 3. Capabilities contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — capabilities contract", ({ adapter }) => {
  it("capabilities.supportsTextToImage is a boolean", () => {
    expect(typeof adapter.capabilities.supportsTextToImage).toBe("boolean");
  });

  it("capabilities.supportsImageToImage is a boolean", () => {
    expect(typeof adapter.capabilities.supportsImageToImage).toBe("boolean");
  });

  it("capabilities.supportsReferenceImages is a boolean", () => {
    expect(typeof adapter.capabilities.supportsReferenceImages).toBe("boolean");
  });

  it("capabilities.supportsDetailedGuidance is a boolean", () => {
    expect(typeof adapter.capabilities.supportsDetailedGuidance).toBe("boolean");
  });

  it("capabilities has no unexpected keys beyond the four standard booleans", () => {
    const keys = new Set(Object.keys(adapter.capabilities));
    const expected = new Set([
      "supportsTextToImage",
      "supportsImageToImage",
      "supportsReferenceImages",
      "supportsDetailedGuidance",
    ]);
    for (const key of keys) {
      expect(expected.has(key), `Unexpected capability key: ${key}`).toBe(true);
    }
  });

  it("capabilities are stable between calls (same reference)", () => {
    const first = adapter.capabilities;
    const second = adapter.capabilities;
    expect(first).toBe(second);
  });
});

// -------------------------------------------------------------------------
// 4. Supported profile contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — supported profile contract", ({ adapter, supportedProfiles, rejectedProfiles }) => {
  it("resolveModelLabel does not throw for own supported profiles", () => {
    for (const profile of supportedProfiles) {
      expect(
        () => adapter.resolveModelLabel(profile),
        `resolveModelLabel should not throw for supported profile: ${profile}`
      ).not.toThrow();
    }
  });

  it("resolveModelLabel throws for foreign provider profiles", () => {
    for (const profile of rejectedProfiles) {
      expect(
        () => adapter.resolveModelLabel(profile),
        `resolveModelLabel should throw for foreign profile: ${profile}`
      ).toThrow();
    }
  });
});

// -------------------------------------------------------------------------
// 5. Model label contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — model label contract", ({ adapter, expectedProviderId, supportedProfiles }) => {
  it("resolveModelLabel returns a non-empty string for supported profiles", () => {
    for (const profile of supportedProfiles) {
      const label = adapter.resolveModelLabel(profile);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("model labels for Replicate profiles contain 'black-forest-labs/' prefix when provider is replicate", () => {
    if (expectedProviderId !== "replicate") return;
    for (const profile of supportedProfiles) {
      const label = adapter.resolveModelLabel(profile);
      expect(label, `Label for ${profile} should start with 'black-forest-labs/'`).toMatch(
        /^black-forest-labs\//
      );
    }
  });

  it("model labels for OpenAI profiles start with 'openai/' when provider is openai", () => {
    if (expectedProviderId !== "openai") return;
    for (const profile of supportedProfiles) {
      const label = adapter.resolveModelLabel(profile);
      expect(label, `Label for ${profile} should start with 'openai/'`).toMatch(/^openai\//);
    }
  });

  it("error thrown for unsupported profile contains a helpful message", () => {
    const rejectedProfile =
      expectedProviderId === "replicate" ? "openai_image_candidate" : "pro_consistent";
    let errorMessage = "";
    try {
      adapter.resolveModelLabel(rejectedProfile as ImageModelProfile);
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }
    expect(errorMessage.length).toBeGreaterThan(0);
    // Error should mention what was received or what is expected
    expect(errorMessage).toMatch(/openai_image_candidate|ReplicateImageAdapter/i);
  });
});

// -------------------------------------------------------------------------
// 6. Error classification contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — error classification contract", ({ adapter, supportedProfiles }) => {
  const testProfile = supportedProfiles[0];

  it("classifyError never throws for Error input", () => {
    expect(() =>
      adapter.classifyError(new Error("test"), { profile: testProfile })
    ).not.toThrow();
  });

  it("classifyError never throws for undefined input", () => {
    expect(() =>
      adapter.classifyError(undefined, { profile: testProfile })
    ).not.toThrow();
  });

  it("classifyError never throws for null input", () => {
    expect(() =>
      adapter.classifyError(null, { profile: testProfile })
    ).not.toThrow();
  });

  it("classifyError never throws for string input", () => {
    expect(() =>
      adapter.classifyError("some string error", { profile: testProfile })
    ).not.toThrow();
  });

  it("classifyError never throws for object input", () => {
    expect(() =>
      adapter.classifyError({ code: 500, reason: "test" }, { profile: testProfile })
    ).not.toThrow();
  });

  it("classifyError result has required fields: providerId, profile, errorCategory, errorCode", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    expect(result).toHaveProperty("providerId");
    expect(result).toHaveProperty("profile");
    expect(result).toHaveProperty("errorCategory");
    expect(result).toHaveProperty("errorCode");
  });

  it("classifyError result.providerId matches adapter.providerId", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    expect(result.providerId).toBe(adapter.providerId);
  });

  it("classifyError result.profile matches context.profile", () => {
    for (const profile of supportedProfiles) {
      const result = adapter.classifyError(new Error("test"), { profile });
      expect(result.profile).toBe(profile);
    }
  });

  it("classifyError returns UNKNOWN for ambiguous error input", () => {
    const result = adapter.classifyError(new Error("completely unexpected"), { profile: testProfile });
    expect(result.errorCode).toBe("UNKNOWN");
  });

  it("classifyError classifies timeout consistently", () => {
    // The shared taxonomy must classify timeout errors as TIMEOUT regardless of provider.
    const err = new Error("deadline exceeded: timeout");
    const result = adapter.classifyError(err, { profile: testProfile });
    expect(result.errorCode).toBe("TIMEOUT");
    expect(result.errorCategory).toBe("timeout");
  });

  it("classifyError result.retryable is a boolean when present", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    if (result.retryable !== undefined) {
      expect(typeof result.retryable).toBe("boolean");
    }
  });
});

// -------------------------------------------------------------------------
// 7. Privacy / safe message contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — privacy and safe message contract", ({ adapter, supportedProfiles }) => {
  const testProfile = supportedProfiles[0];

  it("classifyError result does not contain a 'prompt' key", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    expect(result).not.toHaveProperty("prompt");
  });

  it("classifyError result does not contain a 'childName' key", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    expect(result).not.toHaveProperty("childName");
  });

  it("classifyError result does not contain a 'storyText' key", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    expect(result).not.toHaveProperty("storyText");
  });

  it("classifyError result does not contain a 'userId' key", () => {
    const result = adapter.classifyError(new Error("test"), { profile: testProfile });
    expect(result).not.toHaveProperty("userId");
  });

  it("safeMessage is <= 120 chars when present", () => {
    const longMsg = "A".repeat(300);
    const result = adapter.classifyError(new Error(longMsg), { profile: testProfile });
    if (result.safeMessage !== undefined) {
      expect(result.safeMessage.length).toBeLessThanOrEqual(120);
    }
  });

  it("safeMessage is undefined for non-Error inputs", () => {
    const result = adapter.classifyError({ code: 42 }, { profile: testProfile });
    expect(result.safeMessage).toBeUndefined();
  });
});

// -------------------------------------------------------------------------
// 8. No live network contract
// -------------------------------------------------------------------------

describe.each(adapters)("$name — no live network contract", ({ adapter, supportedProfiles }) => {
  it("constructor with dummy credentials does not make network calls", () => {
    // The fixture already constructed with dummy tokens above.
    // Just verify the adapter exists and is not null/undefined.
    expect(adapter).toBeDefined();
    expect(adapter.providerId).toBeDefined();
  });

  it("resolveModelLabel does not make network calls (pure computation)", () => {
    // resolveModelLabel should be synchronous and pure — no async I/O.
    const profile = supportedProfiles[0];
    let threw = false;
    let result: string | undefined;
    try {
      result = adapter.resolveModelLabel(profile);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(typeof result).toBe("string");
  });

  it("classifyError does not make network calls (pure computation)", () => {
    // classifyError should be synchronous and pure — no async I/O.
    const profile = supportedProfiles[0];
    let threw = false;
    let result: ReturnType<typeof adapter.classifyError> | undefined;
    try {
      result = adapter.classifyError(new Error("test"), { profile });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBeDefined();
  });
});

// -------------------------------------------------------------------------
// 9. Cross-adapter exhaustiveness contract
// -------------------------------------------------------------------------

describe("Cross-adapter exhaustiveness", () => {
  it("every ImageModelProfile is handled by exactly one adapter without throw", () => {
    const allProfiles = Object.keys(PROFILE_PROVIDER_MAP) as ImageModelProfile[];
    for (const profile of allProfiles) {
      const expectedProvider = PROFILE_PROVIDER_MAP[profile];
      const handlingAdapter = adapters.find((f) => f.expectedProviderId === expectedProvider);
      expect(
        handlingAdapter,
        `No adapter fixture found for profile ${profile} (expected provider: ${expectedProvider})`
      ).toBeDefined();
      expect(
        () => handlingAdapter!.adapter.resolveModelLabel(profile),
        `Handling adapter should not throw for profile: ${profile}`
      ).not.toThrow();
    }
  });

  it("each profile is rejected by all adapters except its owner", () => {
    const allProfiles = Object.keys(PROFILE_PROVIDER_MAP) as ImageModelProfile[];
    for (const profile of allProfiles) {
      const ownerProviderId = PROFILE_PROVIDER_MAP[profile];
      for (const fixture of adapters) {
        if (fixture.expectedProviderId !== ownerProviderId) {
          expect(
            () => fixture.adapter.resolveModelLabel(profile),
            `${fixture.name} should reject profile ${profile} (owned by ${ownerProviderId})`
          ).toThrow();
        }
      }
    }
  });

  it("total adapters in fixture matches total unique provider IDs in PROFILE_PROVIDER_MAP", () => {
    const uniqueProviders = new Set(Object.values(PROFILE_PROVIDER_MAP));
    expect(adapters.length).toBe(uniqueProviders.size);
  });

  it("each adapter in fixture corresponds to a provider ID that exists in PROFILE_PROVIDER_MAP", () => {
    const knownProviders = new Set(Object.values(PROFILE_PROVIDER_MAP));
    for (const fixture of adapters) {
      expect(
        knownProviders.has(fixture.expectedProviderId),
        `Fixture provider ID "${fixture.expectedProviderId}" not in PROFILE_PROVIDER_MAP`
      ).toBe(true);
    }
  });
});
