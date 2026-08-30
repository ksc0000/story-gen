import { describe, it, expect } from "vitest";
import { validateReturnTo } from "@/lib/return-to";
describe("validateReturnTo 攻撃的入力(レビュー時の追加検証)", () => {
  const attacks = ["//evil.com", "https://evil.com", "http://evil.com", "/\\evil.com", "/\\/evil.com", "javascript:alert(1)", "  //evil.com",  "\\/\\/evil.com", "data:text/html,<script>", "//evil.com/path", "///evil.com",  "/\n//evil.com", "vbscript:msgbox(1)", "/\t//evil.com"];
  it.each(attacks)("reject: %j", (a) => { expect(validateReturnTo(a)).toBe("/home"); });
  // 以下は検証で通過するが、同一オリジンの相対パスのままでリダイレクトにならないため無害。
  // (router.replace すると ehoria.app 上の 404 パスになるだけ)
  it.each([["/%09/evil.com", "/%09/evil.com"], ["/ /evil", "/%20/evil"]])(
    "無害な相対パスは通す(必要なら正規化): %j",
    (input, expected) => { expect(validateReturnTo(input)).toBe(expected); }
  );
  it("正常な内部パスは通す", () => { expect(validateReturnTo("/create/input?mode=x#y")).toBe("/create/input?mode=x#y"); });
});
