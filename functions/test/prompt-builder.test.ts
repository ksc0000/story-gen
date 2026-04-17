import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, buildImagePrompt } from "../src/lib/prompt-builder";
import type { TemplateData, IllustrationStyle, PageCount } from "../src/lib/types";

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
    expect(result).toContain("pages");
    expect(result).toContain("imagePrompt");
  });
  it("includes style-specific illustration instruction", () => {
    expect(buildSystemPrompt(mockTemplate, "watercolor")).toContain("水彩画");
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
    }, 8);
    expect(result).toContain("さくら");
    expect(result).toContain("3");
    expect(result).toContain("うさぎ");
    expect(result).toContain("あいさつ");
    expect(result).toContain("おばあちゃんの家");
  });
  it("omits optional fields when not provided", () => {
    const result = buildUserPrompt({ childName: "ゆうた" }, 8);
    expect(result).not.toContain("年齢");
    expect(result).not.toContain("好きなもの");
  });
});

describe("buildImagePrompt", () => {
  it("includes the base prompt", () => {
    expect(buildImagePrompt("A child playing in a park", "watercolor")).toContain("A child playing in a park");
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
});
