/**
 * P4-4: Unit tests for extractJsonFromLLMResponse (llm-json-repair.ts).
 *
 * Coverage:
 * 1. valid_original — clean JSON parses as-is, no repair actions
 * 2. extracted (fence) — markdown fence stripping (```json, ```, with/without preamble)
 * 3. extracted (delimiter) — preamble-only strip, trailing-text-only strip, both
 * 4. unrepairable — empty input, whitespace, truncated JSON, non-JSON prose
 * 5. result shape — jsonText, parsed, repairActions contents, safeMessage presence
 * 6. P4-4 scope constraints — "repaired" status not returned; no field value modification
 * 7. P4-3 fixture connection — documents which raw strings would have caused P4-3 error fixtures
 *
 * Privacy requirements verified:
 * - safeMessage never echoes raw input content
 * - repairActions contain only type-name tokens, never field values
 */

import { describe, it, expect } from "vitest";
import {
  extractJsonFromLLMResponse,
  type LlmJsonRepairResult,
  type LlmJsonRepairStatus,
} from "../src/lib/llm-json-repair";

// ---------------------------------------------------------------------------
// Shared minimal story-shaped JSON object for use across tests.
// Non-PII, placeholder data only.
// ---------------------------------------------------------------------------

const MINIMAL_STORY_JSON = {
  title: "A test story",
  pages: [
    { text: "Page one text.", imagePrompt: "A sunny park scene." },
    { text: "Page two text.", imagePrompt: "A cozy indoor scene." },
  ],
  storyGoal: "find the star",
  mainQuestObject: "star",
};

const MINIMAL_STORY_STRING = JSON.stringify(MINIMAL_STORY_JSON);

// ---------------------------------------------------------------------------
// 1. valid_original — no repair needed
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse valid_original (P4-4)", () => {
  it("returns valid_original for clean JSON object", () => {
    const result = extractJsonFromLLMResponse(MINIMAL_STORY_STRING);
    expect(result.status).toBe("valid_original");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(result.jsonText).toBe(MINIMAL_STORY_STRING);
    expect(result.repairActions).toEqual([]);
    expect(result.safeMessage).toBeUndefined();
  });

  it("returns valid_original for clean JSON with surrounding whitespace", () => {
    const result = extractJsonFromLLMResponse(`  ${MINIMAL_STORY_STRING}  \n`);
    expect(result.status).toBe("valid_original");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
  });

  it("returns valid_original for deeply nested JSON", () => {
    const nested = { a: { b: { c: [1, 2, 3] } }, d: "value" };
    const result = extractJsonFromLLMResponse(JSON.stringify(nested));
    expect(result.status).toBe("valid_original");
    expect(result.parsed).toEqual(nested);
    expect(result.repairActions).toEqual([]);
  });

  it("valid_original result has no safeMessage", () => {
    const result = extractJsonFromLLMResponse(MINIMAL_STORY_STRING);
    expect(result.safeMessage).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. extracted — markdown fence stripping
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse extracted: markdown fence (P4-4)", () => {
  it("extracts from ```json ... ``` fence", () => {
    const fenced = "```json\n" + MINIMAL_STORY_STRING + "\n```";
    const result = extractJsonFromLLMResponse(fenced);
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(result.repairActions).toContain("strip_markdown_fence");
  });

  it("extracts from plain ``` ... ``` fence (no language tag)", () => {
    const fenced = "```\n" + MINIMAL_STORY_STRING + "\n```";
    const result = extractJsonFromLLMResponse(fenced);
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(result.repairActions).toContain("strip_markdown_fence");
  });

  it("extracts from preamble + ```json fence (combined)", () => {
    const raw =
      "Here is the story JSON as requested:\n" +
      "```json\n" +
      MINIMAL_STORY_STRING +
      "\n```";
    const result = extractJsonFromLLMResponse(raw);
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    // Fence stripping handles the preamble implicitly
    expect(result.repairActions).toContain("strip_markdown_fence");
  });

  it("extracts from ```json fence followed by trailing explanation", () => {
    const raw =
      "```json\n" +
      MINIMAL_STORY_STRING +
      "\n```\n" +
      "The above JSON includes all required fields.";
    const result = extractJsonFromLLMResponse(raw);
    // fence stripping picks up the JSON; trailing text is outside the fence
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(["extracted", "valid_original"]).toContain(result.status);
  });

  it("fence extraction repairActions does not contain raw content", () => {
    const fenced = "```json\n" + MINIMAL_STORY_STRING + "\n```";
    const result = extractJsonFromLLMResponse(fenced);
    for (const action of result.repairActions) {
      expect(action).not.toContain("{");
      expect(action).not.toContain("title");
      expect(action).not.toContain("star");
    }
  });

  it("extracted fence result has correct jsonText (the clean JSON, no backticks)", () => {
    const fenced = "```json\n" + MINIMAL_STORY_STRING + "\n```";
    const result = extractJsonFromLLMResponse(fenced);
    expect(result.jsonText).toBe(MINIMAL_STORY_STRING);
    expect(result.jsonText).not.toContain("```");
  });
});

