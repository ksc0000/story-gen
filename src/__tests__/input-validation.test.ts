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
