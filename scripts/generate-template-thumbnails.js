/**
 * T7-4b: Generate Group B template thumbnail images via OpenAI Images API.
 *
 * Generates 10 template thumbnail WebP candidates to _tmp_t7_template_candidates/.
 * After manual QA, use --promote-all or --promote <id,...> to copy passing
 * images to public/images/templates/*.webp.
 *
 * All images generated at 1024x1536 (2:3 portrait, native gpt-image-1 size).
 * Converted to WebP via sharp (no resize, quality 85).
 * ThemeCard displays at aspect-[3/4]; with object-cover the image loses ~11%
 * top+bottom — mitigated by centering subjects vertically in each prompt.
 *
 * Usage:
 *   $env:OPENAI_API_KEY = "sk-..."
 *   $env:HTTPS_PROXY    = "http://proxy.hq.melco.co.jp:9515/"
 *   node scripts/generate-template-thumbnails.js --dry-run
 *   node scripts/generate-template-thumbnails.js --write
 *   node scripts/generate-template-thumbnails.js --write --thumb animals
 *   node scripts/generate-template-thumbnails.js --promote-all
 *   node scripts/generate-template-thumbnails.js --promote animals,adventure
 *
 * NOTE: Template IDs may contain hyphens (e.g., emotional-growth).
 *       Regex patterns here use [a-z0-9-]+ accordingly.
 *
 * Prerequisites:
 *   npm install sharp (already available at root)
 *   openai package from functions/node_modules
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } = require("fs");

const ROOT = resolve(__dirname, "..");
const TMP_DIR = resolve(ROOT, "_tmp_t7_template_candidates");
const DEST_DIR = resolve(ROOT, "public/images/templates");

const functionsRequire = createRequire(resolve(ROOT, "functions/package.json"));
const OpenAI = functionsRequire("openai").default ?? functionsRequire("openai");
const { HttpsProxyAgent } = require("https-proxy-agent");
const sharp = require("sharp");

// ─── Common visual language ───────────────────────────────────────────────────

const VISUAL_LANGUAGE =
  "Children's picture book illustration style, bright warm inviting colors, rounded friendly shapes, " +
  "soft diffused lighting, portrait orientation with subject centered vertically. " +
  "No readable text, no letters, no signs, no logos, no watermarks anywhere. " +
  "Not photorealistic, not dark, not threatening.";

function buildPrompt(scene) {
  return `${scene} ${VISUAL_LANGUAGE}`;
}

// ─── Thumbnail definitions ────────────────────────────────────────────────────
// Each entry has a unique scene derived from SEED_TEMPLATES.visualDirection.

const THUMBNAILS = [
  {
    id: "animals",
    prompt: buildPrompt(
      "Soft woodland picture-book cover. A fluffy bear, rabbit, fox, and small bird gathered in a sunlit forest clearing, smiling and playing together. " +
      "Warm dappled sunlight filtering through leafy trees, cream-toned background, rounded friendly shapes and gentle smiling faces. Cozy approachable composition."
    ),
  },
  {
    id: "adventure",
    prompt: buildPrompt(
      "Bright adventurous picture-book cover. A small child holding a sparkling golden compass stands on a green hilltop, wide open landscape stretching ahead — rolling hills, blue sky, winding path. " +
      "Dynamic outward-facing pose conveying discovery and joyful safe excitement."
    ),
  },
  {
    id: "fantasy",
    prompt: buildPrompt(
      "Dreamy magical night picture-book cover. A child and a friendly baby dragon stand together under a deep navy starry sky, a glowing wand in the child's hand, floating open books and soft sparkles around them, " +
      "a luminous castle with glowing windows in the background. Gold and navy palette, ornate but child-friendly details."
    ),
  },
  {
    id: "bedtime",
    prompt: buildPrompt(
      "Calm bedtime picture-book cover. A small child in cozy pajamas sits in bed hugging a plush stuffed bear, a smiling crescent moon glowing through the bedroom window with tiny twinkling stars, " +
      "soft warm lamp light beside the bed. Muted blues, slow peaceful composition, sleepy tender mood."
    ),
  },
  {
    id: "emotional-growth",
    prompt: buildPrompt(
      "Warm emotional-growth picture-book cover. Two small children holding hands gently in a golden sunlit flower garden, faces full of warmth and kindness. " +
      "A small glowing heart or seed motif at the center. Soft afternoon light, encouraging and tender mood."
    ),
  },
  {
    id: "daily-habits",
    prompt: buildPrompt(
      "Cheerful daily-habit picture-book cover. A small child brushing teeth alongside a smiling anthropomorphic toothbrush character in a bright clean bathroom. " +
      "Bright primary colors, clear and tidy composition, reassuring parent-child learning mood."
    ),
  },
  {
    id: "educational",
    prompt: buildPrompt(
      "Colorful educational picture-book cover. A child reaching up to floating numbers, colorful shape blocks, and letter motifs in a rainbow-bright magical learning space. " +
      "Small cheerful animal helpers assist. Playful diagram-like clarity, classroom-adventure composition."
    ),
  },
  {
    id: "food",
    prompt: buildPrompt(
      "Warm food picture-book cover. Round smiling bread rolls and cheerful fruit characters gathered in a cozy golden bakery, soft steam rising, gingham cloth on the counter. " +
      "Warm golden-brown lighting, inviting appetizing atmosphere, cute anthropomorphic food designs."
    ),
  },
  {
    id: "seasonal",
    prompt: buildPrompt(
      "Festive seasonal picture-book cover. A vibrant illustration showing all four seasons together: sakura blossoms (spring), sunny beach (summer), golden fallen leaves (autumn), and a snowy snowman scene (winter). " +
      "Bright joyful children in each seasonal vignette. Watercolor-like seasonal color blocks."
    ),
  },
  {
    id: "vehicles-robots",
    prompt: buildPrompt(
      "Pop and exciting vehicles picture-book cover. A friendly smiling robot bus with happy children waving from windows, rolling under a blue sky with white puffy clouds, a clean futuristic city in the background. " +
      "Rounded mechanical shapes, orange and blue accents, energetic safe motion."
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
  const thumbIdx = args.indexOf("--thumb");
  const thumbFilter = thumbIdx !== -1 ? args[thumbIdx + 1] : null;

  const isPromote = isPromoteAll || promoteIds.length > 0;

  if (!isDryRun && !isWrite && !isPromote) {
    console.error(
      "Usage:\n" +
        "  node scripts/generate-template-thumbnails.js --dry-run\n" +
        "  node scripts/generate-template-thumbnails.js --write [--thumb <id>]\n" +
        "  node scripts/generate-template-thumbnails.js --promote-all\n" +
        "  node scripts/generate-template-thumbnails.js --promote <id1,id2,...>"
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

    const toPromote = isPromoteAll
      ? THUMBNAILS.map((t) => t.id)
      : promoteIds;

    console.log(`[PROMOTE] Promoting ${toPromote.length} thumbnail(s) to public/images/templates/`);
    if (!existsSync(DEST_DIR)) {
      mkdirSync(DEST_DIR, { recursive: true });
    }

    let successCount = 0;
    for (const id of toPromote) {
      const srcFile = `${id}.webp`;
      const srcPath = resolve(TMP_DIR, srcFile);
      const destPath = resolve(DEST_DIR, srcFile);
      if (!existsSync(srcPath)) {
        console.error(`  [MISSING] ${srcFile} — not found in ${TMP_DIR}`);
        continue;
      }
      copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${id} → public/images/templates/${srcFile}`);
      successCount++;
    }
    console.log(`\nPromoted ${successCount}/${toPromote.length} files.`);

    // Summary: count WebP vs PNG remaining
    const allFiles = readdirSync(DEST_DIR);
    const webpCount = allFiles.filter((f) => f.endsWith(".webp")).length;
    const pngRemaining = allFiles.filter((f) => f.endsWith(".png")).length;
    console.log(`\n[public/images/templates/] webp=${webpCount}  png_remaining=${pngRemaining}`);
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

  const targets = thumbFilter
    ? THUMBNAILS.filter((t) => t.id === thumbFilter)
    : THUMBNAILS;

  if (targets.length === 0) {
    console.error(`[error] No thumbnail found with id: ${thumbFilter}`);
    process.exit(1);
  }

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] T7-4b: Generate ${targets.length} template thumbnail(s)`);
  if (isWrite) {
    console.log(`[output] → ${TMP_DIR}`);
  }
  console.log();

  if (isWrite && !existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  const results = [];

  for (const thumb of targets) {
    const outPath = resolve(TMP_DIR, `${thumb.id}.webp`);

    console.log(`  [${thumb.id}]`);
    console.log(`    prompt: ${thumb.prompt.slice(0, 120)}...`);

    if (isDryRun) {
      console.log(`    [DRY-RUN] Would generate to _tmp_t7_template_candidates/${thumb.id}.webp`);
      console.log();
      continue;
    }

    // Generate via OpenAI Images API
    console.log(`    Calling OpenAI (gpt-image-1, 1024×1536)...`);
    let imageBuffer;
    try {
      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: thumb.prompt,
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
      console.error(`    [ERROR] Generation failed for ${thumb.id}: ${err.message}`);
      results.push({ id: thumb.id, status: "error", error: err.message });
      continue;
    }

    // Convert to WebP via sharp (no resize — 1024×1536 as generated)
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
      console.error(`    [ERROR] sharp processing failed for ${thumb.id}: ${err.message}`);
      results.push({ id: thumb.id, status: "error", error: err.message });
      continue;
    }

    // Write to tmp dir
    writeFileSync(outPath, webpBuffer);
    console.log(`    ✓ Written: _tmp_t7_template_candidates/${thumb.id}.webp`);
    results.push({ id: thumb.id, status: "ok", kbSize: Math.round(webpBuffer.length / 1024) });
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
    console.log(`\n${ok}/${results.length} thumbnails generated to ${TMP_DIR}`);
    console.log("Next: visually QA all images, then run --promote-all or --promote <ids>");
  } else {
    console.log("[DRY-RUN] No files written. Re-run with --write to generate.");
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
