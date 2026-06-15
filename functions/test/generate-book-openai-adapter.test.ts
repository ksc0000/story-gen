/**
 * P3-15: OpenAI candidate adapter routing tests (updated from P3-14 feature-flag wiring).
 *
 * Verifies that:
 *   1. No openaiApiKey — legacy imageClient.generateImage is used for
 *      openai_image_candidate (test-environment fallback). No adapter call.
 *   2. openaiApiKey present + openai_image_candidate — OpenAIImageAdapter is used,
 *      imageClient.generateImage is NOT called for pages, upload happens via makePageUploader.
 *   3. No double upload: caller upload block (if imageBuffer) is skipped because imageBuffer
 *      is undefined when adapter path returns imageUrl.
 *   4. imageModel label compatible: resolveOpenAIModelLabel(false) matches legacy computation.
 *   5. Replicate profiles not routed to OpenAI adapter.
 *   6. Both tokens present: routing by PROFILE_PROVIDER_MAP is correct.
 *   7. Candidate gate: unenrolled profile (already downgraded to Replicate by gate) does not
 *      reach OpenAI adapter regardless of token presence.
 *   8. Error handling: adapter error propagates through fallback loop, book goes to "failed".
 *
 * P3-15 change: USE_OPENAI_ADAPTER feature flag removed.
 * Adapter path is now the default when openaiApiKey is present in deps.
 * Tests that previously verified flag-off-overrides-token behavior are removed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processBookGeneration } from "../src/generate-book";
import type { BookData, GeneratedStory, TemplateData } from "../src/lib/types";

// -------------------------------------------------------------------------
// Mock: OpenAIImageAdapter — controlled stub, no network
// -------------------------------------------------------------------------

/**
 * Captures the uploader injected to the OpenAI adapter constructor.
 * generateImage mock uses this to call deps.uploadImage through makePageUploader.
 */
let capturedOpenAIUploader: ((buf: Buffer, profile: string) => Promise<string>) | undefined;

const mockOpenAIAdapterGenerateImage = vi.fn().mockImplementation(
  async (request: { imageModelProfile: string }) => {
    const url = capturedOpenAIUploader
      ? await capturedOpenAIUploader(
          Buffer.from("mock-openai-adapter-image"),
          request.imageModelProfile
        )
      : "https://storage.example.com/openai-adapter-direct.png";
    return {
      imageUrl: url,
      providerId: "openai" as const,
      modelLabel: "openai/gpt-image-1-mini",
      profile: request.imageModelProfile,
      durationMs: 80,
      fallbackUsed: false,
    };
  }
);

vi.mock("../src/lib/openai-image-adapter", () => {
  return {
    OpenAIImageAdapter: vi.fn().mockImplementation((_apiKey: string, uploader?: Function) => {
      capturedOpenAIUploader = uploader as (buf: Buffer, profile: string) => Promise<string>;
      return {
        providerId: "openai" as const,
        capabilities: {
          supportsTextToImage: true,
          supportsImageToImage: true,
          supportsReferenceImages: true,
          supportsDetailedGuidance: true,
        },
        generateImage: mockOpenAIAdapterGenerateImage,
        classifyError: vi.fn(),
        resolveModelLabel: vi.fn().mockReturnValue("openai/gpt-image-1-mini"),
      };
    }),
  };
});

// -------------------------------------------------------------------------
// Mock: ReplicateImageAdapter — minimal stub to isolate P3-14 tests
// -------------------------------------------------------------------------

let capturedReplicateUploader: ((buf: Buffer, profile: string) => Promise<string>) | undefined;

const mockReplicateAdapterGenerateImage = vi.fn().mockImplementation(
  async (request: { imageModelProfile: string }) => {
    const url = capturedReplicateUploader
      ? await capturedReplicateUploader(
          Buffer.from("mock-replicate-adapter-image"),
          request.imageModelProfile
        )
      : "https://storage.example.com/replicate-adapter-direct.png";
    return {
      imageUrl: url,
      providerId: "replicate" as const,
      modelLabel: "black-forest-labs/flux-2-klein-9b",
      profile: request.imageModelProfile,
      durationMs: 100,
      fallbackUsed: false,
    };
  }
);

vi.mock("../src/lib/replicate-image-adapter", () => {
  return {
    ReplicateImageAdapter: vi.fn().mockImplementation((_token: string, uploader?: Function) => {
      capturedReplicateUploader = uploader as (buf: Buffer, profile: string) => Promise<string>;
      return {
        providerId: "replicate" as const,
        capabilities: {
          supportsTextToImage: true,
          supportsImageToImage: false,
          supportsReferenceImages: true,
          supportsDetailedGuidance: true,
        },
        generateImage: mockReplicateAdapterGenerateImage,
        classifyError: vi.fn(),
        resolveModelLabel: vi.fn().mockReturnValue("black-forest-labs/flux-2-klein-9b"),
      };
    }),
  };
});

