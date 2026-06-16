import { createRequire } from "module";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";

// firebase-admin is installed in functions/node_modules, not the repo root.
// Resolve it from functions/package.json (same pattern as the smoke scripts) so
// this script runs from the repo root.
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "../../functions/package.json"));
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

/**
 * compare-human-llm-reviews.mjs
 *
 * Fetches books with both human and LLM quality review data and performs
 * a comparison analysis to measure agreement and divergence.
 *
 * Usage:
 *   node scripts/analysis/compare-human-llm-reviews.mjs [options]
 *
 * Options:
 *   --limit <number>    Limit the number of books to fetch (default: 100)
 *   --format <string>   Output format: console (default), markdown, json
 *   --dry-run           Do not perform any writes (this script is read-only anyway)
 *   --help              Show this help
 */

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limitCount = limitArg ? Number(limitArg.split("=")[1]) : 100;
const formatArg = args.find((arg) => arg.startsWith("--format="));
const format = formatArg ? formatArg.split("=")[1] : "console";
const dryRun = args.includes("--dry-run");
const selfTest = args.includes("--self-test");
const showHelp = args.includes("--help") || args.includes("-h");

if (showHelp) {
  console.log(`
compare-human-llm-reviews.mjs — Human vs. LLM Auto Review Comparison

Usage:
  node scripts/analysis/compare-human-llm-reviews.mjs [options]

Options:
  --limit=<n>     Limit the number of books to process (default: 100)
  --format=<fmt>  Output format: console (default), markdown, json
  --dry-run       Run without side effects (this script is read-only)
  --self-test     Run built-in self-test suite
  --help          Show this help
`);
  process.exit(0);
}

function loadServiceAccount() {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(process.cwd(), "service-account.json");
  try {
    if (!existsSync(serviceAccountPath)) return null;
    const raw = readFileSync(serviceAccountPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function ensureAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    // Fallback to default credentials if running in a Google environment
    return initializeApp();
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const AXES = [
  "storyScore",
  "illustrationScore",
  "characterConsistencyScore",
  "personalizationScore",
  "safetyScore",
  "overallScore",
];

const ISSUE_AREAS = ["story", "illustration", "character", "personalization", "safety"];

// ---------------------------------------------------------------------------
// isMain guard — allows importing this module in tests without triggering CLI
// ---------------------------------------------------------------------------
const isMain = (() => {
  try {
    return resolve(process.argv[1] ?? "") === resolve(new URL(import.meta.url).pathname);
  } catch {
    return false;
  }
})();

function calculateMAE(pairs, axis) {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + Math.abs(p.llm[axis] - p.human[axis]), 0);
  return sum / pairs.length;
}

function calculateBias(pairs, axis) {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + (p.llm[axis] - p.human[axis]), 0);
  return sum / pairs.length;
}

function computeStats(pairs, totalProcessed, skipped) {
  const stats = {
    totalBooksProcessed: totalProcessed,
    matchedPairs: pairs.length,
    skipped,
    metrics: {},
    confusionMatrix: {}
  };

  for (const axis of AXES) {
    stats.metrics[axis] = {
      mae: calculateMAE(pairs, axis),
      bias: calculateBias(pairs, axis)
    };
  }

  // Flagged Issues Confusion Matrix
  for (const area of ISSUE_AREAS) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const pair of pairs) {
      const humanFlagged = pair.human.flaggedIssues?.some(i => i.area === area);
      const llmFlagged = pair.llm.flaggedIssues?.some(i => i.area === area);

      if (humanFlagged && llmFlagged) tp++;
      else if (!humanFlagged && llmFlagged) fp++;
      else if (humanFlagged && !llmFlagged) fn++;
      else tn++;
    }
    stats.confusionMatrix[area] = { tp, fp, fn, tn };
  }

  return stats;
}

