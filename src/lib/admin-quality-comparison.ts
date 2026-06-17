import { QualityReview } from "./types";

export interface ComparisonMetric {
  mae: number;
  bias: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
}

export interface QualityComparisonMetrics {
  matchedPairs: number;
  metrics: Record<string, ComparisonMetric>;
  confusionMatrix: Record<string, ConfusionMatrix>;
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

function calculateMAE(pairs: { human: any; llm: any }[], axis: string): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + Math.abs(p.llm[axis] - p.human[axis]), 0);
  return sum / pairs.length;
}

function calculateBias(pairs: { human: any; llm: any }[], axis: string): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + (p.llm[axis] - p.human[axis]), 0);
  return sum / pairs.length;
}

/**
 * Ported from scripts/analysis/compare-human-llm-reviews.mjs
 * Performs statistical comparison between human and LLM reviews.
 */
export function computeQualityComparison(
  pairs: { human: QualityReview; llm: QualityReview }[]
): QualityComparisonMetrics {
  const metrics: Record<string, ComparisonMetric> = {};
  for (const axis of AXES) {
    metrics[axis] = {
      mae: calculateMAE(pairs, axis),
      bias: calculateBias(pairs, axis),
    };
  }

  const confusionMatrix: Record<string, ConfusionMatrix> = {};
  for (const area of ISSUE_AREAS) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const pair of pairs) {
      const humanFlagged = pair.human.flaggedIssues?.some((i) => i.area === area);
      const llmFlagged = pair.llm.flaggedIssues?.some((i) => i.area === area);

      if (humanFlagged && llmFlagged) tp++;
      else if (!humanFlagged && llmFlagged) fp++;
      else if (humanFlagged && !llmFlagged) fn++;
      else tn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;

    confusionMatrix[area] = { tp, fp, fn, tn, precision, recall };
  }

  return {
    matchedPairs: pairs.length,
    metrics,
    confusionMatrix,
  };
}
