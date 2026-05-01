import { describe, expect, it } from "vitest";
import { getAgeReadingProfile } from "../src/lib/age-reading-profile";
import { buildSystemPrompt } from "../src/lib/prompt-builder";
import type { TemplateData } from "../src/lib/types";

const mockTemplate: TemplateData = {
  name: "おたんじょうび",
  description: "主人公の誕生日パーティーの冒険",
  icon: "🎂",
  order: 1,
  systemPrompt:
    "あなたは子ども向け絵本の作家です。主人公の誕生日をテーマにした心温まる物語を作ってください。",
  active: true,
};

describe("getAgeReadingProfile", () => {
  it("defaults to preschool_3_4 when age is undefined", () => {
    expect(getAgeReadingProfile(undefined).ageBand).toBe("preschool_3_4");
  });

  it("maps age 2 to baby_toddler", () => {
    expect(getAgeReadingProfile(2).ageBand).toBe("baby_toddler");
  });

  it("maps age 4 to preschool_3_4", () => {
    expect(getAgeReadingProfile(4).ageBand).toBe("preschool_3_4");
  });

  it("maps age 6 to early_reader_5_6", () => {
    expect(getAgeReadingProfile(6).ageBand).toBe("early_reader_5_6");
  });

  it("maps age 8 to early_elementary_7_8", () => {
    expect(getAgeReadingProfile(8).ageBand).toBe("early_elementary_7_8");
  });
});

describe("buildSystemPrompt with age reading profile", () => {
  it("includes age-aware reading guidance", () => {
    const readingProfile = getAgeReadingProfile(6);
    const result = buildSystemPrompt(mockTemplate, "watercolor", readingProfile);

    expect(result).toContain("年齢に合わせた文章レベル");
    expect(result).toContain("1ページあたりの本文量");
    expect(result).toContain(readingProfile.label);
    expect(result).toContain(readingProfile.targetCharsPerPage);
  });
});
