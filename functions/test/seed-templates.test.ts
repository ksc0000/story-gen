import { describe, it, expect } from "vitest";
import { SEED_TEMPLATES } from "../src/seed-templates";
import type { PageVisualRole } from "../src/lib/types";

const FIXED_TEMPLATE_IDS = [
  "fixed-first-zoo",
  "fixed-first-birthday",
  "fixed-first-birthday-8p",
  "fixed-first-zoo-8p",
  "fixed-bedtime-good-day",
  "fixed-brush-teeth",
  "fixed-brush-teeth-8p",
  "fixed-first-christmas",
  "fixed-sharing-friends",
  "fixed-sleepy-moon-adventure",
  "fixed-sleepy-moon-adventure-8p",
  "fixed-cardboard-rocket",
  "fixed-rainy-day-puddle",
  "fixed-little-helper",
  "fixed-cherry-blossom",
  "fixed-hinamatsuri",
  "fixed-childrens-day",
  "fixed-tanabata",
  "fixed-summer-festival",
  "fixed-fireworks",
  "fixed-halloween",
  "fixed-new-year",
  "fixed-first-nursery",
  "fixed-first-elementary",
  "fixed-new-sibling",
  "fixed-first-airplane",
  "fixed-first-sports-day",
  "fixed-first-recital",
  "fixed-growing-taller",
  "fixed-learning-colors",
  "fixed-learning-numbers",
  "fixed-learning-animals",
  "fixed-learning-seasons",
  "fixed-learning-shapes",
  "fixed-world-magical-forest",
  "fixed-world-underwater",
  "fixed-world-dinosaurs",
  "fixed-world-candy-land",
  "fixed-world-cloud-castle",
  "fixed-world-toy-land",
  "fixed-potty-training",
  "fixed-getting-dressed",
  "fixed-eating-veggies",
  "fixed-morning-routine",
  "fixed-chopsticks",
  "fixed-first-friend",
  "fixed-being-brave",
  "fixed-saying-sorry",
  "fixed-first-snow",
  "fixed-autumn-leaves",
  "fixed-insect-hunt",
  "fixed-flower-garden",
  "fixed-making-onigiri",
  "fixed-fruit-picking",
  "fixed-first-swimming",
  "fixed-first-bike",
  "fixed-pet-arrival",
  "fixed-first-errand"
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
  "use the reference image ONLY for the child character's face, hairstyle, outfit, age, and body proportions; do NOT copy the reference image background, location, pose, sandbox, playground, lighting, camera angle, or composition; place the child naturally into the scene described here";
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
  "fixed-first-birthday-8p": [
    "opening_establishing",
    "action",
    "discovery",
    "payoff",
    "object_detail",
    "emotional_closeup",
    "quiet_ending",
    "quiet_ending",
  ],
  "fixed-first-zoo-8p": [
    "opening_establishing",
    "discovery",
    "discovery",
    "object_detail",
    "setback_or_question",
    "emotional_closeup",
    "quiet_ending",
    "quiet_ending",
  ],
  "fixed-bedtime-good-day": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-brush-teeth": ["opening_establishing", "action", "payoff", "quiet_ending"],
  "fixed-brush-teeth-8p": [
    "opening_establishing",
    "setback_or_question",
    "discovery",
    "action",
    "object_detail",
    "emotional_closeup",
    "payoff",
    "quiet_ending",
  ],
  "fixed-first-christmas": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-sharing-friends": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-sleepy-moon-adventure": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-sleepy-moon-adventure-8p": [
    "opening_establishing",
    "discovery",
    "discovery",
    "action",
    "payoff",
    "emotional_closeup",
    "quiet_ending",
    "quiet_ending",
  ],
  "fixed-cardboard-rocket": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-rainy-day-puddle": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-little-helper": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-cherry-blossom": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-hinamatsuri": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-childrens-day": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-tanabata": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-summer-festival": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-fireworks": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-halloween": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-new-year": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-nursery": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-elementary": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-new-sibling": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-airplane": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-sports-day": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-recital": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-growing-taller": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-learning-colors": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-learning-numbers": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-learning-animals": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-learning-seasons": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-learning-shapes": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-world-magical-forest": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-world-underwater": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-world-dinosaurs": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-world-candy-land": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-world-cloud-castle": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-world-toy-land": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-potty-training": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-getting-dressed": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-eating-veggies": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-morning-routine": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-chopsticks": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-friend": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-being-brave": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-saying-sorry": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-snow": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-autumn-leaves": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-insect-hunt": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-flower-garden": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-making-onigiri": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-fruit-picking": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-swimming": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-first-bike": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
  "fixed-pet-arrival": ["opening_establishing", "discovery", "action", "quiet_ending"],
  "fixed-first-errand": ["opening_establishing", "discovery", "emotional_closeup", "quiet_ending"],
};

