// Minimal guided_ai smoke book creator for T6 non-fixed style validation.
// Only supports the predefined T6 input profiles (--profile=a or --profile=b).
// Usage:
//   node scripts/create-nonfixed-smoke-book.js --dry-run [--theme-id=bedtime] [--style-id=crayon] [--profile=a|b]
//   node scripts/create-nonfixed-smoke-book.js --write  [--theme-id=bedtime] [--style-id=crayon] [--profile=a|b]

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

const STYLE_PROFILE_REGISTRY = {
  crayon: {
    id: "crayon",
    name: "クレヨンで描いた絵本",
    previewImageUrl: "/images/styles/crayon.png",
    styleBible:
      "Crayon storybook style, warm hand-drawn strokes, waxy texture, playful childlike marks, colorful but gentle page design.",
  },
  soft_watercolor: {
    id: "soft_watercolor",
    name: "やさしい水彩",
    previewImageUrl: "/images/styles/soft_watercolor.png",
    styleBible:
      "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
  },
  anime_storybook: {
    id: "anime_storybook",
    name: "わくわくアニメ風",
    previewImageUrl: "/images/styles/anime_storybook.png",
    styleBible:
      "Anime-inspired picture book style, expressive faces, sparkling eyes, lively framing, vivid but soft family-safe colors, warm fantasy energy.",
  },
};

// T6 input profiles per theme and profile letter.
// Profile A = moderate, Profile B = rich (per T6-2 design).
const T6_INPUT_PROFILES = {
  bedtime: {
    a: {
      label: "moderate",
      input: {
        childName: "さくら",
        childAge: 4,
        parentMessage: "きょうもたくさんあそんだね。おやすみ、さくら。",
        colorMood: "soft warm",
      },
    },
    b: {
      label: "rich",
      input: {
        childName: "けんた",
        childAge: 3,
        parentMessage: "げんきでよかった。また明日もいっしょに遊ぼうね。おやすみ。",
        colorMood: "deep cozy night",
        favorites: "ミニカーとぬいぐるみ",
      },
    },
  },
  fantasy: {
    a: {
      label: "moderate",
      input: {
        childName: "ひかり",
        childAge: 5,
        parentMessage: "想像力がゆたかだね。いつも応援しているよ。",
        colorMood: "magical dreamy",
      },
    },
    b: {
      label: "rich",
      input: {
        childName: "そうた",
        childAge: 4,
        parentMessage: "どんな冒険も、かえってきてね。",
        colorMood: "vivid adventure",
        favorites: "ドラゴンとほうきぼし",
        place: "雲の上の国",
      },
    },
  },
  "emotional-growth": {
    a: {
      label: "moderate",
      input: {
        childName: "はな",
        childAge: 5,
        lessonToTeach: "やさしさ",
        parentMessage: "まわりのひとにやさしくしてね。",
      },
    },
    b: {
      label: "rich",
      input: {
        childName: "りく",
        childAge: 4,
        lessonToTeach: "ともだちと仲よくする",
        parentMessage: "ともだちのことを大切にしてほしい。",
        favorites: "サッカーとえんぴつでかくこと",
      },
    },
  },
};

function buildSmokeRunId() {
  const iso = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `t6-nonfixed-${iso}`;
}

function loadServiceAccountFromEnvPath() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const raw = readFileSync(credentialPath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    clientEmail: parsed.client_email || parsed.clientEmail,
    privateKey: String(parsed.private_key || parsed.privateKey).replace(/\\n/g, "\n"),
    projectId: parsed.project_id || parsed.projectId,
  };
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

function ensureGoogleApplicationCredentials() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set or file not found.");
  }
}

