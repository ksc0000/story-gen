import { describe, it, expect } from "vitest";
import { normalizeStoryWithCompanion } from "../src/generate-book";
import type { GeneratedStory, BookInput } from "../src/lib/types";

describe("normalizeStoryWithCompanion", () => {
  const mockStory: GeneratedStory = {
    title: "Test Book",
    characterBible: "Child bible",
    styleBible: "Style bible",
    pages: [
      { text: "Page 1", imagePrompt: "Prompt 1", appearingCharacterIds: ["child_protagonist"] },
      { text: "Page 2", imagePrompt: "Prompt 2", appearingCharacterIds: ["child_protagonist"] },
      { text: "Page 3", imagePrompt: "Prompt 3", appearingCharacterIds: ["child_protagonist"] },
      { text: "Page 4", imagePrompt: "Prompt 4", appearingCharacterIds: ["child_protagonist"] },
    ],
    cast: [
      {
        characterId: "child_protagonist",
        displayName: "Child",
        role: "protagonist",
        visualBible: "Child visual",
      },
    ],
  };

  const mockInput: BookInput = {
    childName: "Child",
    companionId: "comp-123",
    companionName: "Buddy",
    companionVisualDescription: "A small blue robot",
  };

  it("should add companion to cast if missing", () => {
    const result = normalizeStoryWithCompanion(mockStory, mockInput);
    expect(result.cast).toHaveLength(2);
    expect(result.cast?.find(c => c.displayName === "Buddy")).toBeDefined();
    expect(result.cast?.find(c => c.characterId === "companion_character")).toBeDefined();
  });

  it("should ensure companion appears on at least 50% of pages", () => {
    const result = normalizeStoryWithCompanion(mockStory, mockInput);
    const companionId = "companion_character";
    const appearingCount = result.pages.filter(p => p.appearingCharacterIds?.includes(companionId)).length;
    expect(appearingCount).toBeGreaterThanOrEqual(2); // 50% of 4 pages
  });

  it("should prefer adding companion to even pages", () => {
     const result = normalizeStoryWithCompanion(mockStory, mockInput);
     const companionId = "companion_character";
     expect(result.pages[0].appearingCharacterIds).toContain(companionId);
     expect(result.pages[2].appearingCharacterIds).toContain(companionId);
  });

  it("should not add duplicate cast if already present by name", () => {
    const storyWithCompanion: GeneratedStory = {
      ...mockStory,
      cast: [
        ...mockStory.cast!,
        {
          characterId: "existing_comp",
          displayName: "Buddy",
          role: "buddy",
          visualBible: "Existing visual",
        }
      ]
    };
    const result = normalizeStoryWithCompanion(storyWithCompanion, mockInput);
    expect(result.cast).toHaveLength(2);
    expect(result.cast?.find(c => c.characterId === "existing_comp")).toBeDefined();
  });

  it("should update visualBible if existing one is too short", () => {
    const storyWithCompanion: GeneratedStory = {
      ...mockStory,
      cast: [
        ...mockStory.cast!,
        {
          characterId: "existing_comp",
          displayName: "Buddy",
          role: "buddy",
          visualBible: "Too short",
        }
      ]
    };
    const result = normalizeStoryWithCompanion(storyWithCompanion, mockInput);
    const comp = result.cast?.find(c => c.characterId === "existing_comp");
    expect(comp?.visualBible).toBe(mockInput.companionVisualDescription);
  });

  it("overrides a hallucinated long visualBible with the registered description", () => {
    // Reproduces the gray-fox-rendered-orange bug: Gemini invents a long
    // "soft orange fur" bible for a companion registered as gray. The registered
    // description must win so the prompt matches the gray reference image.
    const grayFoxInput: BookInput = {
      childName: "はる",
      companionId: "comp-fox",
      companionName: "こん",
      companionVisualDescription: "A small, gray fox with an energetic personality who has the ability to sing beautifully.",
    };
    const storyWithHallucinatedCompanion: GeneratedStory = {
      ...mockStory,
      cast: [
        ...mockStory.cast!,
        {
          characterId: "fox_kon",
          displayName: "こん",
          role: "buddy",
          characterKind: "animal",
          visualBible: "Kon is a small, energetic fox with soft orange fur, a white belly, and a fluffy white-tipped tail.",
          colorPalette: ["soft orange", "creamy white", "soft pink"],
          silhouette: "small, agile fox with a fluffy tail",
        },
      ],
    };
    const result = normalizeStoryWithCompanion(storyWithHallucinatedCompanion, grayFoxInput);
    const comp = result.cast?.find(c => c.characterId === "fox_kon");
    expect(comp?.visualBible).toBe(grayFoxInput.companionVisualDescription);
    expect(comp?.visualBible).not.toContain("orange");
    // The model-invented palette must be dropped so it cannot reintroduce orange.
    expect(comp?.colorPalette).toBeUndefined();
  });

  it("should do nothing if companion info is missing in input", () => {
    const result = normalizeStoryWithCompanion(mockStory, { childName: "Child" });
    expect(result).toEqual(mockStory);
  });
});