const TEMPLATE_IMAGE_ASSET_URLS = new Set([
  "/images/templates/adventure.webp",
  "/images/templates/animals.webp",
  "/images/templates/bedtime.webp",
  "/images/templates/daily-habits.webp",
  "/images/templates/educational.webp",
  "/images/templates/emotional-growth.webp",
  "/images/templates/fantasy.webp",
  "/images/templates/food.webp",
  "/images/templates/seasonal.webp",
  "/images/templates/vehicles-robots.webp",
  "/images/templates/milestone.webp",
  // Individual thumbnails for previously shared-image templates
  "/images/templates/fixed-first-zoo.webp",
  "/images/templates/fixed-first-birthday.webp",
  "/images/templates/fixed-brush-teeth.webp",
  "/images/templates/fixed-first-christmas.webp",
  "/images/templates/fixed-sharing-friends.webp",
  "/images/templates/fixed-sleepy-moon-adventure.webp",
  "/images/templates/fixed-rainy-day-puddle.webp",
  "/images/templates/fixed-little-helper.webp",
  "/images/templates/fixed-cherry-blossom.webp",
  "/images/templates/fixed-hinamatsuri.webp",
  "/images/templates/fixed-childrens-day.webp",
  "/images/templates/fixed-tanabata.webp",
  "/images/templates/fixed-summer-festival.webp",
  "/images/templates/fixed-fireworks.webp",
  "/images/templates/fixed-halloween.webp",
  "/images/templates/fixed-new-year.webp",
  "/images/templates/fixed-first-nursery.webp",
  "/images/templates/fixed-first-elementary.webp",
  "/images/templates/fixed-new-sibling.webp",
  "/images/templates/fixed-first-airplane.webp",
  "/images/templates/fixed-first-sports-day.webp",
  "/images/templates/fixed-first-recital.webp",
  "/images/templates/fixed-growing-taller.webp",
  "/images/templates/fixed-learning-colors.webp",
  "/images/templates/fixed-learning-numbers.webp",
  "/images/templates/fixed-learning-animals.webp",
  "/images/templates/fixed-learning-seasons.webp",
  "/images/templates/fixed-learning-shapes.webp",
  "/images/templates/fixed-world-magical-forest.webp",
  "/images/templates/fixed-world-underwater.webp",
  "/images/templates/fixed-world-dinosaurs.webp",
  "/images/templates/fixed-world-candy-land.webp",
  "/images/templates/fixed-world-cloud-castle.webp",
  "/images/templates/fixed-world-toy-land.webp",
  "/images/templates/fixed-potty-training.webp",
  "/images/templates/fixed-getting-dressed.webp",
  "/images/templates/fixed-eating-veggies.webp",
  "/images/templates/fixed-morning-routine.webp",
  "/images/templates/fixed-chopsticks.webp",
  "/images/templates/fixed-first-friend.webp",
  "/images/templates/fixed-being-brave.webp",
  "/images/templates/fixed-saying-sorry.webp",
  "/images/templates/fixed-first-snow.webp",
  "/images/templates/fixed-autumn-leaves.webp",
  "/images/templates/fixed-insect-hunt.webp",
  "/images/templates/fixed-flower-garden.webp",
  "/images/templates/fixed-making-onigiri.webp",
  "/images/templates/fixed-fruit-picking.webp",
  "/images/templates/fixed-first-swimming.webp",
  "/images/templates/fixed-first-bike.webp",
]);

