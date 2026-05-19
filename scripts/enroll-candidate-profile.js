/**
 * T6-60: Enroll user(s) for candidate image profile access.
 *
 * Sets generationOverride.allowCandidateProfile = true on the specified Firestore user doc.
 * Required for smoke test users that use imageModelProfile: "openai_image_candidate".
 *
 * Usage:
 *   node scripts/enroll-candidate-profile.js --userId <id> --dry-run
 *   node scripts/enroll-candidate-profile.js --userId <id> --write
 *
 *   # Enroll multiple users:
 *   node scripts/enroll-candidate-profile.js --userId smoke-test-openai-i1 --write
 *   node scripts/enroll-candidate-profile.js --userId smoke-test-openai-i3 --write
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
  const sa = loadServiceAccountFromEnvPath();
  return initializeApp({ credential: cert(sa), projectId: sa.projectId });
}

function parseArgs(args) {
  const userIdIdx = args.indexOf("--userId");
  if (userIdIdx === -1 || !args[userIdIdx + 1]) {
    throw new Error("Missing required argument: --userId <id>");
  }
  const userId = args[userIdIdx + 1];
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  return { userId, isDryRun, isWrite };
}

ensureAdminApp();
const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  let userId, isDryRun, isWrite;
  try {
    ({ userId, isDryRun, isWrite } = parseArgs(args));
  } catch (e) {
    console.error(`[error] ${e.message}`);
    console.error("Usage: node scripts/enroll-candidate-profile.js --userId <id> --dry-run | --write");
    process.exit(1);
  }

  if (!isDryRun && !isWrite) {
    console.error("Usage: node scripts/enroll-candidate-profile.js --userId <id> --dry-run | --write");
    process.exit(1);
  }

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] Candidate profile enrollment`);
  console.log(`  userId: ${userId}`);

  if (!userDoc.exists) {
    console.log(`  User doc: NOT FOUND`);
    if (isDryRun) {
      console.log(`  [DRY-RUN] Would create user doc with allowCandidateProfile: true`);
      return;
    }
    await userRef.set({
      plan: "premium",
      createdAt: FieldValue.serverTimestamp(),
      generationOverride: {
        bypassMonthlyLimit: true,
        allowCandidateProfile: true, // T6-59: candidate profile gate
      },
    });
    console.log(`  Created user doc with allowCandidateProfile: true`);
    return;
  }

  const current = userDoc.data();
  const currentOverride = current?.generationOverride ?? {};
  console.log(`  Current generationOverride: ${JSON.stringify(currentOverride)}`);

  if (currentOverride.allowCandidateProfile === true) {
    console.log(`  Already enrolled (allowCandidateProfile: true). No change needed.`);
    return;
  }

  if (isDryRun) {
    console.log(`  [DRY-RUN] Would set generationOverride.allowCandidateProfile: true`);
    return;
  }

  await userRef.update({
    "generationOverride.allowCandidateProfile": true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`  ✓ Set generationOverride.allowCandidateProfile: true`);
  console.log(`  Updated user: ${userId}`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
