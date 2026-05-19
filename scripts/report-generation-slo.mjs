/**
 * P2-6: Generation SLO report script.
 *
 * Reads structured generation event logs (NDJSON or JSON array) and produces
 * a summarized SLO report. This script is read-only and does not touch
 * Firestore, Firebase, production routing, or any generation behavior.
 *
 * Input event shapes are defined by functions/src/lib/generation-event-logger.ts.
 * Supported event names: generation_started, book_outcome, book_early_failed, page_image_failed.
 *
 * How to export events from Cloud Logging:
 *   1. Open Cloud Logging > Log Explorer
 *   2. Filter: jsonPayload.message = "generation_event"
 *   3. Download as JSON (array) or NDJSON
 *   4. node scripts/report-generation-slo.mjs --input ./tmp/events.json
 *
 * Privacy: Raw userId, prompts, child names, and story text are NEVER included
 * in generation events (enforced by event types). This script additionally
 * ignores any unexpected raw text fields and keeps output aggregated only.
 *
 * Usage:
 *   node scripts/report-generation-slo.mjs --input ./tmp/events.ndjson
 *   node scripts/report-generation-slo.mjs --input ./tmp/events.json
 *   node scripts/report-generation-slo.mjs --input ./tmp/events.json --format markdown
 *   node scripts/report-generation-slo.mjs --input ./tmp/events.json --format json
 *   node scripts/report-generation-slo.mjs --self-test
 *
 * Exit codes:
 *   0  Report produced (or self-test passed)
 *   1  Unrecoverable input error (file not found, empty input, etc.)
 *   2  Self-test failure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const selfTest = args.includes('--self-test');

const inputFlag = (() => {
  const idx = args.findIndex((a) => a === '--input' || a === '-i');
  return idx >= 0 ? args[idx + 1] : null;
})();

const formatFlag = (() => {
  const idx = args.findIndex((a) => a === '--format' || a === '-f');
  return idx >= 0 ? args[idx + 1] : 'console';
})();

if (showHelp) {
  console.log(`
report-generation-slo.mjs -- EhonAI generation SLO report

Usage:
  node scripts/report-generation-slo.mjs --input <file> [options]
  node scripts/report-generation-slo.mjs --self-test

Options:
  --input <file>        Path to NDJSON or JSON array file of generation events
  --format <fmt>        Output format: console (default), markdown, json
  --self-test           Run built-in self-test suite
  -h, --help            Show this help

Input formats:
  NDJSON (.ndjson)      One JSON object per line
  JSON array (.json)    Array of JSON objects

Supported event names:
  generation_started    Book generation began (post gate check)
  book_outcome          Book reached terminal status
  book_early_failed     Book failed before image generation
  page_image_failed     All fallback profiles exhausted for a page

Privacy:
  This script never prints raw prompts, child names, story text, or userIds.
  All output is aggregated counts and percentiles only.

Exit codes:
  0  Report produced
  1  Unrecoverable input error
  2  Self-test failure
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Privacy-safe field allowlist
// Fields that MUST NOT appear in report output, even if present in input.
// ---------------------------------------------------------------------------
const BLOCKED_FIELDS = new Set([
  'userId', 'uid', 'rawPrompt', 'imagePrompt', 'storyText', 'childName',
  'userName', 'email', 'phone', 'displayName', 'personalInfo',
]);

// ---------------------------------------------------------------------------
// Percentile helper (mirrors slo-metrics.ts computePercentile)
// ---------------------------------------------------------------------------
function computePercentile(sorted, p) {
  if (sorted.length === 0) return null;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// ---------------------------------------------------------------------------
// Counter helper
// ---------------------------------------------------------------------------
function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

/**
 * Parse a file as NDJSON or JSON array.
 * Returns { events: object[], parseErrors: number, skippedLines: number }.
 */
function parseInputFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const events = [];
  let parseErrors = 0;
  let skippedLines = 0;

  // Try JSON array first
  const trimmed = content.trimStart();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        console.error('ERROR: JSON file does not contain an array at top level.');
        process.exit(1);
      }
      for (const item of parsed) {
        if (item && typeof item === 'object') {
          // Cloud Logging wraps events in jsonPayload
          const event = item.jsonPayload ?? item;
          if (typeof event === 'object' && event !== null) {
            events.push(event);
          } else {
            skippedLines++;
          }
        } else {
          skippedLines++;
        }
      }
      return { events, parseErrors, skippedLines };
    } catch {
      console.error('ERROR: File starts with [ but is not valid JSON array.');
      process.exit(1);
    }
  }

  // NDJSON: one JSON object per line
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    try {
      const parsed = JSON.parse(trimmedLine);
      if (parsed && typeof parsed === 'object') {
        // Cloud Logging wraps events in jsonPayload
        const event = parsed.jsonPayload ?? parsed;
        if (typeof event === 'object' && event !== null) {
          events.push(event);
        } else {
          skippedLines++;
        }
      } else {
        skippedLines++;
      }
    } catch {
      parseErrors++;
    }
  }

  return { events, parseErrors, skippedLines };
}

