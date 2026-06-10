import { describe, it, expect, vi } from "vitest";
import { runTemplateGeneration } from "../src/generate-template";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        name: "Test Template",
        description: "Test Description",
        icon: "✨",
        genre: "Test Genre",
        visualDirection: "Test Visual",
        systemPrompt: "Test System Prompt",
        fixedStory: {
          titleTemplate: "Test Title",
          pages: [
            { textTemplate: "Page 1", imagePromptTemplate: "Prompt 1", pageVisualRole: "opening_establishing" },
            { textTemplate: "Page 2", imagePromptTemplate: "Prompt 2", pageVisualRole: "action" },
            { textTemplate: "Page 3", imagePromptTemplate: "Prompt 3", pageVisualRole: "action" },
            { textTemplate: "Page 4", imagePromptTemplate: "Prompt 4", pageVisualRole: "quiet_ending" },
          ]
        }
      })
    }
  });

  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    }))
  };
});

describe("runTemplateGeneration logic", () => {
  it("should generate a template document from Gemini response", async () => {
    const params = {
      apiKey: "mock-api-key",
      theme: "Adventure",
      categoryGroupId: "memories",
      pageCount: 4,
      targetAge: "3-5"
    };

    const result = await runTemplateGeneration(params);

    expect(result).toMatchObject({
      name: "Test Template",
      categoryGroupId: "memories",
      creationMode: "fixed_template",
      active: false,
      fixedStory: {
        pageCount: 4,
        pages: expect.arrayContaining([
          expect.objectContaining({ textTemplate: "Page 1" })
        ])
      }
    });
  });
});
