# P5-3: Cohort A Soft Launch Execution Checklist

**Task**: P5-3  
**Created**: 2026-05-21  
**Status**: CHECKLIST READY — invitations not yet sent  
**Scope**: Docs-only. No live resources created or modified. No invitations sent by this task.

> **When to use this document**: On the day you are ready to manually send Cohort A invitations. Work through each section in order.

---

## 1. Purpose

This checklist guides the operator through:
1. Final readiness verification before sending Cohort A invitations.
2. Manual invitation delivery.
3. First-hour monitoring of production traffic.
4. Incident response if anomalies appear.
5. Aggregate result recording after the session.
6. Gate evaluation for proceeding to Cohort B.

Cohort A is 3–5 internal/operator testers. Invitations are sent manually by the operator (not by any automated system). See `docs/P5_SOFT_LAUNCH_INVITE_KIT.md` for invitation text templates and `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` for the full cohort strategy.

---

## 2. Launch Prerequisites

Complete every item before sending any invitation.

### 2.1 Operational readiness

- [ ] **Contact method finalized**: `[CONTACT_METHOD]` (e.g., LINE, email, Slack DM) — replace placeholder before use
- [ ] **Feedback form URL finalized**: `[FEEDBACK_FORM_URL]` — or confirm direct-message feedback is the fallback
- [ ] **Cohort A tester list**: 3–5 people identified; list stored outside git (not in any committed file)
- [ ] **Support owner**: Operator is available and reachable for the first hour after invitations are sent
- [ ] **Known limitations**: Operator has reviewed `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` §10 and is ready to communicate them

### 2.2 Monitoring readiness

- [ ] **Dashboard accessible**:  
  https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769
- [ ] **CG-1 panel (Panel 1) = 0** — confirmed before invitations go out
- [ ] **SJ/IM policies remain `enabled: false`** — verify:
  ```powershell
  $gcloud = "C:\Users\CN63738\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  & $gcloud monitoring policies list --project=story-gen-8a769 --format="table(displayName,enabled)" | Select-String "True|False"
  ```
  Expected: CG-1 = True, all SJ/IM = False
- [ ] **Email alert deliverable** — test that kikushun0529@gmail.com receives messages (or confirm inbox is monitored)

### 2.3 App readiness

- [ ] **Hosting URL reachable**: https://story-gen-8a769.web.app
- [ ] **Google login works** — operator has logged in with their own account in the last 24h
- [ ] **Happy path verified** — operator has generated ≥ 1 book end-to-end today
- [ ] **Reader opens** — completed book displays all pages correctly

### 2.4 Production flags

- [ ] `ENABLE_RESPONSE_SCHEMA` — absent from `.env.local` and all Functions config
- [ ] `RESPONSE_SCHEMA_MODE` — absent
- [ ] `ENABLE_SCHEMA_REPAIR_RETRY` — absent

---

## 3. Manual Invitation Procedure

### 3.1 Prepare invitation text

1. Open `docs/P5_SOFT_LAUNCH_INVITE_KIT.md`.
2. Copy the appropriate template:
   - **Formal (§3)**: For email or longer messages.
   - **Short (§4)**: For LINE, Slack, or DM.
3. Replace both placeholders:
   - `[CONTACT_METHOD]` → actual contact (e.g., "このメッセージへの返信" or email address)
   - `[FEEDBACK_FORM_URL]` → form URL, or omit if using direct message feedback
4. Attach or paste tester instructions (§5 of invite kit) if sending via email.

### 3.2 Send invitations

- Send to 3–5 Cohort A testers **individually** (not group/broadcast).
- Do not post the app URL in any public channel before Cohort B is ready.
- Record send timestamp in a private note (not in git): `[DATE TIME] — Cohort A invitations sent to N testers`

### 3.3 What not to do

- Do NOT commit tester names, email addresses, phone numbers, or UIDs to git.
- Do NOT send to more than 5 people for Cohort A.
- Do NOT promise production-grade stability or guaranteed delivery of generated books.

---

## 4. First-Hour Monitoring Procedure

After sending invitations, monitor the dashboard every 10–15 minutes for the first hour.

**Dashboard URL**:  
https://console.cloud.google.com/monitoring/dashboards/builder/39c916aa-ea17-4487-80e1-9c81e47cee3b?project=story-gen-8a769

### 4.1 Per-check procedure (every 10–15 minutes)

| Panel | What to check | Expected | Action if unexpected |
|---|---|---|---|
| Panel 1 (CG-1) | `candidateAllowed` count | **= 0** | Stop — see §6.1 |
| Panel 2 (OUT-1) | `book_outcomes_total` count | Incrementing as testers generate | See §6.2 if no increment after 30 min |
| Panel 2 (OUT-1) | `book_outcome_failed` count | **= 0** (or ≤ 1 and explainable) | See §6.2 if ≥ 2 |
| Panel 7 (LAT-1) | `storyDurationMs` p95 | **≤ 120,000ms** | Investigate if > 120s; Stop if > 180s repeated |
| Panel 6 (IM-1) | Page failure spike | No spike | See §6.3 if spike appears |

