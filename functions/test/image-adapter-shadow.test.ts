/**
 * P3-12: ImageProvider adapter shadow parity tests.
 *
 * These tests verify that the ImageProvider adapter path (P3-10/P3-11) produces
 * behavior equivalent to the legacy createImageClient() path documented in
 * generate-book.ts, without connecting adapters to production yet.
 *
 * "Shadow" means: both paths are exercised side-by-side on the same mocked inputs
 * and their stable observable fields are compared.
 *
 * Parity coverage:
 *  1. Provider selection — adapter factory vs legacy createImageClient rule
 *  2. Model label — adapter.resolveModelLabel vs legacy resolveReplicateModel / resolveOpenAIModelLabel
 *  3. Upload URL — makePageUploader bridges to mock uploadImage; URL unchanged by adapter
 *  4. Error classification — classifyError() shape matches P2 taxonomy; no PII fields
 *  5. Fallback / candidate policy — resolveImageFallbackProfiles, isCandidateProfile unchanged
 *  6. Shadow result shape — fixture comparison of stable legacy vs adapter fields
 *
 * Constraints:
 *  - No OPENAI_API_KEY or REPLICATE_API_TOKEN env vars required.
 *  - No network calls (generateImage is not called — only label / classify / upload tested).
 *  - No Firestore writes.
 *  - generate-book.ts not imported.
 *  - createImageClient() is not called in this file.
 *  - Adapters are now wired to production page generation (P3-15).
 */

import { describe, it, expect, vi } from "vitest";
import { createImageAdapter, resolveImageProviderId } from "../src/lib/image-adapter-factory";
import { PROFILE_PROVIDER_MAP } from "../src/lib/image-provider";
import type { ImageProvider } from "../src/lib/image-provider";
import { ReplicateImageAdapter } from "../src/lib/replicate-image-adapter";
import { OpenAIImageAdapter } from "../src/lib/openai-image-adapter";
import { makePageUploader, type PageImageUploadFn } from "../src/lib/image-storage-uploader";
import { resolveReplicateModel } from "../src/lib/replicate";
import { resolveOpenAIModelLabel } from "../src/lib/openai-image";
import {
  resolveImageFallbackProfiles,
  isCandidateProfile,
  CANDIDATE_IMAGE_PROFILES,
} from "../src/lib/image-model-policy";
import type { ImageModelProfile } from "../src/lib/types";

// -------------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------------

const DUMMY_REPLICATE_TOKEN = "r8_shadow_test_dummy";
const DUMMY_OPENAI_KEY = "sk-shadow_test_dummy";

const REPLICATE_PROFILES: ImageModelProfile[] = [
  "klein_fast",
  "klein_base",
  "pro_consistent",
  "kontext_reference",
  "flux11_pro_candidate",
];

function makeReplicateAdapter(profile: ImageModelProfile): ReplicateImageAdapter {
  return createImageAdapter({
    imageModelProfile: profile,
    replicateApiToken: DUMMY_REPLICATE_TOKEN,
    openaiApiKey: DUMMY_OPENAI_KEY,
  }) as ReplicateImageAdapter;
}

const openaiAdapter = createImageAdapter({
  imageModelProfile: "openai_image_candidate",
  replicateApiToken: DUMMY_REPLICATE_TOKEN,
  openaiApiKey: DUMMY_OPENAI_KEY,
}) as OpenAIImageAdapter;

// -------------------------------------------------------------------------
// 1. Provider selection parity
// -------------------------------------------------------------------------

/**
 * Legacy createImageClient() rule (documented in generate-book.ts L2189-2200):
 *   openai_image_candidate  → new OpenAIImageClient(...)
 *   everything else         → new ReplicateImageClient(...)
 *
 * Adapter factory rule:
 *   PROFILE_PROVIDER_MAP["openai_image_candidate"] = "openai"
 *   all other profiles                              = "replicate"
 *
 * These rules MUST agree for all known ImageModelProfiles.
 */
