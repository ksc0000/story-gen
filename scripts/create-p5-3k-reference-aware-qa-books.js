/**
 * P5-3k Post-Deploy QA: Create reference-aware guided_ai 8-page books.
 *
 * Purpose:
 *   Validate P5-3k Option C (drop reference images on pro_consistent retry) with
 *   production-like guided_ai books, all_pages consistency mode, and a synthetic
 *   child portrait as reference.
 *
 * Generates 8 books:
 *   Cases 1–4: style=soft_watercolor  / theme=animals / all_pages
 *   Cases 5–8: style=classic_picture_book / theme=animals / all_pages
 *
 * Character constraint: child + 1 animal + 1 item (no multi-animal, no magic stars, no dinosaurs)
 *
 * Reference image: synthetic child portrait at /smoke/reference-child-portrait.png
 *   (NOT animals.png — a non-photorealistic flat illustration, no real person)
 *
 * Prerequisites:
 *   1. Run setup-p5-3k-qa-user.js to confirm/set bypassMonthlyLimit on the QA user.
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   3. export QA_USER_ID=<uid from setup script>   OR pass --userId=<uid>
 *
 * Usage:
 *   node scripts/create-p5-3k-reference-aware-qa-books.js --userId=<uid> --dry-run
 *   node scripts/create-p5-3k-reference-aware-qa-books.js --userId=<uid> --write
 *   node scripts/create-p5-3k-reference-aware-qa-books.js --userId=<uid> --write --cases=1,3,5
 *
 * Safety:
 *   - Does not commit service account JSON or reference image URLs in CI logs.
 *   - Books carry smokeTestMetadata.isSmokeTest=true for admin filtering.
 *   - All books are attributed to the real QA user so they appear in their dashboard.
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// Synthetic child portrait — non-photorealistic flat illustration, no real person.
// animals.png is NOT used (unrepresentative of child photo input).
const SMOKE_REFERENCE_IMAGE_URL = "https://story-gen-8a769.web.app/smoke/reference-child-portrait.png";

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

// 4 input variations for animals theme.
// キャラ構成: 子ども + 動物1匹 + アイテム1つ (strictly enforced via parentMessage wording)
const ANIMALS_INPUT_CASES = [
  {
    caseKey: "a1",
    childName: "ひかり",
    childAge: 4,
    animal: "うさぎ",
    item: "おべんとうばこ",
    parentMessage:
      "しろいうさぎさんといっしょに、のはらでやさしいおべんとうをたべようね。ゆっくりたのしんでね。",
    colorMood: "soft warm meadow",
  },
  {
    caseKey: "a2",
    childName: "さくら",
    childAge: 4,
    animal: "りす",
    item: "きいろいぼうし",
    parentMessage:
      "りすさんといっしょに、もりでどんぐりをひろいながら、きいろいぼうしをかぶってさんぽしようね。",
    colorMood: "warm autumn forest",
  },
  {
    caseKey: "a3",
    childName: "そうた",
    childAge: 5,
    animal: "ひよこ",
    item: "みずいろのかさ",
    parentMessage:
      "ちいさなひよこちゃんといっしょに、やさしいあめのひにみずいろのかさをさして、たのしくあそぼうね。",
    colorMood: "soft rainy day light blue",
  },
  {
    caseKey: "a4",
    childName: "はな",
    childAge: 4,
    animal: "こねこ",
    item: "あかいリボン",
    parentMessage:
      "こねこちゃんといっしょに、はるのおにわであかいリボンをつけてかわいくあそぼうね。",
    colorMood: "gentle spring garden",
  },
];

// 8 QA cases: cases 1–4 = soft_watercolor, cases 5–8 = classic_picture_book
function buildQACases() {
  const cases = [];
  for (const [styleIdx, styleId] of ["soft_watercolor", "classic_picture_book"].entries()) {
    for (const [animalIdx, animalInput] of ANIMALS_INPUT_CASES.entries()) {
      cases.push({
        caseNum: styleIdx * 4 + animalIdx + 1,
        style: styleId,
        animalInput,
      });
    }
  }
  return cases;
}

const QA_CASES = buildQACases();

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
  return `p53k-qa-${iso}`;
}

function parseArgs(args) {
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  const userIdArg = args.find((a) => a.startsWith("--userId="));
  const userId = userIdArg
    ? userIdArg.slice("--userId=".length).trim()
    : (process.env.QA_USER_ID ?? null);
  const casesArg = args.find((a) => a.startsWith("--cases="));
  const caseFilter = casesArg
    ? casesArg.replace("--cases=", "").split(",").map(Number).filter(Boolean)
    : null;
  return { isDryRun, isWrite, userId, caseFilter };
}

async function main() {
  const args = process.argv.slice(2);
  const { isDryRun, isWrite, userId, caseFilter } = parseArgs(args);

  if (!isDryRun && !isWrite) {
    console.error("[error] Specify --dry-run to preview or --write to create books.");
    process.exit(1);
  }

  if (!userId) {
    console.error("[error] --userId=<uid> is required, or set QA_USER_ID env var.");
    console.error("  Run: node scripts/setup-p5-3k-qa-user.js to get the UID.");
    process.exit(1);
  }

  const activeCases = caseFilter
    ? QA_CASES.filter((c) => caseFilter.includes(c.caseNum))
    : QA_CASES;

  if (activeCases.length === 0) {
    console.error(`[error] No cases matched. Valid: ${QA_CASES.map((c) => c.caseNum).join(", ")}`);
    process.exit(1);
  }

  if (isWrite) {
    const sa = loadServiceAccountFromEnvPath();
    if (sa.projectId !== TARGET_PROJECT_ID) {
      throw new Error(`Service account project_id (${sa.projectId}) != target (${TARGET_PROJECT_ID}).`);
    }
    ensureAdminApp(sa);
  }

  const db = isWrite ? getFirestore() : null;
  const runId = buildRunId();
  const nowMs = Date.now();

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] P5-3k Reference-Aware QA books`);
  console.log(`  runId:     ${runId}`);
  console.log(`  userId:    ${userId}`);
  console.log(`  cases:     ${activeCases.map((c) => c.caseNum).join(", ")}`);
  console.log(`  reference: synthetic child portrait (not animals.png)`);
  console.log(`  mode:      guided_ai / all_pages / pro_consistent`);
  console.log(``);

  const createdBookIds = [];

  for (const c of activeCases) {
    const styleProfile = STYLE_PROFILES[c.style];
    const { animalInput } = c;
    const childProfileSnapshot = buildChildProfileSnapshot(animalInput.childName, animalInput.childAge);

    const payload = {
      userId,
      title: `[P5-3k-QA] Case ${c.caseNum}: animals × ${c.style} (${animalInput.childName})`,
      theme: "animals",
      templateId: "animals",
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
      pageCount: 8,
      status: "generating",
      progress: 0,
      input: {
        childName: animalInput.childName,
        childAge: animalInput.childAge,
        parentMessage: animalInput.parentMessage,
        colorMood: animalInput.colorMood,
        favorites: `${animalInput.animal}と${animalInput.item}`,
      },
      childProfileSnapshot,
      qaRunId: runId,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: nowMs,
      expiresAt: null,
      smokeTestMetadata: {
        isSmokeTest: true,
        suite: "p5_3k_reference_aware_qa",
        runId,
        sourceScript: "scripts/create-p5-3k-reference-aware-qa-books.js",
        caseNum: c.caseNum,
        themeId: "animals",
        styleId: c.style,
        inputKey: animalInput.caseKey,
        animal: animalInput.animal,
        item: animalInput.item,
        characterConsistencyMode: "all_pages",
        referenceSourceType: "smoke_reference_child_portrait",
        hasReferenceImageUrl: true,
        createdAtIso: new Date(nowMs).toISOString(),
      },
    };

    if (isDryRun) {
      console.log(`  [Case ${c.caseNum}] ${c.style} / ${animalInput.childName} (${animalInput.childAge}y) / ${animalInput.animal} + ${animalInput.item}`);
      console.log(`    parentMessage:  ${animalInput.parentMessage}`);
      console.log(`    referenceImage: smoke_reference_child_portrait`);
      console.log(`    charMode:       all_pages`);
      console.log(`    profile:        pro_consistent  → Step b auto-enabled (P5-3k)`);
      console.log(``);
      continue;
    }

    const docRef = db.collection("books").doc();
    await docRef.create(payload);
    createdBookIds.push(docRef.id);

    console.log(`  [Case ${c.caseNum}] Created bookId=${docRef.id}`);
    console.log(`    style:   ${c.style}`);
    console.log(`    child:   ${animalInput.childName} / ${animalInput.animal} + ${animalInput.item}`);
    console.log(`    Monitor: node scripts/monitor-smoke-book.js ${docRef.id}`);
    console.log(`    Inspect: node scripts/inspect-smoke-book.js ${docRef.id}`);
    console.log(``);
  }

  if (isDryRun) {
    console.log(`[dry-run] done. Run with --write to create ${activeCases.length} books.`);
    console.log(``);
    console.log(`Before writing, confirm:`);
    console.log(`  node scripts/setup-p5-3k-qa-user.js --email=kikushun0529@gmail.com`);
    return;
  }

  console.log(`[done] runId=${runId}   books created: ${createdBookIds.length}`);
  console.log(``);
  console.log(`Next steps:`);
  console.log(`  1. Monitor each book:`);
  for (const id of createdBookIds) {
    console.log(`     node scripts/monitor-smoke-book.js ${id}`);
  }
  console.log(`  2. Inspect all books after completion:`);
  console.log(`     node scripts/inspect-p5-3k-qa-run.js --runId=${runId} --userId=${userId}`);
  console.log(`  3. Cloud Logging filter for p5_model_unification_retry_active:`);
  console.log(`     jsonPayload.message="p5_model_unification_retry_active"`);
  for (const id of createdBookIds) {
    console.log(`     AND jsonPayload.bookId="${id}"`);
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
