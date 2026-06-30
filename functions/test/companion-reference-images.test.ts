import { describe, it, expect } from "vitest";
import { buildInputImageRefs } from "../src/generate-book";
import type { BookData, GeneratedStory } from "../src/lib/types";

const childSnapshot = {
  visualProfile: {
    referenceImageUrl: "https://example.com/child-ref.png",
    approvedImageUrl: "https://example.com/child-approved.png",
  },
} as unknown as BookData["childProfileSnapshot"];

const companionCast: GeneratedStory["cast"] = [
  {
    characterId: "companion_character",
    displayName: "ゴン",
    role: "buddy",
    characterKind: "magical_creature",
    visualBible: "A large, purple fox.",
    referenceImageUrl: "https://example.com/companion-ref.png",
  },
];

describe("buildInputImageRefs companion inclusion", () => {
  it("keeps a companion reference even though the child has two reference images", () => {
    const refs = buildInputImageRefs(childSnapshot, companionCast, [
      "child_protagonist",
      "companion_character",
    ]);
    expect(refs).toHaveLength(2);
    const characterIds = refs.map((r) => r.characterId);
    expect(characterIds).toContain("child_protagonist");
    expect(characterIds).toContain("companion_character");
  });

  it("falls back to two child references when no companion appears", () => {
    const refs = buildInputImageRefs(childSnapshot, companionCast, ["child_protagonist"]);
    expect(refs).toHaveLength(2);
    expect(refs.every((r) => r.characterId === "child_protagonist")).toBe(true);
  });

  it("does not include a companion reference when the companion is not on the page", () => {
    const refs = buildInputImageRefs(childSnapshot, companionCast, ["child_protagonist"]);
    expect(refs.some((r) => r.characterId === "companion_character")).toBe(false);
  });

  // 表紙: 相棒（なかよしキャラ）が主人公で子ども参照が無くても、全キャストIDを渡せば
  // 相棒の参照画像が表紙に効く（プロンプトだけで描かれない）。
  it("includes the companion reference for the cover when all cast ids are passed", () => {
    const refs = buildInputImageRefs(undefined, companionCast, ["companion_character"]);
    expect(
      refs.some((r) => r.characterId === "companion_character" && r.url.includes("companion-ref"))
    ).toBe(true);
  });

  // 回帰ガード: appearingCharacterIds=undefined だと全キャスト参照がスキップされる罠。
  // 表紙生成はこの undefined ではなく cast の characterId 配列を渡さなければならない。
  it("skips all cast references when appearingCharacterIds is undefined", () => {
    const refs = buildInputImageRefs(undefined, companionCast, undefined);
    expect(refs).toHaveLength(0);
  });
});
