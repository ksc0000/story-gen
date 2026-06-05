# P5-3k Post-Deploy QA: Reference-Aware guided_ai 8-Page Generation

**Date:** 2026-06-05 (scripts prepared; QA execution PENDING — requires service account + QA user auth)  
**Branch:** `claude/story-gen-reference-aware-qa-NQrhQ`  
**Status:** PENDING EXECUTION  
**Scope:** P5-3k Option C 後の reference-aware guided_ai 8ページ生成 — fallbackPages と Step b の child likeness 影響確認

---

## Background

P5-3k (PR #23 `fix/p5-3k-drop-reference-on-retry`) deployed the following change:

> When `pro_consistent` is used with reference images and the first attempt fails, **Step b** automatically retries with a simplified prompt and no reference images (`inputImageUrls: []`), bypassing Replicate safety rejections that were triggered by `reference-aware + pro_consistent` input.

Pre-P5-3k baseline (47 production books, 2026-06-04):
- Average `fallbackPages` = 3.40 per 8-page book
- `fallbackPages >= 7`: 4 books / 47 (8.5%)

P5-3k **target**: `fallbackPages` median ≤ 2, no book with `fallbackPages >= 7`.

This QA validates that target under production-like conditions with:
- `guided_ai` creation mode
- `characterConsistencyMode: all_pages`
- Synthetic child portrait reference image (not `animals.png`)
- `theme: animals`, styles: `soft_watercolor` × 4 + `classic_picture_book` × 4

---

## QA Run Configuration

| Field | Value |
|---|---|
| QA account | `kikushun0529@gmail.com` |
| Theme | `animals` |
| Styles | `soft_watercolor` × 4, `classic_picture_book` × 4 |
| Page count | 8 per book |
| Total books | 8 (stop at 6 if resource concerns) |
| creationMode | `guided_ai` |
| characterConsistencyMode | `all_pages` |
| imageModelProfile | `pro_consistent` |
| Reference image | Synthetic child portrait `/smoke/reference-child-portrait.png` |
| Reference source | NOT `animals.png` — non-photorealistic flat illustration, no real person |
| Step b auto-enabled | Yes — P5-3k activates automatically for `pro_consistent` + reference images |
| Character constraint | child + 1 animal + 1 item (no extra characters, no magic stars, no dinosaurs) |

### Input Cases

| Case | Style | Child | Animal | Item | parentMessage (excerpt) |
|---|---|---|---|---|---|
| 1 | soft_watercolor | ひかり (4y) | うさぎ | おべんとうばこ | のはらでやさしいおべんとうを |
| 2 | soft_watercolor | さくら (4y) | りす | きいろいぼうし | もりでどんぐりをひろいながら |
| 3 | soft_watercolor | そうた (5y) | ひよこ | みずいろのかさ | やさしいあめのひに |
| 4 | soft_watercolor | はな (4y) | こねこ | あかいリボン | はるのおにわであそぼう |
| 5 | classic_picture_book | ひかり (4y) | うさぎ | おべんとうばこ | (same as Case 1) |
| 6 | classic_picture_book | さくら (4y) | りす | きいろいぼうし | (same as Case 2) |
| 7 | classic_picture_book | そうた (5y) | ひよこ | みずいろのかさ | (same as Case 3) |
| 8 | classic_picture_book | はな (4y) | こねこ | あかいリボン | (same as Case 4) |

---

## Pre-Conditions Checklist

- [ ] Service account JSON available and set as `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] QA user `kikushun0529@gmail.com` exists in Firebase Auth
- [ ] QA user doc (`users/<uid>`) exists in Firestore
- [ ] `generationOverride.bypassMonthlyLimit = true` set on QA user (to allow 8 books)
- [ ] Hosting deployed (so `/smoke/reference-child-portrait.png` is accessible)
- [ ] `node -v` ≥ 18 (scripts/ uses firebase-admin from functions/node_modules)

---

## Execution Instructions

### Step 1 — Inspect and prepare QA user

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# 1a. Inspect current user doc (read-only)
node scripts/setup-p5-3k-qa-user.js --email=kikushun0529@gmail.com

# 1b. If bypassMonthlyLimit not set, enable it
node scripts/setup-p5-3k-qa-user.js --email=kikushun0529@gmail.com --set-bypass-limit --dry-run
node scripts/setup-p5-3k-qa-user.js --email=kikushun0529@gmail.com --set-bypass-limit --write

# Export UID for subsequent commands
export QA_USER_ID=<uid printed above>
```

### Step 2 — Create QA books

```bash
# Preview (dry-run)
node scripts/create-p5-3k-reference-aware-qa-books.js --userId=$QA_USER_ID --dry-run

# Create all 8 books
node scripts/create-p5-3k-reference-aware-qa-books.js --userId=$QA_USER_ID --write

# The script prints:  runId=p53k-qa-<timestamp>
export QA_RUN_ID=<runId printed above>
```

### Step 3 — Monitor generation

Each book takes approximately 8–15 minutes for 8 pages with `pro_consistent`.

```bash
# Per-book status check
node scripts/monitor-smoke-book.js <bookId>

# Repeat until all books show "completed" or "partial_completed"
```

### Step 4 — Inspect and report

```bash
# Generates Markdown table + Cloud Logging filter queries
node scripts/inspect-p5-3k-qa-run.js --runId=$QA_RUN_ID --userId=$QA_USER_ID

# JSON output for scripting
node scripts/inspect-p5-3k-qa-run.js --runId=$QA_RUN_ID --userId=$QA_USER_ID --json
```

### Step 5 — Cloud Logging analysis

In [Google Cloud Logging](https://console.cloud.google.com/logs), filter:

```
resource.type="cloud_run_revision"
jsonPayload.message="p5_model_unification_retry_active"
```

Add individual `jsonPayload.bookId="<id>"` conditions for each QA book.

Collect per-event:
- `fallbackReasonClass` (`safety_rejection` / `timeout` / `other`)
- `pageIndex`
- `inputReferenceCount` (Step a reference count)
- `retryInputReferenceCount` (should be 0 — P5-3k cleared them)

### Step 6 — Visual QA

Open each completed book in the app at `https://story-gen-8a769.web.app/home/`.

Child likeness criteria:
- Page 0 (reference-aware path) vs Step b pages: is it the same child?
- Hair style / facial impression / clothing / signature item maintained?
- Animal and child not merged/confused?
- Art style consistent within the book (no style breaks between pages)?

---

## QA Results (PENDING EXECUTION)

> Fill in after running Steps 2–6. Copy inspect script output into the table below.

### Summary Table

| bookId (last 8) | Case | style | status | fallbackPages | failedPages | stepBApprox | kleinFast | referencePages | PASS? |
|:---|---:|:---|:---|---:|---:|---:|---:|---:|:---|
| PENDING | 1 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 2 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 3 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 4 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 5 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 6 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 7 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |
| PENDING | 8 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING |

**Columns:**
- `fallbackPages` = pages where `imageFallbackUsed=true` (fell through to klein_fast)
- `stepBApprox` = pages where `imageAttemptCount≥2` AND final profile = `pro_consistent` (Step b succeeded)
- `kleinFast` = pages where `imageModelProfile="klein_fast"` (Step b also failed)
- `referencePages` = pages where `inputReferenceCount>0` (reference-aware active on attempt 1)

---

### p5_model_unification_retry_active Log Summary

> Fill in from Cloud Logging (Step 5).

| bookId | pageIndex | style | fallbackReasonClass | inputReferenceCount | retryInputReferenceCount | notes |
|:---|---:|:---|:---|---:|---:|:---|
| PENDING | — | — | PENDING | — | — | — |

**fallbackReasonClass breakdown (totals across all books):**

| class | count | % |
|:---|---:|---:|
| safety_rejection | PENDING | PENDING |
| timeout | PENDING | PENDING |
| other | PENDING | PENDING |

**If `other` appears:** Record bookId, pageIndex, style, attemptCount, and a summary of surrounding log lines.

---

### Per-Book Page Detail

> Output from `inspect-p5-3k-qa-run.js`. Paste here after execution.

```
PENDING — run: node scripts/inspect-p5-3k-qa-run.js --runId=$QA_RUN_ID --userId=$QA_USER_ID
```

---

### Child Likeness QA (Visual)

> Complete after opening each book in the app (Step 6).

| bookId | Case | style | page0 ref-aware? | Step b pages | child same person? | hair/face/clothing OK? | animal/child not merged? | style consistent? | QA result | memo |
|:---|---:|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PENDING | 1 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 2 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 3 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 4 | soft_watercolor | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 5 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 6 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 7 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |
| PENDING | 8 | classic_picture_book | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | |

**Child likeness criteria:**
- `page0 ref-aware?` — Was page 0 generated with `inputReferenceCount > 0`? (If yes: reference path active for baseline comparison)
- `child same person?` — On Step b pages, does the child look like the same child as page 0?
- `hair/face/clothing OK?` — Are hair style, facial impression, clothing, and signature item maintained?
- `animal/child not merged?` — Are the animal and child clearly distinguishable (no hybrid features)?
- `style consistent?` — Is the art style consistent between reference-aware pages and Step b pages?

**Acceptable degradation for Step b pages:**
- Slightly less photorealistic likeness (simplified prompt used — expected by design)
- Minor color variation
- Background simplification

**Not acceptable:**
- Different-looking child (different age, hair, gender expression)
- Animal features on the child or vice versa
- Complete style break (e.g., watercolor page followed by vector-art page)

---

## Verdict

> Fill in after completing all checks.

**Overall verdict:** PENDING

**Criteria:**
- **PASS**: All books fallbackPages 0–2, no book ≥7 fallbacks, `reasonClass=other` = 0 or each explainable, child likeness acceptable on Step b pages
- **WARN**: fallbackPages 3–6 in some books, OR `reasonClass=other` ≤ 2 with explanations, OR minor child likeness degradation on Step b pages
- **FAIL**: Any book with fallbackPages ≥ 7, OR child likeness clearly broken (different person / animal-child merge / style collapse)

---

## QA User Setup Notes

> Fill in after running Step 1.

| Field | Value |
|---|---|
| email | `kikushun0529@gmail.com` |
| uid | PENDING |
| plan | PENDING |
| monthlyGenerationCount (pre-QA) | PENDING |
| generationOverride | PENDING |
| bypassMonthlyLimit set | PENDING |

---

## Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/setup-p5-3k-qa-user.js` | Inspect QA user doc; set bypassMonthlyLimit |
| `scripts/create-p5-3k-reference-aware-qa-books.js` | Create 8 QA books with all_pages + reference |
| `scripts/monitor-smoke-book.js <bookId>` | Monitor single book generation status |
| `scripts/inspect-p5-3k-qa-run.js` | Inspect all books from run; output metrics table |

---

## Comparison: Pre-P5-3k Baseline vs Expected Post-P5-3k

| Metric | Pre-P5-3k (47 prod books) | Target (post P5-3k) | QA result |
|:---|:---|:---|:---|
| avg fallbackPages (8-page book) | 3.40 | ≤ 2.0 | PENDING |
| books with fallbackPages ≥ 7 | 4 / 47 (8.5%) | 0 / 8 (0%) | PENDING |
| Step b success rate | n/a (feature not deployed) | > 50% of triggered | PENDING |
| books with failedPages > 0 | 0 / 47 (all completed) | 0 / 8 | PENDING |

---

*Document created by QA preparation script run. QA execution requires service account credentials and must be performed by a team member with production Firestore access.*
