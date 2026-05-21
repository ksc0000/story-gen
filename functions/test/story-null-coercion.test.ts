/**
 * P4-12a: Null coercion tests for validateStory().
 *
 * When Gemini responseSchema is enabled with nullable: true, the model may
 * return explicit `null` for optional fields instead of omitting them.
 * validateStory() must treat null as equivalent to undefined for nullable
 * optional fields, while still rejecting null for required fields.
 *
 * This test file exercises validateStory() directly (exported @internal).
 */

import { describe, it, expect } from "vitest";
import { validateStory } from "../src/lib/gemini";

// ---------------------------------------------------------------------------
// Minimal valid story factory
// ---------------------------------------------------------------------------

function minimalValidStory(overrides: Record<string, unknown> = {}) {
  return {
    title: "テストの絵本",
    characterBible: "黒髪の男の子",
    styleBible: "やさしい水彩画風",
    pages: [
      { text: "むかしむかし", imagePrompt: "A boy in a field" },
      { text: "おしまい", imagePrompt: "A boy smiling" },
    ],
    ...overrides,
  };
}

function validStoryWithPages(pageOverrides: Record<string, unknown> = {}) {
  return minimalValidStory({
    pages: [
      { text: "むかしむかし", imagePrompt: "A boy in a field", ...pageOverrides },
      { text: "おしまい", imagePrompt: "A boy smiling" },
    ],
  });
}

function validStoryWithNarrativeDevice(deviceOverrides: Record<string, unknown> = {}) {
  return minimalValidStory({
    narrativeDevice: {
      repeatedPhrase: "だいじょうぶ",
      visualMotif: "yellow star",
      setup: "はじめに ひかり",
      payoff: "さいごに ひかり",
      hiddenDetails: ["small bird"],
      ...deviceOverrides,
    },
  });
}

