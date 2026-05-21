# EhonAI Generation SLO Operational Runbook

**Version**: P2-7 (2026-05-19)  
**Status**: Active  
**Scope**: Generation health monitoring, SLO measurement, and incident response for EhonAI production.

---

## 1. Purpose and Audience

This runbook guides developers and operators responsible for maintaining EhonAI generation quality and reliability.

**Use this runbook when:**
- Reviewing weekly generation health.
- A generation failure or quality regression is reported.
- Planning to deploy changes that touch generation routing, provider selection, or candidate gate behavior.
- Investigating a partial_completed spike, E005 outbreak, timeout increase, or candidate profile anomaly.

**This runbook does NOT cover:**
- Firebase Hosting deployment procedures (see `docs/SETUP_GUIDE.md`).
- Firestore schema migration.
- Adding new candidate profiles (requires explicit approval + regression test coverage).
- Changing production default routing.

---

## 2. Current Observability Components

The following components make up the Phase 2 observability stack. They are read-only with respect to production behavior.

| Component | Description | Status |
|---|---|---|
| **P2-2** Structured generation event logging | `functions/src/lib/generation-event-logger.ts` — typed events emitted at key generation lifecycle points | Active |
| **P2-3** Normalized provider error taxonomy | `classifyError()` + `resolveProviderFromProfile()` — structured `ErrorCode` / `ImageProvider` fields on `page_image_failed` events | Active |
| **P2-4** Candidate gate regression tests | `functions/test/candidate-gate.test.ts` — 48 pure regression tests locking gate behavior | Active |
| **P2-5** Public asset URL smoke checker | `scripts/check-public-assets.mjs` — HTTP HEAD all 37 WebP asset URLs, exit 1 on non-200 | Active |
| **P2-6** Generation SLO report script | `scripts/report-generation-slo.mjs` — reads NDJSON/JSON export, produces console/markdown/json report | Active |

### 2.1 Emitted Events

All events are emitted as `jsonPayload.message = "generation_event"` via `firebase-functions/logger`.

| Event name | Emitted when | Key fields |
|---|---|---|
| `generation_started` | Book generation begins (after candidate gate check) | `candidateRequested`, `candidateAllowed`, `candidateDecision`, `resolvedImageModelProfile` |
| `book_outcome` | Book reaches terminal status (completed / partial_completed / failed) | `bookStatus`, `totalPages`, `completedPages`, `failedPages`, `durationMs`, `resolvedImageModelProfile` |
| `book_early_failed` | Book fails before image generation (Gemini error, validation failure) | `failureStage`, `failureProvider`, `errorCategory`, `retryable` |
| `page_image_failed` | All fallback profiles exhausted for a page | `errorCode`, `errorCategory`, `provider`, `primaryProfile`, `fallbackUsed`, `durationMs` |

### 2.2 Error Codes

| Code | Meaning |
|---|---|
| `E005` | Replicate content-sensitivity rejection (flux-2-pro, specific prompt/style combinations) |
| `TIMEOUT` | `ImageTimeoutError` — exceeded 120-second limit |
| `PROVIDER_5XX` | Provider returned HTTP 5xx |
| `PROVIDER_4XX` | Provider returned HTTP 4xx (non-quota, non-E005) |
| `QUOTA_EXCEEDED` | Rate limit or monthly generation quota exceeded |
| `VALIDATION_FAILED` | Input/schema/quality gate failure |
| `FIRESTORE_WRITE_FAILED` | Firestore operation error |
| `NETWORK_ERROR` | Network connectivity error |
| `UNKNOWN` | Default when classification is ambiguous |

### 2.3 Existing Firestore SLO Snapshots

Alongside the structured event logging, production already runs scheduled SLO snapshots:

- `save-daily-slo-snapshot.ts`: Daily at 03:00 JST → `sloSnapshots/` collection
- `save-weekly-slo-snapshot.ts`: Weekly Mon 03:15 JST → `sloSnapshots/weekly_*`
- Admin SLO Dashboard: reads these snapshots — available at `/admin/slo`

The SLO report script (P2-6) supplements this by enabling ad-hoc analysis from Cloud Logging export, including error code and candidate gate signal breakdowns not captured in the Firestore snapshots.

---

## 3. How to Collect Logs

### 3.1 Cloud Logging filter

All generation events share the filter:

```
jsonPayload.message = "generation_event"
```

Additional filter examples:

```
# All events for a specific book (safe — bookId is a system UUID, not PII)
jsonPayload.message = "generation_event" AND jsonPayload.bookId = "YOUR-BOOK-ID"

# Only page image failures
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "page_image_failed"

# Only E005 failures
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "page_image_failed" AND jsonPayload.errorCode = "E005"

# Only timeouts
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "page_image_failed" AND jsonPayload.errorCode = "TIMEOUT"

# Only book outcomes
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_outcome"

# Failed books only
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_outcome" AND jsonPayload.bookStatus = "failed"

# Candidate gate: blocked requests
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "generation_started" AND jsonPayload.candidateDecision = "blocked"
```

### 3.2 Export to NDJSON via gcloud CLI

> **Note**: The commands below are examples. Confirm the project ID, log name, and timestamp range before running. Do not run them without verifying the project context.

```sh
# Step 1: Set project (confirm project ID first)
gcloud config set project story-gen-8a769

# Step 2: Export all generation events from the past 7 days to NDJSON
gcloud logging read \
  'jsonPayload.message = "generation_event"' \
  --project=story-gen-8a769 \
  --format=json \
  --freshness=7d \
  > tmp/generation-events.json

# Step 3: For NDJSON format (one event per line)
gcloud logging read \
  'jsonPayload.message = "generation_event"' \
  --project=story-gen-8a769 \
  --format='value(jsonPayload)' \
  --freshness=7d \
  > tmp/generation-events.ndjson
```

