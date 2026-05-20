# EhonAI Generation SLO Automation Plan

**Version**: P2-9 (2026-05-20)  
**Status**: Design — no secret-dependent automation enabled yet  
**Scope**: Staged path from manual SLO report execution to repeatable scheduled reporting.

---

## 1. Purpose

This document describes the design for automated generation SLO reporting for EhonAI.

The current state after P2-8 is:
- Structured generation events are emitted to Cloud Logging (P2-2).
- A local SLO report script (`scripts/report-generation-slo.mjs`) can read a Cloud Logging NDJSON export and produce console / markdown / JSON reports (P2-6).
- Deterministic CI guards run on every push (P2-8).
- Running the report still requires a manual Cloud Logging export step.

**Goal of P2-9**: Design a safe, staged path toward scheduled SLO reporting.  
P2-9 is design-first. It does not enable secret-dependent automation. That step is deferred to P2-9c/d after credential and privacy review.

---

## 2. Current Building Blocks

| Phase | Component | File | Notes |
|---|---|---|---|
| P2-2 | Structured generation event logging | `functions/src/lib/generation-event-logger.ts` | Typed events at key lifecycle points; no PII |
| P2-3 | Normalized provider error taxonomy | `functions/src/lib/generation-event-logger.ts` | `ErrorCode` / `ImageProvider` classification |
| P2-4 | Candidate gate regression tests | `functions/test/candidate-gate.test.ts` | 48 pure tests locking gate behavior |
| P2-5 | Public asset URL smoke checker | `scripts/check-public-assets.mjs` | HTTP HEAD check for 37 WebP asset URLs |
| P2-6 | SLO report script | `scripts/report-generation-slo.mjs` | Reads NDJSON / JSON array; console / markdown / json output |
| P2-7 | Operational runbook | `docs/GENERATION_SLO_RUNBOOK.md` | Manual export commands, SLO interpretation, incident playbooks |
| P2-8 | Deterministic CI guards | `.github/workflows/ci-phase2.yml` | hygiene + SLO self-test + guard tests; no credentials required |

---

## 3. Data Source Design

Generation events are written to Cloud Logging as structured JSON via `firebase-functions/logger`.  
Four options exist for consuming them in an SLO report.

### 3.1 Manual Cloud Logging export (current)

**How**: Open Cloud Logging → Log Explorer → filter → Download as JSON or NDJSON.  
**Benefits**: No setup. Available immediately. No credentials beyond console access.  
**Constraints**: Manual. Not schedulable via script without CLI auth.  
**Credentials needed**: GCP console login only (browser).  
**Privacy**: Raw export may contain `bookId` (non-PII system UUID). No prompts, child names, or user IDs are stored in generation events (enforced by event type design).  
**Operational complexity**: Low. Best for ad-hoc and incident review.

### 3.2 Cloud Logging export via gcloud CLI

**How**: `gcloud logging read "jsonPayload.message = \"generation_event\""` → piped to NDJSON file → run report script.  
**Benefits**: Scriptable. Composable with local reporting. No persistent sink needed.  
**Constraints**: Requires `gcloud auth login` or service account. Not suitable for keyless CI.  
**Credentials needed**: `roles/logging.viewer` or equivalent on project `story-gen-8a769`.  
**Privacy**: Same as manual export — safe if scoped to generation events only. Raw export must not be committed to the repo.  
**Operational complexity**: Low-medium. Suitable for manual dispatch GitHub Actions (P2-9c).

### 3.3 Cloud Logging sink to Cloud Storage

**How**: Create a Logging sink that exports generation events to a GCS bucket. Report script reads from GCS.  
**Benefits**: No manual export step. Persistent event archive.  
**Constraints**: Requires infrastructure change (sink creation, bucket creation, IAM). Adds operational surface.  
**Credentials needed**: Sink admin IAM, Storage IAM.  
**Privacy**: Bucket must be private; lifecycle policy required; raw exports must not be committed.  
**Operational complexity**: Medium. Useful for P2-9d and beyond.

### 3.4 Cloud Logging sink to BigQuery

