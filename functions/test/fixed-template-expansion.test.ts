import { describe, it, expect } from "vitest";
import {
  applyTemplateReplacements,
  buildFixedTemplateReplacements,
  buildStoryFromFixedTemplate,
} from "../src/generate-book";
import type { BookData, BookInput, FixedStoryTemplate, TemplateData } from "../src/lib/types";
import { SEED_TEMPLATES } from "../src/seed-templates";

describe("applyTemplateReplacements", () => {
  it("replaces known placeholders", () => {
    const result = applyTemplateReplacements("{childName}の冒険", {
      childName: "ゆうと",
    });
    expect(result).toBe("ゆうとの冒険");
  });

  it("replaces multiple placeholders", () => {
    const result = applyTemplateReplacements("{childName}と{familyMembers}", {
      childName: "ゆうと",
      familyMembers: "パパ",
    });
    expect(result).toBe("ゆうととパパ");
  });

  it("replaces unknown placeholders with empty string", () => {
    const result = applyTemplateReplacements("{unknownVar}!", {});
    expect(result).toBe("!");
  });

  it("returns unmodified string with no placeholders", () => {
    const result = applyTemplateReplacements("no placeholders here", {
      childName: "ゆうと",
    });
    expect(result).toBe("no placeholders here");
  });
});

describe("buildFixedTemplateReplacements", () => {
  it("uses provided input values", () => {
    const input: BookInput = {
      childName: "さくら",
      childAge: 4,
      favorites: "うさぎ",
      place: "公園",
      familyMembers: "ママとパパ",
      parentMessage: "すくすく育ってね",
    };
    const r = buildFixedTemplateReplacements(input);
    expect(r.childName).toBe("さくら");
    expect(r.childAge).toBe("4");
    expect(r.favorites).toBe("うさぎ");
    expect(r.place).toBe("公園");
    expect(r.familyMembers).toBe("ママとパパ");
    expect(r.parentMessage).toBe("すくすく育ってね");
  });

  it("provides fallback values for missing fields", () => {
    const input: BookInput = { childName: "あおい" };
    const r = buildFixedTemplateReplacements(input);
    expect(r.childName).toBe("あおい");
    expect(r.childAge).toBe("3"); // fallback
    expect(r.favorites).toBeTruthy();
    expect(r.place).toBeTruthy();
    expect(r.familyMembers).toBeTruthy();
    expect(r.parentMessage).toBeTruthy();
  });
});

describe("fixed_template cover / title / narration expansion", () => {
  const FIXED_IDS = [
    "fixed-first-zoo",
    "fixed-first-birthday",
    "fixed-bedtime-good-day",
    "fixed-brush-teeth",
    "fixed-first-christmas",
    "fixed-sharing-friends",
  ] as const;

  for (const id of FIXED_IDS) {
    describe(`${id} template expansion`, () => {
      const template = SEED_TEMPLATES[id];
      const fixedStory = template.fixedStory as FixedStoryTemplate;
      const input: BookInput = {
        childName: "テスト太郎",
        childAge: 3,
        familyMembers: "ママ",
        lessonToTeach: "わけっこ",
        place: "動物園",
        parentMessage: "だいすきだよ",
      };
      const replacements = buildFixedTemplateReplacements(input);

      it("coverImagePromptTemplate expands without leftover placeholders", () => {
        expect(fixedStory.coverImagePromptTemplate).toBeTruthy();
        const result = applyTemplateReplacements(
          fixedStory.coverImagePromptTemplate!,
          replacements
        );
        expect(result).not.toMatch(/\{\w+\}/);
        expect(result.length).toBeGreaterThan(20);
      });

      it("titleSpreadTextTemplate expands with childName", () => {
        expect(fixedStory.titleSpreadTextTemplate).toBeTruthy();
        const result = applyTemplateReplacements(
          fixedStory.titleSpreadTextTemplate!,
          replacements
        );
        expect(result).toContain("テスト太郎");
        expect(result).not.toMatch(/\{\w+\}/);
      });

      it("openingNarrationTemplate expands without leftover placeholders", () => {
        expect(fixedStory.openingNarrationTemplate).toBeTruthy();
        const result = applyTemplateReplacements(
          fixedStory.openingNarrationTemplate!,
          replacements
        );
        expect(result).not.toMatch(/\{\w+\}/);
        expect(result.length).toBeGreaterThan(10);
      });

      it("coverImagePromptTemplate negative text instruction preserved after expansion", () => {
        const result = applyTemplateReplacements(
          fixedStory.coverImagePromptTemplate!,
          replacements
        ).toLowerCase();
        expect(result).toContain("no text");
        expect(result).toContain("no letters");
        expect(result).toContain("no watermark");
      });

      it("fixed-sharing-friends opening narration includes expanded lessonToTeach", () => {
        if (id !== "fixed-sharing-friends") return;
        const result = applyTemplateReplacements(
          fixedStory.openingNarrationTemplate!,
          replacements
        );
        expect(result).toContain("わけっこ");
        expect(result).not.toContain("{lessonToTeach}");
      });
    });
  }
});

