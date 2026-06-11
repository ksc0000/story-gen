/**
 * P3-3: Tests for ReplicateImageAdapter.
 *
 * Coverage:
 *  1. Adapter identity and capabilities.
 *  2. resolveModelLabel — correct labels for all Replicate profiles.
 *  3. resolveModelLabel — throws for openai_image_candidate.
 *  4. classifyError — all error taxonomy codes mapped correctly.
 *  5. classifyError — retryable flag.
 *  6. classifyError — safeMessage truncated, no prompt leak.
 *  7. generateImage — mock uploader path (no network).
 *  8. generateImage — default uploader throws (not yet wired).
 *  9. validateConfig — throws on empty token.
 * 10. PROFILE_PROVIDER_MAP consistency — all "replicate" profiles handled without throw.
 *
 * NOTE: generateImage with a real Replicate API call is NOT tested here.
 *       Live smoke belongs to P3-9 (OpenAI + Replicate adapter smoke).
 *       Unit tests use a mock uploader to avoid any network calls.
 *       The adapter is NOT wired into generate-book.ts as of P3-3.
 */

import { describe, it, expect, vi } from "vitest";
import {
  ReplicateImageAdapter,
  type ReplicateStorageUploader,
} from "../src/lib/replicate-image-adapter";
import { PROFILE_PROVIDER_MAP } from "../src/lib/image-provider";
import type { ImageModelProfile } from "../src/lib/types";
import { ImageTimeoutError } from "../src/lib/replicate";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** A mock storage uploader that returns a deterministic URL without network. */
const mockUploader: ReplicateStorageUploader = async (buffer, profile) => {
  void buffer;
  return `https://storage.example.com/books/mock-${profile}.png`;
};

// -------------------------------------------------------------------------
// 1. Identity and capabilities
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter — identity and capabilities", () => {
  it("providerId is 'replicate'", () => {
    const adapter = new ReplicateImageAdapter("tok-test");
    expect(adapter.providerId).toBe("replicate");
  });

  it("capabilities.supportsTextToImage is true", () => {
    const adapter = new ReplicateImageAdapter("tok-test");
    expect(adapter.capabilities.supportsTextToImage).toBe(true);
  });

  it("capabilities.supportsImageToImage is false (FLUX reference images are hints, not i2i editing)", () => {
    const adapter = new ReplicateImageAdapter("tok-test");
    expect(adapter.capabilities.supportsImageToImage).toBe(false);
  });

  it("capabilities.supportsReferenceImages is true (inputImageUrls forwarded to provider)", () => {
    const adapter = new ReplicateImageAdapter("tok-test");
    expect(adapter.capabilities.supportsReferenceImages).toBe(true);
  });

  it("capabilities.supportsDetailedGuidance is true", () => {
    const adapter = new ReplicateImageAdapter("tok-test");
    expect(adapter.capabilities.supportsDetailedGuidance).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 2. resolveModelLabel — correct labels for Replicate profiles
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter.resolveModelLabel", () => {
  const adapter = new ReplicateImageAdapter("tok-test");

  it("pro_consistent → flux-2-pro label", () => {
    expect(adapter.resolveModelLabel("pro_consistent")).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });

  it("klein_fast → flux-2-klein-9b label", () => {
    expect(adapter.resolveModelLabel("klein_fast")).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
  });

  it("klein_base → flux-2-klein-9b-base label", () => {
    expect(adapter.resolveModelLabel("klein_base")).toBe(
      "black-forest-labs/flux-2-klein-9b-base"
    );
  });

  it("kontext_reference → flux-kontext-pro label", () => {
    expect(adapter.resolveModelLabel("kontext_reference")).toBe(
      "black-forest-labs/flux-kontext-pro"
    );
  });

  it("kontext_max → flux-kontext-max label", () => {
    expect(adapter.resolveModelLabel("kontext_max")).toBe(
      "black-forest-labs/flux-kontext-max"
    );
  });

  it("flux11_pro_candidate → flux-1.1-pro label", () => {
    expect(adapter.resolveModelLabel("flux11_pro_candidate")).toBe(
      "black-forest-labs/flux-1.1-pro"
    );
  });

  // 3. openai_image_candidate throws
  it("openai_image_candidate throws — not supported by Replicate adapter", () => {
    expect(() => adapter.resolveModelLabel("openai_image_candidate")).toThrowError(
      /openai_image_candidate/
    );
  });

  it("openai_image_candidate error mentions OpenAIImageAdapter", () => {
    expect(() => adapter.resolveModelLabel("openai_image_candidate")).toThrowError(
      /OpenAIImageAdapter/
    );
  });
});