> **Corporate proxy note**: `gcloud` reads system proxy settings automatically on Windows. If authentication fails, verify network access to `googleapis.com` through the proxy.

### 3.3 Export via Cloud Logging UI

1. Open [Cloud Logging > Log Explorer](https://console.cloud.google.com/logs/query) for project `story-gen-8a769`.
2. Enter the filter: `jsonPayload.message = "generation_event"`
3. Set the time range (e.g. last 7 days).
4. Click **Download** → **JSON** or **NDJSON**.
5. Save as `tmp/generation-events.json` (or `.ndjson`).

> The report script supports both Cloud Logging's JSON array format and NDJSON format, and automatically unwraps Cloud Logging's `{ jsonPayload: {...} }` envelope.

### 3.4 Privacy requirements

When exporting logs:
- Confirm exported data does NOT contain `userId`, `rawPrompt`, `childName`, or `storyText`.
- Generation events are designed to exclude these fields (see `generation-event-logger.ts`).
- If unexpected fields appear in the export, do not share the file and notify the team.
- Store exported files in `tmp/` only. Do NOT commit to the repository.

---

## 4. How to Run the SLO Report

### 4.1 Console report (default)

```sh
npm run report:generation-slo -- --input tmp/generation-events.json
```

or equivalently:

```sh
node scripts/report-generation-slo.mjs --input tmp/generation-events.json
```

### 4.2 Markdown report

```sh
node scripts/report-generation-slo.mjs --input tmp/generation-events.json --format markdown > tmp/slo-report.md
```

### 4.3 JSON report (machine-readable)

```sh
node scripts/report-generation-slo.mjs --input tmp/generation-events.json --format json > tmp/slo-report.json
```

### 4.4 Specific time range

Export a scoped NDJSON for a specific time range (e.g. past 24 hours), then run:

```sh
node scripts/report-generation-slo.mjs --input tmp/last-24h-events.ndjson
```

### 4.5 Self-test (no input file required)

```sh
npm run report:generation-slo -- --self-test
```

Expected: `Results: 93 passed, 0 failed`

### 4.6 P4-16 enhanced output sections

As of P4-16, the report includes three additional sections:

- **Story JSON Failure Categories** — `storyJsonFailureCategory` breakdown among `schema_validation` early failures, with per-category share % and all-books rate %.
- **Story Duration Percentiles** — `storyDurationMs` p50/p95/p99 for all events, book outcomes only, and early-failed only.
- **Repair Retry Signals** — `storyGenerationAttempts > 1` count and attempts distribution.

Example (7-day baseline run):

```sh
node scripts/report-generation-slo.mjs --input tmp/p4-15-baseline-events.json --format markdown > tmp/slo-report-p4-16.md
```

For machine-readable output (CI / scripted alerting):

```sh
node scripts/report-generation-slo.mjs --input tmp/p4-15-baseline-events.json --format json > tmp/slo-report.json
```

New JSON fields: `storyJsonFailures`, `repairRetrySignals`, `latency.storyDurationMs`, and `p99` in all latency sections.

### 4.6 Corporate proxy note

The report script reads local files only — no network access. No proxy configuration needed.

---

## 5. How to Run Asset Checks

### 5.1 Full 37-URL smoke check

```sh
npm run check:public-assets
```

Checks all 37 public WebP assets across Groups A/B/C/D against the production URL `https://story-gen-8a769.web.app`.

### 5.2 Against a different environment

```sh
# Against staging/preview URL
node scripts/check-public-assets.mjs --base-url https://your-preview.web.app

# Against local development server (npm run dev must be running on port 3000)
node scripts/check-public-assets.mjs --base-url http://localhost:3000
```

### 5.3 Corporate proxy (required for HTTPS requests on Windows)

Node.js does not read the Windows system proxy automatically. Set `HTTPS_PROXY` before running:

```sh
# PowerShell
$env:HTTPS_PROXY = 'http://proxy.hq.melco.co.jp:9515'
npm run check:public-assets

# Or inline
HTTPS_PROXY=http://proxy.hq.melco.co.jp:9515 node scripts/check-public-assets.mjs
```

### 5.4 Single asset group

```sh
node scripts/check-public-assets.mjs --group A       # Style previews only
node scripts/check-public-assets.mjs --group B,C     # Templates + UI illustrations
```

### 5.5 Stale PNG reference guard

```sh
node scripts/check-public-assets.mjs --stale-png
```

Scans 9 source files for `.png` references in known asset directories. Exit code 2 if found.

### 5.6 Dry run

```sh
node scripts/check-public-assets.mjs --list
```

Prints all 37 URLs that will be checked without making network requests.

---

## 6. SLO / SLI Interpretation Guide

### 6.1 Book-level metrics

| Metric | How to read |
|---|---|
| **completion rate** | `completed / total book_outcomes`. Target ≥ 95% (investigate below). All pages generated successfully. |
| **partial completion rate** | `partial_completed / total`. Some pages failed but book is still readable. Elevated rate → check `page_image_failed` events. |
| **failure rate** | `failed / total`. Target ≤ 2% (investigate above). All pages failed, or story generation failed. |
| **readable rate** | `(completed + partial_completed) / total`. This is the primary UX metric. Target ≥ 98%. |

### 6.2 Page-level metrics

| Metric | How to read |
|---|---|
| **page_image_failed count** | Total pages where all fallback profiles were exhausted. Compare to total pages across books for a rate estimate. |
| **fallbackUsed count** | Pages where the primary profile failed and a fallback was attempted. A rising trend may indicate primary provider instability. |

### 6.3 Error category / code

| Code | What it means operationally |
|---|---|
| **E005** | Prompt/style combination triggered Replicate's content sensitivity filter. Prompt-deterministic — retry/backoff does not help. Inspect which template + style combinations are affected. |
| **TIMEOUT** | Image generation exceeded 120s. Can be provider queue delay (especially `klein_fast`) or overloaded concurrency. |
| **PROVIDER_5XX** | Provider returned a server error (500, 502, 503, 529). Usually transient. Check Replicate/OpenAI status pages. |
| **QUOTA_EXCEEDED** | Monthly generation quota or rate limit hit. Check Replicate/OpenAI usage dashboard. |
| **NETWORK_ERROR** | Network connectivity between Functions and provider failed. Check Functions egress / VPC settings. |
| **UNKNOWN** | Could not classify. May indicate a new provider error format. Inspect `failureReason` field in Cloud Logging. |

### 6.4 Provider distribution

| Signal | What it means |
|---|---|
| **openai** failures appearing | `openai_image_candidate` pages failing. Normal if candidate users are testing. Abnormal if `provider=openai` appears without any `candidateRequested=true` in the corresponding `generation_started` events. |
| **replicate** failures | Expected primary path. High rate → inspect error codes. |

### 6.5 Profile distribution

| Signal | What it means |
|---|---|
| `pro_consistent` dominant | Normal. Production default for all plans. |
| `klein_fast` in `primaryProfile` | Unexpected (klein_fast is fallback only). Investigate if `resolveImageModelProfile` routing changed. |
| `openai_image_candidate` in `primaryProfile` | Only for enrolled candidate users. Any non-zero is expected but must be correlated with `candidateAllowed=true`. |

### 6.6 Candidate gate signals

| Signal | What it means |
|---|---|
| **candidateRequested > 0** | A book arrived with a candidate profile set on its document. |
| **blocked > 0** | Candidate profile was stripped because user was not enrolled. This is the expected gate behavior. |
| **candidateAllowed > 0** | An enrolled user's candidate profile was passed through. Normal if deliberate. |
| **candidateRequested with no candidateAllowed** | All candidate requests were blocked — gate working as expected when no enrollment active. |
| **candidateAllowed unexpectedly high** | Investigate: was `allowCandidateProfile` set incorrectly in Firestore for non-test users? |

### 6.7 Latency

| Metric | Target | How to read |
|---|---|---|
| **book durationMs p50** | < 3 min (180,000ms) | Median full book generation time. |
| **book durationMs p95** | < 10 min (600,000ms) | Tail latency. Spikes indicate timeout cascades. |
| **page image durationMs p50** | < 60s (60,000ms) | Median per-page image time (page_image_failed events only — so already slow/failed pages). |
| **page image durationMs p95** | ≤ 120s (120,000ms) | Matches `withImageTimeout` limit. If p95 > 120s something is wrong with timeout enforcement. |

---

## 7. Suggested Initial Thresholds

> **These are starting thresholds and should be tuned after observing real traffic patterns.**
> **Full threshold policy, severity levels, sample size rules, and decision matrix**: `docs/GENERATION_SLO_THRESHOLD_POLICY.md`

| Metric | Investigate if | Hard concern if |
|---|---|---|
| Readable rate | < 98% | < 95% |
| Completion rate | < 95% | < 90% |
| Failure rate | > 2% | > 5% |
| E005 error code | Increases relative to baseline | Affects >10% of page_image_failed |
| TIMEOUT error code | Increases relative to baseline | Affects >25% of page_image_failed |
| PROVIDER_5XX | Any sustained rate | >5% of page_image_failed in a window |
| book durationMs p95 | > 600,000ms (10 min) | > 900,000ms (15 min) |
| candidateAllowed unexpectedly non-zero | Always investigate if not expected | Any case where `provider=openai` without deliberate enrollment |
| asset URL non-200 | Any failure | Any failure |

---

## 8. Incident Response Playbooks

### 8.1 E005 Spike

**Symptoms**:
- `errorCode = E005` count increases significantly in the report.
- Users report failed images or `image_failed` pages on certain book types.

**Checks**:
```sh
# Filter Cloud Logging for E005 events
# jsonPayload.eventName = "page_image_failed" AND jsonPayload.errorCode = "E005"
# Look at primaryProfile and pageIndex to identify affected template/style combinations
```

**Likely causes**:
- New template or category combination triggering Replicate's content sensitivity filter.
- Style × prompt combination previously not seen (e.g. `imagination` × `crayon` was known to trigger E005 — now on Hold).
- Change in prompt templates that increases sensitivity score.

**Safe first response**:
1. Identify the affected template IDs and style IDs from the Cloud Logging events (`templateId`, `primaryProfile`).
2. Do NOT change provider routing or add workarounds without reviewing the prompt change.
3. If a specific template + style combination is confirmed: place that combination on Hold in the content policy (content-filter.ts or similar).
4. Do NOT retry E005 failures — they are prompt-deterministic.

**Follow-up**:
- Review prompt templates for language that may trigger content filters.
- If systematic, consider adjusting the L1/L2 guardrail patterns in `sanitizeInput`.
- Add a regression test case for the confirmed combination.

---

### 8.2 Timeout Spike

**Symptoms**:
- `errorCode = TIMEOUT` count increases.
- `book_outcome.durationMs` p95 rises significantly.
- Users report slow or partially completed books.

**Checks**:
```sh
# Check which profiles are timing out
# jsonPayload.eventName = "page_image_failed" AND jsonPayload.errorCode = "TIMEOUT"
# Look at: primaryProfile, fallbackUsed, durationMs

# Check Replicate status page (external): https://replicatestatus.com
```

**Likely causes**:
- Replicate queue delay for `pro_consistent` (flux-2-pro) — can happen during high load periods.
- `klein_fast` Starting滞留 (known issue: flux-2-klein-9b may hang at Starting state).
- Timeout value too tight for current provider latency.

**Safe first response**:
1. Check if the timeout is isolated to `klein_fast` fallback — if so, this is a known issue and does not require code change.
2. Check Replicate status page for outage or degradation.
3. If `pro_consistent` is timing out systematically: do NOT change timeout value without team discussion. Document the baseline first.
4. If `partial_completed` rate is rising but books are still readable: acceptable short-term (page regeneration available).

**Do NOT**:
- Change `IMAGE_GENERATION_TIMEOUT_MS` without measuring the p95 baseline first.
- Disable fallback to `klein_fast` — this increases hard failure rate.

---

### 8.3 Provider Error or Quota Spike

**Symptoms**:
- `errorCode = PROVIDER_5XX` or `QUOTA_EXCEEDED` rising.
- Errors across all templates/profiles.

**Checks**:
```sh
# Check which provider is affected
# jsonPayload.provider = "replicate" AND jsonPayload.errorCode = "PROVIDER_5XX"
# Check Replicate / OpenAI status pages
```

**Likely causes**:
- Replicate 529 (Too Many Requests) or 503 (Service Unavailable) — transient.
- Monthly Replicate generation quota exceeded.
- OpenAI API error (only affects enrolled candidate users).

**Safe first response**:
1. Check Replicate and OpenAI status pages.
2. If transient (5xx): wait and monitor. Generation failures are non-destructive — users can regenerate.
3. If quota: check Replicate billing dashboard. Do NOT disable fallback or change routing.
4. Escalate to team if sustained for > 30 minutes.

---

### 8.4 Partial Completed Increase

**Symptoms**:
- `partial_completed` rate rising.
- `page_image_failed` count rising.
- Users reporting missing pages in generated books.

**Checks**:
```sh
# Check book outcomes
node scripts/report-generation-slo.mjs --input tmp/events.json

# Check which profiles are failing pages
# Look at: pageFailed.byPrimaryProfile, pageFailed.byErrorCode

# Check Firestore SLO snapshot in Admin Dashboard: /admin/slo
```

**Likely causes**:
- Single profile causing repeated page failures → fallback also fails.
- E005, timeout, or provider error affecting a common path.
- Specific template × profile combination regression.

**Safe first response**:
1. Identify the dominant error code — then apply the E005 / timeout / provider playbook above.
2. Confirm page regeneration UI is functioning (users can retry failed pages).
3. Do NOT change generation routing to "fix" partial_completed — address the underlying error code.

---

### 8.5 Candidate Profile Leakage Suspicion

**Symptoms**:
- `provider = openai` appearing in `page_image_failed` events more than expected.
- `candidateAllowed` count unexpectedly non-zero for a period when no enrollment testing was active.
- User report of unexpected image quality change (OpenAI vs Replicate output style).

**Checks**:
```sh
# Check generation_started events for candidateDecision
# jsonPayload.eventName = "generation_started" AND jsonPayload.candidateDecision = "pass"
# Correlate bookId from generation_started with page_image_failed provider=openai

# Run the gate regression test suite
cd functions && npm test -- --grep "REGRESSION"
```

**Likely causes**:
- Firestore user doc has `allowCandidateProfile: true` set for a non-test user (operator error).
- `gateImageModelProfile` behavior changed (would fail regression tests in P2-4).

**Safe first response**:
1. Run gate regression tests immediately: `cd functions && npm test` — any failure here is a code regression.
2. If tests pass: the gate code is correct. Check Firestore directly for any user docs with `allowCandidateProfile: true`.
3. If tests fail: **do NOT deploy**. Revert the last change that touched `generate-book.ts` or `replicate.ts`.
4. Remove any unintended `allowCandidateProfile: true` from user docs.

**Do NOT**:
- Deploy any fix before confirming regression tests pass.
- Add new `allowCandidateProfile: true` enrollments during the investigation.

---

### 8.6 OpenAI Candidate Unexpectedly Appearing for Non-Enrolled Users

**Symptoms**:
- Books with `provider = openai` in `page_image_failed` events.
- The corresponding `generation_started` event shows `candidateDecision != "pass"`.

**This is a critical incident.** The gate should prevent this by design.

**Immediate checks**:
```sh
# Confirm regression tests still pass
cd functions && npm test

# Check if resolveImageModelProfile routing changed
git log --oneline functions/src/lib/replicate.ts functions/src/generate-book.ts
```

**Safe first response**:
1. Do NOT investigate live by changing production — gather evidence first.
2. Run full test suite. If `candidate-gate.test.ts` fails → code regression confirmed.
3. If code regression: revert last commit(s) touching generation routing.
4. Document the incident with exact commit range for post-mortem.

---

### 8.7 Public Asset URL Failures

**Symptoms**:
- npm run check:public-assets exits with code 1.
- Users report broken images in the style selector, template thumbnails, or sample preview modal.

**Checks**:
```sh
$env:HTTPS_PROXY = 'http://proxy.hq.melco.co.jp:9515'  # corporate proxy
npm run check:public-assets

# Check specific group
node scripts/check-public-assets.mjs --group B    # template thumbnails
node scripts/check-public-assets.mjs --group A    # style previews
```

**Likely causes**:
- Firebase Hosting deployment did not include the asset files in `out/public/`.
- `next build` ran without the image files present in `public/`.
- Asset paths renamed but Hosting deploy not refreshed.

**Safe first response**:
1. Identify which group/URL is failing.
2. Confirm the file exists locally: `Get-ChildItem public/images/`.
3. If file exists locally but URL returns 404: next build output (`out/`) may be stale. Run `npm run build:clean` then `firebase deploy --only hosting`.
4. Do NOT change asset paths in source files unless a deliberate rename was planned.

---

### 8.8 Stale PNG Reference Regression

**Symptoms**:
- `node scripts/check-public-assets.mjs --stale-png` exits with code 2.
- Source file referencing `.png` path instead of `.webp`.

**Checks**:
```sh
node scripts/check-public-assets.mjs --stale-png
```

**Likely causes**:
- New code change re-introduced a `.png` path for a migrated asset.
- Copy-paste from pre-T7 code.

**Safe first response**:
1. Update the `.png` reference to `.webp` in the identified source file.
2. Confirm the `.webp` file exists in `public/images/`.
3. Run `npm run build` to verify no build error.
4. Run `npm run check:public-assets` to confirm the URL resolves.

---

### 8.9 Firestore Status Consistency Issue

**Symptoms**:
- Book stuck in `generating` status.
- `completed` count low in SLO snapshot but user report indicates generation finished.

**Checks**:
```sh
# Check Admin Dashboard > SLO for recent snapshots
# Check Firestore books collection for stuck generating books
# Review cleanup-stale-generation.ts scheduled function logs in Cloud Logging
```

**Likely causes**:
- Cloud Function crashed mid-generation before `updateBookStatus` ran.
- `cleanup-stale-generation.ts` (daily at 03:30 JST) automatically recovers these — wait for it to run.

**Safe first response**:
1. Wait for `cleanup-stale-generation.ts` to run (daily 03:30 JST).
2. If urgent: manually set the stuck book's status in Firestore Admin Console.
3. Do NOT write `undefined` to Firestore — use `FieldValue.delete()` for field removal.

---

### 8.10 Generation Latency p95 Spike

**Symptoms**:
- `book durationMs p95` significantly above baseline in the SLO report.
- Users reporting books taking very long to generate.

**Checks**:
```sh
node scripts/report-generation-slo.mjs --input tmp/events.json
# Look at: latency.bookDurationMs.p95 vs previous baseline
# Also check: pageFailed.byErrorCode for TIMEOUT increase
```

**Likely causes**:
- Replicate queue delay (pro_consistent).
- Timeout cascade: primary profile times out, fallback also times out → longer total wait.
- Increased concurrency load or changed `IMAGE_CONCURRENCY` setting.

**Safe first response**:
1. Correlate with `TIMEOUT` error code count. If timeouts are high, follow the timeout spike playbook.
2. If durationMs p95 is high but timeouts are low: generation is slow but succeeding. Monitor.
3. Do NOT lower `IMAGE_GENERATION_TIMEOUT_MS` to reduce p95 — this increases failure rate.

---

### 8.11 Story JSON Validation Failure (`schema_validation` / `quality_gate`)

> **P4-1/P4-2/P4-3 Note**: Story JSON validation failures are **pre-image failures**. They must be triaged separately from page image failures (`page_image_failed`). P4-2 added `storyJsonFailureCategory` + `storyDurationMs` to `book_early_failed` log events for sub-classification. P4-3 added deterministic unit fixtures covering all routed failure categories. See `docs/PHASE4_GEMINI_JSON_HARDENING_PLAN.md` for the full hardening plan.

**Symptoms**:
- Book reaches `status = "failed"` with `failureStage = "schema_validation"` or `failureStage = "quality_gate"` in Firestore.
- `book_early_failed` events with `errorCategory = "validation"` appear in Cloud Logging.
- Error message in Firestore `technicalErrorMessage` contains: `"Failed to parse LLM JSON response"`, `"'mainQuestObject' must be a string"`, `"narrativeDevice"`, `"pageVisualRole"`, or similar schema-level error strings.
- No image generation was attempted (no `page_image_failed` events for the same book).

**Cloud Logging filter**:
```
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_early_failed" AND jsonPayload.failureStage = "schema_validation"
```

**Triage steps**:
1. Confirm `failureStage` — is it `schema_validation` (parse/type error) or `quality_gate` (thin content) or `story_generation` (Gemini 5xx)?
   - `schema_validation`: Gemini returned invalid JSON or wrong field types. Likely transient — manual retry often succeeds.
   - `quality_gate`: Story passed JSON parsing but failed content quality checks. Usually means Gemini returned an unusually thin story. Manual retry may succeed.
   - `story_generation`: Gemini returned 5xx / 503. Check Gemini API status.
2. For `schema_validation` failures: this is **not** an image adapter regression. Do not touch `ReplicateImageAdapter`, `OpenAIImageAdapter`, or the candidate gate.
3. Check `storyJsonFailureCategory` in the `book_early_failed` event (P4-2+) for fine-grained sub-classification: `malformed_json`, `schema_structural`, `field_value_invalid`, `field_type_mismatch`, or `unknown`. Note: `field_type_mismatch` errors currently fall to `failureStage: "unexpected"` (see P4-1 §5 routing gap); P4-5 will fix routing.
3b. (P4-12d) When `ENABLE_RESPONSE_SCHEMA=true`, check `storyJsonParseDiagnostics` on the same event for structural metadata: `parseFailureKind` (`empty`, `likely_truncated_object`, `likely_truncated_array`, `fenced_json_unparsed`, `prose_or_refusal`, `malformed_json`), `lengthChars`, `braceBalanceApprox`, `directParseFailed`, and `fallbackExtractionStatus`. This field contains NO raw LLM content.
3c. (P4-14) **`ENABLE_RESPONSE_SCHEMA` is NOT production-supported.** It was conclusively tested (P4-12 through P4-12g, 17 books, ~94% failure rate) and abandoned due to Gemini output token truncation. Do NOT enable `ENABLE_RESPONSE_SCHEMA` as mitigation for `schema_validation` failures. Use existing triage fields (`storyJsonFailureCategory`, `storyDurationMs`) and the permanent safety stack (prompt hardening + `validateStory()` + diagnostics). See [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md) for the full decision record.
4. Check `storyDurationMs` (P4-2+) to confirm the failure happened during story generation and not image generation.
4. If the failure is persistent (> 3 consecutive books fail at `schema_validation`): check whether the Gemini model response format has changed. Run a smoke book and inspect `technicalErrorMessage` in Firestore.
5. Manual retry via admin console or re-trigger is the current recovery path. P4-5 will add automatic retry.

**Important distinctions**:

| Failure | `failureStage` | Caused by | Image generation started? |
|---|---|---|---|
| Story JSON parse failure | `schema_validation` | Gemini response format | **No** |
| Story JSON type error | `schema_validation` | Gemini field type mismatch | **No** |
| Story thin content failure | `quality_gate` | Gemini content quality | **No** |
| Gemini 5xx unavailable | `story_generation` | Provider outage | **No** |
| All pages failed | `image_generation` | Image provider errors | Yes |
| Input rejection (NG word etc.) | `validation` | Content filter | **No** |

**Safe first response**:
1. Do NOT modify provider routing or adapters — this failure happens before image generation.
2. Do NOT enable `ENABLE_RESPONSE_SCHEMA` — it was tested and abandoned (P4-14, ~94% failure rate). See [P4_RESPONSE_SCHEMA_DECISION.md](P4_RESPONSE_SCHEMA_DECISION.md).
3. Check `storyJsonFailureCategory` to identify the failure pattern before taking action:
   - `malformed_json` (transient): monitor; consider `ENABLE_SCHEMA_REPAIR_RETRY` if rate > 2% over 7d (see §5.3 in [P4_PERMANENT_STORY_JSON_SLO_PLAN.md](P4_PERMANENT_STORY_JSON_SLO_PLAN.md))
   - `field_type_mismatch` (systematic): add field-specific entry to `STORY_JSON_FIELD_TYPE_CONTRACT` in `buildSystemPrompt()`; do NOT use repair retry
   - `schema_structural`: missing required field — fix `validateStory()` default handling or prompt
   - `field_value_invalid`: add alias to `normalizePageVisualRole()` or `normalizeStoryCharacterRole()`
4. Do NOT change `ENABLE_SCHEMA_REPAIR_RETRY` without following the decision process in [P4_PERMANENT_STORY_JSON_SLO_PLAN.md §5](P4_PERMANENT_STORY_JSON_SLO_PLAN.md).
5. If isolated to a specific book/user: manual retry via admin console.
6. If widespread: check whether a recent Gemini model version change is causing consistent schema drift. Escalate to team.

**P4-15 SLO monitoring plan**: `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md`
**P4-16 enhanced report**: see §4.6 above — `storyJsonFailureCategory` breakdown and `storyDurationMs` percentiles are now output automatically.
**Phase 4 tracking**: `docs/PHASE4_GEMINI_JSON_HARDENING_PLAN.md`

---

## 9. Change Safety Rules

The following rules must be followed during incident triage and normal development.

### 9.1 During incidents

- **Do NOT change production default routing** during incident triage unless the routing change IS the fix and has been explicitly approved by the team.
- **Do NOT promote a candidate profile to production** based on one successful sample or to work around a Replicate failure.
- **Do NOT deploy** during an unclear incident unless a confirmed fix or rollback has been identified.
- **Do NOT modify `CANDIDATE_IMAGE_PROFILES`** without regression test coverage.

### 9.2 Privacy rules (always)

- **Do NOT** print raw prompts, child names, story text, or user IDs in reports or logs.
- Generation event logging already enforces this via type definitions (`generation-event-logger.ts`).
- The SLO report script (`report-generation-slo.mjs`) ignores blocked fields and keeps output aggregated.
- If unexpected PII appears in an exported log file: do not share the file, do not commit it, notify the team.

### 9.3 Before any generation routing change

1. Confirm all candidate gate regression tests pass: `cd functions && npm test`.
2. Confirm public asset smoke check passes: `npm run check:public-assets`.
3. Review `CANDIDATE_IMAGE_PROFILES` in `functions/src/lib/replicate.ts` — any addition requires explicit test coverage.
4. Generate a smoke book with the new routing before merging.

---

## 10. Verification Checklist

Use this checklist for weekly/manual generation health review.

### 10.1 Weekly review

- [ ] Export last 7 days of generation events from Cloud Logging (Section 3)
- [ ] Run SLO report: `npm run report:generation-slo -- --input tmp/events.json`
- [ ] Confirm readable rate ≥ 98%
- [ ] Confirm failure rate ≤ 2%
- [ ] Review E005 / TIMEOUT / PROVIDER_5XX counts vs previous week baseline
- [ ] Review candidate gate signals (`candidateRequested`, `candidateAllowed`, `blocked`)
- [ ] Run public asset smoke check: `npm run check:public-assets`
- [ ] Run stale PNG guard: `node scripts/check-public-assets.mjs --stale-png`
- [ ] Run hygiene check: `npm run guard:hygiene`
- [ ] Confirm no unexpected routing or candidate changes since last review

### 10.2 Pre-deploy verification

- [ ] `npm run guard:hygiene`
- [ ] `cd functions && npm run build && npm test`
- [ ] `npm run check:public-assets`
- [ ] `node scripts/report-generation-slo.mjs --self-test`
- [ ] Review git diff for any generation routing or gate changes

### 10.3 Post-deploy verification

- [ ] Run `npm run check:public-assets` against the deployed URL
- [ ] Create a smoke book and confirm `completed` status
- [ ] Check Cloud Logging for `book_outcome.bookStatus = "completed"` event

---

## 11. Relationship to Remaining Phase 2 Tasks

| Slice | Description | Status |
|---|---|---|
| P2-1 | Generation SLO and regression guard inventory | ✅ COMPLETE |
| P2-2 | Structured generation event logging | ✅ COMPLETE |
| P2-3 | Normalized provider error taxonomy | ✅ COMPLETE |
| P2-4 | Candidate gate regression tests | ✅ COMPLETE |
| P2-5 | Public asset URL smoke checker | ✅ COMPLETE |
| P2-6 | Generation SLO report script | ✅ COMPLETE |
| P2-7 | Operational runbook (this document) | ✅ COMPLETE |
| **P2-8** | **CI guard selection / non-network guardrails** | ✅ COMPLETE — `.github/workflows/ci-phase2.yml`, `check:phase2` script |
| **P2-9** | **Scheduled reporting automation design** | ✅ COMPLETE — `docs/GENERATION_SLO_AUTOMATION_PLAN.md`, `scripts/print-generation-log-query.mjs` |
| **P2-10** | **SLO threshold policy and Phase 2 closure** | ✅ COMPLETE — `docs/GENERATION_SLO_THRESHOLD_POLICY.md` |

---

## Appendix: Key Files Reference

| File | Purpose |
|---|---|
| `functions/src/lib/generation-event-logger.ts` | Event type definitions, `classifyError()`, `resolveProviderFromProfile()` |
| `functions/src/generate-book.ts` | Main generation logic; event emit sites |
| `functions/src/lib/replicate.ts` | `isCandidateProfile`, `resolveImageModelProfile`, `resolveImageFallbackProfiles`, `CANDIDATE_IMAGE_PROFILES` |
| `functions/src/lib/slo-metrics.ts` | SLO computation from Firestore book/page data |
| `functions/test/candidate-gate.test.ts` | 48 regression tests for candidate gate behavior |
| `scripts/report-generation-slo.mjs` | P2-6 SLO report script |
| `scripts/check-public-assets.mjs` | P2-5 public asset smoke checker |
| `scripts/check-hygiene.mjs` | General hygiene guard |
| `docs/PHASE2_GENERATION_SLO_PLAN.md` | Full P2 design doc, SLO targets, risk inventory, implementation notes |
| `docs/image-model-policy.md` | Provider selection rationale and policy |
| `docs/security-roadmap.md` | Security considerations and App Check rollout |

---

## 12. CI / Local Guardrails (P2-8)

### 12.1 Always-on deterministic checks

These checks run on every push and PR via `.github/workflows/ci-phase2.yml`.
They require no network access and no Firebase credentials.

```bash
# Run all deterministic Phase 2 guards in one command
npm run check:phase2
```

This is equivalent to running the three checks below in sequence:

| Check | Command | Tests |
|---|---|---|
| Hygiene guard | `npm run guard:hygiene` | Forbidden paths, encoding, no secrets |
| SLO report self-test | `npm run report:generation-slo:self-test` | 49 unit tests |
| Generation guard tests | `npm run test:generation-guards` | 102 tests (48 candidate-gate + 54 event-logger) |

### 12.2 Manual / release-only checks

Run these before deploying or when investigating production issues.
They require network access or Firebase credentials and are **not** in mandatory CI.

```bash
# Public asset URL smoke check (requires live Firebase Hosting)
npm run check:public-assets

# SLO report against Cloud Logging export (requires gcloud auth)
node scripts/report-generation-slo.mjs --input export.ndjson

# SLO report self-test only (safe, deterministic)
npm run report:generation-slo:self-test
```

### 12.3 Known pre-existing failures in full functions test suite

The full `cd functions && npx vitest run` has 3 pre-existing failures unrelated to P2 work:

| File | Failure count | Notes |
|---|---|---|
| `test/generate-book.test.ts` | 1 | Pre-P2, tracked separately |
| `test/prompt-builder.test.ts` | 1 | Pre-P2, tracked separately |
| `test/test-image-models.test.ts` | 1 | Pre-P2, tracked separately |

These files are excluded from the `test:generation-guards` script. Do not add them to mandatory CI until the failures are resolved.

---

## 13. Scheduled SLO Reporting Automation (P2-9)

This section describes the planned path to automated SLO reporting.  
See full design: `docs/GENERATION_SLO_AUTOMATION_PLAN.md`

### 13.1 Current capability (P2-9b)

A local dry-run helper is available that prints example gcloud commands without executing them:

```bash
# Print default query for past 7 days (all events)
npm run logs:generation-query

# Print query scoped to a specific project and 24h window
node scripts/print-generation-log-query.mjs --project story-gen-8a769 --hours 24

# Print query for page image failures only
node scripts/print-generation-log-query.mjs --event page_image_failed

# Print query for book outcomes in NDJSON format
node scripts/print-generation-log-query.mjs --event book_outcome --format ndjson
```

Copy the printed commands, authenticate with `gcloud auth login`, then run the export and pipe to the SLO report script.

### 13.2 Manual end-to-end workflow (with gcloud)

```bash
# 1. Print the export command
node scripts/print-generation-log-query.mjs --project story-gen-8a769 --hours 168

# 2. Authenticate (browser opens)
gcloud auth login
gcloud config set project story-gen-8a769

# 3. Create tmp dir (gitignored)
mkdir -p tmp

# 4. Run the printed gcloud export command, redirecting to tmp/
#    (copy exact command from step 1 output)

# 5. Run the SLO report
node scripts/report-generation-slo.mjs --input tmp/generation-events.json

# 6. Optional: save markdown report for review session (do NOT commit)
node scripts/report-generation-slo.mjs --input tmp/generation-events.json --format markdown > tmp/slo-report-$(date +%Y%m%d).md
```

### 13.3 Staged automation plan summary

| Stage | Status | Description |
|---|---|---|
| P2-9a | ✅ Complete | Manual export commands in §3 |
| P2-9b | ✅ Complete | `scripts/print-generation-log-query.mjs` local helper |
| P2-9c | Deferred | Manual-dispatch GitHub Actions (`workflow_dispatch`); needs credential provisioning |
| P2-9d | Deferred | Scheduled GitHub Actions (weekly); requires P2-9c validated first |
| P2-9e | Deferred | Dashboard / artifact retention; after P2-10 threshold tuning |

### 13.4 Privacy reminder for automation

- Raw NDJSON exports go in `tmp/` — gitignored. Never commit them.
- Automated reports should output aggregated metrics only (no `bookId` lists).
- Any Cloud Storage sink or BigQuery table must be private with lifecycle expiry ≤ 90 days.
- See: `docs/GENERATION_SLO_AUTOMATION_PLAN.md §7`

---

## 14. Alert Automation Plan (P2-7 / P2-8 through P2-12)

**Status**: P2-9 metric definitions complete; P2-10 CG-1 metric + policy live (`enabled: true`); P2-12 Email notification channel live.  
**Plans**: `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` | `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` | `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md`

### 14.1 What the plan defines

The alert automation plan (`P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md`) and metric definitions
(`P2_GENERATION_SLO_LOG_BASED_METRICS.md`) document:

- **Alert candidates** with Cloud Logging filters, thresholds, severity, and first-response guidance
- **Story JSON quality alerts** (SJ-1 through SJ-6): schema_validation, malformed_json, field_type_mismatch, storyDurationMs latency
- **Image generation alerts** (IM-1 through IM-9): book readable rate, E005, TIMEOUT, PROVIDER_5XX
- **Candidate gate alert** (CG-1): `candidateAllowed=true` without enrollment — always CRITICAL
- **SLO data quality alerts** (DQ-1, DQ-2): missing events, schema drift
- **Cloud Monitoring log-based metric definitions** (P2-9) and alert policy configuration (P2-10)
- **Dashboard panel additions** (P2-11)
- **Notification routing + incident runbook integration** (P2-12)

### 14.2 Implementation slices

| Slice | Title | Priority |
|---|---|
| **P2-8** | Saved Cloud Logging query definitions | ✅ COMPLETE (docs, 2026-05-21) — `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`; 15 queries (CG/SJ/IM/LAT/OUT/DQ) |
| **P2-9** | Cloud Monitoring log-based metric definitions | ✅ COMPLETE (2026-05-21) — `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md` |
| **P2-10** | CG-1 alert policy definition + live creation | ✅ COMPLETE (live, 2026-05-21) — `docs/P2_CG1_CANDIDATE_GATE_ALERT_POLICY.md`; `enabled: true` |
| **P2-11** | Dashboard panel additions | MEDIUM |
| **P2-12** | Notification routing + CG-1 enable | ✅ COMPLETE (live, 2026-05-21) — Email `notificationChannels/202814648286910376` (kikushun0529@gmail.com); CG-1 `enabled: true` |

CG-1 アラートポリシーは現在 **live かつ enabled**。`candidateAllowed=true` イベントが発生すると 60 秒以内に `kikushun0529@gmail.com` へ CRITICAL メールが送信される。

**インシデント発生時のクエリ起点** (`docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md §6`参照):
- CG-1 アラート発火: まず `CG-1 candidateAllowed true` クエリを確認
- schema_validation/malformed_json/field_type_mismatch: `SJ-1` / `SJ-2` / `SJ-3` クエリを確認
- ページ画像障害: `IM-1 page image failures` → `IM-2`/`IM-3`/`IM-4` でエラーコード別に絞り込み
- 手動 fallback: `node scripts/report-generation-slo.mjs --input tmp/events.json --format console`

### 14.3 Current operational procedure (manual fallback)

Until P2-10 alert policies are live, use the weekly manual review:

```bash
# Export 7 days of generation events (no gcloud required)
node scripts/_export-cloud-logging.mjs --out tmp/events.json --days 7 --project story-gen-8a769

# Run SLO report
node scripts/report-generation-slo.mjs --input tmp/events.json --format console
```

Compare output against P4-15 SLO thresholds:
- `schema_validation` ≤ 2% of `book_early_failed`
- `malformed_json` ≤ 1%, `field_type_mismatch` ≤ 0.5%
- `storyDurationMs` p95 ≤ 120s, p99 ≤ 200s
- Book readable rate ≥ 98%

If thresholds exceeded: follow §3.3 (Investigate) or §3.4 (Incident).

### 14.4 Do-not-do rules (alert automation)

- Do NOT enable `ENABLE_SCHEMA_REPAIR_RETRY` based on dev/test data — production data required
- Do NOT enable `ENABLE_RESPONSE_SCHEMA` without meeting P4-15 §5 criteria
- Do NOT trigger routing changes based on `schema_validation` alert signals — schema issues are Gemini-side, not image-provider-side
- Do NOT escalate below 10 `book_outcome` events — per `GENERATION_SLO_THRESHOLD_POLICY.md §5.1`
