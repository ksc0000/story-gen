/**
 * T7-3b: Generate Group A style preview images via OpenAI Images API.
 *
 * Generates 10 style preview WebP candidates to _tmp_t7_style_candidates/.
 * After manual QA, use --promote-all or --promote <id,...> to copy passing
 * images to public/images/styles/*.webp.
 *
 * All images generated at 1024x1536 (2:3 portrait, native gpt-image-1 size).
 * Converted to WebP via sharp (no resize, quality 85).
 *
 * Usage:
 *   $env:OPENAI_API_KEY = "sk-..."
 *   node scripts/generate-style-previews.js --dry-run
 *   node scripts/generate-style-previews.js --write
 *   node scripts/generate-style-previews.js --write --style crayon
 *   node scripts/generate-style-previews.js --promote-all
 *   node scripts/generate-style-previews.js --promote crayon,anime_storybook
 *
 * Prerequisites:
 *   npm install sharp (already available at root)
 *   openai package from functions/node_modules
 */

const { createRequire } = require("module");
const { resolve, dirname } = require("path");
const { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } = require("fs");

const ROOT = resolve(__dirname, "..");
const TMP_DIR = resolve(ROOT, "_tmp_t7_style_candidates");
const STYLES_DIR = resolve(ROOT, "public/images/styles");

const functionsRequire = createRequire(resolve(ROOT, "functions/package.json"));
const OpenAI = functionsRequire("openai").default ?? functionsRequire("openai");
const { HttpsProxyAgent } = require("https-proxy-agent");
const sharp = require("sharp");

// ─── Common scene elements ────────────────────────────────────────────────────

const BASE_SCENE =
  "A small child (3 to 5 years old, stylized and child-friendly, not photorealistic) " +
  "sitting cross-legged on a soft rug in a cozy reading nook, holding an open picture book. " +
  "From the pages of the book, tiny magical creatures emerge — a small rabbit, a little bear, " +
  "a bluebird — surrounded by soft glowing stars and gentle sparkles. " +
  "Warm diffused indoor lighting. Vertical portrait composition, full-body view, child centered. " +
  "No readable text, no letters, no logos, no watermarks.";

const NEGATIVE_RULES =
  "Do not add any readable text, signs, labels, logos, or watermarks anywhere. " +
  "Do not render any element in a photorealistic style. " +
  "Do not use a dark, threatening, or adult mood.";

function buildPrompt(styleModifier) {
  return `${styleModifier} ${BASE_SCENE} ${NEGATIVE_RULES}`;
}

// ─── Style definitions ────────────────────────────────────────────────────────