**How**: Create a Logging sink that streams generation events into a BigQuery table. Query directly or schedule reports.  
**Benefits**: SQL-queryable. Scalable. Supports dashboard tools.  
**Constraints**: Most infrastructure investment. Requires BQ dataset creation, IAM, and schema validation.  
**Credentials needed**: BQ IAM, Logging sink admin.  
**Privacy**: Table must be private; column-level security for any future fields.  
**Operational complexity**: High. Best after basic automation is validated (P2-9e / P2-10+).

### 3.5 Local fixture / self-test input

**How**: Run `report-generation-slo.mjs --self-test` or `--input ./tmp/events.ndjson` against a locally saved export.  
**Benefits**: No credentials. Deterministic. Works in CI.  
**Constraints**: Not production data. Cannot track real SLO trends.  
**Credentials needed**: None.  
**Privacy**: Fixtures must not contain real production events.  
**Operational complexity**: None. Already implemented in P2-6/P2-8.

---

## 4. Recommended Staged Path

### P2-9a — Documented manual export commands (current doc)

**Status**: ✅ Complete (documented in `docs/GENERATION_SLO_RUNBOOK.md` §3)

- Cloud Logging filter documented.
- Manual gcloud export commands documented with project placeholder.
- Report script usage documented.

### P2-9b — Local dry-run query helper

**Status**: ✅ Complete (this P2-9 deliverable)

- `scripts/print-generation-log-query.mjs` — prints example gcloud commands and filters.
- Accepts `--project`, `--hours`, `--event`, `--format` flags.
- Does **not** execute gcloud; output only.
- No credentials required.
- `npm run logs:generation-query` package script added.

### P2-9c — Manual-dispatch GitHub Actions workflow

**Status**: Deferred — requires credential review

Design:
- New workflow: `.github/workflows/slo-report-manual.yml`
- Trigger: `workflow_dispatch` only (never scheduled automatically).
- Uses a repository/environment secret: `GCP_SA_KEY_LOGGING_VIEWER` or OIDC Workload Identity.
- Steps: checkout → `gcloud auth` → export events → run SLO report → upload artifact.
- Output: GitHub Actions artifact (markdown + JSON report), retained 30 days.
- No deployment. No Firestore write. No candidate gate change.

**Prerequisite**: Secret/credential provisioned and reviewed by repo owner before enabling.

### P2-9d — Scheduled GitHub Actions workflow

**Status**: Deferred — after P2-9c is validated

Design:
- Add `schedule: cron('0 5 * * 1')` to the manual workflow (weekly Monday 05:00 UTC = 14:00 JST).
- Notify on failure via GitHub Actions notification (no external webhook needed).
- Artifact retained 30 days.

**Prerequisite**: P2-9c validated for at least 2 weeks.

### P2-9e — Dashboard or long-term artifact retention

**Status**: Deferred — after P2-9d + P2-10

Options:
- Parse JSON report artifact and append to a `docs/slo-reports/YYYY-WW.md` trend file (committed).
- Export to Cloud Storage for Looker Studio / Data Studio dashboard.
- BigQuery sink + scheduled query.

---

## 5. Cloud Logging Query Design

All generation events are tagged with `jsonPayload.message = "generation_event"`.

### 5.1 Base filter

```
jsonPayload.message = "generation_event"
```

### 5.2 Event-scoped filters

```
# All generation_started events
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "generation_started"

# Book outcomes (completed / partial_completed / failed)
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_outcome"

# Page image failures (all)
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "page_image_failed"

# Early book failures (pre-image generation)
jsonPayload.message = "generation_event" AND jsonPayload.eventName = "book_early_failed"
```

### 5.3 Failure signal filters

```
# E005 content-sensitivity rejections
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "page_image_failed"
  AND jsonPayload.errorCode = "E005"

# TIMEOUT failures
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "page_image_failed"
  AND jsonPayload.errorCode = "TIMEOUT"

# Hard failed books
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_outcome"
  AND jsonPayload.bookStatus = "failed"

# Partial completed books (some pages failed but book is readable)
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "book_outcome"
  AND jsonPayload.bookStatus = "partial_completed"
```

### 5.4 Candidate gate filters

