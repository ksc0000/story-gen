import { describe, it, expect, vi } from "vitest";
import { buildAutoReviewPrompt } from "../src/lib/auto-review-llm";
import type { BookData, PageData } from "../src/lib/types";

describe("LLM Auto Review Semantic Content Prompt", () => {
  const mockBookBase: Partial<BookData> = {
    title: "Test Book",
    input: {
      childName: "Test Child",
      childAge: 5,
    },
  };

  const mockPages: Partial<PageData>[] = [
    {
      pageNumber: 0,
      text: "公園に行きました。滑り台で遊びました。とても楽しかったです。",
      imagePrompt: "A child playing on a slide in a park",
    },
  ];

  it("should include semantic content instructions for age 3+", () => {
    const prompt = buildAutoReviewPrompt(mockBookBase as BookData, mockPages as PageData[]);
    expect(prompt).toContain("Semantic Content (Age 3+ Diagnostic)");
    expect(prompt).toContain("early_reader_5_6");
    expect(prompt).toContain("Each page SHOULD contain at least TWO of these elements.");
    expect(prompt).toContain("insufficient_semantic_content");
  });

  it("should indicate diagnostic only for baby_toddler (age 0-2)", () => {
    const babyBook = {
      ...mockBookBase,
      input: { ...mockBookBase.input, childAge: 1 },
    };
    const prompt = buildAutoReviewPrompt(babyBook as BookData, mockPages as PageData[]);
    expect(prompt).toContain("baby_toddler");
    expect(prompt).toContain("This is diagnostic only for this age group.");
  });

  it("should contain pageAssessments in the output format instructions", () => {
    const prompt = buildAutoReviewPrompt(mockBookBase as BookData, mockPages as PageData[]);
    expect(prompt).toContain("pageAssessments");
  });
});

import { runLLMAutoReview } from "../src/lib/auto-review-llm";

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: vi.fn().mockImplementation(() => {
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: {
                text: () => JSON.stringify({
                  storyQualityScore: 80,
                  illustrationQualityScore: 85,
                  characterConsistencyScore: 90,
                  personalizationScore: 75,
                  safetyScore: 95,
                  overallQualityScore: 85,
                  confidence: 0.9,
                  reviewReason: "Good story.",
                  flaggedIssues: [
                    {
                      severity: "medium",
                      area: "story",
                      message: "ページに十分な意味内容（場所・行動・気持ち・発見のうち2つ以上）がありません。",
                      pageNumber: 1,
                      issueType: "insufficient_semantic_content"
                    }
                  ],
                  recommendedFixes: [],
                  storyAxes: {
                    childPersonalization: 80,
                    storyCoherence: 80,
                    ageAppropriateness: 80,
                    emotionalSatisfaction: 80,
                    pageLengthBalance: 80,
                    characterConsistency: 80,
                    endingSatisfaction: 80,
                  },
                  illustrationAxes: {
                    promptCompleteness: 85,
                    visualConsistency: 85,
                    characterConsistency: 85,
                    sceneRelevance: 85,
                    styleConsistency: 85,
                    artifactAvoidance: 85,
                  },
                  characterAxes: {
                    visualBibleReflected: 90,
                    characterIdConsistency: 90,
                    appearingCharacterConsistency: 90,
                    focusCharacterConsistency: 90,
                    pageLevelCharacterLinkage: 90,
                    outfitHairstyleConsistency: 90,
                    colorPaletteConsistency: 90,
                  },
                  personalizationAxes: {
                    childProfileUsage: 75,
                    nameNicknameUsage: 75,
                    favoriteThings: 75,
                    familyContext: 75,
                    memoryEventContext: 75,
                    overPersonalizationRisk: 75,
                  },
                  safetyAxes: {
                    ageAppropriateVocabulary: 95,
                    notTooScary: 95,
                    dangerAvoidance: 95,
                    familyFriendlyPeace: 95,
                    privacyConsideration: 95,
                  },
                  pageAssessments: [
                    {
                      pageNumber: 1,
                      semanticContentDetectedElements: ["場所"],
                      hasSufficientSemanticContent: false
                    }
                  ]
                })
              }
            })
          };
        })
      };
    }),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
      HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
      HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
    },
    HarmBlockThreshold: {
      BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE",
    }
  };
});

describe("runLLMAutoReview Parsing", () => {
  it("should parse pageAssessments and issueType correctly", async () => {
    const mockBook: Partial<BookData> = {
      title: "Test",
      input: { childAge: 5 } as any
    };
    const mockPages: any[] = [{ pageNumber: 0, text: "Test" }];

    const result = await runLLMAutoReview({
      apiKey: "fake-key",
      book: mockBook as BookData,
      pages: mockPages as PageData[],
    });

    expect(result.pageAssessments).toBeDefined();
    expect(result.pageAssessments![0].pageNumber).toBe(1);
    expect(result.pageAssessments![0].hasSufficientSemanticContent).toBe(false);
    expect(result.flaggedIssues[0].issueType).toBe("insufficient_semantic_content");
  });
});
