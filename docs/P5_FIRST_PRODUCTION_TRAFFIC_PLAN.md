# P5-1: First Production Traffic / Soft Launch Plan

**Task**: P5-1  
**Created**: 2026-05-21  
**Status**: PLANNED — no users invited yet  
**Scope**: Docs-only. No live resources created or modified.

---

## 1. Objective

1. Safely collect the first real production book generations from real users.
2. Validate the monitoring stack under genuine user traffic.
3. Accumulate ≥ 30 real production `book_outcome` events in a 7-day window.
4. Use that data to run a valid prod-baseline and evaluate SJ/IM alert policy enablement.
5. Make a data-driven decision on `ENABLE_SCHEMA_REPAIR_RETRY`.

This task does NOT send invitations, create users, or deploy Firebase. Those steps are out-of-scope until explicitly approved.

**Related**: Invitation templates, tester instructions, feedback form spec, and operator pre-send checklist are defined in `docs/P5_SOFT_LAUNCH_INVITE_KIT.md` (P5-2). That document also contains templates in Japanese. No invitations are sent by P5-2 either — sending is a separate manual step.

---

## 2. Current Readiness State

| Dimension | State |
|---|---|
| Monitoring | ✅ **READY FOR FIRST PRODUCTION TRAFFIC** |
| CG-1 alert (CRITICAL) | ✅ LIVE — `enabled: true` |
| SJ/IM alert policies | ⏸ LIVE — intentionally `enabled: false` |
| Generation SLO Dashboard | ✅ LIVE |
| `story_duration_ms` p95/p99 panel | ✅ LIVE |
| Email notification channel | ✅ LIVE (kikushun0529@gmail.com) |
| Saved Cloud Logging queries | ✅ Defined (manual import) |
| `report-generation-slo.mjs` | ✅ Available (93 self-tests pass) |
| Firebase Hosting | ✅ https://story-gen-8a769.web.app |
| prod-baseline | ⚠️ ATTEMPTED (2026-05-21) — 19 `book_outcome` events, dev/test only |
| Production users | ⏳ **None yet** |

**Dashboard URL**:  
https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769

Full monitoring resource inventory: `docs/P2_PRODUCTION_MONITORING_READINESS.md`

---

## 3. Soft Launch Cohorts

The recommended rollout is three progressive cohorts. Move to the next cohort only after observing stable generation outcomes in the current one.

> **Note**: The app currently uses open Google Sign-In with no invite gate. Until an invite system is implemented (see §9 follow-ups), cohort separation is operational (controlled by whom you share the URL with) rather than enforced at the app layer.

### Cohort A — Internal / Operator (3–5 people)

**Who**: Project operators, developers, designated testers with knowledge of the monitoring stack.  
**Books expected**: 5–10 per person = 15–50 `book_outcome` events  
**Purpose**:
- Confirm the end-to-end happy path works under real Firebase production environment.
- Verify CG-1 dashboard reads correctly (should remain 0).
- Catch any Firestore rule, Storage permission, or CDN issues before exposing to external users.
- Validate that `generation_event` logs appear in Cloud Logging with correct structure.

**Gate to Cohort B**:
- ≥ 10 successful `book_outcome` events (status: completed or partial_completed).
- No CG-1 alert fired for unintended candidate enrollment.
- Dashboard panels show expected data.
- No launch-blocking errors in Cloud Logging.

### Cohort B — Trusted Friendly Users (5–10 people)

**Who**: Personal contacts, family members, or known beta testers who understand this is a pre-launch product.  
**Books expected**: 3–5 per person = 15–50 `book_outcome` events  
**Purpose**:
- First non-operator real user traffic.
- Validate that the user flow (login → create → reader) works for non-technical users.
- Capture first realistic storyDurationMs latency data.
- Identify UX friction before broader beta.

**Gate to Cohort C**:
- ≥ 30 `book_outcome` events total (Cohort A + B combined, excluding dev/test — see §7).
- Readable rate ≥ 95% (below SLO target but acceptable for soft launch).
- storyDurationMs p95 ≤ 180s (investigate threshold).
- No sustained image failure spike (IM panel stable).

### Cohort C — Broader Beta (20–30 users)

