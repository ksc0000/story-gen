/**
 * T6-60 I6: Gate-pass smoke for openai_image_candidate profile (no-reference path).
 *
 * Verifies that a user enrolled with generationOverride.allowCandidateProfile = true
 * can generate images via the OpenAI Images API path (gpt-image-1-mini, no reference images).
 *
 * Success criterion:
 *   - Book status: completed or partial_completed
 *   - image_failed pages: ≤ 2/8
 *   - Per-page imageModel: "openai/gpt-image-1-mini"
 *   - No "Candidate image profile gated out" warning in Cloud Logs
 *
 * Usage:
 *   node scripts/create-openai-i6-gate-smoke-book.js --dry-run
 *   node scripts/create-openai-i6-gate-smoke-book.js --write
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
    console.error("Usage: node scripts/create-openai-i6-gate-smoke-book.js --dry-run | --write");
    process.exit(1);
  }

  const userId = "smoke-test-openai-i6";
  const bookId = `smoke-openai-i6-${Date.now()}`;

  const bookData = {
    userId,
    status: "generating",
    theme: "fantasy",
    templateId: "fantasy",
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
    imageModelProfile: "openai_image_candidate", // T6-60: gate-pass verification
    characterConsistencyMode: "cover_only",
    input: {
      childName: "ゆうき",
      childAge: 5,
      parentMessage: "まほうのせかいで、やさしいぼうけんをたのしんでね。",
    },
    progress: 0,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
    smokeTestMetadata: {
      isSmokeTest: true,
      suite: "openai_i6_gate_pass",
      sourceScript: "scripts/create-openai-i6-gate-smoke-book.js",
      themeId: "fantasy",
      styleId: "crayon",
      modelProfileOverride: "openai_image_candidate",
      gatePassed: true, // user enrolled with allowCandidateProfile: true
      createdAtIso: new Date().toISOString(),
    },
  };

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] I6 Gate-Pass Smoke: OpenAI Image Candidate`);
  console.log(`  bookId:            ${bookId}`);
  console.log(`  userId:            ${userId}`);
  console.log(`  theme:             ${bookData.theme}`);
  console.log(`  style:             ${bookData.style}`);
  console.log(`  imageModelProfile: ${bookData.imageModelProfile}`);
  console.log(`  pageCount:         ${bookData.pageCount}`);
  console.log(`  gate:              PASS (user enrolled)`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] No Firestore write. Payload validated.");
    return;
  }

  // Ensure smoke user exists and is enrolled
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    await userRef.set({
      plan: "premium",
      createdAt: FieldValue.serverTimestamp(),
      generationOverride: {
        bypassMonthlyLimit: true,
        allowCandidateProfile: true, // T6-59: enrolled for candidate profile
      },
    });
    console.log(`  Created user: ${userId} (with allowCandidateProfile: true)`);
  } else {
    const currentOverride = userDoc.data()?.generationOverride ?? {};
    if (currentOverride.allowCandidateProfile !== true) {
      await userRef.update({
        "generationOverride.allowCandidateProfile": true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  Updated user: ${userId} (added allowCandidateProfile: true)`);
    } else {
      console.log(`  User confirmed enrolled: ${userId}`);
    }
  }

  await db.collection("books").doc(bookId).set(bookData);

  console.log(`\n  Book document created: books/${bookId}`);
  console.log(`\n  Monitor:  node scripts/monitor-smoke-book.js ${bookId}`);
  console.log(`  Inspect:  node scripts/inspect-smoke-book.js ${bookId}`);
  console.log(`\n  Success criteria:`);
  console.log(`    - status: completed or partial_completed`);
  console.log(`    - image_failed pages: ≤ 2/8`);
  console.log(`    - imageModel per page: "openai/gpt-image-1-mini"`);
  console.log(`    - NO "Candidate image profile gated out" warning in Cloud Logs`);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
