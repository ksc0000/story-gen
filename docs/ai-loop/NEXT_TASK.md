# Refine Story Generation Prompts for Improved Opening and Ending Quality

## Context

The EhonAI product roadmap (Phase 2: Story & Illustration Quality) aims to make generated stories "a marketable picture book." A critical aspect of this is ensuring a natural and engaging reading experience, specifically addressing the completion criteria: "読み聞かせ用途として、story opening と page progression が不自然でないこと" and reducing "「急に始まる感」feedback が一定以下". While general text quality and semantic richness have been improved, a dedicated focus on the narrative flow and impact of story openings and endings is needed. This task targets prompt refinements to achieve smoother introductions and more conclusive resolutions.

## Objective

Enhance the story generation prompts to ensure smoother, more engaging story openings and more satisfying, conclusive endings, reducing instances of "abrupt beginnings" and improving overall narrative flow.

## Allowed Scope

-   `functions/src/ai/story/` (Story generation logic, prompt construction for openings and endings)
-   `functions/src/prompts/` (LLM prompt definitions related to story structure)
-   `functions/tests/ai/story/` (Unit and integration tests for story generation that can assert opening/ending quality)
-   `docs/` (Documentation for prompt refinements and rationale)

## Forbidden Scope

-   Infrastructure changes (Cloud Functions, Firestore rules not directly related to prompt storage, CI/CD)
-   Billing logic or pricing model modifications
-   Core authentication system redesign
-   Management of secret keys or environment variables (beyond referencing existing ones)
-   Generated assets (e.g., images, PDFs) that are not directly related to prompt output validation
-   UI changes (beyond what's necessary to observe generation output for testing)

## Requirements

-   **Audit & Analysis:** Conduct a focused audit of a small sample of recently generated books (e.g., 5-10 books) to identify common patterns that lead to unnatural or abrupt story openings and endings. Document these patterns in `docs/`.
-   **Prompt Refinement:** Based on the audit, propose and implement specific modifications to the LLM story generation prompts. These modifications should guide the AI towards:
    *   More natural and engaging introductions that set the scene and character(s).
    *   More satisfying and conclusive resolutions that wrap up the `storyGoal`.
-   **Test Coverage:** Add or update relevant unit/integration tests within `functions/tests/ai/story/` to assert improved opening/ending structures or the presence/absence of specific keywords/phrases, where feasible and impactful.
-   **Documentation:** Create a document (e.g., `docs/STORY_OPENING_ENDING_IMPROVEMENTS.md`) detailing:
    *   The identified issues from the audit.
    *   The specific prompt changes made.
    *   The rationale behind these changes.
    *   Expected improvements and potential remaining challenges.
-   **Follow-up Items:** Report any new issues or observations related to overall story pacing, clarity of `storyGoal` resolution, or unexpected side effects from the prompt changes.

## Output Format

```markdown
# [REPLACE WITH ACTUAL TASK TITLE]

## Context

[Describe the context, why this task is important now, and how it aligns with the roadmap.]

## Objective

[State the single, clear, and bounded objective.]

## Allowed Scope

- Explicitly list editable directories.

## Forbidden Scope

- Infrastructure
- Billing
- Authentication redesign
- Secrets
- Generated assets

## Requirements

- Keep changes reviewable.
- Prefer docs-first updates.
- Include tests where appropriate.
- Report follow-up items.

## Output Summary

[A brief summary of the work done.]

## Changed Files

- [List of files changed]

## Tests Executed

- [List of tests executed and their results]

## Known Issues

- [List of any known issues or regressions]

## Suggested Next Task

[Suggest the very next task for the AI Loop, following the template format.]
```