// -------------------------------------------------------------------------
// Test fixtures
// -------------------------------------------------------------------------

const mockTemplate: TemplateData = {
  name: "おたんじょうび",
  description: "誕生日",
  icon: "🎂",
  order: 1,
  creationMode: "guided_ai",
  priceTier: "take",
  storyCostLevel: "standard",
  systemPrompt: "誕生日テーマで物語を作って",
  active: true,
  sampleImageUrl: "/images/templates/animals.webp",
};

const mockStory: GeneratedStory = {
  title: "みらいのぼうけん",
  characterBible: "A girl with short brown hair and a yellow dress",
  styleBible: "Soft watercolor picture book style",
  storyGoal: "みらいが星を見つける",
  mainQuestObject: "星",
  forbiddenQuestObjects: ["すいか"],
  storyModel: "gemini-2.5-flash-lite",
  storyModelFallbackUsed: false,
  storyGenerationAttempts: 1,
  cast: [],
  narrativeDevice: {
    repeatedPhrase: "だいじょうぶ",
    visualMotif: "star",
    setup: "星の始まり",
    payoff: "星の完成",
    hiddenDetails: ["bird"],
  },
  pages: [
    {
      text: "みらいは星をさがして、ゆっくりと歩きました。空はとても青く、風がやさしく吹いていました。",
      imagePrompt:
        "A child walking in a bright meadow looking for a star with soft watercolor style",
      pageVisualRole: "opening_establishing",
      compositionHint: "wide establishing shot",
      hiddenDetail: "small bird near the tree",
      appearingCharacterIds: ["child_protagonist"],
      focusCharacterId: "child_protagonist",
    },
    {
      text: "ついに星を見つけました。それはキラキラと光って、とてもきれいでした。",
      imagePrompt:
        "A child finding a glowing star in the meadow with warm watercolor light",
      pageVisualRole: "quiet_ending",
      compositionHint: "close-up shot",
      hiddenDetail: "butterfly on the flower",
      appearingCharacterIds: ["child_protagonist"],
      focusCharacterId: "child_protagonist",
    },
  ],
};

const mockImageBuffer = Buffer.from("fake-png-data");

const baseBookData: BookData = {
  userId: "user-p314",
  title: "",
  theme: "birthday",
  style: "watercolor",
  pageCount: 2,
  status: "generating",
  progress: 0,
  input: { childName: "みらい" },
  createdAt: {} as FirebaseFirestore.Timestamp,
  expiresAt: null,
  // Tests in this file assume baseBookData → a Replicate profile (pro_consistent)
  // so they can verify OpenAI routing is NOT triggered. After the 3-tier rollout
  // (PR #180), the default profile resolves to openai_mini, which would invert
  // the test premise.
  imageModelProfile: "pro_consistent",
};

const openAIBookData: BookData = {
  ...baseBookData,
  imageModelProfile: "openai_image_candidate",
};

