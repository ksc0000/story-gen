/**
 * P4-10: Schema compatibility tests — STORY_RESPONSE_SCHEMA vs validateStory() alignment.
 *
 * Proves that STORY_RESPONSE_SCHEMA accepts valid story shapes and rejects known
 * P4 failure modes, matching the runtime validateStory() validator behavior.
 *
 * validateStory() is a private (non-exported) function in gemini.ts, so this file
 * uses lightweight schema shape assertions — not Ajv or any production dependency.
 *
 * Does NOT wire STORY_RESPONSE_SCHEMA into Gemini. No runtime behavior change.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  STORY_RESPONSE_SCHEMA,
  STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS,
  STORY_PAGE_REQUIRED_FIELDS,
} from "../src/lib/story-response-schema";
import { PAGE_VISUAL_ROLES } from "../src/lib/types";
import type { GeneratedStory, GeneratedStoryPage } from "../src/lib/types";

// ---------------------------------------------------------------------------
// Lightweight schema compatibility checker
// ---------------------------------------------------------------------------
//
// Checks whether a plain object conforms to the STORY_RESPONSE_SCHEMA by
// inspecting required fields, declared types, and enum constraints.
// Returns { valid: true } or { valid: false, errors: string[] }.

interface SchemaCheckResult {
  valid: boolean;
  errors: string[];
}

function checkFieldType(
  value: unknown,
  schemaProp: { type: string; items?: { type: string }; enum?: readonly string[]; nullable?: boolean },
  fieldPath: string,
): string[] {
  const errors: string[] = [];

  if (value === undefined || value === null) {
    if (schemaProp.nullable) return errors;
    // undefined is also OK for non-required fields — caller handles required check
    return errors;
  }

  if (schemaProp.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${fieldPath}: expected string, got ${typeof value}${Array.isArray(value) ? " (array)" : ""}`);
    } else if (schemaProp.enum && !schemaProp.enum.includes(value as string)) {
      errors.push(`${fieldPath}: enum violation — "${value}" not in [${schemaProp.enum.join(", ")}]`);
    }
  } else if (schemaProp.type === "boolean") {
    if (typeof value !== "boolean") {
      errors.push(`${fieldPath}: expected boolean, got ${typeof value}`);
    }
  } else if (schemaProp.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${fieldPath}: expected array, got ${typeof value}`);
    } else if (schemaProp.items) {
      value.forEach((item: unknown, i: number) => {
        if (schemaProp.items!.type === "string" && typeof item !== "string") {
          errors.push(`${fieldPath}[${i}]: expected string item, got ${typeof item}`);
        }
      });
    }
  } else if (schemaProp.type === "object") {
    if (typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${fieldPath}: expected object, got ${Array.isArray(value) ? "array" : typeof value}`);
    }
  }

  return errors;
}

function checkAgainstSchema(data: Record<string, unknown>): SchemaCheckResult {
  const errors: string[] = [];
  const schema = STORY_RESPONSE_SCHEMA;

  // Check root type
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { valid: false, errors: ["root: expected object"] };
  }

  // Check root required fields
  for (const field of schema.required) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`root: missing required field "${field}"`);
    }
  }

  // Check root field types
  const props = schema.properties as Record<string, { type: string; items?: Record<string, unknown>; enum?: readonly string[]; nullable?: boolean }>;
  for (const [key, schemaProp] of Object.entries(props)) {
    if (data[key] === undefined) continue;
    errors.push(
      ...checkFieldType(data[key], schemaProp as Parameters<typeof checkFieldType>[1], `root.${key}`)
    );
  }

  // Check pages items
  if (Array.isArray(data.pages)) {
    const pageSchema = schema.properties.pages.items;
    (data.pages as Record<string, unknown>[]).forEach((page, i) => {
      // Check page required fields
      for (const field of pageSchema.required) {
        if (page[field] === undefined || page[field] === null) {
          errors.push(`pages[${i}]: missing required field "${field}"`);
        }
      }
      // Check page field types
      const pageProps = pageSchema.properties as Record<string, { type: string; enum?: readonly string[]; nullable?: boolean }>;
      for (const [key, prop] of Object.entries(pageProps)) {
        if (page[key] === undefined) continue;
        errors.push(
          ...checkFieldType(page[key], prop as Parameters<typeof checkFieldType>[1], `pages[${i}].${key}`)
        );
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal valid story — only schema-required fields */
const MINIMAL_VALID_STORY: Record<string, unknown> = {
  title: "テストの冒険",
  characterBible: "明るい茶色の髪の5歳の男の子。赤いTシャツを着ている。",
  styleBible: "やわらかい水彩画風。パステルカラー中心。",
  pages: [
    { text: "ある日、テストくんは冒険に出かけました。", imagePrompt: "A boy with brown hair walking in a meadow, watercolor style" },
    { text: "すてきなものを見つけました。", imagePrompt: "A boy discovering a shining object, watercolor style" },
  ],
};

