import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * compare-human-llm-reviews-local.mjs
 *
 * Performs analysis on a local JSON dataset containing human and LLM reviews.
 * This is a standalone version that doesn't require Firestore access.
 *
 * Usage:
 *   node scripts/analysis/compare-human-llm-reviews-local.mjs <dataset-path> [options]
 *
 * Options:
 *   --format <string>   Output format: console (default), markdown, json
 */

const args = process.argv.slice(2);
const datasetPath = args[0];
const formatArg = args.find((arg) => arg.startsWith("--format="));
const format = formatArg ? formatArg.split("=")[1] : "console";

if (!datasetPath || args.includes("--help") || args.includes("-h")) {
  console.log(`
compare-human-llm-reviews-local.mjs — Local Human vs. LLM Comparison Tool

Usage:
  node scripts/analysis/compare-human-llm-reviews-local.mjs <dataset.json> [options]

Options:
  --format=<fmt>  Output format: console (default), markdown, json
`);
  process.exit(0);
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

/**
 * Normalizes human score (1-5) to LLM scale (0-100).
 * Human 1 -> 20, 2 -> 40, 3 -> 60, 4 -> 80, 5 -> 100
 */
function normalizeHumanScore(score) {
  return score * 20;
}

function calculateMAE(pairs, axis) {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => {
    const humanNorm = normalizeHumanScore(p.human[axis]);
    return acc + Math.abs(p.llm[axis] - humanNorm);
  }, 0);
  return sum / pairs.length;
}

function calculateBias(pairs, axis) {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => {
    const humanNorm = normalizeHumanScore(p.human[axis]);
    return acc + (p.llm[axis] - humanNorm);
  }, 0);
  return sum / pairs.length;
}

function computeStats(pairs) {
  const stats = {
    totalPairs: pairs.length,
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
  if (format === "json") {
    return JSON.stringify(stats, null, 2);
  } else if (format === "markdown" || format === "md") {
    let out = `# Human vs. LLM Quality Review Comparison Report\n`;
    out += `\n**Summary**\n`;
    out += `- Total Matched Pairs: ${stats.totalPairs}\n`;

    out += `\n## Score Metrics (MAE & Bias)\n`;
    out += `*Human scores (1-5) are normalized to 0-100 scale (Score * 20).*\n\n`;
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
    out += `Matched Pairs: ${stats.totalPairs}\n`;

    out += "\n=== Score Metrics (MAE & Bias) ===\n";
    out += "Axis".padEnd(26) + ": MAE".padEnd(10) + "Bias\n";
    for (const axis of AXES) {
      out += `${axis.padEnd(26)}: ${stats.metrics[axis].mae.toFixed(2).padEnd(10)}${stats.metrics[axis].bias.toFixed(2)}\n`;
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
  const fullPath = resolve(process.cwd(), datasetPath);
  if (!existsSync(fullPath)) {
    console.error(`Error: Dataset file not found at ${fullPath}`);
    process.exit(1);
  }

  const rawData = readFileSync(fullPath, "utf8");
  const pairs = JSON.parse(rawData);

  const stats = computeStats(pairs);
  console.log(renderStats(stats));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