**Who**: Extended network, opt-in beta list.  
**Books expected**: 2–5 per person = 40–150 `book_outcome` events  
**Purpose**:
- Build sufficient statistical volume for a robust production baseline.
- Identify cohort-specific patterns (theme preferences, creation mode distribution).
- Validate LAT-1 latency behavior under concurrent usage.

**Gate to open beta / public access**:
- Valid production baseline confirmed (see §8).
- SJ/IM policies tuned and enabled (P2-10b-enable).
- `ENABLE_SCHEMA_REPAIR_RETRY` decision made (see §8.4).
- Readable rate ≥ 98% sustained over ≥ 3 days.

---

## 4. Target Generation Volume

| Gate | Count | Purpose |
|---|---|---|
| **Monitoring sanity check** | ≥ 5 `book_outcome` events | Confirm logs appear, dashboard data flows |
| **Cohort A gate** | ≥ 10 `book_outcome` events | Internal operator validation complete |
| **Minimum baseline gate** | ≥ 30 `book_outcome` events (real users) | Required to run a valid prod-baseline |
| **Recommended baseline** | 50–100 `book_outcome` events | Sufficient for stable SLO percentile estimates |
| **SJ/IM policy enablement** | ≥ 30 events + stable rates | Required before enabling SJ/IM alert policies |

**What counts toward the production baseline**:
- `book_outcome` events with real Firebase Auth user IDs.
- Books generated through the standard user-facing UI flow.
- All creation modes (`fixed_template`, `guided_ai`, `original_ai`) count.
- `completed` and `partial_completed` both count.

**What does NOT count**:
- Dev/test books generated from local development environments.
- Smoke test books created by `scripts/create-*.js` scripts.
- Books where `bookId` follows a known smoke/test naming pattern (e.g., `smoke-`, `test-`, `qa-`).
- Books generated by authenticated users who are known operators using admin tooling.

---

## 5. Pre-Launch Checklist

Complete all items before inviting Cohort A users.

### 5.1 Hosting and app access

- [ ] Firebase Hosting URL is reachable: https://story-gen-8a769.web.app
- [ ] Google Sign-In works end-to-end (sign in → redirect to `/home`)
- [ ] Child profile creation works (used to personalize books)
- [ ] `/create` page loads and shows available themes/templates
- [ ] Book generation happy path completes (theme → generate → `/reader`)
- [ ] Generated book displays correctly in reader (all pages, images, text)

### 5.2 Monitoring verification

- [ ] Dashboard is accessible: https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769
- [ ] Panel 1 (CG-1) shows 0 after a test generation
- [ ] Panel 2 (OUT-1) increments after a test generation
- [ ] Panel 7 (LAT-1) shows p95 / p99 values after ≥ 1 book
- [ ] Cloud Logging shows `generation_event` entries with correct structure
- [ ] CG-1 email alert is reachable (send a test from Cloud Console if possible)

### 5.3 Policies and flags

- [ ] `ENABLE_RESPONSE_SCHEMA` — absent from `.env.local` and all Functions config
- [ ] `RESPONSE_SCHEMA_MODE` — absent
- [ ] `ENABLE_SCHEMA_REPAIR_RETRY` — absent
- [ ] SJ/IM alert policies remain `enabled: false` (verify via `gcloud monitoring policies list`)
- [ ] CG-1 policy is `enabled: true`

### 5.4 Support

- [ ] Operator knows how to access Cloud Console and read the dashboard
- [ ] Operator has the email address receiving CG-1 alerts
- [ ] A support/feedback route is defined for Cohort A users (e.g., direct message, email)
- [ ] Known limitations are communicated to Cohort A users (see §10)

---

## 6. First-User Operating Procedure

Follow this procedure as Cohort A users begin generating books.

### 6.1 During first book generations

1. Open the Generation SLO Dashboard.
2. **Panel 1 (CG-1)**: Confirm value remains **0**. Any non-zero value → investigate immediately (automatic CRITICAL email alert fires).
3. **Panel 2 (OUT-1)**: Confirm `book_outcomes_total` increments. Confirm `book_outcome_failed` stays at 0.
4. **Panel 7 (LAT-1)**: Confirm storyDurationMs p95 is below the 120,000ms threshold line (green zone).
5. **Panel 6 (IM-1)**: Confirm no page failure spike. Some `page_image_failed` events are expected if fallback triggers; a spike (> 5/1h) is a concern.
6. Check the user's book in Firebase Console / Firestore to confirm status = `completed` or `partial_completed`.

