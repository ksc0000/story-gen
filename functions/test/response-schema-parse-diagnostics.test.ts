/**
 * P4-12d: Safe parse diagnostics tests for buildSafeJsonParseDiagnostics() and integration.
 *
 * Coverage:
 * 1. Classification: empty, whitespace-only → "empty"
 * 2. Classification: truncated object → "likely_truncated_object"
 * 3. Classification: truncated array → "likely_truncated_array"
 * 4. Classification: markdown-fenced malformed → "fenced_json_unparsed"
 * 5. Classification: prose/refusal → "prose_or_refusal"
 * 6. Classification: brace-balanced malformed JSON → "malformed_json"
 * 7. Privacy: output never includes raw text, prefix, suffix, child name, or prompt
 * 8. Integration: responseSchema ON parse failure carries safe diagnostics
 * 9. Integration: responseSchema ON parse success does NOT emit diagnostics
 * 10. Integration: flag OFF behavior remains unchanged
 * 11. Structural metadata accuracy (lengths, counts, booleans)
 * 12. getParseErrorDiagnostics() extraction from error objects
 *
 * No live Gemini calls. Pure function tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildSafeJsonParseDiagnostics,
  parseGeminiStoryJsonResponse,
  getParseErrorDiagnostics,
} from "../src/lib/gemini";
import type { SafeJsonParseDiagnostics } from "../src/lib/gemini";

const DEFAULT_CONTEXT = {
  responseSchemaEnabled: true,
  schemaRepairEnabled: false,
};

// ---------------------------------------------------------------------------
// 1. Classification: empty / whitespace-only → "empty"
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — empty classification", () => {
  it("classifies empty string as empty", () => {
    const d = buildSafeJsonParseDiagnostics("", DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("empty");
    expect(d.isEmpty).toBe(true);
    expect(d.lengthChars).toBe(0);
    expect(d.trimmedLengthChars).toBe(0);
  });

  it("classifies whitespace-only string as empty", () => {
    const d = buildSafeJsonParseDiagnostics("   \n  \t  ", DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("empty");
    expect(d.isEmpty).toBe(true);
    expect(d.lengthChars).toBe(9);
    expect(d.trimmedLengthChars).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Classification: truncated object → "likely_truncated_object"
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — likely_truncated_object", () => {
  it('classifies `{"title":"abc"` as likely_truncated_object', () => {
    const d = buildSafeJsonParseDiagnostics('{"title":"abc"', DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("likely_truncated_object");
    expect(d.startsWithBrace).toBe(true);
    expect(d.endsWithBrace).toBe(false);
    expect(d.likelyTruncatedObject).toBe(true);
  });

  it("classifies large truncated object", () => {
    const truncated = '{"pages":[{"text":"once upon a time","imagePrompt":"a child';
    const d = buildSafeJsonParseDiagnostics(truncated, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("likely_truncated_object");
    expect(d.likelyTruncatedObject).toBe(true);
    expect(d.braceBalanceApprox).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Classification: truncated array → "likely_truncated_array"
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — likely_truncated_array", () => {
  it('classifies `[{"x":1}` as likely_truncated_array', () => {
    const d = buildSafeJsonParseDiagnostics('[{"x":1}', DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("likely_truncated_array");
    expect(d.startsWithBracket).toBe(true);
    expect(d.endsWithBracket).toBe(false);
    expect(d.likelyTruncatedArray).toBe(true);
  });

  it("classifies truncated JSON array with nested objects", () => {
    const truncated = '[{"a":1},{"b":2},{"c":3';
    const d = buildSafeJsonParseDiagnostics(truncated, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("likely_truncated_array");
    expect(d.bracketBalanceApprox).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Classification: markdown fenced malformed → "fenced_json_unparsed"
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — fenced_json_unparsed", () => {
  it("classifies markdown-fenced malformed JSON", () => {
    const fenced = '```json\n{"title":"abc"\n```';
    const d = buildSafeJsonParseDiagnostics(fenced, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("fenced_json_unparsed");
    expect(d.containsFence).toBe(true);
    expect(d.startsWithFence).toBe(true);
  });

  it("classifies fenced content with prose preamble", () => {
    const fenced = 'Here is the JSON:\n```json\n{broken\n```\nDone.';
    const d = buildSafeJsonParseDiagnostics(fenced, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("fenced_json_unparsed");
    expect(d.containsFence).toBe(true);
    expect(d.startsWithFence).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Classification: prose/refusal → "prose_or_refusal"
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — prose_or_refusal", () => {
  it("classifies plain prose as prose_or_refusal", () => {
    const prose = "I'm sorry, I cannot generate this story because it contains inappropriate content.";
    const d = buildSafeJsonParseDiagnostics(prose, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("prose_or_refusal");
    expect(d.startsWithBrace).toBe(false);
    expect(d.startsWithBracket).toBe(false);
  });

  it("classifies safety refusal text", () => {
    const refusal = "This request violates content policy. Please try again with different content.";
    const d = buildSafeJsonParseDiagnostics(refusal, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("prose_or_refusal");
  });
});

// ---------------------------------------------------------------------------
// 6. Classification: brace-balanced but malformed → "malformed_json"
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — malformed_json", () => {
  it("classifies brace-balanced malformed JSON", () => {
    const malformed = '{title: "abc", pages: []}';
    const d = buildSafeJsonParseDiagnostics(malformed, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("malformed_json");
    expect(d.startsWithBrace).toBe(true);
    expect(d.endsWithBrace).toBe(true);
    expect(d.braceBalanceApprox).toBe(0);
  });

  it("classifies bracket-balanced malformed JSON array", () => {
    const malformed = "[1, 2, , 3]";
    const d = buildSafeJsonParseDiagnostics(malformed, DEFAULT_CONTEXT);
    expect(d.parseFailureKind).toBe("malformed_json");
    expect(d.startsWithBracket).toBe(true);
    expect(d.endsWithBracket).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Privacy: no raw text in output
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — privacy safety", () => {
  it("does not include raw text in diagnostics", () => {
    const sensitive = '{"child_name":"太郎","secret":"password123","imagePrompt":"a child walking';
    const d = buildSafeJsonParseDiagnostics(sensitive, DEFAULT_CONTEXT);
    const serialized = JSON.stringify(d);
    expect(serialized).not.toContain("太郎");
    expect(serialized).not.toContain("password123");
    expect(serialized).not.toContain("child_name");
    expect(serialized).not.toContain("imagePrompt");
    expect(serialized).not.toContain("a child walking");
  });

  it("does not include any substring of the input", () => {
    const input = "This story is about a brave child named 花子 who finds a star.";
    const d = buildSafeJsonParseDiagnostics(input, DEFAULT_CONTEXT);
    const serialized = JSON.stringify(d);
    expect(serialized).not.toContain("花子");
    expect(serialized).not.toContain("brave child");
    expect(serialized).not.toContain("story");
    expect(serialized).not.toContain("finds a star");
  });

  it("diagnostics object has no rawText, prefix, or suffix properties", () => {
    const d = buildSafeJsonParseDiagnostics('{"incomplete', DEFAULT_CONTEXT);
    expect(d).not.toHaveProperty("rawText");
    expect(d).not.toHaveProperty("prefix");
    expect(d).not.toHaveProperty("suffix");
    expect(d).not.toHaveProperty("sample");
    expect(d).not.toHaveProperty("content");
    expect(d).not.toHaveProperty("text");
  });
});

// ---------------------------------------------------------------------------
// 8. Integration: responseSchema ON parse failure carries diagnostics
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — diagnostics on failure (flag ON)", () => {
  const opts = { responseSchemaEnabled: true, schemaRepairEnabled: false };

  it("thrown error carries safe diagnostics for truncated JSON", () => {
    try {
      parseGeminiStoryJsonResponse('{"title":"abc"', opts);
      expect.fail("should have thrown");
    } catch (err) {
      const diagnostics = getParseErrorDiagnostics(err);
      expect(diagnostics).toBeDefined();
      expect(diagnostics!.parseFailureKind).toBe("likely_truncated_object");
      expect(diagnostics!.responseSchemaEnabled).toBe(true);
      expect(diagnostics!.directParseFailed).toBe(true);
    }
  });

  it("thrown error carries safe diagnostics for empty input", () => {
    try {
      parseGeminiStoryJsonResponse("", opts);
      expect.fail("should have thrown");
    } catch (err) {
      const diagnostics = getParseErrorDiagnostics(err);
      expect(diagnostics).toBeDefined();
      expect(diagnostics!.parseFailureKind).toBe("empty");
      expect(diagnostics!.isEmpty).toBe(true);
    }
  });

  it("thrown error carries safe diagnostics for prose input", () => {
    try {
      parseGeminiStoryJsonResponse("I cannot generate this content.", opts);
      expect.fail("should have thrown");
    } catch (err) {
      const diagnostics = getParseErrorDiagnostics(err);
      expect(diagnostics).toBeDefined();
      expect(diagnostics!.parseFailureKind).toBe("prose_or_refusal");
    }
  });

  it("diagnostics include fallbackExtractionStatus=unrepairable", () => {
    try {
      parseGeminiStoryJsonResponse('{"broken', opts);
      expect.fail("should have thrown");
    } catch (err) {
      const diagnostics = getParseErrorDiagnostics(err);
      expect(diagnostics).toBeDefined();
      expect(diagnostics!.fallbackExtractionStatus).toBe("unrepairable");
    }
  });

  it("error message remains safe (no raw content)", () => {
    try {
      parseGeminiStoryJsonResponse('{"child":"太郎","incomplete', opts);
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toBe("Failed to parse LLM JSON response");
      expect(msg).not.toContain("太郎");
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Integration: responseSchema ON success → no diagnostics
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — no diagnostics on success", () => {
  it("successful parse does not have diagnostics", () => {
    const result = parseGeminiStoryJsonResponse(
      JSON.stringify({ title: "test", pages: [] }),
      { responseSchemaEnabled: true, schemaRepairEnabled: false },
    );
    expect(result.parsed).toBeDefined();
    expect(result.parsePath).toBe("direct_structured_json");
    // No error thrown → no diagnostics to extract
  });

  it("successful fallback parse does not have diagnostics", () => {
    const fenced = "```json\n" + JSON.stringify({ title: "test" }) + "\n```";
    const result = parseGeminiStoryJsonResponse(fenced, {
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    });
    expect(result.parsed).toBeDefined();
    expect(result.parsePath).toMatch(/^fallback_/);
  });
});

// ---------------------------------------------------------------------------
// 10. Integration: flag OFF behavior unchanged
// ---------------------------------------------------------------------------

describe("parseGeminiStoryJsonResponse — flag OFF unchanged", () => {
  it("flag OFF throws without diagnostics on malformed input", () => {
    try {
      parseGeminiStoryJsonResponse("{bad", {
        responseSchemaEnabled: false,
        schemaRepairEnabled: false,
      });
      expect.fail("should have thrown");
    } catch (err) {
      const diagnostics = getParseErrorDiagnostics(err);
      expect(diagnostics).toBeUndefined();
    }
  });

  it("flag OFF + schemaRepair ON throws without diagnostics on malformed input", () => {
    try {
      parseGeminiStoryJsonResponse("{bad", {
        responseSchemaEnabled: false,
        schemaRepairEnabled: true,
      });
      expect.fail("should have thrown");
    } catch (err) {
      const diagnostics = getParseErrorDiagnostics(err);
      expect(diagnostics).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 11. Structural metadata accuracy
// ---------------------------------------------------------------------------

describe("buildSafeJsonParseDiagnostics — structural metadata", () => {
  it("counts braces, brackets, quotes, and newlines correctly", () => {
    const input = '{\n  "a": [1, 2],\n  "b": {"c": 3}\n}';
    const d = buildSafeJsonParseDiagnostics(input, DEFAULT_CONTEXT);
    expect(d.lengthChars).toBe(input.length);
    expect(d.trimmedLengthChars).toBe(input.trim().length);
    expect(d.braceBalanceApprox).toBe(0); // 2 open, 2 close
    expect(d.bracketBalanceApprox).toBe(0); // 1 open, 1 close
    expect(d.quoteCountApprox).toBe(6); // "a", "b", "c" = 6 quotes
    expect(d.newlineCount).toBe(3);
  });

  it("reports correct brace imbalance for truncated object", () => {
    // '{"a":{"b":1' has 2 open braces, 0 close braces → balance 2, truncated
    const input = '{"a":{"b":1';
    const d = buildSafeJsonParseDiagnostics(input, DEFAULT_CONTEXT);
    expect(d.braceBalanceApprox).toBe(2);
    expect(d.likelyTruncatedObject).toBe(true);
  });

  it("passes through context flags correctly", () => {
    const d = buildSafeJsonParseDiagnostics("test", {
      responseSchemaEnabled: true,
      schemaRepairEnabled: true,
      directParseFailed: true,
      fallbackExtractionStatus: "unrepairable",
    });
    expect(d.responseSchemaEnabled).toBe(true);
    expect(d.schemaRepairEnabled).toBe(true);
    expect(d.directParseFailed).toBe(true);
    expect(d.fallbackExtractionStatus).toBe("unrepairable");
  });
});

// ---------------------------------------------------------------------------
// 12. getParseErrorDiagnostics() extraction
// ---------------------------------------------------------------------------

describe("getParseErrorDiagnostics — extraction", () => {
  it("returns undefined for plain Error", () => {
    expect(getParseErrorDiagnostics(new Error("test"))).toBeUndefined();
  });

  it("returns undefined for non-Error", () => {
    expect(getParseErrorDiagnostics("just a string")).toBeUndefined();
    expect(getParseErrorDiagnostics(42)).toBeUndefined();
    expect(getParseErrorDiagnostics(null)).toBeUndefined();
    expect(getParseErrorDiagnostics(undefined)).toBeUndefined();
  });

  it("returns diagnostics from Error with diagnostics property", () => {
    const error = new Error("test");
    const mockDiagnostics: SafeJsonParseDiagnostics = {
      lengthChars: 10,
      trimmedLengthChars: 10,
      isEmpty: false,
      startsWithBrace: true,
      startsWithBracket: false,
      endsWithBrace: false,
      endsWithBracket: false,
      startsWithFence: false,
      containsFence: false,
      likelyTruncatedObject: true,
      likelyTruncatedArray: false,
      braceBalanceApprox: 1,
      bracketBalanceApprox: 0,
      quoteCountApprox: 2,
      newlineCount: 0,
      parseFailureKind: "likely_truncated_object",
      responseSchemaEnabled: true,
      schemaRepairEnabled: false,
    };
    (error as Error & { diagnostics: SafeJsonParseDiagnostics }).diagnostics = mockDiagnostics;
    expect(getParseErrorDiagnostics(error)).toEqual(mockDiagnostics);
  });

  it("returns undefined for Error with non-object diagnostics", () => {
    const error = new Error("test");
    (error as Error & { diagnostics: string }).diagnostics = "not an object";
    expect(getParseErrorDiagnostics(error)).toBeUndefined();
  });
});
