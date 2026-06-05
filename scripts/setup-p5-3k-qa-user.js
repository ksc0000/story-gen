/**
 * P5-3k QA: Inspect and prepare the QA user account.
 *
 * - Looks up the QA user by email via Firebase Auth Admin
 * - Displays current plan / monthlyGenerationCount / generationOverride
 * - Optionally sets generationOverride.bypassMonthlyLimit = true so that
 *   8 test books can be generated without hitting the free-tier quota
 *
 * Usage (read-only inspection):
 *   node scripts/setup-p5-3k-qa-user.js --email=kikushun0529@gmail.com
 *
 * Usage (set bypassMonthlyLimit):
 *   node scripts/setup-p5-3k-qa-user.js --email=kikushun0529@gmail.com --set-bypass-limit --write
 *
 * Prerequisites:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Safety:
 *   - Does NOT commit or log the service account.
 *   - Prints the user's UID for use with create-p5-3k-reference-aware-qa-books.js.
 *   - bypassMonthlyLimit is the only mutation; no plan upgrade, no data deletion.
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");
const { getAuth } = functionsRequire("firebase-admin/auth");

const TARGET_PROJECT_ID = "story-gen-8a769";
const DEFAULT_QA_EMAIL = "kikushun0529@gmail.com";

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

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId });
}

function parseArgs(args) {
  const emailArg = args.find((a) => a.startsWith("--email="));
  const email = emailArg ? emailArg.slice("--email=".length).trim() : DEFAULT_QA_EMAIL;
  const setBypassLimit = args.includes("--set-bypass-limit");
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  return { email, setBypassLimit, isDryRun, isWrite };
}

async function main() {
  const args = process.argv.slice(2);
  const { email, setBypassLimit, isDryRun, isWrite } = parseArgs(args);

  if (setBypassLimit && !isDryRun && !isWrite) {
    console.error("[error] --set-bypass-limit requires either --dry-run or --write.");
    process.exit(1);
  }

  const sa = loadServiceAccountFromEnvPath();
  if (sa.projectId !== TARGET_PROJECT_ID) {
    throw new Error(`Service account project_id (${sa.projectId}) != target (${TARGET_PROJECT_ID}).`);
  }
  ensureAdminApp(sa);

  const auth = getAuth();
  const db = getFirestore();

  // Look up Firebase Auth user by email
  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      console.error(`[error] No Firebase Auth user found for email: ${email}`);
      process.exit(1);
    }
    throw err;
  }

  const uid = authUser.uid;
  console.log(`[qa-user]`);
  console.log(`  email:      ${email}`);
  console.log(`  uid:        ${uid}`);
  console.log(`  disabled:   ${authUser.disabled}`);
  console.log(`  created:    ${authUser.metadata.creationTime}`);
  console.log(`  lastSignIn: ${authUser.metadata.lastSignInTime}`);

  // Read Firestore user doc
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.log(`\n[firestore] User doc NOT FOUND (users/${uid})`);
    console.log("  → Book generation will fail; user doc is required.");
    process.exit(1);
  }

  const userData = userDoc.data();
  console.log(`\n[firestore] users/${uid}`);
  console.log(`  plan:                   ${userData.plan ?? "(unset)"}`);
  console.log(`  monthlyGenerationCount: ${userData.monthlyGenerationCount ?? 0}`);
  console.log(`  generationOverride:     ${JSON.stringify(userData.generationOverride ?? {})}`);

  const bypassAlreadySet = userData.generationOverride?.bypassMonthlyLimit === true;

  if (!setBypassLimit) {
    console.log(`\n[info] Read-only check complete.`);
    if (!bypassAlreadySet) {
      console.log(`[warn] bypassMonthlyLimit is NOT set.`);
      console.log(`[warn] Run with --set-bypass-limit --write to enable it for QA.`);
    } else {
      console.log(`[info] bypassMonthlyLimit is already set. QA user is ready.`);
    }
    console.log(`\n[next] Export this UID for use in book creation:`);
    console.log(`  export QA_USER_ID=${uid}`);
    return;
  }

  // --set-bypass-limit path
  if (bypassAlreadySet) {
    console.log(`\n[info] bypassMonthlyLimit is already true. No update needed.`);
    console.log(`[next] export QA_USER_ID=${uid}`);
    return;
  }

  if (isDryRun) {
    console.log(`\n[dry-run] Would set generationOverride.bypassMonthlyLimit = true on users/${uid}`);
    console.log(`[next] Re-run with --write to apply.`);
    return;
  }

  // Actual write
  await userRef.update({
    "generationOverride.bypassMonthlyLimit": true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`\n[written] generationOverride.bypassMonthlyLimit = true on users/${uid}`);
  console.log(`[next] export QA_USER_ID=${uid}`);
  console.log(`[next] node scripts/create-p5-3k-reference-aware-qa-books.js --userId=${uid} --write`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