### 6.2 If an anomaly appears on the dashboard

1. Run the relevant saved query in Cloud Console Log Explorer.  
   Reference: `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md`
2. Identify the `book_outcome` or `book_early_failed` event and inspect `failureStage`, `storyJsonFailureCategory`, `errorCode`.
3. If a book is `failed` or `partial_completed`, offer the user a manual regeneration of failed pages.

### 6.3 Do not do (regardless of what is observed)

- Do NOT enable `ENABLE_RESPONSE_SCHEMA`, `RESPONSE_SCHEMA_MODE`, or `ENABLE_SCHEMA_REPAIR_RETRY`.
- Do NOT enable any SJ/IM alert policies — the sample size is too small to avoid false positives.
- Do NOT deploy Firebase Functions or Hosting to fix minor issues observed during soft launch without a proper review.
- Do NOT change prompts, fallback order, or ImageProvider routing based on observations from < 30 books.

---

## 7. Data Quality Rules

### 7.1 Distinguishing production from dev/test traffic

Currently, there is no automated tag or user-ID pattern that distinguishes dev/test books from real user books. The following conventions apply:

| Traffic type | Identification method |
|---|---|
| **Smoke test books** | `bookId` prefix: `smoke-` (created by `scripts/create-*.js`). Filter out in export. |
| **Dev/test books** | Generated from `localhost` or local emulator; will NOT appear in production Cloud Logging. |
| **Operator test books** | Firebase Auth UID of known operator accounts. Exclude specific UIDs if tracking in a separate list. |
| **Real user books** | All remaining `book_outcome` events from authenticated users not on the exclusion list. |

### 7.2 Smoke test book exclusion in SLO report

When running the SLO report after accumulating production data, inspect whether any `bookId` values follow a smoke/test pattern. If the `report-generation-slo.mjs` script does not yet support `--exclude-bookid-prefix` filtering, manually check the `book_outcome` count without the smoke entries.

> **Follow-up required**: See §9.1 — add `--exclude-bookid-prefix` flag or test-user-UID exclusion to `report-generation-slo.mjs`.

### 7.3 Privacy constraints

- Do NOT include real user IDs, names, story themes, or child names in this document or in committed files.
- The SLO report (`report-generation-slo.mjs`) is privacy-safe by design: it outputs only aggregate counts and percentiles, no PII.
- Raw log exports (`tmp/prod-baseline-events.json`) must be kept in `tmp/` (gitignored) and deleted after the report is generated.

### 7.4 Minimum data quality gate for baseline validity

Before accepting a 7-day export as a valid production baseline:

- [ ] ≥ 30 `book_outcome` events total.
- [ ] Less than 20% of `book_outcome` events are from known operator/smoke UIDs.
- [ ] Data covers at least 5 calendar days (not a single-day burst).
- [ ] No major incident was active during the measurement window.

---

## 8. Baseline Rerun Trigger and Procedure

### 8.1 Trigger conditions

Run the production baseline when ALL of the following are true:

1. ≥ 30 `book_outcome` events from real users exist in the last 7 days.
2. Data meets the quality gate in §7.4.
3. No major generation incident is currently active.
4. The measurement window does not overlap with a Firebase Functions deploy or prompt change.

### 8.2 Export and report commands

```powershell
$env:HTTPS_PROXY = 'http://proxy.hq.melco.co.jp:9515'
node scripts/_export-cloud-logging.mjs --out tmp/prod-baseline-events.json --days 7
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format markdown
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format json > tmp/prod-baseline-report.json
```

### 8.3 Evaluate SLO report against targets

Compare the report output against the targets in `docs/P2_PRODUCTION_MONITORING_READINESS.md` §5.

| Metric | Target | Investigate | Alert threshold |
|---|---|---|---|
| Readable rate | ≥ 98% | < 98% | < 95% |
| Hard failure rate | ≤ 2% | > 2% | > 5% |
| schema_validation rate | ≤ 2% | > 2% | > 5% |
| storyDurationMs p95 | ≤ 120s | > 120s | > 180s |
| storyDurationMs p99 | ≤ 200s | > 200s | > 300s |

### 8.4 `ENABLE_SCHEMA_REPAIR_RETRY` decision

