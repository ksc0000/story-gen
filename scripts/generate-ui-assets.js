/**
 * T7-2: Generate missing Group C UI illustrations & icons via OpenAI Images API.
 *
 * Generates 7 missing WebP assets and writes them to public/images/:
 *   illustrations/hero.webp        300x225
 *   illustrations/empty-shelf.webp 200x150
 *   illustrations/generating.webp  120x90
 *   icons/book.webp                64x64
 *   icons/palette.webp             64x64
 *   icons/shield.webp              64x64
 *   icons/star.webp                48x48
 *
 * All images are generated at 1024x1024 from OpenAI Images API (gpt-image-1),
 * then resized/converted to WebP via sharp.
 *
 * Usage:
 *   $env:OPENAI_API_KEY = "sk-..."
 *   node scripts/generate-ui-assets.js --dry-run   # validate config only
 *   node scripts/generate-ui-assets.js --write      # generate + write files
 *   node scripts/generate-ui-assets.js --write --asset hero  # single asset
 *
 * Prerequisites:
 *   npm install sharp (already available at root)
 *   openai package from functions/node_modules
 */

const { createRequire } = require("module");
const { resolve, dirname } = require("path");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const https = require("https");

const ROOT = resolve(__dirname, "..");
const functionsRequire = createRequire(resolve(ROOT, "functions/package.json"));
const OpenAI = functionsRequire("openai").default ?? functionsRequire("openai");
const { HttpsProxyAgent } = require("https-proxy-agent");
const sharp = require("sharp");

// ─── Asset definitions ────────────────────────────────────────────────────────

const ASSETS = [
  {
    id: "hero",
    outputPath: "public/images/illustrations/hero.webp",
    width: 300,
    height: 225,
    prompt:
      "A warm, magical children's picture book illustration: a young child sitting cross-legged in a cozy reading nook, holding an open glowing storybook from which tiny stars and colorful story characters float out into the air. Soft warm lighting, watercolor-like style, gentle pastel palette, whimsical and inviting mood. No text, no letters, no logos, no watermarks. Landscape orientation, child-friendly, joyful.",
  },
  {
    id: "empty-shelf",
    outputPath: "public/images/illustrations/empty-shelf.webp",
    width: 200,
    height: 150,
    prompt:
      "A charming children's book style illustration of an empty wooden bookshelf with a few friendly small objects: a tiny star, a small potted plant, and a sleeping stuffed bear plushie on the shelf. Warm inviting colors, soft shadows, gentle pastel background. Encouraging and welcoming mood. No text, no letters, no logos, no watermarks. Horizontal composition, child-friendly.",
  },
  {
    id: "generating",
    outputPath: "public/images/illustrations/generating.webp",
    width: 120,
    height: 90,
    prompt:
      "A small whimsical illustration of an open book with magical sparkles and tiny stars swirling around it as if being written by invisible magic. Glowing pages, colorful confetti-like sparks, wonder and anticipation mood. Watercolor picture book style. No text, no letters, no logos, no watermarks. Compact horizontal composition, child-friendly.",
  },
  {
    id: "book",
    outputPath: "public/images/icons/book.webp",
    width: 64,
    height: 64,
    prompt:
      "A cute simple icon illustration of an open children's picture book with a small glowing star above it and colorful illustrated pages. Flat icon style with soft shadows, purple and gold accent colors, rounded corners. White or transparent background feeling. No text, no letters, no logos. Square composition, clean and friendly.",
  },
  {
    id: "palette",
    outputPath: "public/images/icons/palette.webp",
    width: 64,
    height: 64,
    prompt:
      "A cute simple icon illustration of an artist's paint palette with colorful paint dots in rainbow colors and a small paintbrush. Flat icon style with soft shadows, vibrant but gentle colors, rounded friendly shapes. Clean icon feeling. No text, no letters, no logos. Square composition, child-friendly.",
  },
  {
    id: "shield",
    outputPath: "public/images/icons/shield.webp",
    width: 64,
    height: 64,
    prompt:
      "A cute simple icon illustration of a friendly shield with a small heart or star in the center, representing safety and protection. Soft blue and gold colors, rounded shield shape, flat icon style with gentle shadow. Warm and reassuring mood. No text, no letters, no logos. Square composition, child-friendly.",
  },
  {
    id: "star",
    outputPath: "public/images/icons/star.webp",
    width: 48,
    height: 48,
    prompt:
      "A cute glowing five-pointed star icon with soft golden light radiating from it, small sparkle dots around it. Flat icon style, warm gold and yellow colors, rounded friendly shape. Clean simple icon. No text, no letters, no logos. Square compact composition, child-friendly.",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  const assetFilter = (() => {
    const idx = args.indexOf("--asset");
    return idx !== -1 ? args[idx + 1] : null;
  })();

  if (!isDryRun && !isWrite) {
    console.error("Usage: node scripts/generate-ui-assets.js --dry-run | --write [--asset <id>]");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[error] OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  // Configure proxy if available (required in environments with a corporate proxy)
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  if (proxyUrl) {
    console.log(`[proxy] Using ${proxyUrl}`);
  }

  const client = new OpenAI({
    apiKey,
    ...(httpAgent ? { httpAgent } : {}),
  });
  const targets = assetFilter ? ASSETS.filter((a) => a.id === assetFilter) : ASSETS;

  if (targets.length === 0) {
    console.error(`[error] No asset found with id: ${assetFilter}`);
    process.exit(1);
  }

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] T7-2: Generate ${targets.length} UI asset(s)`);
  console.log();

  for (const asset of targets) {
    const outAbs = resolve(ROOT, asset.outputPath);
    const outDir = dirname(outAbs);

    console.log(`  [${asset.id}] → ${asset.outputPath} (${asset.width}×${asset.height})`);

    if (isDryRun) {
      console.log(`    prompt: ${asset.prompt.slice(0, 80)}...`);
      console.log(`    [DRY-RUN] Would generate and write.`);
      continue;
    }

    // Generate via OpenAI Images API
    console.log(`    Calling OpenAI Images API (gpt-image-1, 1024×1024)...`);
    let imageBuffer;
    try {
      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: asset.prompt,
        n: 1,
        size: "1024x1024",
        output_format: "png",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No b64_json in response");
      }
      imageBuffer = Buffer.from(b64, "base64");
      console.log(`    Generated (${imageBuffer.length} bytes raw PNG).`);
    } catch (err) {
      console.error(`    [ERROR] Generation failed for ${asset.id}: ${err.message}`);
      continue;
    }

    // Resize + convert to WebP via sharp
    console.log(`    Resizing to ${asset.width}×${asset.height} and converting to WebP...`);
    let webpBuffer;
    try {
      webpBuffer = await sharp(imageBuffer)
        .resize(asset.width, asset.height, { fit: "cover", position: "centre" })
        .webp({ quality: 85, effort: 6 })
        .toBuffer();
      console.log(`    WebP size: ${Math.round(webpBuffer.length / 1024)} KB`);
    } catch (err) {
      console.error(`    [ERROR] sharp processing failed for ${asset.id}: ${err.message}`);
      continue;
    }

    // Write to disk
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(outAbs, webpBuffer);
    console.log(`    ✓ Written: ${asset.outputPath}`);
    console.log();
  }

  if (!isDryRun) {
    console.log("All assets processed. Review images before committing.");
  } else {
    console.log("[DRY-RUN] No files written. Re-run with --write to generate.");
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