### 4.2 After each tester completes a book

- Check Firestore (Firebase Console → Firestore → `books/`) to confirm:
  - `bookStatus` = `completed` or `partial_completed`
  - `pages` all have `status = completed` or `status = image_failed` (with regenerate option)
- Ask the tester: "絵本は開けましたか？ページはすべて表示されましたか？"

### 4.3 If a tester reports an issue

1. Ask for device/browser and approximate time (see incident template in `docs/P5_SOFT_LAUNCH_INVITE_KIT.md` §7).
2. Open Cloud Logging and run the relevant saved query (see §6 below).
3. Record issue in private note with: time, user-reported symptoms, Cloud Logging event name, resolution.
4. Do NOT ask the tester to send child names or story content.

---

## 5. Stop Conditions

Pause further Cohort A invitations immediately if any of the following occur. Do not send to additional testers until the condition is resolved.

| Condition | Threshold | Severity |
|---|---|---|
| **CG-1 fires unexpectedly** | Any `candidateAllowed=true` event from a non-enrolled user | CRITICAL — stop all invitations |
| **Book hard failures** | ≥ 2 `book_outcome` with `bookStatus=failed` in first 5 attempts | HIGH — pause, investigate |
| **Repeated high latency** | storyDurationMs p95 > 180s for ≥ 3 consecutive checks | HIGH — pause, investigate |
| **Page failure spike** | `page_image_failed` > 5 events / 1h | MEDIUM — pause, investigate |
| **Login failure** | ≥ 2 testers cannot sign in with Google | CRITICAL — stop all invitations |
| **Profile creation failure** | ≥ 2 testers cannot create child profile | HIGH — pause, investigate |
| **No book_outcome events** | 0 `book_outcome` after 3 testers attempt generation | HIGH — check Cloud Logging directly |

---

## 6. Incident Response

### 6.1 CG-1 fires unexpectedly

**What happened**: `candidateAllowed=true` appeared in `generation_started` event for a user not enrolled in candidate testing.

**Steps**:
1. Open saved query **"CG-1 candidate generation context"** in Cloud Logging Log Explorer.
2. Find the `generation_started` event. Note the `resolvedImageModelProfile` and `candidateDecision` fields.
3. Check Firestore: `users/{uid}.generationOverride.allowCandidateProfile` — was this set accidentally?
4. If set accidentally: remove the field via Firebase Console (set to `false` or delete the field).
5. Email alert will have fired — acknowledge in inbox.
6. Do NOT restart generation logic. Do NOT deploy Functions.
7. Communicate to tester: "一時的に設定を調整しています。しばらく待ってから再試行してください。"

### 6.2 Book hard failure (bookStatus=failed)

**What happened**: A book reached terminal `failed` status — all pages failed or story generation failed before image generation.

**Steps**:
1. Open saved query **"OUT-2 failed or partial outcomes"** in Cloud Logging Log Explorer.
2. Find the `book_outcome` or `book_early_failed` event. Check:
   - `failureStage` — is it `schema_validation`, `quality_gate`, or `story_generation`?
   - `storyJsonFailureCategory` — is it `malformed_json` or `field_type_mismatch`?
   - `errorCode` — is it a provider error (E005, TIMEOUT, PROVIDER_5XX)?
3. If `failureStage=schema_validation`: this is a known dev/test pattern. Note the rate. Do NOT enable `ENABLE_SCHEMA_REPAIR_RETRY`.
4. If `errorCode=TIMEOUT` or `PROVIDER_5XX`: likely transient. Wait 5 min and ask tester to retry.
5. If ≥ 2 failures in first 5 attempts: trigger stop condition — pause invitations.
6. Communicate to tester: "エラーが発生しています。少し時間をおいてから再試行いただくか、再度ご連絡ください。"

**Do not**:
- Enable `ENABLE_SCHEMA_REPAIR_RETRY`.
- Enable `ENABLE_RESPONSE_SCHEMA`.
- Enable any SJ/IM alert policies.
- Deploy Firebase Functions.

### 6.3 Page failure spike (image generation failures)

**What happened**: Multiple `page_image_failed` events appear; some testers see missing images.

**Steps**:
1. Open saved query **"IM-1 page image failures"** in Cloud Logging Log Explorer.
2. Check `errorCode`:
   - `E005`: Content sensitivity rejection — prompt-deterministic. Note theme/subject. No immediate fix.
   - `TIMEOUT`: Provider queue delay. Tester can use "ページを再生成" button if shown.
   - `PROVIDER_5XX`: Check Replicate / OpenAI status page for incidents.
3. If `partial_completed` book: tester can regenerate failed pages if the UI shows the option.
4. If > 5 `page_image_failed` events / 1h: trigger stop condition — pause invitations.
5. Communicate to tester: "一部のページのイラスト生成に失敗しました。ページの再生成ボタンをお試しください。"

**Do not**:
- Change ImageProvider routing.
- Change fallback order.
- Deploy Functions.

### 6.4 High latency (p95 > 180s)

**What happened**: Story generation is taking longer than the SLO investigate threshold.

