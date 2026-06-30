/**
 * Cleanup style-verification smoke books created during style QA sessions.
 * Targets only documents with smokeTestMetadata.isSmokeTest === true whose
 * suite indicates a style-verification run. Real user books are never matched.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json node scripts/cleanup-style-verify-smoke-books.js --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json node scripts/cleanup-style-verify-smoke-books.js --write
 */

"use strict";

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";
const SUITE_PREFIXES = ["style_verify"]; // matches style_verify, style_verify_b1/b2, style_verify_retry

function loadServiceAccount() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !existsSync(credPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set or file not found.");
  }
  return JSON.parse(readFileSync(credPath, "utf-8"));
}

function isTargetSmokeBook(data) {
  const meta = data.smokeTestMetadata;
  if (!meta || meta.isSmokeTest !== true) return false;
  const suite = String(meta.suite ?? "");
  return SUITE_PREFIXES.some((p) => suite.startsWith(p));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");
  if (!dryRun && !write) {
    console.error("Specify --dry-run or --write.");
    process.exit(1);
  }

  const sa = loadServiceAccount();
  if (sa.project_id !== TARGET_PROJECT_ID) {
    throw new Error(`Service account project_id mismatch: ${sa.project_id}`);
  }
  if (getApps().length === 0) {
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const db = getFirestore();

  const snap = await db.collection("books").get();
  const targets = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (isTargetSmokeBook(data)) {
      targets.push({ id: doc.id, ref: doc.ref, suite: data.smokeTestMetadata.suite, style: data.style, status: data.status });
    }
  });

  console.log(`[cleanup] matched ${targets.length} style-verify smoke books (mode=${dryRun ? "dry-run" : "write"})`);
  for (const t of targets) {
    console.log(`  ${t.id} | ${String(t.suite).padEnd(20)} | ${String(t.style).padEnd(22)} | ${t.status}`);
  }

  if (write && targets.length > 0) {
    let batch = db.batch();
    let n = 0;
    for (const t of targets) {
      batch.delete(t.ref);
      if (++n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
    if (n > 0) await batch.commit();
    console.log(`[cleanup] deleted ${targets.length} smoke books.`);
  }
}

main().catch((e) => { console.error("[error]", e.message); process.exit(1); });
