# Worker Prompt Template

## Context

The `ImageProvider` abstraction was recently completed for page generation (`P3-15s COMPLETE`). The roadmap explicitly lists "カバー画像・キャラ参照" as remaining scope to be tracked in Phase 4 (`P4`). The `Current State` shows that several critical Phase 4 and Phase 5 tasks have been completed, including `P5-5` (alert policies) and `P5-3c` (simplified_scene experiment). This task focuses on solidifying the `ImageProvider` abstraction by applying it to cover image generation.

## Objective

Migrate the `generateCoverImage` function to utilize the `ImageProvider` interface, fully integrating cover image generation into the new abstraction layer.

## Allowed Scope

- `functions/src/image/`
- `functions/src/types/` (if type definitions need updating for the adapter)
- `functions/src/test/` (for adding/updating tests)
- `docs/` (for documenting the change, if applicable)

## Forbidden Scope

- Infrastructure configuration (Firebase project settings, Cloud Run, etc.)
- Billing-related logic (Stripe integration beyond `ImageProvider` selection)
- Authentication redesign
- Secrets management logic
- Generated assets (e.g., `lib/` directory contents)
- Any files outside `functions/` or `docs/`

## Requirements

- The `generateCoverImage` function should no longer directly call specific image generation APIs (e.g., Replicate, OpenAI). Instead, it should use an injected `ImageProvider` instance.
- Ensure that the correct `ImageProvider` (e.g., based on `imageModelProfile` or `modelFamily`) is selected for cover image generation.
- All existing functionality and quality aspects of cover image generation must be preserved.
- Add or update unit/integration tests to verify that `generateCoverImage` correctly uses the `ImageProvider` interface and produces expected output (e.g., by mocking the `ImageProvider`).
- Update any call sites of `generateCoverImage` to pass the `ImageProvider` instance.
- Keep changes minimal and focused.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker Prompt

Please refactor the `generateCoverImage` function to accept and utilize the `ImageProvider` interface.

1.  **Modify `generateCoverImage` signature:** Update `generateCoverImage` to receive an `ImageProvider` instance (or a factory function to get one) as an argument.
2.  **Integrate `ImageProvider`:** Replace direct calls to image generation APIs within `generateCoverImage` with calls to the methods provided by the `ImageProvider` interface (e.g., `imageProvider.generateImage`).
3.  **Update call sites:** Adjust any functions or services that call `generateCoverImage` to provide the appropriate `ImageProvider` instance.
4.  **Add/Update Tests:** Create new unit tests or modify existing ones for `generateCoverImage` to ensure the `ImageProvider` integration works as expected. Mock the `ImageProvider` to simulate its behavior without making actual API calls.

**Acceptance Criteria:**

- The `generateCoverImage` function successfully generates cover images using the `ImageProvider` abstraction.
- No regression in cover image quality or generation success rate.
- All relevant unit tests pass, and new tests cover the `ImageProvider` integration.

**Required Test Commands:**

- `npm test -- functions` (run all backend tests)
- Specific tests for `generateCoverImage` and its call sites.
- Manually run a local generation test with `fixed_template` mode for a book with cover to verify functionality (e.g., using `npm run generate-book` with relevant flags).

---
**Summary:**
Refactored `generateCoverImage` to use the `ImageProvider` interface, completing the migration of cover image generation to the shared abstraction layer.

**Changed files:**
- `functions/src/image/generateCoverImage.ts`
- `functions/src/image/imageProvider.ts` (if minor interface adjustments are needed)
- `functions/src/index.ts` (or other entry points calling `generateCoverImage`)
- `functions/src/test/image/generateCoverImage.test.ts` (new/updated test file)

**Tests executed:**
- Unit tests for `generateCoverImage` (mocking `ImageProvider`).
- Integration tests (if any) involving book generation with cover.
- Manual verification of cover image generation via local CLI.

**Known issues:**
- None identified at this stage.

**Suggested next task:**
Migrate `ensureRecurringCharacterReferences()` to the `ImageProvider` adapter, as outlined in the `P4-ref` follow-up task.