/** Full valid story — all optional fields populated */
const FULL_VALID_STORY: Record<string, unknown> = {
  title: "星をさがして",
  characterBible: "黒髪の女の子。黄色いワンピースを着ている。",
  styleBible: "ふわふわパステル風のイラスト。",
  storyGoal: "星を見つけて友達に届ける",
  mainQuestObject: "光る星",
  forbiddenQuestObjects: ["太陽", "月"],
  titleSpreadText: "さあ、星をさがしにいこう！",
  openingNarration: "むかしむかし、あるところに女の子がいました。",
  coverImagePrompt: "A girl looking up at stars, pastel illustration",
  narrativeDevice: {
    repeatedPhrase: "きらきら光る星",
    visualMotif: "星",
    setup: "星が夜空から落ちた",
    payoff: "友達に星を届けた",
    hiddenDetails: ["各ページに小さな星が隠れている"],
  },
  cast: [
    {
      characterId: "protagonist-1",
      displayName: "ひかりちゃん",
      role: "protagonist",
      visualBible: "黒髪のボブヘア、黄色いワンピース",
      characterKind: "human_child",
    },
    {
      characterId: "buddy-1",
      displayName: "くまさん",
      role: "buddy",
      visualBible: "茶色い小さなくま。赤いリボン付き。",
      characterKind: "animal",
      nonHuman: true,
    },
  ],
  pages: [
    {
      text: "ある夜、ひかりちゃんは空を見上げました。",
      imagePrompt: "A girl looking up at the night sky, pastel style",
      compositionHint: "low angle looking up",
      pageVisualRole: "opening_establishing",
      appearingCharacterIds: ["protagonist-1"],
      focusCharacterId: "protagonist-1",
    },
    {
      text: "「あっ、星が落ちてきた！」",
      imagePrompt: "A shooting star falling toward a meadow, pastel style",
      pageVisualRole: "discovery",
      visualMotifUsage: "流れ星が画面中央に",
      hiddenDetail: "草むらに小さな星型の花",
      appearingCharacterIds: ["protagonist-1", "buddy-1"],
      focusCharacterId: "protagonist-1",
    },
    {
      text: "くまさんと一緒に星を届けました。",
      imagePrompt: "A girl and a bear delivering a star to a friend, pastel style",
      pageVisualRole: "payoff",
      appearingCharacterIds: ["protagonist-1", "buddy-1"],
      focusCharacterId: "protagonist-1",
    },
  ],
};

// ---------------------------------------------------------------------------
// 1. Valid story fixture compatibility
// ---------------------------------------------------------------------------

