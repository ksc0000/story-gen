import fs from 'node:fs';

/**
 * compute-slo-baseline-stats.mjs
 *
 * Computes SLO statistics from extracted book metrics.
 *
 * Usage:
 *   node scripts/analysis/compute-slo-baseline-stats.mjs < docs/smoke-results/PROD_BASELINE_2_DATA.json > docs/smoke-results/PROD_BASELINE_2_STATS.json
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function computePercentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

async function main() {
  const input = await readStdin();
  const data = JSON.parse(input);

  if (data.length === 0) {
    console.log(JSON.stringify({ error: "No data" }));
    return;
  }

  const stats = {
    total: data.length,
    statusDistribution: {},
    storyJsonFailureCategory: {},
    storyDurationMs: {
      all: data.map(d => d.storyDurationMs).filter(v => v > 0).sort((a, b) => a - b),
      completed: data.filter(d => d.status === 'completed' || d.status === 'partial_completed').map(d => d.storyDurationMs).filter(v => v > 0).sort((a, b) => a - b)
    },
    imageReliability: {
      fallbackUsedCount: data.filter(d => d.imageFallbackUsed).length,
      pageFailureCount: data.filter(d => d.pageImageFailureCount > 0).length,
      totalImageAttempts: data.reduce((acc, d) => acc + (d.imageAttemptCount || 0), 0)
    },
    cohorts: {}
  };

  // Distribution
  for (const item of data) {
    stats.statusDistribution[item.status] = (stats.statusDistribution[item.status] || 0) + 1;
    stats.storyJsonFailureCategory[item.storyJsonFailureCategory] = (stats.storyJsonFailureCategory[item.storyJsonFailureCategory] || 0) + 1;

    if (!stats.cohorts[item.cohort]) {
      stats.cohorts[item.cohort] = { count: 0, statusDistribution: {} };
    }
    stats.cohorts[item.cohort].count++;
    stats.cohorts[item.cohort].statusDistribution[item.status] = (stats.cohorts[item.cohort].statusDistribution[item.status] || 0) + 1;
  }

  const results = {
    count: stats.total,
    status: {},
    storyJsonFailure: {},
    latency: {
      story: {
        p50: computePercentile(stats.storyDurationMs.completed, 50),
        p95: computePercentile(stats.storyDurationMs.completed, 95),
        p99: computePercentile(stats.storyDurationMs.completed, 99)
      }
    },
    image: {
      fallbackRate: (stats.imageReliability.fallbackUsedCount / stats.total) * 100,
      pageFailureRate: (stats.imageReliability.pageFailureCount / stats.total) * 100,
      avgAttempts: stats.imageReliability.totalImageAttempts / stats.total
    },
    readableRate: (( (stats.statusDistribution.completed || 0) + (stats.statusDistribution.partial_completed || 0) ) / stats.total) * 100,
    cohorts: stats.cohorts
  };

  for (const [k, v] of Object.entries(stats.statusDistribution)) {
    results.status[k] = { count: v, pct: (v / stats.total) * 100 };
  }
  for (const [k, v] of Object.entries(stats.storyJsonFailureCategory)) {
    results.storyJsonFailure[k] = { count: v, pct: (v / stats.total) * 100 };
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
