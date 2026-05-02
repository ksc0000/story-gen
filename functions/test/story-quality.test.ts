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