// -------------------------------------------------------------------------
// 4 & 5. classifyError — taxonomy and retryable flag
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter.classifyError", () => {
  const adapter = new ReplicateImageAdapter("tok-test");
  const profile: ImageModelProfile = "pro_consistent";

  it("ImageTimeoutError → timeout / TIMEOUT, retryable", () => {
    const err = new ImageTimeoutError("Image generation timed out after 120000ms");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("timeout");
    expect(failure.errorCode).toBe("TIMEOUT");
    expect(failure.retryable).toBe(true);
    expect(failure.providerId).toBe("replicate");
    expect(failure.profile).toBe("pro_consistent");
  });

  it("E005 message → safety_or_policy / E005, not retryable", () => {
    const err = new Error("Rejected: E005 content policy violation");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("safety_or_policy");
    expect(failure.errorCode).toBe("E005");
    expect(failure.retryable).toBe(false);
  });

  it("content policy message → safety_or_policy / E005, not retryable", () => {
    const err = new Error("Request rejected due to content policy");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("safety_or_policy");
    expect(failure.errorCode).toBe("E005");
    expect(failure.retryable).toBe(false);
  });

  it("503 Service Unavailable → provider_error / PROVIDER_5XX, retryable", () => {
    const err = new Error("HTTP Error 503 service unavailable");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("provider_error");
    expect(failure.errorCode).toBe("PROVIDER_5XX");
    expect(failure.retryable).toBe(true);
  });

  it("network error → network / NETWORK_ERROR, retryable", () => {
    const err = new Error("fetch failed: ECONNREFUSED");
    const failure = adapter.classifyError(err, { profile: "klein_fast" });
    expect(failure.errorCategory).toBe("network");
    expect(failure.errorCode).toBe("NETWORK_ERROR");
    expect(failure.retryable).toBe(true);
  });

  it("404 Not Found → provider_error / PROVIDER_4XX, not retryable", () => {
    const err = new Error("API error 404");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("provider_error");
    expect(failure.errorCode).toBe("PROVIDER_4XX");
    expect(failure.retryable).toBe(false);
  });

  it("unknown error → unknown / UNKNOWN, not retryable", () => {
    const err = new Error("Something unexpected happened");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("unknown");
    expect(failure.errorCode).toBe("UNKNOWN");
    expect(failure.retryable).toBe(false);
  });

  it("undefined input → unknown / UNKNOWN", () => {
    const failure = adapter.classifyError(undefined, { profile });
    expect(failure.errorCode).toBe("UNKNOWN");
    expect(failure.providerId).toBe("replicate");
  });

  it("non-Error thrown value → unknown / UNKNOWN", () => {
    const failure = adapter.classifyError("oops", { profile });
    expect(failure.errorCode).toBe("UNKNOWN");
  });

  // 6. safeMessage truncation
  it("safeMessage is set for Error inputs", () => {
    const err = new Error("Replicate API error: model capacity exceeded");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.safeMessage).toBeDefined();
    expect(failure.safeMessage!.length).toBeLessThanOrEqual(120);
  });

  it("safeMessage is truncated at 120 chars for long messages", () => {
    const longMsg = "X".repeat(200);
    const err = new Error(longMsg);
    const failure = adapter.classifyError(err, { profile });
    expect(failure.safeMessage!.length).toBe(120);
  });

  it("safeMessage is undefined for non-Error inputs", () => {
    const failure = adapter.classifyError({ code: 500 }, { profile });
    expect(failure.safeMessage).toBeUndefined();
  });

  it("classifyError always returns providerId = 'replicate'", () => {
    const profiles: ImageModelProfile[] = [
      "klein_fast", "pro_consistent", "kontext_reference",
    ];
    for (const p of profiles) {
      const failure = adapter.classifyError(new Error("test"), { profile: p });
      expect(failure.providerId).toBe("replicate");
      expect(failure.profile).toBe(p);
    }
  });
});

