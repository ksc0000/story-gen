import { describe, it, expect, vi } from "vitest";
import { buildAutoReviewPrompt } from "../src/lib/auto-review-llm";
import type { BookData, PageData } from "../src/lib/types";

describe("LLM Auto Review Prompt Construction", () => {
  it("should construct a valid prompt with book and page data", () => {
    const mockBook: Partial<BookData> = {
      title: "Test Book",
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
  });
});
