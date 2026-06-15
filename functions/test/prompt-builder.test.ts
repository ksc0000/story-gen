import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, buildImagePrompt, buildCoverImagePrompt, buildP5SimplifiedPagePrompt, buildVisualContinuityGuard, buildStarCharacterGuard, getStyleReferenceImagePath } from "../src/lib/prompt-builder";
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
    expect(result).toContain("coverImagePrompt には、主人公の服装とシグネチャアイテムを必ず反映してください");
    expect(result).toContain("coverImagePrompt で主人公の服装を新たに創作しないでください");
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
    expect(result).toContain("特に低年齢（0-4歳）向けでは、ひらがなを主体にし、難しい漢字は一切使用しないでください。");
    expect(result).toContain("日本語の読みやすさ: 子どもが自分で読んだり、親が読み聞かせたりしやすいよう、ひらがな主体の読みやすい日本語を優先してください。");
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
    expect(result).toContain("pageVisualRole が payoff または quiet_ending のページでは、主人公を必ず画面内に存在させてください");
  });

  it("includes protagonist name prohibition rule when childName is provided", () => {
    const input = { childName: "だいちくん" };
    const result = buildSystemPrompt(mockTemplate, "watercolor", undefined, input);
    expect(result).toContain("主人公の名前は必ず「だいちくん」を使ってください。");
    expect(result).toContain("他の名前（たっちゃん、はなちゃん、けんくん など）に変えることは絶対に禁止です。");
    expect(result).toContain("title・storyGoal・openingNarration・titleSpreadText・pages[].text のすべてで同じ名前を一貫して使ってください。");
  });

  it("includes placeholder name prohibition rule when childName is NOT provided", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("主人公の名前は必ず「{childName}」を使ってください。");
  });

  // P4-7: field type contract tests
  it("includes explicit mainQuestObject string-only type contract (P4-7)", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("mainQuestObject must be a plain string, not an array or object");
    expect(result).toContain("join them into one concise Japanese string");
  });
  it("includes mainQuestObject invalid/valid examples (P4-7)", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    // Invalid example: array syntax should appear as the bad pattern to avoid
    expect(result).toContain('"mainQuestObject": ["鍵", "地図"]');
    // Valid example: plain string
    expect(result).toContain('"mainQuestObject": "鍵と地図"');
  });
  it("includes forbiddenQuestObjects array type contract (P4-7)", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("forbiddenQuestObjects must be an array of strings, not a single string");
  });
  it("includes pages text and imagePrompt string type contract (P4-7)", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("pages[].text must be a string, not an array or object");
    expect(result).toContain("pages[].imagePrompt must be a string, not an array or object");
  });
  it("field type contract does not instruct to output arrays for mainQuestObject (P4-7)", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    // The contract must not contain any instruction that would encourage array output
    // It must only show the array as the INVALID example pattern
    expect(result).toContain("not an array or object");
  });
  it("includes forbiddenQuestObjects scope clarification (P5-fix)", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("forbiddenQuestObjects は「クエストの探し物・目標物にしてはいけないもの」のみを入れてください。");
    expect(result).toContain("主人公の signatureItem・好きなもの（favorites）・服装・colorMood は forbiddenQuestObjects に含めてはいけません。");
    expect(result).toContain("主人公が MacBook を持っていても「パソコン」「MacBook」を forbiddenQuestObjects に入れてはいけません。");
  });
  it("includes secondary character consistency rules", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("cast に定義されたキャラクターは、登場するすべてのページで visualBible に記述された見た目を守ってください。");
    expect(result).toContain("主人公以外のキャラクターも、体の大きさ・色・特徴的なアイテムをページ間で統一してください。");
    expect(result).toContain("imagePrompt に cast キャラクターを登場させる場合は、そのキャラクターの visualBible の要点（色、体格、特徴）を imagePrompt 内に必ず反映してください。");
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
      'A scene with a sign that says "hello", a poster, a banner, and 「だいじょうぶ、いっしょにいるよ」',
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

    // We verify the scene description part specifically because the negative guardrails
    // will correctly contain these keywords.
    const scenePart = result.match(/Scene: ([^,]*)/)?.[1] || "";
    expect(scenePart).not.toContain("poster");
    expect(scenePart).not.toContain("banner");
    expect(scenePart).not.toContain("sign");
  });
  it("includes protagonist presence requirement for payoff and quiet_ending roles", () => {
    const payoffResult = buildImagePrompt("A child finds the star", "watercolor", undefined, undefined, {
      pageVisualRole: "payoff",
    });
    expect(payoffResult).toContain("The protagonist must be present to show their reaction and achievement");
    expect(payoffResult).toContain("Do not show only objects or backgrounds");

    const quietEndingResult = buildImagePrompt("The child sleeps", "watercolor", undefined, undefined, {
      pageVisualRole: "quiet_ending",
    });
    expect(quietEndingResult).toContain("The protagonist must be present to provide a sense of closure");
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
  it("does NOT include cast descriptions when appearingCharacterIds is undefined (regression guard)", () => {
    const result = buildImagePrompt(
      "A scene with potential cast members",
      "watercolor",
      undefined,
      undefined,
      {
        appearingCharacterIds: undefined,
        cast: [
          {
            characterId: "magic_friend_01",
            displayName: "ひかりのともだち",
            role: "magical_friend",
            visualBible: "small glowing golden spirit child",
          },
        ],
      }
    );
    expect(result).not.toContain("Recurring character consistency");
    expect(result).not.toContain("small glowing golden spirit child");
    expect(result).not.toContain("Do not redesign recurring characters");
  });
  it("strips conflicting scene elements but does NOT inject the avatar prompt's style/background/composition into the page", () => {
    // Realistic childProfileBasePrompt = the avatar-generation prompt. It carries
    // avatar-specific style/background/composition directives that must NOT leak
    // into story pages (they caused per-page style + background inconsistency).
    const avatarBasePrompt = [
      "Create a non-photorealistic Japanese storybook illustration of a preschool protagonist.",
      "Use a clean white background with no scenery, no environmental details, and no location. Do not include playground equipment. Do not include buildings, roads, signs.",
      "Use a front-facing, eye-level, medium-distance, almost full-body composition.",
      "Keep the composition simple and repeatable so the character can be reused consistently in future storybook pages.",
      "Illustration style: soft watercolor, pale hand-painted colors, airy edges, calm picture book finish.",
      "Name or nickname: はるくん",
      "Age impression: about 2 years old",
      "Color mood: やさしいパステル",
    ].join("\n");

    const result = buildImagePrompt(
      "A child near a red slide in a sandbox park scene",
      "toy_3d",
      "Approved child profile: same child with a blue sky t-shirt.",
      undefined,
      {
        childProfileBasePrompt: avatarBasePrompt,
        scenePolicy: {
          backgroundMode: "fixed",
        },
      }
    );

    // Scene-level conflicting element is still stripped from the scene.
    expect(result).not.toContain("red slide");
    // Character identity is preserved.
    expect(result).toContain("はるくん");
    // Avatar-specific style/background/composition directives must NOT leak in.
    expect(result).not.toContain("soft watercolor");
    expect(result).not.toContain("Color mood:");
    expect(result).not.toContain("clean white background");
    expect(result).not.toContain("almost full-body composition");
    expect(result).not.toContain("character can be reused consistently");
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
    expect(buildImagePrompt("A birthday scene", "crayon")).toContain("crayon storybook masterpiece");
    expect(buildImagePrompt("A birthday scene", "crayon")).toContain("waxy crayon strokes");
  });
  it("uses the style bible for style control instead of mentioning preview references", () => {
    const result = buildImagePrompt("A birthday scene", "toy_3d");
    expect(result).toContain("Illustration style:");
    expect(result).toContain("rounded 3D toy storybook masterpiece");
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

  describe("buildCoverImagePrompt", () => {
    it("includes cover-specific masterpiece and composition guidance", () => {
      const result = buildCoverImagePrompt("A child and a dragon", "watercolor", "child bible", "style bible", {});
      expect(result).toContain("Book cover:");
      expect(result).toContain("Book cover composition:");
      expect(result).toContain("striking focal point");
      expect(result).toContain("iconic masterpiece framing");
      expect(result).toContain("masterpiece quality");
    });

    it("prioritizes composition and style at the beginning", () => {
      const result = buildCoverImagePrompt("A child and a dragon", "watercolor", "child bible", "style bible", {});
      // Use a more robust check that doesn't rely on splitting by comma, as segments themselves contain commas
      expect(result.indexOf("Book cover:")).toBeLessThan(result.indexOf("Book cover composition:"));
      expect(result.indexOf("Book cover composition:")).toBeLessThan(result.indexOf("Illustration style:"));
    });

    it("includes scene description after style and composition", () => {
      const result = buildCoverImagePrompt("A child and a dragon", "watercolor", "child bible", "style bible", {});
      expect(result).toContain("Scene: A child and a dragon");
      const sceneIndex = result.indexOf("Scene:");
      const compIndex = result.indexOf("Book cover composition:");
      const styleIndex = result.indexOf("Illustration style:");
      expect(compIndex).toBeLessThan(sceneIndex);
      expect(styleIndex).toBeLessThan(sceneIndex);
    });

    it("sanitizes text from baseCoverPrompt", () => {
      const result = buildCoverImagePrompt('A scene with a sign that says "Happy Birthday!"', "watercolor", "child bible", "style bible", {});
      const scenePart = result.match(/Scene: ([^,]*)/)?.[1] || "";
      expect(scenePart).not.toContain("Happy Birthday!");
      expect(scenePart).not.toContain("sign");
    });
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

describe("buildVisualContinuityGuard (P5-3g/P5-3h/P5-3j)", () => {
  it("always includes style consistency guard", () => {
    const result = buildVisualContinuityGuard({ hasAnimalCharacters: false });
    expect(result).toContain("Style consistency:");
    expect(result).toContain("color palette, line weight");
    expect(result).toContain("consistent artist throughout");
    expect(result).toContain("Do not shift style or character scale between pages");
  });
  it("always includes object grounding guard", () => {
    const result = buildVisualContinuityGuard({ hasAnimalCharacters: false });
    expect(result).toContain("Object grounding:");
    expect(result).toContain("unexplained glowing items");
    expect(result).toContain("story names them");
  });
  it("includes animal character consistency when hasAnimalCharacters is true", () => {
    const result = buildVisualContinuityGuard({ hasAnimalCharacters: true });
    expect(result).toContain("Animal character consistency:");
    expect(result).toContain("same appearance, size, and expression across pages");
    expect(result).toContain("Do not redesign, duplicate, or add extra animal companions");
    expect(result).toContain("beyond what the scene requires");
  });
  it("includes child-animal boundary guard when hasAnimalCharacters is true", () => {
    const result = buildVisualContinuityGuard({ hasAnimalCharacters: true });
    expect(result).toContain("Child-animal boundary:");
    expect(result).toContain("fully human child on every page");
    expect(result).toContain("no animal features, costume, or body parts");
    expect(result).toContain("separate companions beside the child");
    expect(result).toContain("never merged with the child's body");
  });
  it("does not include animal-specific text when hasAnimalCharacters is false", () => {
    const result = buildVisualContinuityGuard({ hasAnimalCharacters: false });
    expect(result).not.toContain("Child-animal boundary:");
    expect(result).not.toContain("Animal character consistency:");
    expect(result).not.toContain("no animal features, costume, or body parts");
    expect(result).not.toContain("add extra animal companions");
  });
});

describe("buildImagePrompt visual continuity guard injection (P5-3g/P5-3h/P5-3j)", () => {
  it("injects style consistency guard into normal page prompt", () => {
    const result = buildImagePrompt("A child in a forest", "watercolor");
    expect(result).toContain("Style consistency:");
    expect(result).toContain("color palette, line weight");
    expect(result).toContain("consistent artist throughout");
  });
  it("injects object grounding guard into normal page prompt", () => {
    const result = buildImagePrompt("A child in a forest", "watercolor");
    expect(result).toContain("Object grounding:");
    expect(result).toContain("unexplained glowing items");
  });
  it("injects animal guards when categoryGroupId is animals", () => {
    const result = buildImagePrompt(
      "A child with a fox in a forest",
      "watercolor",
      undefined,
      undefined,
      { categoryGroupId: "animals" }
    );
    expect(result).toContain("Animal character consistency:");
    expect(result).toContain("Child-animal boundary:");
    expect(result).toContain("add extra animal companions");
  });
  it("injects animal guards when hasAnimalCharacters is explicitly true", () => {
    const result = buildImagePrompt(
      "A child with a bear companion",
      "crayon",
      undefined,
      undefined,
      { hasAnimalCharacters: true }
    );
    expect(result).toContain("Animal character consistency:");
    expect(result).toContain("Child-animal boundary:");
  });
  it("injects child-human and no-animal-features rules for animals theme", () => {
    const result = buildImagePrompt(
      "A child walks with a fox in a meadow",
      "classic_picture_book",
      undefined,
      undefined,
      { hasAnimalCharacters: true }
    );
    expect(result).toContain("fully human child on every page");
    expect(result).toContain("no animal features, costume, or body parts");
    expect(result).toContain("never merged with the child's body");
  });
  it("injects recurring animal consistency and no-extra-cast rule for animals theme", () => {
    const result = buildImagePrompt(
      "A child and a bear explore a forest",
      "watercolor",
      undefined,
      undefined,
      { hasAnimalCharacters: true }
    );
    expect(result).toContain("Do not redesign, duplicate, or add extra animal companions");
    expect(result).toContain("beyond what the scene requires");
  });
  it("does not inject animal-specific guards for non-animal themes", () => {
    const result = buildImagePrompt(
      "A child at a birthday party",
      "watercolor",
      undefined,
      undefined,
      { categoryGroupId: "seasonal-events" }
    );
    expect(result).not.toContain("Child-animal boundary:");
    expect(result).not.toContain("Animal character consistency:");
    expect(result).not.toContain("no animal features, costume, or body parts");
    expect(result).not.toContain("add extra animal companions");
    expect(result).toContain("Style consistency:");
    expect(result).toContain("Object grounding:");
  });
});

describe("buildP5SimplifiedPagePrompt visual continuity guard (P5-3g/P5-3h/P5-3j)", () => {
  it("includes style consistency guard in simplified prompt", () => {
    const result = buildP5SimplifiedPagePrompt("A child and a fox in a meadow", "watercolor");
    expect(result).toContain("Style consistency:");
    expect(result).toContain("consistent artist throughout");
  });
  it("includes object grounding guard in simplified prompt", () => {
    const result = buildP5SimplifiedPagePrompt("A child and a fox in a meadow", "watercolor");
    expect(result).toContain("Object grounding:");
    expect(result).toContain("unexplained glowing items");
  });
  it("includes animal guards in simplified prompt when hasAnimalCharacters is true", () => {
    const result = buildP5SimplifiedPagePrompt(
      "A child and a bear in the woods",
      "watercolor",
      { hasAnimalCharacters: true }
    );
    expect(result).toContain("Animal character consistency:");
    expect(result).toContain("Child-animal boundary:");
    expect(result).toContain("add extra animal companions");
  });
  it("includes child-human and no-animal-merge rules in simplified prompt for animals theme", () => {
    const result = buildP5SimplifiedPagePrompt(
      "A child and a fox walk through a forest",
      "classic_picture_book",
      { hasAnimalCharacters: true }
    );
    expect(result).toContain("fully human child on every page");
    expect(result).toContain("no animal features, costume, or body parts");
    expect(result).toContain("separate companions beside the child");
  });
  it("includes animal no-extra-cast rule in simplified prompt for animals theme", () => {
    const result = buildP5SimplifiedPagePrompt(
      "A child and a bear explore a forest",
      "watercolor",
      { hasAnimalCharacters: true }
    );
    expect(result).toContain("Do not redesign, duplicate, or add extra animal companions");
  });
  it("does not include animal-specific guards in simplified prompt when hasAnimalCharacters is false", () => {
    const result = buildP5SimplifiedPagePrompt("A child at a birthday party", "flat");
    expect(result).not.toContain("Child-animal boundary:");
    expect(result).not.toContain("Animal character consistency:");
    expect(result).not.toContain("no animal features, costume, or body parts");
    expect(result).not.toContain("add extra animal companions");
    expect(result).toContain("Style consistency:");
  });
});

// Star character shared cast fixture for P5-3i tests
const starCharacterCast = [
  {
    characterId: "star_01",
    displayName: "ほしのこ",
    role: "magical_friend" as const,
    visualBible: "a small star-shaped glowing creature with a round face, bright eyes, and tiny arms",
    characterKind: "magical_creature" as const,
    nonHuman: true,
    colorPalette: ["golden yellow", "soft white"],
  },
  {
    characterId: "dino_toy_01",
    displayName: "ダイナくん",
    role: "object_character" as const,
    visualBible: "a small green plush dinosaur toy with friendly eyes",
    characterKind: "object_character" as const,
  },
];

describe("buildStarCharacterGuard (P5-3i/P5-3j)", () => {
  it("returns a guard that defines the star character as an independent recurring character", () => {
    const result = buildStarCharacterGuard();
    expect(result).toContain("Star character:");
    expect(result).toContain("one independent recurring creature");
    expect(result).toContain("its own face, body, and expression");
  });
  it("prohibits star character from being a decoration, background star, or pattern", () => {
    const result = buildStarCharacterGuard();
    expect(result).toContain("not a decoration, background star, or pattern");
  });
  it("prohibits transforming favorite things (dinosaur) into the star character", () => {
    const result = buildStarCharacterGuard();
    expect(result).toContain("Do not transform any other character or favorite object, including a dinosaur, into the star character");
    expect(result).toContain("each must remain visually separate");
  });
  it("enforces continuity of shape, color, and face across pages", () => {
    const result = buildStarCharacterGuard();
    expect(result).toContain("same shape, color, and face across all pages");
  });
  it("prohibits multiple different star characters", () => {
    const result = buildStarCharacterGuard();
    expect(result).toContain("Do not create multiple different star characters");
  });
});

describe("buildImagePrompt star character guard injection (P5-3i/P5-3j)", () => {
  it("auto-detects star character from cast characterId and injects guard", () => {
    const result = buildImagePrompt(
      "A child plays with a star friend and a dinosaur toy in the garden",
      "classic_picture_book",
      undefined,
      undefined,
      { cast: starCharacterCast, appearingCharacterIds: ["star_01", "dino_toy_01"] }
    );
    expect(result).toContain("Star character:");
    expect(result).toContain("one independent recurring creature");
  });
  it("injects guard when hasStarCharacter is explicitly true", () => {
    const result = buildImagePrompt(
      "A child plays with a glowing star friend",
      "watercolor",
      undefined,
      undefined,
      { hasStarCharacter: true }
    );
    expect(result).toContain("Star character:");
    expect(result).toContain("not a decoration, background star, or pattern");
  });
  it("includes anti-dinosaur-merge rule when star character is detected", () => {
    const result = buildImagePrompt(
      "A child, a dinosaur toy, and a star friend share a picnic",
      "classic_picture_book",
      undefined,
      undefined,
      { cast: starCharacterCast, hasStarCharacter: true }
    );
    expect(result).toContain("Do not transform any other character or favorite object, including a dinosaur, into the star character");
    expect(result).toContain("each must remain visually separate");
  });
  it("does NOT inject star guard when cast contains no star character and option is not set", () => {
    const result = buildImagePrompt(
      "A child plays with a bunny in a garden",
      "watercolor",
      undefined,
      undefined,
      {
        cast: [
          {
            characterId: "bunny_01",
            displayName: "うさぎ",
            role: "animal" as const,
            visualBible: "a small white bunny with pink ears",
          },
        ],
      }
    );
    expect(result).not.toContain("Star character:");
    expect(result).not.toContain("independent recurring creature");
  });
  it("does NOT inject star guard when hasStarCharacter is explicitly false", () => {
    const result = buildImagePrompt(
      "A child at a birthday party",
      "watercolor",
      undefined,
      undefined,
      { hasStarCharacter: false }
    );
    expect(result).not.toContain("Star character:");
  });
  // Regression: animal guards and star guard coexist after P5-3j compression
  it("animal boundary guard and star character guard can coexist", () => {
    const result = buildImagePrompt(
      "A child, a fox, and a star friend walk through a forest",
      "classic_picture_book",
      undefined,
      undefined,
      { hasAnimalCharacters: true, hasStarCharacter: true }
    );
    expect(result).toContain("Child-animal boundary:");
    expect(result).toContain("Star character:");
    expect(result).toContain("fully human child on every page");
    expect(result).toContain("Do not transform any other character or favorite object, including a dinosaur");
  });
});

describe("buildP5SimplifiedPagePrompt star character guard (P5-3i/P5-3j)", () => {
  it("includes star guard in simplified prompt when hasStarCharacter is true", () => {
    const result = buildP5SimplifiedPagePrompt(
      "A child and a star friend play in a meadow",
      "classic_picture_book",
      { hasStarCharacter: true }
    );
    expect(result).toContain("Star character:");
    expect(result).toContain("one independent recurring creature");
    expect(result).toContain("including a dinosaur, into the star character");
  });
  it("does not include star guard in simplified prompt when hasStarCharacter is not set", () => {
    const result = buildP5SimplifiedPagePrompt(
      "A child runs through a garden",
      "watercolor"
    );
    expect(result).not.toContain("Star character:");
  });
});

// P5-3j: prompt length regression guard
describe("prompt length regression (P5-3j)", () => {
  const worstCaseCast = [
    {
      characterId: "star_01",
      displayName: "ほしのこ",
      role: "magical_friend" as const,
      visualBible: "a small star-shaped glowing creature with a round face, bright eyes, and tiny arms",
      characterKind: "magical_creature" as const,
      nonHuman: true,
      colorPalette: ["golden yellow", "soft white"],
    },
    {
      characterId: "dino_toy_01",
      displayName: "ダイナくん",
      role: "object_character" as const,
      visualBible: "a small green plush dinosaur toy with friendly eyes",
      characterKind: "object_character" as const,
    },
    {
      characterId: "fox_01",
      displayName: "キツネ",
      role: "animal" as const,
      visualBible: "a small orange fox with a fluffy tail and bright eyes",
      characterKind: "animal" as const,
      nonHuman: true,
    },
  ];

  it("worst-case prompt (animals + star + 3-char cast + style bible) stays under 7700 chars", () => {
    const result = buildImagePrompt(
      "A child walks with a fox and a glowing star friend through a sunlit meadow, carrying a dinosaur toy",
      "classic_picture_book",
      "Hikari: 4-year-old Japanese child, short black hair, yellow dress, bright eyes",
      "Warm classic watercolor storybook atmosphere, muted earth tones, painterly linework",
      {
        pageNumber: 3,
        hasAnimalCharacters: true,
        hasStarCharacter: true,
        cast: worstCaseCast,
        appearingCharacterIds: ["star_01", "dino_toy_01", "fox_01"],
        imageModelProfile: "pro_consistent",
        ageBand: "preschool_3_4",
        visualMotif: "golden star",
        hiddenDetail: "small ladybug on a leaf",
        compositionHint: "wide establishing shot from slightly above",
      }
    );
    expect(result.length).toBeLessThan(7700);
  });

  it("non-animals non-star prompt (base case) stays under 6000 chars", () => {
    const result = buildImagePrompt(
      "A child plays in a sunny garden with flowers",
      "watercolor",
      "same child with short black hair and a red bow",
      "soft watercolor picture book palette",
      { imageModelProfile: "pro_consistent", ageBand: "preschool_3_4" }
    );
    expect(result.length).toBeLessThan(6000);
  });
});
