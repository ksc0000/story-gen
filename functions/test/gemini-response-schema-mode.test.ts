/**
 * P4-12g: Response schema mode tests.
 *
 * Coverage:
 * 1. getResponseSchemaMode() default behavior.
 * 2. RESPONSE_SCHEMA_MODE values: "minimal", "full", unknown.
 * 3. Interaction with ENABLE_RESPONSE_SCHEMA flag.
 * 4. Correct schema selected for each mode.
 *
 * No live Gemini calls. No Firebase deploy.
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  isResponseSchemaEnabled,
  getResponseSchemaMode,
} from "../src/lib/gemini";
import {
  STORY_RESPONSE_SCHEMA,
  STORY_RESPONSE_SCHEMA_MINIMAL,
} from "../src/lib/story-response-schema";
import type { ResponseSchema } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// 1. getResponseSchemaMode() defaults
// ---------------------------------------------------------------------------

describe("getResponseSchemaMode() helper", () => {
  afterEach(() => {
    delete process.env.RESPONSE_SCHEMA_MODE;
  });

  it("returns 'full' by default (env absent)", () => {
    delete process.env.RESPONSE_SCHEMA_MODE;
    expect(getResponseSchemaMode()).toBe("full");
  });

  it("returns 'full' when RESPONSE_SCHEMA_MODE is empty", () => {
    process.env.RESPONSE_SCHEMA_MODE = "";
    expect(getResponseSchemaMode()).toBe("full");
  });

  it("returns 'full' when RESPONSE_SCHEMA_MODE is 'full'", () => {
    process.env.RESPONSE_SCHEMA_MODE = "full";
    expect(getResponseSchemaMode()).toBe("full");
  });

  it("returns 'minimal' when RESPONSE_SCHEMA_MODE is 'minimal'", () => {
    process.env.RESPONSE_SCHEMA_MODE = "minimal";
    expect(getResponseSchemaMode()).toBe("minimal");
  });

  it("returns 'full' for unknown value 'auto'", () => {
    process.env.RESPONSE_SCHEMA_MODE = "auto";
    expect(getResponseSchemaMode()).toBe("full");
  });

  it("returns 'full' for unknown value 'MINIMAL' (case-sensitive)", () => {
    process.env.RESPONSE_SCHEMA_MODE = "MINIMAL";
    expect(getResponseSchemaMode()).toBe("full");
  });

  it("returns 'full' for unknown value 'true'", () => {
    process.env.RESPONSE_SCHEMA_MODE = "true";
    expect(getResponseSchemaMode()).toBe("full");
  });
});

// ---------------------------------------------------------------------------
// 2. Config construction by mode
// ---------------------------------------------------------------------------

describe("generationConfig schema selection by mode", () => {
  afterEach(() => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    delete process.env.RESPONSE_SCHEMA_MODE;
  });

  function buildConfig() {
    if (!isResponseSchemaEnabled()) {
      return { responseMimeType: "application/json" as const };
    }
    return {
      responseMimeType: "application/json" as const,
      responseSchema: (getResponseSchemaMode() === "minimal"
        ? STORY_RESPONSE_SCHEMA_MINIMAL
        : STORY_RESPONSE_SCHEMA) as unknown as ResponseSchema,
    };
  }

  it("flag OFF: no responseSchema regardless of mode", () => {
    delete process.env.ENABLE_RESPONSE_SCHEMA;
    process.env.RESPONSE_SCHEMA_MODE = "minimal";
    const config = buildConfig();
    expect("responseSchema" in config).toBe(false);
    expect(config.responseMimeType).toBe("application/json");
  });

  it("flag ON + default mode: uses full STORY_RESPONSE_SCHEMA", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    delete process.env.RESPONSE_SCHEMA_MODE;
    const config = buildConfig();
    expect("responseSchema" in config).toBe(true);
    expect((config as { responseSchema: unknown }).responseSchema).toBe(STORY_RESPONSE_SCHEMA);
  });

  it("flag ON + mode=full: uses full STORY_RESPONSE_SCHEMA", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    process.env.RESPONSE_SCHEMA_MODE = "full";
    const config = buildConfig();
    expect("responseSchema" in config).toBe(true);
    expect((config as { responseSchema: unknown }).responseSchema).toBe(STORY_RESPONSE_SCHEMA);
  });

  it("flag ON + mode=minimal: uses STORY_RESPONSE_SCHEMA_MINIMAL", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    process.env.RESPONSE_SCHEMA_MODE = "minimal";
    const config = buildConfig();
    expect("responseSchema" in config).toBe(true);
    expect((config as { responseSchema: unknown }).responseSchema).toBe(STORY_RESPONSE_SCHEMA_MINIMAL);
  });

  it("flag ON: responseMimeType remains application/json in all modes", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";

    process.env.RESPONSE_SCHEMA_MODE = "full";
    expect(buildConfig().responseMimeType).toBe("application/json");

    process.env.RESPONSE_SCHEMA_MODE = "minimal";
    expect(buildConfig().responseMimeType).toBe("application/json");

    delete process.env.RESPONSE_SCHEMA_MODE;
    expect(buildConfig().responseMimeType).toBe("application/json");
  });

  it("flag ON + unknown mode: defaults to full STORY_RESPONSE_SCHEMA", () => {
    process.env.ENABLE_RESPONSE_SCHEMA = "true";
    process.env.RESPONSE_SCHEMA_MODE = "unknown_value";
    const config = buildConfig();
    expect((config as { responseSchema: unknown }).responseSchema).toBe(STORY_RESPONSE_SCHEMA);
  });
});

// ---------------------------------------------------------------------------
// 3. Schema identity checks
// ---------------------------------------------------------------------------

describe("schema identity for mode selection", () => {
  it("full schema has cast property", () => {
    expect(STORY_RESPONSE_SCHEMA.properties).toHaveProperty("cast");
  });

  it("minimal schema does NOT have cast property", () => {
    expect(STORY_RESPONSE_SCHEMA_MINIMAL.properties).not.toHaveProperty("cast");
  });

  it("full and minimal schemas have same required root fields", () => {
    expect([...STORY_RESPONSE_SCHEMA.required].sort()).toEqual(
      [...STORY_RESPONSE_SCHEMA_MINIMAL.required].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Source-level guards
// ---------------------------------------------------------------------------

describe("P4-12g source-level guards", () => {
  it("gemini.ts imports STORY_RESPONSE_SCHEMA_MINIMAL", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    expect(source).toContain("STORY_RESPONSE_SCHEMA_MINIMAL");
  });

  it("gemini.ts exports getResponseSchemaMode", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    expect(source).toContain("export function getResponseSchemaMode");
  });

  it("gemini.ts uses getResponseSchemaMode() in generationConfig", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    // The mode selector must appear in the generationConfig construction
    expect(source).toContain("getResponseSchemaMode()");
    // generationConfig area must contain both the flag check and mode selector
    const lines = source.split("\n");
    const configLines = lines.filter((l) => l.includes("generationConfig") && l.includes("isResponseSchemaEnabled"));
    expect(configLines.length).toBeGreaterThan(0);
  });

  it("validateStory() is still called in gemini.ts", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    expect(source).toContain("validateStory(parsed)");
  });

  it("parse diagnostics are still present in gemini.ts", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/gemini.ts"),
      "utf-8",
    );
    expect(source).toContain("buildSafeJsonParseDiagnostics");
  });
});
