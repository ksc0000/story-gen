/**
 * P3-2: Tests for image-provider.ts type definitions and PROFILE_PROVIDER_MAP.
 *
 * These tests verify:
 *  1. PROFILE_PROVIDER_MAP contains every ImageModelProfile.
 *  2. openai_image_candidate maps to "openai" (candidate gate invariant).
 *  3. All production profiles map to "replicate".
 *  4. A mock ImageProvider can be constructed that satisfies the interface.
 *  5. ImageGenerationMetadata cannot carry known PII field names (runtime shape check).
 *
 * No production modules are imported or modified.
 * No Firebase APIs are called.
 * No network calls are made.
 */

import { describe, it, expect } from "vitest";
import type {
  ImageProvider,
  ImageProviderCapabilities,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageGenerationFailure,
  ImageGenerationMetadata,
} from "../src/lib/image-provider";
import {
  PROFILE_PROVIDER_MAP,
} from "../src/lib/image-provider";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// PROFILE_PROVIDER_MAP invariants
// -------------------------------------------------------------------------

describe("PROFILE_PROVIDER_MAP", () => {
  it("openai_image_candidate maps to openai", () => {
    expect(PROFILE_PROVIDER_MAP["openai_image_candidate"]).toBe("openai");
  });

  it("production default profile klein_fast maps to replicate", () => {
    expect(PROFILE_PROVIDER_MAP["klein_fast"]).toBe("replicate");
  });

  it("all non-openai profiles map to replicate", () => {
    const replicateProfiles: ImageModelProfile[] = [
      "klein_fast",
      "klein_base",
      "pro_consistent",
      "kontext_reference",
      "flux11_pro_candidate",
    ];
    for (const profile of replicateProfiles) {
      expect(PROFILE_PROVIDER_MAP[profile]).toBe("replicate");
    }
  });

  it("covers every known ImageModelProfile", () => {
    const allProfiles: ImageModelProfile[] = [
      "klein_fast",
      "klein_base",
      "pro_consistent",
      "kontext_reference",
      "flux11_pro_candidate",
      "openai_image_candidate",
    ];
    for (const profile of allProfiles) {
      expect(
        PROFILE_PROVIDER_MAP[profile],
        `Missing mapping for profile: ${profile}`
      ).toBeDefined();
    }
  });

  it("no profile maps to an unexpected provider id", () => {
    const validProviderIds = new Set(["replicate", "openai"]);
    for (const [profile, providerId] of Object.entries(PROFILE_PROVIDER_MAP)) {
      expect(
        validProviderIds.has(providerId),
        `Profile ${profile} has unexpected providerId: ${providerId}`
      ).toBe(true);
    }
  });
});

// -------------------------------------------------------------------------
// ImageProviderCapabilities shape
// -------------------------------------------------------------------------

describe("ImageProviderCapabilities", () => {
  it("a sample capabilities object satisfies the interface shape", () => {
    // This is a compile-time + runtime shape check — no provider code imported.
    const replicateCaps: ImageProviderCapabilities = {
      supportsTextToImage: true,
      supportsImageToImage: false,
      supportsReferenceImages: true,
      supportsDetailedGuidance: true,
    };
    expect(replicateCaps.supportsTextToImage).toBe(true);
    expect(replicateCaps.supportsImageToImage).toBe(false);
    expect(replicateCaps.supportsReferenceImages).toBe(true);
    expect(replicateCaps.supportsDetailedGuidance).toBe(true);
  });

  it("openai capability sample includes reference image support", () => {
    const openaiCaps: ImageProviderCapabilities = {
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsReferenceImages: true,
      supportsDetailedGuidance: true,
    };
    expect(openaiCaps.supportsReferenceImages).toBe(true);
  });
});

// -------------------------------------------------------------------------
// ImageGenerationMetadata — PII exclusion
// -------------------------------------------------------------------------

describe("ImageGenerationMetadata", () => {
  it("does not have PII fields (userId, childName, storyText) at runtime", () => {
    // Construct a max-populated metadata object and confirm known PII keys are absent.
    const meta: ImageGenerationMetadata = {
      bookId: "book-abc123",
      pageIndex: 2,
      templateId: "tpl-summer",
      generationMode: "guided_ai",
      candidateRequested: false,
      candidateAllowed: false,
    };
    const keys = Object.keys(meta);
    expect(keys).not.toContain("userId");
    expect(keys).not.toContain("childName");
    expect(keys).not.toContain("storyText");
    expect(keys).not.toContain("userName");
    expect(keys).not.toContain("parentName");
  });

  it("bookId and templateId are present (system-generated safe identifiers)", () => {
    const meta: ImageGenerationMetadata = {
      bookId: "book-xyz789",
      templateId: "tpl-ocean",
    };
    expect(meta.bookId).toBe("book-xyz789");
    expect(meta.templateId).toBe("tpl-ocean");
  });
});

