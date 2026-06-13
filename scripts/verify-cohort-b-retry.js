/**
 * Verify Safer High-Quality Retry activation for Cohort B users.
 * Checks Firestore flags and code-level policy.
 *
 * Usage:
 *   node scripts/verify-cohort-b-retry.js
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

// Import the policy function using the compiled lib
const policyPath = resolve(__dirname, "../functions/lib/lib/image-model-policy.js");
let isSaferRetryEnabled;
if (existsSync(policyPath)) {
  ({ isSaferRetryEnabled } = require(policyPath));
} else {
  console.warn("[warn] Compiled policy lib not found. Code-level verification will be skipped.");
  console.warn("       Run 'npm --prefix functions run build' to enable it.");
}

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
  const app = ensureAdminApp();
  if (!app) {
    console.error("Firebase app not initialized. Code-level verification only.");
  }

  console.log("--- Safer High-Quality Retry Verification ---");

  // 1. Code-level Policy Verification
  console.log("\n[1] Checking Code-level Policy...");
  if (isSaferRetryEnabled) {
    const testProfiles = ["pro_consistent", "openai_standard", "openai_mini", "kontext_max"];
    const results = testProfiles.map(p => ({ profile: p, enabled: isSaferRetryEnabled(p) }));
    console.table(results);
    const allEnabled = results.every(r => r.enabled);
    if (allEnabled) {
      console.log("✓ All target profiles have safer_retry enabled by default.");
    } else {
      console.warn("! Some target profiles do NOT have safer_retry enabled by default.");
    }
  } else {
    console.log("Skipped (policy lib not found).");
  }

  // 2. Firestore Flag Verification
  if (app) {
    const db = getFirestore();
    console.log("\n[2] Checking Firestore Flags for Cohort B...");
    const usersSnapshot = await db.collection("users")
      .where("generationOverride.p5PageExperiment", "==", "simplified_scene")
      .get();

    if (usersSnapshot.empty) {
      console.log("No Cohort B users found.");
    } else {
      let activeCount = 0;
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const enabled = data.generationOverride?.p5ModelUnification === "safer_retry";
        if (enabled) activeCount++;
        console.log(`- UID: ${doc.id}, p5ModelUnification: ${data.generationOverride?.p5ModelUnification || 'none'} [${enabled ? '✓' : '✗'}]`);
      });
      console.log(`\nSummary: ${activeCount}/${usersSnapshot.size} Cohort B users have the override enabled.`);
    }
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
