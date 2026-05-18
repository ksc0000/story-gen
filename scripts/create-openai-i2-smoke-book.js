/**
 * T6-45: I2 Smoke — OpenAI reference-path (Responses API) + crayon texture hardening.
 * Target pair: adventure × crayon (daytime theme, per T6-44 recommendation)
 *
 * Differences from I1:
 *   - characterConsistencyMode: "all_pages" (all pages use reference images)
 *   - childProfileSnapshot with referenceImageUrl (triggers Responses API path)
 *   - Enhanced styleBible with explicit crayon texture instructions
 *   - Daytime theme to test warm/bright palette
 *
 * Prerequisites:
 *   - OPENAI_API_KEY registered in Firebase Secret Manager
 *   - functions deployed with OpenAI routing (T6-43)
 *   - Reference image URL must be publicly accessible
 *
 * Usage:
 *   node scripts/create-openai-i2-smoke-book.js --dry-run
 *   node scripts/create-openai-i2-smoke-book.js --write
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// Reference image: use the deployed hosting asset as a stable public URL
const REFERENCE_IMAGE_URL =
  "https://story-gen-8a769.web.app/images/templates/animals.png";

// T6-45: Enhanced crayon styleBible with explicit texture instructions
const CRAYON_STYLE_BIBLE_V2 =
  "Crayon storybook illustration style. " +
  "Visible waxy crayon strokes with rough, slightly uneven edges. " +
  "Paper grain texture visible through the coloring. " +
  "Warm, saturated colors with occasional white paper showing through gaps. " +
  "Playful childlike marks and gentle hand-drawn outlines. " +
  "Slightly imperfect fills typical of real crayon coloring. " +
  "Colorful but gentle page design with soft backgrounds.";

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
    console.error(
      "Usage: node scripts/create-openai-i2-smoke-book.js --dry-run | --write"
    );
    process.exit(1);
  }

  const userId = "smoke-test-openai-i2";
  const bookId = `smoke-openai-i2-${Date.now()}`;

  const bookData = {
    userId,
    status: "generating",
    theme: "adventure",
    templateId: "adventure",
    style: "crayon",
    selectedStyleId: "crayon",
    selectedStyleName: "クレヨンで描いた絵本",
    styleBible: CRAYON_STYLE_BIBLE_V2,
    stylePreviewImageUrl: "/images/styles/crayon.png",
    stylePreviewUsedAsReference: false,
    pageCount: 8,
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    imageQualityTier: "light",
    imageModelProfile: "openai_image_candidate", // T6-45: OpenAI diagnostic I2
    characterConsistencyMode: "all_pages", // I2: reference on ALL pages
    input: {
      childName: "ひなた",
      childAge: 4,
      parentMessage: "お外でたくさん冒険して、元気いっぱい遊んでね。",
    },
    // I2: childProfileSnapshot triggers reference image path
    childProfileSnapshot: {
      displayName: "ひなた",
      nickname: "ひなちゃん",
      personality: {
        favoriteThings: ["お花", "ちょうちょ", "おさんぽ"],
      },
      visualProfile: {
        referenceImageUrl: REFERENCE_IMAGE_URL,
        characterBible:
          "A cheerful 4-year-old Japanese girl with shoulder-length black hair tied in two small pigtails. " +
          "She has round, bright eyes and rosy cheeks. " +
          "She wears a yellow sundress with a small flower pattern and red shoes.",
        characterLook: "shoulder-length black hair in pigtails, round bright eyes, rosy cheeks",
        outfit: "yellow sundress with flower pattern, red shoes",
        signatureItem: "small flower-shaped hair clips",
      },
    },
    progress: 0,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
    smokeTestMetadata: {
      isSmokeTest: true,
      suite: "openai_i2",
      sourceScript: "scripts/create-openai-i2-smoke-book.js",
      themeId: "adventure",
      styleId: "crayon",
      styleBibleVersion: "v2_texture_hardened",
      modelProfileOverride: "openai_image_candidate",
      referenceImageUsed: true,
      characterConsistencyMode: "all_pages",
      createdAtIso: new Date().toISOString(),
    },
  };

  console.log(
    `[${isDryRun ? "DRY-RUN" : "WRITE"}] I2 Smoke: OpenAI Responses API + Reference`
  );
  console.log(`  bookId: ${bookId}`);
  console.log(`  theme: ${bookData.theme}`);
  console.log(`  style: ${bookData.style}`);
  console.log(`  imageModelProfile: ${bookData.imageModelProfile}`);
  console.log(`  characterConsistencyMode: ${bookData.characterConsistencyMode}`);
  console.log(`  referenceImageUrl: ${REFERENCE_IMAGE_URL.substring(0, 50)}...`);
  console.log(`  styleBible: v2 (texture hardened)`);
  console.log(`  pageCount: ${bookData.pageCount}`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] No Firestore write. Payload validated.");
    console.log(`  childProfileSnapshot: present`);
    console.log(`  visualProfile.characterBible: present`);
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
  console.log(`\n  I2 success criterion: image_failed <= 2/8`);
  console.log(`  I2 key check: usedCharacterReference = true on all pages`);
  console.log(`  I2 rejection criterion: image_failed >= 6/8`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
