/**
 * P5-3c-photo-verify: Create smoke books for simplified_scene × 写真あり (with referenceImageUrl).
 *
 * Purpose: Verify that simplified_scene clears finalInputImageUrls=[] for photo users
 * and assess whether character likeness degrades without the reference.
 *
 * Prerequisites:
 *   1. Enable the experiment on the photo smoke user first:
 *      node scripts/set-p5-page-experiment.js --userId smoke-p53c-photo --enable --write
 *
 *   2. Set credentials:
 *      export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Usage:
 *   node scripts/create-p5-photo-verify-books.js --dry-run
 *   node scripts/create-p5-photo-verify-books.js --write
 *   node scripts/create-p5-photo-verify-books.js --write --cases=1,2
 *
 * Verification cases:
 *   Case 1: 写真あり / animals       / soft_watercolor   (photo user, simplified_scene)
 *   Case 2: 写真あり / bedtime        / classic_picture_book (photo user, simplified_scene)
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
const PHOTO_USER_ID = "smoke-p53c-photo";

// Public image used as a stand-in for a child reference photo in smoke tests.
// Real users would have a signed Storage URL here.
const SMOKE_REFERENCE_IMAGE_URL =
  "https://story-gen-8a769.web.app/images/templates/animals.png";

const STYLE_PROFILES = {
  soft_watercolor: {
    id: "soft_watercolor",
    name: "やさしい水彩",
    previewImageUrl: "/images/styles/soft_watercolor.png",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
  },
  classic_picture_book: {
    id: "classic_picture_book",
    name: "クラシック絵本",
    previewImageUrl: "/images/styles/classic_picture_book.png",
    styleBible:
      "Classic picture book illustration, traditional fairytale warmth, detailed linework, painterly textures, timeless storybook atmosphere.",
  },
};

// childProfileSnapshot embedded in the book doc to simulate a 写真あり user.
// visualProfile.referenceImageUrl triggers the character_reference input image path.
function buildChildProfileSnapshot(childName, childAge) {
  return {
    displayName: childName,
    nickname: childName,
    age: childAge,
    personality: { traits: ["やさしい", "げんき"] },
    visualProfile: {
      referenceImageUrl: SMOKE_REFERENCE_IMAGE_URL,
      basePrompt: `a ${childAge}-year-old Japanese child named ${childName} with short black hair and bright eyes`,
      characterBible: `${childName} is a ${childAge}-year-old Japanese child with short black hair, bright expressive eyes, and a warm smile. Always depicted in a friendly, child-safe storybook style.`,
      version: 1,
    },
  };
}

const VERIFY_CASES = [
  {
    caseNum: 1,
    label: "写真あり/animals/soft_watercolor",
    theme: "animals",
    style: "soft_watercolor",
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
    label: "写真あり/bedtime/classic_picture_book",
    theme: "bedtime",
    style: "classic_picture_book",
    pageCount: 8,
    input: {
      childName: "さくら",
      childAge: 4,
      parentMessage: "きょうもたくさんあそんだね。おやすみ、さくら。",
      colorMood: "soft warm quiet bedtime",
      favorites: "うさぎのぬいぐるみ",
    },
  },
];

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
  return `p53c-photo-verify-${iso}`;
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
    console.error(
      `[error] No matching cases. Valid: ${VERIFY_CASES.map((c) => c.caseNum).join(", ")}`
    );
    process.exit(1);
  }

  if (isWrite) {
    const sa = loadServiceAccountFromEnvPath();
    if (sa.projectId !== TARGET_PROJECT_ID) {
      throw new Error(
        `Service account project_id (${sa.projectId}) does not match target (${TARGET_PROJECT_ID}).`
      );
    }
    ensureAdminApp(sa);
  }

  const db = isWrite ? getFirestore() : null;
  const runId = buildRunId();
  const nowMs = Date.now();

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] P5-3c-photo-verify smoke books`);
  console.log(`  runId:       ${runId}`);
  console.log(`  cases:       ${activeCases.map((c) => c.caseNum).join(", ")}`);
  console.log(`  photoUser:   ${PHOTO_USER_ID} (p5PageExperiment must be set)`);
  console.log(
    `  refImage:    ${SMOKE_REFERENCE_IMAGE_URL.substring(0, 60)}... (smoke stand-in)`
  );
  console.log("");

  for (const c of activeCases) {
    const styleProfile = STYLE_PROFILES[c.style];
    if (!styleProfile) {
      console.error(`[error] Unknown style: ${c.style}`);
      process.exit(1);
    }

    const childProfileSnapshot = buildChildProfileSnapshot(c.input.childName, c.input.childAge);

    const payload = {
      userId: PHOTO_USER_ID,
      title: `[P5-3c-photo-verify] Case ${c.caseNum}: ${c.label}`,
      theme: c.theme,
      templateId: c.theme,
      creationMode: "guided_ai",
      productPlan: "standard_paid",
      priceTier: "take",
      imageModelProfile: "pro_consistent",
      characterConsistencyMode: "all_pages",
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
      // Simulate 写真あり: embed childProfileSnapshot with referenceImageUrl
      childProfileSnapshot,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: nowMs,
      expiresAt: null,
      smokeTestMetadata: {
        isSmokeTest: true,
        suite: "p5_3c_photo_verify",
        runId,
        sourceScript: "scripts/create-p5-photo-verify-books.js",
        caseNum: c.caseNum,
        caseLabel: c.label,
        themeId: c.theme,
        styleId: c.style,
        experiment: "simplified_scene_with_photo",
        hasReferenceImageUrl: true,
        createdAtIso: new Date(nowMs).toISOString(),
      },
    };

    if (isDryRun) {
      console.log(`  [Case ${c.caseNum}] ${c.label}`);
      console.log(`    theme:        ${c.theme}`);
      console.log(`    style:        ${c.style}`);
      console.log(`    userId:       ${PHOTO_USER_ID}`);
      console.log(`    pageCount:    ${c.pageCount}`);
      console.log(
        `    refImageUrl:  ${SMOKE_REFERENCE_IMAGE_URL.substring(0, 60)}...`
      );
      console.log(
        `    characterBible set: ${Boolean(childProfileSnapshot.visualProfile.characterBible)}`
      );
      console.log(
        `    experiment:   simplified_scene (clears finalInputImageUrls → [])`
      );
      console.log(`    input:        ${JSON.stringify(c.input)}`);
      console.log("");
      continue;
    }

    const docRef = db.collection("books").doc();
    await docRef.create(payload);

    console.log(`  [Case ${c.caseNum}] Created: bookId=${docRef.id}`);
    console.log(`    label:   ${c.label}`);
    console.log(`    Monitor: node scripts/monitor-smoke-book.js ${docRef.id}`);
    console.log(`    Inspect: node scripts/inspect-smoke-book.js ${docRef.id}`);
    console.log("");
  }

  if (isDryRun) {
    console.log("[dry-run] done. Run with --write to create books.");
    console.log("");
    console.log("Before writing, ensure:");
    console.log(
      `  node scripts/set-p5-page-experiment.js --userId ${PHOTO_USER_ID} --enable --write`
    );
  } else {
    console.log(`[done] runId=${runId}`);
    console.log("");
    console.log("Next steps:");
    console.log(
      "  1. Monitor: node scripts/monitor-smoke-book.js <bookId>"
    );
    console.log(
      "  2. Inspect:  node scripts/inspect-smoke-book.js <bookId>"
    );
    console.log(
      "  3. Check logs: node scripts/print-p5-3c-verify-log-queries.mjs"
    );
    console.log(
      "  4. Focus on p5_page_experiment_active: inputImageUrlsClearedCount should be > 0"
    );
    console.log(
      "  5. Visual check: カバーとページで同一人物・同一トーンに見えるか？"
    );
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
