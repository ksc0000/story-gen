import { describe, it, expect } from "vitest";
import { validateBookInputLengths } from "@/lib/input-validation";

describe("validateBookInputLengths", () => {
  it("accepts normal input", () => {
    expect(validateBookInputLengths({ childName: "ゆうた", parentMessage: "がんばってね" }).valid).toBe(true);
  });

  it("rejects a childName over 50 chars", () => {
    const r = validateBookInputLengths({ childName: "あ".repeat(51) });
    expect(r.valid).toBe(false);
    expect(r.message).toContain("お名前");
  });

  it("rejects a free-text field over 200 chars", () => {
    const r = validateBookInputLengths({ childName: "ゆうた", parentMessage: "あ".repeat(201) });
    expect(r.valid).toBe(false);
    expect(r.message).toContain("長すぎ");
  });

  it("allows a long system-generated characterLook (~250 chars)", () => {
    const look = "a".repeat(250);
    expect(validateBookInputLengths({ childName: "ピノ", characterLook: look }).valid).toBe(true);
  });

  it("rejects an absurdly long characterLook (> 600 chars)", () => {
    expect(validateBookInputLengths({ childName: "ピノ", characterLook: "a".repeat(601) }).valid).toBe(false);
  });

  it("ignores non-string fields and nullish input", () => {
    expect(validateBookInputLengths({ childAge: 4, childName: "ゆう" }).valid).toBe(true);
    expect(validateBookInputLengths(null).valid).toBe(true);
    expect(validateBookInputLengths(undefined).valid).toBe(true);
  });
});

describe("storyRequest（AIブリーフ+承認済みあらすじ）の長文許容", () => {
  // 回帰: あらすじピッチ機能が storyRequest に起承転結全文を連結するため
  // 200字制限だと AIおまかせ生成がほぼ必ず「入力が長すぎます」で弾かれていた。
  it("200字を超える storyRequest を許容する（〜2000字）", () => {
    const enriched = `主人公：はるくん\nテーマ：ぼうけん\n\n承認済みのあらすじ：\n起：${"あ".repeat(150)}\n承：${"い".repeat(150)}\n転：${"う".repeat(150)}\n結：${"え".repeat(150)}`;
    expect(enriched.length).toBeGreaterThan(200);
    const result = validateBookInputLengths({ childName: "はるくん", storyRequest: enriched });
    expect(result.valid).toBe(true);
  });

  it("2000字を超える storyRequest は弾く", () => {
    const result = validateBookInputLengths({ childName: "はるくん", storyRequest: "あ".repeat(2001) });
    expect(result.valid).toBe(false);
    expect(result.message).toContain("リクエストが長すぎます");
  });

  it("他の自由入力フィールドは従来どおり200字制限", () => {
    const result = validateBookInputLengths({ childName: "はるくん", place: "あ".repeat(201) });
    expect(result.valid).toBe(false);
  });
});
