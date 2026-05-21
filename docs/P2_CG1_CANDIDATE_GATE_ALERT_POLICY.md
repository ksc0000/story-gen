# P2-10 CG-1: Candidate Gate Alert Policy

**Status**: 📋 POLICY DEFINED — live Cloud Monitoring alert policy not yet created  
**Created**: 2026-05-21  
**Task**: P2-10 (alert policy — CG-1 only)  
**Scope**: CG-1 alert only. SJ / IM / DQ alerts follow in subsequent P2-10 iterations.  
**Depends on**: P2-9 (`docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §3.1` — metric definition)  
**Required by**: P2-12 (notification channel configuration)  
**Firebase project**: `story-gen-8a769`

> **Why CG-1 first?** Any `candidateAllowed=true` event without deliberate user enrollment means
> an unauthorized OpenAI candidate profile was used in production. This is a CRITICAL security
> and operational incident regardless of traffic volume. The other SLO alerts (story JSON, image
> failures) involve rate thresholds; CG-1 fires on the **first event**.

---

## 1. Alert Summary

| Field | Value |
|---|---|
| **Alert ID** | CG-1 |
| **Severity** | CRITICAL |
| **Trigger** | Any `candidateAllowed=true` event in any 60s window |
| **Response SLA** | Within 1h (any hour) |
| **Incident type** | Candidate profile leakage — unauthorized OpenAI routing |
| **Metric** | `logging.googleapis.com/user/generation/candidate_allowed` |
| **P2-9 definition** | `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §3.1` |
| **Incident playbook** | `docs/GENERATION_SLO_RUNBOOK.md §8.5` and §8.6 |

---

## 2. Prerequisites Before Going Live

These steps must be completed before the alert policy can be created:

### Step 1 — Create the log-based metric (P2-9 prerequisite)

The alert policy references `logging.googleapis.com/user/generation/candidate_allowed`.
This metric must exist in Cloud Monitoring before the policy can be created.

**gcloud command** (requires `gcloud` installed and `roles/logging.admin` or `roles/logging.logMetrics.create` on the SA):
```bash
gcloud logging metrics create generation/candidate_allowed \
  --project=story-gen-8a769 \
  --description="Counts generation_started events where candidateAllowed=true. CG-1 candidate gate leak signal." \
  --log-filter='jsonPayload.message="generation_event" AND jsonPayload.eventName="generation_started" AND jsonPayload.candidateAllowed=true'
```

**Cloud Console alternative**:
1. Navigate to: https://console.cloud.google.com/logs/metrics?project=story-gen-8a769
2. Click **"Create metric"**
3. Metric type: **Counter**
4. Log filter: paste the filter above
5. Metric name: `generation/candidate_allowed`
6. Description: as above
7. Click **"Create metric"**

**Verification**:
```bash
gcloud logging metrics describe generation/candidate_allowed --project=story-gen-8a769
```

### Step 2 — Required IAM roles for SA

To create alert policies and log-based metrics, the service account or operator needs:

| Action | Required role |
|---|---|
| Create log-based metric | `roles/logging.admin` or `logging.logMetrics.create` permission |
| Create alert policy | `roles/monitoring.alertPolicyEditor` |
| List/manage notification channels | `roles/monitoring.notificationChannelEditor` |

Current SA (`firebase-adminsdk-fbsvc@story-gen-8a769.iam.gserviceaccount.com`) has `roles/logging.viewer` (read-only).  
Additional roles must be granted before live creation.

### Step 3 — Install gcloud CLI (if using CLI path)

```bash
# Windows: https://cloud.google.com/sdk/docs/install
# Authenticate after install:
gcloud auth login
gcloud config set project story-gen-8a769
```

Alternatively use Cloud Console or the Cloud Monitoring REST API.

---

## 3. Alert Policy Definition

### 3.1 Human-readable specification

| Property | Value |
|---|---|
| Display name | `CG-1: candidateAllowed=true (CRITICAL)` |
| Condition | `logging.googleapis.com/user/generation/candidate_allowed` > 0 |
| Alignment period | 60 seconds (minimum for DELTA metrics) |
| Cross-series reducer | SUM (sum across all label values) |
| Aligner | DELTA (count events within the window) |
| Duration | 0 seconds (fire as soon as condition is true for any alignment window) |
| Combiner | OR |
| Severity | CRITICAL |
| Initial state | **Disabled** until notification channels are configured (P2-12) |
| Auto-close | 7 days (604800 seconds) |

**Firing behavior**: The alert fires within ~60 seconds of the first `candidateAllowed=true` event in a 60s window. With `duration=0s`, there is no required sustained violation period — any occurrence triggers the alert immediately in the next alignment window.

### 3.2 Cloud Monitoring YAML policy spec

Save as `cg1-alert-policy.json` (or use Cloud Console UI):

