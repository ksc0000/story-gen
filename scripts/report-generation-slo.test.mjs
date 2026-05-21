/**
 * P4-16: Vitest tests for report-generation-slo.mjs
 *
 * Tests cover:
 *   - computePercentile helper: empty, single, odd/even arrays, p50/p95/p99
 *   - storyJsonFailureCategory breakdown (malformed_json, field_type_mismatch, schema_structural, unknown)
 *   - category composition among schema_validation failures
 *   - category rate among total books
 *   - storyDurationMs percentiles (all events, book_outcome only, book_early_failed only)
 *   - storyGenerationAttempts distribution (repair retry signal)
 *   - JSON output contains new sections (storyJsonFailures, repairRetrySignals, latency.storyDurationMs)
 *   - Markdown output contains new headings
 *   - Existing behavior unchanged (summary counts, book outcomes, image failures)
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  computePercentile,
  aggregateEvents,
  renderJson,
  renderMarkdown,
} from './report-generation-slo.mjs';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal generation_started event */
function startedEvent(bookId) {
  return {
    eventName: 'generation_started',
    bookId,
    userPresent: true,
    candidateRequested: false,
    candidateAllowed: false,
    candidateDecision: 'not_applicable',
  };
}

/** book_outcome event (no storyDurationMs by default) */
function outcomeEvent(bookId, bookStatus = 'completed', opts = {}) {
  return {
    eventName: 'book_outcome',
    bookId,
    userPresent: true,
    bookStatus,
    totalPages: 5,
    completedPages: bookStatus === 'completed' ? 5 : 0,
    failedPages: 0,
    fallbackPages: 0,
    timedOutPages: 0,
    durationMs: 90000,
    ...opts,
  };
}

