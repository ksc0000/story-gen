import { describe, it, expect } from "vitest";
import { analyzePromptCompleteness } from "../src/lib/prompt-analyzer";
import type { GeneratedStory } from "../src/lib/types";

describe("analyzePromptCompleteness", () => {
  const mockStory: GeneratedStory = {
    title: "Test Story",
    characterBible: "A small child with a red hat.",
    styleBible: "Soft watercolor style.",
    narrativeDevice: {
      visualMotif: "Red Balloon",
    },
    cast: [
      {
        characterId: "buddy_01",
        displayName: "Sparky",
        role: "buddy",
        visualBible: "A glowing dog.",
      },
    ],
    pages: [
      {
        text: "The child saw a red balloon.",
        imagePrompt: "A wide establishing shot of a child holding a red balloon in a park. Sparky the glowing dog is running nearby.",
        pageVisualRole: "opening_establishing",
        compositionHint: "wide establishing shot",
        appearingCharacterIds: ["child_protagonist", "buddy_01"],
      },
      {
        text: "The balloon flew away.",
        imagePrompt: "Close-up of the child's sad face as the balloon flies high.",
        pageVisualRole: "emotional_closeup",
        compositionHint: "close-up",
        appearingCharacterIds: ["child_protagonist"],
        hiddenDetail: "A tiny bird",
      },
    ],
  };

  it("identifies present elements correctly", () => {
    const diagnostic = analyzePromptCompleteness(mockStory);

    expect(diagnostic.pages).toHaveLength(2);

    // Page 1
    const p1 = diagnostic.pages[0];
    expect(p1.characterPresence.find(cp => cp.characterId === "child_protagonist")?.present).toBe(true);
    expect(p1.characterPresence.find(cp => cp.characterId === "buddy_01")?.present).toBe(true);
    expect(p1.visualMotifPresent).toBe(true);
    expect(p1.visualRolePresent).toBe(true);
    expect(p1.compositionHintPresent).toBe(true);

    // Page 2
    const p2 = diagnostic.pages[1];
    expect(p2.characterPresence.find(cp => cp.characterId === "child_protagonist")?.present).toBe(true);
    expect(p2.visualMotifPresent).toBe(false); // Motif missing from prompt
    expect(p2.hiddenDetailPresent).toBe(false); // Hidden detail missing from prompt
    expect(p2.visualRolePresent).toBe(true);
    expect(p2.compositionHintPresent).toBe(true);
  });

  it("detects missing elements", () => {
    const incompleteStory: GeneratedStory = {
      ...mockStory,
      pages: [
        {
          text: "Nothing here.",
          imagePrompt: "Empty background.",
          pageVisualRole: "action",
          compositionHint: "medium shot",
          appearingCharacterIds: ["child_protagonist"],
        },
      ],
    };

    const diagnostic = analyzePromptCompleteness(incompleteStory);
    const p1 = diagnostic.pages[0];

    expect(p1.characterPresence[0].present).toBe(false);
    expect(p1.visualMotifPresent).toBe(false);
    expect(p1.visualRolePresent).toBe(false);
    expect(p1.compositionHintPresent).toBe(false);
  });

  it("handles not_applicable for missing optional elements", () => {
    const minimalStory: GeneratedStory = {
      title: "Minimal",
      characterBible: "",
      styleBible: "",
      pages: [
        {
          text: "Minimal page.",
          imagePrompt: "Something.",
        },
      ],
    };

    const diagnostic = analyzePromptCompleteness(minimalStory);
    const p1 = diagnostic.pages[0];

    expect(p1.visualMotifPresent).toBe("not_applicable");
    expect(p1.hiddenDetailPresent).toBe("not_applicable");
  });

  it("calculates a completeness score", () => {
    const diagnostic = analyzePromptCompleteness(mockStory);
    // Page 1: all 5 present = 1 pt
    // Page 2: 3 present (char, role, hint), 2 missing (motif, hidden) = 3/5 pt
    // Total = (1 + 0.6) / 2 * 100 = 80? No, calculateScore sums points across all axes.
    // Total axes = 10.
    // Page 1 points = 5.
    // Page 2 points = 3.
    // Score = 8/10 * 100 = 80.
    expect(diagnostic.averageCompletenessScore).toBe(80);
  });
});
