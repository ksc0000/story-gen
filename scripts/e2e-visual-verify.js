/**
 * e2e-visual-verify.js
 *
 * 絵本エンドツーエンド自動検証。生成 → 待機 → ダウンロード → マニフェスト出力。
 * スクリプト完了後に Claude Code が Read ツールで各画像を目視評価し、Issue を自動作成する。
 *
 * Usage:
 *   node scripts/e2e-visual-verify.js [options]
 *
 * Options:
 *   --template=<id>       テンプレートID（デフォルト: fixed-first-zoo）
 *   --style=<id>          スタイルID（デフォルト: soft_watercolor）
 *   --with-reference      参照画像有効化（SMOKE_REFERENCE_IMAGE_URL 環境変数必須）
 *   --timeout=<sec>       タイムアウト秒数（デフォルト: 300）
 *   --out=<dir>           画像保存先（デフォルト: /tmp/story-gen-e2e/<runId>）
 *   --json                マニフェストを JSON 形式で出力
 *
 * 前提:
 *   GOOGLE_APPLICATION_CREDENTIALS: story-gen-8a769 サービスアカウント JSON
 *   SMOKE_REFERENCE_IMAGE_URL: --with-reference 使用時に必要
 */

"use strict";

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, readFileSync, writeFileSync, mkdirSync, createWriteStream } = require("fs");
const https = require("https");
const http  = require("http");
const path  = require("path");
const os    = require("os");

const functionsRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = functionsRequire("firebase-admin/app");
const { FieldValue, getFirestore }      = functionsRequire("firebase-admin/firestore");

const TARGET_PROJECT_ID  = "story-gen-8a769";
const POLL_INTERVAL_MS   = 8000;

