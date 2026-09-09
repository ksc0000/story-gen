import { describe, it, expect } from "vitest";
import { getTemplateBaseId } from "@/lib/template-base-id";

describe("getTemplateBaseId", () => {
  it("prefers variantOf when present", () => {
    expect(getTemplateBaseId({ id: "fixed-bedtime-8p", variantOf: "fixed-bedtime" })).toBe(
      "fixed-bedtime"
    );
  });

  it("strips a page-count suffix like -4p / -8p / -12p", () => {
    expect(getTemplateBaseId({ id: "fixed-bedtime-4p" })).toBe("fixed-bedtime");
    expect(getTemplateBaseId({ id: "fixed-bedtime-8p" })).toBe("fixed-bedtime");
    expect(getTemplateBaseId({ id: "fixed-bedtime-12p" })).toBe("fixed-bedtime");
  });

  it("leaves an id without a page-count suffix unchanged", () => {
    expect(getTemplateBaseId({ id: "fixed-bedtime" })).toBe("fixed-bedtime");
  });

  it("only strips a trailing page-count suffix, not one mid-string", () => {
    expect(getTemplateBaseId({ id: "fixed-8p-adventure" })).toBe("fixed-8p-adventure");
  });
});
