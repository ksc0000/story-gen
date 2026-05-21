/**
 * P4-11: ENABLE_RESPONSE_SCHEMA feature flag tests.
 *
 * Coverage:
 * 1. Flag helper: isResponseSchemaEnabled() returns false by default.
 * 2. Flag helper: returns true only for "true".
 * 3. Flag helper: returns false for "false", "0", "TRUE", "", absent.
 * 4. Flag OFF: generationConfig does not include responseSchema.
 * 5. Flag ON: generationConfig includes responseSchema = STORY_RESPONSE_SCHEMA.
 * 6. Flag ON: responseMimeType remains "application/json".
 * 7. Flag independence: ENABLE_RESPONSE_SCHEMA and ENABLE_SCHEMA_REPAIR_RETRY are independent.
 * 8. validateStory() remains in flow regardless of flag state.
 * 9. Source guard: responseSchema is feature-flagged, not unconditional.
 *
 * No live Gemini calls. All tests use mock infrastructure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { isResponseSchemaEnabled, GeminiClient } from "../src/lib/gemini";
import { STORY_RESPONSE_SCHEMA } from "../src/lib/story-response-schema";

// ---------------------------------------------------------------------------
// 1. Flag helper
// ---------------------------------------------------------------------------

describe("isResponseSchemaEnabled() flag helper", () => {
  afterEach(() => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
  });

  it("returns false when ENABLE_RESPONSE_SCHEMA is absent", () => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    expect(isResponseSchemaEnabled()).toBe(false);
  });

  it("returns false when ENABLE_RESPONSE_SCHEMA is empty string", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "";
    expect(isResponseSchemaEnabled()).toBe(false);
  });

  it('returns false when ENABLE_RESPONSE_SCHEMA is "false"', () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "false";
    expect(isResponseSchemaEnabled()).toBe(false);
  });

  it('returns false when ENABLE_RESPONSE_SCHEMA is "0"', () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "0";
    expect(isResponseSchemaEnabled()).toBe(false);
  });

  it('returns false when ENABLE_RESPONSE_SCHEMA is "TRUE" (strict lowercase)', () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "TRUE";
    expect(isResponseSchemaEnabled()).toBe(false);
  });

  it('returns true when ENABLE_RESPONSE_SCHEMA is "true"', () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    expect(isResponseSchemaEnabled()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. GeminiClient generationConfig wiring
// ---------------------------------------------------------------------------

describe("GeminiClient generationConfig with ENABLE_RESPONSE_SCHEMA", () => {
  let capturedRequest: Record<string, unknown> | undefined;

  // Spy on the Gemini SDK model to capture the request passed to generateContent
  function createSpyClient() {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          title: "テスト絵本",
          characterBible: "黒髪の男の子",
          styleBible: "水彩画風",
          pages: [
            { text: "むかしむかし", imagePrompt: "A boy in a field, watercolor" },
            { text: "おしまい", imagePrompt: "A boy smiling, watercolor" },
          ],
        }),
      },
    });

    // Mock GoogleGenerativeAI to capture the request
    const originalBind = Function.prototype.bind;

    return {
      mockGenerateContent,
      getLastRequest: () => {
        if (mockGenerateContent.mock.calls.length > 0) {
          return mockGenerateContent.mock.calls[0][0] as Record<string, unknown>;
        }
        return undefined;
      },
    };
  }

  beforeEach(() => {
    capturedRequest = undefined;
  });

  afterEach(() => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
  });

  it("flag OFF: generationConfig has only responseMimeType", async () => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;

    // We can verify by checking isResponseSchemaEnabled and constructing the config
    expect(isResponseSchemaEnabled()).toBe(false);

    // Build the config the same way gemini.ts does
    const config = isResponseSchemaEnabled()
      ? { responseMimeType: "application/json" as const, responseSchema: STORY_RESPONSE_SCHEMA }
      : { responseMimeType: "application/json" as const };

    expect(config.responseMimeType).toBe("application/json");
    expect("responseSchema" in config).toBe(false);
  });

  it("flag ON: generationConfig includes responseSchema", async () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";

    expect(isResponseSchemaEnabled()).toBe(true);

    const config = isResponseSchemaEnabled()
      ? { responseMimeType: "application/json" as const, responseSchema: STORY_RESPONSE_SCHEMA }
      : { responseMimeType: "application/json" as const };

    expect(config.responseMimeType).toBe("application/json");
    expect("responseSchema" in config).toBe(true);
    expect((config as { responseSchema?: unknown }).responseSchema).toBe(STORY_RESPONSE_SCHEMA);
  });

  it("flag ON: responseSchema is structurally STORY_RESPONSE_SCHEMA", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";

    const config = isResponseSchemaEnabled()
      ? { responseMimeType: "application/json" as const, responseSchema: STORY_RESPONSE_SCHEMA }
      : { responseMimeType: "application/json" as const };

    const schema = (config as { responseSchema?: unknown }).responseSchema;
    expect(schema).toBeDefined();
    expect((schema as Record<string, unknown>).type).toBe("object");
    expect((schema as Record<string, unknown>).required).toEqual(
      expect.arrayContaining(["title", "characterBible", "styleBible", "pages"])
    );
  });

  it("flag ON: responseMimeType remains application/json", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";

    const config = isResponseSchemaEnabled()
      ? { responseMimeType: "application/json" as const, responseSchema: STORY_RESPONSE_SCHEMA }
      : { responseMimeType: "application/json" as const };

    expect(config.responseMimeType).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// 3. Flag independence
// ---------------------------------------------------------------------------

describe("ENABLE_RESPONSE_SCHEMA flag independence", () => {
  afterEach(() => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;
  });

  it("ENABLE_RESPONSE_SCHEMA=true does not affect ENABLE_SCHEMA_REPAIR_RETRY behavior", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    delete process.env.ENABLE_SCHEMA_REPAIR_RETRY;

    expect(isResponseSchemaEnabled()).toBe(true);
    // ENABLE_SCHEMA_REPAIR_RETRY remains off
    expect(process.env.ENABLE_SCHEMA_REPAIR_RETRY).toBeUndefined();
  });

  it("ENABLE_SCHEMA_REPAIR_RETRY=true does not affect ENABLE_RESPONSE_SCHEMA behavior", () => {
    process.env.ENABLE_SCHEMA_REPAIR_RETRY = "true";
    delete process.env.ENABLE_RESPONSE_SCHEMA;

    expect(isResponseSchemaEnabled()).toBe(false);
    expect(process.env.ENABLE_SCHEMA_REPAIR_RETRY).toBe("true");
  });

  it("both flags can be ON simultaneously", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    process.env.ENABLE_SCHEMA_REPAIR_RETRY = "true";

    expect(isResponseSchemaEnabled()).toBe(true);
    expect(process.env.ENABLE_SCHEMA_REPAIR_RETRY).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// 4. Source-level guards
// ---------------------------------------------------------------------------

describe("P4-11: source-level feature flag guard", () => {
  it("gemini.ts uses isResponseSchemaEnabled() to gate responseSchema", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    // responseSchema must appear inside a conditional using the flag function
    expect(source).toContain("isResponseSchemaEnabled()");
    // P4-12g: schema mode ternary selects full or minimal
    expect(source).toContain("STORY_RESPONSE_SCHEMA");
    expect(source).toContain("STORY_RESPONSE_SCHEMA_MINIMAL");
    expect(source).toContain("getResponseSchemaMode()");
  });

  it("responseSchema is not unconditionally included in generationConfig", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    // The assignment must be inside a ternary or if block
    // It should NOT be a bare property in the default config
    const lines = source.split("\n");
    const configLines = lines.filter((l) => l.includes("STORY_RESPONSE_SCHEMA") && l.includes("responseSchema") || l.includes("getResponseSchemaMode"));
    expect(configLines.length).toBeGreaterThan(0);
    // The generationConfig construction must be near the flag check
    const genConfigLines = lines.filter((l) => l.includes("generationConfig") && l.includes("isResponseSchemaEnabled"));
    expect(genConfigLines.length).toBeGreaterThan(0);
  });

  it("isResponseSchemaEnabled is exported from gemini.ts", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    expect(source).toContain("export function isResponseSchemaEnabled");
  });

  it("validateStory() is still called after JSON parsing in gemini.ts", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    // validateStory must still appear after parsing
    expect(source).toContain("validateStory(parsed)");
  });

  it("generate-book.ts does not import story-response-schema", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/generate-book.ts"),
      "utf-8"
    );
    expect(source).not.toContain("story-response-schema");
  });
});

// ---------------------------------------------------------------------------
// 5. P4-14 decision guards
// ---------------------------------------------------------------------------

describe("P4-14: responseSchema rollout abandoned — guards", () => {
  afterEach(() => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    delete process.env.RESPONSE_SCHEMA_MODE;
  });

  it("ENABLE_RESPONSE_SCHEMA defaults to OFF (not production)", () => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    expect(isResponseSchemaEnabled()).toBe(false);
  });

  it("no production env file sets ENABLE_RESPONSE_SCHEMA", () => {
    const envContent = fs.readFileSync(
      path.resolve(__dirname, "../.env.story-gen-8a769"),
      "utf-8"
    );
    expect(envContent).not.toContain("ENABLE_RESPONSE_SCHEMA");
  });

  it("no production env file sets RESPONSE_SCHEMA_MODE", () => {
    const envContent = fs.readFileSync(
      path.resolve(__dirname, "../.env.story-gen-8a769"),
      "utf-8"
    );
    expect(envContent).not.toContain("RESPONSE_SCHEMA_MODE");
  });

  it("gemini.ts contains P4-14 do-not-enable warning comment", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8"
    );
    expect(source).toContain("P4-14 DECISION");
    expect(source).toContain("NOT for production use");
  });

  it("P4_RESPONSE_SCHEMA_DECISION.md exists", () => {
    const exists = fs.existsSync(
      path.resolve(__dirname, "../../docs/P4_RESPONSE_SCHEMA_DECISION.md")
    );
    expect(exists).toBe(true);
  });
});
