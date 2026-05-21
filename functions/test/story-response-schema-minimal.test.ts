/**
 * P4-12f: Minimal story response schema tests.
 *
 * Validates that STORY_RESPONSE_SCHEMA_MINIMAL is a dramatically smaller schema
 * that covers only the must-have JSON envelope fields, while preserving
 * validateStory() as the runtime validator for all optional/semantic fields.
 *
 * Does NOT wire the minimal schema to Gemini runtime.
 * Does NOT make live Gemini calls.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  STORY_RESPONSE_SCHEMA,
  STORY_RESPONSE_SCHEMA_MINIMAL,
  STORY_RESPONSE_SCHEMA_MINIMAL_VERSION,
  STORY_RESPONSE_SCHEMA_MINIMAL_REQUIRED_FIELDS,
  STORY_RESPONSE_SCHEMA_MINIMAL_PAGE_REQUIRED_FIELDS,
} from "../src/lib/story-response-schema";

// ---------------------------------------------------------------------------
// Lightweight schema checker for minimal schema
// ---------------------------------------------------------------------------

interface SchemaCheckResult {
  valid: boolean;
  errors: string[];
}

function checkMinimalSchema(data: Record<string, unknown>): SchemaCheckResult {
  const errors: string[] = [];
  const schema = STORY_RESPONSE_SCHEMA_MINIMAL;

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
  for (const [key, schemaProp] of Object.entries(schema.properties)) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    if (schemaProp.type === "string" && typeof value !== "string") {
      errors.push(`root.${key}: expected string, got ${typeof value}`);
    }
    if (schemaProp.type === "array" && !Array.isArray(value)) {
      errors.push(`root.${key}: expected array, got ${typeof value}`);
    }
  }

  // Check pages items
  if (Array.isArray(data.pages)) {
    const pageSchema = schema.properties.pages.items;
    (data.pages as Record<string, unknown>[]).forEach((page, i) => {
      for (const field of pageSchema.required) {
        if (page[field] === undefined || page[field] === null) {
          errors.push(`pages[${i}]: missing required field "${field}"`);
        }
      }
      for (const [key, prop] of Object.entries(pageSchema.properties)) {
        const value = page[key];
        if (value === undefined || value === null) continue;
        if (prop.type === "string" && typeof value !== "string") {
          errors.push(`pages[${i}].${key}: expected string, got ${typeof value}`);
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_MINIMAL_STORY: Record<string, unknown> = {
  title: "テストの冒険",
  characterBible: "明るい茶色の髪の5歳の男の子。赤いTシャツを着ている。",
  styleBible: "やわらかい水彩画風。パステルカラー中心。",
  pages: [
    { text: "ある日、テストくんは冒険に出かけました。", imagePrompt: "A boy walking in a meadow, watercolor" },
    { text: "すてきなものを見つけました。", imagePrompt: "A boy finding a shining object, watercolor" },
  ],
};

// ---------------------------------------------------------------------------
// 1. Exports exist
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema exports", () => {
  it("STORY_RESPONSE_SCHEMA_MINIMAL is defined", () => {
    expect(STORY_RESPONSE_SCHEMA_MINIMAL).toBeDefined();
  });

  it("STORY_RESPONSE_SCHEMA_MINIMAL_VERSION is defined", () => {
    expect(STORY_RESPONSE_SCHEMA_MINIMAL_VERSION).toBe("0.1.0");
  });

  it("STORY_RESPONSE_SCHEMA_MINIMAL_REQUIRED_FIELDS is defined", () => {
    expect(STORY_RESPONSE_SCHEMA_MINIMAL_REQUIRED_FIELDS).toBeDefined();
    expect(Array.isArray(STORY_RESPONSE_SCHEMA_MINIMAL_REQUIRED_FIELDS)).toBe(true);
  });

  it("STORY_RESPONSE_SCHEMA_MINIMAL_PAGE_REQUIRED_FIELDS is defined", () => {
    expect(STORY_RESPONSE_SCHEMA_MINIMAL_PAGE_REQUIRED_FIELDS).toBeDefined();
    expect(Array.isArray(STORY_RESPONSE_SCHEMA_MINIMAL_PAGE_REQUIRED_FIELDS)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Root required fields
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema root required fields", () => {
  it("requires exactly: title, characterBible, styleBible, pages", () => {
    const required = [...STORY_RESPONSE_SCHEMA_MINIMAL_REQUIRED_FIELDS].sort();
    expect(required).toEqual(["characterBible", "pages", "styleBible", "title"]);
  });
});

// ---------------------------------------------------------------------------
// 3. Page required fields
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema page required fields", () => {
  it("requires exactly: text, imagePrompt", () => {
    const required = [...STORY_RESPONSE_SCHEMA_MINIMAL_PAGE_REQUIRED_FIELDS].sort();
    expect(required).toEqual(["imagePrompt", "text"]);
  });
});

// ---------------------------------------------------------------------------
// 4. Root properties exclude heavy optional fields
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema excludes heavy optional root fields", () => {
  const rootKeys = Object.keys(STORY_RESPONSE_SCHEMA_MINIMAL.properties);

  it.each([
    "cast",
    "narrativeDevice",
    "storyGoal",
    "mainQuestObject",
    "forbiddenQuestObjects",
    "titleSpreadText",
    "openingNarration",
    "coverImagePrompt",
  ])("root properties do NOT include %s", (field) => {
    expect(rootKeys).not.toContain(field);
  });
});

// ---------------------------------------------------------------------------
// 5. Page properties exclude heavy optional fields
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema excludes heavy optional page fields", () => {
  const pageKeys = Object.keys(STORY_RESPONSE_SCHEMA_MINIMAL.properties.pages.items.properties);

  it.each([
    "pageVisualRole",
    "compositionHint",
    "visualMotifUsage",
    "hiddenDetail",
    "appearingCharacterIds",
    "focusCharacterId",
  ])("page properties do NOT include %s", (field) => {
    expect(pageKeys).not.toContain(field);
  });
});

// ---------------------------------------------------------------------------
// 6. Valid minimal fixture accepted
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema acceptance", () => {
  it("valid minimal story passes schema check", () => {
    const result = checkMinimalSchema(VALID_MINIMAL_STORY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("valid story with extra fields still passes (schema ignores unknown fields)", () => {
    const storyWithExtras = {
      ...VALID_MINIMAL_STORY,
      storyGoal: "find the star",
      mainQuestObject: "star",
      cast: [{ characterId: "p1", displayName: "Test", role: "protagonist", visualBible: "..." }],
      pages: [
        {
          text: "Page 1",
          imagePrompt: "prompt 1",
          pageVisualRole: "opening_establishing",
          compositionHint: "wide shot",
        },
      ],
    };
    const result = checkMinimalSchema(storyWithExtras);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Missing required root fields rejected
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema rejects missing required root fields", () => {
  it("missing title is rejected", () => {
    const { title, ...rest } = VALID_MINIMAL_STORY;
    const result = checkMinimalSchema(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("title"))).toBe(true);
  });

  it("missing characterBible is rejected", () => {
    const { characterBible, ...rest } = VALID_MINIMAL_STORY;
    const result = checkMinimalSchema(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("characterBible"))).toBe(true);
  });

  it("missing styleBible is rejected", () => {
    const { styleBible, ...rest } = VALID_MINIMAL_STORY;
    const result = checkMinimalSchema(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("styleBible"))).toBe(true);
  });

  it("missing pages is rejected", () => {
    const { pages, ...rest } = VALID_MINIMAL_STORY;
    const result = checkMinimalSchema(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("pages"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Missing page text/imagePrompt rejected
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema rejects missing page required fields", () => {
  it("missing page text is rejected", () => {
    const story = {
      ...VALID_MINIMAL_STORY,
      pages: [{ imagePrompt: "prompt" }],
    };
    const result = checkMinimalSchema(story);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("text"))).toBe(true);
  });

  it("missing page imagePrompt is rejected", () => {
    const story = {
      ...VALID_MINIMAL_STORY,
      pages: [{ text: "text" }],
    };
    const result = checkMinimalSchema(story);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("imagePrompt"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Wrong page field types rejected
// ---------------------------------------------------------------------------

describe("P4-12f: minimal schema rejects wrong page field types", () => {
  it("page text as number is rejected", () => {
    const story = {
      ...VALID_MINIMAL_STORY,
      pages: [{ text: 123, imagePrompt: "prompt" }],
    };
    const result = checkMinimalSchema(story);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("text") && e.includes("string"))).toBe(true);
  });

  it("page imagePrompt as array is rejected", () => {
    const story = {
      ...VALID_MINIMAL_STORY,
      pages: [{ text: "text", imagePrompt: ["a", "b"] }],
    };
    const result = checkMinimalSchema(story);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("imagePrompt") && e.includes("string"))).toBe(true);
  });

  it("page text as object is rejected", () => {
    const story = {
      ...VALID_MINIMAL_STORY,
      pages: [{ text: { ja: "text" }, imagePrompt: "prompt" }],
    };
    const result = checkMinimalSchema(story);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("text"))).toBe(true);
  });

  it("page imagePrompt as number is rejected", () => {
    const story = {
      ...VALID_MINIMAL_STORY,
      pages: [{ text: "text", imagePrompt: 42 }],
    };
    const result = checkMinimalSchema(story);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("imagePrompt"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. Schema size comparison
// ---------------------------------------------------------------------------

describe("P4-12f: schema size comparison", () => {
  it("minimal schema is significantly smaller than full schema", () => {
    const fullSize = JSON.stringify(STORY_RESPONSE_SCHEMA).length;
    const minimalSize = JSON.stringify(STORY_RESPONSE_SCHEMA_MINIMAL).length;
    const ratio = minimalSize / fullSize;

    // Minimal schema must be less than 35% of full schema size
    expect(ratio).toBeLessThan(0.35);

    // Log for documentation purposes
    console.log(`Full schema size: ${fullSize} chars`);
    console.log(`Minimal schema size: ${minimalSize} chars`);
    console.log(`Ratio: ${(ratio * 100).toFixed(1)}%`);
  });

  it("minimal schema has fewer root properties than full schema", () => {
    const fullCount = Object.keys(STORY_RESPONSE_SCHEMA.properties).length;
    const minimalCount = Object.keys(STORY_RESPONSE_SCHEMA_MINIMAL.properties).length;
    expect(minimalCount).toBeLessThan(fullCount);
  });

  it("minimal page schema has fewer properties than full page schema", () => {
    const fullPageCount = Object.keys(STORY_RESPONSE_SCHEMA.properties.pages.items.properties).length;
    const minimalPageCount = Object.keys(STORY_RESPONSE_SCHEMA_MINIMAL.properties.pages.items.properties).length;
    expect(minimalPageCount).toBeLessThan(fullPageCount);
  });
});

// ---------------------------------------------------------------------------
// 11. Runtime wiring guard
// ---------------------------------------------------------------------------

describe("P4-12f: runtime wiring guard", () => {
  it("gemini.ts does NOT import STORY_RESPONSE_SCHEMA_MINIMAL", () => {
    const geminiSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    expect(geminiSrc).not.toContain("STORY_RESPONSE_SCHEMA_MINIMAL");
  });

  it("gemini.ts does NOT reference STORY_RESPONSE_SCHEMA_MINIMAL in any form", () => {
    const geminiSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    expect(geminiSrc).not.toContain("SCHEMA_MINIMAL");
    expect(geminiSrc).not.toContain("schema_minimal");
    expect(geminiSrc).not.toContain("schemaMinimal");
  });
});

// ---------------------------------------------------------------------------
// 12. Existing full schema exports still exist
// ---------------------------------------------------------------------------

describe("P4-12f: full schema unchanged", () => {
  it("STORY_RESPONSE_SCHEMA still exported", () => {
    expect(STORY_RESPONSE_SCHEMA).toBeDefined();
    expect(STORY_RESPONSE_SCHEMA.type).toBe("object");
  });

  it("full schema still has cast property", () => {
    expect(STORY_RESPONSE_SCHEMA.properties).toHaveProperty("cast");
  });

  it("full schema still has narrativeDevice property", () => {
    expect(STORY_RESPONSE_SCHEMA.properties).toHaveProperty("narrativeDevice");
  });

  it("full schema required fields unchanged", () => {
    const required = [...STORY_RESPONSE_SCHEMA.required].sort();
    expect(required).toEqual(["characterBible", "pages", "styleBible", "title"]);
  });
});
