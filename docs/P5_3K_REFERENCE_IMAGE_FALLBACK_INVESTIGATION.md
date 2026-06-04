# P5-3k: Reference Image Fallback Investigation

**Date:** 2026-06-04  
**Status:** Investigation complete — pending production re-evaluation after P5-3j accumulates traffic  
**Author:** P5-3k investigation run

---

## Summary

After deploying P5-3j (prompt guard compression), a smoke test revealed `fallbackPages=7/8`
despite the guard text being reduced by ~58%.  A follow-up comparison smoke (reference image
OFF) produced `fallbackPages=0/8`, suggesting reference images were the trigger.

Further investigation revealed that:

1. The fallback issue **pre-dates all P5-3g/3h/3i/3j changes** and affects real production
   users with real child photos — not only the smoke test's `animals.png` image.
2. The smoke setup used `animals.png` (a static animal scene image) as a "child reference
   photo", which is **not representative** of real users.
3. The fallback is a **pre-existing baseline issue** with `pro_consistent` + reference-aware
   image-to-image on Replicate, present before any prompt guard additions.
4. All affected books ultimately **completed** (failedPages=0); the user-visible impact is
   style inconsistency when fallback pages use a different model (klein_fast) than primary
   pages (flux-2-pro).

---

## Timeline

| Date | Event |
|---|---|
| 2026-05-20 | Earliest production books with fallbackPages ≥ 7 observed (pre-P5-3g) |
| 2026-06-04 (morning) | P5-3j deployed (PR #21 merged — prompt guard compression) |
| 2026-06-04 | P5-3j smoke: animals.png reference → fallbackPages=7/8 → FAIL |
| 2026-06-04 | P5-3k comparison smoke: no reference → fallbackPages=0/8 → PASS |
| 2026-06-04 | P5-3k production log analysis: 47 live books pre-deploy, avg fallbackPages=3.40 |

---

## P5-3j Deploy Result

- Merged commit: `6e3f25f`
- Compressed `buildVisualContinuityGuard`: 1,813 → 750 chars (-59%)
- Compressed `buildStarCharacterGuard`: 965 → 426 chars (-56%)
- Worst-case prompt: 8,955 → 7,397 chars (-17%)
- CI: Phase 2 Generation Guards — pass
- Deployed to: `story-gen-8a769` functions

---

## Smoke Results

### Smoke A — reference image ON (animals.png)

| Field | Value |
|---|---|
| bookId | `UcY2WAWeuLNA2PokdKEK` |
| reference image | `animals.png` (static site template image — NOT a real child photo) |
| fallbackPages | 7 out of 8 |
| Page 5 (primary success) | `pro_consistent` / flux-2-pro + reference — photorealistic style |
| Pages 0–4, 6–7 (fallback) | `pro_consistent` attempt 0,1 FAIL → `klein_fast` attempt 3 success |
| style consistency | FAIL — Page 5 photorealistic, others illustration style |
| OpenAI primary pages | 0 (allowCandidateProfile not set for smoke user) |
| bookDoc.fallbackPages | undefined (field absent from bookDoc) |
| book_outcome log fallbackPages | 7 (correct value) |
| result | **FAIL** |

**bookDoc vs log inconsistency:** `bookDoc.fallbackPages` is absent (undefined) in Firestore.
The `book_outcome` Cloud Log event contains the accurate `fallbackPages` count.
Monitoring should rely on the `book_outcome` log, not the bookDoc field.

### Smoke B — reference image OFF

| Field | Value |
|---|---|
| bookId | `2Hm8OJnMJthyIbNjtaAc` |
| reference image | None (no childProfileSnapshot) |
| fallbackPages | 0 out of 8 |
| All pages | `pro_consistent` / flux-2-pro, attempt=1, fallbackUsed=false |
| style consistency | Consistent illustration style throughout |
| result | **PASS** |

---

## Root Cause Hypothesis

### Primary hypothesis (revised from initial animals.png hypothesis)

The fallback trigger is **Replicate's image-to-image safety filter** rejecting requests that
combine:

- A reference image (any content, including real child photos)
- `pro_consistent` (flux-2-pro) profile
- Complex or long prompts (themes with multiple characters, guards, story bible)

This is **intermittent and probabilistic**, not deterministic. Some requests pass on attempt 1;
others fail 2 times before klein_fast fallback succeeds on attempt 3.

### Why animals.png appeared to be the trigger (revised)

The initial hypothesis (animals.png specifically triggers the filter) was partially incorrect:

- Production logs show that **real user photos (USER_STORAGE_PHOTO) also produce high fallback
  pages** — 3 out of 4 sampled high-fallback books used real Firebase Storage photos.
- `animals.png` and real photos both appear in the ZERO-fallback sample as well.
- The fallback is **probabilistic**, not caused by a specific image type.

The animals.png smoke was still a valid signal — but it was diagnosing a pre-existing
production issue, not a P5-3j regression.

---

## Production Log Analysis

**Period:** 2026-05-05 to 2026-06-04 (30 days)  
**Filter:** `jsonPayload.message="generation_event"` (book_outcome events only)  
**Smoke/test books excluded:** 6 known smoke book IDs + bookId patterns matching smoke suites

### Summary table

| Metric | Value |
|---|---|
| Total live book_outcome events | 47 |
| Smoke/test entries excluded | 50 |
| All books completed (bookStatus=completed) | 47 (100%) |
| fallbackPages = 0 | 23 (49%) |
| fallbackPages 1–2 | 1 (2%) |
| fallbackPages 3–6 | 7 (15%) |
| fallbackPages 7–8 | 16 (34%) |
| fallbackPages average | 3.40 |
| fallbackPages median | 1 |
| fallbackPages max | 11 (12-page book) |

### By creation mode

| creationMode | n | avg fallbackPages |
|---|---|---|
| guided_ai | 43 | 3.70 |
| fixed_template | 4 | 0.25 |

The `fixed_template` path has near-zero fallback, suggesting prompt complexity and/or
reference image usage differ significantly from `guided_ai`.

### Image model profile

All 47 books: `pro_consistent`. No `openai_image_candidate` or `klein_fast` as primary
profile in production.

### OpenAI candidate path

Not observed in production logs. No real user has `allowCandidateProfile=true` enrolled as
of this investigation date.

### Temporal context

All 47 analyzed books were generated **before P5-3j was deployed** (2026-06-04T06:30Z).
No post-P5-3j production books had accumulated at investigation time (~55 minutes after deploy).
P5-3j prompt compression effect on production fallback rate is **not yet measurable**.

### bookDoc vs log fallbackPages inconsistency

`bookDoc.fallbackPages` is absent (undefined) from Firestore book documents.
All 47 books show this omission. The correct fallback count is only available in the
`book_outcome` Cloud Log event's `fallbackPages` field.

---

## Provider Path Diagnosis

### Fallback chain for pro_consistent

```
pro_consistent (flux-2-pro) attempt 0 → FAIL (safety/content filter)
pro_consistent (flux-2-pro) attempt 1 → FAIL
klein_fast (flux-2-klein-9b) attempt 2 → SUCCESS
→ imageAttemptCount=3, imageFallbackUsed=true, imageModelProfile=klein_fast
→ page status: fallback_completed
```

The `imageModel` field in pageDoc always shows `flux-2-pro` (resolved from primary profile
at call time) — this is a known labeling convention. The actual profile used is in
`imageModelProfile` (klein_fast when fallback occurred).

### Style inconsistency mechanism

When a page falls back to klein_fast without reference images, it produces a different
visual style (illustration-focused, no child likeness) compared to flux-2-pro with reference
(more realistic/photo-influenced). This creates visible style breaks within the same book.

---

## Cohort B Invite Restart Recommendation

**Status: Remain paused, pending P5-3j production traffic evaluation**

Reasons:

1. P5-3j has been deployed but no post-deploy production books exist yet to measure effect.
2. The fallback issue (avg 3.40 fallback pages, 34% books with 7+ fallback) is confirmed
   to affect real users with real child photos — not just the smoke setup.
3. The style inconsistency from fallback is a real user-experience issue.
4. Cohort B users would be exposed to books with inconsistent visual style if fallback
   is not resolved.

Conditions to restart Cohort B:

1. Post-P5-3j production books accumulate (recommend: wait for ≥10 books over 3+ days).
2. `fallbackPages` distribution shows improvement: avg < 2.0, books with 7+ < 15%.
3. OR a targeted fix (P5-3k implementation) reduces fallback and passes smoke with a
   representative child photo reference image.

---

## Recommended Next Actions

### Immediate

1. **Wait for post-P5-3j production traffic** — allow ≥10 real user books to accumulate
   before evaluating P5-3j's compression effect.

2. **Re-run smoke with a representative reference image** — replace `animals.png` with a
   neutral child portrait image (e.g., a publicly available child stock photo or the existing
   `generate-child-character` flow output) to get a representative smoke result.

3. **Monitor book_outcome logs** for `fallbackPages` distribution using
   `scripts/report-generation-slo.mjs` or manual log export. Use log values, not bookDoc
   field (which is absent).

### Potential P5-3k fix directions

#### Option A: Reduce prompt complexity for reference-aware path

When `characterConsistencyMode=all_pages` and `hasReferenceImage=true`, use a more
concise prompt for page generation to reduce safety filter trigger probability. The
P5-3j compression was a step in this direction but may not be sufficient.

#### Option B: Reference image pre-processing

Check if the reference image URL pattern (Firebase Storage signed URL vs static URL) affects
safety filter behavior. Long or complex signed URLs might contribute to rejections.

#### Option C: Retry without reference on attempt 2

Currently, attempt 0 and 1 both use the same prompt + reference image, so both are likely
to fail for the same reason. Consider clearing `inputImageUrls` on attempt 1 (before falling
back to klein_fast on attempt 2) to get pro_consistent without reference on retry.
This is similar to P5-3f Step b but activated on attempt count alone.

---

## Non-Goals / Things Not Changed

- No model routing changes
- No production defaults changed
- No P5-3f safer_retry changes
- No code changes (investigation only)
- No Cohort B invitations sent
- No generation performed (analysis only; comparison smokes were already done in P5-3k investigation)

---

## Privacy Note

- Raw Cloud Logging JSON was stored in `/tmp` only and deleted after analysis.
- No raw log entries appear in this document.
- No userId, child names, or tester identities are included.
- No signed URLs, image URLs, or child photo URLs are included.
- Book IDs of smoke books are noted for cross-reference only; real-user book IDs are not
  individually listed.
- Reference image URL type was classified (USER_STORAGE_PHOTO vs SMOKE_ANIMALS_PNG vs
  SITE_STATIC_IMG) without logging actual URLs.
