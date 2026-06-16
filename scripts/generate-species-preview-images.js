/**
 * generate-species-preview-images.js
 *
 * なかよしキャラ作成ウィザードの「どんな動物・生き物にする？」選択肢に表示する
 * 種族プレビュー画像を Replicate (FLUX-2-Pro) で生成し、Firebase Storage にアップロードする。
 *
 * Usage:
 *   node scripts/generate-species-preview-images.js --dry-run   # プロンプト確認のみ
 *   node scripts/generate-species-preview-images.js --generate  # 生成 → Storage アップロード
 *   node scripts/generate-species-preview-images.js --generate --species dog,cat  # 個別指定
 *
 * Prerequisites:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/story-gen-8a769-adminsdk.json
 *   REPLICATE_API_TOKEN が .env.local または環境変数に設定済み
 */

const { createRequire } = require("module");
const { resolve, existsSync, readFileSync } = require("path");

// node の組み込みモジュール
const path = require("path");
const fs = require("fs");

const ROOT = resolve(__dirname, "..");

// functions/ の node_modules から firebase-admin と replicate を読み込む
const functionsRequire = createRequire(resolve(ROOT, "functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getStorage } = functionsRequire("firebase-admin/storage");
const Replicate = (() => {
  const mod = functionsRequire("replicate");
  return mod.default ?? mod;
})();

const STORAGE_BUCKET = "story-gen-8a769.firebasestorage.app";
const STORAGE_PREFIX = "companion-species-previews";
const MODEL = "black-forest-labs/flux-2-pro";

// ─── .env.local からトークン読み込み ────────────────────────────────────────

function loadEnvLocal() {
  const envPath = resolve(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

// ─── 種族定義とプロンプト ─────────────────────────────────────────────────────

const STYLE_BASE =
  "Cute soft children's picture book illustration, " +
  "pastel watercolor style, white background, " +
  "centered full-body character, simple round friendly shapes, " +
  "no text, no letters, no watermarks.";

const SPECIES = [
  {
    id: "dog",
    label: "いぬ",
    prompt: `A small cute fluffy puppy with big round eyes, sitting and looking forward with a happy expression. ${STYLE_BASE}`,
  },
  {
    id: "cat",
    label: "ねこ",
    prompt: `A small cute kitten with big round eyes and a curled tail, sitting gracefully with a gentle smile. ${STYLE_BASE}`,
  },
  {
    id: "rabbit",
    label: "うさぎ",
    prompt: `A small cute rabbit with long soft ears and big round eyes, sitting upright with a cheerful expression. ${STYLE_BASE}`,
  },
  {
    id: "bear",
    label: "くま",
    prompt: `A small cute chubby teddy bear cub with round ears and a gentle smile, sitting with arms slightly out. ${STYLE_BASE}`,
  },
  {
    id: "fox",
    label: "きつね",
    prompt: `A small cute fox kit with large ears, a fluffy tail, and bright friendly eyes, sitting with a playful expression. ${STYLE_BASE}`,
  },
  {
    id: "dragon",
    label: "ドラゴン",
    prompt: `A small cute baby dragon with tiny wings, round eyes, and a friendly toothy grin, sitting with a playful pose. ${STYLE_BASE}`,
  },
  {
    id: "robot",
    label: "ロボット",
    prompt: `A small cute friendly round robot with big glowing round eyes, a warm smile panel, and tiny antenna, standing upright. ${STYLE_BASE}`,
  },
  {
    id: "fairy",
    label: "妖精",
    prompt: `A small cute fairy with delicate transparent wings, big sparkling eyes, and a warm smile, hovering gently. ${STYLE_BASE}`,
  },
  {
    id: "unicorn",
    label: "ユニコーン",
    prompt: `A small cute baby unicorn with a soft pastel-colored mane, a glowing spiral horn, and big gentle eyes, standing with a happy expression. ${STYLE_BASE}`,
  },
  {
    id: "monster",
    label: "モンスター",
    prompt: `A small cute friendly monster with round colorful body, big warm eyes, and a happy grin, looking approachable and non-threatening. ${STYLE_BASE}`,
  },
];

// ─── Firebase Admin 初期化 ────────────────────────────────────────────────────

function initFirebase() {
  if (getApps().length > 0) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS が未設定か、ファイルが見つかりません。\n" +
      "  export GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/story-gen-8a769-adminsdk.json"
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf8"));
  initializeApp({ credential: cert(serviceAccount), storageBucket: STORAGE_BUCKET });
}

// ─── Storage アップロード ─────────────────────────────────────────────────────

async function uploadToStorage(speciesId, buffer) {
  const storage = getStorage();
  const bucket = storage.bucket(STORAGE_BUCKET);
  const filename = `${STORAGE_PREFIX}/${speciesId}.png`;
  const file = bucket.file(filename);
  const token = require("crypto").randomUUID();

  await file.save(buffer, {
    contentType: "image/png",
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
}

// ─── Replicate 生成 ───────────────────────────────────────────────────────────

async function generateImage(replicate, prompt) {
  const output = await replicate.run(MODEL, {
    input: {
      prompt,
      aspect_ratio: "1:1",
      output_format: "png",
      num_outputs: 1,
    },
  });

  // output は URL の配列または ReadableStream の配列
  const item = Array.isArray(output) ? output[0] : output;
  const url = typeof item === "string" ? item : item?.url?.() ?? String(item);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── companions-utils.ts の imageUrl を更新 ──────────────────────────────────

function updateCompanionsUtils(urlMap) {
  const utilsPath = resolve(ROOT, "src/app/(app)/companions/companions-utils.ts");
  let src = fs.readFileSync(utilsPath, "utf8");

  for (const [speciesId, url] of Object.entries(urlMap)) {
    // { value: "dog", label: "いぬ", emoji: "🐕", en: "dog" }
    // → { value: "dog", label: "いぬ", emoji: "🐕", en: "dog", imageUrl: "https://..." }
    const pattern = new RegExp(
      `(\\{ value: "${speciesId}", label: "[^"]+", emoji: "[^"]+", en: "[^"]+")(\\s*\\})`,
      "g"
    );
    const replacement = `$1, imageUrl: "${url}"$2`;
    const updated = src.replace(pattern, replacement);
    if (updated === src) {
      console.warn(`  [WARN] Could not patch entry for species "${speciesId}" — already has imageUrl or pattern mismatch`);
    } else {
      src = updated;
      console.log(`  ✓ ${speciesId}: imageUrl 追加`);
    }
  }

  fs.writeFileSync(utilsPath, src, "utf8");
  console.log(`\n✅ companions-utils.ts を更新しました: ${utilsPath}`);
}

// ─── メイン ──────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isGenerate = args.includes("--generate");
  const speciesArg = args.find((a) => a.startsWith("--species="))?.replace("--species=", "")
    ?? (args[args.indexOf("--species") + 1] !== undefined && !args[args.indexOf("--species") + 1].startsWith("--")
        ? args[args.indexOf("--species") + 1]
        : null);
  const speciesFilter = speciesArg ? speciesArg.split(",").map((s) => s.trim()) : null;

  if (!isDryRun && !isGenerate) {
    console.log(
      "Usage:\n" +
      "  node scripts/generate-species-preview-images.js --dry-run\n" +
      "  node scripts/generate-species-preview-images.js --generate\n" +
      "  node scripts/generate-species-preview-images.js --generate --species dog,cat"
    );
    process.exit(1);
  }

  const targets = speciesFilter
    ? SPECIES.filter((s) => speciesFilter.includes(s.id))
    : SPECIES;

  if (targets.length === 0) {
    console.error(`[error] 指定された種族が見つかりません: ${speciesFilter}`);
    process.exit(1);
  }

  // ── Dry-run ──
  if (isDryRun) {
    console.log(`\n[DRY-RUN] ${targets.length} 種族のプロンプトを確認します:\n`);
    for (const s of targets) {
      console.log(`▶ ${s.id} (${s.label})`);
      console.log(`  ${s.prompt}\n`);
    }
    return;
  }

  // ── Generate ──
  const env = loadEnvLocal();
  const replicateToken = process.env.REPLICATE_API_TOKEN ?? env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    console.error("[error] REPLICATE_API_TOKEN が未設定です (.env.local または環境変数)");
    process.exit(1);
  }

  initFirebase();
  const replicate = new Replicate({ auth: replicateToken });

  console.log(`\n🎨 ${targets.length} 種族の画像を生成します (model: ${MODEL})\n`);

  const urlMap = {};
  for (const species of targets) {
    process.stdout.write(`  [${species.id}] 生成中...`);
    try {
      const buffer = await generateImage(replicate, species.prompt);
      process.stdout.write(` ✓ 生成完了 → Storage にアップロード中...`);
      const url = await uploadToStorage(species.id, buffer);
      urlMap[species.id] = url;
      console.log(` ✓`);
      console.log(`    URL: ${url}`);
    } catch (err) {
      console.log(` ✗ 失敗`);
      console.error(`    ${err.message}`);
    }
  }

  if (Object.keys(urlMap).length === 0) {
    console.error("\n[error] 全て失敗しました。");
    process.exit(1);
  }

  console.log(`\n📝 companions-utils.ts を更新しています...`);
  updateCompanionsUtils(urlMap);

  console.log("\n✨ 完了！次のステップ:");
  console.log("  1. npm run build でビルドエラーがないか確認");
  console.log("  2. コンパニオン作成ウィザードのUIを更新（create/page.tsx の種族ピッカー）");
  console.log("  3. git add src/app/(app)/companions/companions-utils.ts && git commit");
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