Evaluate against `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §5.3 criteria. Enable only if ALL are met:

1. `schema_validation` failure rate > 2% sustained over ≥ 7 days.
2. Dominant failure category is `malformed_json` (transient parse failure) — not `field_type_mismatch`.
3. At least one confirmed manual case where retrying the same book succeeded.
4. Gemini API cost budget allows ~2× additional calls for affected fraction.
5. p95 story time + retry overhead still < 180s.

If criteria are NOT met: keep `ENABLE_SCHEMA_REPAIR_RETRY` OFF and document the decision in `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` §7 with the new baseline row.

### 8.5 SJ/IM alert policy enablement decision

After confirming a valid production baseline:

1. Review `docs/P2_SJ_IM_ALERT_POLICIES.md` threshold values against measured production rates.
2. If measured rates are significantly lower than thresholds → thresholds are appropriate, proceed to enable.
3. If measured rates are close to thresholds → tune `thresholdValue` downward before enabling.
4. Enable SJ policies first. Observe for 24h. Then enable IM policies.
5. Follow the enable procedure in `docs/P2_PRODUCTION_MONITORING_READINESS.md` §8.

### 8.6 Documentation updates after baseline rerun

1. Add new `§7.N` row to `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` with production baseline metrics.
2. Update `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` §3.2 baseline note.
3. Update `docs/PRODUCT_ROADMAP.md` prod-baseline row to ✅ COMPLETE.
4. Delete `tmp/prod-baseline-events.json` and `tmp/prod-baseline-report.json`.
5. Commit as `docs(prod-baseline): record production baseline — [date]`.

---

## 9. Follow-Up Items (Not Blocking Soft Launch)

These items are not required to proceed with Cohort A but should be addressed before open beta.

### 9.1 Smoke/test traffic exclusion in SLO report

Currently `report-generation-slo.mjs` does not support filtering by `bookId` prefix or user UID. After production data accumulates, if operator-generated books significantly inflate the `book_outcome` count, add an `--exclude-bookid-prefix` or `--exclude-uid` option.

### 9.2 Invite gate (access control)

The app currently allows any Google account to register. Before Cohort C or public access, consider:
- Adding a Firestore `invites/{code}` collection gating first access.
- Or, adding an allow-list in `users/{userId}.approved: true` checked at sign-up.
This is a product scope decision; monitoring is not blocked on this.

### 9.3 `partial_completed` user-facing recovery

Users who receive a `partial_completed` book (some pages failed) may not know they can regenerate failed pages. Add a clear in-app indicator and retry button on the reader page.

### 9.4 Candidate profile (CG-1) enrollment documentation

If any Cohort B/C users are enrolled as candidates (`generationOverride.allowCandidateProfile = true`), document the enrollment in a separate internal log (not committed to git) so that CG-1 alerts from those users can be distinguished from unexpected alerts.

---

## 10. Known Limitations (Communicate to Cohort A/B)

- **Book generation time**: Story generation takes ~60–90s; image generation adds 30–120s per page. Total may be 3–7 minutes. Users should wait on the generation screen.
- **Partial completions**: If image generation fails for some pages, the book will show as "partially completed" with placeholder images. Failed pages can be regenerated.
- **No undo / edit**: Once a book is generated, the story and images cannot be edited in the current release.
- **Image style**: Style is fixed per creation mode. Style selection is planned for a future phase.
- **4 pages per book**: Books are currently 4 story pages (+ cover). 8-page variants are planned.
- **Japanese only**: The app and generated content are in Japanese only.
- **Desktop recommended**: The reader UI works on mobile but is optimized for desktop/tablet.

---

## 11. References

| Document | Purpose |
|---|---|
| `docs/P2_PRODUCTION_MONITORING_READINESS.md` | Monitoring stack, live resources, first-traffic checklist |
| `docs/P4_PERMANENT_STORY_JSON_SLO_PLAN.md` | §5 repair retry criteria, §7 baseline history |
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md` | Alert policy definitions, recommended ordering |
| `docs/P2_SJ_IM_ALERT_POLICIES.md` | SJ/IM policy definitions and enable procedure |
| `docs/GENERATION_SLO_RUNBOOK.md` | Operator runbook: log collection, incident playbooks |
| `docs/P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md` | 15 triage queries for Cloud Logging |
| `docs/PRODUCT_ROADMAP.md` | Full roadmap: soft launch, P2-10b-enable rows |

---

*Last updated: 2026-05-21 (P5-1)*