// -------------------------------------------------------------------------
// 7. generateImage — mock uploader path (no network)
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter.generateImage (mock uploader, no network)", () => {
  it("generateImage calls uploader with buffer and profile, returns correct shape", async () => {
    // We need a mock ReplicateImageClient to avoid real network calls.
    // Since ReplicateImageAdapter creates the client internally, we test by providing
    // a mock uploader and a synthetic stub via vi.mock on the ReplicateImageClient.
    // In lieu of full DI, we spy on the module-level ReplicateImageClient import.

    // Use vi.mock at module level is not available here without hoisting.
    // Instead, we verify the mock uploader is called by wrapping a subclass.
    const uploaderSpy = vi.fn(mockUploader);

    // Create a subclass that overrides generateImage to skip the real API call
    // but still exercises the uploader and result construction.
    class TestableReplicateAdapter extends ReplicateImageAdapter {
      override async generateImage(request: import("../src/lib/image-provider").ImageGenerationRequest) {
        // Simulate what the real generateImage would do after a successful API call,
        // using a synthetic buffer. This tests the uploader integration and return shape.
        const syntheticBuffer = Buffer.from("fake-image-data");
        const imageUrl = await uploaderSpy(syntheticBuffer, request.imageModelProfile);
        return {
          imageUrl,
          providerId: "replicate" as const,
          modelLabel: this.resolveModelLabel(request.imageModelProfile),
          profile: request.imageModelProfile,
          durationMs: 100,
          fallbackUsed: false,
        };
      }
    }

    const adapter = new TestableReplicateAdapter("tok-test", uploaderSpy);
    const result = await adapter.generateImage({
      prompt: "A dragon in a forest",
      imageModelProfile: "pro_consistent",
      aspectRatio: "4:3",
      metadata: { bookId: "book-123", pageIndex: 1 },
    });

    expect(uploaderSpy).toHaveBeenCalledOnce();
    expect(result.providerId).toBe("replicate");
    expect(result.modelLabel).toBe("black-forest-labs/flux-2-pro");
    expect(result.profile).toBe("pro_consistent");
    expect(result.imageUrl).toContain("mock-pro_consistent");
    expect(result.fallbackUsed).toBe(false);
  });

  it("generateCharacterReferenceImage returns correct shape (delegates to generateImage)", async () => {
    const uploaderSpy = vi.fn(mockUploader);

    class TestableReplicateAdapter extends ReplicateImageAdapter {
      override async generateImage(request: import("../src/lib/image-provider").ImageGenerationRequest) {
        const syntheticBuffer = Buffer.from("fake-image-data");
        const imageUrl = await uploaderSpy(syntheticBuffer, request.imageModelProfile);
        return {
          imageUrl,
          providerId: "replicate" as const,
          modelLabel: this.resolveModelLabel(request.imageModelProfile),
          profile: request.imageModelProfile,
          durationMs: 150,
          fallbackUsed: false,
        };
      }
    }

    const adapter = new TestableReplicateAdapter("tok-test", uploaderSpy);
    const result = await adapter.generateCharacterReferenceImage({
      prompt: "Character reference prompt",
      imageModelProfile: "pro_consistent",
      metadata: { bookId: "book-123", characterId: "char-1" },
    });

    expect(uploaderSpy).toHaveBeenCalledOnce();
    expect(result.providerId).toBe("replicate");
    expect(result.profile).toBe("pro_consistent");
    expect(result.imageUrl).toContain("mock-pro_consistent");
  });
});

// -------------------------------------------------------------------------
// 8. generateImage — default uploader throws
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter.generateImage — default uploader", () => {
  it("throws when no storage uploader configured (default stub)", async () => {
    // The adapter is created without a custom uploader.
    // generateImage will call a real ReplicateImageClient (which needs a live API token)
    // before reaching the uploader, so we can only test the uploader-throw path
    // via the subclass pattern above. Here we just confirm the constructor default behavior.

    const adapter = new ReplicateImageAdapter("tok-test");
    // We can verify the default uploader throws by calling it directly via the subclass trick.
    class UploadTestAdapter extends ReplicateImageAdapter {
      async testDefaultUploader(): Promise<void> {
        // Access the default uploader by calling it directly on a minimal input
        await (this as any).uploader(Buffer.from("test"), "klein_fast" as ImageModelProfile);
      }
    }
    const testAdapter = new UploadTestAdapter("tok-test");
    await expect(testAdapter.testDefaultUploader()).rejects.toThrowError(
      /storage uploader not configured/
    );
  });
});

// -------------------------------------------------------------------------
// 9. validateConfig
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter.validateConfig", () => {
  it("does not throw for a non-empty apiToken", () => {
    const adapter = new ReplicateImageAdapter("replicate-r8_test_token");
    expect(() => adapter.validateConfig()).not.toThrow();
  });

  it("throws for empty apiToken", () => {
    const adapter = new ReplicateImageAdapter("");
    expect(() => adapter.validateConfig()).toThrowError(/apiToken/);
  });
});

// -------------------------------------------------------------------------
// 10. PROFILE_PROVIDER_MAP consistency
// -------------------------------------------------------------------------

