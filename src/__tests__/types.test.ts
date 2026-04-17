import { describe, it, expect } from "vitest";
import {
  isValidBookInput,
  isValidPageCount,
  type BookInput,
} from "@/lib/types";

describe("isValidPageCount", () => {
  it("accepts valid page counts", () => {
    expect(isValidPageCount(4)).toBe(true);
    expect(isValidPageCount(8)).toBe(true);
    expect(isValidPageCount(12)).toBe(true);
  });

  it("rejects invalid page counts", () => {
    expect(isValidPageCount(0)).toBe(false);
    expect(isValidPageCount(5)).toBe(false);
    expect(isValidPageCount(16)).toBe(false);
  });
});

describe("isValidBookInput", () => {
  it("accepts valid input with only required field", () => {
    const input: BookInput = { childName: "ゆうた" };
    expect(isValidBookInput(input)).toBe(true);
  });

  it("accepts valid input with all fields", () => {
    const input: BookInput = {
      childName: "ゆうた",
      childAge: 3,
      favorites: "きょうりゅう",
      lessonToTeach: "はみがき",
      memoryToRecreate: "どうぶつえん",
    };
    expect(isValidBookInput(input)).toBe(true);
  });

  it("rejects input with empty childName", () => {
    const input: BookInput = { childName: "" };
    expect(isValidBookInput(input)).toBe(false);
  });

  it("rejects input with whitespace-only childName", () => {
    const input: BookInput = { childName: "   " };
    expect(isValidBookInput(input)).toBe(false);
  });
});
