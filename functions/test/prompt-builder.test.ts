import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, buildImagePrompt, getStyleReferenceImagePath } from "../src/lib/prompt-builder";
import type { TemplateData } from "../src/lib/types";

const mockTemplate: TemplateData = {
  name: "おたんじょうび", description: "主人公の誕生日パーティーの冒険",
  icon: "🎂", order: 1,
  systemPrompt: "あなたは子ども向け絵本の作家です。主人公の誕生日をテーマにした心温まる物語を作ってください。",
  active: true,
};

describe("buildSystemPrompt", () => {
  it("includes template system prompt", () => {
    expect(buildSystemPrompt(mockTemplate, "watercolor")).toContain("誕生日をテーマにした");
  });
  it("includes safety instruction", () => {
    expect(buildSystemPrompt(mockTemplate, "watercolor")).toContain("子ども向けの安全な内容");
  });
  it("includes JSON output format instruction", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("JSON");
    expect(result).toContain("title");
    expect(result).toContain("characterBible");
    expect(result).toContain("styleBible");
    expect(result).toContain("pages");
    expect(result).toContain("imagePrompt");
  });
  it("includes style-specific illustration instruction", () => {
    expect(buildSystemPrompt(mockTemplate, "soft_watercolor")).toContain("水彩");
  });
  it("includes image prompt variety guidance", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("wide shot / medium shot / close-up / detail shot / bird's-eye view");
    expect(result).toContain("背景、物、家族、友だち、動物、サブキャラクター");
    expect(result).toContain("そのページで何を一番見せたいか");
  });
  it("explains that imagePrompt is for wordless illustrations only", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("pages[].imagePrompt is only for generating a wordless illustration");
    expect(result).toContain("Never ask the image model to render the story text");
    expect(result).toContain('"pageVisualRole": "opening_establishing"');
    expect(result).toContain("pageVisualRole must be exactly one of");
    expect(result).toContain("Do not invent other pageVisualRole values");
    expect(result).toContain("Use snake_case exactly");
  });
  it("includes Japanese story quality rules and examples", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("3歳以上では、単なる音遊びや擬音の羅列にしない");
    expect(result).toContain("意味の通らない造語を使わない");
    expect(result).toContain("日本語として自然な文にしてください");
    expect(result).toContain("悪い例");
    expect(result).toContain("良い例");
    expect(result).toContain("cast");
    expect(result).toContain("appearingCharacterIds");
    expect(result).toContain("focusCharacterId");
    expect(result).toContain("storyGoal");
    expect(result).toContain("mainQuestObject");
    expect(result).toContain("forbiddenQuestObjects");
    expect(result).toContain("hiddenDetail や背景小物を、物語の主目的にしてはいけません");
    expect(result).toContain("opening_establishing:");
    expect(result).toContain("action:");
    expect(result).toContain("quiet_ending:");
  });
});

describe("buildUserPrompt", () => {
  it("includes child name", () => {
    expect(buildUserPrompt({ childName: "ゆうた" }, 8)).toContain("ゆうた");
  });
  it("includes page count", () => {
    expect(buildUserPrompt({ childName: "ゆうた" }, 4)).toContain("4");
  });
  it("includes optional fields when provided", () => {
    const result = buildUserPrompt({
      childName: "さくら", childAge: 3, favorites: "うさぎ",
      lessonToTeach: "あいさつ", memoryToRecreate: "おばあちゃんの家",
      characterLook: "短い黒髪", signatureItem: "黄色い帽子", colorMood: "星空みたいな青",
    }, 8);
    expect(result).toContain("さくら");
    expect(result).toContain("3");
    expect(result).toContain("うさぎ");
    expect(result).toContain("あいさつ");
    expect(result).toContain("おばあちゃんの家");
    expect(result).toContain("短い黒髪");
    expect(result).toContain("黄色い帽子");
    expect(result).toContain("星空みたいな青");
  });
  it("omits optional fields when not provided", () => {
    const result = buildUserPrompt({ childName: "ゆうた" }, 8);
    expect(result).not.toContain("年齢");
    expect(result).not.toContain("好きなもの");
  });
});

