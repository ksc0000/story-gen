import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES } from "../src/seed-templates";
import type { PageVisualRole } from "../src/lib/types";

const FIXED_TEMPLATE_IDS = [
  "fixed-first-zoo",
  "fixed-first-birthday",
  "fixed-bedtime-good-day",
  "fixed-brush-teeth",
  "fixed-first-christmas",
  "fixed-sharing-friends",
] as const;

const NEGATIVE_TEXT_TOKENS = [
  "no text",
  "no letters",
  "no japanese characters",
  "no logo",
  "no watermark",
];

const JAPANESE_SCRIPT_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

const EXPECTED_PAGE_ROLES: Record<string, PageVisualRole[]> = {
  "fixed-first-zoo": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-birthday": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-bedtime-good-day": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-brush-teeth": ["opening_establishing", "action", "payoff", "quiet_ending"],
  "fixed-first-christmas": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-sharing-friends": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
};

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

      it("coverImagePromptTemplate does not contain Japanese script characters", () => {
        const prompt = template.fixedStory?.coverImagePromptTemplate ?? "";
        expect(prompt).not.toMatch(JAPANESE_SCRIPT_RE);
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

      it("every page has a pageVisualRole", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.pageVisualRole).toBeTruthy();
        }
      });

      it("pageVisualRole sequence matches expected pattern", () => {
        const roles = (template.fixedStory?.pages ?? []).map((p) => p.pageVisualRole);
        expect(roles).toEqual(EXPECTED_PAGE_ROLES[id]);
      });

      it("first page role is opening_establishing", () => {
        expect(template.fixedStory?.pages[0]?.pageVisualRole).toBe("opening_establishing");
      });

      it("last page role is quiet_ending", () => {
        const pages = template.fixedStory?.pages ?? [];
        expect(pages[pages.length - 1]?.pageVisualRole).toBe("quiet_ending");
      });

      it("every imagePromptTemplate has negative text instructions", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          const prompt = page.imagePromptTemplate.toLowerCase();
          expect(prompt).toContain("no text");
          expect(prompt).toContain("no letters");
          expect(prompt).toContain("no japanese characters");
          expect(prompt).toContain("no logo");
          expect(prompt).toContain("no watermark");
        }
      });

      it("every imagePromptTemplate does not contain Japanese script characters", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.imagePromptTemplate).not.toMatch(JAPANESE_SCRIPT_RE);
        }
      });

      it("every imagePromptTemplate is sufficiently detailed (>100 chars)", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.imagePromptTemplate.length).toBeGreaterThan(100);
        }
      });

      it("every imagePromptTemplate mentions composition or framing", () => {
        const framingTerms = ["shot", "close-up", "establishing", "viewed from", "back-view", "side view"];
        for (const page of template.fixedStory?.pages ?? []) {
          const prompt = page.imagePromptTemplate.toLowerCase();
          const hasFraming = framingTerms.some((term) => prompt.includes(term));
          expect(hasFraming).toBe(true);
        }
      });

      it("every imagePromptTemplate mentions watercolor style", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          const prompt = page.imagePromptTemplate.toLowerCase();
          expect(prompt).toContain("watercolor");
        }
      });
    });
  }
});
