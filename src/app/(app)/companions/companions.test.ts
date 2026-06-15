import { describe, it, expect } from "vitest";
import { buildVisualDescription, getSpeciesEmoji, getSpeciesLabel } from "./companions-utils";

describe("companions-utils", () => {
  describe("buildVisualDescription", () => {
    it("should build a correct description for a small orange fox", () => {
      const desc = buildVisualDescription({
        species: "fox",
        personalities: ["energetic"],
        ability: "fly",
        color: "orange",
        size: "small",
        bodyType: "slim",
        colorDepth: "light",
      });
      expect(desc).toBe("A small, slim, light-toned, orange fox with a energetic personality who has the ability to fly.");
    });

    it("should build a correct description for a large dragon with multiple personalities", () => {
      const desc = buildVisualDescription({
        species: "dragon",
        personalities: ["brave", "gentle"],
        ability: "magic",
        color: "purple",
        size: "large",
        bodyType: "chubby",
        colorDepth: "deep",
      });
      expect(desc).toBe("A large, chubby, deeply-colored, purple dragon with a brave and gentle personality who has the ability to use magic.");
    });

    it("should handle missing personalities or abilities gracefully", () => {
        const desc = buildVisualDescription({
          species: "robot",
          personalities: [],
          ability: "",
          color: "gray",
          size: "medium",
        });
        expect(desc).toBe("A medium-sized, gray robot who has some special talents.");
      });

    it("should include pattern and accessories when provided", () => {
      const desc = buildVisualDescription({
        species: "cat",
        personalities: ["gentle"],
        ability: "",
        color: "white",
        size: "small",
        pattern: "spotted",
        accessories: ["ribbon", "glasses"],
      });
      expect(desc).toBe(
        "A small, white cat with playful round polka-dot spots wearing a cute ribbon and round glasses with a gentle personality who has some special talents."
      );
    });

    it("should omit pattern when 'plain' (no markings)", () => {
      const desc = buildVisualDescription({
        species: "bear",
        personalities: [],
        ability: "",
        color: "brown",
        size: "large",
        pattern: "plain",
        accessories: [],
      });
      expect(desc).toBe("A large, brown bear who has some special talents.");
    });
  });

  describe("getSpeciesEmoji", () => {
    it("should return the correct emoji for dog", () => {
      expect(getSpeciesEmoji("dog")).toBe("🐕");
    });

    it("should return a default emoji for unknown species", () => {
      expect(getSpeciesEmoji("unknown" as unknown as "dog")).toBe("🐾");
    });
  });

  describe("getSpeciesLabel", () => {
    it("should return the correct label for cat", () => {
      expect(getSpeciesLabel("cat")).toBe("ねこ");
    });
  });
});