describe("buildImagePrompt", () => {
  it("includes the base prompt", () => {
    expect(buildImagePrompt("A child playing in a park", "watercolor")).toContain("Scene: A child playing in a park");
  });
  it("includes consistency bibles when provided", () => {
    const result = buildImagePrompt("A child at a party", "watercolor", "same yellow hat", "same paper texture");
    expect(result).toContain("same yellow hat");
    expect(result).toContain("same paper texture");
    expect(result).toContain("same child character across all pages");
  });
  it("includes visual storytelling rules", () => {
    const result = buildImagePrompt("A child at a party", "watercolor");
    expect(result).toContain("not a character portrait");
    expect(result).toContain("Do not center the protagonist on every page");
    expect(result).toContain("wide shots");
    expect(result).toContain("bird's-eye views");
    expect(result).toContain("secondary characters");
  });
  it("adds a wordless picture book instruction and blocks written elements", () => {
    const result = buildImagePrompt("A child at a party", "watercolor");
    expect(result).toContain("wordless picture book illustration");
    expect(result).toContain("no speech bubbles");
    expect(result).toContain("no labels");
    expect(result).toContain("no signage");
    expect(result).toContain("Use purely visual storytelling");
  });
  it("uses pageVisualRole guidance and sanitizes risky text-like prompt content", () => {
    const result = buildImagePrompt(
      'A scene with a sign that says "hello" and 「だいじょうぶ、いっしょにいるよ」',
      "watercolor",
      undefined,
      undefined,
      {
        pageVisualRole: "object_detail",
        visualMotifUsage: "yellow star phrase label",
        hiddenDetail: "small bird near a caption card",
      }
    );
    expect(result).toContain("Page visual role: object_detail");
    expect(result).not.toContain("だいじょうぶ、いっしょにいるよ");
    expect(result).not.toContain('"hello"');
    expect(result).not.toContain("caption card");
    expect(result).not.toContain("phrase label");
  });
  it("includes recurring cast character consistency only for appearing characters", () => {
    const result = buildImagePrompt(
      "A magical friend appears in a park",
      "watercolor",
      undefined,
      undefined,
      {
        appearingCharacterIds: ["magic_friend_01"],
        focusCharacterId: "magic_friend_01",
        cast: [
          {
            characterId: "magic_friend_01",
            displayName: "ひかりのともだち",
            role: "magical_friend",
            visualBible: "small glowing golden spirit child with a tiny purple top hat",
            signatureItems: ["tiny purple top hat", "gold star necklace"],
            doNotChange: ["Do not remove the tiny purple top hat"],
          },
          {
            characterId: "animal_01",
            displayName: "ことり",
            role: "animal",
            visualBible: "small blue bird",
          },
        ],
      }
    );
    expect(result).toContain("Recurring character consistency: magic_friend_01");
    expect(result).toContain("Do not redesign recurring characters");
    expect(result).toContain("tiny purple top hat");
    expect(result).not.toContain("small blue bird");
  });
  it("respects child profile sandbox constraints and strips conflicting playground equipment from the scene", () => {
    const result = buildImagePrompt(
      "A child near a red slide in a sandbox park scene",
      "watercolor",
      "Approved child profile: same child with a blue sky t-shirt.",
      undefined,
      {
        childProfileBasePrompt:
          "Background must always be quiet Japanese neighborhood park. Include square sandbox. Do not include playground equipment. Do not include buildings, roads, signs.",
        scenePolicy: {
          backgroundMode: "fixed",
        },
      }
    );

    expect(result).toContain("Respect the child profile background constraints");
    expect(result).toContain("do not add slides, swings, playground equipment");
    expect(result).not.toContain("red slide");
  });
  it("does not carry fixed background rules into story_flexible prompts", () => {
    const result = buildImagePrompt(
      "A child near a red slide in a sandbox park scene",
      "watercolor",
      "same child with a blue sky t-shirt and green dinosaur toy",
      undefined,
      {
        childProfileBasePrompt:
          "Background must always be quiet Japanese neighborhood park. Include square sandbox. Do not include playground equipment. Do not include buildings, roads, signs.",
        scenePolicy: {
          backgroundMode: "story_flexible",
        },
      }
    );

    expect(result).toContain("Scene setting rules: choose a setting that naturally supports this page's story beat");
    expect(result).toContain("red slide");
    expect(result).not.toContain("Respect the child profile background constraints");
    expect(result).not.toContain("Do not include playground equipment");
  });
  it("keeps character consistency details even when the background is story_flexible", () => {
    const result = buildImagePrompt(
      "A child exploring a park path",
      "watercolor",
      "same child with short black hair, blue sky t-shirt, and green dinosaur toy",
      undefined,
      {
        scenePolicy: {
          backgroundMode: "story_flexible",
        },
      }
    );

    expect(result).toContain("blue sky t-shirt");
    expect(result).toContain("green dinosaur toy");
    expect(result).toContain("same child character across all pages");
  });
  it("appends safety keywords", () => {
    const result = buildImagePrompt("A child at a party", "flat");
    expect(result).toContain("safe for children");
    expect(result).toContain("family friendly");
  });
  it("appends watercolor style keywords", () => {
    expect(buildImagePrompt("A birthday scene", "watercolor")).toContain("watercolor");
    expect(buildImagePrompt("A birthday scene", "watercolor")).toContain("soft warm colors");
  });
  it("appends flat style keywords", () => {
    expect(buildImagePrompt("A birthday scene", "flat")).toContain("flat illustration");
    expect(buildImagePrompt("A birthday scene", "flat")).toContain("bright clean colors");
  });
  it("appends crayon style keywords", () => {
    expect(buildImagePrompt("A birthday scene", "crayon")).toContain("Crayon storybook style");
    expect(buildImagePrompt("A birthday scene", "crayon")).toContain("warm hand-drawn strokes");
  });
  it("uses the style bible for style control instead of mentioning preview references", () => {
    const result = buildImagePrompt("A birthday scene", "toy_3d");
    expect(result).toContain("Illustration style:");
    expect(result).toContain("Rounded 3D toy storybook style");
    expect(result).not.toContain("reference image");
  });
  it("adds shared printed-surface no-text guidance for non-fixed prompts", () => {
    const result = buildImagePrompt("A child reading before bed", "soft_watercolor");
    expect(result).toContain("Printed-surface guardrail:");
    expect(result).toContain("book covers");
    expect(result).toContain("book spines");
    expect(result).toContain("storage bins");
    expect(result).toContain("pseudo-writing");
  });
  it("adds bedtime-local bedroom-object no-text guidance only for bedtime categoryGroup", () => {
    const result = buildImagePrompt(
      "A sleepy child resting in a cozy bedroom",
      "soft_watercolor",
      undefined,
      undefined,
      {
        categoryGroupId: "bedtime",
      }
    );

    expect(result).toContain("Bedtime room-prop guardrail:");
    expect(result).toContain("nursery cards");
    expect(result).toContain("shelf labels");
    expect(result).toContain("printed packaging graphics");
  });
  it("does not add bedtime-local room guidance for non-bedtime categoryGroup", () => {
    const result = buildImagePrompt(
      "A child sharing cake with family",
      "soft_watercolor",
      undefined,
      undefined,
      {
        categoryGroupId: "seasonal-events",
      }
    );

    expect(result).toContain("Printed-surface guardrail:");
    expect(result).not.toContain("Bedtime room-prop guardrail:");
    expect(result).not.toContain("nursery cards");
  });
  it("adds imagination scene guardrail for imagination categoryGroup", () => {
    const result = buildImagePrompt(
      "A child exploring a magical forest",
      "crayon",
      undefined,
      undefined,
      {
        categoryGroupId: "imagination",
      }
    );

    expect(result).toContain("Imagination scene guardrail:");
    expect(result).toContain("rune carvings");
    expect(result).toContain("glyph patterns");
    expect(result).toContain("star chart annotations");
    expect(result).toContain("treasure map labels");
    expect(result).toContain("compass direction letters");
    expect(result).not.toContain("Bedtime room-prop guardrail:");
  });
  it("does not add imagination guardrail for non-imagination categoryGroup", () => {
    const result = buildImagePrompt(
      "A child at the beach",
      "crayon",
      undefined,
      undefined,
      {
        categoryGroupId: "memories",
      }
    );

    expect(result).toContain("Printed-surface guardrail:");
    expect(result).not.toContain("Imagination scene guardrail:");
  });
  it("includes fantasy imagePrompt rules in buildSystemPrompt", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("Fantasy and imagination imagePrompt rules:");
    expect(result).toContain("spell books");
    expect(result).toContain("rune stones or glyph carvings");
    expect(result).toContain("star charts with symbol annotations");
    expect(result).toContain("treasure maps with text labels");
  });
  it("returns a style reference image path", () => {
    expect(getStyleReferenceImagePath("toy_3d")).toBe("/images/styles/toy_3d.webp");
  });
  describe("L3 imagination regex sanitizer (T6-32)", () => {
    it("replaces 'star chart' with 'night sky' in compositionHint", () => {
      const result = buildImagePrompt(
        "A child in a forest",
        "crayon",
        undefined,
        undefined,
        { compositionHint: "The child studies a star chart spread on the ground" }
      );
      expect(result).not.toMatch(/\bstar charts?\b/i);
      expect(result).toContain("night sky");
    });
    it("replaces 'treasure map' with 'illustrated landscape' in compositionHint", () => {
      const result = buildImagePrompt(
        "A child in a cave",
        "crayon",
        undefined,
        undefined,
        { compositionHint: "A treasure map pinned to the wall" }
      );
      expect(result).not.toMatch(/\btreasure maps?\b/i);
      expect(result).toContain("illustrated landscape");
    });
    it("removes 'rune' and 'glyph' tokens from visualMotif", () => {
      const result = buildImagePrompt(
        "A child in a temple",
        "crayon",
        undefined,
        undefined,
        { visualMotif: "ancient runes carved into glowing glyphs" }
      );
      // The guardrail text itself uses "glyph patterns" / "rune carvings" as negative instructions,
      // so we only verify the user-provided visualMotif phrase is not reproduced verbatim.
      expect(result).not.toContain("ancient runes carved into glowing glyphs");
      // The Visual motif: section should not contain the raw tokens
      const motifSection = result.match(/Visual motif:.*?(?=\n|$)/)?.[0] ?? "";
      expect(motifSection).not.toMatch(/\brune[s]?\b/i);
      expect(motifSection).not.toMatch(/\bglyph[s]?\b/i);
    });
    it("removes 'inscription' token from hiddenDetail", () => {
      const result = buildImagePrompt(
        "A child near a pillar",
        "crayon",
        undefined,
        undefined,
        { hiddenDetail: "a small inscription on the stone" }
      );
      expect(result).not.toMatch(/\binscription[s]?\b/i);
    });
    it("replaces 'compass' with 'round object' in compositionHint", () => {
      const result = buildImagePrompt(
        "A child on a ship",
        "crayon",
        undefined,
        undefined,
        { compositionHint: "The child holds a brass compass" }
      );
      expect(result).not.toMatch(/\bcompass\b/i);
      expect(result).toContain("round object");
    });
    it("removes 'magical text' compound token from compositionHint", () => {
      const result = buildImagePrompt(
        "A wizard child",
        "crayon",
        undefined,
        undefined,
        { compositionHint: "swirling magical text surrounds the wand" }
      );
      expect(result).not.toMatch(/\bmagical\s+text\b/i);
    });
    it("preserves 'scroll' when not followed by 'with'", () => {
      const result = buildImagePrompt(
        "A child holding something",
        "crayon",
        undefined,
        undefined,
        { compositionHint: "the child holds a scroll in both hands" }
      );
      expect(result).toContain("scroll");
    });
  });
});
