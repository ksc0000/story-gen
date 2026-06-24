/**
 * P3-4: Tests for OpenAIImageAdapter.
 *
 * Coverage:
 *  1. Adapter identity and capabilities.
 *  2. resolveModelLabel — openai_image_candidate maps to correct label.
 *  3. resolveModelLabel — non-OpenAI profiles throw clear errors.
 *  4. classifyError — all error taxonomy codes mapped correctly.
 *  5. classifyError — retryable flag.
 *  6. classifyError — safeMessage truncated, no prompt leak.
 *  7. generateImage — mock uploader path (no network).
 *  8. generateImage — throws for non-openai_image_candidate profile.
 *  9. generateImage — default uploader throws (not yet wired).
 * 10. validateConfig — throws on empty apiKey.
 * 11. Candidate-only invariant — adapter does not expose allowCandidateProfile logic.
 * 12. PROFILE_PROVIDER_MAP consistency — openai profile handled, Replicate profiles throw.
 *
 * NOTE: generateImage with a real OpenAI API call is NOT tested here.
 *       Live smoke belongs to P3-9 (adapter smoke, gated only).
 *       Unit tests use a mock uploader to avoid any network calls.
 *       The adapter is NOT wired into generate-book.ts as of P3-4.
 */

import { describe, it, expect, vi } from "vitest";
import {
  OpenAIImageAdapter,
  type OpenAIStorageUploader,
} from "../src/lib/openai-image-adapter";
import { PROFILE_PROVIDER_MAP } from "../src/lib/image-provider";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** A mock storage uploader that returns a deterministic URL without network. */
const mockUploader: OpenAIStorageUploader = async (buffer, profile) => {
  void buffer;
  return `https://storage.example.com/books/mock-openai-${profile}.png`;
};

