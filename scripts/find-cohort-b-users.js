/**
 * Find Cohort B users and optionally apply the safer_retry override.
 * Cohort B is identified by generationOverride.p5PageExperiment === "simplified_scene".
 *
 * Usage:
 *   # Dry-run (default):
 *   node scripts/find-cohort-b-users.js
 *
 *   # Apply safer_retry override:
 *   node scripts/find-cohort-b-users.js --apply-retry --write
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore, FieldValue } = functionsRequire("firebase-admin/firestore");

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
    return initializeApp({ credential: cert(sa), projectId: sa.projectId });
  } catch (e) {
    if (process.env.SKIP_FIREBASE_INIT === "true") {
      console.warn(`[warn] Skipping Firebase initialization: ${e.message}`);
      return null;
    }
    throw e;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply-retry");
  const isWrite = args.includes("--write");

  const app = ensureAdminApp();
  if (!app) {
    console.error("Firebase app not initialized. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.");
    process.exit(1);
  }
  const db = getFirestore();

  console.log("Searching for Cohort B users (p5PageExperiment === 'simplified_scene')...");

  const usersSnapshot = await db.collection("users")
    .where("generationOverride.p5PageExperiment", "==", "simplified_scene")
    .get();

  if (usersSnapshot.empty) {
    console.log("No Cohort B users found.");
    return;
  }

  console.log(`Found ${usersSnapshot.size} users.`);

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const currentUnification = data.generationOverride?.p5ModelUnification;

    console.log(`- UID: ${doc.id}, Email: ${data.email || 'N/A'}, Current p5ModelUnification: ${currentUnification || 'none'}`);

    if (isApply) {
      if (currentUnification === "safer_retry") {
        console.log(`  [skip] Already set to safer_retry.`);
        continue;
      }

      if (!isWrite) {
        console.log(`  [dry-run] Would set p5ModelUnification to 'safer_retry'.`);
        continue;
      }

      console.log(`  [write] Setting p5ModelUnification to 'safer_retry'...`);
      await doc.ref.update({
        "generationOverride.p5ModelUnification": "safer_retry",
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`  ✓ Updated.`);
    }
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
