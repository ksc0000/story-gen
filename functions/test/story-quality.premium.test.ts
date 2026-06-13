import { describe, expect, it } from "vitest";
import { getAgeReadingProfile } from "../src/lib/age-reading-profile";
import { validateGeneratedStoryQuality } from "../src/lib/story-quality";
import type { GeneratedStory } from "../src/lib/types";

describe("validateGeneratedStoryQuality - Premium Plan Thresholds", () => {
  const baseStory: GeneratedStory = {
    title: "テスト絵本",
    characterBible: "same child",
    styleBible: "same style",
    storyGoal: "たっちゃんが ほしを みつけて、みんなで にっこり わらう。",
    mainQuestObject: "ほし",
    narrativeDevice: {
      repeatedPhrase: "だいじょうぶ、いっしょにいるよ",
      visualMotif: "yellow star",
      setup: "最初に見つけた小さな星",
      payoff: "最後にもう一度星が光る",
    },
    pages: [
      {
        // 54 characters
        text: "たっちゃんは、おへやで ほしを みつけました。きらきら ひかっていて、とても きれいな ほしでした。どこから きたのかな？",
        imagePrompt: "wide establishing shot of a cozy room with family and a child, rich but not cluttered background details",
        compositionHint: "wide establishing shot",
        pageVisualRole: "opening_establishing",
      },
      {
        // 59 characters
        text: "みんなで ほしを みて、にっこり わらいました。たっちゃんは ほしを だいじに しました。ほしは あたたかく ひかっています。",
        imagePrompt: "medium shot with action, the child finding a tiny star near toys and books, cozy room details",
        compositionHint: "medium shot with action",
        pageVisualRole: "quiet_ending",
      },
    ],
  };

  it("passes for premium_paid x preschool_3_4 when chars per page is > 45", () => {
    const report = validateGeneratedStoryQuality({
      story: baseStory,
      readingProfile: getAgeReadingProfile(4), // preschool_3_4
      productPlan: "premium_paid",
    });

    if (!report.ok) {
      console.log(JSON.stringify(report.issues, null, 2));
    }
    expect(report.ok).toBe(true);
  });

  it("fails for premium_paid x preschool_3_4 when chars per page is < 45", () => {
    const shortStory = {
      ...baseStory,
      pages: baseStory.pages.map(p => ({
        ...p,
        text: "たのしいね。ほしが あるね。", // 12 chars
      }))
    };
    const report = validateGeneratedStoryQuality({
      story: shortStory,
      readingProfile: getAgeReadingProfile(4), // preschool_3_4
      productPlan: "premium_paid",
    });

    expect(report.issues.some(i => i.code === "text.too_short_chars")).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("passes for premium_paid x general_child when chars per page is > 45", () => {
    const report = validateGeneratedStoryQuality({
      story: baseStory,
      readingProfile: getAgeReadingProfile(undefined), // general_child
      productPlan: "premium_paid",
    });

    expect(report.ok).toBe(true);
  });

  it("passes for standard_paid x preschool_3_4 with a story that has > 24 chars", () => {
    const standardStory = {
      ...baseStory,
      pages: baseStory.pages.map(p => ({
        ...p,
        text: "ほしを みつけました。きらきら しています。うれしいな。", // 27 chars
      }))
    };
    const report = validateGeneratedStoryQuality({
      story: standardStory,
      readingProfile: getAgeReadingProfile(4),
      productPlan: "standard_paid",
    });

    expect(report.ok).toBe(true);
  });
});
