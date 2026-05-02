import { describe, expect, it } from "vitest";
import { removeUndefinedDeep } from "../src/lib/firestore-sanitize";
import { sanitizeStoryCastForFirestore } from "../src/generate-book";

describe("removeUndefinedDeep", () => {
  it("removes undefined fields from nested objects", () => {
    const value = removeUndefinedDeep({
      a: 1,
      b: undefined,
      c: {
        d: undefined,
        e: "ok",
      },
    });

    expect(value).toEqual({
      a: 1,
      c: {
        e: "ok",
      },
    });
  });

  it("removes undefined fields from objects inside arrays", () => {
    const value = removeUndefinedDeep([
      { a: 1, b: undefined },
      { c: "x", d: undefined },
    ]);

    expect(value).toEqual([{ a: 1 }, { c: "x" }]);
  });

  it("keeps null false zero and empty string", () => {
    const value = removeUndefinedDeep({
      a: null,
      b: false,
      c: 0,
      d: "",
      e: undefined,
    });

    expect(value).toEqual({
      a: null,
      b: false,
      c: 0,
      d: "",
    });
  });
});

describe("sanitizeStoryCastForFirestore", () => {
  it("removes undefined optional fields from story cast", () => {
    const cast = sanitizeStoryCastForFirestore([
      {
        characterId: "buddy_01",
        displayName: "ともだち",
        role: "buddy",
        visualBible: "small glowing companion",
        signatureItems: ["blue scarf"],
        referenceImageUrl: undefined,
        approvedImageUrl: undefined,
      },
    ]);

    expect(cast).toEqual([
      {
        characterId: "buddy_01",
        displayName: "ともだち",
        role: "buddy",
        visualBible: "small glowing companion",
        signatureItems: ["blue scarf"],
      },
    ]);
  });

  it("filters out invalid characters missing required fields", () => {
    const cast = sanitizeStoryCastForFirestore([
      {
        characterId: "ok_01",
        displayName: "ほしのこ",
        role: "magical_friend",
        visualBible: "small glowing star child",
      },
      {
        characterId: "",
        displayName: "broken",
        role: "buddy",
        visualBible: "bad",
      },
    ] as never);

    expect(cast).toEqual([
      {
        characterId: "ok_01",
        displayName: "ほしのこ",
        role: "magical_friend",
        visualBible: "small glowing star child",
      },
    ]);
  });
});
