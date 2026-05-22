/**
 * P5-3c-verify: Print Cloud Logging gcloud query commands for the experiment.
 *
 * Outputs gcloud CLI commands and Cloud Logging filter strings for checking
 * the P5-3c-verify results. Does NOT execute gcloud or make any network calls.
 *
 * Usage:
 *   node scripts/print-p5-3c-verify-log-queries.mjs
 *   node scripts/print-p5-3c-verify-log-queries.mjs --project story-gen-8a769
 *   node scripts/print-p5-3c-verify-log-queries.mjs --hours 4
 *
 * No credentials required. No network calls. Safe to run anywhere.
 */

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const project = getFlag("--project") ?? "story-gen-8a769";
const hoursRaw = getFlag("--hours");
const hours = hoursRaw != null ? parseInt(hoursRaw, 10) : 6;

if (isNaN(hours) || hours <= 0) {
  console.error("Error: --hours must be a positive integer.");
  process.exit(1);
}

const freshness = hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;

// ---------------------------------------------------------------------------
// Filter builders
// ---------------------------------------------------------------------------

/** Generation event filter (covers all generation_event messages) */
function genEventFilter(eventName) {
  return `jsonPayload.message = "generation_event" AND jsonPayload.eventName = "${eventName}"`;
}

/** P5-3c diagnostic log filters */
const FILTERS = {
  cover_vs_page_diagnostic:
    'jsonPayload.message = "cover_vs_page_profile_diagnostic"',
  p5_experiment_active:
    'jsonPayload.message = "p5_page_experiment_active"',
  duplicate_url_detected:
    'jsonPayload.message = "duplicate_page_image_urls_detected"',
  all_identical:
    'jsonPayload.code = "image_prompt.all_identical"',
  low_diversity:
    'jsonPayload.code = "image_prompt.low_diversity"',
  page_image_failed:
    genEventFilter("page_image_failed"),
  book_outcome:
    genEventFilter("book_outcome"),
  book_early_failed:
    genEventFilter("book_early_failed"),
  smoke_suite_combined:
    'jsonPayload.smokeTestMetadata.suite = "p5_3c_verify"',
};

/** Combined filter for all P5-3c diagnostic events */
function combinedFilter() {
  return [
    FILTERS.cover_vs_page_diagnostic,
    FILTERS.p5_experiment_active,
    FILTERS.duplicate_url_detected,
    FILTERS.all_identical,
    FILTERS.low_diversity,
  ]
    .map((f) => `(${f})`)
    .join("\nOR ");
}

function gcloudCmd(filter) {
  return [
    `gcloud logging read \\`,
    `  '${filter}' \\`,
    `  --project=${project} \\`,
    `  --freshness=${freshness} \\`,
    `  --format=json`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const sep = "─".repeat(64);

console.log("");
console.log("=== P5-3c-verify Cloud Logging Query Guide ===");
console.log("");
console.log("This script outputs queries ONLY. No network calls are made.");
console.log("All queries use project: " + project);
console.log("Look-back window: " + freshness);
console.log("");
console.log("Prerequisites:");
console.log("  gcloud auth login");
console.log("  gcloud config set project " + project);
console.log("");
console.log(sep);
console.log("STEP 1: Verify experiment was active on P5-3c-verify books");
console.log(sep);
console.log("");
console.log("Check that cover_vs_page_profile_diagnostic fires and shows:");
console.log('  p5PageExperiment = "simplified_scene"');
console.log('  creationMode = "guided_ai"');
console.log("");
console.log("Filter (Log Explorer):");
console.log(FILTERS.cover_vs_page_diagnostic);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.cover_vs_page_diagnostic));
console.log("");

console.log(sep);
console.log("STEP 2: Verify simplified_scene prompt is active per page");
console.log(sep);
console.log("");
console.log("Each page should have p5_page_experiment_active with:");
console.log("  experiment = 'simplified_scene'");
console.log("  simplifiedPromptLength < originalPromptLength");
console.log("  inputImageUrlsClearedCount (may be 0 if user has no child photo)");
console.log("");
console.log("Filter (Log Explorer):");
console.log(FILTERS.p5_experiment_active);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.p5_experiment_active));
console.log("");

console.log(sep);
console.log("STEP 3: Verify no regressions (duplicate URLs / identical prompts)");
console.log(sep);
console.log("");
console.log("These should be ABSENT for the P5-3c-verify books:");
console.log("  duplicate_page_image_urls_detected");
console.log("  image_prompt.all_identical");
console.log("");
console.log("Filter — duplicate URLs (Log Explorer):");
console.log(FILTERS.duplicate_url_detected);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.duplicate_url_detected));
console.log("");
console.log("Filter — all identical prompts (Log Explorer):");
console.log(FILTERS.all_identical);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.all_identical));
console.log("");

console.log(sep);
console.log("STEP 4: Check page_image_failed count");
console.log(sep);
console.log("");
console.log("Target: page_image_failed = 0 for all 5 cases.");
console.log("");
console.log("Filter (Log Explorer):");
console.log(FILTERS.page_image_failed);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.page_image_failed));
console.log("");

console.log(sep);
console.log("STEP 5: Check book_outcome for all 5 books");
console.log(sep);
console.log("");
console.log("Target: status = 'completed' for all 5 cases.");
console.log("Check: bookReadable=true, imageFailureCount=0, storyDurationMs (no severe regression)");
console.log("");
console.log("Filter (Log Explorer):");
console.log(FILTERS.book_outcome);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.book_outcome));
console.log("");

console.log(sep);
console.log("STEP 6: Check book_early_failed (should be 0)");
console.log(sep);
console.log("");
console.log("Filter (Log Explorer):");
console.log(FILTERS.book_early_failed);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.book_early_failed));
console.log("");

console.log(sep);
console.log("COMBINED: All P5-3c diagnostic events");
console.log(sep);
console.log("");
console.log("Filter (Log Explorer) — paste this for an overview:");
console.log("");
console.log(combinedFilter());
console.log("");

console.log(sep);
console.log("SMOKE SUITE FILTER (all books in this run)");
console.log(sep);
console.log("");
console.log("Filter (Log Explorer):");
console.log(FILTERS.smoke_suite_combined);
console.log("");
console.log("gcloud command:");
console.log(gcloudCmd(FILTERS.smoke_suite_combined));
console.log("");

console.log(sep);
console.log("REMINDER: Do not export raw logs to any committed file.");
console.log("Summarize only aggregate and non-identifying results.");
console.log(sep);
console.log("");
