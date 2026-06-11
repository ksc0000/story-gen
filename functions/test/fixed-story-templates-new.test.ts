import { describe, it, expect } from "vitest";
import { fixedStoryTemplates } from "../src/templates/fixed-story-templates";
import { FIXED_IMAGE_PROMPT_STANDARD_SUFFIX, FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX } from "../src/prompts/image-prompt-fragments";

describe("fixedStoryTemplates", () => {
  it("should have at least 10 templates", () => {
    expect(fixedStoryTemplates.length).toBeGreaterThanOrEqual(10);
  });

  for (const template of fixedStoryTemplates) {
    describe(`Template: ${template.templateId}`, () => {
      it("should have all required fields", () => {
        expect(template.templateId).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.categoryGroupId).toBeTruthy();
        expect(template.creationMode).toBe("fixed_template");
        expect(template.fixedStory).toBeDefined();
        expect(template.fixedStory?.titleTemplate).toBeTruthy();
        expect(template.fixedStory?.pages).toHaveLength(4);
      });

      it("should have valid Japanese text in templates (hiragana-first focus for child-facing content)", () => {
        const japaneseRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
        expect(template.name).toMatch(japaneseRegex);
        expect(template.description).toMatch(japaneseRegex);
        expect(template.fixedStory?.titleTemplate).toMatch(japaneseRegex);

        // Skip existing templates for strict kanji check if they were already in prod
        const isNewTemplate = ["fixed-learning-colors", "fixed-world-magical-forest"].includes(template.templateId);
        if (isNewTemplate) {
          const forbiddenKanji = /森|光る|虹色|妖精|不思議/;
          expect(template.fixedStory?.titleTemplate).not.toMatch(forbiddenKanji);
          for (const page of template.fixedStory?.pages ?? []) {
            expect(page.textTemplate).not.toMatch(forbiddenKanji);
          }
        }
      });

      it("should have valid English image prompts with safety suffixes", () => {
        if (template.fixedStory?.coverImagePromptTemplate) {
          expect(template.fixedStory.coverImagePromptTemplate).toContain(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX);
          expect(template.fixedStory.coverImagePromptTemplate).toContain(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX);
        }
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.imagePromptTemplate).toContain(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX);
          expect(page.imagePromptTemplate).toContain(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX);
        }
      });

      it("should have a valid pageVisualRole for each page", () => {
        const validRoles = [
          "opening_establishing",
          "discovery",
          "action",
          "emotional_closeup",
          "object_detail",
          "setback_or_question",
          "payoff",
          "quiet_ending",
        ];
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.pageVisualRole).toBeTruthy();
          expect(validRoles).toContain(page.pageVisualRole);
        }
      });
    });
  }
});
