/**
 * P5-3h: Set generationOverride.p5ModelUnification on target Firestore user documents.
 *
 * This script is used to apply the "safer_retry" override to Cohort B testers.
 *
 * Usage:
 *   # Dry-run (default):
 *   node scripts/set-p5-model-unification.js --uid <id> --value safer_retry
 *   node scripts/set-p5-model-unification.js --uids-file <path> --value safer_retry --dry-run
 *
 *   # Execute (requires --dry-run=false):
 *   node scripts/set-p5-model-unification.js --uid <id> --value safer_retry --dry-run=false
 *
 *   # Supported values: "safer_retry", "strict", "null" (to remove the field)
 *
 * Prerequisites:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\secrets\service-account.json"
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

function loadServiceAccountFromEnvPath() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set or file not found.");
  }
  const raw = readFileSync(credentialPath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    clientEmail: parsed.client_email || parsed.clientEmail,
    privateKey: String(parsed.private_key || parsed.privateKey).replace(/\\n/g, "\n"),
    projectId: parsed.project_id || parsed.projectId || TARGET_PROJECT_ID,
  };
}

function ensureAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  try {
    const sa = loadServiceAccountFromEnvPath();
    if (sa.projectId !== TARGET_PROJECT_ID) {
      console.warn(`[warn] Service account project_id (${sa.projectId}) does not match target (${TARGET_PROJECT_ID}).`);
    }
    return initializeApp({ credential: cert(sa), projectId: sa.projectId });
  } catch (e) {
    if (process.env.SKIP_FIREBASE_INIT === "true") {
      console.warn(`[warn] Skipping Firebase initialization: ${e.message}`);
      return null;
    }
    throw e;
  }
}

function parseArgs(args) {
  const uidIdx = args.indexOf("--uid");
  const uidsFileIdx = args.indexOf("--uids-file");
  const valueIdx = args.indexOf("--value");

  let uids = [];
  if (uidIdx !== -1 && args[uidIdx + 1]) {
    uids.push(args[uidIdx + 1]);
  } else if (uidsFileIdx !== -1 && args[uidsFileIdx + 1]) {
    const filePath = args[uidsFileIdx + 1];
    if (existsSync(filePath)) {
      uids = readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => !!s);
    } else {
      throw new Error(`File not found: ${filePath}`);
    }
  } else {
    throw new Error("Missing required argument: --uid <id> or --uids-file <path>");
  }

  if (valueIdx === -1 || !args[valueIdx + 1]) {
    throw new Error("Missing required argument: --value <safer_retry|strict|null>");
  }
  const valueRaw = args[valueIdx + 1];
  let value;
  if (valueRaw === "safer_retry" || valueRaw === "strict") {
    value = valueRaw;
  } else if (valueRaw === "null") {
    value = null;
  } else {
    throw new Error(`Invalid value: ${valueRaw}. Must be safer_retry, strict, or null.`);
  }

  // Default dry-run is true unless --dry-run=false is explicitly passed
  const isDryRun = !args.includes("--dry-run=false");

  return { uids, value, isDryRun };
}

async function main() {
  const args = process.argv.slice(2);
  let uids, value, isDryRun;
  try {
    ({ uids, value, isDryRun } = parseArgs(args));
  } catch (e) {
    console.error(`[error] ${e.message}`);
    console.error("Usage: node scripts/set-p5-model-unification.js --uid <id>|--uids-file <path> --value safer_retry|strict|null [--dry-run=false]");
    process.exit(1);
  }

  const app = ensureAdminApp();
  const db = app ? getFirestore() : null;

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] Set p5ModelUnification`);
  console.log(`  Target count: ${uids.length}`);
  console.log(`  New value:    ${value === null ? "REMOVE (null)" : `"${value}"`}`);
  console.log("");

  for (const uid of uids) {
    let oldValue = "unknown (simulated)";

    if (db) {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log(`[${uid}] User doc NOT FOUND. Skipping.`);
        continue;
      }

      const current = userDoc.data();
      const currentOverride = current?.generationOverride ?? {};
      oldValue = currentOverride.p5ModelUnification;

      if (oldValue === (value === null ? undefined : value)) {
        console.log(`[${uid}] Already has value ${value}. No change needed.`);
        continue;
      }
    }

    console.log(`[${uid}] Changing p5ModelUnification: ${oldValue === undefined ? "undefined" : (typeof oldValue === "string" ? `"${oldValue}"` : oldValue)} -> ${value === null ? "null (delete)" : `"${value}"`}`);

    if (isDryRun) {
      console.log(`  [DRY-RUN] Would update ${uid}`);
      continue;
    }

    if (!db) {
      throw new Error("Cannot write without valid Firebase credentials.");
    }

    const userRef = db.collection("users").doc(uid);

    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (value === null) {
      updateData["generationOverride.p5ModelUnification"] = FieldValue.delete();
    } else {
      updateData["generationOverride.p5ModelUnification"] = value;
    }

    await userRef.update(updateData);
    console.log(`  ✓ Updated ${uid}`);
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
