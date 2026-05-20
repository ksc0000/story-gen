import { describe, it, expect } from "vitest";
import {
  STORY_RESPONSE_SCHEMA,
  STORY_RESPONSE_SCHEMA_VERSION,
  STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS,
  STORY_PAGE_REQUIRED_FIELDS,
} from "../src/lib/story-response-schema";
import { PAGE_VISUAL_ROLES } from "../src/lib/types";

// ---------------------------------------------------------------------------
// Helper: walk a schema object to find a property definition
// ---------------------------------------------------------------------------
function getProp(schema: Record<string, unknown>, path: string[]): Record<string, unknown> | undefined {
  let current: Record<string, unknown> = schema;
  for (const key of path) {
    const props = current.properties as Record<string, Record<string, unknown>> | undefined;
    if (!props || !props[key]) return undefined;
    current = props[key];
    // Dive into array items if needed for the next segment
    if (current.type === "array" && current.items && path.indexOf(key) < path.length - 1) {
      current = current.items as Record<string, unknown>;
    }
  }
  return current;
}

// ---------------------------------------------------------------------------
// 1. Schema shape
// ---------------------------------------------------------------------------
describe("STORY_RESPONSE_SCHEMA shape", () => {
  it("root type is object", () => {
    expect(STORY_RESPONSE_SCHEMA.type).toBe("object");
  });

  it("has required root fields: title, characterBible, styleBible, pages", () => {
    expect(STORY_RESPONSE_SCHEMA.required).toContain("title");
    expect(STORY_RESPONSE_SCHEMA.required).toContain("characterBible");
    expect(STORY_RESPONSE_SCHEMA.required).toContain("styleBible");
    expect(STORY_RESPONSE_SCHEMA.required).toContain("pages");
  });

  it("pages is array", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.pages.type).toBe("array");
  });

  it("pages.items is object", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.pages.items.type).toBe("object");
  });

  it("pages.items requires text and imagePrompt", () => {
    const pageItems = STORY_RESPONSE_SCHEMA.properties.pages.items;
    expect(pageItems.required).toContain("text");
    expect(pageItems.required).toContain("imagePrompt");
  });

  it("pages.items.properties.text.type is string", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.pages.items.properties.text.type).toBe("string");
  });

  it("pages.items.properties.imagePrompt.type is string", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.pages.items.properties.imagePrompt.type).toBe("string");
  });

  it("mainQuestObject type is string", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).toBe("string");
  });

  it("mainQuestObject is nullable (optional)", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.nullable).toBe(true);
  });

  it("forbiddenQuestObjects is array with string items", () => {
    const fqo = STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects;
    expect(fqo.type).toBe("array");
    expect(fqo.items.type).toBe("string");
  });

  it("storyGoal type is string and nullable", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.storyGoal.type).toBe("string");
    expect(STORY_RESPONSE_SCHEMA.properties.storyGoal.nullable).toBe(true);
  });

  it("titleSpreadText type is string and nullable", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.titleSpreadText.type).toBe("string");
    expect(STORY_RESPONSE_SCHEMA.properties.titleSpreadText.nullable).toBe(true);
  });

  it("openingNarration type is string and nullable", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.openingNarration.type).toBe("string");
    expect(STORY_RESPONSE_SCHEMA.properties.openingNarration.nullable).toBe(true);
  });

  it("coverImagePrompt type is string and nullable", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.coverImagePrompt.type).toBe("string");
    expect(STORY_RESPONSE_SCHEMA.properties.coverImagePrompt.nullable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Known P4 failure prevention
// ---------------------------------------------------------------------------
describe("STORY_RESPONSE_SCHEMA P4 failure prevention", () => {
  it("mainQuestObject type is string — prevents array (P4-6 field_type_mismatch)", () => {
    // The schema declares mainQuestObject as type: "string", not "array" or "object".
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).toBe("string");
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).not.toBe("array");
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).not.toBe("object");
  });

  it("forbiddenQuestObjects type is array — prevents single string", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects.type).toBe("array");
    expect(STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects.type).not.toBe("string");
  });

  it("page.text type is string — prevents array/object", () => {
    const textProp = STORY_RESPONSE_SCHEMA.properties.pages.items.properties.text;
    expect(textProp.type).toBe("string");
    expect(textProp.type).not.toBe("array");
    expect(textProp.type).not.toBe("object");
  });

  it("page.imagePrompt type is string — prevents array/object", () => {
    const ipProp = STORY_RESPONSE_SCHEMA.properties.pages.items.properties.imagePrompt;
    expect(ipProp.type).toBe("string");
    expect(ipProp.type).not.toBe("array");
    expect(ipProp.type).not.toBe("object");
  });
});

