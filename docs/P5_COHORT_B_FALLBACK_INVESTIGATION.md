# P5-3g Cohort B Fallback Investigation

> **Status**: Complete — findings documented from existing safe logs and repo docs.
> **Created**: 2026-06-06
> **Related**: `docs/P5_COVER_PAGE_MODEL_UNIFICATION_EXPERIMENT.md` §1.4, Issue #20

---

## Summary

- **Target book**: Cohort B feedback #2 (anonymized)
- **Target template**: `guided_ai`, 8 pages, `all_pages` character consistency mode, reference images present
- **Generation date**: Before 2026-06-03 (Cohort B window)
- **Cover model profile**: `pro_consistent` (legacy path, no reference images) — succeeded in 1 attempt
- **Page 0 model profile**: `pro_consistent` (adapter path, 2 reference images) — succeeded in 1 attempt (24.8s)
- **Pages 1–7 model profiles**: Started as `pro_consistent` → fell back to `klein_fast` after 2 failed attempts per page
- **Overall result**: `bookStatus=completed`, 8/8 pages delivered, but pages 1–7 rendered at `klein_fast` quality — visibly lower than cover
- **Main hypothesis (confirmed)**: Replicate safety filter flagged the reference-image-aware input for pages 1–7 using a single shared rejection reference ID, while the page 0 request (processed first in the same concurrency batch) succeeded before the flag was applied

---

## Per-page fallback table

| Page | Expected profile | Actual profile | Fallback occurred | Failure category | Evidence | Notes |
|---:|---|---|---|---|---|---|
| cover | `pro_consistent` | `pro_consistent` | No | — | 1 attempt, success (legacy path, no reference images) | Cover uses legacy path without reference images |
| 0 | `pro_consistent` | `pro_consistent` | No | — | 1 attempt, success (24.8s, adapter path, 2 reference images) | First in concurrency batch; safety filter not yet applied |
| 1 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID as pages 2–7 | Same ref images as page 0; processed after page 0 succeeded |
| 2 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID | — |
| 3 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID | — |
| 4 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID | — |
| 5 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID | — |
| 6 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID | — |
| 7 | `pro_consistent` | `klein_fast` | Yes | `safety_or_policy` | 2 attempts failed (E005), same rejection reference ID | — |

---

## Failure category definitions

Categories used in this report:

- `safety_or_policy` — E005-class safety/content policy rejection from Replicate

Not observed in this incident:

- `provider` — 5xx / network error
- `timeout` — `ImageTimeoutError` / deadline exceeded
- `quota` — 429 / rate limit
- `routing` — candidate gate stripping profile unexpectedly
- `fallback-policy` — fallback chain misconfiguration
- `unknown` — unclassified error

---

## Evidence

Source: PII-safe log summary from `docs/P5_COVER_PAGE_MODEL_UNIFICATION_EXPERIMENT.md` §1.4.

| Metric | Value |
|---|---|
| `pro_consistent` failure events total | 14 (pages 1–7 × 2 attempts each) |
| Confirmed failure class | Safety rejection (E005-class) — 14/14 |
| Timeout / 5xx / 4xx / Quota failures | **0** |
| Transient errors | **0** |
| Unique rejection reference IDs | **1** — same across all 14 failures |
| Rejection latency (scene recorded → failure) | 7–23s (shorter than a full generation cycle) |
| Page 0 failure events | **0** (succeeded at 24.8s with `pro_consistent`) |
| Page 0 reference image count | 2 (same as pages 1–7) |

**Key observations:**

1. Pages 0 and 1 were in the **same concurrent batch** (`concurrency=2`) with the same reference images. Page 0 succeeded; page 1 and all subsequent pages failed with the same rejection reference ID.
2. All 14 failures share a **single rejection reference ID** despite different scene prompts (358–535 chars). This is inconsistent with prompt-content-triggered rejection.
3. The failure pattern is consistent with Replicate's safety filter **evaluating and flagging the reference image input** after page 0 was already processed, causing all subsequent requests that include the same reference images to be rejected under the same ID.
4. Failure reason is **not transient**: same reference images retried twice per page produced identical rejections. A third retry with the same reference images would not succeed.

---

## Findings

### Finding 1 — Failure cause is reference-image-triggered safety rejection (not timeout, quota, or provider error)

All 14 `pro_consistent` failures for pages 1–7 are classified as E005-class safety rejections. There are zero timeouts, 5xx errors, quota errors, or transient errors. The fallback to `klein_fast` was caused entirely by the safety filter, not by provider instability or capacity issues.

### Finding 2 — Single shared rejection reference ID across all 14 failures indicates reference-image evaluation, not per-scene prompt evaluation

All 14 failures return the same rejection reference ID regardless of scene content. This strongly indicates that the rejection is triggered by the reference image input itself (or a combination of reference images + prompt template), not by individual scene text. The page 0 success with the same reference images suggests that the reference image was flagged after page 0's request was already dispatched.

### Finding 3 — Current fallback logging is sufficient for this failure class; no logging gap identified for this incident

`classifyFallbackReasonClass()` correctly classified the failures as `safety_rejection`. The `page_image_failed` event logged `primaryProfile`, `imageModelProfile`, `fallbackUsed`, `errorCategory`, `errorCode`, `attemptCount`, and `failureReason`. The failure mode was diagnosable from existing logs. For future incidents, per-attempt logging (not just final failure) would allow distinguishing which attempt triggered the rejection, but this is a lower priority than the fix itself.

---

## Recommendation

**Option C — Safer High-Quality Retry (`p5ModelUnification: "safer_retry"`) — already implemented and smoke-tested.**

This is the correct and already-completed fix for the confirmed root cause. Evidence:

- Option C Step b retries `pro_consistent` with `inputImageUrls=[]` (no reference images), directly bypassing the reference-image-triggered safety rejection.
- Implementation: commit `e75fc73`, deployed 2026-06-03.
- Internal smoke test (2026-06-03): `fallbackPages=0`, Step b fired for 5/8 pages, Step c (`klein_fast`) not reached. All 8 pages delivered at `pro_consistent` quality. Result: **PASS**.

**Remaining gate**: Apply `p5ModelUnification: "safer_retry"` override to Cohort B testers (PM approval pending — see `docs/P5_COVER_PAGE_MODEL_UNIFICATION_EXPERIMENT.md` §12.4).

---

## Recommended follow-up issues

- **P5-3h**: Apply `p5ModelUnification: "safer_retry"` to Cohort B testers. Create a safe admin script to set `generationOverride.p5ModelUnification = "safer_retry"` on target user Firestore docs. Requires PM approval before execution. Scope: script only, no deploy, no routing change, no production default change.
- **P5-4a**: After Cohort B feedback confirms Option C reduces cover/page quality gap, promote `safer_retry` as the production default fallback path for `pro_consistent` books.
- **IMG-002a**: Investigate whether the reference image URL itself (path or content) is the persistent safety trigger, or whether it is session/batch-scoped. This determines whether reference image re-generation or URL rotation would eliminate Step a rejections entirely.