function parseArg(args, prefix) {
  const matched = args.find((a) => a.startsWith(prefix));
  return matched ? matched.slice(prefix.length).trim() : null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");

  if (!dryRun && !write) {
    console.error("[error] Specify --dry-run to preview or --write to create the book.");
    process.exit(1);
  }

  const themeId = parseArg(args, "--theme-id=") ?? "bedtime";
  const styleId = parseArg(args, "--style-id=") ?? "crayon";
  const profileKey = (parseArg(args, "--profile=") ?? "a").toLowerCase();

  const styleProfile = STYLE_PROFILE_REGISTRY[styleId];
  if (!styleProfile) {
    throw new Error(
      `Unknown styleId: ${styleId}. Supported: ${Object.keys(STYLE_PROFILE_REGISTRY).join(", ")}`
    );
  }

  const themeProfiles = T6_INPUT_PROFILES[themeId];
  if (!themeProfiles) {
    throw new Error(
      `No T6 input profile defined for themeId: ${themeId}. Supported: ${Object.keys(T6_INPUT_PROFILES).join(", ")}`
    );
  }

  const profileSpec = themeProfiles[profileKey];
  if (!profileSpec) {
    throw new Error(
      `Unknown profile key: "${profileKey}". Supported for ${themeId}: ${Object.keys(themeProfiles).join(", ")}`
    );
  }

  const smokeRunId = buildSmokeRunId();
  const nowMs = Date.now();

  const payload = {
    userId: `smoke-t6-user-${smokeRunId}`,
    title: `[SMOKE-T6] ${themeId} × ${styleId} (${profileSpec.label})`,
    theme: themeId,
    templateId: themeId,
    creationMode: "guided_ai",
    // standard_paid is the plan required for guided_ai. The server normalizes
    // free + guided_ai -> standard_paid anyway, but being explicit avoids
    // confusion in smoke metadata.
    productPlan: "standard_paid",
    style: styleProfile.id,
    selectedStyleId: styleProfile.id,
    selectedStyleName: styleProfile.name,
    styleBible: styleProfile.styleBible,
    stylePreviewImageUrl: styleProfile.previewImageUrl,
    stylePreviewUsedAsReference: false,
    pageCount: 8,
    status: "generating",
    progress: 0,
    input: profileSpec.input,
    characterConsistencyMode: "cover_only",
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtMs: nowMs,
    expiresAt: null,
    smokeTestMetadata: {
      isSmokeTest: true,
      suite: "nonfixed_t6",
      runId: smokeRunId,
      sourceScript: "scripts/create-nonfixed-smoke-book.js",
      themeId,
      styleId: styleProfile.id,
      inputProfile: profileSpec.label,
      createdAtIso: new Date(nowMs).toISOString(),
      withReference: false,
    },
  };

  if (dryRun) {
    console.log("[dry-run] Payload preview (no Firestore write):");
    console.log(`  themeId:       ${themeId}`);
    console.log(`  styleId:       ${styleId}`);
    console.log(`  profile:       ${profileKey} (${profileSpec.label})`);
    console.log(`  creationMode:  ${payload.creationMode}`);
    console.log(`  productPlan:   ${payload.productPlan}`);
    console.log(`  pageCount:     ${payload.pageCount}`);
    console.log(`  characterMode: ${payload.characterConsistencyMode}`);
    console.log(`  withReference: false`);
    console.log(`  input:         ${JSON.stringify(payload.input)}`);
    console.log(`  runId:         ${smokeRunId}`);
    console.log("[dry-run] done. Run with --write to create the book.");
    return;
  }

  ensureGoogleApplicationCredentials();
  const serviceAccount = loadServiceAccountFromEnvPath();
  if (serviceAccount.projectId !== TARGET_PROJECT_ID) {
    throw new Error("Service account project_id does not match target project.");
  }

  ensureAdminApp(serviceAccount);
  const db = getFirestore();
  const docRef = db.collection("books").doc();
  await docRef.create(payload);

  console.log(`[created] themeId=${themeId} styleId=${styleId} profile=${profileSpec.label} bookId=${docRef.id}`);
  console.log(`[info] runId=${smokeRunId}`);
  console.log(`[info] Monitor: node scripts/monitor-smoke-book.js ${docRef.id}`);
  console.log(`[info] Inspect: node scripts/inspect-smoke-book.js ${docRef.id}`);
}

main().catch((error) => {
  console.error("[error]", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
