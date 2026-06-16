import { describe, it, expect } from "vitest";
import { buildCharacterBible, buildBasePrompt } from "./original-characters-utils";

describe("OriginalCharactersUtils", () => {
  const params = {
    name: "ほしもこ",
    species: "くもの子",
    role: "buddy",
    personalityTraits: ["やさしい", "照れ屋"],
    specialPower: "不安を星に変える",
    weaknessOrQuirk: "朝が苦手",
    visualProfile: {
      bodyShape: "ふわふわ",
      mainColor: "ミルクホワイト",
      faceFeatures: "expressive",
    },
  };

  it("should build a character bible correctly", () => {
    const bible = buildCharacterBible({
      ...params,
      role: "相棒",
    });
    expect(bible).toContain("キャラクター名: ほしもこ");
    expect(bible).toContain("種族・存在: くもの子");
    expect(bible).toContain("性格: やさしい、照れ屋");
    expect(bible).toContain("特別な力: 不安を星に変える");
    expect(bible).toContain("弱点・クセ: 朝が苦手");
    expect(bible).toContain("体型: ふわふわ");
    expect(bible).toContain("メインカラー: ミルクホワイト");
    expect(bible).toContain("物語での役割: 相棒");
  });

  it("should build a base prompt correctly", () => {
    const prompt = buildBasePrompt({
      name: params.name,
      species: params.species,
      personalityTraits: params.personalityTraits,
      specialPower: params.specialPower,
      mainColor: params.visualProfile.mainColor,
      visualMood: params.visualProfile.bodyShape,
    });
    expect(prompt).toContain("Name: ほしもこ");
    expect(prompt).toContain("Species/type: くもの子");
    expect(prompt).toContain("Personality: やさしい, 照れ屋");
    expect(prompt).toContain("Special power: 不安を星に変える");
    expect(prompt).toContain("Main color: ミルクホワイト");
    expect(prompt).toContain("Visual mood: ふわふわ");
    expect(prompt).toContain("soft children’s picture book illustration");
  });
});
