/**
 * P4-12b: parseGeminiStoryJsonResponse — parse path tests.
 *
 * Coverage:
 * 1. Flag OFF + schemaRepair OFF (legacy path): markdown-fenced, clean, malformed.
 * 2. Flag OFF + schemaRepair ON (P4-5 path): extraction behavior preserved.
 * 3. Flag ON (P4-12b): direct JSON.parse → fallback → safe error.
 * 4. Error messages do not contain raw LLM content when flag ON.
 * 5. validateStory() remains final validator (parse helper is JSON-only).
 * 6. P4-12 regression fixture: structured output that previously failed.
 * 7. Flag independence: both flags ON uses responseSchema path.
 *
 * No live Gemini calls. Pure function tests.
 */

import { describe, it, expect } from "vitest";
import { parseGeminiStoryJsonResponse } from "../src/lib/gemini";

// Minimal JSON objects for parse-level tests (not validated as stories).
const SIMPLE_OBJ = { title: "Test", pages: [] };
const SIMPLE_JSON = JSON.stringify(SIMPLE_OBJ);
const PRETTY_JSON = JSON.stringify(SIMPLE_OBJ, null, 2);

// ---------------------------------------------------------------------------
// 1. Flag OFF + schemaRepair OFF — legacy path
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — legacy path (both flags OFF)", () => {
  const opts = { responseSchemaEnabled: false, schemaRepairEnabled: false };

  it("parses clean JSON string", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("legacy_extract_json");
  });

  it("parses JSON with surrounding whitespace", () => {
    const r = parseGeminiStoryJsonResponse(`  ${SIMPLE_JSON}  \n`, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("legacy_extract_json");
  });

  it("parses markdown-fenced JSON", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("legacy_extract_json");
  });

  it("parses plain markdown-fenced JSON (no language tag)", () => {
    const fenced = "```\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("legacy_extract_json");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseGeminiStoryJsonResponse("{bad json", opts)).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseGeminiStoryJsonResponse("", opts)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Flag OFF + schemaRepair ON — P4-5 extraction path
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — P4-5 path (schemaRepair ON, responseSchema OFF)", () => {
  const opts = { responseSchemaEnabled: false, schemaRepairEnabled: true };

  it("parses clean JSON via valid_original", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("valid_original");
  });

  it("parses markdown-fenced JSON via extracted", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("extracted");
  });

  it("parses prose-wrapped JSON via extracted", () => {
    const prosed = "Here is the story:\n" + SIMPLE_JSON + "\nHope you like it!";
    const r = parseGeminiStoryJsonResponse(prosed, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("extracted");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseGeminiStoryJsonResponse("{bad", opts)).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseGeminiStoryJsonResponse("", opts)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Flag ON — P4-12b direct JSON path
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — responseSchema ON direct path", () => {
  const opts = { responseSchemaEnabled: true, schemaRepairEnabled: false };

  it("parses clean JSON via direct_structured_json", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("direct_structured_json");
  });

  it("parses JSON with surrounding whitespace via direct path", () => {
    const r = parseGeminiStoryJsonResponse(`  ${SIMPLE_JSON}\n`, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("direct_structured_json");
  });

  it("parses pretty-printed JSON via direct path", () => {
    const r = parseGeminiStoryJsonResponse(PRETTY_JSON, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("direct_structured_json");
  });

  it("parses deeply nested JSON via direct path", () => {
    const nested = JSON.stringify({ a: { b: { c: [1, 2, 3] } } });
    const r = parseGeminiStoryJsonResponse(nested, opts);
    expect(r.parsePath).toBe("direct_structured_json");
    expect((r.parsed as Record<string, unknown>).a).toBeDefined();
  });

  it("parses JSON array via direct path", () => {
    const arr = JSON.stringify([1, 2, 3]);
    const r = parseGeminiStoryJsonResponse(arr, opts);
    expect(r.parsed).toEqual([1, 2, 3]);
    expect(r.parsePath).toBe("direct_structured_json");
  });
});

// ---------------------------------------------------------------------------
// 4. Flag ON — fallback extraction path
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — responseSchema ON fallback path", () => {
  const opts = { responseSchemaEnabled: true, schemaRepairEnabled: false };

  it("falls back to extraction for markdown-fenced JSON", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toMatch(/^fallback_/);
  });

  it("falls back to extraction for prose-wrapped JSON", () => {
    const prosed = "Here is the JSON:\n" + SIMPLE_JSON + "\nDone.";
    const r = parseGeminiStoryJsonResponse(prosed, opts);
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toMatch(/^fallback_/);
  });

  it("fallback parsePath contains extraction status", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, opts);
    // Should be "fallback_extracted" or similar
    expect(r.parsePath).toMatch(/^fallback_(valid_original|extracted)$/);
  });
});

