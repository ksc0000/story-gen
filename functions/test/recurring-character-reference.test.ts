import { describe, it, expect } from "vitest";
import { shouldGenerateRecurringCharacterReference } from "../src/generate-book";
import type {
  StoryCharacter,
  StoryCharacterKind,
  GeneratedStory,
  BookData,
} from "../src/lib/types";

// #571: recurring character reference images must be generated for ALL recurring
// character types (non-human AND non-protagonist humans), not only non-human ones.

function makeCharacter(overrides: Partial<StoryCharacter> = {}): StoryCharacter {
  return {
    characterId: "char-1",
    displayName: "テストキャラ",
    role: "parent",
    visualBible: "a gentle recurring character",
    characterKind: "human_adult",
    ...overrides,
  } as StoryCharacter;
}

function makeStoryWithAppearances(characterId: string, appearances: number): GeneratedStory {
  const pages = Array.from({ length: appearances }, () => ({
    appearingCharacterIds: [characterId],
  }));
  return { pages } as unknown as GeneratedStory;
}

const paidBook = { productPlan: "premium_paid" } as BookData;

describe("shouldGenerateRecurringCharacterReference — #571 all character types", () => {
  const humanKinds: StoryCharacterKind[] = ["human_child", "human_adult"];
  const nonHumanKinds: StoryCharacterKind[] = ["animal", "magical_creature", "object_character"];

  for (const kind of [...humanKinds, ...nonHumanKinds]) {
    it(`generates a reference for recurring ${kind} on a paid plan`, () => {
      const character = makeCharacter({ characterId: "c", characterKind: kind, role: "sibling" });
      const story = makeStoryWithAppearances("c", 2);
      expect(shouldGenerateRecurringCharacterReference(character, story, paidBook)).toBe(true);
    });
  }

  it("never generates a competing reference for the protagonist (even as human_child)", () => {
    const character = makeCharacter({
      characterId: "hero",
      characterKind: "human_child",
      role: "protagonist",
    });
    const story = makeStoryWithAppearances("hero", 4);
    expect(shouldGenerateRecurringCharacterReference(character, story, paidBook)).toBe(false);
  });

  it("skips characters that already have a reference image", () => {
    const character = makeCharacter({
      characterId: "g",
      characterKind: "human_adult",
      approvedImageUrl: "https://example.com/grandma.png",
    });
    const story = makeStoryWithAppearances("g", 3);
    expect(shouldGenerateRecurringCharacterReference(character, story, paidBook)).toBe(false);
  });

  it("requires at least two appearances", () => {
    const character = makeCharacter({ characterId: "f", characterKind: "human_child" });
    const story = makeStoryWithAppearances("f", 1);
    expect(shouldGenerateRecurringCharacterReference(character, story, paidBook)).toBe(false);
  });

  it("does not generate references on a free plan", () => {
    const character = makeCharacter({ characterId: "f", characterKind: "human_adult" });
    const story = makeStoryWithAppearances("f", 3);
    const freeBook = { productPlan: "free" } as BookData;
    expect(shouldGenerateRecurringCharacterReference(character, story, freeBook)).toBe(false);
  });

  it("ignores the unsupported 'background' kind", () => {
    const character = makeCharacter({ characterId: "bg", characterKind: "background" });
    const story = makeStoryWithAppearances("bg", 5);
    expect(shouldGenerateRecurringCharacterReference(character, story, paidBook)).toBe(false);
  });
});