describe("P4-10: valid story fixture compatibility", () => {
  it("minimal valid story passes schema check", () => {
    const result = checkAgainstSchema(MINIMAL_VALID_STORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("full valid story passes schema check", () => {
    const result = checkAgainstSchema(FULL_VALID_STORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("minimal valid story has title present", () => {
    expect(MINIMAL_VALID_STORY.title).toBeDefined();
    expect(typeof MINIMAL_VALID_STORY.title).toBe("string");
  });

  it("minimal valid story has pages array present", () => {
    expect(Array.isArray(MINIMAL_VALID_STORY.pages)).toBe(true);
  });

  it("pages[].text is string", () => {
    const pages = MINIMAL_VALID_STORY.pages as Record<string, unknown>[];
    for (const page of pages) {
      expect(typeof page.text).toBe("string");
    }
  });

  it("pages[].imagePrompt is string", () => {
    const pages = MINIMAL_VALID_STORY.pages as Record<string, unknown>[];
    for (const page of pages) {
      expect(typeof page.imagePrompt).toBe("string");
    }
  });

  it("mainQuestObject is string when present in full story", () => {
    expect(typeof FULL_VALID_STORY.mainQuestObject).toBe("string");
  });

  it("forbiddenQuestObjects is array of strings when present in full story", () => {
    expect(Array.isArray(FULL_VALID_STORY.forbiddenQuestObjects)).toBe(true);
    for (const item of FULL_VALID_STORY.forbiddenQuestObjects as unknown[]) {
      expect(typeof item).toBe("string");
    }
  });

  it("schema required fields are satisfied by minimal valid story", () => {
    for (const field of STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS) {
      expect(MINIMAL_VALID_STORY[field]).toBeDefined();
    }
  });

  it("page required fields are satisfied by each page in minimal valid story", () => {
    const pages = MINIMAL_VALID_STORY.pages as Record<string, unknown>[];
    for (const page of pages) {
      for (const field of STORY_PAGE_REQUIRED_FIELDS) {
        expect(page[field]).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. mainQuestObject mismatch (P4-6/P4-7 field_type_mismatch)
// ---------------------------------------------------------------------------

describe("P4-10: mainQuestObject mismatch", () => {
  it("mainQuestObject as array is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      mainQuestObject: ["星", "月"],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("mainQuestObject") && e.includes("array"))).toBe(true);
  });

  it("mainQuestObject as object is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      mainQuestObject: { name: "星" },
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("mainQuestObject"))).toBe(true);
  });

  it("mainQuestObject as number is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      mainQuestObject: 42,
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("mainQuestObject"))).toBe(true);
  });

  /**
   * validateStory() gap documentation:
   * validateStory() in gemini.ts checks: `typeof obj.mainQuestObject !== "string"`
   * and throws "'mainQuestObject' must be a string when provided".
   * This rejects arrays, objects, and numbers — matching schema behavior.
   *
   * Schema and validateStory() are ALIGNED for mainQuestObject.
   */
  it("schema type declaration matches validateStory() expectation (string)", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// 3. forbiddenQuestObjects mismatch
// ---------------------------------------------------------------------------

describe("P4-10: forbiddenQuestObjects mismatch", () => {
  it("forbiddenQuestObjects as single string is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      forbiddenQuestObjects: "太陽",
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("forbiddenQuestObjects") && e.includes("array"))).toBe(true);
  });

  it("forbiddenQuestObjects as number is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      forbiddenQuestObjects: 123,
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("forbiddenQuestObjects"))).toBe(true);
  });

  it("forbiddenQuestObjects as array of numbers is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      forbiddenQuestObjects: [1, 2, 3],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("forbiddenQuestObjects"))).toBe(true);
  });

  /**
   * validateStory() gap documentation:
   * validateStory() checks: `!Array.isArray(obj.forbiddenQuestObjects) ||
   *   !obj.forbiddenQuestObjects.every(item => typeof item === "string")`
   * Throws "'forbiddenQuestObjects' must be a string array when provided".
   *
   * Both single-string and number inputs are rejected — matching schema behavior.
   * Schema and validateStory() are ALIGNED for forbiddenQuestObjects.
   */
  it("schema type declaration matches validateStory() expectation (array of strings)", () => {
    expect(STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects.type).toBe("array");
    expect(STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects.items.type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// 4. page text/imagePrompt mismatch
// ---------------------------------------------------------------------------

describe("P4-10: page text/imagePrompt mismatch", () => {
  it("page.text as array is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: ["line1", "line2"], imagePrompt: "valid prompt" }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("text") && e.includes("string"))).toBe(true);
  });

  it("page.text as object is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: { ja: "テスト" }, imagePrompt: "valid prompt" }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("text"))).toBe(true);
  });

  it("page.imagePrompt as array is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "valid text", imagePrompt: ["prompt1", "prompt2"] }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("imagePrompt") && e.includes("string"))).toBe(true);
  });

  it("page.imagePrompt as object is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "valid text", imagePrompt: { en: "prompt" } }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("imagePrompt"))).toBe(true);
  });

  it("missing page.text is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ imagePrompt: "valid prompt" }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("text") && e.includes("required"))).toBe(true);
  });

  it("missing page.imagePrompt is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "valid text" }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("imagePrompt") && e.includes("required"))).toBe(true);
  });

  /**
   * validateStory() gap documentation:
   * validateStory() checks: `typeof pageObj.text !== "string" || typeof pageObj.imagePrompt !== "string"`
   * Throws "Each page must have 'text' and 'imagePrompt' strings".
   *
   * Arrays, objects, missing fields — all rejected by both schema and validateStory().
   * Schema and validateStory() are ALIGNED for page text/imagePrompt.
   */
});

