import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBookGeneration } from "../src/generate-book";
import type { BookData, TemplateData } from "../src/lib/types";

const mockTemplate: TemplateData = {
  name: "test", description: "test", icon: "🎂", order: 1,
  creationMode: "fixed_template", systemPrompt: "test", active: true,
  fixedStory: {
    titleTemplate: "test",
    pages: [
      { textTemplate: "page 1", imagePromptTemplate: "prompt 1" },
      { textTemplate: "page 2", imagePromptTemplate: "prompt 2" },
    ],
  },
};

function createMockDeps() {
  return {
    getTemplate: vi.fn().mockResolvedValue(mockTemplate),
    getUserPlan: vi.fn().mockResolvedValue("free" as const),
    llmClient: {
      generateStory: vi.fn(),
    },
    imageClient: { generateImage: vi.fn().mockResolvedValue(Buffer.from("fake")) },
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
    getUserCredits: vi.fn().mockResolvedValue({
      singleBookCredits: 0,
      aiGuidedCredits: 0,
      photoStoryCredits: 0,
    }),
    consumeCredit: vi.fn().mockResolvedValue(undefined),
  };
}

const baseBookData: BookData = {
  userId: "user123", title: "", theme: "test", style: "watercolor",
  pageCount: 4, status: "generating", progress: 0, input: { childName: "test" },
  createdAt: {} as any, expiresAt: null,
};

describe("processBookGeneration quota and credits", () => {
  let deps: any;

  beforeEach(() => {
    deps = createMockDeps();
    // Force NODE_ENV to production-like for quota checks
    vi.stubEnv("NODE_ENV", "production");
  });

  it("allows generation when within monthly quota", async () => {
    deps.getUserMonthlyCount.mockResolvedValue(0); // Free limit is 3
    await processBookGeneration("book1", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book1", "completed");
    expect(deps.incrementMonthlyCount).toHaveBeenCalled();
    expect(deps.consumeCredit).not.toHaveBeenCalled();
  });

  it("allows generation when monthly quota exceeded but has single book credits", async () => {
    deps.getUserMonthlyCount.mockResolvedValue(3); // Free limit is 3
    deps.getUserCredits.mockResolvedValue({
      singleBookCredits: 1,
      aiGuidedCredits: 0,
      photoStoryCredits: 0,
    });
    await processBookGeneration("book2", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book2", "completed");
    expect(deps.consumeCredit).toHaveBeenCalledWith("user123", "legacy");
    expect(deps.incrementMonthlyCount).not.toHaveBeenCalled();
  });

  it("rejects generation when both monthly quota and single book credits are exhausted", async () => {
    deps.getUserMonthlyCount.mockResolvedValue(3);
    deps.getUserCredits.mockResolvedValue({
      singleBookCredits: 0,
      aiGuidedCredits: 0,
      photoStoryCredits: 0,
    });
    await processBookGeneration("book3", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book3", "failed");
    expect(deps.updateBookFailure).toHaveBeenCalledWith("book3", expect.stringContaining("今月の無料生成回数に達しました"));
    expect(deps.llmClient.generateStory).not.toHaveBeenCalled();
  });

  it("prioritizes monthly quota over single book credits", async () => {
    deps.getUserMonthlyCount.mockResolvedValue(0);
    deps.getUserCredits.mockResolvedValue({
      singleBookCredits: 1,
      aiGuidedCredits: 0,
      photoStoryCredits: 0,
    });
    await processBookGeneration("book4", baseBookData, deps);
    expect(deps.updateBookStatus).toHaveBeenCalledWith("book4", "completed");
    expect(deps.incrementMonthlyCount).toHaveBeenCalled();
    expect(deps.consumeCredit).not.toHaveBeenCalled();
  });
});
