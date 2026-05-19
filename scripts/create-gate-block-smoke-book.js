/**
 * T6-60 Gate-Block: Negative smoke for openai_image_candidate profile (unenrolled user).
 *
 * Verifies that a user WITHOUT generationOverride.allowCandidateProfile = true
 * has the candidate profile stripped by the T6-59 gate, and generates images via
 * the FLUX plan-default path instead of OpenAI.
 *
 * Success criterion (NEGATIVE test):
 *   - Cloud Logs: "Candidate image profile gated out" warning emitted
 *   - Book status: completed or partial_completed
 *   - Per-page imageModel: FLUX model (NOT "openai/gpt-image-1-mini")
 *   - Per-page imageModel: e.g. "black-forest-labs/flux-2-klein-9b" or similar
 *
 * The smoke user is a throwaway user created specifically for this negative test.
 * It is intentionally NOT enrolled (no allowCandidateProfile).
 *
 * Usage:
 *   node scripts/create-gate-block-smoke-book.js --dry-run
 *   node scripts/create-gate-block-smoke-book.js --write
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

ensureAdminApp();
const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");

  if (!isDryRun && !isWrite) {
    console.error("Usage: node scripts/create-gate-block-smoke-book.js --dry-run | --write");
    process.exit(1);
  }

  // Ephemeral user ID: different per run to avoid state carryover
  const ts = Date.now();
  const userId = `smoke-test-gate-block-${ts}`;
  const bookId = `smoke-gate-block-${ts}`;

  const bookData = {
    userId,
    status: "generating",
    theme: "adventure",
    templateId: "adventure",
    style: "crayon",
    selectedStyleId: "crayon",
    selectedStyleName: "クレヨンで描いた絵本",
    styleBible:
      "Crayon storybook style, warm hand-drawn strokes, waxy texture, playful childlike marks, colorful but gentle page design.",
    stylePreviewImageUrl: "/images/styles/crayon.png",
    stylePreviewUsedAsReference: false,
    pageCount: 8,
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    imageQualityTier: "light",
    imageModelProfile: "openai_image_candidate", // T6-60: will be BLOCKED by T6-59 gate
    characterConsistencyMode: "cover_only",
    input: {
      childName: "はな",
      childAge: 4,
      parentMessage: "たのしいぼうけんをしてね。",
    },
    progress: 0,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: ts,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: ts,
    smokeTestMetadata: {
      isSmokeTest: true,
      suite: "t6_gate_block",
      sourceScript: "scripts/create-gate-block-smoke-book.js",
      themeId: "adventure",
      styleId: "crayon",
      modelProfileOverride: "openai_image_candidate",
      gateExpected: "BLOCK", // T6-59: user NOT enrolled → gate should strip candidate profile
      createdAtIso: new Date(ts).toISOString(),
    },
  };

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] Gate-Block Negative Smoke`);
  console.log(`  bookId:            ${bookId}`);
  console.log(`  userId:            ${userId}`);
  console.log(`  theme:             ${bookData.theme}`);
  console.log(`  imageModelProfile: ${bookData.imageModelProfile} (will be GATED OUT)`);
  console.log(`  pageCount:         ${bookData.pageCount}`);
  console.log(`  gate:              BLOCK expected (user NOT enrolled)`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] No Firestore write. Payload validated.");
    return;
  }

  // Create the unenrolled smoke user doc
  // Intentionally omit allowCandidateProfile to trigger the gate
  const userRef = db.collection("users").doc(userId);
  await userRef.set({
    plan: "premium",
    createdAt: FieldValue.serverTimestamp(),
    generationOverride: {
      bypassMonthlyLimit: true,
      // NOTE: allowCandidateProfile intentionally absent — this user should be GATED
    },
    smokeTestMetadata: {
      isSmokeTest: true,
      suite: "t6_gate_block",
      createdAtIso: new Date(ts).toISOString(),
    },
  });
  console.log(`  Created unenrolled user: ${userId}`);

  await db.collection("books").doc(bookId).set(bookData);

  console.log(`\n  Book document created: books/${bookId}`);
  console.log(`\n  Monitor: node scripts/monitor-smoke-book.js ${bookId}`);
  console.log(`  Inspect: node scripts/inspect-smoke-book.js ${bookId}`);
  console.log(`\n  Expected behavior (NEGATIVE test):`);
  console.log(`    - Cloud Log: "Candidate image profile gated out — user not enrolled"`);
  console.log(`    - status: completed or partial_completed (book still generates)`);
  console.log(`    - imageModel per page: FLUX (NOT openai/gpt-image-1-mini)`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
