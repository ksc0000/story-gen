import { describe, it, expect } from "vitest";
import { forwardParams, readOutfitParams, OUTFIT_PARAM_KEYS, COMPANION_PARAM_KEYS } from "@/lib/create-flow-params";

describe("create-flow-params", () => {
  it("forwardParams は存在するキーだけを引き継ぎ、既存値は上書きしない", () => {
    const from = new URLSearchParams("outfitMode=user_custom&customOutfit=きいろのTシャツ&keepSignatureItem=false&unrelated=1");
    const to = new URLSearchParams("outfitMode=theme_auto");
    forwardParams(from, to, OUTFIT_PARAM_KEYS);
    expect(to.get("outfitMode")).toBe("theme_auto");
    expect(to.get("customOutfit")).toBe("きいろのTシャツ");
    expect(to.get("keepSignatureItem")).toBe("false");
    expect(to.has("unrelated")).toBe(false);
  });

  it("なかよしキャラのパラメータを子ども主人公の経路でも保持する（回帰）", () => {
    const from = new URLSearchParams("companionId=c1&companionName=ポチ&companionVisualDescription=しろいいぬ");
    const to = new URLSearchParams("childId=k1");
    forwardParams(from, to, COMPANION_PARAM_KEYS);
    expect(to.get("companionId")).toBe("c1");
    expect(to.get("companionName")).toBe("ポチ");
    expect(to.get("childId")).toBe("k1");
  });

  it("readOutfitParams は不正値を無視する", () => {
    expect(readOutfitParams(new URLSearchParams("outfitMode=user_custom&customOutfit=x&keepSignatureItem=false"))).toEqual({
      outfitMode: "user_custom", customOutfit: "x", keepSignatureItem: false,
    });
    expect(readOutfitParams(new URLSearchParams("outfitMode=bogus&keepSignatureItem=maybe"))).toEqual({
      outfitMode: undefined, customOutfit: undefined, keepSignatureItem: undefined,
    });
  });
});
