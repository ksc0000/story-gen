import { describe, it, expect } from "vitest";
import {
  stripInlineStyleWords,
  buildCoverImagePrompt,
  buildImagePrompt,
} from "../src/lib/prompt-builder";
import type { StoryCharacter } from "../src/lib/types";

describe("stripInlineStyleWords", () => {
  it("removes inline art-medium/style phrases that fight the selected styleBible", () => {
    const out = stripInlineStyleWords(
      "a child riding a bike, sense of speed, soft watercolor style, rounded composition"
    );
    expect(out.toLowerCase()).not.toContain("watercolor");
    expect(out.toLowerCase()).not.toContain("soft watercolor");
    expect(out).toContain("riding a bike");
  });

  it("strips pastel / 3D / crayon / anime / flat illustration", () => {
    expect(stripInlineStyleWords("pastel illustration of a dog").toLowerCase()).not.toContain("pastel");
    expect(stripInlineStyleWords("a 3D rendered scene").toLowerCase()).not.toContain("3d");
    expect(stripInlineStyleWords("crayon drawing of a cat").toLowerCase()).not.toContain("crayon");
    expect(stripInlineStyleWords("anime style hero").toLowerCase()).not.toContain("anime");
    expect(stripInlineStyleWords("flat illustration of a car").toLowerCase()).not.toContain("flat illustration");
  });
});

const companionCast: StoryCharacter[] = [
  {
    characterId: "companion_character",
    displayName: "がり",
    role: "protagonist",
    characterKind: "magical_creature",
    visualBible: "A purple robot with round glasses.",
    nonHuman: true,
  },
];

describe("non-human companion protagonist guards", () => {
  it("cover prompt drops the human-child rule and names the companion as protagonist", () => {
    const prompt = buildCoverImagePrompt(
      "an exhilarated child riding a bicycle, soft watercolor style",
      "fluffy_pastel",
      undefined,
      undefined,
      { cast: companionCast, protagonistIsNonHuman: true, nonHumanProtagonistName: "がり" }
    );
    expect(prompt).not.toContain("exactly one human child protagonist");
    expect(prompt).toContain("NON-HUMAN companion");
    expect(prompt).toContain("がり");
    // inline style word from the base prompt must be stripped (cover uses selected styleBible)
    expect(prompt.toLowerCase()).not.toContain("soft watercolor style");
  });

  it("page prompt drops the human-child rule for a companion protagonist", () => {
    const prompt = buildImagePrompt(
      "Show the child character in a spacious environment",
      "fluffy_pastel",
      undefined,
      undefined,
      {
        cast: companionCast,
        appearingCharacterIds: ["companion_character"],
        protagonistIsNonHuman: true,
        nonHumanProtagonistName: "がり",
      }
    );
    expect(prompt).not.toContain("exactly one human child protagonist");
    expect(prompt).toContain("NON-HUMAN companion");
  });

  it("keeps the human-child rule when the protagonist is a child (no flag)", () => {
    const prompt = buildImagePrompt("a child plays", "soft_watercolor", undefined, undefined, {
      appearingCharacterIds: ["child_protagonist"],
    });
    expect(prompt).toContain("exactly one human child protagonist");
  });
});