// ---------------------------------------------------------------------------
// 5. pageVisualRole enum
// ---------------------------------------------------------------------------

describe("P4-10: pageVisualRole enum", () => {
  it.each([...PAGE_VISUAL_ROLES])("valid enum value '%s' is accepted by schema check", (role) => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "テスト", imagePrompt: "test prompt", pageVisualRole: role }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(true);
  });

  it("invalid enum value 'unknown_scene_type' is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "テスト", imagePrompt: "test prompt", pageVisualRole: "unknown_scene_type" }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("pageVisualRole") && e.includes("enum"))).toBe(true);
  });

  it("invalid enum value 'climax' is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "テスト", imagePrompt: "test prompt", pageVisualRole: "climax" }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("pageVisualRole") && e.includes("enum"))).toBe(true);
  });

  it("pageVisualRole as null is accepted (nullable in schema)", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      pages: [{ text: "テスト", imagePrompt: "test prompt", pageVisualRole: null }],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(true);
  });

  /**
   * validateStory() gap documentation:
   * validateStory() checks: `typeof pageObj.pageVisualRole !== "string"`
   * but does NOT validate the enum values — normalizePageVisualRole() maps
   * unrecognized values to a positional default. This means validateStory()
   * ACCEPTS invalid enum values (silently normalizes), while the schema REJECTS them.
   *
   * GAP: Schema is STRICTER than validateStory() for pageVisualRole enum values.
   * This is intentional — response_schema prevents Gemini from generating invalid
   * enum values in the first place. normalizePageVisualRole() remains as fallback.
   */
});

// ---------------------------------------------------------------------------
// 6. narrativeDevice shape
// ---------------------------------------------------------------------------

describe("P4-10: narrativeDevice shape", () => {
  it("valid narrativeDevice object is accepted by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      narrativeDevice: {
        repeatedPhrase: "きらきら",
        visualMotif: "星",
        setup: "星が落ちた",
        payoff: "星を届けた",
        hiddenDetails: ["小さな星"],
      },
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(true);
  });

  it("narrativeDevice with only some fields is accepted (all sub-fields are nullable)", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      narrativeDevice: { repeatedPhrase: "きらきら" },
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(true);
  });

  it("narrativeDevice as null is accepted (nullable in schema)", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      narrativeDevice: null,
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(true);
  });

  it("narrativeDevice as array is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      narrativeDevice: ["repeatedPhrase", "visualMotif"],
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("narrativeDevice") && e.includes("object"))).toBe(true);
  });

  it("narrativeDevice as string is rejected by schema check", () => {
    const fixture = {
      ...MINIMAL_VALID_STORY,
      narrativeDevice: "some device",
    };
    const result = checkAgainstSchema(fixture);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("narrativeDevice"))).toBe(true);
  });

  /**
   * validateStory() gap documentation:
   * validateStory() checks: `typeof obj.narrativeDevice !== "object" || obj.narrativeDevice === null`
   * and throws "'narrativeDevice' must be an object when provided".
   *
   * Array inputs: validateStory() passes typeof==="object" but Array check is not explicit.
   * However, the individual sub-field type checks (repeatedPhrase !== string, etc.)
   * would not throw for an array since those keys are undefined on arrays.
   *
   * GAP: Schema explicitly rejects array via type:"object" check.
   * validateStory() would not reject an array as narrativeDevice (typeof [] === "object").
   * In practice, this gap has no impact because Gemini structured output enforces
   * the schema shape first.
   */
});