// ---------------------------------------------------------------------------
// 3. Enum / structural coverage
// ---------------------------------------------------------------------------
describe("STORY_RESPONSE_SCHEMA enum and structural coverage", () => {
  it("pageVisualRole enum is present and matches PAGE_VISUAL_ROLES", () => {
    const pvr = STORY_RESPONSE_SCHEMA.properties.pages.items.properties.pageVisualRole;
    expect(pvr.type).toBe("string");
    expect(pvr.enum).toBeDefined();
    expect(pvr.enum).toEqual(expect.arrayContaining([...PAGE_VISUAL_ROLES]));
    expect([...PAGE_VISUAL_ROLES]).toEqual(expect.arrayContaining(pvr.enum!));
  });

  it("narrativeDevice is an object with expected sub-fields", () => {
    const nd = STORY_RESPONSE_SCHEMA.properties.narrativeDevice;
    expect(nd.type).toBe("object");
    expect(nd.properties).toHaveProperty("repeatedPhrase");
    expect(nd.properties).toHaveProperty("visualMotif");
    expect(nd.properties).toHaveProperty("setup");
    expect(nd.properties).toHaveProperty("payoff");
    expect(nd.properties).toHaveProperty("hiddenDetails");
  });

  it("narrativeDevice.hiddenDetails is array of strings", () => {
    const hd = STORY_RESPONSE_SCHEMA.properties.narrativeDevice.properties!.hiddenDetails;
    expect(hd.type).toBe("array");
    expect(hd.items.type).toBe("string");
  });

  it("cast is an array of character objects", () => {
    const cast = STORY_RESPONSE_SCHEMA.properties.cast;
    expect(cast.type).toBe("array");
    expect(cast.items.type).toBe("object");
  });

  it("cast character requires characterId, displayName, role, visualBible", () => {
    const castReq = STORY_RESPONSE_SCHEMA.properties.cast.items.required;
    expect(castReq).toContain("characterId");
    expect(castReq).toContain("displayName");
    expect(castReq).toContain("role");
    expect(castReq).toContain("visualBible");
  });

  it("cast character role has enum values", () => {
    const roleEnum = STORY_RESPONSE_SCHEMA.properties.cast.items.properties.role.enum;
    expect(roleEnum).toBeDefined();
    expect(roleEnum).toContain("protagonist");
    expect(roleEnum).toContain("buddy");
    expect(roleEnum).toContain("magical_friend");
  });

  it("page optional string fields are nullable", () => {
    const pageProps = STORY_RESPONSE_SCHEMA.properties.pages.items.properties;
    expect(pageProps.compositionHint.nullable).toBe(true);
    expect(pageProps.visualMotifUsage.nullable).toBe(true);
    expect(pageProps.hiddenDetail.nullable).toBe(true);
    expect(pageProps.pageVisualRole.nullable).toBe(true);
    expect(pageProps.focusCharacterId.nullable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Required fields alignment
// ---------------------------------------------------------------------------
describe("STORY_RESPONSE_SCHEMA required fields alignment", () => {
  it("STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS matches schema required", () => {
    expect(STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS).toEqual(STORY_RESPONSE_SCHEMA.required);
  });

  it("STORY_PAGE_REQUIRED_FIELDS matches page schema required", () => {
    expect(STORY_PAGE_REQUIRED_FIELDS).toEqual(
      STORY_RESPONSE_SCHEMA.properties.pages.items.required
    );
  });

  it("required root fields include title and pages", () => {
    expect(STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS).toContain("title");
    expect(STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS).toContain("pages");
  });

  it("required page fields include text and imagePrompt", () => {
    expect(STORY_PAGE_REQUIRED_FIELDS).toContain("text");
    expect(STORY_PAGE_REQUIRED_FIELDS).toContain("imagePrompt");
  });
});

// ---------------------------------------------------------------------------
// 5. Snapshot / serialization stability
// ---------------------------------------------------------------------------
describe("STORY_RESPONSE_SCHEMA serialization", () => {
  it("schema version is a semver string", () => {
    expect(STORY_RESPONSE_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("serializes to JSON deterministically (no functions or circular refs)", () => {
    const json = JSON.stringify(STORY_RESPONSE_SCHEMA);
    expect(json).toBeTruthy();
    const reparsed = JSON.parse(json);
    expect(reparsed).toEqual(STORY_RESPONSE_SCHEMA);
  });

  it("does not contain function values", () => {
    const json = JSON.stringify(STORY_RESPONSE_SCHEMA);
    expect(json).not.toContain("function");
  });

  it("root property count is stable (detect accidental additions)", () => {
    const propKeys = Object.keys(STORY_RESPONSE_SCHEMA.properties);
    // title, characterBible, styleBible, storyGoal, mainQuestObject,
    // forbiddenQuestObjects, titleSpreadText, openingNarration,
    // coverImagePrompt, narrativeDevice, cast, pages = 12
    expect(propKeys.length).toBe(12);
  });

  it("page property count is stable", () => {
    const pagePropKeys = Object.keys(STORY_RESPONSE_SCHEMA.properties.pages.items.properties);
    // text, imagePrompt, compositionHint, visualMotifUsage, hiddenDetail,
    // pageVisualRole, appearingCharacterIds, focusCharacterId = 8
    expect(pagePropKeys.length).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 6. No runtime wiring
// ---------------------------------------------------------------------------
describe("P4-9 scope: no runtime wiring", () => {
  it("schema file exports are plain objects, not classes or instances", () => {
    expect(typeof STORY_RESPONSE_SCHEMA).toBe("object");
    expect(typeof STORY_RESPONSE_SCHEMA_VERSION).toBe("string");
    expect(Array.isArray(STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS)).toBe(true);
    expect(Array.isArray(STORY_PAGE_REQUIRED_FIELDS)).toBe(true);
  });
});