```json
{
  "displayName": "CG-1: candidateAllowed=true (CRITICAL)",
  "documentation": {
    "content": "## CG-1: Candidate Gate Leak\n\nThis alert fires when `candidateAllowed=true` appears in a `generation_started` event.\n\n**In normal production, this count should always be zero** unless a user has been deliberately enrolled in the candidate profile program.\n\n### Immediate actions\n1. Check Cloud Logging for the triggering event: bookId, templateId, resolvedImageModelProfile.\n2. Verify whether deliberate enrollment was active at the time.\n3. If NOT expected: follow `docs/GENERATION_SLO_RUNBOOK.md §8.5` (Candidate Profile Leakage Suspicion).\n4. Do NOT make routing changes without confirming regression tests pass first.\n5. Notify repository owner immediately.\n\n### Reference\n- Runbook: GENERATION_SLO_RUNBOOK.md §8.5 and §8.6\n- Metric: logging.googleapis.com/user/generation/candidate_allowed\n- Threshold policy: GENERATION_SLO_THRESHOLD_POLICY.md §2.4",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "generation/candidate_allowed > 0 in any 60s window",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/generation/candidate_allowed\" resource.type=\"cloud_run_revision\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0,
        "duration": "0s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "crossSeriesReducer": "REDUCE_SUM",
            "perSeriesAligner": "ALIGN_DELTA"
          }
        ],
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": false,
  "notificationChannels": [],
  "severity": "CRITICAL",
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
```

> **`"enabled": false`**: The policy is created **disabled** until at least one notification channel is added (P2-12). An alert policy without a notification channel fires silently in the Cloud Monitoring console and does not notify anyone. Enable it only after configuring channels.

> **`"notificationChannels": []`**: Replace with actual channel resource names in P2-12. Format: `"projects/story-gen-8a769/notificationChannels/CHANNEL_ID"`.

### 3.3 Equivalent YAML format

```yaml
displayName: "CG-1: candidateAllowed=true (CRITICAL)"
documentation:
  content: |
    ## CG-1: Candidate Gate Leak

    This alert fires when `candidateAllowed=true` appears in a `generation_started` event.
    In normal production this should always be zero unless deliberate enrollment is active.
    Follow GENERATION_SLO_RUNBOOK.md §8.5 immediately.
  mimeType: text/markdown
conditions:
  - displayName: "generation/candidate_allowed > 0 in any 60s window"
    conditionThreshold:
      filter: >
        metric.type="logging.googleapis.com/user/generation/candidate_allowed"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s
      aggregations:
        - alignmentPeriod: 60s
          crossSeriesReducer: REDUCE_SUM
          perSeriesAligner: ALIGN_DELTA
      trigger:
        count: 1
combiner: OR
enabled: false
notificationChannels: []
severity: CRITICAL
alertStrategy:
  autoClose: 604800s  # 7 days
```

---

## 4. Creation Commands

### 4.1 via gcloud CLI (preferred if available)

```bash
# Prerequisite: metric must already exist (see §2 Step 1)
# Save the JSON in §3.2 to a temp file (NOT in the repo)

gcloud monitoring policies create \
  --policy-from-file=/path/to/cg1-alert-policy.json \
  --project=story-gen-8a769
```

**Note on gcloud version**: `gcloud monitoring policies create` is available in gcloud SDK ≥ 363.0.0.
If not available, use the `gcloud alpha monitoring policies create` variant.

### 4.2 Via Cloud Console (no gcloud needed)

1. Navigate to: https://console.cloud.google.com/monitoring/alerting?project=story-gen-8a769
2. Click **"Create policy"**
3. **Select metric**:
   - Resource type: `Cloud Run Revision` (or `Global`)
   - Metric: search for `generation/candidate_allowed`
   - If not found: the log-based metric has not been created yet (complete §2 Step 1 first)
4. **Configure alert trigger**:
   - Condition type: `Threshold`
   - Alert when metric violates: `Any time series violates`
   - Condition: `is above` → value: `0`
   - For 1 minute (minimum)
5. **Configure notifications** (P2-12):
   - If no channel exists yet: skip or create an email channel
6. **Policy details**:
   - Alert policy name: `CG-1: candidateAllowed=true (CRITICAL)`
   - Documentation: paste the content from §3.2 documentation field
   - Severity: `Critical`
7. Click **"Create policy"**
8. **Enable/disable**: Leave disabled until notification channels are ready

### 4.3 Via Cloud Monitoring REST API (alternative when gcloud is absent)

The `scripts/_export-cloud-logging.mjs` pattern (JWT auth + HTTPS proxy) can be adapted to call:
```
POST https://monitoring.googleapis.com/v3/projects/story-gen-8a769/alertPolicies
```

