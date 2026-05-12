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
  "fixed-sleepy-moon-adventure",
  "fixed-cardboard-rocket",
  "fixed-rainy-day-puddle",
  "fixed-little-helper",
] as const;

const NEGATIVE_TEXT_TOKENS = [
  "no text",
  "no letters",
  "no japanese characters",
  "no logo",
  "no watermark",
];

const FIXED_IMAGE_PROMPT_STANDARD_SUFFIX =
  "no readable writing anywhere, no signage, no storefront signs, no text-like marks";
const FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX =
  "use reference image for child's face and identity only, ignore reference image background and setting";
const JAPANESE_SCRIPT_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const PROMPT_ANTIPATTERN_RE = /\b(storefront|shop|label|banner|poster|sign)\b/i;
const PROMPT_NEGATIVE_CLAUSES = [
  "no readable writing anywhere",
  "no signage",
  "no storefront signs",
  "no text-like marks",
  "no readable signs",
  "no text",
  "no letters",
  "no japanese characters",
  "no logo",
  "no watermark",
];

function getPositivePrompt(prompt: string): string {
  let positivePrompt = prompt;
  for (const clause of PROMPT_NEGATIVE_CLAUSES) {
    positivePrompt = positivePrompt.replace(new RegExp(clause, "ig"), "");
  }
  return positivePrompt.replace(/\s+/g, " ").trim();
}

const EXPECTED_PAGE_ROLES: Record<string, PageVisualRole[]> = {
  "fixed-first-zoo": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-birthday": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-bedtime-good-day": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-brush-teeth": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-christmas": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-sharing-friends": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-sleepy-moon-adventure": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-cardboard-rocket": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-rainy-day-puddle": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-little-helper": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
};

const TEMPLATE_IMAGE_ASSET_URLS = new Set([
  "/images/templates/adventure.png",
  "/images/templates/animals.png",
  "/images/templates/bedtime.png",
  "/images/templates/daily-habits.png",
  "/images/templates/educational.png",
  "/images/templates/emotional-growth.png",
  "/images/templates/fantasy.png",
  "/images/templates/food.png",
  "/images/templates/seasonal.png",
  "/images/templates/vehicles-robots.png",
]);

const EXPECTED_FIXED_SAMPLE_IMAGES: Record<string, string> = {
  "fixed-first-zoo": "/images/templates/animals.png",
  "fixed-first-birthday": "/images/templates/food.png",
  "fixed-bedtime-good-day": "/images/templates/bedtime.png",
  "fixed-brush-teeth": "/images/templates/daily-habits.png",
  "fixed-first-christmas": "/images/templates/seasonal.png",
  "fixed-sharing-friends": "/images/templates/emotional-growth.png",
  "fixed-sleepy-moon-adventure": "/images/templates/fantasy.png",
  "fixed-cardboard-rocket": "/images/templates/adventure.png",
  "fixed-rainy-day-puddle": "/images/templates/seasonal.png",
  "fixed-little-helper": "/images/templates/emotional-growth.png",
};

describe("SEED_TEMPLATES — fixed templates Phase T1-B", () => {
  it("Phase T2-C: fixed templates are expanded to 10", () => {
    expect(FIXED_TEMPLATE_IDS.length).toBe(10);
    const existing = FIXED_TEMPLATE_IDS.filter((id) => SEED_TEMPLATES[id]);
    expect(existing.length).toBe(10);
  });

  for (const id of FIXED_TEMPLATE_IDS) {
    describe(id, () => {
      const template = SEED_TEMPLATES[id];

      it("exists with creationMode fixed_template", () => {
        expect(template).toBeDefined();
        expect(template.creationMode).toBe("fixed_template");
      });

      it("uses a sampleImageUrl that points to an existing templates asset", () => {
        expect(template.sampleImageUrl).toBeTruthy();
        expect(TEMPLATE_IMAGE_ASSET_URLS.has(template.sampleImageUrl ?? "")).toBe(true);
      });

      it("has the expected sampleImageUrl mapping", () => {
        expect(template.sampleImageUrl).toBe(EXPECTED_FIXED_SAMPLE_IMAGES[id]);
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

      it("coverImagePromptTemplate includes the standard no-text suffix", () => {
        const prompt = (template.fixedStory?.coverImagePromptTemplate ?? "").toLowerCase();
        expect(prompt).toContain(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX);
      });

      it("coverImagePromptTemplate includes reference isolation instruction", () => {
        const prompt = (template.fixedStory?.coverImagePromptTemplate ?? "").toLowerCase();
        expect(prompt).toContain(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX);
      });

      it("coverImagePromptTemplate does not contain Japanese script characters", () => {
        const prompt = template.fixedStory?.coverImagePromptTemplate ?? "";
        expect(prompt).not.toMatch(JAPANESE_SCRIPT_RE);
      });

      it("coverImagePromptTemplate keeps sign-like words out of the positive prompt", () => {
        const prompt = getPositivePrompt(template.fixedStory?.coverImagePromptTemplate ?? "");
        expect(prompt).not.toMatch(PROMPT_ANTIPATTERN_RE);
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
          expect(prompt).toContain(FIXED_IMAGE_PROMPT_STANDARD_SUFFIX);
          expect(prompt).toContain("no text");
          expect(prompt).toContain("no letters");
          expect(prompt).toContain("no japanese characters");
          expect(prompt).toContain("no logo");
          expect(prompt).toContain("no watermark");
        }
      });

      it("every imagePromptTemplate has reference isolation instruction", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          const prompt = page.imagePromptTemplate.toLowerCase();
          expect(prompt).toContain(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX);
        }
      });

      it("every imagePromptTemplate does not contain Japanese script characters", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.imagePromptTemplate).not.toMatch(JAPANESE_SCRIPT_RE);
        }
      });

      it("every imagePromptTemplate keeps sign-like words out of the positive prompt", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          const prompt = getPositivePrompt(page.imagePromptTemplate);
          expect(prompt).not.toMatch(PROMPT_ANTIPATTERN_RE);
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

describe("fixed-rainy-day-puddle — safety policy", () => {
  const template = SEED_TEMPLATES["fixed-rainy-day-puddle"];

  it("does not include close traffic or dangerous road crossing wording", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).not.toContain("close traffic");
      expect(prompt).not.toContain("dangerous road crossing");
    }
  });
});

describe("fixed-little-helper — safety policy", () => {
  const template = SEED_TEMPLATES["fixed-little-helper"];

  it("does not include knives, stove, or fire wording", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).not.toContain("knives");
      expect(prompt).not.toContain("stove");
      expect(prompt).not.toContain("fire");
    }
  });
});

describe("fixed-first-zoo — IMG-002 scene lock (sandbox bleed prevention)", () => {
  const template = SEED_TEMPLATES["fixed-first-zoo"];

  it("every page prompt contains zoo scene keyword", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("zoo");
    }
  });

  it("every page prompt explicitly excludes sandbox background", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("not a sandbox");
    }
  });

  it("every page prompt explicitly excludes outdoor playground or play area", () => {
    const playExclusionTerms = [
      "not an outdoor playground",
      "not a children's playground",
      "not an outdoor play area",
      "not a playground",
    ];
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      const hasExclusion = playExclusionTerms.some((term) => prompt.includes(term));
      expect(hasExclusion).toBe(true);
    }
  });
});
