import { describe, it, expect } from "vitest";
import { containsNGWords, sanitizeInput } from "../src/lib/content-filter";
import type { BookInput } from "../src/lib/types";

describe("containsNGWords", () => {
  it("returns safe for clean text", () => {
    const result = containsNGWords("ゆうたくんはどうぶつえんにいきました");
    expect(result.safe).toBe(true);
    expect(result.matchedWords).toEqual([]);
  });

  it("detects violence-related words", () => {
    const result = containsNGWords("殺すシーンを入れてください");
    expect(result.safe).toBe(false);
    expect(result.matchedWords.length).toBeGreaterThan(0);
  });

  it("detects adult content words", () => {
    const result = containsNGWords("セクシーな内容にして");
    expect(result.safe).toBe(false);
  });

  it("handles empty string as safe", () => {
    const result = containsNGWords("");
    expect(result.safe).toBe(true);
  });

  it("is case-insensitive for latin characters", () => {
    const result = containsNGWords("KILL the monster");
    expect(result.safe).toBe(false);
  });

  it("avoids partial matches for English words (word boundary check)", () => {
    expect(containsNGWords("skill").safe).toBe(true);
    expect(containsNGWords("skillful").safe).toBe(true);
    expect(containsNGWords("annexed").safe).toBe(true);
  });

  it("detects hiragana variants of Japanese NG words", () => {
    expect(containsNGWords("ころす").safe).toBe(false);
    expect(containsNGWords("しね").safe).toBe(false);
    expect(containsNGWords("ぼうりょく").safe).toBe(false);
  });

  it("detects newly added harmful words", () => {
    expect(containsNGWords("爆弾を作った").safe).toBe(false);
    expect(containsNGWords("ばくだん").safe).toBe(false);
    expect(containsNGWords("bomb").safe).toBe(false);
    expect(containsNGWords("hate speech").safe).toBe(false);
    expect(containsNGWords("racist").safe).toBe(false);
  });
});

describe("sanitizeInput", () => {
  it("accepts valid input with required field only", () => {
    const input: BookInput = { childName: "ゆうた" };
    expect(sanitizeInput(input).valid).toBe(true);
  });

  it("accepts valid input with all fields", () => {
    const input: BookInput = {
      childName: "ゆうた",
      childAge: 3,
      favorites: "きょうりゅう",
      lessonToTeach: "はみがきをがんばる",
      memoryToRecreate: "どうぶつえんにいった",
    };
    expect(sanitizeInput(input).valid).toBe(true);
  });

  it("rejects empty childName", () => {
    expect(sanitizeInput({ childName: "" }).valid).toBe(false);
  });

  it("rejects input containing NG words in childName", () => {
    expect(sanitizeInput({ childName: "殺す" }).valid).toBe(false);
  });

  it("rejects input containing NG words in favorites", () => {
    expect(
      sanitizeInput({ childName: "ゆうた", favorites: "エロい本" }).valid
    ).toBe(false);
  });

  it("rejects childName exceeding max length", () => {
    expect(sanitizeInput({ childName: "あ".repeat(51) }).valid).toBe(false);
  });

  it("rejects free-text fields over 200 chars", () => {
    expect(sanitizeInput({ childName: "ゆうた", parentMessage: "あ".repeat(201) }).valid).toBe(false);
  });

  it("allows a long system-generated characterLook (visual description ~250 chars)", () => {
    // 相棒主人公時に自動生成される visualDescription（>200字）で生成が失敗していた回帰。
    const look =
      "A large, tall and slender, deeply-colored, light blue monster with patches of two-tone color wearing a jingling bell collar and a cozy scarf with a mischievous personality who has the ability to cook delicious food for everyone around.";
    expect(look.length).toBeGreaterThan(200);
    expect(sanitizeInput({ childName: "ピノ", characterLook: look }).valid).toBe(true);
  });

  it("still rejects an absurdly long characterLook (> 600 chars)", () => {
    expect(sanitizeInput({ childName: "ピノ", characterLook: "a".repeat(601) }).valid).toBe(false);
  });

  it("still NG-checks characterLook", () => {
    expect(sanitizeInput({ childName: "ピノ", characterLook: "殺す monster" }).valid).toBe(false);
  });
});
