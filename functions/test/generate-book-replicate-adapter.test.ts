/**
 * P3-15: Replicate adapter routing tests (updated from P3-13 feature-flag wiring).
 *
 * Verifies that:
 *   1. No replicateApiToken — legacy imageClient.generateImage is used (test-environment fallback).
 *   2. replicateApiToken present + Replicate profile — ReplicateImageAdapter is used,
 *      imageClient.generateImage is NOT called for pages, upload happens via makePageUploader.
 *   3. replicateApiToken present + openai_image_candidate — Replicate adapter is NOT used
 *      (PROFILE_PROVIDER_MAP maps it to "openai", not "replicate").
 *   4. Fallback loop still triggers when adapter path throws.
 *   5. imageModel label in writePage is identical to the legacy path computation.
 *
 * P3-15 change: USE_REPLICATE_ADAPTER feature flag removed.
 * Adapter path is now the default when replicateApiToken is present in deps.
 * Tests that previously verified flag-off-overrides-token behavior are removed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processBookGeneration } from "../src/generate-book";
import type { BookData, GeneratedStory, TemplateData } from "../src/lib/types";

// -------------------------------------------------------------------------
// Mock: ReplicateImageAdapter — controlled stub, no network
// -------------------------------------------------------------------------

/**
 * Captures the uploader injected to the adapter constructor so the
 * generateImage mock can call it (simulating real adapter behavior).
 * This must be module-scoped because vi.mock() runs before any test code.
 */
let capturedUploader: ((buf: Buffer, profile: string) => Promise<string>) | undefined;

/**
 * The generateImage mock is defined at module level so that
 * mockRejectedValue() / mockReset() applied in individual tests work
 * correctly without being overridden by the constructor mock.
 */
