/**
 * #766: Vitest tests for check-function-regions.mjs
 *
 * Covers:
 *   - passing case (region matches EXPECTED_REGION)
 *   - options object present but region key missing
 *   - region present but pointing at a different region (e.g. default us-central1
 *     left implicit, or an explicit wrong region)
 *   - no options object at all (handler passed directly, the #765 regression shape)
 *   - a comment containing an apostrophe near the options object must not break
 *     brace balancing (regression: functions/src/submit-app-feedback.ts)
 *   - the real functions/src tree has zero violations today
 *
 * @vitest-environment node
 */

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { describe, it, expect, afterEach } from "vitest";
import { checkFunctionRegions, EXPECTED_REGION } from "./check-function-regions.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDirs = [];

function makeFixtureDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-function-regions-"));
  tmpDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, "utf8");
  }
  return dir;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    fs.rmSync(tmpDirs.pop(), { recursive: true, force: true });
  }
});

describe("checkFunctionRegions", () => {
  it("reports no violations when region matches EXPECTED_REGION", () => {
    const dir = makeFixtureDir({
      "ok.ts": `
        import { onCall } from "firebase-functions/v2/https";
        export const foo = onCall(
          { region: "${EXPECTED_REGION}", memory: "256MiB" },
          async (request) => ({ ok: true }),
        );
      `,
    });

    const { violations, checkedCount } = checkFunctionRegions(dir);
    expect(violations).toEqual([]);
    expect(checkedCount).toBe(1);
  });

  it("flags an options object that omits region entirely", () => {
    const dir = makeFixtureDir({
      "missing-region.ts": `
        import { onCall } from "firebase-functions/v2/https";
        export const foo = onCall(
          { memory: "256MiB" },
          async (request) => ({ ok: true }),
        );
      `,
    });

    const { violations } = checkFunctionRegions(dir);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      file: "missing-region.ts",
      factory: "onCall",
      reason: "region not specified",
    });
  });

  it("flags a region that doesn't match the client region (the #765 shape, made explicit)", () => {
    const dir = makeFixtureDir({
      "wrong-region.ts": `
        import { onRequest } from "firebase-functions/v2/https";
        export const foo = onRequest(
          { region: "us-central1" },
          async (req, res) => res.send("ok"),
        );
      `,
    });

    const { violations } = checkFunctionRegions(dir);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain("us-central1");
    expect(violations[0].reason).toContain(EXPECTED_REGION);
  });

  it("flags a trigger with no options object at all", () => {
    const dir = makeFixtureDir({
      "no-options.ts": `
        import { onCall } from "firebase-functions/v2/https";
        export const foo = onCall(async (request) => ({ ok: true }));
      `,
    });

    const { violations } = checkFunctionRegions(dir);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain("options object not found");
  });

  it("does not let an apostrophe inside a comment break brace balancing", () => {
    // Regression fixture mirroring functions/src/submit-app-feedback.ts, which has
    // a Japanese/English comment containing "let's" between the options and the
    // closing brace. A naive string-literal scanner mistakes that apostrophe for
    // the start of a string and mis-balances the braces.
    const dir = makeFixtureDir({
      "comment-apostrophe.ts": `
        import { onCall } from "firebase-functions/v2/https";
        export const foo = onCall(
          {
            region: "${EXPECTED_REGION}",
            // let's keep this consistent with others
          },
          async (request) => ({ ok: true }),
        );
      `,
    });

    const { violations } = checkFunctionRegions(dir);
    expect(violations).toEqual([]);
  });

  it("scans nested directories (e.g. lib/, controllers/)", () => {
    const dir = makeFixtureDir({
      "top.ts": `
        import { onCall } from "firebase-functions/v2/https";
        export const foo = onCall({ region: "${EXPECTED_REGION}" }, async () => {});
      `,
    });
    fs.mkdirSync(path.join(dir, "nested"));
    fs.writeFileSync(
      path.join(dir, "nested", "bar.ts"),
      `
        import { onSchedule } from "firebase-functions/v2/scheduler";
        export const bar = onSchedule({ schedule: "0 0 * * *" }, async () => {});
      `,
      "utf8",
    );

    const { violations, checkedCount } = checkFunctionRegions(dir);
    expect(checkedCount).toBe(2);
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toMatch(/nested[/\\]bar\.ts$/);
  });

  it("finds zero violations in the real functions/src tree today", () => {
    const realSrcDir = path.join(REPO_ROOT, "functions", "src");
    const { violations, checkedCount } = checkFunctionRegions(realSrcDir);
    expect(violations).toEqual([]);
    expect(checkedCount).toBeGreaterThan(0);
  });
});