/** book_early_failed event with schema_validation failure */
function schemaFailEvent(bookId, storyJsonFailureCategory, opts = {}) {
  return {
    eventName: 'book_early_failed',
    bookId,
    userPresent: true,
    failureStage: 'schema_validation',
    failureProvider: 'gemini',
    errorCategory: 'validation',
    retryable: false,
    storyJsonFailureCategory,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// computePercentile
// ---------------------------------------------------------------------------

describe('computePercentile', () => {
  it('returns null for empty array', () => {
    expect(computePercentile([], 50)).toBeNull();
    expect(computePercentile([], 95)).toBeNull();
    expect(computePercentile([], 99)).toBeNull();
  });

  it('returns the single value for any percentile', () => {
    expect(computePercentile([42], 50)).toBe(42);
    expect(computePercentile([42], 95)).toBe(42);
    expect(computePercentile([42], 99)).toBe(42);
  });

  it('p50 of even array is midpoint', () => {
    expect(computePercentile([1, 2], 50)).toBe(1.5);
    expect(computePercentile([10, 20, 30, 40], 50)).toBe(25);
  });

  it('p50 of odd array is middle element', () => {
    expect(computePercentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('p95 of [1,2,3,4,5] = 4.8', () => {
    // i = 0.95 * 4 = 3.8, lo=3, hi=4: 4 + (5-4)*0.8 = 4.8
    expect(computePercentile([1, 2, 3, 4, 5], 95)).toBeCloseTo(4.8, 5);
  });

  it('p99 is >= p95', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(computePercentile(arr, 99)).toBeGreaterThanOrEqual(computePercentile(arr, 95));
  });

  it('handles large identical values', () => {
    expect(computePercentile([100, 100, 100], 50)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// storyJsonFailureCategory breakdown
// ---------------------------------------------------------------------------

describe('storyJsonFailureCategory breakdown', () => {
  const events = [
    startedEvent('b1'),
    startedEvent('b2'),
    startedEvent('b3'),
    startedEvent('b4'),
    startedEvent('b5'),
    outcomeEvent('b1', 'completed'),
    schemaFailEvent('b2', 'malformed_json', { storyDurationMs: 3000 }),
    schemaFailEvent('b3', 'malformed_json', { storyDurationMs: 4000 }),
    schemaFailEvent('b4', 'field_type_mismatch', { storyDurationMs: 5000, storyGenerationAttempts: 2 }),
    schemaFailEvent('b5', 'schema_structural', { storyDurationMs: 6000, storyGenerationAttempts: 2 }),
    // non-schema early failure
    {
      eventName: 'book_early_failed',
      bookId: 'b6',
      userPresent: true,
      failureStage: 'gemini_story_gen',
      failureProvider: 'gemini',
      errorCategory: 'provider_error',
      retryable: true,
    },
  ];

  const stats = aggregateEvents(events);

  it('schemaValidationCount = 4', () => {
    expect(stats.earlyFailed.schemaValidationCount).toBe(4);
  });

  it('malformed_json count = 2', () => {
    expect(stats.earlyFailed.byStoryJsonFailureCategory.get('malformed_json')).toBe(2);
  });

  it('field_type_mismatch count = 1', () => {
    expect(stats.earlyFailed.byStoryJsonFailureCategory.get('field_type_mismatch')).toBe(1);
  });

  it('schema_structural count = 1', () => {
    expect(stats.earlyFailed.byStoryJsonFailureCategory.get('schema_structural')).toBe(1);
  });

  it('unknown category is absent when not present in events', () => {
    expect(stats.earlyFailed.byStoryJsonFailureCategory.has('unknown')).toBe(false);
  });

  it('non-schema_validation failures do not populate byStoryJsonFailureCategory', () => {
    // b6 has failureStage=gemini_story_gen, should not add to byStoryJsonFailureCategory
    expect(stats.earlyFailed.schemaValidationCount).toBe(4); // not 5
  });

  it('category composition: malformed_json share = 0.5', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.storyJsonFailures.categoryComposition.malformed_json).toBeCloseTo(0.5, 5);
  });

  it('category composition: field_type_mismatch share = 0.25', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.storyJsonFailures.categoryComposition.field_type_mismatch).toBeCloseTo(0.25, 5);
  });

  it('categoryRateAmongAllBooks uses generation_started denominator (5)', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.storyJsonFailures.totalBooksDenominator).toBe(5);
    expect(json.storyJsonFailures.totalBooksDenominatorNote).toBe('generation_started');
    expect(json.storyJsonFailures.categoryRateAmongAllBooks.malformed_json).toBeCloseTo(2 / 5, 5);
  });

  it('falls back to outcome + earlyFailed when no generation_started events', () => {
    const noStartedEvents = events.filter((e) => e.eventName !== 'generation_started');
    const s = aggregateEvents(noStartedEvents);
    const json = JSON.parse(renderJson(s, []));
    // denominator = outcome(1) + earlyFailed(5) = 6
    expect(json.storyJsonFailures.totalBooksDenominator).toBe(6);
    expect(json.storyJsonFailures.totalBooksDenominatorNote).toBe('outcome + earlyFailed');
  });
});

// ---------------------------------------------------------------------------
// storyDurationMs percentiles
// ---------------------------------------------------------------------------

describe('storyDurationMs percentiles', () => {
  const events = [
    outcomeEvent('b1', 'completed', { storyDurationMs: 4000 }),
    outcomeEvent('b2', 'completed', { storyDurationMs: 5000 }),
    schemaFailEvent('b3', 'malformed_json', { storyDurationMs: 3000 }),
    schemaFailEvent('b4', 'field_type_mismatch', { storyDurationMs: 7000 }),
    schemaFailEvent('b5', 'schema_structural', { storyDurationMs: 2000 }),
  ];

  const stats = aggregateEvents(events);

  it('outcome.storyDurationMs has 2 entries', () => {
    expect(stats.outcome.storyDurationMs.length).toBe(2);
  });

  it('earlyFailed.storyDurationMs has 3 entries', () => {
    expect(stats.earlyFailed.storyDurationMs.length).toBe(3);
  });

  it('JSON latency.storyDurationMs.allEvents.n = 5', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.latency.storyDurationMs.allEvents.n).toBe(5);
  });

  it('JSON latency.storyDurationMs.bookOutcomeOnly.n = 2', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.latency.storyDurationMs.bookOutcomeOnly.n).toBe(2);
  });

  it('JSON latency.storyDurationMs.earlyFailedOnly.n = 3', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.latency.storyDurationMs.earlyFailedOnly.n).toBe(3);
  });

  it('p50/p95/p99 are all numbers', () => {
    const json = JSON.parse(renderJson(stats, []));
    const all = json.latency.storyDurationMs.allEvents;
    expect(typeof all.p50).toBe('number');
    expect(typeof all.p95).toBe('number');
    expect(typeof all.p99).toBe('number');
  });

  it('p95 >= p50', () => {
    const json = JSON.parse(renderJson(stats, []));
    const all = json.latency.storyDurationMs.allEvents;
    expect(all.p95).toBeGreaterThanOrEqual(all.p50);
  });

  it('p99 >= p95', () => {
    const json = JSON.parse(renderJson(stats, []));
    const all = json.latency.storyDurationMs.allEvents;
    expect(all.p99).toBeGreaterThanOrEqual(all.p95);
  });

  it('all events p50 = 4000 (median of [2000,3000,4000,5000,7000])', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.latency.storyDurationMs.allEvents.p50).toBeCloseTo(4000, 0);
  });

  it('returns null when no storyDurationMs events', () => {
    const noStoryMs = aggregateEvents([outcomeEvent('b1', 'completed')]);
    const json = JSON.parse(renderJson(noStoryMs, []));
    expect(json.latency.storyDurationMs.allEvents.p50).toBeNull();
    expect(json.latency.storyDurationMs.allEvents.n).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// storyGenerationAttempts distribution (repair retry signal)
// ---------------------------------------------------------------------------

describe('storyGenerationAttempts (repair retry signals)', () => {
  const events = [
    schemaFailEvent('b1', 'malformed_json', { storyGenerationAttempts: 1 }),
    schemaFailEvent('b2', 'malformed_json', { storyGenerationAttempts: 2 }),
    schemaFailEvent('b3', 'field_type_mismatch', { storyGenerationAttempts: 2 }),
    schemaFailEvent('b4', 'schema_structural'),  // no storyGenerationAttempts field
  ];

  const stats = aggregateEvents(events);

  it('multipleAttemptsCount = 2', () => {
    expect(stats.earlyFailed.multipleAttemptsCount).toBe(2);
  });

  it('storyGenerationAttempts has 3 entries (events with the field)', () => {
    expect(stats.earlyFailed.storyGenerationAttempts.length).toBe(3);
  });

  it('JSON repairRetrySignals.multipleAttemptsCount = 2', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.repairRetrySignals.multipleAttemptsCount).toBe(2);
  });

  it('JSON repairRetrySignals.storyGenerationAttemptsDistribution has "1" and "2"', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.repairRetrySignals.storyGenerationAttemptsDistribution['1']).toBe(1);
    expect(json.repairRetrySignals.storyGenerationAttemptsDistribution['2']).toBe(2);
  });

  it('multipleAttemptsCount = 0 when no events have attempts > 1', () => {
    const noRetry = aggregateEvents([schemaFailEvent('b1', 'malformed_json', { storyGenerationAttempts: 1 })]);
    expect(noRetry.earlyFailed.multipleAttemptsCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// JSON output structure
// ---------------------------------------------------------------------------

describe('JSON output — new P4-16 fields', () => {
  const events = [
    startedEvent('b1'),
    outcomeEvent('b1', 'completed', { storyDurationMs: 4500 }),
    schemaFailEvent('b2', 'malformed_json', { storyDurationMs: 3000 }),
    schemaFailEvent('b3', 'field_type_mismatch', { storyGenerationAttempts: 2 }),
  ];
  const stats = aggregateEvents(events);
  let json;

  it('JSON parses without error', () => {
    expect(() => { json = JSON.parse(renderJson(stats, [])); }).not.toThrow();
  });

  it('has storyJsonFailures section', () => {
    json = JSON.parse(renderJson(stats, []));
    expect(json.storyJsonFailures).toBeDefined();
    expect(typeof json.storyJsonFailures).toBe('object');
  });

  it('has repairRetrySignals section', () => {
    json = JSON.parse(renderJson(stats, []));
    expect(json.repairRetrySignals).toBeDefined();
    expect(typeof json.repairRetrySignals).toBe('object');
  });

  it('latency.storyDurationMs section exists', () => {
    json = JSON.parse(renderJson(stats, []));
    expect(json.latency.storyDurationMs).toBeDefined();
    expect(typeof json.latency.storyDurationMs).toBe('object');
  });

  it('latency.bookDurationMs includes p99', () => {
    json = JSON.parse(renderJson(stats, []));
    expect(json.latency.bookDurationMs.p99).toBeDefined();
  });

  it('existing fields still present (summary, bookOutcomes, earlyFailed, imageFailures, candidateGate, latency)', () => {
    json = JSON.parse(renderJson(stats, []));
    expect(json.summary).toBeDefined();
    expect(json.bookOutcomes).toBeDefined();
    expect(json.earlyFailed).toBeDefined();
    expect(json.imageFailures).toBeDefined();
    expect(json.candidateGate).toBeDefined();
    expect(json.latency).toBeDefined();
    expect(json.dataQualityNotes).toBeDefined();
  });

  it('storyJsonFailures.byStoryJsonFailureCategory lists categories correctly', () => {
    json = JSON.parse(renderJson(stats, []));
    expect(json.storyJsonFailures.byStoryJsonFailureCategory.malformed_json).toBe(1);
    expect(json.storyJsonFailures.byStoryJsonFailureCategory.field_type_mismatch).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Markdown output — new P4-16 sections
// ---------------------------------------------------------------------------

describe('Markdown output — new P4-16 sections', () => {
  const events = [
    startedEvent('b1'),
    outcomeEvent('b1', 'completed', { storyDurationMs: 4500 }),
    schemaFailEvent('b2', 'malformed_json', { storyDurationMs: 3000 }),
    schemaFailEvent('b3', 'field_type_mismatch', { storyGenerationAttempts: 2 }),
    schemaFailEvent('b4', 'schema_structural', { storyDurationMs: 6000, storyGenerationAttempts: 2 }),
  ];
  const stats = aggregateEvents(events);
  const md = renderMarkdown(stats, [], null);

  it('contains Story JSON Failure Categories heading', () => {
    expect(md).toContain('## Story JSON Failure Categories');
  });

  it('contains Story Duration Percentiles heading', () => {
    expect(md).toContain('## Story Duration Percentiles');
  });

  it('contains Repair Retry Signals heading', () => {
    expect(md).toContain('## Repair Retry Signals');
  });

  it('lists malformed_json in the table', () => {
    expect(md).toContain('malformed_json');
  });

  it('lists field_type_mismatch in the table', () => {
    expect(md).toContain('field_type_mismatch');
  });

  it('lists schema_structural in the table', () => {
    expect(md).toContain('schema_structural');
  });

  it('mentions storyGenerationAttempts > 1', () => {
    expect(md).toContain('storyGenerationAttempts > 1');
  });

  it('existing sections still present', () => {
    expect(md).toContain('## Summary');
    expect(md).toContain('## Book Outcomes');
    expect(md).toContain('## Image Failures');
    expect(md).toContain('## Candidate Gate Signals');
    expect(md).toContain('## Latency');
  });

  it('does not show Story JSON Failure Categories when no schema_validation failures', () => {
    const noSchemaFails = aggregateEvents([startedEvent('b1'), outcomeEvent('b1')]);
    const mdNoFail = renderMarkdown(noSchemaFails, [], null);
    expect(mdNoFail).not.toContain('## Story JSON Failure Categories');
    expect(mdNoFail).not.toContain('## Story Duration Percentiles');
    expect(mdNoFail).not.toContain('## Repair Retry Signals');
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility — existing behavior unchanged
// ---------------------------------------------------------------------------

describe('backward compatibility', () => {
  const events = [
    startedEvent('b1'),
    outcomeEvent('b1', 'completed'),
    outcomeEvent('b2', 'partial_completed'),
    outcomeEvent('b3', 'failed'),
    {
      eventName: 'book_early_failed',
      bookId: 'b4',
      userPresent: true,
      failureStage: 'gemini_story_gen',
      failureProvider: 'gemini',
      errorCategory: 'provider_error',
      retryable: true,
    },
  ];

  const stats = aggregateEvents(events);

  it('outcome counts unchanged', () => {
    expect(stats.outcome.completed).toBe(1);
    expect(stats.outcome.partial_completed).toBe(1);
    expect(stats.outcome.failed).toBe(1);
  });

  it('earlyFailed.count = 1', () => {
    expect(stats.earlyFailed.count).toBe(1);
  });

  it('schemaValidationCount = 0 when no schema_validation failures', () => {
    expect(stats.earlyFailed.schemaValidationCount).toBe(0);
  });

  it('byStoryJsonFailureCategory is empty when no schema_validation failures', () => {
    expect(stats.earlyFailed.byStoryJsonFailureCategory.size).toBe(0);
  });

  it('multipleAttemptsCount = 0 when no repair retries', () => {
    expect(stats.earlyFailed.multipleAttemptsCount).toBe(0);
  });

  it('outcome.storyDurationMs is empty when no storyDurationMs in events', () => {
    expect(stats.outcome.storyDurationMs.length).toBe(0);
  });

  it('JSON storyJsonFailures shows empty sections without error', () => {
    const json = JSON.parse(renderJson(stats, []));
    expect(json.storyJsonFailures.schemaValidationCount).toBe(0);
    expect(json.storyJsonFailures.byStoryJsonFailureCategory).toEqual({});
    expect(json.storyJsonFailures.categoryComposition).toEqual({});
    expect(json.storyJsonFailures.categoryRateAmongAllBooks).toEqual({});
    expect(json.latency.storyDurationMs.allEvents.n).toBe(0);
    expect(json.latency.storyDurationMs.allEvents.p50).toBeNull();
  });
});
