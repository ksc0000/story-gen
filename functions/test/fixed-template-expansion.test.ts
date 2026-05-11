import { describe, it, expect } from "vitest";
import {
  applyTemplateReplacements,
  buildFixedTemplateReplacements,
} from "../src/generate-book";
import type { BookInput, FixedStoryTemplate } from "../src/lib/types";
import { SEED_TEMPLATES } from "../src/seed-templates";

describe("applyTemplateReplacements", () => {
  it("replaces known placeholders", () => {
    const result = applyTemplateReplacements("{childName}の冒険", {
      childName: "ゆうと",
    });
    expect(result).toBe("ゆうとの冒険");
  });

  it("replaces multiple placeholders", () => {
    const result = applyTemplateReplacements("{childName}と{familyMembers}", {
      childName: "ゆうと",
      familyMembers: "パパ",
    });
    expect(result).toBe("ゆうととパパ");
  });

  it("replaces unknown placeholders with empty string", () => {
    const result = applyTemplateReplacements("{unknownVar}!", {});
    expect(result).toBe("!");
  });

  it("returns unmodified string with no placeholders", () => {
    const result = applyTemplateReplacements("no placeholders here", {
      childName: "ゆうと",
    });
    expect(result).toBe("no placeholders here");
  });
});

describe("buildFixedTemplateReplacements", () => {
  it("uses provided input values", () => {
    const input: BookInput = {
      childName: "さくら",
      childAge: 4,
      favorites: "うさぎ",
      place: "公園",
      familyMembers: "ママとパパ",
      parentMessage: "すくすく育ってね",
    };
    const r = buildFixedTemplateReplacements(input);
    expect(r.childName).toBe("さくら");
    expect(r.childAge).toBe("4");
    expect(r.favorites).toBe("うさぎ");
    expect(r.place).toBe("公園");
    expect(r.familyMembers).toBe("ママとパパ");
    expect(r.parentMessage).toBe("すくすく育ってね");
  });

  it("provides fallback values for missing fields", () => {
    const input: BookInput = { childName: "あおい" };
    const r = buildFixedTemplateReplacements(input);
    expect(r.childName).toBe("あおい");
    expect(r.childAge).toBe("3"); // fallback
    expect(r.favorites).toBeTruthy();
    expect(r.place).toBeTruthy();
    expect(r.familyMembers).toBeTruthy();
    expect(r.parentMessage).toBeTruthy();
  });
});

describe("fixed_template cover / title / narration expansion", () => {
  const FIXED_IDS = [
    "fixed-first-zoo",
    "fixed-first-birthday",
    "fixed-bedtime-good-day",
    "fixed-brush-teeth",
    "fixed-first-christmas",
    "fixed-sharing-friends",
  ] as const;

  for (const id of FIXED_IDS) {
    describe(`${id} template expansion`, () => {
      const template = SEED_TEMPLATES[id];
      const fixedStory = template.fixedStory as FixedStoryTemplate;
      const input: BookInput = {
        childName: "テスト太郎",
        childAge: 3,
        familyMembers: "ママ",
        lessonToTeach: "わけっこ",
        place: "動物園",
        parentMessage: "だいすきだよ",
      };
      const replacements = buildFixedTemplateReplacements(input);

      it("coverImagePromptTemplate expands without leftover placeholders", () => {
        expect(fixedStory.coverImagePromptTemplate).toBeTruthy();
        const result = applyTemplateReplacements(
          fixedStory.coverImagePromptTemplate!,
          replacements
        );
        expect(result).not.toMatch(/\{\w+\}/);
        expect(result.length).toBeGreaterThan(20);
      });

      it("titleSpreadTextTemplate expands with childName", () => {
        expect(fixedStory.titleSpreadTextTemplate).toBeTruthy();
        const result = applyTemplateReplacements(
          fixedStory.titleSpreadTextTemplate!,
          replacements
        );
        expect(result).toContain("テスト太郎");
        expect(result).not.toMatch(/\{\w+\}/);
      });

      it("openingNarrationTemplate expands without leftover placeholders", () => {
        expect(fixedStory.openingNarrationTemplate).toBeTruthy();
        const result = applyTemplateReplacements(
          fixedStory.openingNarrationTemplate!,
          replacements
        );
        expect(result).not.toMatch(/\{\w+\}/);
        expect(result.length).toBeGreaterThan(10);
      });

      it("coverImagePromptTemplate negative text instruction preserved after expansion", () => {
        const result = applyTemplateReplacements(
          fixedStory.coverImagePromptTemplate!,
          replacements
        ).toLowerCase();
        expect(result).toContain("no text");
        expect(result).toContain("no letters");
        expect(result).toContain("no watermark");
      });

      it("fixed-sharing-friends opening narration includes expanded lessonToTeach", () => {
        if (id !== "fixed-sharing-friends") return;
        const result = applyTemplateReplacements(
          fixedStory.openingNarrationTemplate!,
          replacements
        );
        expect(result).toContain("わけっこ");
        expect(result).not.toContain("{lessonToTeach}");
      });
    });
  }
});
