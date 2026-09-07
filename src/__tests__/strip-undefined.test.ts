import { describe, it, expect } from "vitest";
import { stripUndefined } from "@/lib/strip-undefined";

describe("stripUndefined", () => {
  it("removes undefined keys from a flat object", () => {
    expect(stripUndefined({ a: 1, b: undefined, c: "x" })).toEqual({
      a: 1,
      c: "x",
    });
  });

  it("recurses into nested plain objects", () => {
    expect(
      stripUndefined({ a: { b: undefined, c: 2 }, d: undefined })
    ).toEqual({ a: { c: 2 } });
  });

  it("recurses into arrays", () => {
    expect(stripUndefined([{ a: undefined, b: 1 }, { c: 2 }])).toEqual([
      { b: 1 },
      { c: 2 },
    ]);
  });

  it("keeps null values", () => {
    expect(stripUndefined({ a: null, b: undefined })).toEqual({ a: null });
  });

  it("does not recurse into class instances (e.g. Date)", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const result = stripUndefined({ when: date });
    expect(result.when).toBe(date);
    expect(result.when instanceof Date).toBe(true);
  });

  it("leaves primitives untouched", () => {
    expect(stripUndefined(42)).toBe(42);
    expect(stripUndefined("x")).toBe("x");
    expect(stripUndefined(null)).toBe(null);
  });
});