const mockAdapterGenerateImage = vi.fn().mockImplementation(
  async (request: { imageModelProfile: string }) => {
    // Call the injected uploader to simulate what the real adapter does.
    const url = capturedUploader
      ? await capturedUploader(Buffer.from("mock-adapter-image"), request.imageModelProfile)
      : "https://storage.example.com/adapter-direct.png";
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
      // Capture uploader for use in mockAdapterGenerateImage
      capturedUploader = uploader as (buf: Buffer, profile: string) => Promise<string>;
      return {
        providerId: "replicate" as const,
        capabilities: {
          supportsTextToImage: true,
          supportsImageToImage: false,
          supportsReferenceImages: true,
          supportsDetailedGuidance: true,
        },
        generateImage: mockAdapterGenerateImage,
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
  title: "はなこのぼうけん",
  characterBible: "A girl with short brown hair and a red dress",
  styleBible: "Soft watercolor picture book style",
  storyGoal: "はなこが星を見つける",
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
      text: "はなこは星を探して歩きました。空はとても青く、風がやさしく吹いていました。",
      imagePrompt: "A child walking in a bright meadow looking for a star with soft watercolor style",
      pageVisualRole: "opening_establishing",
      compositionHint: "wide establishing shot",
      hiddenDetail: "small bird near the tree",
      appearingCharacterIds: ["child_protagonist"],
      focusCharacterId: "child_protagonist",
    },
    {
      text: "ついに星を見つけました。それはキラキラと光って、とてもきれいでした。",
      imagePrompt: "A child finding a glowing star in the meadow with warm watercolor light",
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
  userId: "user-p313",
  title: "",
  theme: "birthday",
  style: "watercolor",
  pageCount: 2,
  status: "generating",
  progress: 0,
  input: { childName: "はなこ" },
  createdAt: {} as FirebaseFirestore.Timestamp,
  expiresAt: null,
  // Explicit Replicate-routed profile. After the 3-tier rollout (PR #180),
  // the default profile (free plan) resolves to openai_mini, which would
  // bypass the Replicate adapter entirely.
  imageModelProfile: "pro_consistent",
};

function createMockDeps(overrides: { replicateApiToken?: string } = {}) {
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
    uploadImage: vi.fn().mockResolvedValue("https://storage.example.com/image.png"),
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
    incrementMonthlyCount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe("P3-15: Replicate adapter routing", () => {
  beforeEach(() => {
    mockAdapterGenerateImage.mockClear();
  });

  // -----------------------------------------------------------------------
  // 1. No replicateApiToken: legacy imageClient path (test-environment fallback)
  // -----------------------------------------------------------------------

  describe("Legacy fallback (no replicateApiToken)", () => {
    it("calls imageClient.generateImage when no replicateApiToken is provided", async () => {
      const deps = createMockDeps();
      await processBookGeneration("book-legacy", baseBookData, deps);

      // No token: legacy imageClient.generateImage is used (test-environment fallback)
      expect(deps.imageClient.generateImage).toHaveBeenCalled();
      // Adapter should NOT be called
      expect(mockAdapterGenerateImage).not.toHaveBeenCalled();
    });

    it("calls uploadImage for each page via caller upload block (buffer is set)", async () => {
      const deps = createMockDeps();
      await processBookGeneration("book-legacy-upload", baseBookData, deps);

      // Legacy path: imageResult.imageBuffer is set → caller calls deps.uploadImage
      // uploadImage is called: once per page (2 pages), possibly also for cover
      expect(deps.uploadImage).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 2. replicateApiToken provided + Replicate profile: adapter path
  // -----------------------------------------------------------------------

  describe("Replicate adapter path (token provided)", () => {
    beforeEach(() => {
    });

    it("calls ReplicateImageAdapter.generateImage instead of imageClient.generateImage", async () => {
      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });
      await processBookGeneration("book-adapter", baseBookData, deps);

      // Adapter path: adapter.generateImage is called for each page
      expect(mockAdapterGenerateImage).toHaveBeenCalled();
      // Legacy imageClient should NOT be called for page images
      // (cover image still uses legacy path — that's fine, just verify page calls)
      // The adapter generates pages, so imageClient.generateImage call count for pages = 0
      // Note: imageClient may still be called for cover/character-reference if those remain on legacy path.
      // We verify adapter was called at least as many times as there are story pages.
      expect(mockAdapterGenerateImage.mock.calls.length).toBeGreaterThanOrEqual(mockStory.pages.length);
    });

    it("upload happens via makePageUploader (deps.uploadImage called from inside adapter)", async () => {
      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });
      await processBookGeneration("book-adapter-upload", baseBookData, deps);

      // The mocked adapter calls the injected uploader, which calls deps.uploadImage.
      // So deps.uploadImage MUST be called at least once via the adapter path.
      expect(deps.uploadImage).toHaveBeenCalled();

      // Verify that uploadImage was called with correct bookId and page indices
      const uploadCalls = (deps.uploadImage as ReturnType<typeof vi.fn>).mock.calls;
      const pageUploadCalls = uploadCalls.filter(
        ([bookId, , buffer]: [string, number, Buffer]) =>
          bookId === "book-adapter-upload" && Buffer.isBuffer(buffer)
      );
      expect(pageUploadCalls.length).toBeGreaterThanOrEqual(mockStory.pages.length);
    });

    it("adapter path does NOT call caller-level deps.uploadImage a second time (no double-upload)", async () => {
      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });
      await processBookGeneration("book-no-double-upload", baseBookData, deps);

      // imageResult.imageBuffer is undefined for adapter path → the caller's
      // "if (imageResult.success && imageResult.imageBuffer)" block is skipped.
      // Total uploadImage calls = once per page (from adapter via uploader) + no extra.
      // Since adapter calls uploader once per page and there's no double-call,
      // total call count should equal page count (adapter) + any cover image calls.
      const uploadCalls = (deps.uploadImage as ReturnType<typeof vi.fn>).mock.calls;
      const pageUploads = uploadCalls.filter(
        ([bookId]: [string]) => bookId === "book-no-double-upload"
      );
      // Exactly one upload per page from the adapter (no double-upload)
      expect(pageUploads.length).toBe(mockStory.pages.length);
    });

    it("returns completed status when adapter succeeds for all pages", async () => {
      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });
      await processBookGeneration("book-adapter-completed", baseBookData, deps);

      expect(deps.updateBookStatus).toHaveBeenCalledWith("book-adapter-completed", "completed");
    });

    it("falls back to legacy path when replicateApiToken is missing (undefined)", async () => {
      // replicateApiToken not provided → undefined → condition false → legacy path
      const deps = createMockDeps(); // no replicateApiToken
      await processBookGeneration("book-no-token", baseBookData, deps);

      // With no token, adapter branch is skipped; legacy path is used
      expect(mockAdapterGenerateImage).not.toHaveBeenCalled();
      expect(deps.imageClient.generateImage).toHaveBeenCalled();
    });

    it("imageModel label in writePage is identical to legacy path computation", async () => {
      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });
      await processBookGeneration("book-imagemodel-label", baseBookData, deps);

      // Both legacy and adapter paths compute imageModel via resolveReplicateModel().
      // Verify writePage received an imageModel matching Replicate FLUX format.
      const writePageCalls = (deps.writePage as ReturnType<typeof vi.fn>).mock.calls;
      expect(writePageCalls.length).toBeGreaterThan(0);
      for (const [, pageData] of writePageCalls) {
        expect(pageData.imageModel).toMatch(/^black-forest-labs\//);
      }
    });
  });

  // -----------------------------------------------------------------------
  // 3. openai_image_candidate: Replicate adapter NOT used (provider = "openai")
  // -----------------------------------------------------------------------

  describe("openai_image_candidate profile: Replicate adapter is skipped", () => {
    beforeEach(() => {
    });

    it("does not use ReplicateImageAdapter for openai_image_candidate (PROFILE_PROVIDER_MAP=\"openai\")", async () => {
      const bookDataWithOpenAI: BookData = {
        ...baseBookData,
        imageModelProfile: "openai_image_candidate",
      };
      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });

      await processBookGeneration("book-openai-candidate", bookDataWithOpenAI, deps);

      // openai_image_candidate maps to provider "openai" in PROFILE_PROVIDER_MAP,
      // so the Replicate adapter condition (=== "replicate") is false — legacy path taken.
      expect(mockAdapterGenerateImage).not.toHaveBeenCalled();
      expect(deps.imageClient.generateImage).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. Adapter error handling: error propagates through fallback loop
  // -----------------------------------------------------------------------

  describe("adapter error handling", () => {

    afterEach(() => {
      // Restore success implementation so later tests are not affected
      mockAdapterGenerateImage.mockImplementation(
        async (request: { imageModelProfile: string }) => {
          const url = capturedUploader
            ? await capturedUploader(Buffer.from("mock-adapter-image"), request.imageModelProfile)
            : "https://storage.example.com/adapter-direct.png";
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
    });

    it("book goes to 'failed' when adapter throws on all page attempts", async () => {
      // Make the adapter always fail so all page image attempts exhaust retries/fallbacks
      mockAdapterGenerateImage.mockRejectedValue(new Error("Replicate adapter mock failure"));

      const deps = createMockDeps({ replicateApiToken: "r8_test_token" });
      await processBookGeneration("book-adapter-fail", baseBookData, deps);

      // 0/2 pages succeed → book status must be "failed" (not "partial_completed").
      // This verifies that errors propagate through the fallback loop correctly.
      const statusCall = (deps.updateBookStatus as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(statusCall[1]).toBe("failed");
    });
  });
});