// ────────────────────────────────────────────────────────────────────────────
// 絵本品質ルーブリック（Claude が目視評価に使う包括基準）
// ────────────────────────────────────────────────────────────────────────────
const QUALITY_RUBRIC = {
  // ── 1. テキスト混入 ────────────────────────────────────────────────────────
  text_intrusion: {
    id:       "text_intrusion",
    label:    "テキスト混入",
    severity: "high",
    category: "technical",
    description: "画像内に読める文字・看板・ラベル・ロゴが描写されている",
    checkPerImage: true,
    criteria: [
      "看板・標識・ポスターなどに読める文字が書かれていないか",
      "キャラクターの服・持ち物・背景物に文字が描かれていないか",
      "タイトル・字幕のようなテキストオーバーレイがないか",
    ],
  },

  // ── 2. キャラクター一貫性 ──────────────────────────────────────────────────
  character_consistency: {
    id:       "character_consistency",
    label:    "キャラクター一貫性",
    severity: "high",
    category: "quality",
    description: "主人公・サブキャラクターの外見がページ間で著しく変化している",
    checkPerImage: false,
    checkAcrossImages: true,
    criteria: [
      "カバーと全ページで主人公の顔・髪型・体型が一致しているか",
      "脇役キャラクター（動物・家族など）がページ間で外見が揃っているか",
      "同じシーンで繰り返し登場するキャラクターが一貫しているか",
    ],
  },

  // ── 3. シーン整合性 ───────────────────────────────────────────────────────
  scene_coherence: {
    id:       "scene_coherence",
    label:    "シーン整合性",
    severity: "high",
    category: "quality",
    description: "テンプレートが意図する場所・状況と画像が一致していない",
    checkPerImage: true,
    criteria: [
      "テンプレートが指定する場所（動物園・誕生日・就寝など）が描かれているか",
      "前後のページでストーリーの流れとして自然な場面遷移があるか",
      "意図しない場所（砂場・別の建物など）が混入していないか",
    ],
  },

  // ── 4. スタイル一貫性 ─────────────────────────────────────────────────────
  style_consistency: {
    id:       "style_consistency",
    label:    "スタイル一貫性",
    severity: "medium",
    category: "quality",
    description: "選択した画風がページ間で一貫していない、または画風が著しくバラバラ",
    checkPerImage: false,
    checkAcrossImages: true,
    criteria: [
      "カバーと全ページで同じ画風（水彩・アニメ・クレヨンなど）が維持されているか",
      "色調・タッチ・線の太さが全体で統一されているか",
      "一部のページだけ明らかに異なる画風になっていないか",
    ],
  },

  // ── 5. 年齢適合性・安全性 ─────────────────────────────────────────────────
  age_appropriateness: {
    id:       "age_appropriateness",
    label:    "年齢適合性・安全性",
    severity: "critical",
    category: "safety",
    description: "幼い子ども（0〜8歳）にとって不適切・怖い・混乱させる表現がある",
    checkPerImage: true,
    criteria: [
      "怖い顔・暗い雰囲気・ホラー的要素がないか",
      "暴力・流血・危険な行為が描かれていないか",
      "子どもが混乱するような過度に複雑・抽象的な表現がないか",
      "不自然に変形した人体・不気味な表現（uncanny valley）がないか",
    ],
  },

  // ── 6. 感情的温かみ ───────────────────────────────────────────────────────
  emotional_warmth: {
    id:       "emotional_warmth",
    label:    "感情的温かみ",
    severity: "medium",
    category: "quality",
    description: "絵本として子どもが読んで楽しい・温かい雰囲気が不足している",
    checkPerImage: true,
    criteria: [
      "キャラクターの表情が明るく・親しみやすいか",
      "色調が暖かく・明るく・子どもに向けた雰囲気があるか",
      "冷たい・暗い・無表情な雰囲気になっていないか",
    ],
  },

  // ── 7. 構図・可読性 ──────────────────────────────────────────────────────
  composition_readability: {
    id:       "composition_readability",
    label:    "構図・視覚的明瞭さ",
    severity: "medium",
    category: "quality",
    description: "構図が複雑すぎてメインキャラクター・シーンが伝わりにくい",
    checkPerImage: true,
    criteria: [
      "主人公・メインの行動が画面内で明確に際立っているか",
      "背景が主題を邪魔するほど込み入っていないか",
      "絵本のページとして十分なマージン・空白があるか",
    ],
  },

  // ── 8. カバーの訴求力 ────────────────────────────────────────────────────
  cover_appeal: {
    id:       "cover_appeal",
    label:    "カバーの訴求力",
    severity: "medium",
    category: "quality",
    description: "カバー画像が絵本の顔として魅力的でない・内容を代表していない",
    checkPerImage: false,
    checkCoverOnly: true,
    criteria: [
      "カバーだけ見て「読んでみたい」と思える魅力があるか",
      "物語の雰囲気・テーマが一目でわかるか",
      "主人公が中心に配置され、印象的なシーンになっているか",
    ],
  },

  // ── 9. 参照画像背景リーク ─────────────────────────────────────────────────
  reference_leakage: {
    id:       "reference_leakage",
    label:    "参照画像背景リーク",
    severity: "high",
    category: "technical",
    description: "子どもの参照写真の背景（砂場・部屋など）が生成画像に混入",
    checkPerImage: true,
    onlyWhenReference: true,
    criteria: [
      "参照写真の背景（砂場・室内など）が各ページに写り込んでいないか",
      "参照写真のポーズ・ライティングが不自然に引き継がれていないか",
    ],
  },

  // ── 10. ページ多様性 ─────────────────────────────────────────────────────
  page_diversity: {
    id:       "page_diversity",
    label:    "ページ多様性",
    severity: "high",
    category: "quality",
    description: "複数のページが同じ・または非常に似た画像になっている",
    checkPerImage: false,
    checkAcrossImages: true,
    criteria: [
      "各ページが異なるシーン・アングル・構図になっているか",
      "同一または酷似した画像が複数ページに使われていないか",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// スタイル定義
// ────────────────────────────────────────────────────────────────────────────
const STYLE_PROFILES = {
  soft_watercolor: {
    id: "soft_watercolor", name: "やさしい水彩",
    styleBible: "Japanese children's picture book watercolor style, soft warm colors, pale colors, gentle pigment blooms, hand-painted paper texture, cozy lighting, tender child-friendly atmosphere.",
    previewImageUrl: "/images/styles/soft_watercolor.png",
  },
  anime_storybook: {
    id: "anime_storybook", name: "わくわくアニメ風",
    styleBible: "Anime-inspired picture book style, expressive faces, sparkling eyes, lively framing, vivid but soft family-safe colors, warm fantasy energy.",
    previewImageUrl: "/images/styles/anime_storybook.png",
  },
  colorful_pop: {
    id: "colorful_pop", name: "カラフルポップ",
    styleBible: "Colorful pop picture book style, vivid joyful colors, friendly rounded forms, playful graphic energy, clear child-safe staging.",
    previewImageUrl: "/images/styles/colorful_pop.png",
  },
  classic_picture_book: {
    id: "classic_picture_book", name: "クラシック絵本",
    styleBible: "Classic picture book illustration, traditional fairytale warmth, detailed linework, painterly textures, timeless storybook atmosphere.",
    previewImageUrl: "/images/styles/classic_picture_book.png",
  },
  fluffy_pastel: {
    id: "fluffy_pastel", name: "ふんわりパステル",
    styleBible: "Fluffy pastel picture book style, soft rounded forms, airy colors, gentle edges, cute toddler-friendly design, plush and comforting mood.",
    previewImageUrl: "/images/styles/fluffy_pastel.png",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// テンプレート別 input
// ────────────────────────────────────────────────────────────────────────────
function buildTemplateInput(templateId) {
  const base = { childName: "SmokeKid", parentMessage: "きょうもすてきな一日だったね" };
  if (templateId.includes("zoo"))          return { ...base, place: "city zoo", familyMembers: "family" };
  if (templateId.includes("birthday"))     return { ...base, familyMembers: "family" };
  if (templateId.includes("brush-teeth")) return { childName: "Mika", parentMessage: "にこにこのえがおでおやすみなさい。" };
  if (templateId.includes("christmas"))    return { ...base, familyMembers: "family" };
  if (templateId.includes("sharing"))      return { ...base, lessonToTeach: "sharing" };
  return base;
}

// ────────────────────────────────────────────────────────────────────────────
// Firebase
// ────────────────────────────────────────────────────────────────────────────
function loadServiceAccount() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !existsSync(credPath))
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS が未設定またはファイルが見つかりません。");
  const p = JSON.parse(readFileSync(credPath, "utf8"));
  const clientEmail = p.client_email || p.clientEmail;
  const privateKey  = String(p.private_key || p.privateKey).replace(/\\n/g, "\n");
  const projectId   = p.project_id || p.projectId;
  if (!clientEmail || !privateKey || !projectId) throw new Error("SA JSON に必要なキーがありません。");
  if (projectId !== TARGET_PROJECT_ID) throw new Error(`Project ID 不一致: 期待=${TARGET_PROJECT_ID} 実際=${projectId}`);
  return { clientEmail, privateKey, projectId };
}

function initDb(sa) {
  if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.projectId });
  return getFirestore();
}

// ────────────────────────────────────────────────────────────────────────────
// Book 作成
// ────────────────────────────────────────────────────────────────────────────
function buildSeedTemplates() {
  try { return require("../functions/lib/seed-templates.js").SEED_TEMPLATES; } catch { return null; }
}

function resolvePageCount(seedTemplates, templateId) {
  const t = seedTemplates?.[templateId];
  const pages = t?.fixedStory?.pages;
  if (Array.isArray(pages) && [4,8,12].includes(pages.length)) return pages.length;
  if ([4,8,12].includes(t?.fixedStory?.pageCount)) return t.fixedStory.pageCount;
  return 4;
}

async function createBook(db, { templateId, styleProfile, referenceImageUrl, runId, mode }) {
  const isGuidedAi    = mode === "guided_ai";
  const nowMs         = Date.now();

  let pageCount, input, creationMode, theme, templateIdField;

  if (isGuidedAi) {
    // guided_ai モード: テンプレート不要、テーマ・ページ数を固定
    pageCount        = 8;
    creationMode     = "guided_ai";
    theme            = "fantasy";   // Firestore templates コレクションに存在するID
    templateIdField  = null;
    input = {
      childName:     "たっくん",
      theme:         "fantasy",
      parentMessage: "たっくん、きょうもすてきな一日だったね",
      ageYears:      3,
    };
  } else {
    const seedTemplates = buildSeedTemplates();
    pageCount        = resolvePageCount(seedTemplates, templateId);
    creationMode     = "fixed_template";
    theme            = templateId;
    templateIdField  = templateId;
    input            = buildTemplateInput(templateId);
  }

  const payload = {
    userId:                   `smoke-e2e-${runId}`,
    title:                    `[E2E-${mode ?? "fixed"}] ${isGuidedAi ? theme : templateId}`,
    theme,
    creationMode,
    productPlan:              "free",
    style:                    styleProfile.id,
    selectedStyleId:          styleProfile.id,
    selectedStyleName:        styleProfile.name,
    styleBible:               styleProfile.styleBible,
    stylePreviewImageUrl:     styleProfile.previewImageUrl,
    stylePreviewUsedAsReference: false,
    pageCount,
    status:                   "generating",
    progress:                 0,
    input,
    characterConsistencyMode: referenceImageUrl ? "all_pages" : "cover_only",
    createdAt:                FieldValue.serverTimestamp(),
    createdAtMs:              nowMs,
    updatedAt:                FieldValue.serverTimestamp(),
    updatedAtMs:              nowMs,
    expiresAt:                null,
    smokeTestMetadata: {
      isSmokeTest: true, suite: "e2e_visual_verify", runId,
      sourceScript: "scripts/e2e-visual-verify.js",
      templateId: templateIdField, mode: creationMode,
      withReference: !!referenceImageUrl, styleId: styleProfile.id,
    },
  };

  if (templateIdField) payload.templateId = templateIdField;

  if (referenceImageUrl) {
    payload.childProfileSnapshot = {
      displayName: "たっくん", nickname: "たっくん", age: 3,
      genderExpression: "neutral",
      personality: { traits: ["curious","friendly"], favoriteThings: ["animals","dinosaurs"] },
      visualProfile: {
        characterLook: "黒髪短髪の3歳の男の子、元気で明るい笑顔",
        signatureItem: "お気に入りのきょうりゅうのおもちゃ", colorMood: "warm and happy",
        referenceImageUrl, version: 1,
      },
    };
  }

  const ref = await db.collection("books").add(payload);
  return { bookId: ref.id, pageCount };
}

// ────────────────────────────────────────────────────────────────────────────
// ポーリング
// ────────────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pollUntilComplete(db, bookId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastProgress = -1;

  while (Date.now() < deadline) {
    const snap = await db.collection("books").doc(bookId).get();
    if (!snap.exists) throw new Error(`Book ${bookId} が見つかりません。`);
    const d = snap.data();

    if (d.progress !== lastProgress) {
      process.stdout.write(`\r  進行状況: ${d.progress ?? 0}% (${d.status})    `);
      lastProgress = d.progress;
    }

    if (d.status === "completed" || d.status === "partial_completed") {
      console.log(`\n  ✅ 生成完了: ${d.status}`);
      return d;
    }
    if (d.status === "failed")
      throw new Error(`生成失敗: ${d.failureReason ?? d.technicalErrorMessage ?? "unknown"}`);

    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`タイムアウト: ${timeoutMs/1000}秒 経過しても完了しませんでした。`);
}