// ---------------------------------------------------------------------------
// 3. extracted — preamble / trailing text stripping (delimiter-based)
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse extracted: delimiter stripping (P4-4)", () => {
  it("strips leading preamble before the JSON object", () => {
    const raw = "Here is the generated story:\n" + MINIMAL_STORY_STRING;
    const result = extractJsonFromLLMResponse(raw);
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(result.repairActions).toContain("strip_preamble");
  });

  it("strips trailing text after the JSON closing brace", () => {
    const raw = MINIMAL_STORY_STRING + "\nI hope this story meets your requirements.";
    const result = extractJsonFromLLMResponse(raw);
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(result.repairActions).toContain("strip_trailing_text");
  });

  it("strips both preamble and trailing text", () => {
    const raw =
      "Generating story JSON now:\n" +
      MINIMAL_STORY_STRING +
      "\nEnd of story JSON.";
    const result = extractJsonFromLLMResponse(raw);
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(MINIMAL_STORY_JSON);
    expect(result.repairActions).toContain("strip_preamble");
    expect(result.repairActions).toContain("strip_trailing_text");
  });

  it("strip_preamble repairAction does not echo the preamble text", () => {
    const raw = "Generating story JSON now:\n" + MINIMAL_STORY_STRING;
    const result = extractJsonFromLLMResponse(raw);
    for (const action of result.repairActions) {
      expect(action).not.toContain("Generating");
      expect(action).not.toContain("now");
    }
  });

  it("preamble-stripped jsonText is clean parseable JSON", () => {
    const raw = "Here is the story:\n" + MINIMAL_STORY_STRING;
    const result = extractJsonFromLLMResponse(raw);
    expect(() => JSON.parse(result.jsonText!)).not.toThrow();
    expect(JSON.parse(result.jsonText!)).toEqual(MINIMAL_STORY_JSON);
  });
});

// ---------------------------------------------------------------------------
// 4. unrepairable — malformed / unextractable inputs
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse unrepairable (P4-4)", () => {
  it("returns unrepairable for empty string", () => {
    const result = extractJsonFromLLMResponse("");
    expect(result.status).toBe("unrepairable");
    expect(result.parsed).toBeUndefined();
    expect(result.jsonText).toBeUndefined();
    expect(result.repairActions).toEqual([]);
  });

  it("returns unrepairable for whitespace-only string", () => {
    const result = extractJsonFromLLMResponse("   \n\t  ");
    expect(result.status).toBe("unrepairable");
    expect(result.repairActions).toEqual([]);
  });

  it("returns unrepairable for truncated JSON (missing closing brace)", () => {
    const truncated = '{"title": "A story", "pages": [{"text": "Page one.';
    const result = extractJsonFromLLMResponse(truncated);
    expect(result.status).toBe("unrepairable");
    expect(result.parsed).toBeUndefined();
  });

  it("returns unrepairable for non-JSON prose", () => {
    const result = extractJsonFromLLMResponse(
      "This is a story about a child who found a star."
    );
    expect(result.status).toBe("unrepairable");
    expect(result.parsed).toBeUndefined();
  });

  it("returns unrepairable for JSON-like text that does not parse (e.g. trailing comma)", () => {
    // Trailing commas are not valid JSON
    const invalid = '{"title": "test", "pages": [],}';
    const result = extractJsonFromLLMResponse(invalid);
    expect(result.status).toBe("unrepairable");
  });

  it("unrepairable result has a safeMessage string", () => {
    const result = extractJsonFromLLMResponse("not json");
    expect(typeof result.safeMessage).toBe("string");
    expect(result.safeMessage!.length).toBeGreaterThan(0);
  });

  it("safeMessage does not echo raw input content", () => {
    const rawInput = "PRIVATE_CONTENT_DO_NOT_ECHO";
    const result = extractJsonFromLLMResponse(rawInput);
    expect(result.safeMessage).not.toContain(rawInput);
    expect(result.safeMessage).not.toContain("PRIVATE");
    expect(result.safeMessage).not.toContain("DO_NOT_ECHO");
  });

  it("returns unrepairable for fenced block containing truncated JSON", () => {
    // The fence is present but the content inside is not valid JSON
    const fencedTruncated = '```json\n{"title": "test", "pages": [{"text": "truncated\n```';
    const result = extractJsonFromLLMResponse(fencedTruncated);
    expect(result.status).toBe("unrepairable");
  });
});