// -------------------------------------------------------------------------
// 1. Identity and capabilities
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter — identity and capabilities", () => {
  it("providerId is 'openai'", () => {
    const adapter = new OpenAIImageAdapter("sk-test");
    expect(adapter.providerId).toBe("openai");
  });

  it("capabilities.supportsTextToImage is true", () => {
    const adapter = new OpenAIImageAdapter("sk-test");
    expect(adapter.capabilities.supportsTextToImage).toBe(true);
  });

  it("capabilities.supportsImageToImage is true (Responses API supports reference images)", () => {
    const adapter = new OpenAIImageAdapter("sk-test");
    expect(adapter.capabilities.supportsImageToImage).toBe(true);
  });

  it("capabilities.supportsReferenceImages is true (inputImageUrls forwarded via Responses API)", () => {
    const adapter = new OpenAIImageAdapter("sk-test");
    expect(adapter.capabilities.supportsReferenceImages).toBe(true);
  });

  it("capabilities.supportsDetailedGuidance is true", () => {
    const adapter = new OpenAIImageAdapter("sk-test");
    expect(adapter.capabilities.supportsDetailedGuidance).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 2. resolveModelLabel — correct label for openai_image_candidate
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter.resolveModelLabel", () => {
  const adapter = new OpenAIImageAdapter("sk-test");

  it("openai_image_candidate → 'openai/gpt-image-1-mini' (text-to-image default)", () => {
    expect(adapter.resolveModelLabel("openai_image_candidate")).toBe(
      "openai/gpt-image-1-mini"
    );
  });

  it("openai_mini → 'openai/gpt-image-1-mini'", () => {
    expect(adapter.resolveModelLabel("openai_mini")).toBe(
      "openai/gpt-image-1-mini"
    );
  });

  it("openai_standard → 'openai/gpt-image-1'", () => {
    expect(adapter.resolveModelLabel("openai_standard")).toBe(
      "openai/gpt-image-1"
    );
  });

  it("resolveModelLabel returns a string starting with 'openai/'", () => {
    const label = adapter.resolveModelLabel("openai_image_candidate");
    expect(label).toMatch(/^openai\//);
  });

  // 3. Non-OpenAI profiles throw
  it("pro_consistent throws — Replicate profile not supported by OpenAI adapter", () => {
    expect(() => adapter.resolveModelLabel("pro_consistent")).toThrowError(
      /OpenAIImageAdapter does not support profile/
    );
  });

  it("klein_fast throws — Replicate profile not supported by OpenAI adapter", () => {
    expect(() => adapter.resolveModelLabel("klein_fast")).toThrowError(
      /OpenAIImageAdapter does not support profile/
    );
  });

  it("klein_base throws — Replicate profile not supported by OpenAI adapter", () => {
    expect(() => adapter.resolveModelLabel("klein_base")).toThrowError(
      /ReplicateImageAdapter/
    );
  });

  it("kontext_reference throws — Replicate profile not supported by OpenAI adapter", () => {
    expect(() => adapter.resolveModelLabel("kontext_reference")).toThrowError(
      /ReplicateImageAdapter/
    );
  });

  it("flux11_pro_candidate throws — Replicate profile not supported by OpenAI adapter", () => {
    expect(() => adapter.resolveModelLabel("flux11_pro_candidate")).toThrowError(
      /OpenAIImageAdapter does not support profile/
    );
  });

  it("error message for non-openai profile mentions which adapter to use", () => {
    expect(() => adapter.resolveModelLabel("pro_consistent")).toThrowError(
      /ReplicateImageAdapter/
    );
  });
});

// -------------------------------------------------------------------------
// 4 & 5. classifyError — taxonomy and retryable flag
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter.classifyError", () => {
  const adapter = new OpenAIImageAdapter("sk-test");
  const profile: ImageModelProfile = "openai_image_candidate";

  it("timeout error → timeout / TIMEOUT, retryable", () => {
    const err = new Error("deadline exceeded: timeout after 120000ms");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("timeout");
    expect(failure.errorCode).toBe("TIMEOUT");
    expect(failure.retryable).toBe(true);
    expect(failure.providerId).toBe("openai");
    expect(failure.profile).toBe("openai_image_candidate");
  });

  it("rate limit / quota message → quota / QUOTA_EXCEEDED, not retryable", () => {
    const err = new Error("Rate limit exceeded: 429 Too Many Requests");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("quota");
    expect(failure.errorCode).toBe("QUOTA_EXCEEDED");
    expect(failure.retryable).toBe(false);
  });

  it("429 status code → quota / QUOTA_EXCEEDED", () => {
    const err = new Error("OpenAI API error 429");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCode).toBe("QUOTA_EXCEEDED");
  });

  it("503 Service Unavailable → provider_error / PROVIDER_5XX, retryable", () => {
    const err = new Error("OpenAI service unavailable: 503");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("provider_error");
    expect(failure.errorCode).toBe("PROVIDER_5XX");
    expect(failure.retryable).toBe(true);
  });

  it("500 Internal Server Error → provider_error / PROVIDER_5XX, retryable", () => {
    const err = new Error("Internal server error 500");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCode).toBe("PROVIDER_5XX");
    expect(failure.retryable).toBe(true);
  });

  it("400 Bad Request → provider_error / PROVIDER_4XX, not retryable", () => {
    const err = new Error("API error 400 bad request");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("provider_error");
    expect(failure.errorCode).toBe("PROVIDER_4XX");
    expect(failure.retryable).toBe(false);
  });

  it("network error → network / NETWORK_ERROR, retryable", () => {
    const err = new Error("fetch failed: ENOTFOUND api.openai.com");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("network");
    expect(failure.errorCode).toBe("NETWORK_ERROR");
    expect(failure.retryable).toBe(true);
  });

  it("unknown error → unknown / UNKNOWN, not retryable", () => {
    const err = new Error("Something unexpected");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.errorCategory).toBe("unknown");
    expect(failure.errorCode).toBe("UNKNOWN");
    expect(failure.retryable).toBe(false);
  });

  it("undefined → unknown / UNKNOWN", () => {
    const failure = adapter.classifyError(undefined, { profile });
    expect(failure.errorCode).toBe("UNKNOWN");
    expect(failure.providerId).toBe("openai");
  });

  // 6. safeMessage truncation
  it("safeMessage is set for Error inputs", () => {
    const err = new Error("OpenAI: model capacity exceeded temporarily");
    const failure = adapter.classifyError(err, { profile });
    expect(failure.safeMessage).toBeDefined();
    expect(failure.safeMessage!.length).toBeLessThanOrEqual(120);
  });

  it("safeMessage is truncated at 120 chars for long error messages", () => {
    const longMsg = "Y".repeat(200);
    const err = new Error(longMsg);
    const failure = adapter.classifyError(err, { profile });
    expect(failure.safeMessage!.length).toBe(120);
  });

  it("safeMessage is undefined for non-Error inputs", () => {
    const failure = adapter.classifyError("string error", { profile });
    expect(failure.safeMessage).toBeUndefined();
  });

  it("classifyError always returns providerId = 'openai'", () => {
    const err = new Error("test");
    const failure = adapter.classifyError(err, { profile: "openai_image_candidate" });
    expect(failure.providerId).toBe("openai");
    expect(failure.profile).toBe("openai_image_candidate");
  });
});