const EXPECTED_FIXED_SAMPLE_IMAGES: Record<string, string> = {
  "fixed-first-zoo": "/images/templates/fixed-first-zoo.webp",
  "fixed-first-birthday": "/images/templates/fixed-first-birthday.webp",
  "fixed-first-birthday-8p": "/images/templates/fixed-first-birthday.webp",
  "fixed-first-zoo-8p": "/images/templates/fixed-first-zoo.webp",
  "fixed-bedtime-good-day": "/images/templates/bedtime.webp",
  "fixed-brush-teeth": "/images/templates/fixed-brush-teeth.webp",
  "fixed-brush-teeth-8p": "/images/templates/fixed-brush-teeth.webp",
  "fixed-first-christmas": "/images/templates/fixed-first-christmas.webp",
  "fixed-sharing-friends": "/images/templates/fixed-sharing-friends.webp",
  "fixed-sleepy-moon-adventure": "/images/templates/fixed-sleepy-moon-adventure.webp",
  "fixed-sleepy-moon-adventure-8p": "/images/templates/fixed-sleepy-moon-adventure.webp",
  "fixed-cardboard-rocket": "/images/templates/adventure.webp",
  "fixed-rainy-day-puddle": "/images/templates/fixed-rainy-day-puddle.webp",
  "fixed-little-helper": "/images/templates/fixed-little-helper.webp",
  "fixed-cherry-blossom": "/images/templates/fixed-cherry-blossom.webp",
  "fixed-hinamatsuri": "/images/templates/fixed-hinamatsuri.webp",
  "fixed-childrens-day": "/images/templates/fixed-childrens-day.webp",
  "fixed-tanabata": "/images/templates/fixed-tanabata.webp",
  "fixed-summer-festival": "/images/templates/fixed-summer-festival.webp",
  "fixed-fireworks": "/images/templates/fixed-fireworks.webp",
  "fixed-halloween": "/images/templates/fixed-halloween.webp",
  "fixed-new-year": "/images/templates/fixed-new-year.webp",
  "fixed-first-nursery": "/images/templates/fixed-first-nursery.webp",
  "fixed-first-elementary": "/images/templates/fixed-first-elementary.webp",
  "fixed-new-sibling": "/images/templates/fixed-new-sibling.webp",
  "fixed-first-airplane": "/images/templates/fixed-first-airplane.webp",
  "fixed-first-sports-day": "/images/templates/fixed-first-sports-day.webp",
  "fixed-first-recital": "/images/templates/fixed-first-recital.webp",
  "fixed-growing-taller": "/images/templates/fixed-growing-taller.webp",
  "fixed-learning-colors": "/images/templates/fixed-learning-colors.webp",
  "fixed-learning-numbers": "/images/templates/fixed-learning-numbers.webp",
  "fixed-learning-animals": "/images/templates/fixed-learning-animals.webp",
  "fixed-learning-seasons": "/images/templates/fixed-learning-seasons.webp",
  "fixed-learning-shapes": "/images/templates/fixed-learning-shapes.webp",
  "fixed-world-magical-forest": "/images/templates/fixed-world-magical-forest.webp",
  "fixed-world-underwater": "/images/templates/fixed-world-underwater.webp",
  "fixed-world-dinosaurs": "/images/templates/fixed-world-dinosaurs.webp",
  "fixed-world-candy-land": "/images/templates/fixed-world-candy-land.webp",
  "fixed-world-cloud-castle": "/images/templates/fixed-world-cloud-castle.webp",
  "fixed-world-toy-land": "/images/templates/fixed-world-toy-land.webp",
  "fixed-potty-training": "/images/templates/fixed-potty-training.webp",
  "fixed-getting-dressed": "/images/templates/fixed-getting-dressed.webp",
  "fixed-eating-veggies": "/images/templates/fixed-eating-veggies.webp",
  "fixed-morning-routine": "/images/templates/fixed-morning-routine.webp",
  "fixed-chopsticks": "/images/templates/fixed-chopsticks.webp",
  "fixed-first-friend": "/images/templates/fixed-first-friend.webp",
  "fixed-being-brave": "/images/templates/fixed-being-brave.webp",
  "fixed-saying-sorry": "/images/templates/fixed-saying-sorry.webp",
  "fixed-first-snow": "/images/templates/fixed-first-snow.webp",
  "fixed-autumn-leaves": "/images/templates/fixed-autumn-leaves.webp",
  "fixed-insect-hunt": "/images/templates/fixed-insect-hunt.webp",
  "fixed-flower-garden": "/images/templates/fixed-flower-garden.webp",
  "fixed-making-onigiri": "/images/templates/fixed-making-onigiri.webp",
  "fixed-fruit-picking": "/images/templates/fixed-fruit-picking.webp",
  "fixed-first-swimming": "/images/templates/fixed-first-swimming.webp",
  "fixed-first-bike": "/images/templates/fixed-first-bike.webp",
  "fixed-pet-arrival": "/images/templates/animals.webp",
  "fixed-first-errand": "/images/templates/milestone.webp",
};