// ────────────────────────────────────────────────────────────────────────────
// 画像ダウンロード
// ────────────────────────────────────────────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const proto = url.startsWith("https://") ? https : http;
    const req = proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { file.close(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", e => { file.close(); reject(e); });
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("DL timeout")); });
  });
}

async function downloadImages(db, bookId, bookData, outDir) {
  mkdirSync(outDir, { recursive: true });
  const results = [];

  if (bookData.coverImageUrl) {
    const dest = path.join(outDir, "cover.jpg");
    process.stdout.write("  ⬇ カバー ... ");
    try {
      await downloadFile(bookData.coverImageUrl, dest);
      console.log("✅");
      results.push({ type:"cover", label:"カバー", pageNumber:-1, localPath:dest,
        imageUrl: bookData.coverImageUrl });
    } catch(e) { console.log(`❌ (${e.message})`); }
  }

  const pagesSnap = await db.collection("books").doc(bookId)
    .collection("pages").orderBy("pageNumber").get();

  for (const doc of pagesSnap.docs) {
    const p = doc.data();
    const num = p.pageNumber ?? doc.id;
    if (!p.imageUrl) { console.log(`  ⚠ Page ${num}: imageUrl なし`); continue; }
    const dest = path.join(outDir, `page_${String(num).padStart(2,"0")}.jpg`);
    process.stdout.write(`  ⬇ Page ${num} ... `);
    try {
      await downloadFile(p.imageUrl, dest);
      console.log("✅");
      results.push({
        type:"page", label:`Page ${num}`, pageNumber:num, localPath:dest,
        imageUrl: p.imageUrl,
        imagePrompt: p.imagePrompt ? p.imagePrompt.slice(0,400) : null,
        inputReferenceCount:    p.inputReferenceCount ?? 0,
        usedCharacterReference: p.usedCharacterReference ?? false,
        imageModel:   p.imageModel ?? null,
        fallbackUsed: p.fallbackUsed ?? false,
        status:       p.status,
      });
    } catch(e) { console.log(`❌ (${e.message})`); }
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// マニフェスト出力
// ────────────────────────────────────────────────────────────────────────────
function buildManifest(opts, bookId, bookData, images) {
  const applicableRubric = Object.values(QUALITY_RUBRIC).filter(r => {
    if (r.onlyWhenReference && !opts.referenceImageUrl) return false;
    return true;
  });

  return {
    runId:       opts.runId,
    bookId,
    templateId:  opts.templateId,
    styleId:     opts.styleProfile.id,
    status:      bookData.status,
    characterConsistencyMode: bookData.characterConsistencyMode,
    withReference: !!opts.referenceImageUrl,
    imageCount:  images.length,
    outDir:      opts.outDir,
    rubric:      applicableRubric,
    images:      images.map(img => ({
      label:                  img.label,
      pageNumber:             img.pageNumber,
      localPath:              img.localPath,
      inputReferenceCount:    img.inputReferenceCount,
      usedCharacterReference: img.usedCharacterReference,
      imageModel:             img.imageModel,
      fallbackUsed:           img.fallbackUsed,
      promptSnippet:          img.imagePrompt,
    })),
  };
}

function printManifest(manifest, asJson) {
  if (asJson) { console.log(JSON.stringify(manifest, null, 2)); return; }

  console.log("\n" + "═".repeat(72));
  console.log("📚 E2E 視覚品質検証マニフェスト");
  console.log("═".repeat(72));
  console.log(`Run ID     : ${manifest.runId}`);
  console.log(`Book ID    : ${manifest.bookId}`);
  console.log(`Template   : ${manifest.templateId}`);
  console.log(`Style      : ${manifest.styleId}`);
  console.log(`Status     : ${manifest.status}`);
  console.log(`Reference  : ${manifest.withReference}`);
  console.log(`Images     : ${manifest.imageCount} 枚`);
  console.log(`出力先     : ${manifest.outDir}`);

  console.log("\n" + "─".repeat(72));
  console.log("🔍 Claude 品質評価ルーブリック（全 " + manifest.rubric.length + " 観点）");
  console.log("─".repeat(72));
  for (const r of manifest.rubric) {
    const sev = { critical:"🚨", high:"🔴", medium:"🟡", low:"🟢" }[r.severity] ?? "⚪";
    console.log(`\n${sev} [${r.id}] ${r.label}  (severity: ${r.severity})`);
    console.log(`   ${r.description}`);
    console.log("   確認項目:");
    for (const c of r.criteria) console.log(`     • ${c}`);
    if (r.checkCoverOnly)      console.log("   ※ カバーのみ確認");
    if (r.checkAcrossImages)   console.log("   ※ ページ間の比較が必要");
  }

  console.log("\n" + "─".repeat(72));
  console.log("🖼  ダウンロード済み画像（Read ツールで確認するパス）");
  console.log("─".repeat(72));
  for (const img of manifest.images) {
    console.log(`\n[${img.label}]`);
    console.log(`  localPath : ${img.localPath}`);
    console.log(`  ref使用   : ${img.usedCharacterReference} (count: ${img.inputReferenceCount ?? 0})`);
    if (img.imageModel) console.log(`  model     : ${img.imageModel}${img.fallbackUsed ? " (fallback)" : ""}`);
    if (img.promptSnippet) console.log(`  prompt    : ${img.promptSnippet.slice(0,120)}...`);
  }

  console.log("\n" + "─".repeat(72));
  console.log("📌 Claude Code 次アクション手順");
  console.log("─".repeat(72));
  console.log("1. 上記 localPath の画像を Read ツールで順番に開く");
  console.log("2. 各ルーブリック観点で問題を特定する");
  console.log("3. 問題ごとに GitHub Issue を作成する（gh issue create）");
  console.log("   - title: [E2E-QA] <観点> — <テンプレート> で検出");
  console.log("   - label: quality, illustration, e2e-qa");
  console.log("   - body: 観点・severity・再現条件・該当ページ・改善案");
  console.log("4. 問題がなければ「✅ 全観点 PASS」を報告する");

  console.log("\n" + "═".repeat(72));

  const manifestPath = path.join(manifest.outDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`💾 マニフェスト保存: ${manifestPath}\n`);
}

// ────────────────────────────────────────────────────────────────────────────
// 引数パース
// ────────────────────────────────────────────────────────────────────────────
function parseArgs(args) {
  const result = {
    templateId:    "fixed-first-zoo",
    styleId:       "soft_watercolor",
    mode:          null,   // null = fixed_template (デフォルト), "guided_ai" で guided_ai モード
    withReference: false,
    timeoutSec:    300,
    outDir:        null,
    asJson:        false,
  };
  for (const arg of args) {
    if (arg.startsWith("--template="))    result.templateId    = arg.slice("--template=".length);
    else if (arg.startsWith("--style="))  result.styleId       = arg.slice("--style=".length);
    else if (arg.startsWith("--mode="))   result.mode          = arg.slice("--mode=".length);
    else if (arg === "--with-reference")  result.withReference = true;
    else if (arg.startsWith("--timeout=")) result.timeoutSec   = Number(arg.slice("--timeout=".length));
    else if (arg.startsWith("--out="))    result.outDir        = arg.slice("--out=".length);
    else if (arg === "--json")            result.asJson        = true;
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// エントリポイント
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));

  const styleProfile = STYLE_PROFILES[args.styleId];
  if (!styleProfile)
    throw new Error(`未知のスタイル: ${args.styleId}。使用可能: ${Object.keys(STYLE_PROFILES).join(", ")}`);

  let referenceImageUrl = null;
  if (args.withReference) {
    referenceImageUrl = process.env.SMOKE_REFERENCE_IMAGE_URL;
    if (!referenceImageUrl)
      throw new Error("--with-reference には SMOKE_REFERENCE_IMAGE_URL 環境変数が必要です。");
  }

  const runId  = `e2e-${Date.now()}`;
  const outDir = args.outDir ?? path.join(os.tmpdir(), "story-gen-e2e", runId);
  const opts   = { templateId: args.templateId, styleProfile, referenceImageUrl, runId, outDir, mode: args.mode };

  const sa = loadServiceAccount();
  const db = initDb(sa);

  // Step 1: Book 作成
  console.log(`\n🚀 [Step 1] Book 作成 (template: ${args.templateId}, style: ${args.styleId})`);
  const { bookId, pageCount } = await createBook(db, opts);
  console.log(`  Book ID: ${bookId}  (予想ページ数: ${pageCount})`);

  // Step 2: 生成完了待ち
  console.log(`\n⏳ [Step 2] 生成待機中... (タイムアウト: ${args.timeoutSec}秒)`);
  const bookData = await pollUntilComplete(db, bookId, args.timeoutSec * 1000);

  // Step 3: 画像ダウンロード
  console.log(`\n📥 [Step 3] 画像ダウンロード → ${outDir}`);
  const images = await downloadImages(db, bookId, bookData, outDir);

  // Step 4: マニフェスト出力
  console.log(`\n📋 [Step 4] マニフェスト生成`);
  const manifest = buildManifest(opts, bookId, bookData, images);
  printManifest(manifest, args.asJson);
}

main().catch(err => {
  console.error("\n[エラー]", err instanceof Error ? err.message : err);
  process.exit(1);
});
