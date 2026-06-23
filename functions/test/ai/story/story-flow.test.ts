import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../../src/lib/prompt-builder";
import { validateGeneratedStoryQuality } from "../../../src/lib/story-quality";
import type { TemplateData, GeneratedStory } from "../../../src/lib/types";

const mockTemplate: TemplateData = {
  name: "テスト絵本",
  description: "テスト用",
  icon: "📚",
  order: 1,
  systemPrompt: "テストシステムプロンプト",
  active: true,
};

describe("Story Flow Prompt Rules", () => {
  it("includes refined opening and ending instructions in system prompt", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");

    // Check for updated opening instructions
    expect(result).toContain("物語の冒頭（1ページ目）では、いきなり事件を起こすのではなく");
    expect(result).toContain("「どこで」「だれが」「何をしていたか」という情景と日常の様子");
    expect(result).toContain("「急に物語が始まる感」を抑え");

    // Check for updated ending instructions
    expect(result).toContain("物語の結末（最後のページ）では、出来事の解決だけでなく");
    expect(result).toContain("主人公の気持ちの安らぎや、物語のテーマ（storyGoal）を振り返るような余韻のある表現");
    expect(result).toContain("温かい気持ちが残るような一文");

    // Check for updated role rules
    expect(result).toContain("Focus on 'Where, Who, and When'");
    expect(result).toContain("A gentle wrap-up that leaves a lasting warm feeling of 'Peace and Reflection'");
  });

  it("includes new good examples for opening and ending", () => {
    const result = buildSystemPrompt(mockTemplate, "watercolor");
    expect(result).toContain("【良い導入の例 (opening_establishing)");
    expect(result).toContain("ぽかぽかと あたたかい ごごのことです");
    expect(result).toContain("【良い結末の例 (quiet_ending)");
    expect(result).toContain("おそらが オレンジいろに そまり");
  });
});

describe("Story Flow Heuristics", () => {
  const readingProfile = {
    id: "preschool_3_4",
    label: "3-4歳",
    ageBand: "preschool_3_4" as const,
    targetCharsPerPage: 40,
    targetSentencesPerPage: 2,
    vocabularyLevel: "simple",
    kanjiPolicy: "none",
    storyComplexity: "low",
    narrativeComplexity: "low",
    dialoguePolicy: "simple",
    emotionalDepth: "moderate",
    backgroundDetailLevel: "moderate",
    repetitionPolicy: "some",
    recommendedDevices: [],
  };

  it("flags opening missing scene detail", () => {
    const story: GeneratedStory = {
      title: "テスト",
      characterBible: "...",
      styleBible: "...",
      storyGoal: "星を探す",
      mainQuestObject: "星",
      pages: [
        {
          text: "いきなり はしりだしました。", // Missing location/scene detail
          imagePrompt: "A child running",
          pageVisualRole: "opening_establishing",
        },
        {
          text: "星をみつけました。うれしいな。おしまい。",
          imagePrompt: "A child with a star",
          pageVisualRole: "quiet_ending",
        },
      ],
    };

    const report = validateGeneratedStoryQuality({ story, readingProfile });
    const openingIssue = report.issues.find(i => i.code === "opening.missing_scene_detail");
    expect(openingIssue).toBeDefined();
  });

  it("flags closing missing warmth", () => {
    const story: GeneratedStory = {
      title: "テスト",
      characterBible: "...",
      styleBible: "...",
      storyGoal: "星を探す",
      mainQuestObject: "星",
      pages: [
        {
          text: "こうえんの すなばで あそんでいました。",
          imagePrompt: "A child in a park",
          pageVisualRole: "opening_establishing",
        },
        {
          text: "星を ゲットしました。", // Abrupt ending, no closing tone
          imagePrompt: "A child with a star",
          pageVisualRole: "quiet_ending",
        },
      ],
    };

    const report = validateGeneratedStoryQuality({ story, readingProfile });
    const closingIssue = report.issues.find(i => i.code === "closing.missing_warmth");
    expect(closingIssue).toBeDefined();
  });

  it("passes for high quality opening and ending", () => {
    const story: GeneratedStory = {
      title: "テスト",
      characterBible: "...",
      styleBible: "...",
      storyGoal: "星を探す",
      mainQuestObject: "星",
      pages: [
        {
          text: "きらきら ひかる おそらのした、こうえんの すなばで あそんでいました。",
          imagePrompt: "A child in a park under starry sky",
          pageVisualRole: "opening_establishing",
        },
        {
          text: "星を みつけて、にっこり わらいました。あしたも また あそぼうね。おしまい。",
          imagePrompt: "A child with a star smiling",
          pageVisualRole: "quiet_ending",
        },
      ],
    };

    const report = validateGeneratedStoryQuality({ story, readingProfile });
    expect(report.issues.find(i => i.code === "opening.missing_scene_detail")).toBeUndefined();
    expect(report.issues.find(i => i.code === "closing.missing_warmth")).toBeUndefined();
  });
});
