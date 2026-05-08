import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES } from "../src/seed-templates";

const FIXED_TEMPLATE_IDS = [
  "fixed-first-zoo",
  "fixed-bedtime-good-day",
  "fixed-brush-teeth",
  "fixed-first-christmas",
] as const;

const NEGATIVE_TEXT_TOKENS = [
  "no text",
  "no letters",
  "no japanese characters",
  "no logo",
  "no watermark",
];

describe("SEED_TEMPLATES — fixed templates Phase T1-B", () => {
  for (const id of FIXED_TEMPLATE_IDS) {
    describe(id, () => {
      const template = SEED_TEMPLATES[id];

      it("exists with creationMode fixed_template", () => {
        expect(template).toBeDefined();
        expect(template.creationMode).toBe("fixed_template");
      });

      it("has a fixedStory block", () => {
        expect(template.fixedStory).toBeDefined();
      });

      it("has a non-empty titleTemplate", () => {
        expect(template.fixedStory?.titleTemplate).toBeTruthy();
        expect(template.fixedStory?.titleTemplate.length).toBeGreaterThan(0);
      });

      it("has a non-empty coverImagePromptTemplate", () => {
        expect(template.fixedStory?.coverImagePromptTemplate).toBeTruthy();
        expect((template.fixedStory?.coverImagePromptTemplate ?? "").length).toBeGreaterThan(20);
      });

      it("coverImagePromptTemplate includes negative text instructions", () => {
        const prompt = (template.fixedStory?.coverImagePromptTemplate ?? "").toLowerCase();
        for (const token of NEGATIVE_TEXT_TOKENS) {
          expect(prompt).toContain(token);
        }
      });

      it("coverImagePromptTemplate does NOT instruct to draw text", () => {
        const prompt = (template.fixedStory?.coverImagePromptTemplate ?? "").toLowerCase();
        // Forbidden: positive instructions to write/render text or letters
        expect(prompt).not.toMatch(/\b(write|render|draw|show|display|with)\s+(the\s+)?(title|text|letters|japanese|logo|watermark)\b/);
      });

      it("has a non-empty titleSpreadTextTemplate", () => {
        expect(template.fixedStory?.titleSpreadTextTemplate).toBeTruthy();
        expect((template.fixedStory?.titleSpreadTextTemplate ?? "").length).toBeGreaterThan(0);
      });

      it("has a non-empty openingNarrationTemplate", () => {
        expect(template.fixedStory?.openingNarrationTemplate).toBeTruthy();
        expect((template.fixedStory?.openingNarrationTemplate ?? "").length).toBeGreaterThan(0);
      });

      it("preserves 4 pages", () => {
        expect(template.fixedStory?.pages.length).toBe(4);
      });

      it("preserves textTemplatesByAge on at least 3 pages", () => {
        const pagesWithAge = (template.fixedStory?.pages ?? []).filter(
          (p) => p.textTemplatesByAge && Object.keys(p.textTemplatesByAge).length > 0
        );
        expect(pagesWithAge.length).toBeGreaterThanOrEqual(3);
      });
    });
  }
});
