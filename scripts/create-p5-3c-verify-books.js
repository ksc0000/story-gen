/**
 * P5-3c-verify: Create the 5 smoke books for the simplified_scene experiment.
 *
 * Prerequisites:
 *   1. Enable the experiment on the QA user first:
 *      node scripts/set-p5-page-experiment.js --userId smoke-p53c-verify --enable --write
 *
 *   2. Set credentials:
 *      $env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\secrets\service-account.json"
 *
 * Usage:
 *   # Preview (no Firestore writes):
 *   node scripts/create-p5-3c-verify-books.js --dry-run
 *
 *   # Create all 5 books:
 *   node scripts/create-p5-3c-verify-books.js --write
 *
 *   # Create only specific cases (1-indexed, comma-separated):
 *   node scripts/create-p5-3c-verify-books.js --write --cases=1,2,3
 *
 * Verification cases:
 *   Case 1: 竹 / animals         / soft_watercolor       (experiment user)
 *   Case 2: 竹 / adventure       / colorful_pop          (experiment user)
 *   Case 3: 竹 / fantasy         / anime_storybook       (experiment user)
 *   Case 4: 竹 / bedtime         / classic_picture_book  (experiment user)
 *   Case 5: 梅 / fixed-first-zoo / soft_watercolor       (regression, NO experiment)
 *
 * Do not:
 *   - Do not commit service account JSON.
 *   - Do not commit generated images or signed URLs.
 *   - Do not commit raw Cloud Logging exports.
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// ---------------------------------------------------------------------------
// Style profiles (subset needed for P5-3c-verify)
// ---------------------------------------------------------------------------
const STYLE_PROFILES = {
  soft_watercolor: {
    id: "soft_watercolor",
    name: "やさしい水彩",
    previewImageUrl: "/images/styles/soft_watercolor.png",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
  },
  colorful_pop: {
    id: "colorful_pop",
    name: "カラフルポップ",
    previewImageUrl: "/images/styles/colorful_pop.webp",
    styleBible:
      "Colorful pop picture book style, vivid joyful colors, friendly rounded forms, playful graphic energy, clear child-safe staging.",
  },
  anime_storybook: {
    id: "anime_storybook",
    name: "わくわくアニメ風",
    previewImageUrl: "/images/styles/anime_storybook.png",
    styleBible:
      "Anime-inspired picture book style, expressive faces, sparkling eyes, lively framing, vivid but soft family-safe colors, warm fantasy energy.",
  },
  classic_picture_book: {
    id: "classic_picture_book",
    name: "クラシック絵本",
    previewImageUrl: "/images/styles/classic_picture_book.png",
    styleBible:
      "Classic picture book illustration, traditional fairytale warmth, detailed linework, painterly textures, timeless storybook atmosphere.",
  },
};

// ---------------------------------------------------------------------------
// Verification cases
// ---------------------------------------------------------------------------
// Case 5 uses the regression userId (no experiment flag) intentionally.
const EXPERIMENT_USER_ID = "smoke-p53c-verify";
const REGRESSION_USER_ID = "smoke-p53c-regression";

const VERIFY_CASES = [
  {
    caseNum: 1,
    label: "竹/animals/soft_watercolor",
    plan: "竹",
    userId: EXPERIMENT_USER_ID,
    theme: "animals",
    style: "soft_watercolor",
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    priceTier: "take",
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    pageCount: 8,
    input: {
      childName: "ひかり",
      childAge: 4,
      parentMessage: "どうぶつのおともだちと、たのしいぼうけんをしてね。",
      colorMood: "soft warm nature",
    },
  },
  {
    caseNum: 2,
    label: "竹/adventure/colorful_pop",
    plan: "竹",
    userId: EXPERIMENT_USER_ID,
    theme: "adventure",
    style: "colorful_pop",
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    priceTier: "take",
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    pageCount: 8,
    input: {
      childName: "そうた",
      childAge: 5,
      parentMessage: "げんきにぼうけんして、かならずかえってきてね。",
      colorMood: "vivid adventure",
      favorites: "たんけんぼうしとちず",
    },
  },
  {
    caseNum: 3,
    label: "竹/fantasy/anime_storybook",
    plan: "竹",
    userId: EXPERIMENT_USER_ID,
    theme: "fantasy",
    style: "anime_storybook",
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    priceTier: "take",
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    pageCount: 8,
    input: {
      childName: "あかり",
      childAge: 5,
      parentMessage: "まほうのせかいで、すてきなであいがありますように。",
      colorMood: "magical sparkle",
      favorites: "ほうきぼしとまほうのつえ",
      place: "くものうえのおしろ",
    },
  },
  {
    caseNum: 4,
    label: "竹/bedtime/classic_picture_book",
    plan: "竹",
    userId: EXPERIMENT_USER_ID,
    theme: "bedtime",
    style: "classic_picture_book",
    creationMode: "guided_ai",
    productPlan: "standard_paid",
    priceTier: "take",
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    pageCount: 8,
    input: {
      childName: "さくら",
      childAge: 4,
      parentMessage: "きょうもたくさんあそんだね。おやすみ、さくら。",
      colorMood: "soft warm quiet bedtime",
      favorites: "うさぎのぬいぐるみ",
    },
  },
  {
    caseNum: 5,
    label: "梅/fixed-first-zoo/regression",
    plan: "梅",
    userId: REGRESSION_USER_ID, // NO experiment flag — regression check only
    theme: "fixed-first-zoo",
    style: "soft_watercolor",
    creationMode: "fixed_template",
    productPlan: "free",
    priceTier: "ume",
    imageModelProfile: "pro_consistent",
    characterConsistencyMode: "all_pages",
    pageCount: 4,
    input: {
      childName: "ゆうき",
      childAge: 3,
      place: "市立どうぶつえん",
      familyMembers: "おかあさんとおとうさん",
      parentMessage: "はじめてのどうぶつえん、たのしかったね。",
    },
  },
];

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
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

function buildRunId() {
  const iso = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `p53c-verify-${iso}`;
}

function parseArgs(args) {
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  const casesArg = args.find((a) => a.startsWith("--cases="));
  const cases = casesArg
    ? casesArg.replace("--cases=", "").split(",").map(Number).filter(Boolean)
    : null;
  return { isDryRun, isWrite, cases };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const { isDryRun, isWrite, cases: caseFilter } = parseArgs(args);

  if (!isDryRun && !isWrite) {
    console.error("[error] Specify --dry-run to preview or --write to create books.");
    process.exit(1);
  }

  const activeCases = caseFilter
    ? VERIFY_CASES.filter((c) => caseFilter.includes(c.caseNum))
    : VERIFY_CASES;

  if (activeCases.length === 0) {
    console.error(`[error] No matching cases. Valid case numbers: ${VERIFY_CASES.map((c) => c.caseNum).join(", ")}`);
    process.exit(1);
  }

  if (!isDryRun) {
    const sa = loadServiceAccountFromEnvPath();
    if (sa.projectId !== TARGET_PROJECT_ID) {
      throw new Error(`Service account project_id (${sa.projectId}) does not match target (${TARGET_PROJECT_ID}).`);
    }
    ensureAdminApp(sa);
  }

  const db = isWrite ? getFirestore() : null;
  const runId = buildRunId();
  const nowMs = Date.now();

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] P5-3c-verify smoke books`);
  console.log(`  runId:        ${runId}`);
  console.log(`  cases:        ${activeCases.map((c) => c.caseNum).join(", ")}`);
  console.log(`  experimentUser: ${EXPERIMENT_USER_ID} (cases 1-4, p5PageExperiment must be set)`);
  console.log(`  regressionUser: ${REGRESSION_USER_ID} (case 5, no experiment flag)`);
  console.log("");

  for (const c of activeCases) {
    const styleProfile = STYLE_PROFILES[c.style];
    if (!styleProfile) {
      console.error(`[error] Unknown style: ${c.style}`);
      process.exit(1);
    }

    const payload = {
      userId: c.userId,
      title: `[P5-3c-verify] Case ${c.caseNum}: ${c.label}`,
      theme: c.theme,
      templateId: c.theme,
      creationMode: c.creationMode,
      productPlan: c.productPlan,
      priceTier: c.priceTier,
      imageModelProfile: c.imageModelProfile,
      characterConsistencyMode: c.characterConsistencyMode,
      style: styleProfile.id,
      selectedStyleId: styleProfile.id,
      selectedStyleName: styleProfile.name,
      styleBible: styleProfile.styleBible,
      stylePreviewImageUrl: styleProfile.previewImageUrl,
      stylePreviewUsedAsReference: false,
      pageCount: c.pageCount,
      status: "generating",
      progress: 0,
      input: c.input,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: nowMs,
      expiresAt: null,
      smokeTestMetadata: {
        isSmokeTest: true,
        suite: "p5_3c_verify",
        runId,
        sourceScript: "scripts/create-p5-3c-verify-books.js",
        caseNum: c.caseNum,
        caseLabel: c.label,
        plan: c.plan,
        themeId: c.theme,
        styleId: c.style,
        creationMode: c.creationMode,
        experiment: c.caseNum <= 4 ? "simplified_scene" : "regression_no_experiment",
        createdAtIso: new Date(nowMs).toISOString(),
      },
    };

    if (isDryRun) {
      console.log(`  [Case ${c.caseNum}] ${c.label}`);
      console.log(`    plan:        ${c.plan} (${c.productPlan})`);
      console.log(`    theme:       ${c.theme}`);
      console.log(`    style:       ${c.style}`);
      console.log(`    creationMode: ${c.creationMode}`);
      console.log(`    userId:      ${c.userId}`);
      console.log(`    pageCount:   ${c.pageCount}`);
      console.log(`    experiment:  ${c.caseNum <= 4 ? "simplified_scene (user must have flag set)" : "none (regression)"}`);
      console.log(`    input:       ${JSON.stringify(c.input)}`);
      console.log("");
      continue;
    }

    const docRef = db.collection("books").doc();
    await docRef.create(payload);

    console.log(`  [Case ${c.caseNum}] Created: bookId=${docRef.id}`);
    console.log(`    label:   ${c.label}`);
    console.log(`    userId:  ${c.userId}`);
    console.log(`    Monitor: node scripts/monitor-smoke-book.js ${docRef.id}`);
    console.log(`    Inspect: node scripts/inspect-smoke-book.js ${docRef.id}`);
    console.log("");
  }

  if (isDryRun) {
    console.log("[dry-run] done. Run with --write to create books.");
  } else {
    console.log(`[done] runId=${runId}`);
    console.log("");
    console.log("Next steps:");
    console.log("  1. Wait for all books to reach status=completed (monitor with monitor-smoke-book.js)");
    console.log("  2. Inspect each book: node scripts/inspect-smoke-book.js <bookId>");
    console.log("  3. Check Cloud Logging with:");
    console.log("     node scripts/print-p5-3c-verify-log-queries.mjs --project story-gen-8a769");
    console.log("  4. Visually inspect pages via the Reader UI");
    console.log("  5. Fill in the P5-3c-verify report format");
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
