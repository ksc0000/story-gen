import { describe, it, expect } from "vitest";
import {
  buildDefaultAiTemplate,
  isTemplateFreeCreationMode,
  DEFAULT_AI_TEMPLATE_ID,
} from "../src/lib/default-ai-template";

describe("default-ai-template", () => {
  it("fixed_template だけはテンプレート必須", () => {
    expect(isTemplateFreeCreationMode("guided_ai")).toBe(true);
    expect(isTemplateFreeCreationMode("original_ai")).toBe(true);
    expect(isTemplateFreeCreationMode("photo_story")).toBe(true);
    expect(isTemplateFreeCreationMode("fixed_template")).toBe(false);
    expect(isTemplateFreeCreationMode(undefined)).toBe(false);
    expect(isTemplateFreeCreationMode("")).toBe(false);
  });

  it.each(["guided_ai", "original_ai", "photo_story"] as const)(
    "%s の既定テンプレートは prompt-builder が必要とする項目を満たす",
    (mode) => {
      const t = buildDefaultAiTemplate(mode);
      expect(t.creationMode).toBe(mode);
      expect(t.systemPrompt.length).toBeGreaterThan(50);
      expect(t.systemPrompt).toContain("絵本");
      expect(t.name).toBeTruthy();
      expect(t.active).toBe(true);
      expect(t.fixedStory).toBeUndefined();
      expect(t.categoryGroupId).toBe("favorite-worlds");
    }
  );

  it("クライアントが書いた categoryGroupId を引き継ぐ（空文字は既定値）", () => {
    expect(buildDefaultAiTemplate("guided_ai", { categoryGroupId: "imagination" }).categoryGroupId).toBe("imagination");
    expect(buildDefaultAiTemplate("guided_ai", { categoryGroupId: "" }).categoryGroupId).toBe("favorite-worlds");
  });

  it("既定テンプレートIDはクライアントの分析イベントと同じ ai_custom", () => {
    expect(DEFAULT_AI_TEMPLATE_ID).toBe("ai_custom");
  });
});
