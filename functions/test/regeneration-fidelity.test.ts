import { describe, it, expect } from "vitest";
import { resolveRegenerationPrimaryProfile } from "../src/regenerate-page-image";
import { buildCoverRegenerationRefs } from "../src/regenerate-cover-image";

describe("resolveRegenerationPrimaryProfile（ページ再生成の主プロファイル）", () => {
  it("フォールバックで FLUX に落ちたページは元の gpt-image-2 で再生成する（回帰）", () => {
    expect(
      resolveRegenerationPrimaryProfile({ imageModelProfile: "pro_consistent", fallbackFromModelProfile: "openai_gpt_image_2_medium" })
    ).toBe("openai_gpt_image_2_medium");
  });
  it("フォールバックしていないページは保存済みプロファイル", () => {
    expect(resolveRegenerationPrimaryProfile({ imageModelProfile: "openai_gpt_image_2" })).toBe("openai_gpt_image_2");
  });
  it("何も無ければ pro_consistent", () => {
    expect(resolveRegenerationPrimaryProfile({})).toBe("pro_consistent");
  });
});

describe("buildCoverRegenerationRefs（表紙再生成の参照画像）", () => {
  it("キャストが無くても選択スタイルの見本画像を style_reference として渡す", () => {
    const refs = buildCoverRegenerationRefs({ childProfileSnapshot: undefined, storyCast: [], style: "crayon" } as never);
    expect(refs.some((r) => r.role === "style_reference")).toBe(true);
  });
  it("子どものアバターがあれば character_reference が含まれる", () => {
    const refs = buildCoverRegenerationRefs({
      style: "soft_watercolor",
      storyCast: [{ characterId: "child_protagonist", role: "protagonist", name: "たろう", isHuman: true }],
      childProfileSnapshot: {
        childId: "c1",
        displayName: "たろう",
        visualProfile: { basePrompt: "a child", referenceImageUrl: "https://example.com/avatar.png" },
      },
    } as never);
    expect(refs.map((r) => r.role)).toContain("character_reference");
    expect(refs.find((r) => r.role === "character_reference")?.url).toBe("https://example.com/avatar.png");
  });
});
