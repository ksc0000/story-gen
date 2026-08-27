import { describe, it, expect } from "vitest";
import {
  normalizeStyleExposureTemplateId,
  normalizeStyleExposureStyleId,
  getStyleTemplateExposure,
  isAllowedStyleExposureStatus,
  CANONICAL_ILLUSTRATION_STYLES,
} from "../src/lib/style-exposure";

describe("normalizeStyleExposureTemplateId", () => {
  it("maps legacy template ids to their canonical replacement", () => {
    expect(normalizeStyleExposureTemplateId("fixed-first-zoo")).toBe(
      "fixed-first-zoo-8p"
    );
    expect(
      normalizeStyleExposureTemplateId("fixed-sleepy-moon-adventure")
    ).toBe("fixed-sleepy-moon-adventure-8p");
  });

  it("passes through unknown or already-canonical template ids unchanged", () => {
    expect(normalizeStyleExposureTemplateId("fixed-first-zoo-8p")).toBe(
      "fixed-first-zoo-8p"
    );
    expect(normalizeStyleExposureTemplateId("some-other-template")).toBe(
      "some-other-template"
    );
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(normalizeStyleExposureTemplateId(null)).toBe("");
    expect(normalizeStyleExposureTemplateId(undefined)).toBe("");
    expect(normalizeStyleExposureTemplateId("")).toBe("");
  });
});

describe("normalizeStyleExposureStyleId", () => {
  it("maps legacy style aliases to their canonical id", () => {
    expect(normalizeStyleExposureStyleId("watercolor")).toBe(
      "soft_watercolor"
    );
    expect(normalizeStyleExposureStyleId("flat")).toBe("flat_illustration");
  });

  it("passes through canonical style ids unchanged", () => {
    for (const style of CANONICAL_ILLUSTRATION_STYLES) {
      expect(normalizeStyleExposureStyleId(style)).toBe(style);
    }
  });

  it("returns null for unknown styles or null/undefined input", () => {
    expect(normalizeStyleExposureStyleId("not_a_real_style")).toBeNull();
    expect(normalizeStyleExposureStyleId(null)).toBeNull();
    expect(normalizeStyleExposureStyleId(undefined)).toBeNull();
    expect(normalizeStyleExposureStyleId("")).toBeNull();
  });
});

describe("getStyleTemplateExposure", () => {
  it("blocks unknown/unsupported style ids as internal + not_validated", () => {
    const result = getStyleTemplateExposure(
      "fixed-sleepy-moon-adventure-8p",
      "not_a_real_style"
    );
    expect(result.status).toBe("internal");
    expect(result.rationale).toBe("not_validated");
    expect(result.userSelectable).toBe(false);
    expect(result.internalOnly).toBe(true);
    expect(result.styleKnown).toBe(false);
    expect(result.styleId).toBeNull();
    expect(result.templateKnown).toBe(true);
  });

  it("returns the explicit matrix entry for a promoted style/template pair", () => {
    const result = getStyleTemplateExposure(
      "fixed-sleepy-moon-adventure-8p",
      "crayon"
    );
    expect(result.status).toBe("promote");
    expect(result.rationale).toBe("validated_go");
    expect(result.userSelectable).toBe(true);
    expect(result.internalOnly).toBe(false);
    expect(result.watchNotes).toEqual([]);
    expect(result.templateKnown).toBe(true);
    expect(result.styleKnown).toBe(true);
    expect(result.isAlias).toBe(false);
  });

  it("returns the explicit matrix entry for a blocked style/template pair", () => {
    const result = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "anime_storybook"
    );
    expect(result.status).toBe("blocked");
    expect(result.rationale).toBe("deferred_stabilization");
    expect(result.userSelectable).toBe(false);
    expect(result.internalOnly).toBe(true);
    expect(result.watchNotes).toEqual([
      "Deferred after repeated BF-4/BF-3 instability in T4 validation.",
    ]);
  });

  it("carries watchNotes through for an available/conditional entry", () => {
    const result = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "soft_watercolor"
    );
    expect(result.status).toBe("available");
    expect(result.rationale).toBe("validated_conditional");
    expect(result.userSelectable).toBe(true);
    expect(result.internalOnly).toBe(false);
    expect(result.watchNotes).toEqual([
      "Light continuity watch retained from T4 validation.",
    ]);
  });

  it("resolves legacy template aliases before matrix lookup", () => {
    const direct = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "crayon"
    );
    const viaAlias = getStyleTemplateExposure("fixed-first-zoo", "crayon");
    expect(viaAlias.templateId).toBe("fixed-first-zoo-8p");
    expect(viaAlias.status).toBe(direct.status);
    expect(viaAlias.rationale).toBe(direct.rationale);
  });

  it("marks isAlias true when the requested style id is a legacy alias", () => {
    const result = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "watercolor"
    );
    expect(result.isAlias).toBe(true);
    expect(result.styleId).toBe("soft_watercolor");
    expect(result.requestedStyleId).toBe("watercolor");
  });

  it("falls back to available/not_validated for a known style on an unregistered template", () => {
    const result = getStyleTemplateExposure("some-unknown-template", "crayon");
    expect(result.templateKnown).toBe(false);
    expect(result.styleKnown).toBe(true);
    expect(result.status).toBe("available");
    expect(result.rationale).toBe("not_validated");
    expect(result.userSelectable).toBe(true);
    expect(result.internalOnly).toBe(false);
    expect(result.watchNotes).toEqual([
      "Fallback for unregistered template/style pair.",
    ]);
  });

  it("falls back to available for a known style on a registered template with no explicit matrix entry", () => {
    const result = getStyleTemplateExposure(
      "fixed-sleepy-moon-adventure-8p",
      "pencil_sketch"
    );
    expect(result.templateKnown).toBe(true);
    expect(result.styleKnown).toBe(true);
    expect(result.status).toBe("available");
    expect(result.rationale).toBe("not_validated");
  });
});

describe("isAllowedStyleExposureStatus", () => {
  it("allows promote and available statuses", () => {
    expect(isAllowedStyleExposureStatus("promote")).toBe(true);
    expect(isAllowedStyleExposureStatus("available")).toBe(true);
  });

  it("disallows internal and blocked statuses", () => {
    expect(isAllowedStyleExposureStatus("internal")).toBe(false);
    expect(isAllowedStyleExposureStatus("blocked")).toBe(false);
  });
});
