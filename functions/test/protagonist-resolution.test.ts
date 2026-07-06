import { describe, it, expect } from "vitest";
import {
  resolveProtagonist,
  buildImagePrompt,
  buildCoverImagePrompt,
  buildCharacterConsistencyRules,
} from "../src/lib/prompt-builder";
import type { StoryCharacter } from "../src/lib/types";

const companionCast: StoryCharacter[] = [
  {
    characterId: "companion_character",
    displayName: "ピノ",
    role: "protagonist",
    characterKind: "magical_creature",
    visualBible: "A large light blue monster with a bell collar and a cozy scarf.",
    nonHuman: true,
    noHumanFace: true,
    noHumanBody: true,
  },
];

describe("resolveProtagonist", () => {
  it("相棒が protagonist role のとき non_human_companion に解決", () => {
    const p = resolveProtagonist({ cast: companionCast, protagonistType: "companion", companionName: "ピノ" });
    expect(p.kind).toBe("non_human_companion");
    expect(p.displayName).toBe("ピノ");
    expect(p.noun).toContain("ピノ");
    expect(p.allowsHumanChildInScene).toBe(false);
  });

  it("通常は human_child に解決", () => {
    const p = resolveProtagonist({ childName: "たっちゃん", protagonistType: "child" });
    expect(p.kind).toBe("human_child");
    expect(p.noun).toBe("the child");
    expect(p.allowsHumanChildInScene).toBe(true);
  });

  it("protagonistType 未指定でも cast の nonHuman protagonist から判定", () => {
    const p = resolveProtagonist({ cast: companionCast });
    expect(p.kind).toBe("non_human_companion");
  });
});

describe("buildCharacterConsistencyRules は主人公種別で分岐する", () => {
  it("相棒主人公では 'same child' を出さない", () => {
    const rules = buildCharacterConsistencyRules({
      protagonist: resolveProtagonist({ cast: companionCast, protagonistType: "companion", companionName: "ピノ" }),
    });
    expect(rules).not.toMatch(/same child/i);
    expect(rules).toMatch(/non-human/i);
    expect(rules).toContain("ピノ");
  });

  it("子主人公では従来どおり 'same child' を出す（回帰保護）", () => {
    const rules = buildCharacterConsistencyRules({});
    expect(rules).toMatch(/same child on every page/i);
  });
});

// ── 不変条件テスト: class of bug（相棒主人公なのに人間の子）を構造的に封じる ──
describe("非人間主人公プロンプトの不変条件", () => {
  const protagonist = resolveProtagonist({
    cast: companionCast,
    protagonistType: "companion",
    companionName: "ピノ",
  });
  // 固定テンプレ由来の "child" 混入シーン文を想定した最悪ケース
  const pollutedScene =
    "a kind child smiling nearby, keep the same child across all pages, use the reference image ONLY for the child character's face, hairstyle, outfit, age";

  it("ページ: 非人間主人公では 'same child' 一貫性句を含まない", () => {
    const prompt = buildImagePrompt(pollutedScene, "soft_watercolor", "bible", "style", { protagonist });
    // 主人公は非人間である明示が入る
    expect(prompt).toMatch(/non-human companion/i);
    expect(prompt).toContain("ピノ");
    // 一貫性句としての "same child ... every page" は出さない
    expect(prompt).not.toMatch(/same child character across all pages/i);
    expect(prompt).not.toMatch(/protagonist must be the same child/i);
  });

  it("表紙: 非人間主人公では 'same child' 一貫性句を含まない", () => {
    const prompt = buildCoverImagePrompt(pollutedScene, "soft_watercolor", "bible", "style", { protagonist });
    expect(prompt).toMatch(/non-human companion/i);
    expect(prompt).toContain("ピノ");
    expect(prompt).not.toMatch(/same child character across all pages/i);
  });

  it("矛盾 lint: 'no human child' と 'same child' 一貫性句が同居しない", () => {
    const prompt = buildImagePrompt(pollutedScene, "pencil_sketch", "bible", "style", { protagonist });
    const saysNoChild = /no human child|do not draw any human child/i.test(prompt);
    const saysSameChildRule = /same child character across all pages|protagonist must be the same child/i.test(prompt);
    expect(saysNoChild).toBe(true);
    expect(saysSameChildRule).toBe(false);
  });

  it("子主人公では従来の child 一貫性が保たれる（回帰保護）", () => {
    const childProt = resolveProtagonist({ childName: "たっちゃん", protagonistType: "child" });
    const prompt = buildImagePrompt("a child playing", "soft_watercolor", "bible", "style", { protagonist: childProt });
    expect(prompt).toMatch(/same child character across all pages/i);
  });
});
