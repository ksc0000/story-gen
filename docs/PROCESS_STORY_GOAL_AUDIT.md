# Story Goal Audit Process

## Overview
This document defines the systematic process for auditing `storyGoal` adherence in EhonAI generated books. The audit ensures that the narrative remains focused on the user's intent and provides a high-quality, coherent experience.

## Audit Layers

The audit process consists of three layers of verification:

### 1. Automated Heuristics (Static Analysis)
*   **Trigger**: Automatically runs immediately after story JSON generation.
*   **Tool**: `functions/src/lib/story-quality.ts` (`validateGeneratedStoryQuality`).
*   **Checks**:
    *   Presence of `storyGoal` and `mainQuestObject`.
    *   Keyword matching between `storyGoal`/`mainQuestObject` and page text.
    *   Detection of `forbiddenQuestObjects` in page text.
    *   Detection of `hiddenDetail` hijacking (using hidden details as the main goal).
*   **Output**: `StoryQualityReport` with warnings or errors. If "error" level issues are found, the system may trigger an automatic rewrite for premium users.

### 2. LLM Auto-Review (Semantic Analysis)
*   **Trigger**: Triggered as part of the quality gate for paid/premium books or manually by admins.
*   **Tool**: `functions/src/lib/auto-review-llm.ts`.
*   **Checks**:
    *   Semantic alignment of the narrative arc with the `storyGoal`.
    *   Evaluation of the scoring criteria defined in the [Story Goal Adherence Rubric](./QUALITY_RUBRICS/STORY_GOAL_ADHERENCE_RUBRIC.md).
    *   Identification of subtle goal drift that simple keyword matching might miss.
*   **Output**: `LLMQualityReviewResult` with scores and recommended fixes (e.g., `rewrite_story`).

### 3. Human Quality Audit (Expert Review)
*   **Trigger**: Samples of generated books (especially high-value premium ones) are reviewed periodically by admins.
*   **Tool**: Admin Quality Review UI (`/admin/book-quality-review`).
*   **Process**:
    1.  Open the Admin Quality Review panel for a book.
    2.  Read the `storyGoal` and `mainQuestObject` in the metadata section.
    3.  Read the story text page-by-page.
    4.  Assign a score (1-5) for "Story Quality" (which incorporates goal adherence) using the [Story Goal Adherence Rubric](./QUALITY_RUBRICS/STORY_GOAL_ADHERENCE_RUBRIC.md) as a guide.
    5.  Log any specific drift issues in the "Flagged Issues" section.
    6.  Mark the book as `needs_fix` if adherence is Score 2 or below.

## Resolution Workflow

If a book fails the `storyGoal` adherence audit:

1.  **Categorize the Failure**:
    *   *Total Drift*: The goal is completely ignored.
    *   *Incomplete Arc*: The goal is introduced but never resolved.
    *   *Object Hijack*: A secondary detail becomes the main focus.
2.  **Action**:
    *   **Automated**: The system recommends a `rewrite_story` task with specific instructions to re-anchor the narrative to the `storyGoal`.
    *   **Manual**: Admin provides detailed feedback and may manually trigger a story rewrite or page regeneration.
3.  **Verification**: The rewritten story must pass the Automated Heuristics layer again before being approved.

## Monitoring and Feedback Loop
*   Adherence scores are aggregated in the Quality Trend Dashboard.
*   Patterns of failure (e.g., specific themes or age groups having higher drift) are used to tune the system's prompt instructions in `functions/src/lib/prompt-builder.ts`.
