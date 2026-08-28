import { describe, it, expect } from "vitest";
import { isFirstRun, getRecommendedTemplates, buildFirstRunBookPayload } from "@/lib/first-run";
import type { TemplateDoc } from "@/lib/types";

describe("first-run logic", () => {
  describe("isFirstRun", () => {
    it("returns true when books is 0 and children is 0 or 1", () => {
      expect(isFirstRun(0, 0)).toBe(true);
      expect(isFirstRun(0, 1)).toBe(true);
    });

    it("returns false when user already has books or more than 1 child", () => {
      expect(isFirstRun(1, 0)).toBe(false);
      expect(isFirstRun(1, 1)).toBe(false);
      expect(isFirstRun(0, 2)).toBe(false);
    });
  });

  describe("getRecommendedTemplates", () => {
    const mockTemplates: (TemplateDoc & { id: string })[] = [
      {
        id: "tpl-1",
        name: "Template 1",
        description: "Desc 1",
        icon: "📕",
        creationMode: "fixed_template",
        order: 3,
        recommendedAgeMin: 3,
        recommendedAgeMax: 4,
      },
      {
        id: "tpl-2",
        name: "Template 2",
        description: "Desc 2",
        icon: "📗",
        creationMode: "fixed_template",
        order: 1,
        recommendedAgeMin: 3,
        recommendedAgeMax: 6,
      },
      {
        id: "tpl-3",
        name: "Template 3",
        description: "Desc 3",
        icon: "📘",
        creationMode: "fixed_template",
        order: 2,
        recommendedAgeMin: 5,
        recommendedAgeMax: 8,
      },
      {
        id: "tpl-4",
        name: "Template 4",
        description: "Desc 4",
        icon: "📙",
        creationMode: "fixed_template",
        order: 4,
        recommendedAgeMin: 3,
        recommendedAgeMax: 4,
      },
      {
        id: "tpl-guided",
        name: "Guided AI",
        description: "Guided",
        icon: "✨",
        creationMode: "guided_ai",
        order: 0,
      },
    ];

    it("filters active fixed_templates, matches child age, and takes top 3 by order", () => {
      // Age 4: matches tpl-1 (order 3), tpl-2 (order 1), tpl-4 (order 4)
      const res = getRecommendedTemplates(mockTemplates, 4);
      expect(res.map((t) => t.id)).toEqual(["tpl-2", "tpl-1", "tpl-4"]);
    });

    it("falls back to all fixed_templates if no templates match age specifically", () => {
      const res = getRecommendedTemplates(mockTemplates, 10);
      expect(res.length).toBe(3);
      expect(res.map((t) => t.id)).toEqual(["tpl-2", "tpl-3", "tpl-1"]);
    });
  });

  describe("buildFirstRunBookPayload", () => {
    it("builds a correct payload for Track A generation with template default style", () => {
      const template: TemplateDoc & { id: string } = {
        id: "fixed-zoo-adventure",
        name: "Zoo",
        description: "Zoo desc",
        icon: "🦁",
        creationMode: "fixed_template",
        categoryGroupId: "favorite-worlds",
        fixedStory: {
          style: "soft_watercolor",
          pages: [
            { text: "Page 1", imagePrompt: "Prompt 1" },
            { text: "Page 2", imagePrompt: "Prompt 2" },
            { text: "Page 3", imagePrompt: "Prompt 3" },
            { text: "Page 4", imagePrompt: "Prompt 4" },
          ],
        },
      };

      const payload = buildFirstRunBookPayload({
        userId: "user-123",
        child: {
          id: "child-123",
          displayName: "Taro",
          nickname: "Taro-kun",
          age: 4,
          personality: { favoriteThings: ["dinosaur"] },
        },
        template,
      });

      expect(payload.userId).toBe("user-123");
      expect(payload.childId).toBe("child-123");
      expect(payload.creationMode).toBe("fixed_template");
      expect(payload.theme).toBe("fixed-zoo-adventure");
      expect(payload.style).toBe("soft_watercolor");
      expect(payload.pageCount).toBe(4);
      expect(payload.input.childName).toBe("Taro-kun");
      expect(payload.input.childAge).toBe(4);
    });
  });
});