```
# Any book where a candidate profile was requested
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "generation_started"
  AND jsonPayload.candidateRequested = true

# Candidate gate: blocked
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "generation_started"
  AND jsonPayload.candidateDecision = "blocked"

# Candidate gate: allowed (should be rare)
jsonPayload.message = "generation_event"
  AND jsonPayload.eventName = "generation_started"
  AND jsonPayload.candidateDecision = "allowed"
```

### 5.5 Time-scoped gcloud example

Replace `YOUR_PROJECT_ID` with the confirmed project ID (e.g. `story-gen-8a769`).  
Do not hardcode this in CI until service account credentials are provisioned.

```sh
gcloud logging read \
  'jsonPayload.message = "generation_event"' \
  --project=YOUR_PROJECT_ID \
  --freshness=7d \
  --format=json \
  | python3 -c "import sys,json; [print(json.dumps(e)) for e in json.load(sys.stdin)]" \
  > tmp/generation-events.ndjson

node scripts/report-generation-slo.mjs --input tmp/generation-events.ndjson --format markdown
```

### 5.6 Known field mapping

| Cloud Logging field | Event field | Notes |
|---|---|---|
| `jsonPayload.eventName` | `eventName` | `generation_started`, `book_outcome`, etc. |
| `jsonPayload.bookId` | `bookId` | System UUID — non-PII |
| `jsonPayload.errorCode` | `errorCode` | `E005`, `TIMEOUT`, etc. |
| `jsonPayload.errorCategory` | `errorCategory` | `content_sensitivity`, `timeout`, etc. |
| `jsonPayload.provider` | `provider` | `replicate`, `openai` |
| `jsonPayload.primaryProfile` | `primaryProfile` | Image model profile ID |
| `jsonPayload.bookStatus` | `bookStatus` | `completed`, `partial_completed`, `failed` |
| `jsonPayload.candidateRequested` | `candidateRequested` | boolean |
| `jsonPayload.candidateDecision` | `candidateDecision` | `allowed`, `blocked`, `not_applicable` |

---

## 6. Output and Retention Design

### 6.1 What to keep

| Output type | Where | Committed? | Notes |
|---|---|---|---|
| Console report | stdout | No | Ad-hoc human review |
| Markdown report (`--format markdown`) | Redirect to file | No (see §6.3) | For review sessions |
| JSON report (`--format json`) | Redirect to file | No (see §6.3) | For automated comparison |
| GitHub Actions artifact | GH Actions tab | No (retained 30d) | Safe after P2-9c |
| Trend summary (aggregated, no raw data) | `docs/slo-reports/YYYY-WW.md` | Yes (opt-in, P2-9e+) | Aggregated metrics only |

### 6.2 What must not be committed

- Raw Cloud Logging NDJSON exports.
- Any file containing `bookId` lists or raw event fields.
- Reports generated from real production data.
- Any file in `tmp/` or `_tmp_*` that was not created as a fixture.

### 6.3 Gitignore policy for SLO reports

The following patterns must be present in `.gitignore` (or added when `docs/slo-reports/` is created):

```
# Raw Cloud Logging exports — never commit
tmp/generation-events*.ndjson
tmp/generation-events*.json

# SLO report output files (raw, not trend summaries)
tmp/slo-report-*.md
tmp/slo-report-*.json
```

The `docs/slo-reports/` directory (if created in P2-9e) should only contain aggregated weekly summaries with no raw event data.

---

## 7. Privacy and Data Handling

Generation events are designed to emit no PII (enforced by TypeScript event types in P2-2).

**Never include in reports or exports:**
- Raw user IDs (only hashed or omitted)
- Child names
- Prompt text or story text
- Raw image URLs linked to individual users

**Safe to include in reports:**
- `bookId` (system UUID) — for debugging only, not in published reports
- Aggregate counts and rates (completion rate, failure rate, etc.)
- Percentile latency values
- Error code distributions
- Provider and profile breakdowns (aggregated)
- Candidate gate signal counts

**When collecting from Cloud Logging:**
- Scope filters to `jsonPayload.message = "generation_event"` only — avoids other log types.
- Do not log entire `jsonPayload` — inspect only known event fields.
- Raw NDJSON exports must be stored in `tmp/` (gitignored) and deleted after use.
- If Cloud Storage sink is added (P2-9d), the bucket must be private with lifecycle expiry of ≤ 90 days.