const STYLES = [
  {
    id: "soft_watercolor",
    prompt: buildPrompt(
      "Japanese children's picture book watercolor style, soft warm colors, pale gentle pigment blooms, hand-painted paper texture, cozy tender atmosphere."
    ),
  },
  {
    id: "fluffy_pastel",
    prompt: buildPrompt(
      "Fluffy pastel picture book style, soft rounded forms, airy pale colors, gentle edges, cute toddler-friendly design, plush comforting mood."
    ),
  },
  {
    id: "crayon",
    prompt: buildPrompt(
      "Crayon storybook style, warm hand-drawn strokes with visible waxy texture, playful childlike imperfect lines, colorful but gentle page design."
    ),
  },
  {
    id: "flat_illustration",
    prompt: buildPrompt(
      "Simple flat illustration style, bright clean colors, readable shapes with minimal shadows and gradients, modern child-friendly picture book layout."
    ),
  },
  {
    id: "anime_storybook",
    prompt: buildPrompt(
      "Anime-inspired picture book style, expressive large eyes with sparkling highlights, vivid but soft family-safe colors, lively framing with warm fantasy energy."
    ),
  },
  {
    id: "classic_picture_book",
    prompt: buildPrompt(
      "Classic picture book illustration style, traditional fairytale warmth, detailed painterly linework, rich textures, timeless storybook atmosphere."
    ),
  },
  {
    id: "toy_3d",
    prompt: buildPrompt(
      "Rounded 3D toy storybook style, clay-like forms, playful miniature diorama feeling, soft plastic texture with gentle highlights, bright child-safe lighting."
    ),
  },
  {
    id: "paper_collage",
    prompt: buildPrompt(
      "Paper cut collage picture book style, layered handmade paper textures with visible torn edges, tactile warm craft feeling, playful child-friendly composition."
    ),
  },
  {
    id: "pencil_sketch",
    prompt: buildPrompt(
      "Gentle pencil sketch picture book style, delicate hand-drawn line art with subtle color tinting, nostalgic quiet mood, soft nostalgic crafted feeling."
    ),
  },
  {
    id: "colorful_pop",
    prompt: buildPrompt(
      "Colorful pop picture book style, vivid joyful saturated colors, friendly rounded forms, playful graphic energy, clear child-safe staging."
    ),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  const isPromoteAll = args.includes("--promote-all");
  const promoteIdx = args.indexOf("--promote");
  const promoteIds = promoteIdx !== -1 ? args[promoteIdx + 1].split(",").map((s) => s.trim()) : [];
  const styleIdx = args.indexOf("--style");
  const styleFilter = styleIdx !== -1 ? args[styleIdx + 1] : null;

  const isPromote = isPromoteAll || promoteIds.length > 0;

  if (!isDryRun && !isWrite && !isPromote) {
    console.error(
      "Usage:\n" +
        "  node scripts/generate-style-previews.js --dry-run\n" +
        "  node scripts/generate-style-previews.js --write [--style <id>]\n" +
        "  node scripts/generate-style-previews.js --promote-all\n" +
        "  node scripts/generate-style-previews.js --promote <id1,id2,...>"
    );
    process.exit(1);
  }

  // ── Promote mode ──────────────────────────────────────────────────────────
  if (isPromote) {
    if (!existsSync(TMP_DIR)) {
      console.error(`[error] Candidate directory not found: ${TMP_DIR}`);
      console.error("Run --write first to generate candidates.");
      process.exit(1);
    }

    const candidates = readdirSync(TMP_DIR).filter((f) => f.endsWith(".webp"));
    const toPromote = isPromoteAll
      ? STYLES.map((s) => s.id)
      : promoteIds;

    console.log(`[PROMOTE] Promoting ${toPromote.length} style(s) to public/images/styles/`);
    if (!existsSync(STYLES_DIR)) {
      mkdirSync(STYLES_DIR, { recursive: true });
    }

    let successCount = 0;
    for (const id of toPromote) {
      const srcFile = `${id}.webp`;
      const srcPath = resolve(TMP_DIR, srcFile);
      const destPath = resolve(STYLES_DIR, srcFile);
      if (!existsSync(srcPath)) {
        console.error(`  [MISSING] ${srcFile} — not found in ${TMP_DIR}`);
        continue;
      }
      copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${id} → public/images/styles/${srcFile}`);
      successCount++;
    }
    console.log(`\nPromoted ${successCount}/${toPromote.length} files.`);
    return;
  }

  // ── Dry-run / Write mode ──────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[error] OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  if (proxyUrl) {
    console.log(`[proxy] Using ${proxyUrl}`);
  }

  const client = new OpenAI({
    apiKey,
    ...(httpAgent ? { httpAgent } : {}),
  });

  const targets = styleFilter ? STYLES.filter((s) => s.id === styleFilter) : STYLES;

  if (targets.length === 0) {
    console.error(`[error] No style found with id: ${styleFilter}`);
    process.exit(1);
  }

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] T7-3b: Generate ${targets.length} style preview(s)`);
  if (isWrite) {
    console.log(`[output] → ${TMP_DIR}`);
  }
  console.log();

  if (isWrite && !existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  const results = [];

  for (const style of targets) {
    const outPath = resolve(TMP_DIR, `${style.id}.webp`);

    console.log(`  [${style.id}]`);
    console.log(`    prompt: ${style.prompt.slice(0, 100)}...`);

    if (isDryRun) {
      console.log(`    [DRY-RUN] Would generate to _tmp_t7_style_candidates/${style.id}.webp`);
      console.log();
      continue;
    }

    // Generate via OpenAI Images API
    console.log(`    Calling OpenAI (gpt-image-1, 1024×1536)...`);
    let imageBuffer;
    try {
      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: style.prompt,
        n: 1,
        size: "1024x1536",
        output_format: "png",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No b64_json in response");
      }
      imageBuffer = Buffer.from(b64, "base64");
      console.log(`    Generated (${Math.round(imageBuffer.length / 1024)} KB raw PNG).`);
    } catch (err) {
      console.error(`    [ERROR] Generation failed for ${style.id}: ${err.message}`);
      results.push({ id: style.id, status: "error", error: err.message });
      continue;
    }

    // Convert to WebP via sharp (no resize — already at target size 1024×1536)
    let webpBuffer;
    try {
      webpBuffer = await sharp(imageBuffer)
        .webp({ quality: 85, effort: 6 })
        .toBuffer();
      const meta = await sharp(webpBuffer).metadata();
      console.log(
        `    WebP: ${Math.round(webpBuffer.length / 1024)} KB, ${meta.width}×${meta.height}`
      );
    } catch (err) {
      console.error(`    [ERROR] sharp processing failed for ${style.id}: ${err.message}`);
      results.push({ id: style.id, status: "error", error: err.message });
      continue;
    }

    // Write to tmp dir
    writeFileSync(outPath, webpBuffer);
    console.log(`    ✓ Written: _tmp_t7_style_candidates/${style.id}.webp`);
    results.push({ id: style.id, status: "ok", kbSize: Math.round(webpBuffer.length / 1024) });
    console.log();
  }

  if (isWrite) {
    console.log("─".repeat(60));
    console.log("Generation summary:");
    for (const r of results) {
      if (r.status === "ok") {
        console.log(`  ✓ ${r.id}  ${r.kbSize} KB`);
      } else {
        console.log(`  ✗ ${r.id}  ERROR: ${r.error}`);
      }
    }
    const ok = results.filter((r) => r.status === "ok").length;
    console.log(`\n${ok}/${results.length} styles generated to ${TMP_DIR}`);
    console.log("Next: visually QA all images, then run --promote-all or --promote <ids>");
  } else {
    console.log("[DRY-RUN] No files written. Re-run with --write to generate.");
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
