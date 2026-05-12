# IMG-002 Reference Path Verification Results
**Date:** 2026-05-12  
**Status:** ✓ VERIFIED_WITH_MINOR_FOLLOW_UP (fixed-first-zoo / 1 book)  
**Related commits:** 56f1193, 4f56a62

## Executive Summary
IMG-002 mitigation is **functionally working**:
- Character reference images are correctly passed to image generation when available
- IMG-002 prevention prompts (REF_ISOLATION_SUFFIX) are applied to all pages
- Reference usage is properly tracked (inputReferenceCount, usedCharacterReference)
- Scene-lock constraints for fixed-first-zoo are enforced

## Visual Verification Run (Completed)

### Run configuration
- Template: `fixed-first-zoo`
- Book ID: `iLZPwQsU454SuvCmwrjd`
- Mode: single-book smoke only (`--template-id=fixed-first-zoo`)
- Reference: `--with-reference --reference-image-url=<reachable hosted image>`
- Result: `completed` (4/4 pages completed)

### Required checks and outcomes
- `inputReferenceCount > 0`: PASS (all pages `1`)
- `usedCharacterReference=true`: PASS (all pages `true`)
- sandbox/playground background leakage: PASS (no sandbox/playground-like background observed)
- zoo scene成立: PASS (zoo gate / zoo enclosure / animal viewing scenes are maintained)
- child identity consistency: PASS_WITH_MINOR_VARIATION (same child impression maintained across pages with minor outfit/angle changes)
- no-text / no-signage constraints: PARTIAL (readable large text not observed, but small signboard-like element appears in one page)

### Final decision labels
- IMG-002 reference path: VERIFIED
- IMG-002 visual verification: VERIFIED_WITH_MINOR_FOLLOW_UP
- T2-B: proceed allowed
- REF-001: planned / design continues (not blocking T2-B)
- IMG-001/no-text: minor follow-up remains

### Notes
- The previous failed run (`s4e0U6sbNErXyIApJc10`) proved reference path behavior.
- This run (`iLZPwQsU454SuvCmwrjd`) completed end-to-end and closes visual verification for IMG-002.

## Investigation Results

### Initial Problem Discovery
Previous smoke book `M4zqk5RIAf6whchzNhNA` had:
- `inputReferenceCount = 0` on all pages
- `usedCharacterReference = false` on all pages
- **Root cause:** No childProfileSnapshot provided in BookInput
- **Impact:** Reference path not tested; IMG-002 mitigation effectiveness unverified

### Reference Path Analysis
Found the conditional logic chain:
1. **Character Consistency Mode** (`shouldUseCharacterReferenceForPage`):
   - Default for free plan: `"all_pages"` ✓
   - Should use references on all pages

2. **Reference Image Availability** (`buildInputImageRefs`):
   - Requires: `childProfileSnapshot?.visualProfile.referenceImageUrl` OR `approvedImageUrl`
   - Previous smoke script: Did NOT provide childProfileSnapshot
   - **Fix:** Added `buildChildProfileSnapshot()` to smoke script

3. **Data Flow**:
   ```
   BookData.childProfileSnapshot.visualProfile.referenceImageUrl
   ↓ (provided via buildChildProfileSnapshot)
   buildInputImageRefs() → [{ role: "character_reference", url: "..." }]
   ↓
   inputImageUrls.length = 1
   ↓
   inputReferenceCount: 1 ✓
   usedCharacterReference: true ✓
   ```

### Reference-Enabled Verification (Book: s4e0U6sbNErXyIApJc10)

**Smoke book creation:**
```
templateId: fixed-first-zoo
childProfileSnapshot: YES (with referenceImageUrl)
characterConsistencyMode: "all_pages"
```

**Results:**
- ✓ All 4 pages have `inputReferenceCount: 1`
- ✓ All 4 pages have `usedCharacterReference: true`
- ✓ inputImageRefs correctly populated:
  ```json
  [{
    "role": "character_reference",
    "characterId": "child_protagonist",
    "url": "https://via.placeholder.com/200x300/fdbcb4/000000?text=Child+Face",
    "source": "referenceImageUrl"
  }]
  ```

**Image generation failures (not IMG-002 related):**
- Pages 0,1,2: SSL errors from placeholder image service (UNEXPECTED_EOF_WHILE_READING)
- Page 3: Replicate API rate limiting (429 Too Many Requests)
- **Note:** These failures confirm the reference IS being used (else it wouldn't try to fetch the image)

## Technical Validation

### Code Review Findings
- `shouldUseCharacterReferenceForPage()` correctly defaults to `"cover_only"` when mode unspecified
- Free plan config provides `characterConsistencyMode: "all_pages"` ✓
- `buildInputImageRefs()` properly filters and converts reference URLs via `toPublicUrl()`
- Page data correctly stores `inputReferenceCount` and `usedCharacterReference` fields

### Prompt Verification
- `FIXED_IMAGE_PROMPT_STANDARD_SUFFIX`: "no readable writing anywhere, no signage..." ✓ Applied to all pages
- `FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX`: "use reference image for child's face and identity only..." ✓ Applied to all pages
- Zoo template scene-lock: "Setting: zoo entrance... — NOT a sandbox, NOT an outdoor playground..." ✓ Applied

## Changes Made

### 1. Modified `scripts/create-template-smoke-books.js`
- **Added:** `buildChildProfileSnapshot(index)` function
  - Provides `visualProfile.referenceImageUrl` (placeholder image)
  - Provides basic personality and visual profile data

- **Modified:** `buildBookPayload()`
  - Now includes `childProfileSnapshot` field
  - Now includes `characterConsistencyMode: "all_pages"` (explicit, for reference testing)

### 2. Created `scripts/monitor-smoke-book.js`
- Tracks generation progress
- Shows page-level status
- Reports inputReferenceCount and usedCharacterReference

### 3. Created `scripts/inspect-smoke-book.js`
- Detailed diagnostics for failed/completed books
- Shows inputImageRefs array
- Reports imageFailureReason with full error messages

### 4. Updated `package.json`
- Added `smoke:monitor` script
- Added `smoke:inspect` script

## Usage

### Generate reference-enabled smoke test:
```bash
node scripts/create-template-smoke-books.js --template-id=fixed-first-zoo --write
```

### Monitor progress:
```bash
npm run smoke:monitor -- <bookId>
```

### Inspect results:
```bash
npm run smoke:inspect -- <bookId>
```

## Remaining Tasks

### For Complete IMG-002 Verification
1. IMG-002 visual verification is complete for fixed-first-zoo single-book flow.
2. Keep monitoring on future smoke runs for regression (especially signage artifacts).

### For Production Readiness
1. Add reference image URL validation in smoke script
2. Consider using Cloud Storage for test reference images
3. Document rate limit handling strategy
4. Add CI/CD test for reference-enabled generation

## Decision Gate: IMG-002 → T2-B

**Current Status:** VERIFIED_WITH_MINOR_FOLLOW_UP ✓
- Code implementation correct
- Data flow validated
- Prompts applied correctly
- Reference-enabled generation completed (4/4 pages)
- Visual outcome confirms sandbox/playground leakage is mitigated in this scenario

**Recommendation:** T2-B 着手可（IMG-002 visual gate satisfied）。

## References
- Issue: IMG-002 - Prevent character reference background leakage
- Template affected: fixed-first-zoo (and all fixed templates via scene-lock/reference-isolation prompts)
- Previous work: commit 63ed561 (prompt additions), commit cce5bf0 (template sync)
