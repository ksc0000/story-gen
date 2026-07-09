import { describe, it, expect } from "vitest";
import {
  assertPlausibleImageBuffer,
  isPlausibleImageBuffer,
  ImplausibleImageError,
} from "../src/lib/image-sanity";

describe("image-sanity（黒/単色画像の検出ガード）", () => {
  // 回帰: book j7Hfozt8SsqS3u0C9dVH の表紙が黒一色 1024x1024（42KB）で
  // 「成功」として保存された。正常なイラストPNGは1.3〜2.3MB。
  it("42KB（黒一色相当）のバッファは implausible として投げる", () => {
    const blackLike = Buffer.alloc(42 * 1024);
    expect(isPlausibleImageBuffer(blackLike)).toBe(false);
    expect(() => assertPlausibleImageBuffer(blackLike, "test")).toThrow(ImplausibleImageError);
  });

  it("正常サイズ（500KB以上）のバッファは通す", () => {
    const normal = Buffer.alloc(500 * 1024);
    expect(isPlausibleImageBuffer(normal)).toBe(true);
    expect(assertPlausibleImageBuffer(normal, "test")).toBe(normal);
  });

  it("閾値ちょうど（100KB）は通す", () => {
    expect(isPlausibleImageBuffer(Buffer.alloc(100 * 1024))).toBe(true);
  });

  it("エラーメッセージに文脈とバイト数を含む（ログ診断用）", () => {
    try {
      assertPlausibleImageBuffer(Buffer.alloc(10), "openai:gpt-image-2");
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toContain("openai:gpt-image-2");
      expect((e as Error).message).toContain("10 bytes");
      expect((e as Error).name).toBe("ImplausibleImageError");
    }
  });
});