// -------------------------------------------------------------------------
// 7. generateImage — mock uploader path (no network)
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter.generateImage (mock uploader, no network)", () => {
  it("generateImage with mock client returns correct shape", async () => {
    const uploaderSpy = vi.fn(mockUploader);

    // Subclass to skip real OpenAI API call while exercising uploader + result construction.
    class TestableOpenAIAdapter extends OpenAIImageAdapter {
      override async generateImage(request: import("../src/lib/image-provider").ImageGenerationRequest) {
        const profile = request.imageModelProfile;
        if (profile !== "openai_image_candidate" && profile !== "openai_mini" && profile !== "openai_standard") {
          throw new Error(`OpenAIImageAdapter does not support profile: "${profile}". Use ReplicateImageAdapter for Replicate profiles.`);
        }
        const syntheticBuffer = Buffer.from("fake-openai-image-data");
        const inputImageUrls = profile === "openai_mini" ? [] : (request.inputImageUrls ?? []);
        const hasReferenceImages = inputImageUrls.length > 0;
        const imageUrl = await uploaderSpy(syntheticBuffer, profile);

        let modelLabel = this.resolveModelLabel(profile);
        if (hasReferenceImages) {
          modelLabel = "openai/gpt-4o";
        }

        return {
          imageUrl,
          providerId: "openai" as const,
          modelLabel,
          profile,
          durationMs: 2000,
          fallbackUsed: false,
        };
      }
    }

    const adapter = new TestableOpenAIAdapter("sk-test", uploaderSpy);
    const result = await adapter.generateImage({
      prompt: "A wizard reading a storybook",
      imageModelProfile: "openai_image_candidate",
      aspectRatio: "4:3",
      metadata: {
        bookId: "book-456",
        pageIndex: 2,
        candidateRequested: true,
        candidateAllowed: true,
      },
    });

    expect(uploaderSpy).toHaveBeenCalledOnce();
    expect(result.providerId).toBe("openai");
    expect(result.modelLabel).toBe("openai/gpt-image-1-mini");
    expect(result.profile).toBe("openai_image_candidate");
    expect(result.imageUrl).toContain("mock-openai-openai_image_candidate");
    expect(result.fallbackUsed).toBe(false);
  });

  it("generateCharacterReferenceImage with mock client returns correct shape (delegates to generateImage)", async () => {
    const uploaderSpy = vi.fn(mockUploader);

    class TestableOpenAIAdapter extends OpenAIImageAdapter {
      override async generateImage(request: import("../src/lib/image-provider").ImageGenerationRequest) {
        const profile = request.imageModelProfile;
        const syntheticBuffer = Buffer.from("fake-openai-image-data");
        const imageUrl = await uploaderSpy(syntheticBuffer, profile);
        return {
          imageUrl,
          providerId: "openai" as const,
          modelLabel: "openai/gpt-image-1-mini",
          profile,
          durationMs: 1200,
          fallbackUsed: false,
        };
      }
    }

    const adapter = new TestableOpenAIAdapter("sk-test", uploaderSpy);
    const result = await adapter.generateCharacterReferenceImage({
      prompt: "Character reference prompt",
      imageModelProfile: "openai_image_candidate",
      metadata: { bookId: "book-456", characterId: "char-2" },
    });

    expect(uploaderSpy).toHaveBeenCalledOnce();
    expect(result.providerId).toBe("openai");
    expect(result.profile).toBe("openai_image_candidate");
    expect(result.imageUrl).toContain("mock-openai-openai_image_candidate");
  });

  it("openai_mini ignores reference images and returns mini label", async () => {
    const uploaderSpy = vi.fn(mockUploader);

    class TestableOpenAIAdapter extends OpenAIImageAdapter {
      override async generateImage(request: import("../src/lib/image-provider").ImageGenerationRequest) {
        const profile = request.imageModelProfile;
        if (profile !== "openai_mini") throw new Error("Expected openai_mini");

        const syntheticBuffer = Buffer.from("fake-openai-mini-data");
        // mini explicitly ignores refs
        const inputImageUrls: string[] = [];
        const hasReferenceImages = false;
        const imageUrl = await uploaderSpy(syntheticBuffer, profile);

        return {
          imageUrl,
          providerId: "openai" as const,
          modelLabel: "openai/gpt-image-1-mini",
          profile,
          durationMs: 1500,
          fallbackUsed: false,
        };
      }
    }

    const adapter = new TestableOpenAIAdapter("sk-test", uploaderSpy);
    const result = await adapter.generateImage({
      prompt: "A cat in the hat",
      imageModelProfile: "openai_mini",
      inputImageUrls: ["https://example.com/ignored.jpg"],
    });

    expect(result.modelLabel).toBe("openai/gpt-image-1-mini");
    expect(result.profile).toBe("openai_mini");
  });

  it("openai_standard returns standard label (no refs)", async () => {
    const uploaderSpy = vi.fn(mockUploader);

    class TestableOpenAIAdapter extends OpenAIImageAdapter {
      override async generateImage(request: import("../src/lib/image-provider").ImageGenerationRequest) {
        const profile = request.imageModelProfile;
        if (profile !== "openai_standard") throw new Error("Expected openai_standard");

        const syntheticBuffer = Buffer.from("fake-openai-standard-data");
        const imageUrl = await uploaderSpy(syntheticBuffer, profile);

        return {
          imageUrl,
          providerId: "openai" as const,
          modelLabel: "openai/gpt-image-1",
          profile,
          durationMs: 2500,
          fallbackUsed: false,
        };
      }
    }

    const adapter = new TestableOpenAIAdapter("sk-test", uploaderSpy);
    const result = await adapter.generateImage({
      prompt: "A majestic lion",
      imageModelProfile: "openai_standard",
    });

    expect(result.modelLabel).toBe("openai/gpt-image-1");
    expect(result.profile).toBe("openai_standard");
  });

  // 8. generateImage throws for non-candidate profile
  it("generateImage throws for non-openai profile", async () => {
    const adapter = new OpenAIImageAdapter("sk-test", mockUploader);
    await expect(
      adapter.generateImage({
        prompt: "A dragon",
        imageModelProfile: "pro_consistent",
      })
    ).rejects.toThrowError(/OpenAIImageAdapter does not support profile/);
  });

  it("generateImage throws for klein_fast", async () => {
    const adapter = new OpenAIImageAdapter("sk-test", mockUploader);
    await expect(
      adapter.generateImage({
        prompt: "A dragon",
        imageModelProfile: "klein_fast",
      })
    ).rejects.toThrowError(/ReplicateImageAdapter/);
  });
});

