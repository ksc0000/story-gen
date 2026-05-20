/**
 * P2-9b: print-generation-log-query.mjs
 *
 * Prints example gcloud logging read commands and Cloud Logging filters for
 * EhonAI generation events. Does NOT execute gcloud or make any network calls.
 * All output is for copy-paste use by a developer with appropriate GCP access.
 *
 * Usage:
 *   node scripts/print-generation-log-query.mjs
 *   node scripts/print-generation-log-query.mjs --project story-gen-8a769
 *   node scripts/print-generation-log-query.mjs --hours 48 --event book_outcome
 *   node scripts/print-generation-log-query.mjs --format ndjson
 *   node scripts/print-generation-log-query.mjs --help
 *
 * Flags:
 *   --project <id>      GCP project ID (default: YOUR_PROJECT_ID)
 *   --hours <n>         Look-back window in hours (default: 168 = 7 days)
 *   --event <name>      Filter to a specific event name (optional)
 *                       Supported: generation_started | book_outcome |
 *                                  book_early_failed | page_image_failed
 *   --format ndjson     Show output in NDJSON format (default: json)
 *   -h, --help          Show this help
 *
 * No dependencies. No credentials. No network access.
 * See: docs/GENERATION_SLO_AUTOMATION_PLAN.md
 */

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const project = getFlag('--project') ?? 'YOUR_PROJECT_ID';
const hoursRaw = getFlag('--hours');
const hours = hoursRaw != null ? parseInt(hoursRaw, 10) : 168;
const event = getFlag('--event') ?? null;
const format = getFlag('--format') ?? 'json';

if (isNaN(hours) || hours <= 0) {
  console.error('Error: --hours must be a positive integer.');
  process.exit(1);
}

const VALID_EVENTS = [
  'generation_started',
  'book_outcome',
  'book_early_failed',
  'page_image_failed',
];

