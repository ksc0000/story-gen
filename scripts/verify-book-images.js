/**
 * verify-book-images.js
 *
 * 生成済み絵本の画像をローカルにダウンロードし、Claude が目視確認できる形式で出力する。
 *
 * Usage:
 *   node scripts/verify-book-images.js <bookId> [options]
 *   node scripts/verify-book-images.js --latest [options]
 *
 * Options:
 *   --check=zoo               動物園シーン確認（sandbox/playground リークなし）
 *   --check=character         キャラクター一貫性確認（カバー/ページで外見が一致するか）
 *   --check=no-text           テキストなし確認（画像内に文字が写り込んでいないか）
 *   --check=all               全チェック実行
 *   --out=<dir>               画像保存先ディレクトリ（デフォルト: /tmp/story-gen-verify/<bookId>）
 *   --user=<userId>           --latest 使用時にユーザーを限定する
 *
 * 前提:
 *   GOOGLE_APPLICATION_CREDENTIALS に story-gen-8a769 のサービスアカウント JSON を指定すること
 *
 * Example:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/sa.json node scripts/verify-book-images.js M4zqk5RIAf6whchzNhNA --check=zoo
 *   GOOGLE_APPLICATION_CREDENTIALS=~/sa.json node scripts/verify-book-images.js --latest --check=all
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync, mkdirSync, createWriteStream } = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");
const os = require("os");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID = "story-gen-8a769";

// ── 確認観点の定義 ──────────────────────────────────────────────────────────────

const CHECK_CRITERIA = {
  zoo: [
    "✅ 動物園の要素（檻・動物・zoo パス）が画像に見える",
    "❌ 砂場（sandbox）・遊具・公園が写っていない",
    "❌ 屋内の部屋・家庭的な背景が写っていない",
  ],
  character: [
    "✅ カバーとページで子どもの顔・髪型・体型が一致している",
    "✅ 同じ登場キャラクター（動物など）がページ間で外見が一致している",
    "❌ ページごとにキャラクターの外見が大きく変わっていない",
  ],
  "no-text": [
    "❌ 画像内に読める文字・看板・ロゴが写っていない",
    "❌ タイトルや説明文が画像に重なっていない",
  ],
};

// ── ユーティリティ ──────────────────────────────────────────────────────────────

function parseArgs(args) {
  const result = { bookId: null, checks: [], outDir: null, userId: null, latest: false };

  for (const arg of args) {
    if (arg === "--latest") {
      result.latest = true;
    } else if (arg.startsWith("--check=")) {
      const val = arg.slice("--check=".length);
      result.checks = val === "all" ? Object.keys(CHECK_CRITERIA) : [val];
    } else if (arg.startsWith("--out=")) {
      result.outDir = arg.slice("--out=".length);
    } else if (arg.startsWith("--user=")) {
      result.userId = arg.slice("--user=".length);
    } else if (!arg.startsWith("--")) {
      result.bookId = arg;
    }
  }

  return result;
}

function loadServiceAccount() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath || !existsSync(credentialPath)) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS が未設定またはファイルが見つかりません。\n" +
      "例: export GOOGLE_APPLICATION_CREDENTIALS=~/path/to/sa.json"
    );
  }
  const parsed = JSON.parse(readFileSync(credentialPath, "utf8"));
  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKey = parsed.private_key || parsed.privateKey;
  const projectId = parsed.project_id || parsed.projectId;
  if (!clientEmail || !privateKey || !projectId) {
    throw new Error("サービスアカウント JSON に必要なキーがありません。");
  }
  if (projectId !== TARGET_PROJECT_ID) {
    throw new Error(`プロジェクト ID が一致しません: 期待=${TARGET_PROJECT_ID} 実際=${projectId}`);
  }
  return { clientEmail, privateKey, projectId };
}

function initFirestore(serviceAccount) {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId });
  }
  return getFirestore();
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const protocol = url.startsWith("https://") ? https : http;

    const request = protocol.get(url, (response) => {
      // Firebase Storage の signed URL はリダイレクトする場合がある
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    });

    request.on("error", (err) => {
      file.close();
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`タイムアウト: ${url}`));
    });
  });
}

// ── メイン処理 ─────────────────────────────────────────────────────────────────

async function getLatestBookId(db, userId) {
  let query = db.collection("books").orderBy("createdAt", "desc").limit(10);
  if (userId) {
    query = db.collection("books").where("userId", "==", userId).orderBy("createdAt", "desc").limit(5);
  }
  const snap = await query.get();
  if (snap.empty) throw new Error("絵本が見つかりませんでした。");

  // completed または partial_completed のものを優先
  const completed = snap.docs.find(
    (d) => d.data().status === "completed" || d.data().status === "partial_completed"
  );
  const doc = completed || snap.docs[0];
  console.log(`[最新Book] ${doc.id} (status: ${doc.data().status})`);
  return doc.id;
}

async function fetchBookData(db, bookId) {
  const bookDoc = await db.collection("books").doc(bookId).get();
  if (!bookDoc.exists) throw new Error(`Book ${bookId} が見つかりません。`);
  const bookData = bookDoc.data();

  const pagesSnap = await db.collection("books").doc(bookId).collection("pages").orderBy("pageNumber").get();
  const pages = pagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return { bookData, pages };
}

async function downloadImages(bookId, bookData, pages, outDir) {
  mkdirSync(outDir, { recursive: true });

  const downloaded = [];

  // カバー画像
  if (bookData.coverImageUrl) {
    const ext = bookData.coverImageUrl.includes(".png") ? "png" : "jpg";
    const destPath = path.join(outDir, `cover.${ext}`);
    process.stdout.write(`  ⬇ カバー ... `);
    try {
      await downloadFile(bookData.coverImageUrl, destPath);
      console.log("✅");
      downloaded.push({ label: "カバー", pageNumber: -1, path: destPath, imageUrl: bookData.coverImageUrl });
    } catch (e) {
      console.log(`❌ (${e.message})`);
    }
  } else {
    console.log("  ⚠ coverImageUrl なし");
  }

  // ページ画像
  for (const page of pages) {
    const num = page.pageNumber ?? page.id;
    if (!page.imageUrl) {
      console.log(`  ⚠ Page ${num}: imageUrl なし (status: ${page.status})`);
      continue;
    }
    const ext = page.imageUrl.includes(".png") ? "png" : "jpg";
    const destPath = path.join(outDir, `page_${String(num).padStart(2, "0")}.${ext}`);
    process.stdout.write(`  ⬇ Page ${num} ... `);
    try {
      await downloadFile(page.imageUrl, destPath);
      console.log("✅");
      downloaded.push({
        label: `Page ${num}`,
        pageNumber: num,
        path: destPath,
        imageUrl: page.imageUrl,
        imagePrompt: page.imagePrompt,
        inputReferenceCount: page.inputReferenceCount ?? 0,
        usedCharacterReference: page.usedCharacterReference ?? false,
        imageModel: page.imageModel,
        fallbackUsed: page.fallbackUsed ?? false,
      });
    } catch (e) {
      console.log(`❌ (${e.message})`);
    }
  }

  return downloaded;
}

function printReport(bookId, bookData, pages, downloaded, checks, outDir) {
  console.log("\n" + "═".repeat(70));
  console.log("📚 絵本画像検証レポート");
  console.log("═".repeat(70));
  console.log(`Book ID   : ${bookId}`);
  console.log(`Status    : ${bookData.status}`);
  console.log(`Mode      : ${bookData.creationMode}`);
  console.log(`Template  : ${bookData.templateId ?? "(なし)"}`);
  console.log(`Consistency: ${bookData.characterConsistencyMode ?? "(未設定)"}`);
  console.log(`Reference  : ${bookData.childProfileSnapshot?.visualProfile?.referenceImageUrl ? "あり" : "なし"}`);
  console.log(`出力先    : ${outDir}`);
  console.log(`ダウンロード: ${downloaded.length} 枚`);

  console.log("\n" + "─".repeat(70));
  console.log("🖼  画像ファイル一覧（Claude に Read させるパス）");
  console.log("─".repeat(70));
  for (const img of downloaded) {
    console.log(`\n[${img.label}]`);
    console.log(`  ファイル: ${img.path}`);
    if (img.inputReferenceCount !== undefined) {
      console.log(`  参照画像使用: ${img.usedCharacterReference} (count: ${img.inputReferenceCount})`);
    }
    if (img.imageModel) {
      console.log(`  モデル: ${img.imageModel}${img.fallbackUsed ? " (fallback)" : ""}`);
    }
    if (img.imagePrompt) {
      const truncated = img.imagePrompt.length > 200
        ? img.imagePrompt.slice(0, 200) + "..."
        : img.imagePrompt;
      console.log(`  プロンプト（先頭200字）: ${truncated}`);
    }
  }

  if (checks.length > 0) {
    console.log("\n" + "─".repeat(70));
    console.log("✅ Claude による目視確認チェックリスト");
    console.log("─".repeat(70));
    console.log("以下のファイルを Read ツールで開いて、各観点を確認してください:\n");

    for (const check of checks) {
      const criteria = CHECK_CRITERIA[check];
      if (!criteria) {
        console.log(`⚠ 未知のチェック種別: ${check}`);
        continue;
      }
      console.log(`【${check.toUpperCase()} チェック】`);
      for (const c of criteria) {
        console.log(`  ${c}`);
      }
      console.log();
    }

    console.log("─".repeat(70));
    console.log("確認すべきファイル:");
    for (const img of downloaded) {
      console.log(`  Read("${img.path}")`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("✔ レポート完了。上記パスの画像を Read ツールで確認してください。");
  console.log("═".repeat(70) + "\n");
}

// ── エントリポイント ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.bookId && !args.latest) {
    console.error(
      "使い方:\n" +
      "  node scripts/verify-book-images.js <bookId> [--check=zoo|character|no-text|all]\n" +
      "  node scripts/verify-book-images.js --latest [--check=all] [--user=<userId>]"
    );
    process.exit(1);
  }

  const serviceAccount = loadServiceAccount();
  const db = initFirestore(serviceAccount);

  const bookId = args.latest ? await getLatestBookId(db, args.userId) : args.bookId;
  const { bookData, pages } = await fetchBookData(db, bookId);

  if (bookData.status === "generating") {
    console.log(`⏳ Book ${bookId} はまだ生成中です (progress: ${bookData.progress}%)。`);
    process.exit(0);
  }

  const outDir = args.outDir ?? path.join(os.tmpdir(), "story-gen-verify", bookId);

  console.log(`\n📥 画像をダウンロード中... → ${outDir}`);
  const downloaded = await downloadImages(bookId, bookData, pages, outDir);

  printReport(bookId, bookData, pages, downloaded, args.checks, outDir);
}

main().catch((err) => {
  console.error("[エラー]", err instanceof Error ? err.message : err);
  process.exit(1);
});
