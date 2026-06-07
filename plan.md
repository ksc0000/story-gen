1. **Create the test file:** `src/__tests__/quality-review-helpers.test.ts`.
2. **Setup the testing environment:** Import necessary functions from `src/lib/quality-review.ts` and `vitest`.
3. **Write tests for `parseQualityScore`:**
    * Valid inputs: "1", "2", "3", "4", "5"
    * Invalid inputs: "0", "6", "1.5", "abc", "", null/undefined (if typescript allows, or ignore if TS blocks), etc.
4. **Write tests for `calculateOverallQualityScore`:**
    * Happy paths: various combinations of valid scores (e.g., all 5s, all 1s, mix of scores).
    * Ensure math rounding is correct (e.g., 3.44 vs 3.45 vs 3.4).
5. **Write tests for `splitTextareaLines`:**
    * Normal input with multiple lines.
    * Empty input.
    * Input with extra whitespace.
6. **Write tests for `formatQualityScore`:**
    * Valid numbers.
    * `null`/`undefined`.
7. **Write tests for `getQualityReviewStatusLabel` and `getQualityReviewStatusBadgeClass`:**
    * Ensure mapping works for all valid statuses.
    * Fallback/default logic.
8. **Write tests for `validateQualityReviewForm`:**
    * Valid form.
    * Missing fields.
    * Invalid scores.
    * Review reason length limit.
9. **Write tests for `buildQualityReviewPayload` and `buildQualitySummaryPayload`:**
    * Mock inputs.
    * Verify structure and calculation logic inside the builder (like overallScore).
10. **Pre-commit checks**: Run `npm run guard:hygiene` or other relevant checks as required by `pre_commit_instructions`.
11. **Verify and submit:** Run the tests locally using vitest to ensure everything passes before committing.