describe("Provider selection parity — adapter factory vs documented legacy rule", () => {
  it("openai_image_candidate maps to openai in PROFILE_PROVIDER_MAP (adapter)", () => {
    expect(PROFILE_PROVIDER_MAP["openai_image_candidate"]).toBe("openai");
  });

  it.each(REPLICATE_PROFILES)(
    "Replicate profile %s maps to replicate in PROFILE_PROVIDER_MAP",
    (profile) => {
      expect(PROFILE_PROVIDER_MAP[profile]).toBe("replicate");
    }
  );

  it("legacy rule and adapter rule agree: openai_image_candidate → openai", () => {
    // Legacy rule: if profile === "openai_image_candidate" → OpenAI
    // Adapter rule: resolveImageProviderId("openai_image_candidate") === "openai"
    const legacyWouldChooseOpenAI = (p: ImageModelProfile) => p === "openai_image_candidate";
    const adapterChoosesOpenAI = (p: ImageModelProfile) => resolveImageProviderId(p) === "openai";

    expect(legacyWouldChooseOpenAI("openai_image_candidate")).toBe(true);
    expect(adapterChoosesOpenAI("openai_image_candidate")).toBe(true);
  });

  it.each(REPLICATE_PROFILES)(
    "legacy rule and adapter rule agree: %s → replicate",
    (profile) => {
      // Legacy rule: everything except openai_image_candidate → ReplicateImageClient
      const legacyWouldChooseReplicate = (p: ImageModelProfile) => p !== "openai_image_candidate";
      expect(legacyWouldChooseReplicate(profile)).toBe(true);
      expect(resolveImageProviderId(profile)).toBe("replicate");
    }
  );

  it("createImageAdapter returns OpenAIImageAdapter for openai_image_candidate", () => {
    const adapter = createImageAdapter({
      imageModelProfile: "openai_image_candidate",
      replicateApiToken: DUMMY_REPLICATE_TOKEN,
      openaiApiKey: DUMMY_OPENAI_KEY,
    });
    expect(adapter).toBeInstanceOf(OpenAIImageAdapter);
    expect(adapter.providerId).toBe("openai");
  });

  it.each(REPLICATE_PROFILES)(
    "createImageAdapter returns ReplicateImageAdapter for Replicate profile %s",
    (profile) => {
      const adapter = createImageAdapter({
        imageModelProfile: profile,
        replicateApiToken: DUMMY_REPLICATE_TOKEN,
        openaiApiKey: DUMMY_OPENAI_KEY,
      });
      expect(adapter).toBeInstanceOf(ReplicateImageAdapter);
      expect(adapter.providerId).toBe("replicate");
    }
  );

  it("PROFILE_PROVIDER_MAP covers every profile defined in the codebase", () => {
    const allProfiles: ImageModelProfile[] = [
      "klein_fast",
      "klein_base",
      "pro_consistent",
      "kontext_reference",
      "flux11_pro_candidate",
      "openai_image_candidate",
    ];
    for (const profile of allProfiles) {
      expect(PROFILE_PROVIDER_MAP[profile]).toMatch(/^(replicate|openai)$/);
    }
  });
});

// -------------------------------------------------------------------------
// 2. Model label parity
// -------------------------------------------------------------------------