**Steps**:
1. Open saved query **"LAT-2 story duration over 180s"** in Cloud Logging Log Explorer.
2. Check `storyDurationMs` and `storyGenerationAttempts` on `book_early_failed` events.
3. If single spike: likely transient Gemini API delay. No action needed; monitor.
4. If sustained (≥ 3 consecutive checks above 180s): pause invitations. Note in incident log.
5. Communicate to tester: "現在 AI 処理に時間がかかっています。しばらくお待ちいただくか、後ほど再試行ください。"

**Do not**:
- Change prompts.
- Change retry behavior.
- Deploy Functions.

---

## 7. Post-Launch Aggregate Recording

After the first-hour monitoring session, record the following aggregate values in a **private note** (not in git unless values are non-identifying). When the count reaches ≥ 10 for Cohort B gate or ≥ 30 for baseline rerun, update the appropriate docs.

**Fields to record privately** (example format):

```
Cohort A launch: [DATE]
Invitations sent: [N]
First invitation timestamp: [TIME]
Last book_outcome in first hour: [TIME]

Aggregate counts (first hour):
  book_outcome total: [N]
  book_outcome completed: [N]
  book_outcome partial_completed: [N]
  book_outcome failed: [N]
  page_image_failed: [N]
  CG-1 events: [N]  (should be 0)
  
Readable rate: [N]/[N] = [%]
Notable incidents: [description or "none"]
```

**Do NOT record in git**:
- Tester names, email addresses, phone numbers, Firebase Auth UIDs
- Child names, story themes, story text
- Raw Cloud Logging entries

**When to update docs after this session**:
- If ≥ 10 `book_outcome` events: update `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` Cohort A gate section — mark gate as passed or note remaining gap.
- If ≥ 30 `book_outcome` events total (cumulative): trigger `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` §8 baseline rerun procedure.

---

## 8. Gate to Cohort B

Proceed to Cohort B invitations only if ALL of the following are true:

- [ ] ≥ 10 `book_outcome` events from Cohort A (completed + partial_completed)
- [ ] No unexpected CG-1 alert fired (or any fire was explained and resolved)
- [ ] Readable rate (completed + partial_completed) ≥ 90% for Cohort A books
- [ ] storyDurationMs p95 ≤ 180s during Cohort A session
- [ ] No unresolved CRITICAL incident (login failure, CG-1 unexplained)
- [ ] At least 2 Cohort A testers confirmed the basic flow is understandable via feedback

If any gate item fails: invite additional Cohort A testers, or investigate and fix before proceeding.

---

## 9. Next Actions

### If Cohort A passes all gate conditions

1. Update the private aggregate note with final Cohort A count.
2. Optionally update `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` §3 Cohort A section with gate status.
3. Prepare Cohort B invitation batch using `docs/P5_SOFT_LAUNCH_INVITE_KIT.md` templates.
4. Send Cohort B invitations (5–10 testers) following the same procedure in §3 above.
5. Continue monitoring dashboard; repeat §4 for Cohort B first hour.

### If Cohort A data is insufficient (< 10 book_outcome events)

1. Invite 1–3 additional Cohort A testers.
2. Continue monitoring until ≥ 10 events are confirmed.
3. Do not advance to Cohort B until the gate is met.

### If blocked by a critical incident

1. Record the incident description (no PII) in a task or private note.
2. Create a targeted fix task (e.g., Firestore rule issue, CDN issue, auth issue).
3. Re-run the §2 launch prerequisites checklist after the fix is deployed.
4. Do NOT deploy Firebase Functions without a proper code review.

### Baseline rerun trigger

Once cumulative `book_outcome` count reaches ≥ 30 (across all cohorts, real users only):

```powershell
$env:HTTPS_PROXY = 'http://proxy.hq.melco.co.jp:9515'
node scripts/_export-cloud-logging.mjs --out tmp/prod-baseline-events.json --days 7
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format markdown
node scripts/report-generation-slo.mjs --input tmp/prod-baseline-events.json --format json > tmp/prod-baseline-report.json
```

See `docs/P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md` §8 for full evaluation and documentation procedure.

---

## 10. References

| Document | Purpose |
|---|---|
| [P5_SOFT_LAUNCH_INVITE_KIT.md](./P5_SOFT_LAUNCH_INVITE_KIT.md) | Invitation templates (Japanese), tester instructions, feedback form, incident template |
| [P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md](./P5_FIRST_PRODUCTION_TRAFFIC_PLAN.md) | Cohort strategy, baseline rerun trigger, P2-10b-enable gate |
| [P2_PRODUCTION_MONITORING_READINESS.md](./P2_PRODUCTION_MONITORING_READINESS.md) | Live monitoring resources, dashboard panels, SLO targets |
| [P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md](./P2_GENERATION_SLO_SAVED_LOGGING_QUERIES.md) | 15 triage queries for Cloud Logging |
| [GENERATION_SLO_RUNBOOK.md](./GENERATION_SLO_RUNBOOK.md) | Operator runbook: log collection, full incident playbooks |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | Roadmap P5 section |

---

*Last updated: 2026-05-21 (P5-3)*
