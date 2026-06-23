// 生成品質リグレッション・レポート（読み取り専用・生成コストなし）。
//
// 既存の books.storyQualityReport を集計し、issue code の頻度・ページ統計・
// テンプレ/モード/プラン別の内訳を出力する。--compare で指定日の前後を比較でき、
// デプロイ前後の品質変化（before/after）を1コマンドで確認できる。
//
// 使い方:
//   GOOGLE_APPLICATION_CREDENTIALS=<sa.json> node scripts/quality-report.js [options]
// options:
//   --days N            直近N日を対象（デフォルト 30）
//   --since YYYY-MM-DD  開始日（--days より優先）
//   --until YYYY-MM-DD  終了日
//   --limit N           取得上限（デフォルト 1000）
//   --mode <mode>       creationMode で絞り込み（fixed_template / guided_ai / original_ai）
//   --compare YYYY-MM-DD  この日を境に before/after を分けて比較表示
//   --md                Markdown 形式で出力
const { createRequire } = require("module");
const { resolve } = require("path");
const { readFileSync } = require("fs");

const fnRequire = createRequire(resolve(__dirname, "../functions/package.json"));
const { initializeApp, cert, getApps } = fnRequire("firebase-admin/app");
const { getFirestore } = fnRequire("firebase-admin/firestore");

function parseArgs(argv) {
  const args = { days: 30, limit: 1000, md: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--md") args.md = true;
    else if (a === "--days") args.days = Number(argv[++i]);
    else if (a === "--since") args.since = argv[++i];
    else if (a === "--until") args.until = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--mode") args.mode = argv[++i];
    else if (a === "--compare") args.compare = argv[++i];
  }
  return args;
}

function dayMs(dateStr) {
  return new Date(`${dateStr}T00:00:00+09:00`).getTime();
}

function initAdmin() {
  const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!cred) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set.");
  const sa = JSON.parse(readFileSync(cred, "utf8"));
  if (getApps().length === 0) initializeApp({ credential: cert(sa), projectId: sa.project_id });
  return getFirestore();
}

function emptyAgg() {
  return {
    total: 0,
    ok: 0,
    issueCodeCounts: {}, // code -> #books that have >=1 of it
    issueCodeTotal: {}, // code -> total occurrences
    severity: { warning: 0, error: 0 },
    sumChars: 0,
    sumSentences: 0,
    minChars: Infinity,
    byTemplate: {}, // templateId -> {total, ok}
    byMode: {}, // creationMode -> {total, ok}
    byPlan: {}, // productPlan -> {total, ok}
  };
}

function addBook(agg, book) {
  const report = book.storyQualityReport;
  if (!report || !Array.isArray(report.issues)) return;
  agg.total += 1;
  if (report.ok) agg.ok += 1;

  const seenCodes = new Set();
  for (const issue of report.issues) {
    agg.issueCodeTotal[issue.code] = (agg.issueCodeTotal[issue.code] || 0) + 1;
    if (issue.severity === "error") agg.severity.error += 1;
    else agg.severity.warning += 1;
    if (!seenCodes.has(issue.code)) {
      seenCodes.add(issue.code);
      agg.issueCodeCounts[issue.code] = (agg.issueCodeCounts[issue.code] || 0) + 1;
    }
  }

  const s = report.summary || {};
  if (typeof s.averageCharsPerPage === "number") agg.sumChars += s.averageCharsPerPage;
  if (typeof s.averageSentencesPerPage === "number") agg.sumSentences += s.averageSentencesPerPage;
  if (typeof s.minCharsPerPage === "number") agg.minChars = Math.min(agg.minChars, s.minCharsPerPage);

  const bump = (map, key) => {
    const k = key || "(unknown)";
    map[k] = map[k] || { total: 0, ok: 0 };
    map[k].total += 1;
    if (report.ok) map[k].ok += 1;
  };
  bump(agg.byTemplate, book.templateId);
  bump(agg.byMode, book.creationMode);
  bump(agg.byPlan, book.productPlan);
}