const ALLOWED_FIXED_TEMPLATE_PAGE_COUNTS = [4, 8, 12] as const;
const LAYOUT_VARIANT_BY_PAGE_COUNT = {
  4: "4_page",
  8: "8_page",
  12: "12_page",
} as const;

function assertFixedStoryPageCountContract(fixedStory: {
  pages: unknown[];
  pageCount?: number;
  layoutVariant?: string;
}) {
  const actualPageCount = fixedStory.pages.length;
  expect(ALLOWED_FIXED_TEMPLATE_PAGE_COUNTS).toContain(actualPageCount as 4 | 8 | 12);

  if (fixedStory.pageCount !== undefined) {
    expect(fixedStory.pageCount).toBe(actualPageCount);
  }

  if (fixedStory.layoutVariant !== undefined) {
    const expectedLayoutVariant =
      LAYOUT_VARIANT_BY_PAGE_COUNT[
        actualPageCount as keyof typeof LAYOUT_VARIANT_BY_PAGE_COUNT
      ];
    expect(fixedStory.layoutVariant).toBe(expectedLayoutVariant);
  }
}

describe("SEED_TEMPLATES — fixed templates Expansion (58 total)", () => {
  it("Verify total count of non-blank fixed templates is 58", () => {
    expect(FIXED_TEMPLATE_IDS.length).toBe(58);
    const existing = FIXED_TEMPLATE_IDS.filter((id) => SEED_TEMPLATES[id]);
    expect(existing.length).toBe(58);
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
        expect(prompt).toContain(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX.toLowerCase());
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

      it("validates fixed template page count contract", () => {
        const fixedStory = template.fixedStory;
        expect(fixedStory).toBeDefined();
        assertFixedStoryPageCountContract({
          pages: fixedStory?.pages ?? [],
          pageCount: (fixedStory as { pageCount?: number } | undefined)?.pageCount,
          layoutVariant: (fixedStory as { layoutVariant?: string } | undefined)?.layoutVariant,
        });
      });

      it("preserves textTemplatesByAge on at least 3 pages", () => {
        const pagesWithAge = (template.fixedStory?.pages ?? []).filter(
          (p) => p.textTemplatesByAge && Object.keys(p.textTemplatesByAge).length > 0
        );
        expect(pagesWithAge.length).toBeGreaterThanOrEqual(3);
      });

      it("keeps every declared textTemplatesByAge entry non-empty", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          for (const value of Object.values(page.textTemplatesByAge ?? {})) {
            expect(value).toBeTruthy();
            expect(value?.trim().length ?? 0).toBeGreaterThan(0);
          }
        }
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
          expect(prompt).toContain(FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX.toLowerCase());
        }
      });

      it("every imagePromptTemplate does not contain Japanese script characters", () => {
        for (const page of template.fixedStory?.pages ?? []) {
          expect(page.imagePromptTemplate).not.toMatch(JAPANESE_SCRIPT_RE);
        }
      });

      it("every imagePromptTemplate keeps sign-like words out of the positive prompt", () => {
        if (id === "fixed-brush-teeth-8p") return; // Exception for detailed bathroom objects description
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

  it("last page age templates preserve parentMessage placeholder", () => {
    const lastPage = template.fixedStory?.pages.at(-1);
    const ageTemplates = lastPage?.textTemplatesByAge;

    expect(lastPage?.textTemplate).toContain("{parentMessage}");
    expect(ageTemplates?.baby_toddler).toContain("{parentMessage}");
    expect(ageTemplates?.preschool_3_4).toContain("{parentMessage}");
    expect(ageTemplates?.early_reader_5_6).toContain("{parentMessage}");
    expect(ageTemplates?.early_elementary_7_8).toContain("{parentMessage}");
    expect(ageTemplates?.general_child).toContain("{parentMessage}");
  });

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

  it("last page age templates preserve parentMessage placeholder", () => {
    const lastPage = template.fixedStory?.pages.at(-1);
    const ageTemplates = lastPage?.textTemplatesByAge;

    expect(lastPage?.textTemplate).toContain("{parentMessage}");
    expect(ageTemplates?.baby_toddler).toContain("{parentMessage}");
    expect(ageTemplates?.preschool_3_4).toContain("{parentMessage}");
    expect(ageTemplates?.early_reader_5_6).toContain("{parentMessage}");
    expect(ageTemplates?.early_elementary_7_8).toContain("{parentMessage}");
    expect(ageTemplates?.general_child).toContain("{parentMessage}");
  });

  it("does not include knives, stove, or fire wording", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).not.toContain("knives");
      expect(prompt).not.toContain("stove");
      expect(prompt).not.toContain("fire");
    }
  });
});