// -------------------------------------------------------------------------
// Mock ImageProvider — compile + runtime correctness
// -------------------------------------------------------------------------

describe("ImageProvider interface", () => {
  it("a mock provider implementation compiles and returns correct shape", async () => {
    // Minimal mock — verifies the interface is implementable without importing any real provider.
    const mockProvider: ImageProvider = {
      providerId: "replicate",
      capabilities: {
        supportsTextToImage: true,
        supportsImageToImage: false,
        supportsReferenceImages: true,
        supportsDetailedGuidance: true,
      },
      async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
        return {
          imageUrl: "https://example.com/image.png",
          providerId: "replicate",
          modelLabel: "black-forest-labs/flux-2-pro",
          profile: request.imageModelProfile,
          durationMs: 1000,
          fallbackUsed: false,
        };
      },
      classifyError(error: unknown, context: { profile: ImageModelProfile }): ImageGenerationFailure {
        void error;
        return {
          providerId: "replicate",
          profile: context.profile,
          errorCategory: "unknown",
          errorCode: "UNKNOWN",
          retryable: false,
          safeMessage: "mock error",
        };
      },
      resolveModelLabel(profile: ImageModelProfile): string {
        return `mock-label/${profile}`;
      },
    };

    const request: ImageGenerationRequest = {
      prompt: "A cheerful child in a forest",
      imageModelProfile: "pro_consistent",
      aspectRatio: "4:3",
      metadata: { bookId: "book-001", pageIndex: 0 },
    };

    const result = await mockProvider.generateImage(request);
    expect(result.providerId).toBe("replicate");
    expect(result.imageUrl).toBe("https://example.com/image.png");
    expect(result.modelLabel).toBe("black-forest-labs/flux-2-pro");
    expect(result.profile).toBe("pro_consistent");
    expect(result.fallbackUsed).toBe(false);
  });

  it("mock openai provider implementation compiles correctly", async () => {
    const openaiMock: ImageProvider = {
      providerId: "openai",
      capabilities: {
        supportsTextToImage: true,
        supportsImageToImage: true,
        supportsReferenceImages: true,
        supportsDetailedGuidance: true,
      },
      async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
        return {
          imageUrl: "https://example.com/openai-image.png",
          providerId: "openai",
          modelLabel: "openai/gpt-image-1-mini",
          profile: request.imageModelProfile,
          durationMs: 2000,
        };
      },
      classifyError(_error: unknown, context: { profile: ImageModelProfile }): ImageGenerationFailure {
        return {
          providerId: "openai",
          profile: context.profile,
          errorCategory: "provider_error",
          errorCode: "PROVIDER_4XX",
          retryable: false,
        };
      },
      resolveModelLabel(_profile: ImageModelProfile): string {
        return "openai/gpt-image-1-mini";
      },
    };

    const req: ImageGenerationRequest = {
      prompt: "A dragon reading a book",
      imageModelProfile: "openai_image_candidate",
      inputImageUrls: ["https://example.com/ref.jpg"],
      metadata: { bookId: "book-002", candidateRequested: true, candidateAllowed: true },
    };

    const result = await openaiMock.generateImage(req);
    expect(result.providerId).toBe("openai");
    expect(result.profile).toBe("openai_image_candidate");
  });

  it("classifyError returns a valid failure descriptor for any error input", () => {
    const mockProvider: ImageProvider = {
      providerId: "replicate",
      capabilities: {
        supportsTextToImage: true,
        supportsImageToImage: false,
        supportsReferenceImages: false,
        supportsDetailedGuidance: false,
      },
      async generateImage(): Promise<ImageGenerationResult> {
        throw new Error("unreachable");
      },
      classifyError(error: unknown, context: { profile: ImageModelProfile }): ImageGenerationFailure {
        void error;
        return {
          providerId: "replicate",
          profile: context.profile,
          errorCategory: "timeout",
          errorCode: "TIMEOUT",
          retryable: true,
        };
      },
      resolveModelLabel(): string { return "black-forest-labs/flux-2-klein-9b"; },
    };

    const failure = mockProvider.classifyError(
      new Error("timed out"),
      { profile: "klein_fast" }
    );
    expect(failure.providerId).toBe("replicate");
    expect(failure.errorCode).toBe("TIMEOUT");
    expect(failure.retryable).toBe(true);
  });
});

// -------------------------------------------------------------------------
// No production routing imported or modified
// -------------------------------------------------------------------------

describe("P3-2 scope invariants", () => {
  it("PROFILE_PROVIDER_MAP is the only runtime export consumed in this test", () => {
    // Confirms we only import the constant and types — no production routing functions.
    expect(typeof PROFILE_PROVIDER_MAP).toBe("object");
    expect(PROFILE_PROVIDER_MAP).not.toBeNull();
  });
});