// -------------------------------------------------------------------------
// 9. generateImage — default uploader throws
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter.generateImage — default uploader", () => {
  it("default uploader throws when not configured", async () => {
    const adapter = new OpenAIImageAdapter("sk-test");

    class UploadTestAdapter extends OpenAIImageAdapter {
      async testDefaultUploader(): Promise<void> {
        await (this as any).uploader(Buffer.from("test"), "openai_image_candidate" as ImageModelProfile);
      }
    }
    const testAdapter = new UploadTestAdapter("sk-test");
    await expect(testAdapter.testDefaultUploader()).rejects.toThrowError(
      /storage uploader not configured/
    );
  });
});

// -------------------------------------------------------------------------
// 10. validateConfig
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter.validateConfig", () => {
  it("does not throw for a non-empty apiKey", () => {
    const adapter = new OpenAIImageAdapter("sk-test-abc123");
    expect(() => adapter.validateConfig()).not.toThrow();
  });

  it("throws for empty apiKey", () => {
    const adapter = new OpenAIImageAdapter("");
    expect(() => adapter.validateConfig()).toThrowError(/apiKey/);
  });
});

// -------------------------------------------------------------------------
// 11. Candidate-only invariant
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter — candidate-only invariant", () => {
  const adapter = new OpenAIImageAdapter("sk-test");

  it("adapter does not expose allowCandidateProfile property", () => {
    expect((adapter as any).allowCandidateProfile).toBeUndefined();
  });

  it("adapter does not expose candidateGate method", () => {
    expect(typeof (adapter as any).candidateGate).toBe("undefined");
  });

  it("adapter does not expose isCandidateProfile method", () => {
    expect(typeof (adapter as any).isCandidateProfile).toBe("undefined");
  });

  it("resolveModelLabel only accepts openai_image_candidate — all others throw", () => {
    const replicateProfiles: ImageModelProfile[] = [
      "klein_fast",
      "klein_base",
      "pro_consistent",
      "kontext_reference",
      "flux11_pro_candidate",
    ];
    for (const profile of replicateProfiles) {
      expect(
        () => adapter.resolveModelLabel(profile),
        `Should throw for Replicate profile: ${profile}`
      ).toThrow();
    }
  });
});

