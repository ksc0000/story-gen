/* ------------------------------------------------------------------ */
/*  Lightweight shapes for pure computation functions                  */
/* ------------------------------------------------------------------ */

interface BookLike {
  id: string;
  overallQualityScore?: number;
  storyQualityScore?: number;
  illustrationQualityScore?: number;
  characterConsistencyScore?: number;
  personalizationScore?: number;
  safetyScore?: number;
  qualityReviewedAtMs?: number;
}

/* ------------------------------------------------------------------ */
/*  Quality Trend types                                                */
/* ------------------------------------------------------------------ */

export interface QualityTrendBucket {
  /** Label (e.g. "2026-05-01") */
  label: string;
  /** Unix ms start of bucket */
  startMs: number;
  /** Number of reviewed books in this bucket */
  count: number;
  /** Average overall score (1-5) */
  avgOverall: number;
  /** Per-axis averages */
  avgStory: number;
  avgIllustration: number;
  avgCharacterConsistency: number;
  avgPersonalization: number;
  avgSafety: number;
}

export interface RegressionAlert {
  axis: string;
  currentAvg: number;
  previousAvg: number;
  dropPct: number;
}

export interface QualityTrendMetrics {
  /** All reviewed books count */
  totalReviewed: number;
  /** Global averages (all reviewed books) */
  avgOverall: number;
  avgStory: number;
  avgIllustration: number;
  avgCharacterConsistency: number;
  avgPersonalization: number;
  avgSafety: number;
  /** Distribution: count of books per overall rounded score */
  scoreDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Time buckets for trend display */
  buckets: QualityTrendBucket[];
  /** Regression alerts (recent bucket vs previous bucket) */
  regressions: RegressionAlert[];
}

export const EMPTY_QUALITY_TREND: QualityTrendMetrics = {
  totalReviewed: 0,
  avgOverall: 0,
  avgStory: 0,
  avgIllustration: 0,
  avgCharacterConsistency: 0,
  avgPersonalization: 0,
  avgSafety: 0,
  scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  buckets: [],
  regressions: [],
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** A drop of ≥ this % between consecutive buckets triggers a regression alert */
const REGRESSION_THRESHOLD_PCT = 15;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100;
}

function formatDateLabel(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Group reviewed books into weekly buckets based on qualityReviewedAtMs.
 */
function buildWeeklyBuckets(reviewed: BookLike[]): QualityTrendBucket[] {
  if (reviewed.length === 0) return [];

  // Sort by review time ascending
  const sorted = [...reviewed].sort(
    (a, b) => (a.qualityReviewedAtMs ?? 0) - (b.qualityReviewedAtMs ?? 0),
  );

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const firstMs = sorted[0].qualityReviewedAtMs ?? 0;

  // Align to start of week (Monday)
  const firstDate = new Date(firstMs);
  const dayOfWeek = firstDate.getDay(); // 0=Sun, 1=Mon
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = firstMs - mondayOffset * 24 * 60 * 60 * 1000;
  // Normalize to midnight
  const baseDate = new Date(weekStart);
  baseDate.setHours(0, 0, 0, 0);
  const baseMs = baseDate.getTime();

  const bucketMap = new Map<number, BookLike[]>();

  for (const book of sorted) {
    const reviewMs = book.qualityReviewedAtMs ?? 0;
    const bucketIndex = Math.floor((reviewMs - baseMs) / WEEK_MS);
    const bucketStart = baseMs + bucketIndex * WEEK_MS;
    const existing = bucketMap.get(bucketStart);
    if (existing) {
      existing.push(book);
    } else {
      bucketMap.set(bucketStart, [book]);
    }
  }

  const buckets: QualityTrendBucket[] = [];
  const sortedKeys = [...bucketMap.keys()].sort((a, b) => a - b);

  for (const startMs of sortedKeys) {
    const booksInBucket = bucketMap.get(startMs)!;
    buckets.push({
      label: formatDateLabel(startMs),
      startMs,
      count: booksInBucket.length,
      avgOverall: avg(booksInBucket.map((b) => b.overallQualityScore ?? 0)),
      avgStory: avg(booksInBucket.map((b) => b.storyQualityScore ?? 0)),
      avgIllustration: avg(booksInBucket.map((b) => b.illustrationQualityScore ?? 0)),
      avgCharacterConsistency: avg(booksInBucket.map((b) => b.characterConsistencyScore ?? 0)),
      avgPersonalization: avg(booksInBucket.map((b) => b.personalizationScore ?? 0)),
      avgSafety: avg(booksInBucket.map((b) => b.safetyScore ?? 0)),
    });
  }

  return buckets;
}

/**
 * Detect regression: if the latest bucket's average dropped ≥ threshold vs previous bucket.
 */
function detectRegressions(buckets: QualityTrendBucket[]): RegressionAlert[] {
  if (buckets.length < 2) return [];
  const current = buckets[buckets.length - 1];
  const previous = buckets[buckets.length - 2];
  // Only alert if previous bucket had meaningful data
  if (previous.count < 2) return [];

  const axes: { axis: string; cur: number; prev: number }[] = [
    { axis: "overall", cur: current.avgOverall, prev: previous.avgOverall },
    { axis: "story", cur: current.avgStory, prev: previous.avgStory },
    { axis: "illustration", cur: current.avgIllustration, prev: previous.avgIllustration },
    { axis: "characterConsistency", cur: current.avgCharacterConsistency, prev: previous.avgCharacterConsistency },
    { axis: "personalization", cur: current.avgPersonalization, prev: previous.avgPersonalization },
    { axis: "safety", cur: current.avgSafety, prev: previous.avgSafety },
  ];

  const alerts: RegressionAlert[] = [];
  for (const { axis, cur, prev } of axes) {
    if (prev === 0) continue;
    const dropPct = ((prev - cur) / prev) * 100;
    if (dropPct >= REGRESSION_THRESHOLD_PCT) {
      alerts.push({
        axis,
        currentAvg: cur,
        previousAvg: prev,
        dropPct: Math.round(dropPct * 10) / 10,
      });
    }
  }
  return alerts;
}

/* ------------------------------------------------------------------ */
/*  Main computation                                                   */
/* ------------------------------------------------------------------ */

export function computeQualityMetrics(books: BookLike[]): QualityTrendMetrics {
  const reviewed = books.filter(
    (b) => b.overallQualityScore != null && b.qualityReviewedAtMs != null,
  );

  if (reviewed.length === 0) {
    return EMPTY_QUALITY_TREND;
  }

  const scoreDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const b of reviewed) {
    const rounded = Math.round(b.overallQualityScore ?? 0) as 1 | 2 | 3 | 4 | 5;
    if (rounded >= 1 && rounded <= 5) {
      scoreDistribution[rounded]++;
    }
  }

  const buckets = buildWeeklyBuckets(reviewed);
  const regressions = detectRegressions(buckets);

  return {
    totalReviewed: reviewed.length,
    avgOverall: avg(reviewed.map((b) => b.overallQualityScore ?? 0)),
    avgStory: avg(reviewed.map((b) => b.storyQualityScore ?? 0)),
    avgIllustration: avg(reviewed.map((b) => b.illustrationQualityScore ?? 0)),
    avgCharacterConsistency: avg(reviewed.map((b) => b.characterConsistencyScore ?? 0)),
    avgPersonalization: avg(reviewed.map((b) => b.personalizationScore ?? 0)),
    avgSafety: avg(reviewed.map((b) => b.safetyScore ?? 0)),
    scoreDistribution,
    buckets,
    regressions,
  };
}
