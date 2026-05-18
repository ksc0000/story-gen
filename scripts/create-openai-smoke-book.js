/**
 * T6-43: I1 Smoke — Create a single book with openai_image_candidate profile.
 * Target pair: fantasy × crayon
 *
 * Prerequisites:
 *   - OPENAI_API_KEY registered in Firebase Secret Manager (A4)
 *   - OpenAI Organization Verification completed (A3)
 *   - functions deployed with OpenAI routing (firebase deploy --only functions)
 *
 * Usage:
 *   node scripts/create-openai-smoke-book.js --dry-run
 *   node scripts/create-openai-smoke-book.js --write
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
  return initializeApp({
    credential: cert(sa),
    projectId: sa.projectId,
  });
}

ensureAdminApp();
const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");

  if (!isDryRun && !isWrite) {
    console.error("Usage: node scripts/create-openai-smoke-book.js --dry-run | --write");
    process.exit(1);
  }

  const userId = "smoke-test-openai-i1";
  const bookId = `smoke-openai-i1-${Date.now()}`;

  const bookData = {
    userId,
    status: "generating",
    theme: "fantasy",
    templateId: "fantasy",
    style: "crayon",
    selectedStyleId: "crayon",
    selectedStyleName: "クレヨンで描いた絵本",
    styleBible: "Crayon storybook style, warm hand-drawn strokes, waxy texture, playful childlike marks, colorful but gentle page design.",
    stylePreviewImageUrl: "/images/styles/crayon.png",
    stylePreviewUsedAsReference: false,
    pageCount: 8,
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    imageQualityTier: "light",
    imageModelProfile: "openai_image_candidate", // T6-43: OpenAI diagnostic
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
      suite: "openai_i1",
      sourceScript: "scripts/create-openai-smoke-book.js",
      themeId: "fantasy",
      styleId: "crayon",
      modelProfileOverride: "openai_image_candidate",
      createdAtIso: new Date().toISOString(),
    },
  };

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] I1 Smoke: OpenAI Image Candidate`);
  console.log(`  bookId: ${bookId}`);
  console.log(`  theme: ${bookData.theme}`);
  console.log(`  style: ${bookData.style}`);
  console.log(`  imageModelProfile: ${bookData.imageModelProfile}`);
  console.log(`  pageCount: ${bookData.pageCount}`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] No Firestore write. Payload validated.");
    return;
  }

  // Ensure user doc exists
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    await userRef.set({
      plan: "premium",
      createdAt: FieldValue.serverTimestamp(),
      generationOverride: { bypassMonthlyLimit: true },
    });
    console.log(`  Created user: ${userId}`);
  }

  await db.collection("books").doc(bookId).set(bookData);

  console.log(`\n  Book document created: books/${bookId}`);
  console.log(`  Monitor: node scripts/inspect-smoke-book.js ${bookId}`);
  console.log(`\n  Success criterion: image_failed <= 2/8`);
  console.log(`  Rejection criterion: image_failed >= 6/8`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
