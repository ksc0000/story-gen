# Implement LLM Auto Review Prototype

## Context

The product roadmap for Phase 2: Story & Illustration Quality lists "LLM auto review prototype" as an unimplemented task. The prerequisite "LLM auto review JSON schema" (PR #298) has been completed, defining the structure for the automated review results. This task aims to implement an initial, basic prototype of the LLM-driven quality review process.

## Objective

Develop a backend function that, upon a book's completion, invokes an LLM to automatically generate a quality review based on the book's content (story JSON and image prompts) and saves this review to Firestore.

## Allowed Scope

- `functions/src/` (for LLM invocation logic, Firestore write, and event triggers)
- `functions/test/` (for unit and integration tests of the new function)
- `src/lib/` (for existing types, e.g., `BookDoc`, `QualityReview`, `LLMQualityReviewResult`)
- `docs/` (for a short design doc or update to `QUALITY_METRICS.md` explaining the prototype's input/output)

## Forbidden Scope

- Frontend UI changes
- Infrastructure or billing modifications
- Authentication changes
- Generation of new assets (beyond review data)
- Integration with the existing recommendation system or alerts (this is a prototype)
- Modifying core image or story generation logic
- Production rollout of this feature beyond a controlled prototype.

## Requirements

1.  **Trigger:** Create a Firestore `onUpdate` or `onCreate` trigger that fires when a `BookDoc`'s `status` becomes `completed`.
2.  **LLM Call:** Inside the triggered function, call an LLM (e.g., Gemini) with a prompt that includes the `BookDoc`'s `storyJson` and, optionally, `pageImagePrompts`. The prompt should instruct the LLM to generate a review in the format of the `LLMQualityReviewResult` schema.
3.  **Result Storage:** Store the LLM's parsed response in a new subcollection `books/{bookId}/qualityReviews/{reviewId}`. The `QualityReview` document should indicate `reviewType: 'llm_auto_review'` and include the LLM's output.
4.  **Error Handling:** Implement robust error handling for LLM API calls, JSON parsing, and Firestore writes. Log failures clearly.
5.  **Idempotency:** Ensure the function can be re-triggered without creating duplicate or conflicting review entries (e.g., by checking if an `llm_auto_review` already exists for the book).
6.  **Documentation:** Add a brief section to `docs/QUALITY_METRICS.md` or a new `docs/LLM_AUTO_REVIEW_PROTOTYPE.md` describing the prototype's design, how it's triggered, and what data it stores.
7.  **Tests:** Include unit tests for the LLM prompt construction and Firestore write logic.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

## Worker prompt

Please implement a Cloud Function for the `llm_auto_review` prototype.

1.  **Create a new Cloud Function:**
    *   Name it `onBookCompletion_triggerLLMAutoReview`.
    *   This function should be triggered by `onUpdate` on `books/{bookId}` when `status` changes to `completed`.
2.  **LLM Prompt Construction:**
    *   Inside the function, retrieve the `BookDoc`.
    *   Construct a detailed prompt for a Gemini LLM. The prompt should ask the LLM to act as a "quality reviewer" and evaluate the book based on:
        *   `storyJson.pages` (for story structure, pacing, coherence)
        *   `storyJson.storyGoal` (for adherence to the goal)
        *   `storyJson.mainQuestObject`
        *   `storyJson.forbiddenQuestObjects`
        *   `pageImagePrompts` (for descriptive quality, consistency potential, and alignment with story text)
    *   The prompt should explicitly instruct the LLM to output its review in the `LLMQualityReviewResult` JSON schema format (which is already defined by PR #298 and available in `src/lib/story.ts` as `LLMQualityReviewResult`).
3.  **LLM Call and Parsing:**
    *   Use `model.generateContent()` to call Gemini with the constructed prompt.
    *   Parse the LLM's JSON response carefully, handling potential malformed output.
4.  **Firestore Write:**
    *   If the LLM response is successfully parsed, create a new document in `books/{bookId}/qualityReviews`.
    *   The document should have:
        *   `id`: A unique ID (e.g., `llm_auto_review_` + timestamp).
        *   `reviewType: 'llm_auto_review'`.
        *   `createdAt`: Firestore timestamp.
        *   `result`: The parsed `LLMQualityReviewResult` object from the LLM.
        *   `reviewedBy: 'system_llm'`.
    *   **Idempotency Check:** Before writing, check if an `llm_auto_review` document already exists for the book. If so, skip creating a new one or update the existing one if `createdAt` is older (for re-runs/retries). For this prototype, simply skipping if one exists is sufficient.
5.  **Error Logging:** Log any errors during LLM calls, JSON parsing, or Firestore writes.
6.  **Documentation:** Add a new markdown file `docs/LLM_AUTO_REVIEW_PROTOTYPE.md` describing:
    *   The purpose of the prototype.
    *   The Cloud Function name and trigger.
    *   The inputs to the LLM.
    *   The expected output schema.
    *   Where