function pct(n, d) {
  return d === 0 ? "0%" : `${((100 * n) / d).toFixed(0)}%`;
}

function renderAgg(label, agg) {
  const lines = [];
  lines.push(`## ${label}`);
  lines.push("");
  if (agg.total === 0) {
    lines.push("_対象データなし_");
    lines.push("");
    return lines.join("\n");
  }
  lines.push(`- 対象冊数: **${agg.total}**`);
  lines.push(`- 合格(ok): ${agg.ok} (${pct(agg.ok, agg.total)})`);
  lines.push(
    `- 平均文字/ページ: ${(agg.sumChars / agg.total).toFixed(1)} / 平均文/ページ: ${(agg.sumSentences / agg.total).toFixed(2)} / 最小文字/ページ: ${agg.minChars === Infinity ? "-" : agg.minChars}`
  );
  lines.push(`- issue 総数: warning ${agg.severity.warning} / error ${agg.severity.error}`);
  lines.push("");
  lines.push("### 頻出 issue code（該当冊数 / 出現総数）");
  lines.push("");
  lines.push("| code | 冊数 | 該当率 | 出現総数 |");
  lines.push("|---|---:|---:|---:|");
  const sorted = Object.entries(agg.issueCodeCounts).sort((a, b) => b[1] - a[1]);
  for (const [code, books] of sorted.slice(0, 25)) {
    lines.push(`| ${code} | ${books} | ${pct(books, agg.total)} | ${agg.issueCodeTotal[code]} |`);
  }
  lines.push("");
  const renderGroup = (title, map) => {
    lines.push(`### ${title}別`);
    lines.push("");
    lines.push("| key | 冊数 | ok率 |");
    lines.push("|---|---:|---:|");
    for (const [k, v] of Object.entries(map).sort((a, b) => b[1].total - a[1].total)) {
      lines.push(`| ${k} | ${v.total} | ${pct(v.ok, v.total)} |`);
    }
    lines.push("");
  };
  renderGroup("テンプレ", agg.byTemplate);
  renderGroup("作成モード", agg.byMode);
  renderGroup("プラン", agg.byPlan);
  return lines.join("\n");
}

(async () => {
  const args = parseArgs(process.argv);
  const db = initAdmin();

  const sinceMs = args.since ? dayMs(args.since) : Date.now() - args.days * 24 * 60 * 60 * 1000;
  const untilMs = args.until ? dayMs(args.until) + 24 * 60 * 60 * 1000 : Date.now();

  let q = db
    .collection("books")
    .where("createdAt", ">=", new Date(sinceMs))
    .where("createdAt", "<=", new Date(untilMs))
    .orderBy("createdAt", "desc")
    .limit(args.limit);

  const snap = await q.get();
  const books = [];
  snap.forEach((doc) => {
    const d = doc.data();
    if (args.mode && d.creationMode !== args.mode) return;
    if (!d.storyQualityReport) return;
    books.push(d);
  });

  const header = [
    `# 生成品質レポート`,
    "",
    `- 期間: ${new Date(sinceMs).toISOString().slice(0, 10)} 〜 ${new Date(untilMs).toISOString().slice(0, 10)}`,
    `- storyQualityReport を持つ対象冊数: ${books.length}${args.mode ? ` (mode=${args.mode})` : ""}`,
    "",
  ].join("\n");

  let body;
  if (args.compare) {
    const splitMs = dayMs(args.compare);
    const before = emptyAgg();
    const after = emptyAgg();
    for (const b of books) {
      const ts = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      addBook(ts < splitMs ? before : after, b);
    }
    body = [
      renderAgg(`Before（〜${args.compare}）`, before),
      renderAgg(`After（${args.compare}〜）`, after),
    ].join("\n");
  } else {
    const agg = emptyAgg();
    for (const b of books) addBook(agg, b);
    body = renderAgg("全期間集計", agg);
  }

  console.log(header + body);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