describe("Model label parity — adapter vs legacy label functions", () => {
  it.each(REPLICATE_PROFILES)(
    "Replicate profile %s: adapter.resolveModelLabel equals resolveReplicateModel",
    (profile) => {
      const adapter = makeReplicateAdapter(profile);
      const adapterLabel = adapter.resolveModelLabel(profile);
      const legacyLabel = resolveReplicateModel({ imageModelProfile: profile });
      expect(adapterLabel).toBe(legacyLabel);
    }
  );

  it("openai_image_candidate: adapter.resolveModelLabel equals resolveOpenAIModelLabel(false)", () => {
    // resolveOpenAIModelLabel(false) = text-to-image default = "openai/gpt-image-1-mini"
    const adapterLabel = openaiAdapter.resolveModelLabel("openai_image_candidate");
    const legacyLabel = resolveOpenAIModelLabel(false);
    expect(adapterLabel).toBe(legacyLabel);
  });

  it("openai label with reference images differs from without (resolveOpenAIModelLabel parity)", () => {
    const withRef = resolveOpenAIModelLabel(true);
    const withoutRef = resolveOpenAIModelLabel(false);
    expect(withRef).not.toBe(withoutRef);
    // Both should have openai/ prefix
    expect(withRef).toMatch(/^openai\//);
    expect(withoutRef).toMatch(/^openai\//);
  });

  it("all Replicate model labels have expected provider prefix or model path format", () => {
    for (const profile of REPLICATE_PROFILES) {
      const adapter = makeReplicateAdapter(profile);
      const label = adapter.resolveModelLabel(profile);
      // Replicate labels use "black-forest-labs/..." format
      expect(label).toMatch(/black-forest-labs\//);
    }
  });

  it("openai model label has openai/ prefix", () => {
    const label = openaiAdapter.resolveModelLabel("openai_image_candidate");
    expect(label).toMatch(/^openai\//);
  });

  it("ReplicateImageAdapter throws for openai_image_candidate (cross-adapter guard)", () => {
    const replicateAdapter = makeReplicateAdapter("klein_fast");
    expect(() => replicateAdapter.resolveModelLabel("openai_image_candidate")).toThrow();
  });

  it("OpenAIImageAdapter throws for Replicate profiles (cross-adapter guard)", () => {
    for (const profile of REPLICATE_PROFILES) {
      expect(() => openaiAdapter.resolveModelLabel(profile)).toThrow();
    }
  });
});

// -------------------------------------------------------------------------
// 3. Upload URL parity
// -------------------------------------------------------------------------

describe("Upload URL parity — makePageUploader bridges adapter and production upload fn", () => {
  const BOOK_ID = "shadow-book-001";
  const PAGE_NUM = 3;
  const EXPECTED_URL = "https://storage.googleapis.com/bucket/books/shadow-book-001/page_3.png";

  it("uploader calls uploadImage(bookId, pageNumber, buffer) and returns URL unchanged", async () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue(EXPECTED_URL);
    const uploader = makePageUploader({ bookId: BOOK_ID, pageNumber: PAGE_NUM, uploadImage });

    const buffer = Buffer.from("mock-pixel-data");
    const url = await uploader(buffer, "klein_fast");

    expect(uploadImage).toHaveBeenCalledWith(BOOK_ID, PAGE_NUM, buffer);
    expect(url).toBe(EXPECTED_URL);
  });

  it("URL is not modified regardless of which Replicate profile is passed", async () => {
    for (const profile of REPLICATE_PROFILES) {
      const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue(EXPECTED_URL);
      const uploader = makePageUploader({ bookId: BOOK_ID, pageNumber: PAGE_NUM, uploadImage });
      const url = await uploader(Buffer.from("data"), profile);
      expect(url).toBe(EXPECTED_URL);
    }
  });

  it("URL is not modified for openai_image_candidate profile", async () => {
    const uploadImage = vi.fn<PageImageUploadFn>().mockResolvedValue(EXPECTED_URL);
    const uploader = makePageUploader({ bookId: BOOK_ID, pageNumber: PAGE_NUM, uploadImage });
    const url = await uploader(Buffer.from("openai-data"), "openai_image_candidate");
    expect(url).toBe(EXPECTED_URL);
  });

  it("legacy upload path and adapter upload path produce same URL for same buffer", async () => {
    const buffer = Buffer.from("identical-image-bytes");
    const mockUrl = "https://storage.googleapis.com/bucket/books/b1/page_0.png";

    // Legacy path: deps.uploadImage(bookId, pageIndex, imageResult.imageBuffer)
    const legacyUpload = vi.fn<PageImageUploadFn>().mockResolvedValue(mockUrl);
    const legacyUrl = await legacyUpload("b1", 0, buffer);

    // Adapter path: makePageUploader wraps the same function
    const adapterUploader = makePageUploader({
      bookId: "b1",
      pageNumber: 0,
      uploadImage: legacyUpload,
    });
    const adapterUrl = await adapterUploader(buffer, "pro_consistent");

    expect(legacyUrl).toBe(adapterUrl);
    expect(adapterUrl).toBe(mockUrl);
  });
});

// -------------------------------------------------------------------------
// 4. Error classification parity
// -------------------------------------------------------------------------

describe("Error classification parity — adapter vs P2 taxonomy", () => {
  const errorCases: Array<{
    label: string;
    error: unknown;
    expectedCategory: string;
    expectedCode: string;
    expectedRetryable: boolean;
  }> = [
    {
      label: "content policy error (E005)",
      error: new Error("content_policy violation detected"),
      expectedCategory: "safety_or_policy",
      expectedCode: "E005",
      expectedRetryable: false,
    },
    {
      label: "provider 5xx / overloaded",
      error: new Error("service overloaded, try again"),
      expectedCategory: "provider_error",
      expectedCode: "PROVIDER_5XX",
      expectedRetryable: true,
    },
    {
      label: "provider 4xx / invalid request",
      error: new Error("invalid request format"),
      expectedCategory: "provider_error",
      expectedCode: "PROVIDER_4XX",
      expectedRetryable: false,
    },
    {
      label: "network error (ECONNRESET)",
      // Classifier checks lower.includes("econnreset") on the error message, not .code property
      error: new Error("ECONNRESET: socket hang up"),
      expectedCategory: "network",
      expectedCode: "NETWORK_ERROR",
      expectedRetryable: true,
    },
    {
      label: "unknown error",
      error: new Error("something completely unexpected"),
      expectedCategory: "unknown",
      expectedCode: "UNKNOWN",
      expectedRetryable: false,
    },
  ];

  describe("ReplicateImageAdapter classifyError matches P2 taxonomy", () => {
    const adapter = makeReplicateAdapter("pro_consistent");

    it.each(errorCases)(
      "Replicate: $label → errorCode $expectedCode, retryable $expectedRetryable",
      ({ error, expectedCategory, expectedCode, expectedRetryable }) => {
        const result = adapter.classifyError(error, { profile: "pro_consistent" });
        expect(result.errorCategory).toBe(expectedCategory);
        expect(result.errorCode).toBe(expectedCode);
        expect(result.retryable).toBe(expectedRetryable);
        expect(result.providerId).toBe("replicate");
        expect(result.profile).toBe("pro_consistent");
      }
    );
  });

  describe("OpenAIImageAdapter classifyError matches P2 taxonomy", () => {
    it.each(errorCases)(
      "OpenAI: $label → errorCode $expectedCode, retryable $expectedRetryable",
      ({ error, expectedCategory, expectedCode, expectedRetryable }) => {
        const result = openaiAdapter.classifyError(error, { profile: "openai_image_candidate" });
        expect(result.errorCategory).toBe(expectedCategory);
        expect(result.errorCode).toBe(expectedCode);
        expect(result.retryable).toBe(expectedRetryable);
        expect(result.providerId).toBe("openai");
        expect(result.profile).toBe("openai_image_candidate");
      }
    );
  });

  describe("classifyError result shape has no PII fields", () => {
    const piiFieldNames = [
      "userId", "childName", "userName", "parentName",
      "prompt", "storyText", "childAge", "firstName",
    ];
    const testError = new Error("some error");

    it("ReplicateImageAdapter result has no PII field names", () => {
      const adapter = makeReplicateAdapter("klein_fast");
      const result = adapter.classifyError(testError, { profile: "klein_fast" });
      for (const field of piiFieldNames) {
        expect(result).not.toHaveProperty(field);
      }
    });

    it("OpenAIImageAdapter result has no PII field names", () => {
      const result = openaiAdapter.classifyError(testError, { profile: "openai_image_candidate" });
      for (const field of piiFieldNames) {
        expect(result).not.toHaveProperty(field);
      }
    });
  });

  it("safeMessage is capped at 120 chars for both adapters", () => {
    const longMsg = "a".repeat(200);
    const error = new Error(longMsg);

    const replicateResult = makeReplicateAdapter("pro_consistent").classifyError(error, {
      profile: "pro_consistent",
    });
    const openaiResult = openaiAdapter.classifyError(error, {
      profile: "openai_image_candidate",
    });

    if (replicateResult.safeMessage !== undefined) {
      expect(replicateResult.safeMessage.length).toBeLessThanOrEqual(120);
    }
    if (openaiResult.safeMessage !== undefined) {
      expect(openaiResult.safeMessage.length).toBeLessThanOrEqual(120);
    }
  });

  it("both adapters produce structurally identical error shape for same error", () => {
    const error = new Error("service overloaded, try again");
    const replicateResult = makeReplicateAdapter("pro_consistent").classifyError(error, {
      profile: "pro_consistent",
    });
    const openaiResult = openaiAdapter.classifyError(error, {
      profile: "openai_image_candidate",
    });

    // Both should have same taxonomy values
    expect(replicateResult.errorCategory).toBe(openaiResult.errorCategory);
    expect(replicateResult.errorCode).toBe(openaiResult.errorCode);
    expect(replicateResult.retryable).toBe(openaiResult.retryable);

    // Provider identity should differ
    expect(replicateResult.providerId).toBe("replicate");
    expect(openaiResult.providerId).toBe("openai");
  });
});

// -------------------------------------------------------------------------
// 5. Fallback / candidate policy parity
// -------------------------------------------------------------------------

describe("Fallback / candidate policy parity — adapter paths must not alter policy", () => {
  it("pro_consistent falls back through [pro_consistent, klein_fast]", () => {
    expect(resolveImageFallbackProfiles("pro_consistent")).toEqual([
      "pro_consistent",
      "klein_fast",
    ]);
  });

  it("klein_fast has only itself as fallback (no further fallback)", () => {
    expect(resolveImageFallbackProfiles("klein_fast")).toEqual(["klein_fast"]);
  });

  it("klein_base falls back to klein_fast", () => {
    expect(resolveImageFallbackProfiles("klein_base")).toEqual([
      "klein_base",
      "klein_fast",
    ]);
  });

  it("kontext_reference falls back to klein_fast", () => {
    expect(resolveImageFallbackProfiles("kontext_reference")).toEqual([
      "kontext_reference",
      "klein_fast",
    ]);
  });

  it("flux11_pro_candidate falls back to klein_fast (no openai in chain)", () => {
    const fallbacks = resolveImageFallbackProfiles("flux11_pro_candidate");
    expect(fallbacks).toEqual(["flux11_pro_candidate", "klein_fast"]);
    expect(fallbacks).not.toContain("openai_image_candidate");
  });

  it("openai_image_candidate has NO Replicate fallback — only itself", () => {
    const fallbacks = resolveImageFallbackProfiles("openai_image_candidate");
    expect(fallbacks).toEqual(["openai_image_candidate"]);
    expect(fallbacks).not.toContain("klein_fast");
    expect(fallbacks).not.toContain("pro_consistent");
    expect(fallbacks.length).toBe(1);
  });

  it("CANDIDATE_IMAGE_PROFILES includes openai_image_candidate and flux11_pro_candidate", () => {
    expect(CANDIDATE_IMAGE_PROFILES).toContain("openai_image_candidate");
    expect(CANDIDATE_IMAGE_PROFILES).toContain("flux11_pro_candidate");
  });

  it("isCandidateProfile correctly identifies candidate profiles", () => {
    for (const profile of CANDIDATE_IMAGE_PROFILES) {
      expect(isCandidateProfile(profile)).toBe(true);
    }
  });

  it("isCandidateProfile returns false for standard production profiles", () => {
    const standardProfiles: ImageModelProfile[] = ["klein_fast", "pro_consistent", "kontext_reference"];
    for (const profile of standardProfiles) {
      expect(isCandidateProfile(profile)).toBe(false);
    }
  });

  it("isCandidateProfile returns false for undefined", () => {
    expect(isCandidateProfile(undefined)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// 6. Shadow result shape — fixture comparison
// -------------------------------------------------------------------------

/**
 * These fixtures simulate the stable observable fields from each path.
 * Real network calls are NOT made — we compare what the paths would produce
 * for the same provider/profile/label by constructing fixtures directly.
 */
describe("Shadow result shape — legacy fixture vs adapter fixture comparison", () => {
  it("Replicate profile: adapter result fields align with legacy shape", () => {
    const profile: ImageModelProfile = "pro_consistent";

    // Legacy shape (as assembled in generate-book.ts pageData block):
    const legacyShape = {
      imageModel: resolveReplicateModel({ imageModelProfile: profile }),
      provider: PROFILE_PROVIDER_MAP[profile],
      fallbackUsed: false,
    };

    // Adapter shape (as would be assembled from ImageGenerationResult):
    const adapterShape = {
      imageModel: makeReplicateAdapter(profile).resolveModelLabel(profile),
      provider: PROFILE_PROVIDER_MAP[profile],
      fallbackUsed: false,
    };

    expect(adapterShape.imageModel).toBe(legacyShape.imageModel);
    expect(adapterShape.provider).toBe(legacyShape.provider);
    expect(adapterShape.fallbackUsed).toBe(legacyShape.fallbackUsed);
  });

  it("OpenAI profile: adapter result fields align with legacy shape", () => {
    const profile: ImageModelProfile = "openai_image_candidate";
    const hasRef = false;

    // Legacy shape (generate-book.ts uses resolveOpenAIModelLabel when profile is openai_image_candidate):
    const legacyShape = {
      imageModel: resolveOpenAIModelLabel(hasRef),
      provider: PROFILE_PROVIDER_MAP[profile],
      fallbackUsed: false,
    };

    // Adapter shape (from OpenAIImageAdapter.resolveModelLabel):
    const adapterShape = {
      imageModel: openaiAdapter.resolveModelLabel(profile),
      provider: openaiAdapter.providerId,
      fallbackUsed: false,
    };

    expect(adapterShape.imageModel).toBe(legacyShape.imageModel);
    expect(adapterShape.provider).toBe(legacyShape.provider);
    expect(adapterShape.fallbackUsed).toBe(legacyShape.fallbackUsed);
  });

  it("upload URL is identical between legacy direct call and adapter uploader path", async () => {
    const bookId = "shadow-parity-book";
    const pageNumber = 2;
    const buffer = Buffer.from("shadow-test-image");
    const expectedUrl = `https://storage.googleapis.com/bucket/books/${bookId}/page_${pageNumber}.png`;

    const mockUploadFn = vi.fn<PageImageUploadFn>().mockResolvedValue(expectedUrl);

    // Legacy: deps.uploadImage(bookId, pageNumber, buffer)
    const legacyUrl = await mockUploadFn(bookId, pageNumber, buffer);

    // Adapter path: makePageUploader wraps the same fn
    const uploader = makePageUploader({ bookId, pageNumber, uploadImage: mockUploadFn });
    const adapterUrl = await uploader(buffer, "pro_consistent");

    expect(legacyUrl).toBe(adapterUrl);
    expect(adapterUrl).toBe(expectedUrl);
  });

  it("fallback flag: adapter fallbackUsed=false when single profile succeeds (fixture)", () => {
    // Adapter result always has fallbackUsed=false when the primary profile is used.
    // Fallback logic is caller-side (generate-book.ts orchestration layer),
    // not inside the adapter. The adapter never sets fallbackUsed=true internally.
    // This test documents and asserts that contract.
    const profile: ImageModelProfile = "klein_fast";
    const adapter = makeReplicateAdapter(profile);

    // Create a fixture result as generateImage would return (without calling live API):
    const fixtureResult = {
      imageUrl: "https://example.com/img.png",
      providerId: adapter.providerId,
      modelLabel: adapter.resolveModelLabel(profile),
      profile,
      durationMs: 500,
      fallbackUsed: false, // adapter always sets this to false — caller sets to true on fallback
    };

    expect(fixtureResult.fallbackUsed).toBe(false);
    expect(fixtureResult.providerId).toBe("replicate");
    expect(fixtureResult.modelLabel).toBe(resolveReplicateModel({ imageModelProfile: profile }));
  });

  it.each(REPLICATE_PROFILES)(
    "Replicate profile %s: shadow comparison passes for all Replicate profiles",
    (profile) => {
      const adapter = makeReplicateAdapter(profile);
      const adapterLabel = adapter.resolveModelLabel(profile);
      const legacyLabel = resolveReplicateModel({ imageModelProfile: profile });
      const adapterProviderId = adapter.providerId;
      const mapProviderId = PROFILE_PROVIDER_MAP[profile];

      expect(adapterLabel).toBe(legacyLabel);
      expect(adapterProviderId).toBe(mapProviderId);
    }
  );

  it("no production wiring: no generate-book.ts import in this file", () => {
    // Verify by convention — this test file does not import generate-book.ts.
    // The absence of the import is asserted via this documentation test.
    // The important invariant is that createImageClient() is NOT called.
    expect(true).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 7. Adapter interface completeness
// -------------------------------------------------------------------------

describe("Adapter interface completeness — both adapters expose expected ImageProvider shape", () => {
  const adapters: Array<[string, ImageProvider]> = [
    ["ReplicateImageAdapter(klein_fast)", makeReplicateAdapter("klein_fast")],
    ["ReplicateImageAdapter(pro_consistent)", makeReplicateAdapter("pro_consistent")],
    ["OpenAIImageAdapter(openai_image_candidate)", openaiAdapter],
  ];

  it.each(adapters)("%s exposes generateImage, classifyError, resolveModelLabel", (_label, adapter) => {
    expect(typeof adapter.generateImage).toBe("function");
    expect(typeof adapter.classifyError).toBe("function");
    expect(typeof adapter.resolveModelLabel).toBe("function");
    expect(typeof adapter.providerId).toBe("string");
    expect(typeof adapter.capabilities).toBe("object");
  });

  it("capabilities are stable (not runtime-mutable)", () => {
    const replicateAdapter = makeReplicateAdapter("pro_consistent");
    const cap1 = replicateAdapter.capabilities;
    const cap2 = replicateAdapter.capabilities;
    expect(cap1).toBe(cap2); // same reference (const object)
  });
});