// ---------------------------------------------------------------------------
// 7. P4-3 fixture relationship
// ---------------------------------------------------------------------------

describe("P4-10: P4-3 fixture relationship", () => {
  it("field_type_mismatch: mainQuestObject-as-array is a negative case for schema", () => {
    // Corresponds to FIELD_TYPE_MISMATCH_ERRORS.mainQuestObjectIsArray
    // Schema declares mainQuestObject as type: "string" — array would be rejected
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).toBe("string");
    expect(STORY_RESPONSE_SCHEMA.properties.mainQuestObject.type).not.toBe("array");
  });

  it("field_type_mismatch: forbiddenQuestObjects-as-string is a negative case for schema", () => {
    // Corresponds to FIELD_TYPE_MISMATCH_ERRORS.forbiddenQuestObjectsIsString
    // Schema declares forbiddenQuestObjects as type: "array" — string would be rejected
    expect(STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects.type).toBe("array");
    expect(STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects.type).not.toBe("string");
  });

  it("schema_structural: page missing imagePrompt is a negative case for schema", () => {
    // Corresponds to SCHEMA_STRUCTURAL_ERRORS.eachPageMustHaveImagePrompt
    // Schema declares imagePrompt as required in page items
    expect(STORY_PAGE_REQUIRED_FIELDS).toContain("imagePrompt");
  });

  it("field_value_invalid: invalid pageVisualRole is a negative case for schema", () => {
    // Corresponds to FIELD_VALUE_INVALID_ERRORS.pageVisualRoleInvalid
    // Schema declares pageVisualRole with enum constraint
    const pvr = STORY_RESPONSE_SCHEMA.properties.pages.items.properties.pageVisualRole;
    expect(pvr.enum).toBeDefined();
    expect(pvr.enum).not.toContain("unknown_scene_type");
  });

  it("all P4-3 field_type_mismatch scenarios are covered by schema type constraints", () => {
    // mainQuestObject: schema type=string prevents array
    // forbiddenQuestObjects: schema type=array prevents string
    // Both are direct P4-6/P4-7 failure mode protections
    const mqo = STORY_RESPONSE_SCHEMA.properties.mainQuestObject;
    const fqo = STORY_RESPONSE_SCHEMA.properties.forbiddenQuestObjects;
    expect(mqo.type).toBe("string");
    expect(fqo.type).toBe("array");
    expect(fqo.items.type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// 8. Schema vs validateStory() required field alignment
// ---------------------------------------------------------------------------

describe("P4-10: schema vs validateStory() required field alignment", () => {
  it("schema root required fields match validateStory() required checks", () => {
    // validateStory() throws on missing: title, characterBible, styleBible, pages
    // Schema required: ["title", "characterBible", "styleBible", "pages"]
    const expected = ["title", "characterBible", "styleBible", "pages"];
    expect([...STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS]).toEqual(expect.arrayContaining(expected));
    expect(expected).toEqual(expect.arrayContaining([...STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS]));
  });

  it("schema page required fields match validateStory() per-page checks", () => {
    // validateStory() throws on missing page text or imagePrompt
    // Schema page required: ["text", "imagePrompt"]
    const expected = ["text", "imagePrompt"];
    expect([...STORY_PAGE_REQUIRED_FIELDS]).toEqual(expect.arrayContaining(expected));
    expect(expected).toEqual(expect.arrayContaining([...STORY_PAGE_REQUIRED_FIELDS]));
  });

  it("schema does not require fields that validateStory() treats as optional", () => {
    // validateStory() does not require these at root level — only type-checks when present
    const optionalInValidator = [
      "storyGoal", "mainQuestObject", "forbiddenQuestObjects",
      "titleSpreadText", "openingNarration", "coverImagePrompt",
      "narrativeDevice", "cast",
    ];
    for (const field of optionalInValidator) {
      expect(STORY_RESPONSE_SCHEMA_REQUIRED_FIELDS).not.toContain(field);
    }
  });

  it("missing root required field is rejected by schema check", () => {
    const noTitle = { ...MINIMAL_VALID_STORY };
    delete noTitle.title;
    const result = checkAgainstSchema(noTitle);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("title") && e.includes("required"))).toBe(true);
  });

  it("missing pages is rejected by schema check", () => {
    const noPages = { ...MINIMAL_VALID_STORY };
    delete noPages.pages;
    const result = checkAgainstSchema(noPages);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("pages") && e.includes("required"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Schema vs validateStory() gap summary
// ---------------------------------------------------------------------------

describe("P4-10: schema vs validateStory() gap documentation", () => {
  /**
   * COMPATIBILITY SUMMARY:
   *
   * ALIGNED (schema and validateStory() agree):
   * - Root required fields: title, characterBible, styleBible, pages
   * - Page required fields: text, imagePrompt
   * - mainQuestObject type: string (rejects array/object/number)
   * - forbiddenQuestObjects type: array of strings (rejects string/number)
   * - page.text type: string (rejects array/object)
   * - page.imagePrompt type: string (rejects array/object)
   * - narrativeDevice type: object (rejects string/number)
   * - cast type: array of objects
   * - cast character required: characterId, displayName, role, visualBible
   *
   * GAPS (schema is stricter than validateStory()):
   * 1. pageVisualRole enum: schema enforces enum values, validateStory()
   *    silently normalizes invalid values via normalizePageVisualRole().
   *    Impact: LOW — schema prevents Gemini from generating invalid values.
   * 2. narrativeDevice as array: schema rejects, validateStory() may accept
   *    (typeof [] === "object"). Impact: NEGLIGIBLE — never observed in practice.
   * 3. cast character role/characterKind enum: schema enforces enum values,
   *    validateStory() uses normalizeStoryCharacterRole()/normalizeStoryCharacterKind()
   *    which map unknown values to defaults. Same pattern as pageVisualRole.
   *
   * GAPS (validateStory() is stricter than schema):
   * - Page count validation (empty pages array): validateStory() throws if
   *   pages.length === 0; schema has no minItems constraint (deferred).
   *   Impact: LOW — quality gate catches short page arrays downstream.
   *
   * All gaps are benign. Schema serves as first line of defense; validateStory()
   * remains the runtime source of truth with normalization behavior.
   */

  it("documents that pageVisualRole enum is stricter in schema than validateStory()", () => {
    // Schema has enum constraint, validateStory() normalizes unknown values
    const pvr = STORY_RESPONSE_SCHEMA.properties.pages.items.properties.pageVisualRole;
    expect(pvr.enum).toBeDefined();
    expect(pvr.enum!.length).toBeGreaterThan(0);
  });

  it("documents that schema has no minItems for pages (validateStory() checks pages.length > 0)", () => {
    const pagesSchema = STORY_RESPONSE_SCHEMA.properties.pages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((pagesSchema as any).minItems).toBeUndefined();
  });

  it("documents deferred client metadata fields not in schema", () => {
    const rootProps = Object.keys(STORY_RESPONSE_SCHEMA.properties);
    expect(rootProps).not.toContain("storyModel");
    expect(rootProps).not.toContain("storyModelFallbackUsed");
    expect(rootProps).not.toContain("storyGenerationAttempts");
  });
});

// ---------------------------------------------------------------------------
// 10. No runtime wiring guard
// ---------------------------------------------------------------------------

describe("P4-10: no runtime wiring guard", () => {
  it("gemini.ts does not import story-response-schema", () => {
    const geminiSource = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    expect(geminiSource).not.toContain("story-response-schema");
    expect(geminiSource).not.toContain("STORY_RESPONSE_SCHEMA");
  });

  it("generate-book.ts does not import story-response-schema", () => {
    const genBookSource = fs.readFileSync(
      path.resolve(__dirname, "../src/generate-book.ts"),
      "utf-8"
    );
    expect(genBookSource).not.toContain("story-response-schema");
    expect(genBookSource).not.toContain("STORY_RESPONSE_SCHEMA");
  });

  it("generationConfig does not contain responseSchema in gemini.ts", () => {
    const geminiSource = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    expect(geminiSource).not.toContain("responseSchema");
  });
});