**Required SA permissions**: `roles/monitoring.alertPolicyEditor` (not currently granted).  
**Required additional role for metrics**: `roles/logging.admin` (not currently granted).

Until these roles are granted, live creation is not possible via the SA.

---

## 5. Verification After Creation

Run these checks immediately after creating the metric and policy:

```bash
# Verify metric exists
gcloud logging metrics describe generation/candidate_allowed \
  --project=story-gen-8a769

# Verify alert policy exists
gcloud monitoring policies list --project=story-gen-8a769 \
  --filter="displayName='CG-1: candidateAllowed=true (CRITICAL)'"

# Get policy details (note the policy name/ID from list output)
gcloud monitoring policies describe POLICY_NAME --project=story-gen-8a769
```

**Cloud Console verification**:
1. Cloud Logging > Log-based Metrics: confirm `generation/candidate_allowed` appears
2. Cloud Monitoring > Alerting: confirm "CG-1: candidateAllowed=true (CRITICAL)" appears
3. Cloud Monitoring > Metrics Explorer: search for `logging.googleapis.com/user/generation/candidate_allowed` — metric should be visible (no data expected in normal production)

**Smoke test (optional, requires a test enrollment)**:
If a test user is deliberately enrolled (`allowCandidateProfile: true` in Firestore), creating a test book should produce a `candidateAllowed=true` event in Cloud Logging within 30s, and the alert should fire within ~90s.

---

## 6. Enabling the Policy (After P2-12 — Notification Channels)

After notification channels are configured in P2-12:

```bash
# Enable the policy
gcloud monitoring policies update POLICY_NAME \
  --project=story-gen-8a769 \
  --enabled

# Add a notification channel to the policy
gcloud monitoring policies update POLICY_NAME \
  --project=story-gen-8a769 \
  --add-notification-channels="projects/story-gen-8a769/notificationChannels/CHANNEL_ID"
```

---

## 7. Disabling and Deleting the Policy

### Disable (temporary, e.g. during deliberate enrollment testing)

```bash
gcloud monitoring policies update POLICY_NAME \
  --project=story-gen-8a769 \
  --no-enabled
```

Or in Cloud Console: Alerting > click policy > "Disable".

> **Always re-enable after enrollment testing is complete.**

### Delete (permanent)

```bash
gcloud monitoring policies delete POLICY_NAME --project=story-gen-8a769
```

> Only delete if the policy is being replaced. Otherwise prefer disabling.

---

## 8. First-Response Runbook (CG-1 Fires)

> Full incident procedures: `docs/GENERATION_SLO_RUNBOOK.md §8.5` and §8.6.  
> This is a quick-reference checklist for the first 5 minutes.

### Step 1 — Confirm the trigger (< 5 min)

Go to Cloud Logging and run:
```
jsonPayload.message="generation_event"
AND jsonPayload.eventName="generation_started"
AND jsonPayload.candidateAllowed=true
```

Note:
- `bookId` of the triggering event
- `resolvedImageModelProfile` (which candidate profile was allowed)
- `candidateDecision` (should be `"pass"`)
- `templateId`
- Timestamp

### Step 2 — Was this deliberate? (< 5 min)

Check if a deliberate enrollment test was in progress:
- Was any user intentionally granted `allowCandidateProfile: true` in Firestore?
- Was this a known operator test session?

**If YES (deliberate enrollment)**: Alert is expected. Note it for the alert suppression window; no incident needed.  
**If NO (unexpected)**: Proceed to Step 3.

### Step 3 — Run regression tests immediately (< 10 min)

```bash
cd functions && npx vitest run test/candidate-gate.test.ts
```

Expected: all 48 tests pass. Any failure = **code regression confirmed** → do NOT deploy any fixes until root cause identified.

### Step 4 — Determine scope (< 15 min)

Using the `bookId` from Step 1:
- How many `candidateAllowed=true` events are there in the last 24h?
- Are multiple users affected or just one?
- What was the last deployment? `git log --oneline -20 -- functions/src/generate-book.ts functions/src/lib/replicate.ts`

### Step 5 — Containment (< 30 min)

| Cause | Containment action |
|---|---|
| Unintended `allowCandidateProfile: true` in a user's Firestore doc | Remove the field from that user doc directly in Firestore Console |
| Gate code regression (regression test fails) | Revert the last commit touching `generate-book.ts` or `replicate.ts`; confirm tests pass before any redeployment |
| Unknown cause | Immediately notify repository owner; do NOT deploy changes |

### Step 6 — Post-incident

- Document in a GitHub issue: timestamp, bookId(s), candidate profile, root cause, resolution
- Verify regression test suite still passes
- Update `docs/GENERATION_SLO_RUNBOOK.md §8.5` if new root cause discovered

---

## 9. Notification Channel Placeholder (P2-12)