// ---------------------------------------------------------------------------
// 5. Flag ON — malformed / truncated JSON
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — responseSchema ON malformed input", () => {
  const opts = { responseSchemaEnabled: true, schemaRepairEnabled: false };

  it("throws on truncated JSON", () => {
    expect(() => parseGeminiStoryJsonResponse('{"title": "abc', opts))
      .toThrow("Failed to parse LLM JSON response");
  });

  it("throws on non-JSON prose", () => {
    expect(() => parseGeminiStoryJsonResponse("This is not JSON at all.", opts))
      .toThrow("Failed to parse LLM JSON response");
  });

  it("throws on empty string", () => {
    expect(() => parseGeminiStoryJsonResponse("", opts))
      .toThrow("Failed to parse LLM JSON response");
  });

  it("throws on whitespace-only string", () => {
    expect(() => parseGeminiStoryJsonResponse("   \n  ", opts))
      .toThrow("Failed to parse LLM JSON response");
  });

  it("error message does not include raw LLM content", () => {
    const sensitive = '{"secret_child_name": "太郎", "incomplete';
    try {
      parseGeminiStoryJsonResponse(sensitive, opts);
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toBe("Failed to parse LLM JSON response");
      expect(msg).not.toContain("太郎");
      expect(msg).not.toContain("secret_child_name");
    }
  });

  it("error message does not include raw content for non-JSON prose", () => {
    try {
      parseGeminiStoryJsonResponse("I'm sorry, I cannot generate this story.", opts);
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toBe("Failed to parse LLM JSON response");
      expect(msg).not.toContain("sorry");
    }
  });
});

// ---------------------------------------------------------------------------
// 6. validateStory remains final validator
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — JSON-only (no schema validation)", () => {
  it("accepts structurally invalid story JSON (missing required fields)", () => {
    const invalidStory = JSON.stringify({ not_a_story: true });
    const r = parseGeminiStoryJsonResponse(invalidStory, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    // Helper parses JSON but does not validate story schema
    expect(r.parsed).toEqual({ not_a_story: true });
    expect(r.parsePath).toBe("direct_structured_json");
  });

  it("accepts JSON null (validateStory would reject)", () => {
    const r = parseGeminiStoryJsonResponse("null", {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsed).toBeNull();
  });

  it("accepts JSON string (validateStory would reject)", () => {
    const r = parseGeminiStoryJsonResponse('"just a string"', {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsed).toBe("just a string");
  });

  it("accepts empty object (validateStory would reject)", () => {
    const r = parseGeminiStoryJsonResponse("{}", {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsed).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 7. Flag independence
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — flag independence", () => {
  it("both flags ON: uses responseSchema direct path", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: true,
    });
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toBe("direct_structured_json");
  });

  it("both flags ON: fallback still works for fenced JSON", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: true,
    });
    expect(r.parsed).toEqual(SIMPLE_OBJ);
    expect(r.parsePath).toMatch(/^fallback_/);
  });

  it("both flags OFF: uses legacy path", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, {
      responseSchemaEnabled: false,
      schemaRepairEnabled: false,
    });
    expect(r.parsePath).toBe("legacy_extract_json");
  });
});

// ---------------------------------------------------------------------------
// 8. P4-12 regression fixtures
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — P4-12 regression", () => {
  it("clean structured output that previously caused parse failure", () => {
    // Simulates a Gemini structured output response (Books 3/4/5 failure scenario)
    const structuredOutput = JSON.stringify({
      title: "冒険の旅",
      characterBible: "a brave child",
      styleBible: "watercolor",
      storyGoal: null,
      mainQuestObject: null,
      titleSpreadText: null,
      pages: [
        { text: "ある日", imagePrompt: "a child walking" },
        { text: "おしまい", imagePrompt: "a child smiling" },
      ],
    });
    const r = parseGeminiStoryJsonResponse(structuredOutput, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsePath).toBe("direct_structured_json");
    expect((r.parsed as { title: string }).title).toBe("冒険の旅");
  });

  it("structured output with nullable fields parses correctly", () => {
    const output = JSON.stringify({
      title: "テスト",
      characterBible: "desc",
      styleBible: "style",
      storyGoal: null,
      mainQuestObject: null,
      forbiddenQuestObjects: null,
      titleSpreadText: null,
      openingNarration: null,
      coverImagePrompt: null,
      narrativeDevice: null,
      cast: [],
      pages: [{ text: "page1", imagePrompt: "prompt1" }],
    });
    const r = parseGeminiStoryJsonResponse(output, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsePath).toBe("direct_structured_json");
    const p = r.parsed as Record<string, unknown>;
    expect(p.title).toBe("テスト");
    expect(p.storyGoal).toBeNull();
    expect(p.titleSpreadText).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. parsePath values
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — parsePath values", () => {
  it("direct_structured_json for clean JSON with flag ON", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsePath).toBe("direct_structured_json");
  });

  it("fallback_extracted for fenced JSON with flag ON", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(r.parsePath).toBe("fallback_extracted");
  });

  it("valid_original for clean JSON with schemaRepair ON", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, {
      responseSchemaEnabled: false,
      schemaRepairEnabled: true,
    });
    expect(r.parsePath).toBe("valid_original");
  });

  it("extracted for fenced JSON with schemaRepair ON", () => {
    const fenced = "```json\n" + SIMPLE_JSON + "\n```";
    const r = parseGeminiStoryJsonResponse(fenced, {
      responseSchemaEnabled: false,
      schemaRepairEnabled: true,
    });
    expect(r.parsePath).toBe("extracted");
  });

  it("legacy_extract_json for any JSON with both flags OFF", () => {
    const r = parseGeminiStoryJsonResponse(SIMPLE_JSON, {
      responseSchemaEnabled: false,
      schemaRepairEnabled: false,
    });
    expect(r.parsePath).toBe("legacy_extract_json");
  });
});