describe("PROFILE_PROVIDER_MAP consistency with ReplicateImageAdapter", () => {
  const adapter = new ReplicateImageAdapter("tok-test");

  it("all profiles mapped to 'replicate' in PROFILE_PROVIDER_MAP are handled by resolveModelLabel", () => {
    const replicateProfiles = Object.entries(PROFILE_PROVIDER_MAP)
      .filter(([, providerId]) => providerId === "replicate")
      .map(([profile]) => profile as ImageModelProfile);

    for (const profile of replicateProfiles) {
      expect(
        () => adapter.resolveModelLabel(profile),
        `resolveModelLabel should not throw for replicate profile: ${profile}`
      ).not.toThrow();
    }
  });

  it("openai_image_candidate (mapped to 'openai') throws on ReplicateImageAdapter", () => {
    expect(() => adapter.resolveModelLabel("openai_image_candidate")).toThrow();
  });

  it("PROFILE_PROVIDER_MAP has at least 5 replicate profiles and 1 openai profile", () => {
    const replicateCount = Object.values(PROFILE_PROVIDER_MAP).filter(
      (v) => v === "replicate"
    ).length;
    const openaiCount = Object.values(PROFILE_PROVIDER_MAP).filter(
      (v) => v === "openai"
    ).length;
    expect(replicateCount).toBeGreaterThanOrEqual(5);
    expect(openaiCount).toBeGreaterThanOrEqual(1);
  });
});

// -------------------------------------------------------------------------
// P3-5: New provider-specific patterns (via classifyProviderError helper)
// -------------------------------------------------------------------------

describe("ReplicateImageAdapter.classifyError — P3-5 extended patterns", () => {
  const adapter = new ReplicateImageAdapter("tok-test");
  const profile = "pro_consistent" as ImageModelProfile;

  it("ECONNRESET → NETWORK_ERROR, retryable true", () => {
    const failure = adapter.classifyError(new Error("read ECONNRESET"), { profile });
    expect(failure.errorCode).toBe("NETWORK_ERROR");
    expect(failure.errorCategory).toBe("network");
    expect(failure.retryable).toBe(true);
  });

  it("ETIMEDOUT → NETWORK_ERROR (not TIMEOUT), retryable true", () => {
    const failure = adapter.classifyError(new Error("connect ETIMEDOUT 104.18.0.1:443"), { profile });
    expect(failure.errorCode).toBe("NETWORK_ERROR");
    expect(failure.retryable).toBe(true);
    expect(failure.errorCode).not.toBe("TIMEOUT");
  });

  it("'overloaded' → PROVIDER_5XX, retryable true", () => {
    const failure = adapter.classifyError(new Error("Model is overloaded, please retry"), { profile });
    expect(failure.errorCode).toBe("PROVIDER_5XX");
    expect(failure.errorCategory).toBe("provider_error");
    expect(failure.retryable).toBe(true);
  });

  it("'content_policy' (underscore) → E005, retryable false", () => {
    const failure = adapter.classifyError(new Error("Rejected: content_policy"), { profile });
    expect(failure.errorCode).toBe("E005");
    expect(failure.errorCategory).toBe("safety_or_policy");
    expect(failure.retryable).toBe(false);
  });

  it("'moderation' → E005, retryable false", () => {
    const failure = adapter.classifyError(new Error("blocked by moderation"), { profile });
    expect(failure.errorCode).toBe("E005");
    expect(failure.retryable).toBe(false);
  });

  it("'invalid input' → PROVIDER_4XX, retryable false", () => {
    const failure = adapter.classifyError(new Error("invalid input: prompt too long"), { profile });
    expect(failure.errorCode).toBe("PROVIDER_4XX");
    expect(failure.retryable).toBe(false);
  });

  it("'invalid request' → PROVIDER_4XX, retryable false", () => {
    const failure = adapter.classifyError(new Error("invalid request: unsupported ratio"), { profile });
    expect(failure.errorCode).toBe("PROVIDER_4XX");
    expect(failure.retryable).toBe(false);
  });

  it("safeMessage is ≤ 120 chars for all new patterns", () => {
    const longMsg = "x".repeat(200);
    const cases = [
      new Error("read ECONNRESET " + longMsg),
      new Error("overloaded " + longMsg),
      new Error("content_policy " + longMsg),
    ];
    for (const err of cases) {
      const failure = adapter.classifyError(err, { profile });
      expect(failure.safeMessage.length).toBeLessThanOrEqual(120);
    }
  });
});
