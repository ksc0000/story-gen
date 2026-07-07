import { describe, it, expect } from "vitest";
import {
  applyTemplateReplacements,
  buildFixedTemplateReplacements,
} from "../src/generate-book";
import { SEED_TEMPLATES } from "../src/seed-templates";
import type { BookInput, FixedStoryTemplate } from "../src/lib/types";

/**
 * 不変条件: baby_toddler（0〜2歳）帯の固定テンプレ本文の品質床。
 *
 * 背景（回帰防止）: baby_toddler 変種の 61% が電文的キャプション
 * （例:「あまい、においだ。」9字）で、age-reading-profile が定める
 * 「15〜35文字程度・反復や音のくり返しを積極的に」を満たしていなかった。
 * 品質ゲートの床も 6 字と乖離しており ok:true で素通りしていた。
 * 本テストは「展開後 15 字以上」をシードに対して恒久的に強制する。
 * 新しいテンプレを追加するときも、この床を下回る baby_toddler 文は
 * 追加できない（0〜2歳向けでも、名前の呼びかけ＋オノマトペ＋反復で
 * 15〜35字程度が絵本としての最低ライン）。
 */
describe("baby_toddler 固定テンプレ本文の品質不変条件", () => {
  const input: BookInput = {
    childName: "はるくん", // 代表的な4文字ニックネームで展開して測る
    childAge: 2,
    parentMessage: "いつもありがとう",
  };
  const replacements = buildFixedTemplateReplacements(input);

  const allVariants: Array<{ templateId: string; pageIndex: number; text: string }> = [];
  for (const [templateId, template] of Object.entries(SEED_TEMPLATES)) {
    const fixedStory = template.fixedStory as FixedStoryTemplate | undefined;
    if (!fixedStory?.pages) continue;
    fixedStory.pages.forEach((page, pageIndex) => {
      const variant = page.textTemplatesByAge?.baby_toddler;
      if (typeof variant === "string") {
        allVariants.push({ templateId, pageIndex, text: variant });
      }
    });
  }

  it("baby_toddler 変種がシードに存在する（抽出が壊れていない）", () => {
    expect(allVariants.length).toBeGreaterThan(500);
  });

  it("全 baby_toddler 変種は展開後 15 文字以上（電文的キャプション禁止）", () => {
    const violations = allVariants
      .map((v) => ({
        ...v,
        expanded: applyTemplateReplacements(v.text, replacements),
      }))
      .filter((v) => v.expanded.length < 15);

    expect(
      violations.map((v) => `${v.templateId}[p${v.pageIndex}] (${v.expanded.length}字): ${v.text}`)
    ).toEqual([]);
  });

  it("全 baby_toddler 変種は展開後 50 文字以下（0〜2歳向けの上限）", () => {
    const violations = allVariants
      .map((v) => ({
        ...v,
        expanded: applyTemplateReplacements(v.text, replacements),
      }))
      .filter((v) => v.expanded.length > 50);

    expect(
      violations.map((v) => `${v.templateId}[p${v.pageIndex}] (${v.expanded.length}字): ${v.text}`)
    ).toEqual([]);
  });

  it("baby_toddler 変種に漢字を含まない（kanjiPolicy 準拠）", () => {
    const kanji = /[一-龯]/;
    const violations = allVariants.filter((v) =>
      kanji.test(v.text.replace(/\{\w+\}/g, ""))
    );
    expect(
      violations.map((v) => `${v.templateId}[p${v.pageIndex}]: ${v.text}`)
    ).toEqual([]);
  });
});
