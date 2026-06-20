# Refine Story Generation to Prevent `hiddenDetail` from Dominating the Narrative

## Context

The EhonAI product roadmap for Phase 2, "Story & Illustration Quality," identifies "hiddenDetail の主目的化防止" (Prevent `hiddenDetail` from becoming the main objective) as a required improvement. Observations suggest that the `hiddenDetail`, intended as a subtle background element or minor discovery, sometimes receives undue emphasis in the generated story, potentially overshadowing the primary `storyGoal` or leading to unintended plot diversions. This task aims to refine the story generation prompts to ensure `hiddenDetail` maintains its intended secondary role.

## Objective

Adjust the story generation prompts to ensure that `hiddenDetail` remains a subtle, secondary element within the narrative, complementing the `storyGoal` without becoming its primary focus or an overarching quest.

## Allowed Scope

- `functions/src/`:
    - `functions/src/story/`: For modifying story generation logic and prompt construction.
    - `functions/src/prompts/`: For adjusting prompt templates related to story generation.
- `docs/`: For documenting analysis, examples, and prompt draft iterations.
- `scripts/`: For creating any diagnostic scripts to identify or verify cases of `hiddenDetail` dominance (if necessary).
- `__tests__/`: For adding or updating unit and integration tests for story generation.

## Forbidden Scope

- Infrastructure changes (e.g., Cloud Functions configuration, Firestore rules, IAM).
- Billing logic or pricing model modifications.
- Authentication system redesign.
- Management of secret keys.
- Automatic generation of visual assets (e.g., image generation, avatar creation beyond prompt adjustments).
- Any user interface (UI) or user experience (UX) modifications (frontend changes).
- Changes to the core `ImageProvider` or image generation fallback logic.

## Requirements

- **Analysis & Documentation (Docs-First):**
    - Identify and document 2-3 specific examples (e.g., using `storyQualityReport` or past review feedback) where `hiddenDetail` unintentionally became a primary narrative element. Describe the `storyGoal`, `hiddenDetail`, and how the generated story overemphasized the `hiddenDetail`.
    - Draft proposed changes to the LLM prompt instructions in `docs/` before implementation.
- **Prompt Modification:**
    - Implement changes to the `generateStory` function's prompt construction in `functions/src/story/` and `functions/src/prompts/` to clearly instruct the LLM on the hierarchical relationship between `storyGoal` (primary) and `hiddenDetail` (secondary/subtle).
    - Ensure `hiddenDetail` is framed as a background element, a minor discovery, or a subtle observation rather than a core objective.
- **Testing:**
    - Ensure all existing unit and integration tests for story generation pass without regressions.
    - Add at least one new integration test case (`functions/__tests__/story/generateStory.test.ts`) that specifically sets up a `storyGoal` and `hiddenDetail` where
