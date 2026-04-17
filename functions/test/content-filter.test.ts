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
});