The alert policy `notificationChannels` array is empty. Replace with actual channel IDs in P2-12.

**Common channel types**:

| Type | When to use | gcloud resource format |
|---|---|---|
| Email | Simple notifications to operator | `projects/story-gen-8a769/notificationChannels/EMAIL_CHANNEL_ID` |
| PagerDuty | On-call rotation for CRITICAL | `projects/story-gen-8a769/notificationChannels/PAGERDUTY_CHANNEL_ID` |
| Webhook (Slack) | Team visibility channel | `projects/story-gen-8a769/notificationChannels/WEBHOOK_CHANNEL_ID` |

**Creating an email channel (Cloud Console)**:
1. Cloud Monitoring > Alerting > Notification channels
2. Click **"Add new"** → Email
3. Enter operator email address
4. Copy the resulting channel resource name for use in the policy

---

## 10. Policy Scope and What This Does NOT Cover

### In scope (CG-1 only)

- `generation/candidate_allowed` metric: any non-zero count
- Fires on first unauthorized candidate event
- CRITICAL severity

### Not in scope (future P2-10 iterations or separate tasks)

| Alert ID | Condition | Status |
|---|---|---|
| SJ-1/SJ-2 | `schema_validation` rate > 5% / 10% of outcomes | Defined in P2-9; policy pending |
| SJ-3 | `malformed_json` > 2% | Defined in P2-9; policy pending |
| SJ-4 | `field_type_mismatch` > 1% | Defined in P2-9; policy pending |
| SJ-5/SJ-6 | `storyDurationMs` p95 > 180s / p99 > 200s | Defined in P2-9; policy pending |
| IM-1/IM-2 | Book readable rate < 98% / 95% | Defined in P2-9; policy pending |
| IM-3/IM-4 | E005 rate > 10% / 30% | Defined in P2-9; policy pending |
| IM-5/IM-6 | TIMEOUT rate > 25% / 50% | Defined in P2-9; policy pending |
| IM-7/IM-8 | PROVIDER_5XX events | Defined in P2-9; policy pending |
| DQ-1/DQ-2 | Data quality signals | Defined in P2-9; policy pending |

---

## 11. Implementation Status

| Action | Status | Notes |
|---|---|---|
| `generation/candidate_allowed` metric definition | ✅ COMPLETE | `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §3.1` |
| `generation/candidate_allowed` metric **created live** | ✅ LIVE (2026-05-21) | `projects/story-gen-8a769/metrics/generation%2Fcandidate_allowed`; operator: `kikushun0529@gmail.com` |
| CG-1 alert policy definition | ✅ COMPLETE | This document §3 |
| CG-1 alert policy **created live** | ✅ LIVE (2026-05-21) — **disabled** | `projects/story-gen-8a769/alertPolicies/16928978327782001994`; operator: `kikushun0529@gmail.com` |
| Notification channel configured | ⬜ NOT DONE | P2-12 |
| Policy enabled | ⬜ NOT DONE | Enable after P2-12 notification channel is configured |

### Required SA roles before live creation

```bash
# Grant roles to the firebase-adminsdk SA (requires project Owner/Editor):
gcloud projects add-iam-policy-binding story-gen-8a769 \
  --member="serviceAccount:firebase-adminsdk-fbsvc@story-gen-8a769.iam.gserviceaccount.com" \
  --role="roles/logging.admin"

gcloud projects add-iam-policy-binding story-gen-8a769 \
  --member="serviceAccount:firebase-adminsdk-fbsvc@story-gen-8a769.iam.gserviceaccount.com" \
  --role="roles/monitoring.alertPolicyEditor"
```

> These roles should be granted to the operator/human user doing the live creation, not
> necessarily the firebase-adminsdk SA (which is used for runtime). Review IAM best practices
> before granting broad admin roles.

---

## 12. References

| Document | Purpose |
|---|---|
| `docs/P2_GENERATION_SLO_LOG_BASED_METRICS.md §3.1` | `generation/candidate_allowed` metric YAML config and gcloud command |
| `docs/P2_GENERATION_SLO_ALERT_AUTOMATION_PLAN.md §3.4` | CG-1 alert candidate specification |
| `docs/GENERATION_SLO_RUNBOOK.md §8.5` | Full candidate profile leakage incident playbook |
| `docs/GENERATION_SLO_RUNBOOK.md §8.6` | OpenAI candidate unexpectedly appearing for non-enrolled users |
| `docs/GENERATION_SLO_THRESHOLD_POLICY.md §2.4` | Candidate gate metric thresholds |
| `functions/src/lib/generation-event-logger.ts` | `GenerationStartedEvent` type: `candidateAllowed`, `candidateDecision`, `resolvedImageModelProfile` |
| `functions/test/candidate-gate.test.ts` | 48 regression tests for candidate gate behavior |
