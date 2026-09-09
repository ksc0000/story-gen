/**
 * #766: Guard against callable/trigger region mismatches.
 *
 * PR #765 found that regenerateCoverImage / regeneratePageImage / checkBookCompletion
 * shipped without a `region` option (defaulting to us-central1) while every client
 * calls `getFunctions(app, "asia-northeast1")` (src/lib/firebase.ts, src/lib/functions.ts).
 * The mismatch is invisible in Cloud Functions logs (the function simply never receives
 * a request), so it went unnoticed since release. This script statically scans
 * functions/src for every v2 trigger definition (onCall/onRequest/onDocumentCreated/...)
 * and fails if its options object omits `region` or sets it to anything other than
 * the region every client uses.
 *
 * Usage:
 *   node scripts/check-function-regions.mjs
 *
 * Exports (for unit tests): EXPECTED_REGION, TRIGGER_FACTORIES, checkFunctionRegions
 *
 * Exit codes:
 *   0  All trigger definitions declare the expected region
 *   1  One or more violations found (or functions/src could not be scanned)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Every client instantiates Functions with this region (src/lib/firebase.ts,
// src/lib/functions.ts). Keep this in sync if that ever changes.
export const EXPECTED_REGION = "asia-northeast1";

// firebase-functions/v2 factories that accept a `region` option as their first argument.
export const TRIGGER_FACTORIES = [
  "onCall",
  "onRequest",
  "onDocumentCreated",
  "onDocumentUpdated",
  "onDocumentDeleted",
  "onDocumentWritten",
  "onSchedule",
  "onObjectFinalized",
  "onMessagePublished",
  "onTaskDispatched",
];

function listTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

/** Skip whitespace and // or /* comments starting at index i. */
function skipWhitespaceAndComments(str, i) {
  for (;;) {
    while (i < str.length && /\s/.test(str[i])) i++;
    if (str.startsWith("//", i)) {
      const nl = str.indexOf("\n", i);
      i = nl === -1 ? str.length : nl + 1;
      continue;
    }
    if (str.startsWith("/*", i)) {
      const end = str.indexOf("*/", i + 2);
      i = end === -1 ? str.length : end + 2;
      continue;
    }
    return i;
  }
}

/**
 * Extract the balanced `{ ... }` substring starting at str[startIdx] === '{'.
 * Skips over string/template literals and // and /* comments so that stray
 * quote characters inside them (e.g. an apostrophe in a Japanese/English
 * comment) don't throw off the brace count.
 */
function extractBalancedObject(str, startIdx) {
  let depth = 0;
  let inString = null;
  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (str.startsWith("//", i)) {
      const nl = str.indexOf("\n", i);
      i = nl === -1 ? str.length : nl;
      continue;
    }
    if (str.startsWith("/*", i)) {
      const end = str.indexOf("*/", i + 2);
      i = end === -1 ? str.length - 1 : end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return str.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Scan a single file's source for trigger factory calls and report any whose
 * options object is missing or doesn't declare the expected region.
 */
function checkFileContent(relPath, content) {
  const violations = [];
  const callRegex = new RegExp(`\\b(${TRIGGER_FACTORIES.join("|")})\\s*\\(`, "g");

  let match;
  while ((match = callRegex.exec(content)) !== null) {
    const factoryName = match[1];
    const afterParen = match.index + match[0].length;
    const line = content.slice(0, match.index).split("\n").length;
    const objStart = skipWhitespaceAndComments(content, afterParen);

    if (content[objStart] !== "{") {
      violations.push({
        file: relPath,
        line,
        factory: factoryName,
        reason: "options object not found (region cannot be verified)",
      });
      continue;
    }

    const objText = extractBalancedObject(content, objStart);
    if (objText === null) {
      violations.push({
        file: relPath,
        line,
        factory: factoryName,
        reason: "options object braces did not balance (parse failure)",
      });
      continue;
    }

    const regionMatch = objText.match(/region\s*:\s*(['"])([^'"]+)\1/);
    if (!regionMatch) {
      violations.push({
        file: relPath,
        line,
        factory: factoryName,
        reason: "region not specified",
      });
    } else if (regionMatch[2] !== EXPECTED_REGION) {
      violations.push({
        file: relPath,
        line,
        factory: factoryName,
        reason: `region is "${regionMatch[2]}", expected "${EXPECTED_REGION}"`,
      });
    }
  }

  return violations;
}

/**
 * Scan every .ts file under `srcDir` for trigger definitions missing the expected region.
 * Returns { violations, checkedCount } — checkedCount is the number of trigger factory
 * calls found (regardless of pass/fail), so callers can report "0 found" separately
 * from "N found, all valid".
 */
export function checkFunctionRegions(srcDir) {
  const violations = [];
  let checkedCount = 0;
  const callRegex = new RegExp(`\\b(${TRIGGER_FACTORIES.join("|")})\\s*\\(`, "g");

  for (const file of listTsFiles(srcDir)) {
    const relPath = path.relative(srcDir, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    checkedCount += (content.match(callRegex) ?? []).length;
    violations.push(...checkFileContent(relPath, content));
  }
  return { violations, checkedCount };
}

const isMain = (() => {
  try {
    return path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const srcDir = path.join(ROOT, "functions", "src");
  const { violations, checkedCount } = checkFunctionRegions(srcDir);

  if (violations.length > 0) {
    console.error(`\n[ERROR] ${violations.length} function region violation(s) found:`);
    for (const v of violations) {
      console.error(`  - functions/src/${v.file}:${v.line} ${v.factory}(...) — ${v.reason}`);
    }
    console.error(
      `\nEvery client calls getFunctions(app, "${EXPECTED_REGION}"). A trigger deployed to a ` +
        `different region (or the us-central1 default) will silently never receive requests. ` +
        `See #765 / #766.`,
    );
    process.exit(1);
  }

  console.log(
    `[PASS] check:function-regions passed. ${checkedCount} trigger definition(s) all declare region: "${EXPECTED_REGION}".`,
  );
  process.exit(0);
}
