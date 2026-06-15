# Enhance LLM Auto Review for Semantic Content in Age 3+ Books

## Context

The product roadmap for Phase 2 emphasizes improving story and illustration quality, with specific "含めるタスク" (tasks to include) related to text quality. One crucial aspect is ensuring sufficient semantic content for age-appropriate books, particularly for ages 3 and above. The roadmap explicitly states: "3歳以上の意味量確保（場所・行動・気持ち・発見の2つ以上）" (Ensure sufficient semantic content for ages 3+, at least two of Location, Action, Emotion, Discovery).

The LLM auto-review system is already implemented for prototyping, persistence, and display in the admin UI (PR #318, #357, #368). This task leverages that existing infrastructure to diagnose the semantic content of generated stories, providing actionable insights for prompt engineering.

## Objective

Enhance the LLM Auto Review system to specifically assess the semantic richness of story page text for books targeted at ages 3 and above. The system should check for the presence of at least two out of four key semantic elements: Location (場所), Action (行動), Emotion (気持ち), and Discovery (発見) within each page's story text. The results of this assessment (e.g., detected elements, identified deficiency) should be recorded as part of the LLM auto-review data.

This diagnostic will help identify specific patterns of text that lack sufficient detail for the target age group, informing subsequent prompt engineering efforts to improve story quality.

## Allowed Scope

-   `functions/src/`: Updates to LLM prompt generation logic, LLM auto-review functions, data models for review results.
-   `docs/`: Updates to `QUALITY_METRICS.md` or creation of a new design document outlining the semantic content detection strategy and its integration with LLM auto-review.
-   `_tests/`: Addition of unit and integration tests for the LLM auto-review logic to cover the new semantic content check.

## Forbidden Scope

-   Infrastructure (e.g., Firestore rules, Cloud Functions deployment changes beyond function code updates)
-   Billing or subscription logic
-   Authentication redesign
-   Secrets management
-   Direct modification of generated image assets
-   Frontend UI changes (beyond displaying existing review data in Admin UI, if needed for validation)
-   Any tasks related to cover page quality, PDF output, or plan-based page count restrictions (these are covered by other open tasks).

## Requirements

-   **Docs-first Design**: Document the strategy for detecting "場所・行動・気持ち・発見" (Location, Action, Emotion, Discovery) elements within story text, and how the LLM will be prompted to identify these. This should include the definition of what constitutes each element in the context of children's stories. This can be an update to `QUALITY_METRICS.md` or a new `docs/` file.
-   **LLM Auto Review Integration**: Modify the LLM auto-review prompt and processing logic to evaluate each story page's text for the presence of the four semantic elements.
-   **Result Persistence**: Record the detected semantic elements and whether the page meets the "2 out of 4" criterion within the `qualityReviews.llm_auto_review` Firestore data. If a page fails to meet the criterion, an appropriate `flaggedIssues` entry should be added.
-   **Test Coverage**: Add unit tests for the LLM auto-review function to ensure the new semantic content detection logic functions as expected with various story text inputs (both passing and failing cases).
-   **Reviewability**: Keep the changes focused on this specific enhancement to semantic content detection.

## Output Format

-   Summary
-   Changed files
-   Tests executed
-   Known issues
-   Suggested next task

## Worker Prompt

Please implement the enhancement to the LLM Auto Review system as described above.

**Detailed Steps:**

1.  **Documentation**:
    *   Create a new design document at `docs/LLM_AUTO_REVIEW_SEMANTIC_CONTENT.md`.
    *   Define what "場所 (Location)", "行動 (Action)", "気持ち (Emotion)", and "発見 (Discovery)" mean in the context of a short children's story page. Provide 2-3 examples for each.
    *   Outline the strategy for prompting the LLM to identify these elements and assess if at least two are present in a given page's text.
    *   Specify the structure of the JSON output expected from the LLM for this assessment.

2.  **LLM Auto Review Prompt and Logic**:
    *   Locate the existing LLM auto-review function (likely in `functions/src/llm/`).
    *   Modify the prompt sent to the LLM (e.g., Gemini) to include instructions for assessing semantic content. The prompt should ask the LLM to identify which of the four elements (場所, 行動, 気持ち, 発見) are present in the story text for the current page and to state if at least two are present.
    *   Ensure this new instruction is gated or only applies to books where `readingProfile.ageBand` indicates age 3+ (e.g., `preschool_3_4`, `ages_5_6`).
    *   Update the function to parse the LLM's response for this new semantic content information.

3.  **Result Persistence**:
    *   Update the `llm_auto_review` data model (or an appropriate sub-field) to store the results of the semantic content check. This should include:
        *   `semanticContentDetectedElements: string[]` (e.g., `["場所", "行動"]`)
        *   `hasSufficientSemanticContent: boolean` (true if >= 2 elements detected)
        *   If `hasSufficientSemanticContent` is `false`, add a new `flaggedIssues` entry with `issueType: "insufficient_semantic_content"` and `description: "ページに十分な意味内容（場所・行動・気持ち・発見のうち2つ以上）がありません。"`.

4.  **Test Coverage**:
    *   Add new test cases to the LLM auto-review tests (`_tests/
