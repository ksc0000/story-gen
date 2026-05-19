/**
 * T7-4b: Update sampleImageUrl for canonical guided_ai templates in Firestore.
 *
 * The sync-fixed-template-seeds.js script only updates fixed_template templates.
 * This script updates the 10 canonical guided_ai templates (animals, adventure, etc.)
 * by setting sampleImageUrl from .png to .webp.
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "path/to/service-account.json"
 *   node scripts/update-canonical-thumbnail-urls.js          # dry-run (default)
 *   node scripts/update-canonical-thumbnail-urls.js --write  # execute writes
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore, FieldValue } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// The 10 canonical guided_ai template IDs and their new WebP sampleImageUrl
const CANONICAL_THUMBNAIL_UPDATES = [
  { id: "animals",          sampleImageUrl: "/images/templates/animals.webp" },
  { id: "adventure",        sampleImageUrl: "/images/templates/adventure.webp" },
  { id: "fantasy",          sampleImageUrl: "/images/templates/fantasy.webp" },
  { id: "bedtime",          sampleImageUrl: "/images/templates/bedtime.webp" },
  { id: "emotional-growth", sampleImageUrl: "/images/templates/emotional-growth.webp" },
  { id: "daily-habits",     sampleImageUrl: "/images/templates/daily-habits.webp" },
  { id: "educational",      sampleImageUrl: "/images/templates/educational.webp" },
  { id: "food",             sampleImageUrl: "/images/templates/food.webp" },
  { id: "seasonal",         sampleImageUrl: "/images/templates/seasonal.webp" },
  { id: "vehicles-robots",  sampleImageUrl: "/images/templates/vehicles-robots.webp" },
];

function ensureGoogleApplicationCredentials() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || credentialPath.trim().length === 0) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
  }
  if (!existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS points to a missing file.");
  }
  return credentialPath;
}

function loadServiceAccount(credentialPath) {
  const parsed = JSON.parse(readFileSync(credentialPath, "utf8"));
  const projectId = parsed.project_id || parsed.projectId;
  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKeyRaw = parsed.private_key || parsed.privateKey;
  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("Service account JSON is missing required keys.");
  }
  return {
    projectId,
    clientEmail,
    privateKey: String(privateKeyRaw).replace(/\\n/g, "\n"),
  };
}

function initAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isWrite = args.includes("--write");

  console.log(`[mode] ${isWrite ? "WRITE" : "DRY_RUN"}`);
  console.log(`[target] ${CANONICAL_THUMBNAIL_UPDATES.length} canonical templates in Firestore`);
  console.log();

  const credentialPath = ensureGoogleApplicationCredentials();
  const serviceAccount = loadServiceAccount(credentialPath);

  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error(
      `Service account project_id mismatch. expected=${TARGET_PROJECT_ID} actual=${serviceAccount.projectId}`
    );
  }

  initAdminApp(serviceAccount);
  const db = getFirestore();

  // Fetch current state
  const currentValues = {};
  for (const { id } of CANONICAL_THUMBNAIL_UPDATES) {
    const snap = await db.doc(`templates/${id}`).get();
    if (!snap.exists) {
      currentValues[id] = { exists: false };
    } else {
      currentValues[id] = { exists: true, sampleImageUrl: snap.data().sampleImageUrl };
    }
  }

  console.log("[before]");
  for (const { id, sampleImageUrl: newUrl } of CANONICAL_THUMBNAIL_UPDATES) {
    const cur = currentValues[id];
    if (!cur.exists) {
      console.log(`  ${id}: NOT FOUND in Firestore`);
    } else {
      const alreadyDone = cur.sampleImageUrl === newUrl;
      console.log(
        `  ${id}: ${cur.sampleImageUrl} ${alreadyDone ? "(already .webp)" : "→ " + newUrl}`
      );
    }
  }
  console.log();

  if (!isWrite) {
    console.log("[result] dry-run complete. No writes performed. Re-run with --write to apply.");
    process.exit(0);
  }

  // Write updates
  console.log("[write] Updating sampleImageUrl for canonical templates...");
  const batch = db.batch();
  for (const { id, sampleImageUrl } of CANONICAL_THUMBNAIL_UPDATES) {
    if (!currentValues[id].exists) {
      console.warn(`  SKIP ${id}: document not found`);
      continue;
    }
    batch.update(db.doc(`templates/${id}`), {
      sampleImageUrl,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
    });
    console.log(`  queued: ${id} → ${sampleImageUrl}`);
  }

  await batch.commit();
  console.log("\n[done] Batch write committed.");

  // Verify
  console.log("\n[after] Verifying...");
  let passed = 0;
  for (const { id, sampleImageUrl: expected } of CANONICAL_THUMBNAIL_UPDATES) {
    const snap = await db.doc(`templates/${id}`).get();
    const actual = snap.data()?.sampleImageUrl;
    const ok = actual === expected;
    console.log(`  ${ok ? "✓" : "✗"} ${id}: ${actual}`);
    if (ok) passed++;
  }
  console.log(`\n${passed}/${CANONICAL_THUMBNAIL_UPDATES.length} verified.`);
  if (passed < CANONICAL_THUMBNAIL_UPDATES.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
