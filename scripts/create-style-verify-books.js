/**
 * Style verification smoke books — creates one short book per style to visually
 * confirm that each illustration style is correctly applied in generated images.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *   node scripts/create-style-verify-books.js [--styles=flat_illustration,fluffy_pastel,...] [--dry-run]
 *
 * Defaults to creating books for all 10 active styles.
 */

"use strict";

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync } = require("fs");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// All active styles to verify
const STYLES = [
  { id: "soft_watercolor",    name: "やさしい水彩" },
  { id: "fluffy_pastel",      name: "ふんわりパステル" },
  { id: "crayon",             name: "クレヨンで描いた絵本" },
  { id: "flat_illustration",  name: "シンプルフラット" },
  { id: "anime_storybook",    name: "わくわくアニメ風" },
  { id: "classic_picture_book", name: "クラシック絵本" },
  { id: "toy_3d",             name: "ぷっくり3Dトイ風" },
  { id: "paper_collage",      name: "紙あそびコラージュ" },
  { id: "pencil_sketch",      name: "やさしい鉛筆スケッチ" },
  { id: "colorful_pop",       name: "カラフルポップ" },
];

function loadServiceAccount() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !existsSync(credPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set or file not found.");
  }
  return JSON.parse(readFileSync(credPath, "utf-8"));
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return;
  initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
}

function buildRunId() {
  return `style-verify-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const write = args.includes("--write");

  if (!dryRun && !write) {
    console.error("Specify --dry-run to preview or --write to create books.");
    process.exit(1);
  }

  const stylesArg = args.find((a) => a.startsWith("--styles="));
  const styleIds = stylesArg
    ? stylesArg.replace("--styles=", "").split(",")
    : STYLES.map((s) => s.id);

  const selectedStyles = STYLES.filter((s) => styleIds.includes(s.id));
  if (selectedStyles.length === 0) {
    console.error(`No matching styles. Available: ${STYLES.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  const runId = buildRunId();
  const nowMs = Date.now();

  console.log(`[style-verify] runId=${runId} styles=${selectedStyles.map((s) => s.id).join(", ")}`);

  if (!dryRun) {
    const sa = loadServiceAccount();
    if (sa.project_id !== TARGET_PROJECT_ID) {
      throw new Error(`Service account project_id mismatch: ${sa.project_id}`);
    }
    ensureAdminApp(sa);
  }

  const db = !dryRun ? getFirestore() : null;
  const createdIds = [];

  for (const style of selectedStyles) {
    const payload = {
      userId: `smoke-style-verify-${runId}`,
      title: `[STYLE-VERIFY] ${style.id}`,
      theme: "birthday",
      templateId: "birthday",
      creationMode: "guided_ai",
      productPlan: "standard_paid",
      style: style.id,
      selectedStyleId: style.id,
      selectedStyleName: style.name,
      // Note: styleBible here is story-level guidance; image style comes from
      // getIllustrationStyleProfile(style.id) in the Cloud Function.
      styleBible: null,
      stylePreviewImageUrl: `/images/styles/${style.id}.webp`,
      stylePreviewUsedAsReference: false,
      pageCount: 4,  // minimal — 4 pages for speed
      status: "generating",
      progress: 0,
      input: {
        childName: "ゆうき",
        childAge: 4,
        parentMessage: "たんじょうびおめでとう！",
        colorMood: "cheerful birthday",
      },
      characterConsistencyMode: "cover_only",
      createdAt: !dryRun ? FieldValue.serverTimestamp() : null,
      createdAtMs: nowMs,
      updatedAt: !dryRun ? FieldValue.serverTimestamp() : null,
      updatedAtMs: nowMs,
      expiresAt: null,
      smokeTestMetadata: {
        isSmokeTest: true,
        suite: "style_verify",
        runId,
        sourceScript: "scripts/create-style-verify-books.js",
        styleId: style.id,
        createdAtIso: new Date(nowMs).toISOString(),
      },
    };

    if (dryRun) {
      console.log(`[dry-run] Would create: style=${style.id} (${style.name}) pageCount=4`);
      continue;
    }

    const docRef = db.collection("books").doc();
    await docRef.create(payload);
    createdIds.push({ id: docRef.id, style: style.id });
    console.log(`[created] style=${style.id} bookId=${docRef.id}`);
  }

  if (!dryRun) {
    console.log("\n[all created]");
    for (const { id, style } of createdIds) {
      console.log(`  ${style.padEnd(25)} → https://ehoria.app/book/?id=${id}`);
    }
    console.log("\nMonitor with:");
    console.log(`  node scripts/monitor-smoke-book.js ${createdIds.map((b) => b.id).join(" ")}`);
  }
}

main().catch((e) => {
  console.error("[error]", e.message);
  process.exit(1);
});