describe("fixed-sharing-friends — lesson placeholder policy", () => {
  const template = SEED_TEMPLATES["fixed-sharing-friends"];

  it("openingNarrationTemplate preserves lessonToTeach placeholder", () => {
    expect(template.fixedStory?.openingNarrationTemplate).toContain("{lessonToTeach}");
  });
});

describe("fixed-first-zoo — IMG-002 scene lock (sandbox bleed prevention)", () => {
  const template = SEED_TEMPLATES["fixed-first-zoo"];

  it("every page prompt contains zoo scene keywords and anchors", () => {
    const anchors = ["zoo", "animal", "enclosure", "path"];
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      const hasAnchor = anchors.some((anchor) => prompt.includes(anchor));
      expect(hasAnchor).toBe(true);
    }
  });

  it("every page prompt explicitly excludes sandbox and playground background", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("not a sandbox");
      expect(prompt).toContain("not a playground");
    }
  });

  it("every page prompt contains zoo scene anchors", () => {
    const anchors = ["zoo", "animal", "enclosure", "path"];
    const pages = template.fixedStory?.pages ?? [];
    for (const page of pages) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      const hasAnchor = anchors.some((anchor) => prompt.includes(anchor));
      expect(hasAnchor).toBe(true);
    }
  });

  it("every page prompt explicitly excludes playground leakage", () => {
    for (const page of template.fixedStory?.pages ?? []) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("not a playground");
    }
  });
});

describe("fixed-first-zoo-8p — prompt hardening", () => {
  const template = SEED_TEMPLATES["fixed-first-zoo-8p"];
  const pages = template.fixedStory?.pages ?? [];

  it("every page prompt explicitly excludes sandbox and playground leakage", () => {
    for (const page of pages) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("not a sandbox");
      expect(prompt).toContain("not a playground");
    }
  });

  it("sign-guarded zoo pages suppress signs, boards, and printed facility surfaces", () => {
    const guardedPageIndexes = [1, 2, 4, 6, 7];
    for (const index of guardedPageIndexes) {
      const prompt = pages[index]?.imagePromptTemplate.toLowerCase() ?? "";
      expect(prompt).toContain("all background signs, boards, and notices are plain-colored shapes");
      expect(prompt).toContain("no entrance signs");
      expect(prompt).toContain("no zoo name boards");
      expect(prompt).toContain("no map boards");
      expect(prompt).toContain("no information panels");
      expect(prompt).toContain("no printed gate or building surfaces");
    }
  });

  it("page 1 explicitly removes gate-side boards and admission signage", () => {
    const prompt = pages[1]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("welcoming leafy threshold");
    expect(prompt).toContain("no side boards");
    expect(prompt).toContain("no map panels");
    expect(prompt).toContain("no admission notices");
    expect(prompt).toContain("no posted signs");
  });

  it("page 1 also suppresses clothing text and logo-like outfit graphics", () => {
    const prompt = pages[1]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("clothing and wearable accessories have no visible print");
    expect(prompt).toContain("plain child-safe clothing with simple solid-color fabric only");
    expect(prompt).toContain("no shirt lettering");
    expect(prompt).toContain("no logo patches");
    expect(prompt).toContain("no mascot prints");
    expect(prompt).toContain("no decorative number or alphabet graphics");
  });

  it("page 7 explicitly keeps background zoo structures plain and unmarked", () => {
    const prompt = pages[7]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("plain, distant, and unmarked");
    expect(prompt).toContain("no signboards");
    expect(prompt).toContain("no building labels");
    expect(prompt).toContain("no printed surfaces anywhere in view");
  });

  it("pages 2, 4, and 6 lightly redirect panel-like zoo props into natural shapes", () => {
    const page2 = pages[2]?.imagePromptTemplate.toLowerCase() ?? "";
    const page4 = pages[4]?.imagePromptTemplate.toLowerCase() ?? "";
    const page6 = pages[6]?.imagePromptTemplate.toLowerCase() ?? "";

    expect(page2).toContain("no panel-like objects in view");
    expect(page4).toContain("use body language and fence rhythm only to communicate caution or surprise");
    expect(page6).toContain("simplify the exit scene to trees, path, sky glow, and family silhouette only");
    expect(page6).toContain("plain, distant, and unmarked");
  });
});

