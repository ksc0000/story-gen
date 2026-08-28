import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TARGET_DIRECTORIES = [
  'public/images/styles',
  'public/images/templates',
  'public/images/companions/patterns',
];

const MAX_DIMENSION = 640;
const WEBP_QUALITY = 80;

async function processDirectory(relDir) {
  const fullDir = path.join(ROOT, relDir);
  if (!fs.existsSync(fullDir)) {
    console.warn(`Directory not found: ${relDir}`);
    return { origTotal: 0, newTotal: 0, count: 0 };
  }

  const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.png'));
  let origTotal = 0;
  let newTotal = 0;

  console.log(`\n=== Processing ${relDir} (${files.length} PNGs) ===`);

  for (const file of files) {
    const origPath = path.join(fullDir, file);
    const webpName = file.replace(/\.png$/, '.webp');
    const webpPath = path.join(fullDir, webpName);

    const origStats = fs.statSync(origPath);
    origTotal += origStats.size;

    const pipeline = sharp(origPath)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY });

    const buffer = await pipeline.toBuffer();
    fs.writeFileSync(webpPath, buffer);

    const newSize = buffer.length;
    newTotal += newSize;

    const reduction = ((1 - newSize / origStats.size) * 100).toFixed(1);
    console.log(
      `  ✓ ${file} (${(origStats.size / 1024 / 1024).toFixed(2)}MB) -> ${webpName} (${(newSize / 1024).toFixed(1)}KB, -${reduction}%)`
    );
  }

  const dirReduction = origTotal > 0 ? ((1 - newTotal / origTotal) * 100).toFixed(1) : '0';
  console.log(
    `Directory Total: ${(origTotal / 1024 / 1024).toFixed(2)}MB -> ${(newTotal / 1024 / 1024).toFixed(2)}MB (-${dirReduction}%)`
  );

  return { origTotal, newTotal, count: files.length };
}

async function main() {
  console.log('--- EhonAI App Image Asset Optimization (PNG -> WebP 640px q80) ---');
  let grandOrig = 0;
  let grandNew = 0;
  let grandCount = 0;

  for (const dir of TARGET_DIRECTORIES) {
    const res = await processDirectory(dir);
    grandOrig += res.origTotal;
    grandNew += res.newTotal;
    grandCount += res.count;
  }

  console.log('\n==================================================');
  const grandReduction = grandOrig > 0 ? ((1 - grandNew / grandOrig) * 100).toFixed(1) : '0';
  console.log(`Grand Total (${grandCount} assets):`);
  console.log(`  Original PNGs size : ${(grandOrig / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Optimized WebPs size: ${(grandNew / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Overall Reduction   : -${grandReduction}%`);
  console.log('==================================================\n');
}

main().catch((err) => {
  console.error('Optimization failed:', err);
  process.exit(1);
});