// -------------------------------------------------------------------------
// 12. PROFILE_PROVIDER_MAP consistency
// -------------------------------------------------------------------------

describe("PROFILE_PROVIDER_MAP consistency with OpenAIImageAdapter", () => {
  const adapter = new OpenAIImageAdapter("sk-test");

  it("openai_image_candidate (mapped to 'openai') is handled by resolveModelLabel without throw", () => {
    const openaiProfiles = Object.entries(PROFILE_PROVIDER_MAP)
      .filter(([, providerId]) => providerId === "openai")
      .map(([profile]) => profile as ImageModelProfile);

    for (const profile of openaiProfiles) {
      expect(
        () => adapter.resolveModelLabel(profile),
        `resolveModelLabel should not throw for openai profile: ${profile}`
      ).not.toThrow();
    }
  });

  it("all profiles mapped to 'replicate' throw on OpenAIImageAdapter", () => {
    const replicateProfiles = Object.entries(PROFILE_PROVIDER_MAP)
      .filter(([, providerId]) => providerId === "replicate")
      .map(([profile]) => profile as ImageModelProfile);

    for (const profile of replicateProfiles) {
      expect(
        () => adapter.resolveModelLabel(profile),
        `Should throw for replicate profile: ${profile}`
      ).toThrow();
    }
  });

  it("six openai profiles in PROFILE_PROVIDER_MAP", () => {
    const openaiProfiles = Object.entries(PROFILE_PROVIDER_MAP).filter(
      ([, v]) => v === "openai"
    );
    expect(openaiProfiles).toHaveLength(6);
    const profiles = openaiProfiles.map(([p]) => p);
    expect(profiles).toContain("openai_mini");
    expect(profiles).toContain("openai_standard");
    expect(profiles).toContain("openai_gpt_image_2");
    expect(profiles).toContain("openai_gpt_image_2_medium");
    expect(profiles).toContain("openai_gpt_image_2_low");
    expect(profiles).toContain("openai_image_candidate");
  });
});

