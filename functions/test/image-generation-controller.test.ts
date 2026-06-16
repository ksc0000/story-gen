import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "firebase-functions/logger";
import { generateCoverImageWithFallback } from "../src/controllers/imageGeneration";
import { ImageClient } from "../src/lib/types";

describe("generateCoverImageWithFallback Step B retry logic", () => {
  const E005_ERROR = new Error("Prediction failed: (E005)");
  const mockBuffer = Buffer.from("fake-image");

  let mockImageClient: ImageClient;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockImageClient = {
      generateImage: vi.fn().mockResolvedValue(mockBuffer),
    };
    logSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("activates Step b for cover on second attempt when primary profile fails", async () => {
    const stepBConfig = {
      prompt: "Simplified Cover Prompt",
      inputImageUrls: [],
    };

    // First call fails, second (retry) succeeds
    vi.mocked(mockImageClient.generateImage)
      .mockRejectedValueOnce(E005_ERROR)
      .mockResolvedValueOnce(mockBuffer);

    const result = await generateCoverImageWithFallback({
      coverImagePrompt: "Original Cover Prompt",
      bookId: "book123",
      imageQualityTier: "premium",
      imageModelProfile: "pro_consistent",
      inputImageUrls: ["https://example.com/ref.png"],
      imageClient: mockImageClient,
      stepBConfig,
    });

    expect(result.success).toBe(true);
    expect(result.attemptCount).toBe(2);
    expect(result.fallbackUsed).toBe(false); // Same profile (pro_consistent)

    // Verify first call used original params
    expect(mockImageClient.generateImage).toHaveBeenNthCalledWith(
      1,
      "Original Cover Prompt",
      expect.objectContaining({
        inputImageUrls: ["https://example.com/ref.png"],
      })
    );

    // Verify second call used Step B params
    expect(mockImageClient.generateImage).toHaveBeenNthCalledWith(
      2,
      "Simplified Cover Prompt",
      expect.objectContaining({
        inputImageUrls: [],
      })
    );

    // Verify diagnostic log
    const stepBLog = logSpy.mock.calls.find(
      ([msg, payload]) =>
        msg === "p5_model_unification_retry_active" &&
        (payload as Record<string, unknown>)?.["step"] === "b"
    );
    expect(stepBLog).toBeDefined();
    expect(stepBLog![1]).toMatchObject({
      bookId: "book123",
      pageIndex: -1,
      step: "b",
      inputReferenceCount: 1,
      retryInputReferenceCount: 0,
    });
  });

  it("falls back to klein_fast if both Step a and Step b fail", async () => {
    const stepBConfig = {
      prompt: "Simplified Cover Prompt",
      inputImageUrls: [],
    };

    // Step a fails, Step b fails, klein_fast succeeds
    vi.mocked(mockImageClient.generateImage)
      .mockRejectedValueOnce(E005_ERROR) // Step a
      .mockRejectedValueOnce(E005_ERROR) // Step b
      .mockResolvedValueOnce(mockBuffer); // klein_fast

    const result = await generateCoverImageWithFallback({
      coverImagePrompt: "Original Cover Prompt",
      bookId: "book123",
      imageQualityTier: "premium",
      imageModelProfile: "pro_consistent",
      inputImageUrls: ["https://example.com/ref.png"],
      imageClient: mockImageClient,
      stepBConfig,
    });

    expect(result.success).toBe(true);
    expect(result.usedProfile).toBe("klein_fast");
    expect(result.fallbackUsed).toBe(true);
    expect(result.attemptCount).toBe(3);
  });
});