---

## 8. Scheduling and Access Model Comparison

| Model | Credentials needed | Reliability | Operational cost | Recommended for |
|---|---|---|---|---|
| Manual local run | GCP console login | Low (on-demand) | Low | Incident review, ad-hoc |
| gcloud CLI local | `gcloud auth login` | On-demand | Low | Weekly by developer |
| Manual-dispatch GH Actions | Repository secret (SA key or OIDC) | On-demand | Low-medium | P2-9c validated run |
| Scheduled GH Actions | Same as above | Weekly | Medium | P2-9d after validation |
| Cloud Scheduler / Cloud Run | GCP IAM | High | Medium-high | P2-10+ after business need |
| BigQuery scheduled query | BQ IAM | High | High | P2-9e+ with dashboard |

---

## 9. Failure Modes

| Failure | Cause | Mitigation |
|---|---|---|
| No logs returned | Wrong time range, project mismatch, log sink not yet active | Widen time range; confirm project ID; check log explorer manually |
| Malformed JSON in export | Cloud Logging format inconsistency | Script handles parse errors gracefully (logged as `dataQualityNotes`) |
| Auth failure (`gcloud`) | Expired credentials, wrong project | Re-authenticate; confirm `gcloud config get-value project` |
| Missing `jsonPayload` | Log entry is a text log, not structured | Filter strictly to `jsonPayload.message = "generation_event"` |
| Empty event count | All events filtered out | Check eventName spelling; check log timestamp timezone |
| Network/proxy failure | Corp proxy blocks `logging.googleapis.com` | Use Cloud Logging UI export; or configure gcloud proxy |
| Privacy-sensitive unexpected fields | Future code accidentally adds PII to events | Review event type definitions before any event schema change |
| Report script parse warning | Unknown event name, missing field | Warnings shown in `dataQualityNotes`; does not fail report |
| `tmp/` export committed | Developer forgot to add gitignore | Add gitignore patterns in §6.3; pre-commit hygiene check |

---

## 10. P2-10 Handoff

P2-10 should:

1. **Tune SLO thresholds** — after at least 2 weeks of real traffic data collected via manual export, update the conservative thresholds in `docs/GENERATION_SLO_RUNBOOK.md §7` to reflect observed production rates.

2. **Decide on scheduled automation** — review whether P2-9c (manual-dispatch GitHub Actions) is sufficient, or whether P2-9d (scheduled) is justified by operational need.

3. **Review candidate gate allowance rate** — if `candidateAllowed` rate is non-zero in production, review and confirm it is within policy.

4. **Lock thresholds in CI** — optionally add a threshold-check step to `ci-phase2.yml` that compares a saved baseline report against the self-test fixture.

> **P2-10 is now complete.** Threshold policy, severity levels, decision matrix, sample size rules, weekly review process, release gate checklist, and Phase 2 closure summary are documented in `docs/GENERATION_SLO_THRESHOLD_POLICY.md`.

---

## Appendix: Key Files

| File | Purpose |
|---|---|
| `scripts/report-generation-slo.mjs` | SLO report script (reads NDJSON / JSON array) |
| `scripts/print-generation-log-query.mjs` | Prints example gcloud commands and filters (P2-9b) |
| `scripts/check-public-assets.mjs` | Public asset URL smoke checker |
| `scripts/check-hygiene.mjs` | Hygiene guard |
| `docs/GENERATION_SLO_RUNBOOK.md` | Operational runbook (manual steps, incident response) |
| `docs/PHASE2_GENERATION_SLO_PLAN.md` | Full Phase 2 design doc, SLO targets, implementation notes |
| `.github/workflows/ci-phase2.yml` | Deterministic CI workflow (no credentials needed) |
| `functions/src/lib/generation-event-logger.ts` | Event type definitions and emit logic |
| `functions/test/candidate-gate.test.ts` | 48 candidate gate regression tests |
| `functions/test/generation-event-logger.test.ts` | 54 event shape / taxonomy tests |
