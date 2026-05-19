/**
 * T7-5b: Generate Group D quality sample images via OpenAI Images API.
 *
 * Generates 10 WebP candidates (5 templates × 2 tiers) to _tmp_t7_quality_candidates/.
 * After manual visual QA, use --promote-all to copy passing images to
 * public/images/samples/.
 *
 * All images generated at 1024x1536 (2:3 portrait, native gpt-image-1 size).
 * Converted to WebP via sharp (no resize, quality 85).
 * SampleImageCard displays at aspect-[3/4]; with object-cover the image loses
 * ~11% top+bottom — mitigated by centering subjects vertically in each prompt.
 *
 * Usage:
 *   $env:OPENAI_API_KEY = "sk-..."
 *   $env:HTTPS_PROXY    = "http://proxy.hq.melco.co.jp:9515/"
 *   node scripts/generate-quality-samples.js --dry-run
 *   node scripts/generate-quality-samples.js --write
 *   node scripts/generate-quality-samples.js --write --template fantasy --tier premium
 *   node scripts/generate-quality-samples.js --promote-all
 *   node scripts/generate-quality-samples.js --promote fantasy_light,fantasy_premium
 *
 * NOTE: Template IDs may contain hyphens (e.g., emotional-growth).
 *       Regex patterns here use [a-z0-9-]+ accordingly.
 *
 * Prerequisites:
 *   sharp (already available at root)
 *   openai package from functions/node_modules
 *   OPENAI_API_KEY env var (sk- line only)
 *   HTTPS_PROXY env var if behind corporate proxy
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync } = require("fs");

const ROOT = resolve(__dirname, "..");
const TMP_DIR = resolve(ROOT, "_tmp_t7_quality_candidates");
const DEST_DIR = resolve(ROOT, "public/images/samples");

const functionsRequire = createRequire(resolve(ROOT, "functions/package.json"));
const OpenAI = functionsRequire("openai").default ?? functionsRequire("openai");
const { HttpsProxyAgent } = require("https-proxy-agent");
const sharp = require("sharp");

// ─── Prompt structure ─────────────────────────────────────────────────────────
// Each prompt = PAGE_CONTEXT + SCENE + VISUAL_RULES
// Quality samples show interior book page illustrations, not covers.

const PAGE_CONTEXT =
  "A single interior page illustration from a Japanese children's picture book. " +
  "The scene fills the full frame with warm, inviting children's book art. " +
  "Portrait orientation, vertical composition, child-friendly and not photorealistic.";

const VISUAL_RULES =
  "Children's picture book illustration style. Bright warm colors, rounded friendly shapes, soft diffused lighting. " +
  "No readable text, no letters, no speech bubbles, no captions, no signs, no logos, no watermarks anywhere. " +
  "Not photorealistic. Not dark, not scary. Child-safe and family-appropriate.";

function buildPrompt(scene) {
  return `${PAGE_CONTEXT} ${scene} ${VISUAL_RULES}`;
}

// ─── Sample definitions ───────────────────────────────────────────────────────
// light tier: simple, single-focus, 1–2 characters, uncluttered
// premium tier: richer, more cinematic, layered scene, stronger atmosphere

const SAMPLES = [
  // ── fantasy ────────────────────────────────────────────────────────────────
  {
    templateId: "fantasy",
    tier: "light",
    prompt: buildPrompt(
      "A small child in a flowing blue wizard's robe holds a glowing wand, looking up with wonder at a friendly baby dragon " +
      "peeking over a mossy stone wall. A crescent moon glows in the starry sky behind them, soft golden sparkles drifting " +
      "through the air. Warm navy and gold palette."
    ),
  },
  {
    templateId: "fantasy",
    tier: "premium",
    prompt: buildPrompt(
      "The child protagonist walks a starlit forest path lined with glowing lanterns and floating open spell books, fireflies " +
      "swirling around them. Ahead, a luminous castle with golden windows rises above the treetops, and the friendly dragon " +
      "soars overhead trailing a ribbon of sparks. Deep navy sky, rich gold and violet accents, enchanted atmosphere."
    ),
  },

  // ── bedtime ────────────────────────────────────────────────────────────────
  {
    templateId: "bedtime",
    tier: "light",
    prompt: buildPrompt(
      "A small child in soft pajamas sits up in a cozy bed, holding a plush teddy bear, gazing through the window at a large " +
      "smiling moon surrounded by tiny twinkling stars. Warm amber lamp light on one side, cool blue moonlight on the other. " +
      "Peaceful and still."
    ),
  },
  {
    templateId: "bedtime",
    tier: "premium",
    prompt: buildPrompt(
      "Dreamlike bedroom scene: the child, tucked under a patchwork quilt with their teddy bear, watches as gentle silver " +
      "moonbeams paint soft glowing shapes in the air above the bed — a tiny rabbit, a drifting cloud, a shooting star. " +
      "Soft blue and warm amber palette, magical and serene atmosphere."
    ),
  },

  // ── animals ────────────────────────────────────────────────────────────────
  {
    templateId: "animals",
    tier: "light",
    prompt: buildPrompt(
      "A young child sits cross-legged in a sunny meadow, gently petting a fluffy white rabbit, while a small bluebird " +
      "perches lightly on their shoulder. Wildflowers surround them, warm dappled sunlight through tree leaves, green grass. " +
      "Quiet and gentle mood."
    ),
  },
  {
    templateId: "animals",
    tier: "premium",
    prompt: buildPrompt(
      "A joyful forest gathering: a bear, rabbit, fox, and small bluebird form a welcoming circle around the child under " +
      "a canopy of golden leaves. Each animal offers a small gift — an acorn, a sprig of berries, a soft feather. " +
      "Warm golden afternoon light through the trees, celebratory and tender atmosphere."
    ),
  },

  // ── adventure ──────────────────────────────────────────────────────────────
  {
    templateId: "adventure",
    tier: "light",
    prompt: buildPrompt(
      "A child with a small backpack stands at the top of a green hill, holding a sparkling golden compass up to the light, " +
      "gazing ahead at a winding path leading into a colorful landscape. Blue sky, puffy white clouds, sense of open " +
      "possibility and joyful excitement."
    ),
  },
  {
    templateId: "adventure",
    tier: "premium",
    prompt: buildPrompt(
      "The child discovers a shimmering treasure map that unfurls in a waterfall's mist, its surface glowing with magical " +
      "light revealing a path through mountains. A friendly fox watches curiously from a nearby mossy rock. Lush greens and " +
      "blues, golden light catching the water spray, sense of wonder and adventure."
    ),
  },

  // ── emotional-growth ───────────────────────────────────────────────────────
  {
    templateId: "emotional-growth",
    tier: "light",
    prompt: buildPrompt(
      "Two small children share a single colorful umbrella in gentle warm rain, smiling at each other. One has just helped " +
      "the other back to their feet on a muddy path. Soft pastel colors, a cheerful puddle in the foreground, warm and " +
      "kind mood."
    ),
  },
  {
    templateId: "emotional-growth",
    tier: "premium",
    prompt: buildPrompt(
      "A child stands in a sunlit garden, hands cupped around a tiny glowing golden heart-seed. Around them, friends and " +
      "small animals gather, and wherever the warmth of the seed reaches, flowers bloom. Soft golden sunray illuminates " +
      "the central moment, radiating warmth and connection."
    ),
  },
];

// ─── Helper: file key ─────────────────────────────────────────────────────────
function fileKey(templateId, tier) {
  return `${templateId}_${tier}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  const isPromoteAll = args.includes("--promote-all");
  const promoteIdx = args.indexOf("--promote");
  const promoteKeys = promoteIdx !== -1 ? args[promoteIdx + 1].split(",").map((s) => s.trim()) : [];
  const templateIdx = args.indexOf("--template");
  const templateFilter = templateIdx !== -1 ? args[templateIdx + 1] : null;
  const tierIdx = args.indexOf("--tier");
  const tierFilter = tierIdx !== -1 ? args[tierIdx + 1] : null;

  const isPromote = isPromoteAll || promoteKeys.length > 0;

  if (!isDryRun && !isWrite && !isPromote) {
    console.error(
      "Usage:\n" +
        "  node scripts/generate-quality-samples.js --dry-run\n" +
        "  node scripts/generate-quality-samples.js --write\n" +
        "  node scripts/generate-quality-samples.js --write --template <id> --tier <light|premium>\n" +
        "  node scripts/generate-quality-samples.js --promote-all\n" +
        "  node scripts/generate-quality-samples.js --promote <key1,key2,...>\n" +
        "\n" +
        "  key format: {templateId}_{tier}  e.g. fantasy_light, emotional-growth_premium"
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
      ? SAMPLES.map((s) => fileKey(s.templateId, s.tier))
      : promoteKeys;

    console.log(`[PROMOTE] Promoting ${toPromote.length} sample(s) to public/images/samples/`);
    if (!existsSync(DEST_DIR)) {
      mkdirSync(DEST_DIR, { recursive: true });
    }

    let successCount = 0;
    for (const key of toPromote) {
      const srcFile = `${key}.webp`;
      const srcPath = resolve(TMP_DIR, srcFile);
      const destPath = resolve(DEST_DIR, srcFile);
      if (!existsSync(srcPath)) {
        console.error(`  [MISSING] ${srcFile} — not found in ${TMP_DIR}`);
        continue;
      }
      copyFileSync(srcPath, destPath);
      const kb = Math.round(statSync(destPath).size / 1024);
      console.log(`  ✓ ${key} → public/images/samples/${srcFile}  (${kb} KB)`);
      successCount++;
    }
    console.log(`\nPromoted ${successCount}/${toPromote.length} files.`);

    const allFiles = existsSync(DEST_DIR) ? readdirSync(DEST_DIR) : [];
    const webpCount = allFiles.filter((f) => f.endsWith(".webp")).length;
    console.log(`\n[public/images/samples/] webp=${webpCount}`);
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

  let targets = SAMPLES;
  if (templateFilter) {
    targets = targets.filter((s) => s.templateId === templateFilter);
  }
  if (tierFilter) {
    targets = targets.filter((s) => s.tier === tierFilter);
  }

  if (targets.length === 0) {
    console.error("[error] No samples match the given --template / --tier filter.");
    process.exit(1);
  }

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] T7-5b: Generate ${targets.length} quality sample(s)`);
  if (isWrite) {
    console.log(`[output] → ${TMP_DIR}`);
  }
  console.log();

  if (isWrite && !existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  const results = [];

  for (const sample of targets) {
    const key = fileKey(sample.templateId, sample.tier);
    const outPath = resolve(TMP_DIR, `${key}.webp`);

    console.log(`  [${key}]`);
    console.log(`    template: ${sample.templateId}  tier: ${sample.tier}`);
    console.log(`    prompt: ${sample.prompt.slice(0, 130)}...`);

    if (isDryRun) {
      console.log(`    [DRY-RUN] Would generate to _tmp_t7_quality_candidates/${key}.webp`);
      console.log();
      continue;
    }

    // Generate via OpenAI Images API
    console.log(`    Calling OpenAI (gpt-image-1, 1024×1536)...`);
    let imageBuffer;
    try {
      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: sample.prompt,
        n: 1,
        size: "1024x1536",
        output_format: "png",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No b64_json in response");
      }
      imageBuffer = Buffer.from(b64, "base64");
    } catch (err) {
      console.error(`    [ERROR] OpenAI call failed: ${err.message}`);
      results.push({ key, ok: false, error: err.message });
      console.log();
      continue;
    }

    // Convert to WebP via sharp
    console.log(`    Converting to WebP (quality 85)...`);
    try {
      const meta = await sharp(imageBuffer).metadata();
      console.log(`    Input: ${meta.width}×${meta.height} ${meta.format}`);

      const webpBuffer = await sharp(imageBuffer)
        .toFormat("webp", { quality: 85, effort: 6 })
        .toBuffer();

      writeFileSync(outPath, webpBuffer);
      const kb = Math.round(webpBuffer.length / 1024);
      console.log(`    ✓ Saved: ${key}.webp  ${kb} KB`);
      results.push({ key, ok: true, kb });
    } catch (err) {
      console.error(`    [ERROR] sharp conversion failed: ${err.message}`);
      results.push({ key, ok: false, error: err.message });
    }
    console.log();
  }

  if (!isDryRun) {
    console.log("\n── Summary ────────────────────────────────────────────────");
    let passed = 0;
    for (const r of results) {
      if (r.ok) {
        console.log(`  ✓ ${r.key}  ${r.kb} KB`);
        passed++;
      } else {
        console.log(`  ✗ ${r.key}  ERROR: ${r.error}`);
      }
    }
    console.log(`\n${passed}/${results.length} generated successfully.`);
    console.log("\nNext step: review images with view_image tool, then run --promote-all");
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
