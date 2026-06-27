/**
 * Backfill createdAt / createdAtMs for books whose createdAt was persisted as a
 * broken, unresolved serverTimestamp sentinel ({_methodName:"serverTimestamp"}).
 *
 * Root cause: an old stripUndefined() helper recursed into the FieldValue
 * sentinel and stripped its prototype, so the server never resolved it and the
 * value was stored as a plain object. Affected books show "日付不明" in the UI.
 *
 * This script reads each book's real server write time (doc.createTime) and:
 *   - sets createdAtMs (ms number) when missing or invalid
 *   - repairs createdAt to a real Timestamp when it is a broken sentinel
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/backfill-book-created-at.js --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/backfill-book-created-at.js --write
 */

"use strict";

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { Timestamp, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

function loadServiceAccount() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !existsSync(credPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set or file not found.");
  }
  return JSON.parse(readFileSync(credPath, "utf-8"));
}

function isBrokenSentinel(value) {
  return (
    value != null &&
    typeof value === "object" &&
    typeof value.toMillis !== "function" &&
    typeof value.seconds !== "number" &&
    typeof value._seconds !== "number"
  );
}

function isValidMs(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");
  if (!dryRun && !write) {
    console.error("Specify --dry-run to preview or --write to apply.");
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
  console.log(`[backfill] scanning ${snap.size} books (mode=${dryRun ? "dry-run" : "write"})`);

  let needsFix = 0;
  let fixed = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const msMissing = !isValidMs(data.createdAtMs);
    const createdAtBroken = isBrokenSentinel(data.createdAt);
    if (!msMissing && !createdAtBroken) continue;

    needsFix++;
    const createTimeMs = doc.createTime ? doc.createTime.toMillis() : null;
    const resolvedMs = isValidMs(data.createdAtMs) ? data.createdAtMs : createTimeMs;
    if (!isValidMs(resolvedMs)) {
      console.log(`  [skip] ${doc.id} — no createTime and no valid createdAtMs`);
      continue;
    }

    const update = {};
    if (msMissing) update.createdAtMs = resolvedMs;
    if (createdAtBroken) update.createdAt = Timestamp.fromMillis(resolvedMs);

    const title = data.title || "(no title)";
    console.log(
      `  [fix] ${doc.id} "${title}" → ${Object.keys(update).join(", ")} (${new Date(resolvedMs).toISOString().slice(0, 10)})`
    );

    if (write) {
      batch.update(doc.ref, update);
      batchCount++;
      fixed++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (write && batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n[backfill] needsFix=${needsFix} ${write ? `fixed=${fixed}` : "(dry-run, no writes)"}`);
}

main().catch((e) => {
  console.error("[error]", e.message);
  process.exit(1);
});
