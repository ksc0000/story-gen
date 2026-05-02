import { describe, expect, it } from "vitest";
import { getAgeReadingProfile } from "../src/lib/age-reading-profile";
import {
  countJapaneseTextChars,
  countSentences,
  validateGeneratedStoryQuality,
} from "../src/lib/story-quality";
import type { GeneratedStory } from "../src/lib/types";

describe("countJapaneseTextChars", () => {
  it("ignores whitespace", () => {
    expect(countJapaneseTextChars("  こんにちは \n せかい ")).toBe(8);
  });

  it("returns 0 for empty input", () => {
    expect(countJapaneseTextChars("")).toBe(0);
  });
});

describe("countSentences", () => {
  it("returns 0 for empty text", () => {
    expect(countSentences("   ")).toBe(0);
  });

  it("counts a short sentence without punctuation as 1", () => {
    expect(countSentences("おはよう")).toBe(1);
  });

  it("counts punctuation-delimited sentences", () => {
    expect(countSentences("くまさんがきました。ぼくは、手をふりました。")).toBe(2);
    expect(countSentences("わあ！すごい？")).toBe(2);
  });
});

describe("validateGeneratedStoryQuality", () => {
  const baseStory: GeneratedStory = {
    title: "テスト絵本",
    characterBible: "same child",
    styleBible: "same style",
    narrativeDevice: {
      repeatedPhrase: "だいじょうぶ、いっしょにいるよ",
      visualMotif: "yellow star",
      setup: "最初に見つけた小さな星",
      payoff: "最後にもう一度星が光る",
      hiddenDetails: ["small bird", "blue cup"],
    },
    pages: [
      {
        text: "きょうは たのしい日です。おへやには やさしいひかりが さして、みんなの えがおが ひろがりました。",
        imagePrompt: "wide establishing shot of a cozy room with family and a child, rich but not cluttered background details",
        compositionHint: "wide establishing shot",
      },
      {
        text: "ぼくは ちいさな ほしを見つけました。きらりと ひかって、つぎの できごとを しらせているようです。",
        imagePrompt: "medium shot with action, the child finding a tiny star near toys and books, cozy room details",
        compositionHint: "medium shot with action",
      },
    ],
  };

  it("allows short toddler stories with warnings only", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        narrativeDevice: undefined,
        pages: [{ text: "すな、さらさら。", imagePrompt: "simple sandbox scene with soft beige sand and a gentle child-safe mood" }],
      },
      readingProfile: getAgeReadingProfile(2),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(true);
  });

  it("treats preschool single-sentence pages as errors", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          { text: "たのしいね。", imagePrompt: "wide shot of a park with flowers and a child-safe path in the background", compositionHint: "wide shot" },
          {
            text: "みんなで あるいていくと、かわいい ことりが きのえだで ぴょんと はねました。ぼくは それをみて、にっこり わらいました。",
            imagePrompt: "medium shot of a child walking with family, a small bird on a branch, and gentle spring details in the park",
            compositionHint: "medium shot with action",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "text.too_short_sentences" && issue.severity === "error")).toBe(true);
  });

  it("flags overly childish or unnatural Japanese for preschool pages", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "ころころ こりころ。まきまき まきば。まきまき むすんで、ふしぎな じゅうたん。",
            imagePrompt: "wide shot of a sandbox with magical light and a child nearby in a storybook park scene",
            compositionHint: "wide shot",
          },
          baseStory.pages[1],
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.issues.some((issue) => issue.code === "text_too_childish")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "unnatural_japanese_risk")).toBe(true);
  });

  it("detects story goal drift and forbidden quest objects in weak premium text", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        storyGoal: "たっちゃんが ほしのこと いっしょに 星のかけらを さがす",
        mainQuestObject: "星のかけら",
        forbiddenQuestObjects: ["すいか", "食べもの"],
        narrativeDevice: {
          ...baseStory.narrativeDevice!,
          hiddenDetails: ["watermelon-like pattern", "watermelon-shaped cloud"],
        },
        pages: [
          {
            text: "たっちゃん、すなばであそぼう。くろいかみの、たっちゃん。みどりのはっぱが、きらきら。",
            imagePrompt: "wide shot of sandbox and small star light",
            compositionHint: "wide shot",
            pageVisualRole: "opening_establishing",
            hiddenDetail: "watermelon-like pattern",
          },
          {
            text: "あれ？ ちいさな、ほしのこ。「こんにちは」って、ふるえている。たっちゃん、びっくり！",
            imagePrompt: "discovery scene with star child and sandbox",
            compositionHint: "medium shot",
            pageVisualRole: "discovery",
          },
          {
            text: "おいしい、すいか、どこかな？ ほしのこ、さがしてる。キラキラ、どこかな？",
            imagePrompt: "action scene in sandbox",
            compositionHint: "action shot",
            pageVisualRole: "action",
            hiddenDetail: "watermelon-shaped cloud",
          },
          {
            text: "あった！たっちゃんの、すいか。ほしのこ、わらってる。「ありがとう」って、たっちゃん。",
            imagePrompt: "ending scene with glowing child",
            compositionHint: "ending shot",
            pageVisualRole: "quiet_ending",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.issues.some((issue) => issue.code === "text_too_generic")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "sentence_too_short_for_age")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "main_quest_drift")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "forbidden_object_became_goal")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "hidden_detail_used_as_main_goal")).toBe(true);
  });

  it("accepts richer quest-consistent preschool text", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        storyGoal: "たっちゃんが ほしのこと いっしょに 星のかけらを さがす",
        mainQuestObject: "星のかけら",
        forbiddenQuestObjects: ["すいか", "食べもの"],
        cast: [
          {
            characterId: "hoshinoko_01",
            displayName: "ほしのこ",
            role: "magical_friend",
            visualBible: "small glowing star child",
            signatureItems: ["small glow"],
            doNotChange: ["Do not remove the glow"],
          },
        ],
        pages: [
          {
            text: "たっちゃんは、すなばで みどりの きょうりゅうを すべらせて あそんでいました。すると、すなの なかで 小さな ひかりが きらりと ゆれました。なんだろうと おもって、たっちゃんは そっと すなを よけました。",
            imagePrompt: "wide establishing shot of a sandbox with a tiny star glow and child-safe park details",
            compositionHint: "wide establishing shot",
            pageVisualRole: "opening_establishing",
            appearingCharacterIds: ["child_protagonist"],
          },
          {
            text: "すなの なかから、ふるえた こえで ほしのこが あらわれました。なくした 星のかけらを さがしていると きいて、たっちゃんは びっくりしながらも うなずきました。いっしょに さがそう、と やさしく てを のばしました。",
            imagePrompt: "discovery scene with a small star child and sandbox details",
            compositionHint: "medium shot with discovery",
            pageVisualRole: "discovery",
            appearingCharacterIds: ["child_protagonist", "hoshinoko_01"],
            focusCharacterId: "hoshinoko_01",
          },
          {
            text: "ほしのこは たっちゃんの ゆびに ちょこんと のって、ひかりの みちを てらしました。たっちゃんは すなの やまを そっと くずしながら、きらきらの かけらを さがしました。もう すこしで みつかりそうだね、と ふたりの かおが あかるく なりました。",
            imagePrompt: "action scene in sandbox with glowing path and star motif",
            compositionHint: "action shot",
            pageVisualRole: "action",
            appearingCharacterIds: ["child_protagonist", "hoshinoko_01"],
            focusCharacterId: "child_protagonist",
          },
          {
            text: "ひかりの みちの さきで、星のかけらが きらりと ひかりました。ほしのこは うれしそうに まわって、たっちゃんに ありがとうと いいました。すなばの うえには、やさしい ひかりが いつまでも のこっていました。",
            imagePrompt: "quiet ending scene with found star shard and warm sandbox glow",
            compositionHint: "quiet ending shot",
            pageVisualRole: "quiet_ending",
            appearingCharacterIds: ["child_protagonist", "hoshinoko_01"],
            focusCharacterId: "hoshinoko_01",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(true);
    expect(report.issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("warns when scene detail or action/emotion is missing", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "ふわふわです。きらきらです。たのしいです。",
            imagePrompt: "medium shot of a child with a soft glow and simple background details in a picture book style",
            compositionHint: "medium shot",
          },
          baseStory.pages[1],
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.issues.some((issue) => issue.code === "missing_scene_detail")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "missing_action_or_emotion")).toBe(true);
  });

  it("treats early reader pages with only 2 sentences as errors", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "ぼくは あるいていきました。きれいな ひかりが みえました。",
            imagePrompt: "medium shot of a child walking toward light with trees around and a small motif in the path",
            compositionHint: "medium shot with action",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(6),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "text.too_short_sentences")).toBe(true);
  });

  it("requires narrativeDevice for early readers", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        narrativeDevice: undefined,
        pages: [
          {
            text: "ぼくは まどのそとを見ました。あおい ことりが えだに とまりました。どうして ここへ きたのか、ちょっと きになりました。",
            imagePrompt: "wide shot of a child at the window with a blue bird outside and room details",
            compositionHint: "wide shot",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(6),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "narrative_device.required")).toBe(true);
  });

  it("treats missing composition hints as an error for guided_ai", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: baseStory.pages.map((page) => ({ ...page, compositionHint: undefined })),
      },
      readingProfile: getAgeReadingProfile(5),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "composition_hint.missing_all" && issue.severity === "error")).toBe(true);
  });

  it("treats missing composition hints as a warning for fixed_template", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        narrativeDevice: {
          repeatedPhrase: "いっしょに できたね",
          visualMotif: "blue ribbon",
        },
        pages: baseStory.pages.map((page) => ({ ...page, compositionHint: undefined })),
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "fixed_template",
    });

    expect(report.ok).toBe(true);
    expect(report.issues.some((issue) => issue.code === "composition_hint.missing_all" && issue.severity === "warning")).toBe(true);
  });

  it("warns when imagePrompt is too short", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "きょうは たのしい日です。おへやには やさしいひかりが さして、みんなの えがおが ひろがりました。",
            imagePrompt: "short prompt",
            compositionHint: "wide shot",
          },
          baseStory.pages[1],
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(true);
    expect(report.issues.some((issue) => issue.code === "image_prompt.thin")).toBe(true);
  });

  it("warns when imagePrompt contains text-rendering risk terms", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "きょうは たのしい日です。おへやには やさしいひかりが さして、みんなの えがおが ひろがりました。",
            imagePrompt: "wide shot with a speech bubble label and written sign in the room",
            compositionHint: "wide shot",
          },
          baseStory.pages[1],
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.issues.some((issue) => issue.code === "image_prompt.text_risk")).toBe(true);
  });

  it("warns when imagePrompt contains Japanese quote marks", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "きょうは たのしい日です。おへやには やさしいひかりが さして、みんなの えがおが ひろがりました。",
            imagePrompt: "wide shot with 「ありがとう」 floating near the child",
            compositionHint: "wide shot",
          },
          baseStory.pages[1],
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.issues.some((issue) => issue.code === "image_prompt.text_risk")).toBe(true);
  });

  it("warns when recurring magical friends lack cast definitions", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        cast: undefined,
        pages: [
          {
            text: "ひかりのともだちが そっと わらいました。こうえんの きのしたで、ゆうたは その ひかりを みつめました。うれしくて、こころが ふわっと しました。",
            imagePrompt: "medium shot of a magical friend floating beside a child in a park, with small flowers and a gentle sky",
            compositionHint: "medium shot",
          },
          {
            text: "また ひかりのともだちが きてくれて、ゆうたは そっと てを のばしました。あたたかな ひかりが、すなのうえに ゆれています。",
            imagePrompt: "wide shot of the same magical friend with the child near a sandbox, warm light and park details",
            compositionHint: "wide shot",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(5),
      creationMode: "guided_ai",
    });

    expect(report.issues.some((issue) => issue.code === "cast_missing_for_recurring_character")).toBe(true);
  });

  it("is ok when there are only warnings", () => {
    const report = validateGeneratedStoryQuality({
      story: {
        ...baseStory,
        pages: [
          {
            text: "きょうは たのしい日です。おへやには やさしいひかりが さして、みんなの えがおが ひろがりました。",
            imagePrompt: "this prompt is long enough to avoid a warning from the prompt-length checker while staying simple",
            compositionHint: "portrait close-up",
          },
          {
            text: "ぼくは ちいさな ほしを見つけました。きらりと ひかって、つぎの できごとを しらせているようです。",
            imagePrompt: "this prompt is also long enough to avoid a prompt length warning for the validation helper",
            compositionHint: "portrait close-up",
          },
        ],
      },
      readingProfile: getAgeReadingProfile(4),
      creationMode: "guided_ai",
    });

    expect(report.ok).toBe(true);
    expect(report.issues.every((issue) => issue.severity === "warning")).toBe(true);
  });
});
