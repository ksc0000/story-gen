import {
  CANONICAL_ILLUSTRATION_STYLES,
  getStyleExposureEntriesForTemplate,
  getStylePickerProfilesForTemplate,
  getStyleTemplateExposure,
  getUserSelectableStyleExposureEntries,
  isStyleSelectableForTemplate,
  normalizeStyleExposureStyleId,
} from "@/lib/style-exposure";

describe("style exposure config", () => {
  it("keeps aliases out of the canonical style list", () => {
    expect(CANONICAL_ILLUSTRATION_STYLES).toContain("soft_watercolor");
    expect(CANONICAL_ILLUSTRATION_STYLES).toContain("flat_illustration");
    expect(CANONICAL_ILLUSTRATION_STYLES).not.toContain("watercolor");
    expect(CANONICAL_ILLUSTRATION_STYLES).not.toContain("flat");
  });

  it("normalizes legacy aliases to canonical style ids", () => {
    expect(normalizeStyleExposureStyleId("watercolor")).toBe("soft_watercolor");
    expect(normalizeStyleExposureStyleId("flat")).toBe("flat_illustration");
    expect(normalizeStyleExposureStyleId("crayon")).toBe("crayon");
  });

  it("returns a promote exposure for sleepy moon crayon", () => {
    const exposure = getStyleTemplateExposure(
      "fixed-sleepy-moon-adventure-8p",
      "crayon"
    );

    expect(exposure.styleId).toBe("crayon");
    expect(exposure.status).toBe("promote");
    expect(exposure.rationale).toBe("validated_go");
    expect(exposure.featured).toBe(true);
    expect(exposure.userSelectable).toBe(true);
    expect(exposure.internalOnly).toBe(false);
  });

  it("marks zoo anime as blocked", () => {
    const exposure = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "anime_storybook"
    );

    expect(exposure.styleId).toBe("anime_storybook");
    expect(exposure.status).toBe("blocked");
    expect(exposure.rationale).toBe("deferred_stabilization");
    expect(exposure.userSelectable).toBe(false);
    expect(exposure.internalOnly).toBe(true);
  });

  it("resolves alias requests against the matrix", () => {
    const exposure = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "watercolor"
    );

    expect(exposure.styleId).toBe("soft_watercolor");
    expect(exposure.status).toBe("available");
    expect(exposure.userSelectable).toBe(true);
    expect(exposure.isAlias).toBe(true);
  });

  it("treats known but unlisted pairings as available (fallback behavior)", () => {
    const exposure = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "toy_3d"
    );

    expect(exposure.styleId).toBe("toy_3d");
    expect(exposure.status).toBe("available");
    expect(exposure.rationale).toBe("not_validated");
    expect(exposure.userSelectable).toBe(true);
    expect(exposure.internalOnly).toBe(false);
  });

  it("treats unknown style ids as non-selectable unknown entries", () => {
    const exposure = getStyleTemplateExposure(
      "fixed-first-zoo-8p",
      "not_a_style"
    );

    expect(exposure.styleId).toBeNull();
    expect(exposure.styleKnown).toBe(false);
    expect(exposure.status).toBe("internal");
    expect(exposure.userSelectable).toBe(false);
  });

  it("returns sorted template entries with featured options first", () => {
    const entries = getStyleExposureEntriesForTemplate(
      "fixed-sleepy-moon-adventure-8p"
    );

    expect(entries[0]?.styleId).toBe("crayon");
    expect(entries[1]?.styleId).toBe("anime_storybook");
    expect(entries[2]?.styleId).toBe("soft_watercolor");
    expect(entries).toHaveLength(CANONICAL_ILLUSTRATION_STYLES.length);
  });

  it("returns all selectable entries for a template including fallbacks", () => {
    const entries = getUserSelectableStyleExposureEntries("fixed-first-zoo-8p");

    expect(entries.map((entry) => entry.styleId)).toContain("crayon");
    expect(entries.map((entry) => entry.styleId)).toContain("soft_watercolor");
    expect(entries.map((entry) => entry.styleId)).toContain("toy_3d");
  });

  it("provides a simple selectability helper", () => {
    expect(
      isStyleSelectableForTemplate("fixed-first-zoo-8p", "anime_storybook")
    ).toBe(false);
    expect(
      isStyleSelectableForTemplate("fixed-first-zoo-8p", "soft_watercolor")
    ).toBe(true);
  });

  it("returns zoo picker profiles without blocked anime, but including other available styles", () => {
    const profiles = getStylePickerProfilesForTemplate("fixed-first-zoo-8p");

    expect(profiles.map((profile) => profile.id)).toContain("crayon");
    expect(profiles.map((profile) => profile.id)).toContain("soft_watercolor");
    expect(profiles.map((profile) => profile.id)).not.toContain("anime_storybook");
    expect(profiles.map((profile) => profile.id)).toContain("toy_3d");
  });

  it("returns sleepy moon picker profiles starting with priority order", () => {
    const profiles = getStylePickerProfilesForTemplate("fixed-sleepy-moon-adventure-8p");

    expect(profiles.map((profile) => profile.id).slice(0, 3)).toEqual([
      "crayon",
      "anime_storybook",
      "soft_watercolor",
    ]);
  });

  it("falls back to canonical picker profiles when a template is not configured yet", () => {
    const profiles = getStylePickerProfilesForTemplate("some-unconfigured-template");

    expect(profiles.map((profile) => profile.id)).toContain("soft_watercolor");
    expect(profiles.map((profile) => profile.id)).toContain("anime_storybook");
    expect(profiles.map((profile) => profile.id)).not.toContain("watercolor");
    expect(profiles.map((profile) => profile.id)).not.toContain("flat");
  });
});