if (event !== null && !VALID_EVENTS.includes(event)) {
  console.error(
    `Error: --event must be one of: ${VALID_EVENTS.join(', ')}\nGot: ${event}`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build filter string
// ---------------------------------------------------------------------------
function buildFilter(eventName) {
  const base = 'jsonPayload.message = "generation_event"';
  const eventClause =
    eventName != null
      ? ` AND jsonPayload.eventName = "${eventName}"`
      : '';
  return base + eventClause;
}

const freshness = hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;

// ---------------------------------------------------------------------------
// Print output
// ---------------------------------------------------------------------------
const projectNote =
  project === 'YOUR_PROJECT_ID'
    ? '  # ← Replace with your actual GCP project ID before running'
    : '';

console.log('');
console.log('=== EhonAI Generation Log Query Helper ===');
console.log('');
console.log('This script outputs example commands only.');
console.log('It does NOT execute gcloud or make any network calls.');
console.log('');
console.log('────────────────────────────────────────────────────────────');
console.log('PARAMETERS');
console.log('────────────────────────────────────────────────────────────');
console.log(`  Project  : ${project}${projectNote}`);
console.log(`  Freshness: ${freshness} (${hours}h look-back)`);
console.log(`  Event    : ${event ?? '(all generation events)'}`);
console.log(`  Format   : ${format}`);
console.log('');

// ---------------------------------------------------------------------------
// Section 1: Cloud Logging filter
// ---------------------------------------------------------------------------
console.log('────────────────────────────────────────────────────────────');
console.log('1. CLOUD LOGGING FILTER (for Log Explorer)');
console.log('────────────────────────────────────────────────────────────');
console.log('');
console.log('Paste this in the Cloud Logging Log Explorer query box:');
console.log('');
console.log(buildFilter(event));
console.log('');

// ---------------------------------------------------------------------------
// Section 2: gcloud export command
// ---------------------------------------------------------------------------
const outputFile =
  event != null
    ? `tmp/generation-events-${event}.${format === 'ndjson' ? 'ndjson' : 'json'}`
    : `tmp/generation-events.${format === 'ndjson' ? 'ndjson' : 'json'}`;

const gcloudFormat = format === 'ndjson' ? 'value(jsonPayload)' : 'json';

console.log('────────────────────────────────────────────────────────────');
console.log('2. EXPORT VIA gcloud CLI');
console.log('────────────────────────────────────────────────────────────');
console.log('');
console.log('Step 1: Authenticate (if not already done)');
console.log('  gcloud auth login');
console.log('');
console.log('Step 2: Confirm project');
console.log('  gcloud config set project ' + project);
console.log('  gcloud config get-value project  # verify before export');
console.log('');
console.log('Step 3: Create output directory');
console.log('  mkdir -p tmp');
console.log('');

if (format === 'ndjson') {
  console.log('Step 4: Export as NDJSON (one JSON object per line)');
  console.log('');
  console.log(
    `  gcloud logging read \\`
  );
  console.log(`    '${buildFilter(event)}' \\`);
  console.log(`    --project=${project} \\`);
  console.log(`    --freshness=${freshness} \\`);
  console.log(`    --format='value(jsonPayload)' \\`);
  console.log(`    > ${outputFile}`);
} else {
  console.log('Step 4: Export as JSON array');
  console.log('');
  console.log(
    `  gcloud logging read \\`
  );
  console.log(`    '${buildFilter(event)}' \\`);
  console.log(`    --project=${project} \\`);
  console.log(`    --freshness=${freshness} \\`);
  console.log(`    --format=json \\`);
  console.log(`    | python3 -c "import sys,json; [print(json.dumps(e.get('jsonPayload', e))) for e in json.load(sys.stdin)]" \\`);
  console.log(`    > ${outputFile}`);
}
console.log('');

// ---------------------------------------------------------------------------
// Section 3: Run report
// ---------------------------------------------------------------------------
console.log('────────────────────────────────────────────────────────────');
console.log('3. RUN SLO REPORT');
console.log('────────────────────────────────────────────────────────────');
console.log('');
console.log('After exporting events, run the SLO report:');
console.log('');
console.log(`  # Console output`);
console.log(`  node scripts/report-generation-slo.mjs --input ${outputFile}`);
console.log('');
console.log(`  # Markdown output`);
console.log(`  node scripts/report-generation-slo.mjs --input ${outputFile} --format markdown`);
console.log('');
console.log(`  # JSON output`);
console.log(`  node scripts/report-generation-slo.mjs --input ${outputFile} --format json`);
console.log('');
console.log('  # Self-test only (no export needed)');
console.log('  node scripts/report-generation-slo.mjs --self-test');
console.log('');

// ---------------------------------------------------------------------------
// Section 4: Specific event filters reference
// ---------------------------------------------------------------------------
console.log('────────────────────────────────────────────────────────────');
console.log('4. USEFUL EVENT-SPECIFIC FILTERS');
console.log('────────────────────────────────────────────────────────────');
console.log('');
const examples = [
  {
    label: 'All generation events (base)',
    filter: 'jsonPayload.message = "generation_event"',
  },
  {
    label: 'Book outcomes only',
    filter: buildFilter('book_outcome'),
  },
  {
    label: 'Page image failures',
    filter: buildFilter('page_image_failed'),
  },
  {
    label: 'E005 failures only',
    filter:
      'jsonPayload.message = "generation_event"' +
      ' AND jsonPayload.eventName = "page_image_failed"' +
      ' AND jsonPayload.errorCode = "E005"',
  },
  {
    label: 'TIMEOUT failures only',
    filter:
      'jsonPayload.message = "generation_event"' +
      ' AND jsonPayload.eventName = "page_image_failed"' +
      ' AND jsonPayload.errorCode = "TIMEOUT"',
  },
  {
    label: 'Candidate gate: blocked',
    filter:
      'jsonPayload.message = "generation_event"' +
      ' AND jsonPayload.eventName = "generation_started"' +
      ' AND jsonPayload.candidateDecision = "blocked"',
  },
  {
    label: 'Candidate gate: allowed (monitor for leakage)',
    filter:
      'jsonPayload.message = "generation_event"' +
      ' AND jsonPayload.eventName = "generation_started"' +
      ' AND jsonPayload.candidateDecision = "allowed"',
  },
];

for (const ex of examples) {
  console.log(`  ${ex.label}:`);
  console.log(`    ${ex.filter}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Section 5: Privacy reminder
// ---------------------------------------------------------------------------
console.log('────────────────────────────────────────────────────────────');
console.log('5. PRIVACY REMINDERS');
console.log('────────────────────────────────────────────────────────────');
console.log('');
console.log('  - Raw exports go in tmp/ — gitignored. Do NOT commit them.');
console.log('  - Generation events contain no prompts, child names, or user IDs.');
console.log('  - bookId is a system UUID — safe for debugging, not for publishing.');
console.log('  - Report output is aggregated only — no raw event fields.');
console.log('  - See: docs/GENERATION_SLO_AUTOMATION_PLAN.md §7');
console.log('');
console.log('────────────────────────────────────────────────────────────');
console.log('');

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
function getFlag(name) {
  const idx = args.findIndex((a) => a === name);
  if (idx < 0) return null;
  const val = args[idx + 1];
  if (val == null || val.startsWith('--')) return null;
  return val;
}

function printHelp() {
  console.log(`
print-generation-log-query.mjs — EhonAI generation log query helper

Prints example gcloud commands and Cloud Logging filters.
Does NOT execute gcloud or make any network calls.

Usage:
  node scripts/print-generation-log-query.mjs [options]

Options:
  --project <id>      GCP project ID (default: YOUR_PROJECT_ID)
  --hours <n>         Look-back window in hours (default: 168 = 7 days)
  --event <name>      Filter to a specific event name (optional)
                      Supported: generation_started | book_outcome |
                                 book_early_failed | page_image_failed
  --format ndjson     Show NDJSON export command instead of JSON (default: json)
  -h, --help          Show this help

Examples:
  node scripts/print-generation-log-query.mjs
  node scripts/print-generation-log-query.mjs --project story-gen-8a769 --hours 24
  node scripts/print-generation-log-query.mjs --event page_image_failed
  node scripts/print-generation-log-query.mjs --event book_outcome --format ndjson
  `);
}