function validStoryWithCast(castOverrides: Record<string, unknown> = {}) {
  return minimalValidStory({
    cast: [
      {
        characterId: "buddy_1",
        displayName: "くまさん",
        role: "buddy",
        visualBible: "A brown teddy bear",
        ...castOverrides,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 1. Optional root string fields: null accepted
// ---------------------------------------------------------------------------

describe("optional root string fields: null → undefined", () => {
  it.each([
    "titleSpreadText",
    "openingNarration",
    "coverImagePrompt",
    "storyGoal",
    "mainQuestObject",
  ])("%s: null is accepted and normalized to undefined", (field) => {
    const story = minimalValidStory({ [field]: null });
    const result = validateStory(story);
    expect(result[field as keyof typeof result]).toBeUndefined();
  });

  it.each([
    "titleSpreadText",
    "openingNarration",
    "coverImagePrompt",
    "storyGoal",
    "mainQuestObject",
  ])("%s: valid string is preserved", (field) => {
    const story = minimalValidStory({ [field]: "test value" });
    const result = validateStory(story);
    expect(result[field as keyof typeof result]).toBe("test value");
  });

  it.each([
    "titleSpreadText",
    "openingNarration",
    "coverImagePrompt",
    "storyGoal",
    "mainQuestObject",
  ])("%s: undefined is accepted", (field) => {
    const story = minimalValidStory({ [field]: undefined });
    const result = validateStory(story);
    expect(result[field as keyof typeof result]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Optional root array/object fields: null accepted
// ---------------------------------------------------------------------------

describe("optional root array/object fields: null → undefined", () => {
  it("forbiddenQuestObjects: null → undefined", () => {
    const result = validateStory(minimalValidStory({ forbiddenQuestObjects: null }));
    expect(result.forbiddenQuestObjects).toBeUndefined();
  });

  it("narrativeDevice: null → undefined", () => {
    const result = validateStory(minimalValidStory({ narrativeDevice: null }));
    expect(result.narrativeDevice).toBeUndefined();
  });

  it("cast: null → undefined", () => {
    const result = validateStory(minimalValidStory({ cast: null }));
    expect(result.cast).toBeUndefined();
  });

  it("forbiddenQuestObjects: valid array preserved", () => {
    const result = validateStory(minimalValidStory({ forbiddenQuestObjects: ["a", "b"] }));
    expect(result.forbiddenQuestObjects).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// 3. Optional page fields: null accepted
// ---------------------------------------------------------------------------

describe("optional page fields: null → undefined", () => {
  it.each([
    "compositionHint",
    "visualMotifUsage",
    "hiddenDetail",
  ])("%s: null is accepted and normalized", (field) => {
    const result = validateStory(validStoryWithPages({ [field]: null }));
    expect(result.pages[0][field as keyof typeof result.pages[0]]).toBeUndefined();
  });

  it("pageVisualRole: null falls back to default", () => {
    const result = validateStory(validStoryWithPages({ pageVisualRole: null }));
    // Page 0 default is "opening_establishing"
    expect(result.pages[0].pageVisualRole).toBe("opening_establishing");
  });

  it("appearingCharacterIds: null → undefined", () => {
    const result = validateStory(validStoryWithPages({ appearingCharacterIds: null }));
    expect(result.pages[0].appearingCharacterIds).toBeUndefined();
  });

  it("focusCharacterId: null → undefined", () => {
    const result = validateStory(validStoryWithPages({ focusCharacterId: null }));
    expect(result.pages[0].focusCharacterId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Optional narrativeDevice subfields: null accepted
// ---------------------------------------------------------------------------

describe("optional narrativeDevice subfields: null → undefined", () => {
  it.each([
    "repeatedPhrase",
    "visualMotif",
    "setup",
    "payoff",
  ])("%s: null is accepted", (field) => {
    const result = validateStory(validStoryWithNarrativeDevice({ [field]: null }));
    const device = result.narrativeDevice as Record<string, unknown>;
    expect(device[field]).toBeUndefined();
  });

  it("hiddenDetails: null → undefined", () => {
    const result = validateStory(validStoryWithNarrativeDevice({ hiddenDetails: null }));
    const device = result.narrativeDevice as Record<string, unknown>;
    expect(device.hiddenDetails).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Optional cast fields: null accepted
// ---------------------------------------------------------------------------

describe("optional cast fields: null → undefined", () => {
  it("characterKind: null → falls back based on role", () => {
    const result = validateStory(validStoryWithCast({ characterKind: null }));
    // role "buddy" → fallback "magical_creature"
    expect(result.cast![0].characterKind).toBe("magical_creature");
  });

  it("nonHuman: null → undefined", () => {
    const result = validateStory(validStoryWithCast({ nonHuman: null }));
    expect(result.cast![0].nonHuman).toBeUndefined();
  });

  it("referenceImageUrl: null → undefined", () => {
    const result = validateStory(validStoryWithCast({ referenceImageUrl: null }));
    expect(result.cast![0].referenceImageUrl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Required fields: null still rejected
// ---------------------------------------------------------------------------

describe("required fields: null is still rejected", () => {
  it("title: null → throws", () => {
    expect(() => validateStory(minimalValidStory({ title: null }))).toThrow("'title'");
  });

  it("characterBible: null → throws", () => {
    expect(() => validateStory(minimalValidStory({ characterBible: null }))).toThrow("'characterBible'");
  });

  it("styleBible: null → throws", () => {
    expect(() => validateStory(minimalValidStory({ styleBible: null }))).toThrow("'styleBible'");
  });

  it("pages: null → throws", () => {
    expect(() => validateStory(minimalValidStory({ pages: null }))).toThrow("'pages'");
  });

  it("pages[].text: null → throws", () => {
    expect(() =>
      validateStory(
        minimalValidStory({
          pages: [{ text: null, imagePrompt: "prompt" }],
        })
      )
    ).toThrow("'text'");
  });

  it("pages[].imagePrompt: null → throws", () => {
    expect(() =>
      validateStory(
        minimalValidStory({
          pages: [{ text: "text", imagePrompt: null }],
        })
      )
    ).toThrow("'imagePrompt'");
  });

  it("cast[].characterId: null → throws", () => {
    expect(() =>
      validateStory(
        minimalValidStory({
          cast: [{ characterId: null, displayName: "a", role: "buddy", visualBible: "b" }],
        })
      )
    ).toThrow("characterId");
  });

  it("cast[].displayName: null → throws", () => {
    expect(() =>
      validateStory(
        minimalValidStory({
          cast: [{ characterId: "a", displayName: null, role: "buddy", visualBible: "b" }],
        })
      )
    ).toThrow("displayName");
  });

  it("cast[].role: null → normalizes to buddy (non-string fallback)", () => {
    // role uses normalizeStoryCharacterRole which returns "buddy" for non-strings
    const result = validateStory(
      minimalValidStory({
        cast: [{ characterId: "a", displayName: "b", role: null, visualBible: "c" }],
      })
    );
    expect(result.cast![0].role).toBe("buddy");
  });

  it("cast[].visualBible: null → throws", () => {
    expect(() =>
      validateStory(
        minimalValidStory({
          cast: [{ characterId: "a", displayName: "b", role: "buddy", visualBible: null }],
        })
      )
    ).toThrow("visualBible");
  });
});

// ---------------------------------------------------------------------------
// 7. P4-12 regression: Book 1 failure scenario
// ---------------------------------------------------------------------------

describe("P4-12 Book 1 regression: titleSpreadText null", () => {
  it("valid story with titleSpreadText: null passes validateStory", () => {
    const story = minimalValidStory({
      titleSpreadText: null,
      storyGoal: "find the star",
      mainQuestObject: "star",
      forbiddenQuestObjects: ["watermelon"],
      openingNarration: null,
      coverImagePrompt: null,
      narrativeDevice: null,
      cast: null,
    });

    const result = validateStory(story);
    expect(result.title).toBe("テストの絵本");
    expect(result.titleSpreadText).toBeUndefined();
    expect(result.openingNarration).toBeUndefined();
    expect(result.coverImagePrompt).toBeUndefined();
    expect(result.narrativeDevice).toBeUndefined();
    expect(result.cast).toBeUndefined();
    expect(result.storyGoal).toBe("find the star");
    expect(result.mainQuestObject).toBe("star");
    expect(result.forbiddenQuestObjects).toEqual(["watermelon"]);
    expect(result.pages).toHaveLength(2);
  });

  it("story with all nullable fields set to null passes validation", () => {
    const story = {
      title: "テスト",
      characterBible: "desc",
      styleBible: "style",
      storyGoal: null,
      mainQuestObject: null,
      forbiddenQuestObjects: null,
      titleSpreadText: null,
      openingNarration: null,
      coverImagePrompt: null,
      narrativeDevice: null,
      cast: null,
      pages: [
        {
          text: "page1",
          imagePrompt: "prompt1",
          compositionHint: null,
          pageVisualRole: null,
          visualMotifUsage: null,
          hiddenDetail: null,
          appearingCharacterIds: null,
          focusCharacterId: null,
        },
      ],
    };

    const result = validateStory(story);
    expect(result.title).toBe("テスト");
    expect(result.storyGoal).toBeUndefined();
    expect(result.mainQuestObject).toBeUndefined();
    expect(result.forbiddenQuestObjects).toBeUndefined();
    expect(result.titleSpreadText).toBeUndefined();
    expect(result.openingNarration).toBeUndefined();
    expect(result.coverImagePrompt).toBeUndefined();
    expect(result.narrativeDevice).toBeUndefined();
    expect(result.cast).toBeUndefined();
    expect(result.pages[0].compositionHint).toBeUndefined();
    expect(result.pages[0].visualMotifUsage).toBeUndefined();
    expect(result.pages[0].hiddenDetail).toBeUndefined();
    expect(result.pages[0].appearingCharacterIds).toBeUndefined();
    expect(result.pages[0].focusCharacterId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Existing behavior preserved: valid values still work
// ---------------------------------------------------------------------------

describe("existing behavior preserved", () => {
  it("full valid story with all optional fields set passes", () => {
    const story = {
      title: "テスト",
      characterBible: "desc",
      styleBible: "style",
      storyGoal: "goal",
      mainQuestObject: "object",
      forbiddenQuestObjects: ["bad"],
      titleSpreadText: "spread",
      openingNarration: "narration",
      coverImagePrompt: "cover prompt",
      narrativeDevice: {
        repeatedPhrase: "phrase",
        visualMotif: "motif",
        setup: "setup",
        payoff: "payoff",
        hiddenDetails: ["detail"],
      },
      cast: [
        {
          characterId: "buddy_1",
          displayName: "くま",
          role: "buddy",
          visualBible: "bear desc",
          characterKind: "magical_creature",
          nonHuman: true,
        },
      ],
      pages: [
        {
          text: "page1",
          imagePrompt: "prompt1",
          compositionHint: "wide shot",
          pageVisualRole: "opening_establishing",
          visualMotifUsage: "star in corner",
          hiddenDetail: "bird",
          appearingCharacterIds: ["child_protagonist", "buddy_1"],
          focusCharacterId: "child_protagonist",
        },
        {
          text: "page2",
          imagePrompt: "prompt2",
          pageVisualRole: "quiet_ending",
        },
      ],
    };

    const result = validateStory(story);
    expect(result.titleSpreadText).toBe("spread");
    expect(result.openingNarration).toBe("narration");
    expect(result.coverImagePrompt).toBe("cover prompt");
    expect(result.storyGoal).toBe("goal");
    expect(result.mainQuestObject).toBe("object");
    expect(result.forbiddenQuestObjects).toEqual(["bad"]);
    expect(result.narrativeDevice).toBeDefined();
    expect(result.cast).toHaveLength(1);
    expect(result.pages[0].compositionHint).toBe("wide shot");
    expect(result.pages[0].visualMotifUsage).toBe("star in corner");
    expect(result.pages[0].hiddenDetail).toBe("bird");
    expect(result.pages[0].pageVisualRole).toBe("opening_establishing");
  });
});