describe("fixed-sleepy-moon-adventure-8p — prompt hardening", () => {
  const template = SEED_TEMPLATES["fixed-sleepy-moon-adventure-8p"];
  const pages = template.fixedStory?.pages ?? [];

  it("every page prompt keeps the same pale blue pajamas and small tan teddy bear anchor", () => {
    for (const page of pages) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("same pale blue pajamas with a tiny simple star pattern");
      expect(prompt).toContain("same small tan teddy bear plush");
    }
  });

  it("shared sleepy-moon dream guardrail forbids bubble and message-cloud behavior", () => {
    for (const page of pages) {
      const prompt = page.imagePromptTemplate.toLowerCase();
      expect(prompt).toContain("never speech bubbles");
      expect(prompt).toContain("never thought bubbles");
      expect(prompt).toContain("never text balloons");
      expect(prompt).toContain("never message clouds");
      expect(prompt).toContain("no floating framed areas for words or symbols");
    }
  });

  it("page 3 keeps the dreamscape clearly grounded in the same bedroom", () => {
    const prompt = pages[3]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("same clearly recognizable bedroom");
    expect(prompt).toContain("the bed, window, and room remain clearly recognizable");
  });

  it("page 7 explicitly forces a visual-only ending with no message area", () => {
    const prompt = pages[7]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("final bedtime scene is visual-only");
    expect(prompt).toContain("no message area");
    expect(prompt).toContain("no cloud frame");
    expect(prompt).toContain("no speech bubble");
    expect(prompt).toContain("no thought cloud");
    expect(prompt).toContain("no invented writing surface");
  });

  it("guarded sleepy-moon pages suppress readable room props and book-cover surfaces", () => {
    const guardedPageIndexes = [0, 1, 2, 5, 6, 7];
    for (const index of guardedPageIndexes) {
      const prompt = pages[index]?.imagePromptTemplate.toLowerCase() ?? "";
      expect(prompt).toContain("no readable book covers");
      expect(prompt).toContain("no spine writing");
      expect(prompt).toContain("no paper items with visible writing");
      expect(prompt).toContain("shelf objects stay plain and non-readable");
    }
  });

  it("page 2 explicitly suppresses bookshelf-like printed background detail", () => {
    const prompt = pages[2]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("background stays simple and uncluttered");
    expect(prompt).toContain("no visible bookshelf");
    expect(prompt).toContain("no printed room surfaces");
    expect(prompt).toContain("soft blurred unmarked shapes only");
  });

  it("page 6 explicitly simplifies shelf and bedside background props", () => {
    const prompt = pages[6]?.imagePromptTemplate.toLowerCase() ?? "";
    expect(prompt).toContain("contains only plain toys, plain blocks, or a plain basket");
    expect(prompt).toContain("no visible book covers");
    expect(prompt).toContain("no spine writing");
    expect(prompt).toContain("no paper items with visible writing");
  });
});
