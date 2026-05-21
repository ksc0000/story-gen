/**
 * P4-12c: Response Schema Re-smoke — Create 5 smoke books.
 *
 * Same matrix as P4-12 smoke:
 *   1. bedtime / soft_watercolor / profile=a
 *   2. fantasy / crayon / profile=a
 *   3. emotional-growth / soft_watercolor / profile=a
 *   4. imagination / anime_storybook / profile=a
 *   5. bedtime / crayon / profile=b
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS set
 *   - ENABLE_RESPONSE_SCHEMA=true deployed to Functions
 *
 * Usage:
 *   node scripts/create-response-schema-smoke-books.js --dry-run
 *   node scripts/create-response-schema-smoke-books.js --write
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

const SMOKE_MATRIX = [
  {
    label: "1: bedtime / soft_watercolor / profile=a",
    theme: "bedtime",
    templateId: "bedtime",
    style: "soft_watercolor",
    selectedStyleId: "soft_watercolor",
    selectedStyleName: "やさしい水彩画",
    styleBible: "Soft watercolor illustration, gentle pastel palette, warm light, dreamy atmosphere, children's picture book style.",
    childName: "ゆうき",
    childAge: 4,
    parentMessage: "おやすみの前に、やさしいお話をどうぞ。",
  },
  {
    label: "2: fantasy / crayon / profile=a",
    theme: "fantasy",
    templateId: "fantasy",
    style: "crayon",
    selectedStyleId: "crayon",
    selectedStyleName: "クレヨンで描いた絵本",
    styleBible: "Crayon storybook style, warm hand-drawn strokes, waxy texture, playful childlike marks, colorful but gentle page design.",
    childName: "ゆうき",
    childAge: 5,
    parentMessage: "まほうのせかいで、やさしいぼうけんをたのしんでね。",
  },
  {
    label: "3: emotional-growth / soft_watercolor / profile=a",
    theme: "emotional-growth",
    templateId: "emotional-growth",
    style: "soft_watercolor",
    selectedStyleId: "soft_watercolor",
    selectedStyleName: "やさしい水彩画",
    styleBible: "Soft watercolor illustration, gentle pastel palette, warm light, dreamy atmosphere, children's picture book style.",
    childName: "ゆうき",
    childAge: 4,
    parentMessage: "おともだちとなかよくなれるといいね。",
  },
  {
    label: "4: imagination / anime_storybook / profile=a",
    theme: "imagination",
    templateId: "imagination",
    style: "anime_storybook",
    selectedStyleId: "anime_storybook",
    selectedStyleName: "アニメ絵本風",
    styleBible: "Anime storybook illustration, vibrant colors, clean lineart, expressive characters, Studio Ghibli-inspired, children's picture book layout.",
    childName: "ゆうき",
    childAge: 5,
    parentMessage: "そうぞうのちからで、すてきなせかいをつくろう。",
  },
  {
    label: "5: bedtime / crayon / profile=b",
    theme: "bedtime",
    templateId: "bedtime",
    style: "crayon",
    selectedStyleId: "crayon",
    selectedStyleName: "クレヨンで描いた絵本",
    styleBible: "Crayon storybook style, warm hand-drawn strokes, waxy texture, playful childlike marks, colorful but gentle page design.",
    childName: "はるか",
    childAge: 3,
    parentMessage: "ぐっすりおやすみ。あしたもたのしいことがまっているよ。",
  },
];

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");

  if (!isDryRun && !isWrite) {
    console.error("Usage: node scripts/create-response-schema-smoke-books.js --dry-run | --write");
    process.exit(1);
  }

  ensureAdminApp();
  const db = getFirestore();

  const userId = "smoke-test-response-schema";
  const ts = Date.now();
  const bookIds = [];

  console.log(`[P4-12c] Response Schema Re-smoke: ${isDryRun ? "DRY-RUN" : "WRITE"}`);
  console.log(`  userId: ${userId}`);
  console.log(`  timestamp: ${ts}\n`);

  for (let i = 0; i < SMOKE_MATRIX.length; i++) {
    const m = SMOKE_MATRIX[i];
    const bookId = `smoke-rschema-12c-${i + 1}-${ts}`;
    bookIds.push(bookId);

    const bookData = {
      userId,
      status: "generating",
      theme: m.theme,
      templateId: m.templateId,
      style: m.style,
      selectedStyleId: m.selectedStyleId,
      selectedStyleName: m.selectedStyleName,
      styleBible: m.styleBible,
      stylePreviewImageUrl: `/images/styles/${m.style}.png`,
      stylePreviewUsedAsReference: false,
      pageCount: 8,
      creationMode: "guided_ai",
      productPlan: "free",
      imageQualityTier: "light",
      characterConsistencyMode: "cover_only",
      input: {
        childName: m.childName,
        childAge: m.childAge,
        parentMessage: m.parentMessage,
      },
      progress: 0,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: Date.now(),
      smokeTestMetadata: {
        isSmokeTest: true,
        suite: "p4_12c_response_schema_resmoke",
        sourceScript: "scripts/create-response-schema-smoke-books.js",
        themeId: m.theme,
        styleId: m.style,
        matrix: m.label,
        createdAtIso: new Date().toISOString(),
      },
    };

    console.log(`  [${m.label}]`);
    console.log(`    bookId: ${bookId}`);

    if (isWrite) {
      await db.collection("books").doc(bookId).set(bookData);
      console.log(`    ✓ Created`);
    } else {
      console.log(`    (dry-run — not written)`);
    }
  }

  if (!isDryRun) {
    // Ensure user doc exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        plan: "free",
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`\n  Created user: ${userId}`);
    }
  }

  console.log(`\n[Monitor commands]`);
  for (const id of bookIds) {
    console.log(`  node scripts/inspect-smoke-book.js ${id}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
