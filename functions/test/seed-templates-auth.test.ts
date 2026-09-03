import { describe, it, expect } from "vitest";
import { assertSeedCaller } from "../src/seed-templates";

describe("seedTemplates の呼び出し制限（回帰: 無認証で本番テンプレートが上書きできた）", () => {
  it("未認証は拒否", () => {
    expect(() => assertSeedCaller(undefined)).toThrow(/ログインが必要/);
  });
  it("管理者クレームが無ければ拒否", () => {
    expect(() => assertSeedCaller({ token: {} })).toThrow(/管理者のみ/);
    expect(() => assertSeedCaller({ token: { admin: "true" } })).toThrow(/管理者のみ/);
  });
  it("admin: true のみ許可", () => {
    expect(() => assertSeedCaller({ token: { admin: true } })).not.toThrow();
  });
});