function renderStats(stats) {
  // Output results
  if (format === "json") {
    return JSON.stringify(stats, null, 2);
  } else if (format === "markdown" || format === "md") {
    let out = `# Human vs. LLM Quality Review Comparison\n`;
    out += `\n**Summary**\n`;
    out += `- Total Books Sampled: ${stats.totalBooksProcessed}\n`;
    out += `- Matched Pairs: ${stats.matchedPairs}\n`;
    out += `- Skipped (No Human Review): ${stats.skipped.noHuman}\n`;
    out += `- Skipped (No LLM Review): ${stats.skipped.noLLM}\n`;

    out += `\n## Score Metrics (1-5 Scale)\n`;
    out += `| Axis | MAE | Bias (LLM - Human) |\n`;
    out += `| :--- | :---: | :---: |\n`;
    for (const axis of AXES) {
      out += `| ${axis} | ${stats.metrics[axis].mae.toFixed(2)} | ${stats.metrics[axis].bias.toFixed(2)} |\n`;
    }

    out += `\n## Issue Detection Agreement (Confusion Matrix)\n`;
    out += `| Area | TP | FP | FN | TN | Precision | Recall |\n`;
    out += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
    for (const area of ISSUE_AREAS) {
      const cm = stats.confusionMatrix[area];
      const precision = cm.tp + cm.fp > 0 ? (cm.tp / (cm.tp + cm.fp)).toFixed(2) : "N/A";
      const recall = cm.tp + cm.fn > 0 ? (cm.tp / (cm.tp + cm.fn)).toFixed(2) : "N/A";
      out += `| ${area} | ${cm.tp} | ${cm.fp} | ${cm.fn} | ${cm.tn} | ${precision} | ${recall} |\n`;
    }
    return out;
  } else {
    // Console format
    let out = "\n=== Comparison Summary ===\n";
    out += `Matched Pairs: ${stats.matchedPairs}\n`;
    out += `Skipped: No Human=${stats.skipped.noHuman}, No LLM=${stats.skipped.noLLM}\n`;

    out += "\n=== Score Metrics (MAE & Bias) ===\n";
    for (const axis of AXES) {
      out += `${axis.padEnd(26)}: MAE=${stats.metrics[axis].mae.toFixed(2)}, Bias=${stats.metrics[axis].bias.toFixed(2)}\n`;
    }

    out += "\n=== Issue Detection (Confusion Matrix) ===\n";
    out += "Area".padEnd(15) + " TP " + " FP " + " FN " + " TN " + "Prec".padEnd(5) + " Rec\n";
    for (const area of ISSUE_AREAS) {
      const cm = stats.confusionMatrix[area];
      const precision = cm.tp + cm.fp > 0 ? (cm.tp / (cm.tp + cm.fp)).toFixed(2) : "N/A";
      const recall = cm.tp + cm.fn > 0 ? (cm.tp / (cm.tp + cm.fn)).toFixed(2) : "N/A";
      out += area.padEnd(15) + ` ${cm.tp}  ${cm.fp}  ${cm.fn}  ${cm.tn}  ${precision.padEnd(5)} ${recall}\n`;
    }
    return out;
  }
}

async function main() {
  if (selfTest) {
    runSelfTest();
    return;
  }

  ensureAdminApp();
  const db = getFirestore();

  if (format === "console") {
    console.log(`Fetching books (limit: ${limitCount})...`);
  }

  const booksSnap = await db.collection("books").limit(limitCount).get();
  const pairs = [];
  let skippedNoHuman = 0;
  let skippedNoLLM = 0;

  for (const bookDoc of booksSnap.docs) {
    const reviewsSnap = await bookDoc.ref.collection("qualityReviews").get();
    const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const humanReview = reviews.find(r => r.reviewerType === "human");
    const llmReview = reviews.find(r => r.reviewerType === "llm");

    if (humanReview && llmReview) {
      pairs.push({
        bookId: bookDoc.id,
        human: humanReview,
        llm: llmReview
      });
    } else {
      if (!humanReview) skippedNoHuman++;
      if (!llmReview) skippedNoLLM++;
    }
  }

  const stats = computeStats(pairs, booksSnap.size, { noHuman: skippedNoHuman, noLLM: skippedNoLLM });
  console.log(renderStats(stats));
}

function runSelfTest() {
  console.log("\n=== compare-human-llm-reviews.mjs self-test ===\n");

  const mockPairs = [
    {
      bookId: "book-1",
      human: {
        storyScore: 4, illustrationScore: 4, characterConsistencyScore: 4, personalizationScore: 4, safetyScore: 5, overallScore: 4.2,
        flaggedIssues: []
      },
      llm: {
        storyScore: 4, illustrationScore: 3, characterConsistencyScore: 5, personalizationScore: 4, safetyScore: 5, overallScore: 4.2,
        flaggedIssues: [{ area: "illustration", message: "too blurry" }]
      }
    },
    {
      bookId: "book-2",
      human: {
        storyScore: 2, illustrationScore: 2, characterConsistencyScore: 2, personalizationScore: 2, safetyScore: 5, overallScore: 2.6,
        flaggedIssues: [{ area: "story", message: "boring" }]
      },
      llm: {
        storyScore: 2, illustrationScore: 2, characterConsistencyScore: 2, personalizationScore: 2, safetyScore: 4, overallScore: 2.4,
        flaggedIssues: [{ area: "story", message: "weak plot" }]
      }
    }
  ];

  const stats = computeStats(mockPairs, 2, { noHuman: 0, noLLM: 0 });

  // Basic assertions
  if (stats.matchedPairs !== 2) throw new Error("Self-test failed: matchedPairs mismatch");
  if (stats.metrics.storyScore.mae !== 0) throw new Error("Self-test failed: MAE storyScore mismatch");
  if (stats.metrics.illustrationScore.mae !== 0.5) throw new Error("Self-test failed: MAE illustrationScore mismatch");
  if (stats.metrics.illustrationScore.bias !== -0.5) throw new Error("Self-test failed: Bias illustrationScore mismatch");

  // Confusion Matrix check
  if (stats.confusionMatrix.story.tp !== 1) throw new Error("Self-test failed: CM story TP mismatch");
  if (stats.confusionMatrix.illustration.fp !== 1) throw new Error("Self-test failed: CM illustration FP mismatch");

  console.log("OK: All self-tests passed.");
  process.exit(0);
}

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
