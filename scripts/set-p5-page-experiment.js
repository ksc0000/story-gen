/**
 * P5-3c: Enable or disable the p5PageExperiment flag on a Firestore user doc.
 *
 * Sets generationOverride.p5PageExperiment = "simplified_scene" (or removes it).
 * Required for smoke test users running the P5-3c-verify experiment.
 * This flag gates the simplified_scene page-image generation path in generate-book.ts.
 *
 * Usage:
 *   # Enable the experiment for a user:
 *   node scripts/set-p5-page-experiment.js --userId smoke-p53c-verify --enable --dry-run
 *   node scripts/set-p5-page-experiment.js --userId smoke-p53c-verify --enable --write
 *
 *   # Disable (remove) the experiment for a user:
 *   node scripts/set-p5-page-experiment.js --userId smoke-p53c-verify --disable --write
 *
 * Prerequisites:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\secrets\service-account.json"
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, FieldPath, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";
const EXPERIMENT_VALUE = "simplified_scene";

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
  if (sa.projectId !== TARGET_PROJECT_ID) {
    throw new Error(`Service account project_id (${sa.projectId}) does not match target (${TARGET_PROJECT_ID}).`);
  }
  return initializeApp({ credential: cert(sa), projectId: sa.projectId });
}

function parseArgs(args) {
  const userIdIdx = args.indexOf("--userId");
  if (userIdIdx === -1 || !args[userIdIdx + 1]) {
    throw new Error("Missing required argument: --userId <id>");
  }
  const userId = args[userIdIdx + 1];
  const enable = args.includes("--enable");
  const disable = args.includes("--disable");
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");

  if (enable && disable) throw new Error("Specify either --enable or --disable, not both.");
  if (!enable && !disable) throw new Error("Specify either --enable or --disable.");
  if (!isDryRun && !isWrite) throw new Error("Specify either --dry-run or --write.");

  return { userId, enable, isDryRun };
}

ensureAdminApp();
const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  let userId, enable, isDryRun;
  try {
    ({ userId, enable, isDryRun } = parseArgs(args));
  } catch (e) {
    console.error(`[error] ${e.message}`);
    console.error("Usage: node scripts/set-p5-page-experiment.js --userId <id> [--enable|--disable] [--dry-run|--write]");
    process.exit(1);
  }

  const mode = isDryRun ? "DRY-RUN" : "WRITE";
  console.log(`[${mode}] P5-3c p5PageExperiment ${enable ? "enable" : "disable"}`);
  console.log(`  userId:     ${userId}`);
  console.log(`  experiment: ${EXPERIMENT_VALUE}`);

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    if (isDryRun) {
      console.log(`  User doc: NOT FOUND`);
      if (enable) {
        console.log(`  [DRY-RUN] Would create user doc with p5PageExperiment: "${EXPERIMENT_VALUE}" and bypassMonthlyLimit: true`);
      }
      return;
    }
    if (enable) {
      await userRef.set({
        plan: "premium",
        createdAt: FieldValue.serverTimestamp(),
        generationOverride: {
          bypassMonthlyLimit: true,
          p5PageExperiment: EXPERIMENT_VALUE,
        },
      });
      console.log(`  ✓ Created user doc with p5PageExperiment: "${EXPERIMENT_VALUE}"`);
    } else {
      console.log(`  User doc not found — nothing to disable.`);
    }
    return;
  }

  const current = userDoc.data();
  const currentOverride = current?.generationOverride ?? {};
  console.log(`  Current generationOverride: ${JSON.stringify(currentOverride)}`);

  if (enable) {
    if (currentOverride.p5PageExperiment === EXPERIMENT_VALUE) {
      console.log(`  Already enabled (p5PageExperiment: "${EXPERIMENT_VALUE}"). No change needed.`);
      return;
    }
    if (isDryRun) {
      console.log(`  [DRY-RUN] Would set generationOverride.p5PageExperiment: "${EXPERIMENT_VALUE}"`);
      return;
    }
    await userRef.update({
      "generationOverride.p5PageExperiment": EXPERIMENT_VALUE,
      "generationOverride.bypassMonthlyLimit": true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ Set generationOverride.p5PageExperiment: "${EXPERIMENT_VALUE}"`);
  } else {
    // disable: delete the field
    if (!currentOverride.p5PageExperiment) {
      console.log(`  p5PageExperiment is already absent. No change needed.`);
      return;
    }
    if (isDryRun) {
      console.log(`  [DRY-RUN] Would delete generationOverride.p5PageExperiment`);
      return;
    }
    await userRef.update({
      "generationOverride.p5PageExperiment": FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ Deleted generationOverride.p5PageExperiment`);
  }

  console.log(`  Updated user: ${userId}`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