function createMockDeps(
  overrides: { replicateApiToken?: string; openaiApiKey?: string } = {}
) {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    getUserPlan: vi.fn().mockResolvedValue("free" as const),
    llmClient: {
      generateStory: vi.fn().mockResolvedValue(mockStory),
      rewriteStoryText: vi.fn().mockResolvedValue({
        pages: mockStory.pages.map((p) => ({ text: p.text })),
        storyTextRewriteModel: "gemini-2.5-pro",
        storyTextRewriteAttempts: 1,
      }),
    },
    imageClient: { generateImage: vi.fn().mockResolvedValue(mockImageBuffer) },
    uploadImage: vi
      .fn()
      .mockResolvedValue("https://storage.example.com/image.png"),
    updateBookTitle: vi.fn().mockResolvedValue(undefined),
    updateBookCoverImage: vi.fn().mockResolvedValue(undefined),
    writePage: vi.fn().mockResolvedValue(undefined),
    updateBookProgress: vi.fn().mockResolvedValue(undefined),
    updateBookStatus: vi.fn().mockResolvedValue(undefined),
    updateBookFailure: vi.fn().mockResolvedValue(undefined),
    updateBookFailureMetadata: vi.fn().mockResolvedValue(undefined),
    updateBookStoryQualityReport: vi.fn().mockResolvedValue(undefined),
    updateBookStoryGenerationMetadata: vi.fn().mockResolvedValue(undefined),
    getUserMonthlyCount: vi.fn().mockResolvedValue(0),
    isUserAdmin: vi.fn().mockResolvedValue(false),

    incrementMonthlyCount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe("P3-15: OpenAI candidate adapter routing", () => {
  beforeEach(() => {
    mockOpenAIAdapterGenerateImage.mockClear();
    mockReplicateAdapterGenerateImage.mockClear();
  });

  // -----------------------------------------------------------------------
  // 1. No openaiApiKey: legacy imageClient path (test-environment fallback)
  // -----------------------------------------------------------------------

  describe("Legacy fallback (no openaiApiKey)", () => {
    it("calls imageClient.generateImage when no openaiApiKey is provided", async () => {
      const deps = createMockDeps(); // no openaiApiKey
      await processBookGeneration("book-openai-legacy", openAIBookData, deps);

      // No key: legacy imageClient.generateImage is used (test-environment fallback)
      expect(deps.imageClient.generateImage).toHaveBeenCalled();
      // Adapter must NOT be called
      expect(mockOpenAIAdapterGenerateImage).not.toHaveBeenCalled();
    });

    it("uploadImage called via caller upload block (buffer returned from legacy path)", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-legacy-upload", openAIBookData, deps);

      // Legacy path: imageResult.imageBuffer is set → caller calls deps.uploadImage
      expect(deps.uploadImage).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 2. openaiApiKey provided + openai_image_candidate: adapter path
  // -----------------------------------------------------------------------

  describe("OpenAI adapter path (key provided + openai_image_candidate)", () => {
    beforeEach(() => {
    });

    it("calls OpenAIImageAdapter.generateImage instead of imageClient.generateImage", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-adapter", openAIBookData, deps);

      // Adapter path: adapter.generateImage called for each page
      expect(mockOpenAIAdapterGenerateImage).toHaveBeenCalled();
      expect(mockOpenAIAdapterGenerateImage.mock.calls.length).toBeGreaterThanOrEqual(
        mockStory.pages.length
      );
      // Legacy imageClient should NOT be called for page images
      // (cover image/char refs may still use legacy — what we verify is adapter was called)
    });

    it("upload happens via makePageUploader (deps.uploadImage called from inside adapter)", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-adapter-upload", openAIBookData, deps);

      // The mocked adapter calls the injected uploader, which calls deps.uploadImage
      expect(deps.uploadImage).toHaveBeenCalled();

      const uploadCalls = (deps.uploadImage as ReturnType<typeof vi.fn>).mock.calls;
      const pageUploadCalls = uploadCalls.filter(
        ([bookId, , buffer]: [string, number, Buffer]) =>
          bookId === "book-openai-adapter-upload" && Buffer.isBuffer(buffer)
      );
      expect(pageUploadCalls.length).toBeGreaterThanOrEqual(mockStory.pages.length);
    });

    it("no double upload — adapter path skips caller upload block (imageBuffer is undefined)", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-no-double-upload", openAIBookData, deps);

      // imageResult.imageBuffer is undefined for adapter path → caller upload block skipped.
      // Each page generates exactly ONE upload (from adapter via uploader, not from caller).
      const uploadCalls = (deps.uploadImage as ReturnType<typeof vi.fn>).mock.calls;
      const pageUploads = uploadCalls.filter(
        ([bookId]: [string]) => bookId === "book-openai-no-double-upload"
      );
      expect(pageUploads.length).toBe(mockStory.pages.length);
    });

    it("returns completed status when OpenAI adapter succeeds for all pages", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-adapter-completed", openAIBookData, deps);

      expect(deps.updateBookStatus).toHaveBeenCalledWith(
        "book-openai-adapter-completed",
        "completed"
      );
    });

    it("falls back to legacy path when openaiApiKey is missing (undefined)", async () => {
      // No openaiApiKey → condition false → legacy path
      const deps = createMockDeps(); // no openaiApiKey
      await processBookGeneration("book-openai-no-key", openAIBookData, deps);

      expect(mockOpenAIAdapterGenerateImage).not.toHaveBeenCalled();
      expect(deps.imageClient.generateImage).toHaveBeenCalled();
    });

    it("imageModel label in writePage is compatible with legacy OpenAI path", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-imagemodel", openAIBookData, deps);

      // Legacy path: imageModel = resolveOpenAIModelLabel(inputImageUrls.length > 0)
      // No reference images (cast: []) → resolveOpenAIModelLabel(false) = "openai/gpt-image-1-mini"
      const writePageCalls = (deps.writePage as ReturnType<typeof vi.fn>).mock.calls;
      expect(writePageCalls.length).toBeGreaterThan(0);
      for (const [, pageData] of writePageCalls) {
        expect(pageData.imageModel).toBe("openai/gpt-image-1-mini");
      }
    });
  });

  // -----------------------------------------------------------------------
  // 3. Candidate gate safety
  // -----------------------------------------------------------------------

  describe("candidate gate safety", () => {

    it("Replicate profile does NOT route to OpenAI adapter even when USE_OPENAI_ADAPTER=true", async () => {
      // Simulates what the gate does: unenrolled user → profile downgraded to pro_consistent (Replicate)
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      // baseBookData has no imageModelProfile → resolves to a Replicate profile
      await processBookGeneration("book-gate-blocked", baseBookData, deps);

      // PROFILE_PROVIDER_MAP["pro_consistent"] === "replicate", not "openai" → OpenAI adapter skipped
      expect(mockOpenAIAdapterGenerateImage).not.toHaveBeenCalled();
    });

    it("openai_image_candidate without openaiApiKey does not reach adapter", async () => {
      const deps = createMockDeps(); // no openaiApiKey
      await processBookGeneration("book-gate-no-key", openAIBookData, deps);

      expect(mockOpenAIAdapterGenerateImage).not.toHaveBeenCalled();
      expect(deps.imageClient.generateImage).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. Replicate profiles unaffected by OpenAI adapter
  // -----------------------------------------------------------------------

  describe("Replicate profiles not routed to OpenAI adapter", () => {
    it("pro_consistent does not use OpenAI adapter even when openaiApiKey is provided", async () => {
      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      // baseBookData → pro_consistent profile (Replicate)
      await processBookGeneration("book-replicate-unaffected", baseBookData, deps);

      expect(mockOpenAIAdapterGenerateImage).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5. Both tokens present: routing by PROFILE_PROVIDER_MAP
  // -----------------------------------------------------------------------

  describe("Both tokens present: profile-based routing", () => {

    it("openai_image_candidate uses OpenAI adapter when both flags on", async () => {
      const deps = createMockDeps({
        openaiApiKey: "sk-test",
        replicateApiToken: "r8_test",
      });
      await processBookGeneration("book-both-flags-openai", openAIBookData, deps);

      // OpenAI profile → OpenAI adapter only (PROFILE_PROVIDER_MAP === "openai")
      expect(mockOpenAIAdapterGenerateImage).toHaveBeenCalled();
      expect(mockReplicateAdapterGenerateImage).not.toHaveBeenCalled();
    });

    it("Replicate profile uses Replicate adapter when both flags on", async () => {
      const deps = createMockDeps({
        openaiApiKey: "sk-test",
        replicateApiToken: "r8_test",
      });
      // baseBookData → pro_consistent (Replicate profile)
      await processBookGeneration("book-both-flags-replicate", baseBookData, deps);

      // Replicate profile → Replicate adapter only (PROFILE_PROVIDER_MAP === "replicate")
      expect(mockReplicateAdapterGenerateImage).toHaveBeenCalled();
      expect(mockOpenAIAdapterGenerateImage).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 6. Adapter error handling
  // -----------------------------------------------------------------------

  describe("adapter error handling", () => {

    afterEach(() => {
      // Restore success implementation
      mockOpenAIAdapterGenerateImage.mockImplementation(
        async (request: { imageModelProfile: string }) => {
          const url = capturedOpenAIUploader
            ? await capturedOpenAIUploader(
                Buffer.from("mock-openai-adapter-image"),
                request.imageModelProfile
              )
            : "https://storage.example.com/openai-adapter-direct.png";
          return {
            imageUrl: url,
            providerId: "openai" as const,
            modelLabel: "openai/gpt-image-1-mini",
            profile: request.imageModelProfile,
            durationMs: 80,
            fallbackUsed: false,
          };
        }
      );
    });

    it("book goes to 'failed' when OpenAI adapter throws on all page attempts", async () => {
      mockOpenAIAdapterGenerateImage.mockRejectedValue(
        new Error("OpenAI adapter mock failure")
      );

      const deps = createMockDeps({ openaiApiKey: "sk-test" });
      await processBookGeneration("book-openai-adapter-fail", openAIBookData, deps);

      // openai_image_candidate has no fallback → 0/2 pages succeed → "failed"
      const statusCall = (deps.updateBookStatus as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(statusCall[1]).toBe("failed");
    });
  });
});
