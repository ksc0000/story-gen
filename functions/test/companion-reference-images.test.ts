import { describe, it, expect } from "vitest";
import { buildInputImageRefs, resolveStyleReferenceUrl } from "../src/generate-book";
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

describe("resolveStyleReferenceUrl", () => {
  it("水彩系スタイルはアバターと一致するため見本参照を返さない", () => {
    expect(resolveStyleReferenceUrl("soft_watercolor")).toBeUndefined();
    expect(resolveStyleReferenceUrl("watercolor")).toBeUndefined();
  });

  it("水彩以外のスタイルは見本画像パスを返す", () => {
    const url = resolveStyleReferenceUrl("pencil_sketch");
    expect(url).toBeTruthy();
    expect(url).toContain("pencil_sketch");
  });
});

describe("buildInputImageRefs style reference injection", () => {
  const styleRef = "/images/styles/pencil_sketch.webp";

  it("スタイル見本を渡すと style_reference が参照に加わる（本人参照は保持）", () => {
    const refs = buildInputImageRefs(childSnapshot, [], ["child_protagonist"], undefined, undefined, styleRef);
    expect(refs).toHaveLength(2);
    // 本人参照が1枚は残る
    expect(refs.some((r) => r.characterId === "child_protagonist")).toBe(true);
    // 見本画像が style_reference として入り、公開URLに解決される
    const styleEntry = refs.find((r) => r.source === "stylePreviewImageUrl");
    expect(styleEntry).toBeTruthy();
    expect(styleEntry?.role).toBe("style_reference");
    expect(styleEntry?.url).toMatch(/^https?:\/\/.*pencil_sketch\.webp$/);
  });

  it("スタイル見本は相棒参照より優先される（本人＋見本の2枠）", () => {
    const refs = buildInputImageRefs(
      childSnapshot,
      companionCast,
      ["child_protagonist", "companion_character"],
      undefined,
      undefined,
      styleRef
    );
    expect(refs).toHaveLength(2);
    expect(refs.some((r) => r.characterId === "child_protagonist")).toBe(true);
    expect(refs.some((r) => r.source === "stylePreviewImageUrl")).toBe(true);
    expect(refs.some((r) => r.characterId === "companion_character")).toBe(false);
  });

  it("photo_story（sourcePhotoUrl あり）ではスタイル見本を加えない（本人写真の style_reference を優先）", () => {
    const photo = "https://example.com/source-photo.png";
    const refs = buildInputImageRefs(childSnapshot, [], ["child_protagonist"], undefined, photo, styleRef);
    expect(refs.some((r) => r.source === "stylePreviewImageUrl")).toBe(false);
    expect(refs.some((r) => r.role === "style_reference" && r.url === photo)).toBe(true);
  });

  it("スタイル見本を渡さなければ従来どおり本人参照2枚", () => {
    const refs = buildInputImageRefs(childSnapshot, [], ["child_protagonist"]);
    expect(refs.every((r) => r.characterId === "child_protagonist")).toBe(true);
    expect(refs.some((r) => r.source === "stylePreviewImageUrl")).toBe(false);
  });
});
