import { describe, it, expect } from "vitest";
import { isFirstRun, getRecommendedTemplates, buildFirstRunBookPayload } from "@/lib/first-run";
import type { TemplateDoc, ChildProfileDoc } from "@/lib/types";

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

    it("returns false when loading or offline", () => {
      expect(isFirstRun(0, 0, { loading: true })).toBe(false);
      expect(isFirstRun(0, 0, { isOffline: true })).toBe(false);
      expect(isFirstRun(0, 0, { loading: true, isOffline: true })).toBe(false);
    });

    it("returns false when userProfile has firstBookCreatedAt or onboardingCompletedAt", () => {
      expect(
        isFirstRun(0, 0, {
          userProfile: { firstBookCreatedAt: 1700000000000 },
        })
      ).toBe(false);

      expect(
        isFirstRun(0, 0, {
          userProfile: { onboardingCompletedAt: 1700000000000 },
        })
      ).toBe(false);
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
        systemPrompt: "",
        active: true,
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
        systemPrompt: "",
        active: true,
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
        systemPrompt: "",
        active: true,
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
        systemPrompt: "",
        active: true,
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
        systemPrompt: "",
        active: true,
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
        systemPrompt: "",
        active: true,
        categoryGroupId: "favorite-worlds",
        order: 1,
        fixedStory: {
          titleTemplate: "テストのおはなし",
          pages: [
            { textTemplate: "Page 1", imagePromptTemplate: "Prompt 1" },
            { textTemplate: "Page 2", imagePromptTemplate: "Prompt 2" },
            { textTemplate: "Page 3", imagePromptTemplate: "Prompt 3" },
            { textTemplate: "Page 4", imagePromptTemplate: "Prompt 4" },
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
          // buildFirstRunBookPayload が参照するのは id/表示名/年齢/favoriteThings のみ。
          // ChildProfileDoc 全体を組むとテストの意図が埋もれるため部分フィクスチャとする。
        } as unknown as ChildProfileDoc & { id: string },
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

  describe("buildFirstRunBookPayload: 年齢0歳（回帰）", () => {
    it("age が 0 でも childAge を落とさない", () => {
      const template = {
        id: "t", name: "T", description: "", icon: "📕", creationMode: "fixed_template", systemPrompt: "", active: true,
        categoryGroupId: "favorite-worlds", order: 1,
        fixedStory: { titleTemplate: "x", pages: [{ textTemplate: "a", imagePromptTemplate: "b" }] },
      } as unknown as TemplateDoc & { id: string };
      const payload = buildFirstRunBookPayload({
        userId: "u",
        child: { id: "c", displayName: "あか", age: 0, personality: {} } as unknown as ChildProfileDoc & { id: string },
        template,
      }) as { input?: { childAge?: number } };
      expect(payload.input?.childAge).toBe(0);
    });
  });
});
