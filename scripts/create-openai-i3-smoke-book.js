/**
 * T6-50: I3 Smoke — OpenAI Responses API + Real Child Photo Reference.
 *
 * PURPOSE: Confirm that reference-image contamination (observed with animals.png in T6-49)
 * does NOT occur when the reference is a real child photo (production-equivalent conditions).
 *
 * CRITICAL: Do NOT use animals.png or any template image as the reference.
 * The reference image MUST be a real child photo (or consented test-person photo).
 *
 * Prerequisites (Human operator must complete BEFORE running this script):
 *   - Reference image is a real child photo or consented test-person image
 *   - Clear face visible, single child, good lighting
 *   - No readable text, logos, or character merchandise in frame
 *   - Consent for testing use obtained
 *   - Image is hosted at a publicly-accessible URL (e.g. Firebase Storage signed URL
 *     or Cloud Storage public URL) — do NOT commit the image or raw token to the repo
 *
 * Usage:
 *   node scripts/create-openai-i3-smoke-book.js --reference-url <URL> --dry-run
 *   node scripts/create-openai-i3-smoke-book.js --reference-url <URL> --write
 *
 * Example:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\secrets\service-account.json"
 *   node scripts/create-openai-i3-smoke-book.js --reference-url "https://storage.googleapis.com/story-gen-8a769.appspot.com/smoke-refs/child-ref-XXXX.jpg" --dry-run
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// animals.png is PROHIBITED for I3 smoke. The script enforces this below.
const PROHIBITED_REFERENCE_PATTERNS = [
  "animals.png",
  "templates/",
  "/images/styles/",
];

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

function parseArgs(args) {
  const result = { referenceUrl: null, isDryRun: false, isWrite: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--reference-url" && args[i + 1]) {
      result.referenceUrl = args[i + 1];
      i++;
    } else if (args[i] === "--dry-run") {
      result.isDryRun = true;
    } else if (args[i] === "--write") {
      result.isWrite = true;
    }
  }
  return result;
}

function validateReferenceUrl(url) {
  if (!url) {
    throw new Error(
      "Missing required argument: --reference-url <URL>\n" +
      "Provide a real child photo URL (Firebase Storage or other public URL).\n" +
      "Do NOT use animals.png or any template image."
    );
  }

  for (const pattern of PROHIBITED_REFERENCE_PATTERNS) {
    if (url.includes(pattern)) {
      throw new Error(
        `[I3 GUARD] Prohibited reference image detected: URL contains "${pattern}".\n` +
        "I3 smoke requires a real child photo, not a template or style image.\n" +
        "animals.png is prohibited per T6-50 policy."
      );
    }
  }

  if (!url.startsWith("https://")) {
    throw new Error(
      "[I3 GUARD] Reference URL must be https://. Provide a publicly-accessible https URL."
    );
  }

  console.log(`  [I3 GUARD] reference URL: OK (not a prohibited template)`);
  console.log(`  [I3 GUARD] Note: Operator confirms this is a real child/test-person photo`);
  console.log(`             with consent for testing. URL not committed to repo.`);
}

ensureAdminApp();
const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  const { referenceUrl, isDryRun, isWrite } = parseArgs(args);

  if (!isDryRun && !isWrite) {
    console.error(
      "Usage: node scripts/create-openai-i3-smoke-book.js --reference-url <URL> --dry-run | --write"
    );
    process.exit(1);
  }

  // Validate reference URL (guard against animals.png and template images)
  validateReferenceUrl(referenceUrl);

  const userId = "smoke-test-openai-i3";
  const bookId = `smoke-openai-i3-${Date.now()}`;

  const bookData = {
    userId,
    status: "generating",
    theme: "imagination",
    templateId: "imagination",
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
    imageModelProfile: "openai_image_candidate",
    characterConsistencyMode: "all_pages",
    input: {
      childName: "ひなた",
      childAge: 4,
      parentMessage: "お外でたくさん遊んで、お花と仲良しになれるかな。",
    },
    childProfileSnapshot: {
      displayName: "ひなた",
      nickname: "ひなちゃん",
      personality: {
        favoriteThings: ["お花", "ちょうちょ", "おさんぽ"],
      },
      visualProfile: {
        referenceImageUrl: referenceUrl,
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
      suite: "openai_i3",
      sourceScript: "scripts/create-openai-i3-smoke-book.js",
      themeId: "imagination",
      styleId: "crayon",
      styleBibleVersion: "v2_texture_hardened",
      modelProfileOverride: "openai_image_candidate",
      referenceImageUsed: true,
      referenceImageType: "real_child_photo",
      characterConsistencyMode: "all_pages",
      createdAtIso: new Date().toISOString(),
      // NOTE: referenceImageUrl is intentionally NOT stored in smokeTestMetadata
      // to avoid committing private URLs to the repo. It is stored only in
      // childProfileSnapshot.visualProfile.referenceImageUrl (Firestore-only, not in git).
    },
  };

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] I3 Smoke: OpenAI Responses API + Real Child Photo Reference`);
  console.log(`  bookId: ${bookId}`);
  console.log(`  theme: ${bookData.theme}`);
  console.log(`  style: ${bookData.style}`);
  console.log(`  imageModelProfile: ${bookData.imageModelProfile}`);
  console.log(`  characterConsistencyMode: ${bookData.characterConsistencyMode}`);
  console.log(`  referenceImageType: real_child_photo`);
  console.log(`  pageCount: ${bookData.pageCount}`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] No Firestore write. Payload validated.");
    console.log(`  childProfileSnapshot: present`);
    console.log(`  visualProfile.referenceImageUrl: set (not shown; private)`);
    console.log(`  visualProfile.characterBible: present`);
    console.log(`\n[I3 SUCCESS CRITERIA]`);
    console.log(`  Hard pass: 8/8 completed, Hinata (child protagonist) visible on all pages`);
    console.log(`  Pass: <= 1/8 pages with reference contamination (animal/object echo)`);
    console.log(`  Fail: >= 2/8 pages with reference contamination`);
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
  console.log(`\n  Monitor:`);
  console.log(`    node scripts/monitor-smoke-book.js ${bookId}`);
  console.log(`    node scripts/inspect-smoke-book.js ${bookId}`);
  console.log(`\n  I3 success criteria:`);
  console.log(`    Hard pass: 8/8 completed, child protagonist visible all pages (no contamination)`);
  console.log(`    Pass: <= 1/8 reference contamination`);
  console.log(`    Fail: >= 2/8 reference contamination`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
