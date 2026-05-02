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
    expect(buildImagePrompt("A birthday scene", "flat")).toContain("bright simple colors");
  });
  it("appends crayon style keywords", () => {
    expect(buildImagePrompt("A birthday scene", "crayon")).toContain("crayon pastel");
    expect(buildImagePrompt("A birthday scene", "crayon")).toContain("hand-drawn texture");
  });
  it("returns a style reference image path", () => {
    expect(getStyleReferenceImagePath("toy_3d")).toBe("/images/styles/toy_3d.png");
  });
});
