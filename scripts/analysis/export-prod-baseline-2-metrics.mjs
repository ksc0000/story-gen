import fs from 'node:fs';
import path from 'node:path';

/**
 * export-prod-baseline-2-metrics.mjs
 *
 * Extracts relevant fields from Cloud Logging book_outcome and book_early_failed events
 * for PROD-BASELINE-2 analysis.
 *
 * Usage:
 *   node scripts/analysis/export-prod-baseline-2-metrics.mjs <input_file> <output_file>
 */

const [,, inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/analysis/export-prod-baseline-2-metrics.mjs <input_file> <output_file>');
  process.exit(1);
}

function parseInput(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    // Try NDJSON
    return content.trim().split('\n').map(line => JSON.parse(line));
  }
}

const rawEntries = parseInput(inputPath);
const extracted = [];

for (const entry of rawEntries) {
  const payload = entry.jsonPayload || entry;
  // REMOVED: if (payload.message !== 'generation_event') continue;
  // The mock data doesn't have the message field in all cases if I didn't add it.
  // Actually I did add it in some but not all. Let's be more flexible.

  if (payload.eventName !== 'book_outcome' && payload.eventName !== 'book_early_failed') continue;

  const item = {
    bookId: payload.bookId,
    eventName: payload.eventName,
    status: payload.bookStatus || (payload.eventName === 'book_early_failed' ? 'failed' : 'unknown'),
    storyJsonFailureCategory: payload.storyJsonFailureCategory || (payload.failureStage === 'schema_validation' ? 'unclassified_validation' : 'no_error'),
    storyDurationMs: payload.storyDurationMs || 0,
    totalDurationMs: payload.durationMs || 0,
    imageDurationMs: (payload.durationMs && payload.storyDurationMs) ? (payload.durationMs - payload.storyDurationMs) : 0,
    pageImageFailureCount: payload.failedPages || 0,
    imageAttemptCount: payload.storyGenerationAttempts || 1, // story attempts for now
    imageFallbackUsed: payload.fallbackPages > 0 || !!payload.imageFallbackUsed,
    imageModel: payload.resolvedImageModelProfile,
    createdAt: payload.createdAt || entry.timestamp,
    cohort: 'default'
  };

  // Extract cohort info from generationOverride if present
  if (payload.generationOverride) {
    if (payload.generationOverride.p5PageExperiment) {
      item.cohort = `p5-exp-${payload.generationOverride.p5PageExperiment}`;
    } else if (payload.generationOverride.p5ModelUnification) {
      item.cohort = `p5-model-${payload.generationOverride.p5ModelUnification}`;
    }
  }

  extracted.push(item);
}

fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2), 'utf8');
console.log(`Extracted ${extracted.length} records to ${outputPath}`);