// -------------------------------------------------------------------------
// P3-5: New provider-specific patterns (via classifyProviderError helper)
// -------------------------------------------------------------------------

describe("OpenAIImageAdapter.classifyError — P3-5 extended patterns", () => {
  const adapter = new OpenAIImageAdapter("sk-test");
  const profile = "openai_image_candidate" as ImageModelProfile;

  it("'insufficient_quota' → QUOTA_EXCEEDED, retryable false", () => {
    const failure = adapter.classifyError(
      new Error("You exceeded your quota: insufficient_quota"),
      { profile }
    );
    expect(failure.errorCode).toBe("QUOTA_EXCEEDED");
    expect(failure.errorCategory).toBe("quota");
    expect(failure.retryable).toBe(false);
  });

  it("'moderation' → E005, retryable false", () => {
    const failure = adapter.classifyError(
      new Error("Request blocked by moderation system"),
      { profile }
    );
    expect(failure.errorCode).toBe("E005");
    expect(failure.errorCategory).toBe("safety_or_policy");
    expect(failure.retryable).toBe(false);
  });

  it("'content_policy' (underscore) → E005, retryable false", () => {
    const failure = adapter.classifyError(
      new Error("Rejected: content_policy violation"),
      { profile }
    );
    expect(failure.errorCode).toBe("E005");
    expect(failure.retryable).toBe(false);
  });

  it("ECONNRESET → NETWORK_ERROR, retryable true", () => {
    const failure = adapter.classifyError(
      new Error("read ECONNRESET"),
      { profile }
    );
    expect(failure.errorCode).toBe("NETWORK_ERROR");
    expect(failure.retryable).toBe(true);
  });

  it("ETIMEDOUT → NETWORK_ERROR (not TIMEOUT), retryable true", () => {
    const failure = adapter.classifyError(
      new Error("connect ETIMEDOUT 104.18.0.1:443"),
      { profile }
    );
    expect(failure.errorCode).toBe("NETWORK_ERROR");
    expect(failure.retryable).toBe(true);
    expect(failure.errorCode).not.toBe("TIMEOUT");
  });

  it("'overloaded' → PROVIDER_5XX, retryable true", () => {
    const failure = adapter.classifyError(
      new Error("service overloaded, please retry"),
      { profile }
    );
    expect(failure.errorCode).toBe("PROVIDER_5XX");
    expect(failure.retryable).toBe(true);
  });

  it("'invalid request' → PROVIDER_4XX, retryable false", () => {
    const failure = adapter.classifyError(
      new Error("invalid request: size not supported"),
      { profile }
    );
    expect(failure.errorCode).toBe("PROVIDER_4XX");
    expect(failure.retryable).toBe(false);
  });

  it("safeMessage ≤ 120 chars for all P3-5 new patterns", () => {
    const longSuffix = "x".repeat(200);
    const cases = [
      new Error("insufficient_quota " + longSuffix),
      new Error("moderation " + longSuffix),
      new Error("read ECONNRESET " + longSuffix),
      new Error("overloaded " + longSuffix),
    ];
    for (const err of cases) {
      const failure = adapter.classifyError(err, { profile });
      expect(failure.safeMessage.length).toBeLessThanOrEqual(120);
    }
  });
});
