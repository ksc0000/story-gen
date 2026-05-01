import { describe, expect, it } from "vitest";
import { normalizeSensitiveError, selectAvatarVariant } from "../src/generate-child-character";

describe("selectAvatarVariant", () => {
  it("defaults to soft_watercolor when variantStyle is omitted", () => {
    expect(selectAvatarVariant(undefined)).toEqual({
      style: "soft_watercolor",
      label: "やさしい水彩",
    });
  });

  it("returns the requested style when variantStyle is provided", () => {
    expect(selectAvatarVariant("flat_illustration")).toEqual({
      style: "flat_illustration",
      label: "シンプルフラット",
    });
  });
});

describe("normalizeSensitiveError", () => {
  it("keeps the sensitive-image guidance", () => {
    expect(normalizeSensitiveError(new Error("Prediction failed: flagged as sensitive (E005)"))).toBe(
      "画像の安全判定に引っかかりました。よりやさしい表現に調整して再試行してください。"
    );
  });

  it("maps timeout and deadline errors to a recovery-oriented message", () => {
    expect(normalizeSensitiveError(new Error("deadline-exceeded"))).toBe(
      "画像生成に時間がかかっています。生成結果が保存されている場合があります。少し待ってから候補一覧を再読み込みしてください。"
    );
    expect(normalizeSensitiveError(new Error("socket ETIMEDOUT while waiting"))).toBe(
      "画像生成に時間がかかっています。生成結果が保存されている場合があります。少し待ってから候補一覧を再読み込みしてください。"
    );
  });
});