// ---------------------------------------------------------------------------
// Event aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate parsed events into report data.
 * All intermediate values are counts or numeric arrays — no raw strings from input.
 */
function aggregateEvents(events) {
  const stats = {
    total: events.length,
    // Event name counts
    byEventName: new Map(),
    unknown_event_name: 0,
    missing_event_name: 0,

    // generation_started
    started: { count: 0, candidateRequested: 0, candidateAllowed: 0, blocked: 0, notApplicable: 0 },

    // book_outcome
    outcome: {
      count: 0,
      completed: 0,
      partial_completed: 0,
      failed: 0,
      durationMs: [],
      byProfile: new Map(),
    },

    // book_early_failed
    earlyFailed: {
      count: 0,
      byCategory: new Map(),
      retryable: 0,
    },

    // page_image_failed
    pageFailed: {
      count: 0,
      byErrorCategory: new Map(),
      byErrorCode: new Map(),
      byProvider: new Map(),
      byPrimaryProfile: new Map(),
      byFinalProfile: new Map(),
      fallbackUsed: 0,
      isFinalFallback: 0,
      durationMs: [],
    },
  };

  const KNOWN_EVENT_NAMES = new Set([
    'generation_started', 'book_outcome', 'book_early_failed', 'page_image_failed',
  ]);

  for (const event of events) {
    const name = event.eventName;

    if (!name) {
      stats.missing_event_name++;
      continue;
    }
    if (typeof name !== 'string') {
      stats.missing_event_name++;
      continue;
    }
    if (!KNOWN_EVENT_NAMES.has(name)) {
      stats.unknown_event_name++;
      increment(stats.byEventName, name);
      continue;
    }
    increment(stats.byEventName, name);

    switch (name) {
      case 'generation_started': {
        stats.started.count++;
        if (event.candidateRequested === true) stats.started.candidateRequested++;
        if (event.candidateAllowed === true) stats.started.candidateAllowed++;
        const decision = event.candidateDecision;
        if (decision === 'blocked') stats.started.blocked++;
        if (decision === 'not_applicable') stats.started.notApplicable++;
        break;
      }

      case 'book_outcome': {
        stats.outcome.count++;
        const status = event.bookStatus;
        if (status === 'completed') stats.outcome.completed++;
        else if (status === 'partial_completed') stats.outcome.partial_completed++;
        else if (status === 'failed') stats.outcome.failed++;

        if (typeof event.durationMs === 'number' && event.durationMs >= 0) {
          stats.outcome.durationMs.push(event.durationMs);
        }

        const profile = event.resolvedImageModelProfile;
        if (typeof profile === 'string') {
          increment(stats.outcome.byProfile, profile);
        }
        break;
      }

      case 'book_early_failed': {
        stats.earlyFailed.count++;
        const cat = event.errorCategory;
        if (typeof cat === 'string') {
          increment(stats.earlyFailed.byCategory, cat);
        }
        if (event.retryable === true) stats.earlyFailed.retryable++;
        break;
      }

      case 'page_image_failed': {
        stats.pageFailed.count++;

        const cat = event.errorCategory;
        if (typeof cat === 'string') increment(stats.pageFailed.byErrorCategory, cat);

        const code = event.errorCode;
        if (typeof code === 'string') increment(stats.pageFailed.byErrorCode, code);

        const provider = event.provider;
        if (typeof provider === 'string') increment(stats.pageFailed.byProvider, provider);

        const primaryProfile = event.primaryProfile;
        if (typeof primaryProfile === 'string') increment(stats.pageFailed.byPrimaryProfile, primaryProfile);

        const finalProfile = event.imageModelProfile;
        if (typeof finalProfile === 'string') increment(stats.pageFailed.byFinalProfile, finalProfile);

        if (event.fallbackUsed === true) stats.pageFailed.fallbackUsed++;
        if (event.isFinalFallbackFailure === true) stats.pageFailed.isFinalFallback++;

        if (typeof event.durationMs === 'number' && event.durationMs >= 0) {
          stats.pageFailed.durationMs.push(event.durationMs);
        }
        break;
      }
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Rate helpers
// ---------------------------------------------------------------------------
function pct(num, den) {
  if (!den) return null;
  return ((num / den) * 100).toFixed(1) + '%';
}

function fmt(n) {
  if (n === null || n === undefined) return 'n/a';
  if (typeof n === 'number') return n.toFixed(1);
  return String(n);
}

function fmtMs(n) {
  if (n === null || n === undefined) return 'n/a';
  return Math.round(n) + 'ms';
}

function sortedCounts(map) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// Report renderers
// ---------------------------------------------------------------------------

function renderConsole(stats, dataQualityNotes) {
  const lines = [];

  lines.push('');
  lines.push('=== EhonAI Generation SLO Report ===');
  lines.push('');

  // Summary
  lines.push('--- Summary ---');
  lines.push('Total events       : ' + stats.total);
  lines.push('generation_started : ' + stats.started.count);
  lines.push('book_outcome       : ' + stats.outcome.count);
  lines.push('book_early_failed  : ' + stats.earlyFailed.count);
  lines.push('page_image_failed  : ' + stats.pageFailed.count);
  if (stats.missing_event_name > 0) lines.push('missing eventName  : ' + stats.missing_event_name);
  if (stats.unknown_event_name > 0) lines.push('unknown eventName  : ' + stats.unknown_event_name);
  lines.push('');

  // Book outcomes
  lines.push('--- Book Outcomes ---');
  const o = stats.outcome;
  lines.push('Total outcomes     : ' + o.count);
  lines.push('  completed        : ' + o.completed + ' (' + (pct(o.completed, o.count) ?? 'n/a') + ')');
  lines.push('  partial_completed: ' + o.partial_completed + ' (' + (pct(o.partial_completed, o.count) ?? 'n/a') + ')');
  lines.push('  failed           : ' + o.failed + ' (' + (pct(o.failed, o.count) ?? 'n/a') + ')');
  const readableCount = o.completed + o.partial_completed;
  lines.push('  readable (comp+partial): ' + readableCount + ' (' + (pct(readableCount, o.count) ?? 'n/a') + ')');
  lines.push('');

  // Early failures
  if (stats.earlyFailed.count > 0) {
    lines.push('--- Early Failures ---');
    lines.push('Count: ' + stats.earlyFailed.count + '  retryable: ' + stats.earlyFailed.retryable);
    for (const [cat, count] of sortedCounts(stats.earlyFailed.byCategory)) {
      lines.push('  ' + cat + ': ' + count);
    }
    lines.push('');
  }

  // Image failures
  lines.push('--- Page Image Failures ---');
  const p = stats.pageFailed;
  lines.push('Count: ' + p.count + '  fallbackUsed: ' + p.fallbackUsed);
  if (p.count > 0) {
    lines.push('  Error categories:');
    for (const [cat, count] of sortedCounts(p.byErrorCategory)) {
      lines.push('    ' + cat + ': ' + count);
    }
    lines.push('  Error codes:');
    for (const [code, count] of sortedCounts(p.byErrorCode)) {
      lines.push('    ' + code + ': ' + count);
    }
    lines.push('  By provider:');
    for (const [prov, count] of sortedCounts(p.byProvider)) {
      lines.push('    ' + prov + ': ' + count);
    }
    lines.push('  By primaryProfile:');
    for (const [prof, count] of sortedCounts(p.byPrimaryProfile)) {
      lines.push('    ' + prof + ': ' + count);
    }
  }
  lines.push('');

  // Candidate gate
  const s = stats.started;
  lines.push('--- Candidate Gate Signals ---');
  lines.push('candidateRequested : ' + s.candidateRequested);
  lines.push('candidateAllowed   : ' + s.candidateAllowed);
  lines.push('blocked            : ' + s.blocked);
  lines.push('not_applicable     : ' + s.notApplicable);
  lines.push('');

  // Profile distribution (book_outcome)
  if (o.byProfile.size > 0) {
    lines.push('--- Profile Distribution (book_outcome) ---');
    for (const [prof, count] of sortedCounts(o.byProfile)) {
      lines.push('  ' + prof + ': ' + count);
    }
    lines.push('');
  }

  // Latency
  lines.push('--- Latency ---');
  {
    const sorted = [...o.durationMs].sort((a, b) => a - b);
    lines.push('Book durationMs (book_outcome):');
    lines.push('  n    = ' + sorted.length);
    lines.push('  p50  = ' + fmtMs(computePercentile(sorted, 50)));
    lines.push('  p95  = ' + fmtMs(computePercentile(sorted, 95)));
  }
  {
    const sorted = [...p.durationMs].sort((a, b) => a - b);
    lines.push('Page image durationMs (page_image_failed):');
    lines.push('  n    = ' + sorted.length);
    lines.push('  p50  = ' + fmtMs(computePercentile(sorted, 50)));
    lines.push('  p95  = ' + fmtMs(computePercentile(sorted, 95)));
  }
  lines.push('');

  // Data quality
  if (dataQualityNotes.length > 0) {
    lines.push('--- Data Quality Notes ---');
    for (const note of dataQualityNotes) {
      lines.push('  ' + note);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderMarkdown(stats, dataQualityNotes, sourceFile) {
  const lines = [];
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  lines.push('# EhonAI Generation SLO Report');
  lines.push('');
  lines.push('Generated: ' + now);
  if (sourceFile) lines.push('Input: `' + path.basename(sourceFile) + '`');
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push('| Total events | ' + stats.total + ' |');
  lines.push('| generation_started | ' + stats.started.count + ' |');
  lines.push('| book_outcome | ' + stats.outcome.count + ' |');
  lines.push('| book_early_failed | ' + stats.earlyFailed.count + ' |');
  lines.push('| page_image_failed | ' + stats.pageFailed.count + ' |');
  if (stats.missing_event_name > 0) lines.push('| missing eventName | ' + stats.missing_event_name + ' |');
  if (stats.unknown_event_name > 0) lines.push('| unknown eventName | ' + stats.unknown_event_name + ' |');
  lines.push('');

  // Book outcomes
  lines.push('## Book Outcomes');
  lines.push('');
  const o = stats.outcome;
  const readableCount = o.completed + o.partial_completed;
  lines.push('| Status | Count | Rate |');
  lines.push('|---|---|---|');
  lines.push('| completed | ' + o.completed + ' | ' + (pct(o.completed, o.count) ?? 'n/a') + ' |');
  lines.push('| partial_completed | ' + o.partial_completed + ' | ' + (pct(o.partial_completed, o.count) ?? 'n/a') + ' |');
  lines.push('| failed | ' + o.failed + ' | ' + (pct(o.failed, o.count) ?? 'n/a') + ' |');
  lines.push('| readable (comp+partial) | ' + readableCount + ' | ' + (pct(readableCount, o.count) ?? 'n/a') + ' |');
  lines.push('');

  // Image failures
  lines.push('## Image Failures');
  lines.push('');
  const p = stats.pageFailed;
  lines.push('**page_image_failed**: ' + p.count + '  fallbackUsed: ' + p.fallbackUsed);
  lines.push('');

  if (p.count > 0) {
    lines.push('### Error Categories');
    lines.push('');
    lines.push('| Category | Count |');
    lines.push('|---|---|');
    for (const [cat, count] of sortedCounts(p.byErrorCategory)) {
      lines.push('| ' + cat + ' | ' + count + ' |');
    }
    lines.push('');

    lines.push('### Error Codes');
    lines.push('');
    lines.push('| Code | Count |');
    lines.push('|---|---|');
    for (const [code, count] of sortedCounts(p.byErrorCode)) {
      lines.push('| ' + code + ' | ' + count + ' |');
    }
    lines.push('');
  }

  // Provider / profile breakdown
  lines.push('## Provider / Profile Breakdown');
  lines.push('');

  if (p.count > 0) {
    lines.push('### By Provider (page_image_failed)');
    lines.push('');
    lines.push('| Provider | Count |');
    lines.push('|---|---|');
    for (const [prov, count] of sortedCounts(p.byProvider)) {
      lines.push('| ' + prov + ' | ' + count + ' |');
    }
    lines.push('');

    lines.push('### By Primary Profile (page_image_failed)');
    lines.push('');
    lines.push('| Profile | Count |');
    lines.push('|---|---|');
    for (const [prof, count] of sortedCounts(p.byPrimaryProfile)) {
      lines.push('| ' + prof + ' | ' + count + ' |');
    }
    lines.push('');
  }

  if (o.byProfile.size > 0) {
    lines.push('### By Resolved Profile (book_outcome)');
    lines.push('');
    lines.push('| Profile | Count |');
    lines.push('|---|---|');
    for (const [prof, count] of sortedCounts(o.byProfile)) {
      lines.push('| ' + prof + ' | ' + count + ' |');
    }
    lines.push('');
  }

  // Candidate gate
  lines.push('## Candidate Gate Signals');
  lines.push('');
  const s = stats.started;
  lines.push('| Signal | Count |');
  lines.push('|---|---|');
  lines.push('| candidateRequested | ' + s.candidateRequested + ' |');
  lines.push('| candidateAllowed | ' + s.candidateAllowed + ' |');
  lines.push('| blocked | ' + s.blocked + ' |');
  lines.push('| not_applicable | ' + s.notApplicable + ' |');
  lines.push('');

  // Latency
  lines.push('## Latency');
  lines.push('');
  {
    const sorted = [...o.durationMs].sort((a, b) => a - b);
    lines.push('### Book durationMs (book_outcome)');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---|');
    lines.push('| n | ' + sorted.length + ' |');
    lines.push('| p50 | ' + fmtMs(computePercentile(sorted, 50)) + ' |');
    lines.push('| p95 | ' + fmtMs(computePercentile(sorted, 95)) + ' |');
    lines.push('');
  }
  {
    const sorted = [...p.durationMs].sort((a, b) => a - b);
    lines.push('### Page image durationMs (page_image_failed)');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---|');
    lines.push('| n | ' + sorted.length + ' |');
    lines.push('| p50 | ' + fmtMs(computePercentile(sorted, 50)) + ' |');
    lines.push('| p95 | ' + fmtMs(computePercentile(sorted, 95)) + ' |');
    lines.push('');
  }

  // Data quality
  if (dataQualityNotes.length > 0) {
    lines.push('## Data Quality Notes');
    lines.push('');
    for (const note of dataQualityNotes) {
      lines.push('- ' + note);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderJson(stats, dataQualityNotes) {
  const o = stats.outcome;
  const p = stats.pageFailed;
  const s = stats.started;
  const sortedBookMs = [...o.durationMs].sort((a, b) => a - b);
  const sortedPageMs = [...p.durationMs].sort((a, b) => a - b);

  const report = {
    summary: {
      totalEvents: stats.total,
      generationStarted: s.count,
      bookOutcome: o.count,
      bookEarlyFailed: stats.earlyFailed.count,
      pageImageFailed: p.count,
      missingEventName: stats.missing_event_name,
      unknownEventName: stats.unknown_event_name,
    },
    bookOutcomes: {
      total: o.count,
      completed: o.completed,
      partial_completed: o.partial_completed,
      failed: o.failed,
      completionRate: o.count > 0 ? (o.completed / o.count) : null,
      partialCompletionRate: o.count > 0 ? (o.partial_completed / o.count) : null,
      failureRate: o.count > 0 ? (o.failed / o.count) : null,
      readableRate: o.count > 0 ? ((o.completed + o.partial_completed) / o.count) : null,
      byResolvedProfile: Object.fromEntries(sortedCounts(o.byProfile)),
    },
    earlyFailed: {
      count: stats.earlyFailed.count,
      retryable: stats.earlyFailed.retryable,
      byErrorCategory: Object.fromEntries(sortedCounts(stats.earlyFailed.byCategory)),
    },
    imageFailures: {
      count: p.count,
      fallbackUsed: p.fallbackUsed,
      isFinalFallback: p.isFinalFallback,
      byErrorCategory: Object.fromEntries(sortedCounts(p.byErrorCategory)),
      byErrorCode: Object.fromEntries(sortedCounts(p.byErrorCode)),
      byProvider: Object.fromEntries(sortedCounts(p.byProvider)),
      byPrimaryProfile: Object.fromEntries(sortedCounts(p.byPrimaryProfile)),
      byFinalProfile: Object.fromEntries(sortedCounts(p.byFinalProfile)),
    },
    candidateGate: {
      candidateRequested: s.candidateRequested,
      candidateAllowed: s.candidateAllowed,
      blocked: s.blocked,
      notApplicable: s.notApplicable,
    },
    latency: {
      bookDurationMs: {
        n: sortedBookMs.length,
        p50: computePercentile(sortedBookMs, 50),
        p95: computePercentile(sortedBookMs, 95),
      },
      pageImageFailedDurationMs: {
        n: sortedPageMs.length,
        p50: computePercentile(sortedPageMs, 50),
        p95: computePercentile(sortedPageMs, 95),
      },
    },
    dataQualityNotes,
  };

  return JSON.stringify(report, null, 2);
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------
function runSelfTest() {
  console.log('\n=== report-generation-slo.mjs self-test ===\n');
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log('  PASS: ' + label);
      passed++;
    } else {
      console.error('  FAIL: ' + label);
      failed++;
    }
  }

  // Fixture events
  const FIXTURE_EVENTS = [
    // generation_started: 3 events
    {
      eventName: 'generation_started',
      bookId: 'book-001',
      userPresent: true,
      templateId: 'fantasy',
      requestedImageModelProfile: 'pro_consistent',
      resolvedImageModelProfile: 'pro_consistent',
      candidateRequested: false,
      candidateAllowed: false,
      candidateDecision: 'not_applicable',
    },
    {
      eventName: 'generation_started',
      bookId: 'book-002',
      userPresent: true,
      templateId: 'bedtime',
      requestedImageModelProfile: 'openai_image_candidate',
      resolvedImageModelProfile: 'openai_image_candidate',
      candidateRequested: true,
      candidateAllowed: true,
      candidateDecision: 'pass',
    },
    {
      eventName: 'generation_started',
      bookId: 'book-003',
      userPresent: false,
      templateId: 'animals',
      requestedImageModelProfile: 'openai_image_candidate',
      resolvedImageModelProfile: 'pro_consistent', // gated -> default
      candidateRequested: true,
      candidateAllowed: false,
      candidateDecision: 'blocked',
    },
    // book_outcome: 3 events
    {
      eventName: 'book_outcome',
      bookId: 'book-001',
      userPresent: true,
      templateId: 'fantasy',
      creationMode: 'fixed_template',
      resolvedImageModelProfile: 'pro_consistent',
      bookStatus: 'completed',
      totalPages: 5,
      completedPages: 5,
      failedPages: 0,
      fallbackPages: 1,
      timedOutPages: 0,
      durationMs: 80000,
    },
    {
      eventName: 'book_outcome',
      bookId: 'book-002',
      userPresent: true,
      templateId: 'bedtime',
      creationMode: 'fixed_template',
      resolvedImageModelProfile: 'openai_image_candidate',
      bookStatus: 'partial_completed',
      totalPages: 5,
      completedPages: 4,
      failedPages: 1,
      fallbackPages: 0,
      timedOutPages: 1,
      durationMs: 120000,
    },
    {
      eventName: 'book_outcome',
      bookId: 'book-003',
      userPresent: false,
      templateId: 'animals',
      creationMode: 'fixed_template',
      resolvedImageModelProfile: 'pro_consistent',
      bookStatus: 'failed',
      totalPages: 5,
      completedPages: 0,
      failedPages: 5,
      fallbackPages: 0,
      timedOutPages: 5,
      durationMs: 600000,
    },
    // book_early_failed: 1 event
    {
      eventName: 'book_early_failed',
      bookId: 'book-004',
      userPresent: true,
      templateId: 'adventure',
      creationMode: 'guided_ai',
      failureStage: 'gemini_story_gen',
      failureProvider: 'gemini',
      errorCategory: 'provider_error',
      retryable: true,
    },
    // page_image_failed: 2 events
    {
      eventName: 'page_image_failed',
      bookId: 'book-002',
      pageIndex: 2,
      primaryProfile: 'openai_image_candidate',
      imageModelProfile: 'openai_image_candidate',
      provider: 'openai',
      isFinalFallbackFailure: true,
      fallbackUsed: false,
      attemptCount: 1,
      timeoutCount: 1,
      durationMs: 122000,
      errorCategory: 'timeout',
      errorCode: 'TIMEOUT',
    },
    {
      eventName: 'page_image_failed',
      bookId: 'book-003',
      pageIndex: 0,
      primaryProfile: 'pro_consistent',
      imageModelProfile: 'klein_fast',
      provider: 'replicate',
      isFinalFallbackFailure: true,
      fallbackUsed: true,
      attemptCount: 2,
      timeoutCount: 0,
      durationMs: 95000,
      failureReason: 'E005: content sensitivity rejection',
      errorCategory: 'safety_or_policy',
      errorCode: 'E005',
    },
    // Privacy test: an event with blocked fields (should be ignored by aggregation)
    {
      eventName: 'book_outcome',
      bookId: 'book-005',
      userPresent: true,
      userId: 'user-xyz-should-be-blocked',   // must not appear in report
      rawPrompt: 'a cute cat story',           // must not appear in report
      childName: 'Taro',                       // must not appear in report
      resolvedImageModelProfile: 'klein_fast',
      bookStatus: 'completed',
      totalPages: 3,
      completedPages: 3,
      failedPages: 0,
      fallbackPages: 0,
      timedOutPages: 0,
      durationMs: 45000,
    },
    // Malformed: missing eventName
    { bookId: 'orphan', someData: 1 },
    // Unknown eventName
    { eventName: 'custom_audit_event', data: 'x' },
  ];

  const stats = aggregateEvents(FIXTURE_EVENTS);

  // --- Count tests ---
  assert('total events = 12', stats.total === 12);
  assert('missing_event_name = 1', stats.missing_event_name === 1);
  assert('unknown_event_name = 1', stats.unknown_event_name === 1);

  // generation_started
  assert('started.count = 3', stats.started.count === 3);
  assert('started.candidateRequested = 2', stats.started.candidateRequested === 2);
  assert('started.candidateAllowed = 1', stats.started.candidateAllowed === 1);
  assert('started.blocked = 1', stats.started.blocked === 1);
  assert('started.notApplicable = 1', stats.started.notApplicable === 1);

  // book_outcome (includes the privacy-test book-005)
  assert('outcome.count = 4', stats.outcome.count === 4);
  assert('outcome.completed = 2', stats.outcome.completed === 2);
  assert('outcome.partial_completed = 1', stats.outcome.partial_completed === 1);
  assert('outcome.failed = 1', stats.outcome.failed === 1);
  assert('outcome.durationMs has 4 entries', stats.outcome.durationMs.length === 4);

  // book_early_failed
  assert('earlyFailed.count = 1', stats.earlyFailed.count === 1);
  assert('earlyFailed.retryable = 1', stats.earlyFailed.retryable === 1);
  assert('earlyFailed.byCategory has provider_error', stats.earlyFailed.byCategory.get('provider_error') === 1);

  // page_image_failed
  assert('pageFailed.count = 2', stats.pageFailed.count === 2);
  assert('pageFailed.fallbackUsed = 1', stats.pageFailed.fallbackUsed === 1);
  assert('pageFailed.isFinalFallback = 2', stats.pageFailed.isFinalFallback === 2);
  assert('pageFailed.byErrorCode has TIMEOUT:1', stats.pageFailed.byErrorCode.get('TIMEOUT') === 1);
  assert('pageFailed.byErrorCode has E005:1', stats.pageFailed.byErrorCode.get('E005') === 1);
  assert('pageFailed.byProvider has openai:1', stats.pageFailed.byProvider.get('openai') === 1);
  assert('pageFailed.byProvider has replicate:1', stats.pageFailed.byProvider.get('replicate') === 1);
  assert('pageFailed.byPrimaryProfile has pro_consistent:1', stats.pageFailed.byPrimaryProfile.get('pro_consistent') === 1);
  assert('pageFailed.byPrimaryProfile has openai_image_candidate:1', stats.pageFailed.byPrimaryProfile.get('openai_image_candidate') === 1);

  // Rates
  const o = stats.outcome;
  const completionRate = o.count > 0 ? o.completed / o.count : null;
  assert('completionRate = 0.5 (2/4)', Math.abs(completionRate - 0.5) < 0.001);
  const readableRate = o.count > 0 ? (o.completed + o.partial_completed) / o.count : null;
  assert('readableRate = 0.75 (3/4)', Math.abs(readableRate - 0.75) < 0.001);

  // Percentiles
  const sortedBookMs = [...o.durationMs].sort((a, b) => a - b);
  const p50 = computePercentile(sortedBookMs, 50);
  assert('book durationMs p50 is a number', typeof p50 === 'number');
  // sorted: [45000, 80000, 120000, 600000] -> p50 = (80000+120000)/2 = 100000
  assert('book durationMs p50 = 100000ms', Math.abs(p50 - 100000) < 1);

  // Privacy guard: blocked fields must not appear in aggregated output
  const jsonOutput = renderJson(stats, []);
  assert('userId not in JSON output', !jsonOutput.includes('user-xyz-should-be-blocked'));
  assert('rawPrompt not in JSON output', !jsonOutput.includes('a cute cat story'));
  assert('childName not in JSON output', !jsonOutput.includes('Taro'));

  // NDJSON parsing
  const ndjsonLines = FIXTURE_EVENTS.slice(0, 3).map((e) => JSON.stringify(e)).join('\n') + '\n{bad json\n';
  const tmpFile = path.join(__dirname, '../.tmp-self-test-input.ndjson');
  fs.writeFileSync(tmpFile, ndjsonLines, 'utf8');
  const parsed = parseInputFile(tmpFile);
  fs.unlinkSync(tmpFile);
  assert('NDJSON: 3 events parsed', parsed.events.length === 3);
  assert('NDJSON: 1 parse error', parsed.parseErrors === 1);

  // JSON array parsing
  const jsonArray = JSON.stringify(FIXTURE_EVENTS.slice(0, 3));
  const tmpFile2 = path.join(__dirname, '../.tmp-self-test-input.json');
  fs.writeFileSync(tmpFile2, jsonArray, 'utf8');
  const parsed2 = parseInputFile(tmpFile2);
  fs.unlinkSync(tmpFile2);
  assert('JSON array: 3 events parsed', parsed2.events.length === 3);
  assert('JSON array: 0 parse errors', parsed2.parseErrors === 0);

  // Markdown output includes expected sections
  const mdOutput = renderMarkdown(stats, [], null);
  assert('markdown has Summary section', mdOutput.includes('## Summary'));
  assert('markdown has Book Outcomes section', mdOutput.includes('## Book Outcomes'));
  assert('markdown has Image Failures section', mdOutput.includes('## Image Failures'));
  assert('markdown has Candidate Gate Signals section', mdOutput.includes('## Candidate Gate Signals'));
  assert('markdown has Latency section', mdOutput.includes('## Latency'));

  // JSON output shape stability
  const jsonReport = JSON.parse(renderJson(stats, ['note1']));
  assert('JSON output has summary', typeof jsonReport.summary === 'object');
  assert('JSON output has bookOutcomes', typeof jsonReport.bookOutcomes === 'object');
  assert('JSON output has imageFailures', typeof jsonReport.imageFailures === 'object');
  assert('JSON output has candidateGate', typeof jsonReport.candidateGate === 'object');
  assert('JSON output has latency', typeof jsonReport.latency === 'object');
  assert('JSON output has dataQualityNotes', Array.isArray(jsonReport.dataQualityNotes));
  assert('JSON output latency.bookDurationMs.p50 exists', jsonReport.latency.bookDurationMs.p50 !== undefined);
  assert('JSON output latency.bookDurationMs.p95 exists', jsonReport.latency.bookDurationMs.p95 !== undefined);

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('');

  if (failed > 0) {
    process.exit(2);
  } else {
    console.log('OK: All self-tests passed.');
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (selfTest) {
  runSelfTest();
  // (process.exit inside runSelfTest)
}

if (!inputFlag) {
  console.error('ERROR: --input <file> is required. Use --help for usage, or --self-test to run tests.');
  process.exit(1);
}

if (!fs.existsSync(inputFlag)) {
  console.error('ERROR: Input file not found: ' + inputFlag);
  process.exit(1);
}

const { events, parseErrors, skippedLines } = parseInputFile(inputFlag);

const dataQualityNotes = [];
if (parseErrors > 0) dataQualityNotes.push(parseErrors + ' line(s) could not be parsed as JSON (skipped).');
if (skippedLines > 0) dataQualityNotes.push(skippedLines + ' line(s) were valid JSON but not objects (skipped).');
if (events.length === 0) {
  console.error('ERROR: No events found in input file. Verify the file is not empty and is NDJSON or JSON array format.');
  process.exit(1);
}

const stats = aggregateEvents(events);

if (stats.missing_event_name > 0) {
  dataQualityNotes.push(stats.missing_event_name + ' event(s) are missing the eventName field.');
}
if (stats.unknown_event_name > 0) {
  dataQualityNotes.push(stats.unknown_event_name + ' event(s) have an unrecognized eventName.');
}

// Warn about blocked fields in input (privacy notice)
let blockedFieldWarn = false;
for (const event of events) {
  for (const field of BLOCKED_FIELDS) {
    if (field in event) {
      blockedFieldWarn = true;
      break;
    }
  }
  if (blockedFieldWarn) break;
}
if (blockedFieldWarn) {
  dataQualityNotes.push('WARNING: Input contains fields that are excluded from report output (e.g. userId, rawPrompt, childName). These are not included in any aggregation.');
}

let output;
const format = formatFlag.toLowerCase();
if (format === 'markdown' || format === 'md') {
  output = renderMarkdown(stats, dataQualityNotes, inputFlag);
} else if (format === 'json') {
  output = renderJson(stats, dataQualityNotes);
} else {
  output = renderConsole(stats, dataQualityNotes);
}

console.log(output);
process.exit(0);