describe("buildStoryFromFixedTemplate: parentMessage on last page", () => {
  // 最終ページの最年少帯テキストが {parentMessage} を含まないテンプレート。
  // 親が入力したメッセージが年齢帯で取りこぼされないことを検証する。
  const templateWithShortLastPage: FixedStoryTemplate = {
    titleTemplate: "{childName}のきがえ",
    pages: [
      {
        textTemplate: "{childName}は きがえを はじめました。",
        imagePromptTemplate: "A child getting dressed",
      },
      {
        textTemplate: "じぶんで できたね。{parentMessage}",
        textTemplatesByAge: {
          baby_toddler: "できたね、すごいね。", // ← {parentMessage} を含まない
          general_child: "じぶんで できたね。{parentMessage}",
        },
        imagePromptTemplate: "A proud child who dressed themselves",
      },
    ],
  };

  const bookData = {
    style: "soft_watercolor",
    childProfileSnapshot: undefined,
  } as unknown as BookData;
  const template = { name: "きがえ", creationMode: "fixed_template" } as unknown as TemplateData;

  it("最年少帯でも親のメッセージを最終ページに補完する", () => {
    const input = {
      childName: "ゆうた",
      parentMessage: "よくできたね。またつぎもがんばろうね！",
    } as BookInput;
    const story = buildStoryFromFixedTemplate(
      templateWithShortLastPage,
      input,
      bookData,
      template,
      { ageBand: "baby_toddler" }
    );
    const lastText = story.pages[story.pages.length - 1].text;
    expect(lastText).toContain("よくできたね。またつぎもがんばろうね！");
  });

  it("年長帯（既に反映済み）では二重に追加しない", () => {
    const input = {
      childName: "ゆうた",
      parentMessage: "よくできたね。",
    } as BookInput;
    const story = buildStoryFromFixedTemplate(
      templateWithShortLastPage,
      input,
      bookData,
      template,
      { ageBand: "general_child" }
    );
    const lastText = story.pages[story.pages.length - 1].text;
    const occurrences = lastText.split("よくできたね。").length - 1;
    expect(occurrences).toBe(1);
  });

  it("parentMessage を想定しないテンプレートには勝手に追加しない", () => {
    const noMsgTemplate: FixedStoryTemplate = {
      titleTemplate: "{childName}のおはなし",
      pages: [
        { textTemplate: "おしまい。", imagePromptTemplate: "The end" },
      ],
    };
    const input = { childName: "ゆうた", parentMessage: "がんばれ！" } as BookInput;
    const story = buildStoryFromFixedTemplate(
      noMsgTemplate,
      input,
      bookData,
      template,
      { ageBand: "baby_toddler" }
    );
    expect(story.pages[story.pages.length - 1].text).toBe("おしまい。");
  });
});

describe("buildStoryFromFixedTemplate: styleBible が選択スタイルと矛盾しない", () => {
  // 回帰: テンプレの visualDirection に画材語（soft watercolor 等）が
  // 埋め込まれていても、styleBible に混入して選択スタイルを壊さないこと。
  // （本番事例: pencil_sketch 選択なのに watercolor 語が全プロンプトに混入）
  const fixedStory: FixedStoryTemplate = {
    titleTemplate: "{childName}のてぶくろ",
    pages: [
      { textTemplate: "ゆきのもり。", imagePromptTemplate: "A mitten in the snow" },
    ],
  };
  const input = { childName: "ゆうた" } as BookInput;

  it("visualDirection の画材語を除去しつつ雰囲気説明は残す", () => {
    const bookData = { style: "pencil_sketch", childProfileSnapshot: undefined } as unknown as BookData;
    const template = {
      name: "てぶくろ",
      creationMode: "fixed_template",
      visualDirection:
        "Cozy snowy forest picture-book mood: a warm dropped mitten in the snow, soft watercolor storybook style.",
    } as unknown as TemplateData;

    const story = buildStoryFromFixedTemplate(fixedStory, input, bookData, template, {
      ageBand: "general_child",
    });

    expect(story.styleBible).not.toMatch(/watercolor/i);
    // 雰囲気説明（被写体の方向性）は保持される
    expect(story.styleBible).toContain("Cozy snowy forest");
    // 選択スタイル（鉛筆スケッチ）の記述が主導権を持つ
    expect(story.styleBible).toMatch(/pencil/i);
  });

  it("実テンプレ fixed-classic-mitten でも watercolor が混入しない", () => {
    const bookData = { style: "pencil_sketch", childProfileSnapshot: undefined } as unknown as BookData;
    const mitten = SEED_TEMPLATES["fixed-classic-mitten"];
    const story = buildStoryFromFixedTemplate(
      mitten.fixedStory as FixedStoryTemplate,
      input,
      bookData,
      mitten as unknown as TemplateData,
      { ageBand: "general_child" }
    );
    expect(story.styleBible).not.toMatch(/watercolor/i);
    expect(story.styleBible).toMatch(/pencil/i);
  });

  it("選択スタイルが watercolor の場合は watercolor 記述が残る", () => {
    const bookData = { style: "soft_watercolor", childProfileSnapshot: undefined } as unknown as BookData;
    const template = {
      name: "てぶくろ",
      creationMode: "fixed_template",
      visualDirection: "Cozy snowy forest mood, soft watercolor storybook style.",
    } as unknown as TemplateData;
    const story = buildStoryFromFixedTemplate(fixedStory, input, bookData, template, {
      ageBand: "general_child",
    });
    // styleProfile 由来の watercolor 記述（正当）は保持される
    expect(story.styleBible).toMatch(/watercolor/i);
  });
});
