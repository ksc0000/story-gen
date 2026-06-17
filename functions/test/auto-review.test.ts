import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAutoReviewPrompt, runLLMAutoReview } from "../src/lib/auto-review-llm";
import type { BookData, PageData } from "../src/lib/types";

const mockGenerateContent = vi.fn();
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: mockGenerateContent,
      })),
    })),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
      HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
      HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
    },
    HarmBlockThreshold: {
      BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE",
    },
  };
});

describe("LLM Auto Review Prompt Construction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should construct a valid prompt with book and page data", () => {
    const mockBook: Partial<BookData> = {
      title: "Test Book",
      input: {
        childName: "Test Child",
        childAge: 5,
      },
      theme: "adventure",
      storyGoal: "To find the treasure",
      mainQuestObject: "treasure map",
      forbiddenQuestObjects: ["bomb", "knife"],
      characterBible: "The protagonist is a brave boy.",
      storyCast: [
        {
          characterId: "child_protagonist",
          displayName: "Hero",
          role: "protagonist",
          visualBible: "A boy with a red hat.",
        },
      ],
    };

    const mockPages: Partial<PageData>[] = [
      {
        pageNumber: 0,
        text: "Once upon a time...",
        imagePrompt: "A beautiful forest",
        appearingCharacterIds: ["child_protagonist"],
        focusCharacterId: "child_protagonist",
      },
      {
        pageNumber: 1,
        text: "He found a map.",
        imagePrompt: "A child holding a map",
        appearingCharacterIds: ["child_protagonist"],
        focusCharacterId: "child_protagonist",
      },
    ];

    const prompt = buildAutoReviewPrompt(mockBook as BookData, mockPages as PageData[]);

    expect(prompt).toContain("Test Book");
    expect(prompt).toContain("adventure");
    expect(prompt).toContain("To find the treasure");
    expect(prompt).toContain("treasure map");
    expect(prompt).toContain("bomb");
    expect(prompt).toContain("Once upon a time...");
    expect(prompt).toContain("A beautiful forest");
    expect(prompt).toContain("He found a map.");
    expect(prompt).toContain("A child holding a map");
    expect(prompt).toContain("The protagonist is a brave boy.");
    expect(prompt).toContain("Hero");
    expect(prompt).toContain("A boy with a red hat.");
    expect(prompt).toContain("appearingCharacterIds");
    expect(prompt).toContain("focusCharacterId");
    expect(prompt).toContain("characterAxes");
    // Verify visual evaluation criteria in the prompt
    expect(prompt).toContain("Visual Artifacts");
    expect(prompt).toContain("Text Artifacts");
    expect(prompt).toContain("regenerate_page_image");
  });

  it("should include visual evaluation criteria in the prompt", () => {
    const mockBook: Partial<BookData> = {
      title: "Test Book",
      input: { childName: "Child", childAge: 5 },
      theme: "test",
    };
    const mockPages: Partial<PageData>[] = [{ pageNumber: 0, text: "T", imagePrompt: "P" }];

    const prompt = buildAutoReviewPrompt(mockBook as BookData, mockPages as PageData[]);
    expect(prompt).toContain("Visual Artifacts");
    expect(prompt).toContain("Text Artifacts");
    expect(prompt).toContain("regenerate_page_image");
  });

  it("should pass multimodal image data to Gemini when provided", async () => {
    const mockBook: Partial<BookData> = {
      title: "Test Book",
      input: { childName: "Child", childAge: 5 },
      theme: "test",
    };
    const mockPages: Partial<PageData>[] = [
      { pageNumber: 0, text: "T1", imagePrompt: "P1" },
    ];
    const mockImages = [
      { pageNumber: 0, buffer: Buffer.from("fake-image-data"), mimeType: "image/png" },
    ];

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          storyQualityScore: 80,
          illustrationQualityScore: 70,
          characterConsistencyScore: 90,
          personalizationScore: 85,
          safetyScore: 100,
          overallQualityScore: 85,
          confidence: 0.9,
          reviewReason: "Good",
          flaggedIssues: [],
          recommendedFixes: [],
          storyAxes: {
            childPersonalization: 80, storyCoherence: 80, ageAppropriateness: 80,
            emotionalSatisfaction: 80, pageLengthBalance: 80, characterConsistency: 80,
            endingSatisfaction: 80
          },
          illustrationAxes: {
            promptCompleteness: 80, visualConsistency: 80, characterConsistency: 80,
            sceneRelevance: 80, styleConsistency: 80, artifactAvoidance: 80
          },
          characterAxes: {
            visualBibleReflected: 80, characterIdConsistency: 80, appearingCharacterConsistency: 80,
            focusCharacterConsistency: 80, pageLevelCharacterLinkage: 80,
            outfitHairstyleConsistency: 80, colorPaletteConsistency: 80
          },
          personalizationAxes: {
            childProfileUsage: 80, nameNicknameUsage: 80, favoriteThings: 80,
            familyContext: 80, memoryEventContext: 80, overPersonalizationRisk: 80
          },
          safetyAxes: {
            ageAppropriateVocabulary: 80, notTooScary: 80, dangerAvoidance: 80,
            familyFriendlyPeace: 80, privacyConsideration: 80
          },
          pageAssessments: []
        }),
      },
    });

    await runLLMAutoReview({
      apiKey: "fake-key",
      book: mockBook as BookData,
      pages: mockPages as PageData[],
      pageImages: mockImages,
    });

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const parts = callArgs.contents[0].parts;

    // Verify that the images were included in the parts
    const imagePart = parts.find((p: any) => p.inlineData);
    expect(imagePart).toBeDefined();
    expect(imagePart.inlineData.mimeType).toBe("image/png");
    expect(imagePart.inlineData.data).toBe(Buffer.from("fake-image-data").toString("base64"));

    // Verify that the prompt text was also included
    const textPart = parts.find((p: any) => p.text && p.text.includes("expert children's book quality reviewer"));
    expect(textPart).toBeDefined();
  });
});