// ---------------------------------------------------------------------------
// 5. Result shape — structural invariants
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse result shape invariants (P4-4)", () => {
  it("repairActions is always an array (never null/undefined)", () => {
    const cases = [
      MINIMAL_STORY_STRING,
      "```json\n" + MINIMAL_STORY_STRING + "\n```",
      "",
      "not json",
    ];
    for (const input of cases) {
      const result = extractJsonFromLLMResponse(input);
      expect(Array.isArray(result.repairActions)).toBe(true);
    }
  });

  it("parsed and jsonText are present when status is not unrepairable", () => {
    const goodCases = [
      MINIMAL_STORY_STRING,
      "```json\n" + MINIMAL_STORY_STRING + "\n```",
      "Preamble:\n" + MINIMAL_STORY_STRING,
    ];
    for (const input of goodCases) {
      const result = extractJsonFromLLMResponse(input);
      expect(result.parsed).toBeDefined();
      expect(result.jsonText).toBeDefined();
    }
  });

  it("parsed and jsonText are absent when unrepairable", () => {
    const result = extractJsonFromLLMResponse("not json");
    expect(result.parsed).toBeUndefined();
    expect(result.jsonText).toBeUndefined();
  });

  it("jsonText round-trips through JSON.parse to equal parsed", () => {
    const goodCases = [
      MINIMAL_STORY_STRING,
      "```json\n" + MINIMAL_STORY_STRING + "\n```",
      "Preamble:\n" + MINIMAL_STORY_STRING,
    ];
    for (const input of goodCases) {
      const result = extractJsonFromLLMResponse(input);
      if (result.status !== "unrepairable") {
        expect(JSON.parse(result.jsonText!)).toEqual(result.parsed);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 6. P4-4 scope constraints
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse scope constraints (P4-4)", () => {
  it("never returns status 'repaired' (reserved for P4-5+)", () => {
    const inputs = [
      MINIMAL_STORY_STRING,
      "```json\n" + MINIMAL_STORY_STRING + "\n```",
      "Preamble:\n" + MINIMAL_STORY_STRING,
      "",
      "not json",
    ];
    for (const input of inputs) {
      const result = extractJsonFromLLMResponse(input);
      expect(result.status).not.toBe("repaired" satisfies LlmJsonRepairStatus);
    }
  });

  it("does not modify field values (parsed equals the original JSON)", () => {
    const withSpecialChars = JSON.stringify({
      title: "テスト",
      mainQuestObject: "星のかけら",
      pages: [{ text: "ページ1テキスト", imagePrompt: "A park scene." }],
    });
    const result = extractJsonFromLLMResponse(
      "```json\n" + withSpecialChars + "\n```"
    );
    expect(result.status).toBe("extracted");
    expect(result.parsed).toEqual(JSON.parse(withSpecialChars));
  });

  it("does not add missing fields (parsed has exactly the fields in the JSON)", () => {
    const sparse = JSON.stringify({ title: "test" });
    const result = extractJsonFromLLMResponse("Preamble:\n" + sparse);
    expect(result.status).toBe("extracted");
    const parsedKeys = Object.keys(result.parsed as Record<string, unknown>);
    expect(parsedKeys).toEqual(["title"]);
  });

  it("does not call external APIs or produce side effects", () => {
    // Pure function: calling twice with the same input yields identical results
    const input = "```json\n" + MINIMAL_STORY_STRING + "\n```";
    const r1 = extractJsonFromLLMResponse(input);
    const r2 = extractJsonFromLLMResponse(input);
    expect(r1.status).toBe(r2.status);
    expect(r1.parsed).toEqual(r2.parsed);
    expect(r1.repairActions).toEqual(r2.repairActions);
  });
});

// ---------------------------------------------------------------------------
// 7. P4-3 fixture connection
// ---------------------------------------------------------------------------

describe("extractJsonFromLLMResponse P4-3 fixture connection (P4-4)", () => {
  /**
   * P4-3 MALFORMED_JSON_ERRORS.jsonParseFailed is thrown when GeminiClient
   * receives a response like "```json\n...\n```" that its parser cannot handle.
   * extractJsonFromLLMResponse would recover the JSON via fence stripping
   * and return "extracted" — preventing the error from being thrown.
   *
   * P4-4 is not yet wired, so the error still occurs in production.
   * P4-5 will wire this helper into the generation path.
   */
  it("recovers from a response that would cause jsonParseFailed (markdown fence wrapped)", () => {
    // Simulate what Gemini might return instead of raw JSON
    const wrappedResponse = "```json\n" + MINIMAL_STORY_STRING + "\n```";
    const result = extractJsonFromLLMResponse(wrappedResponse);
    expect(result.status).toBe("extracted");
    expect(result.repairActions).toContain("strip_markdown_fence");
    expect(result.parsed).toBeDefined();
  });

  it("recovers from a response with leading prose preamble", () => {
    // Simulate "LLM response" prefix from GeminiClient error message pattern
    const withPreamble =
      "Here is the JSON story output for your request:\n" + MINIMAL_STORY_STRING;
    const result = extractJsonFromLLMResponse(withPreamble);
    expect(result.status).toBe("extracted");
    expect(result.repairActions).toContain("strip_preamble");
  });

  it("returns unrepairable for genuinely truncated JSON (cannot be recovered)", () => {
    // This represents the case where Gemini truncated the response mid-generation
    const truncated = MINIMAL_STORY_STRING.slice(0, Math.floor(MINIMAL_STORY_STRING.length / 2));
    const result = extractJsonFromLLMResponse(truncated);
    expect(result.status).toBe("unrepairable");
  });
});
