# Worker Prompt Template

## Context

The product roadmap shows significant progress across reliability (Phase 1), quality (Phase 2), and template modes (Phase 3). Phase 4 (Gemini JSON Hardening) is now complete, and Phase 5 (Monetization) is in a soft launch phase with active monitoring and several critical bug fixes addressed.

A key follow-up from the Phase 3 Image Provider Abstraction closure (`P3-15s`) was to migrate cover image and character reference generation to the new `ImageProvider` interface. The core `ImageProvider` for page generation is already complete.

## Objective

Migrate the existing `generateCoverImage()` function to utilize the `ImageProvider` adapter, completing the abstraction for all image generation types.

## Allowed Scope

- `functions/src/image/`
- `functions/src/imageGenerator/`
- `functions/src/book/`
- `functions/test/`
- `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md` (for update)

## Forbidden Scope

- Infrastructure configuration (`firebase.json`, `.yaml` files outside of `functions/`)
- Billing logic
- Authentication system
- Database schema changes outside `functions/src/book/types.ts` if strictly necessary for the migration
- Deployment scripts
- Generated assets

## Requirements

- The `generateCoverImage()` function must no longer directly call specific image generation providers (e.g., Replicate, OpenAI) but instead use the `ImageProvider` interface.
- Ensure that the cover image generation process maintains its current functionality and quality.
- Update relevant unit or integration tests to reflect the change, ensuring the `ImageProvider` is correctly utilized and mocked/stubbed as necessary.
- Add a brief note to `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md` or a new section in the appropriate design doc indicating that cover image generation is now migrated.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker prompt

```markdown
# Worker Prompt Template

## Context

You are tasked with continuing the architectural cleanup and abstraction of image generation within the EhonAI project. The `ImageProvider` interface was successfully implemented for core page generation (Phase 3, P3-15s closure), but cover image and recurring character reference generation were explicitly noted as remaining scope. Your current objective is to address the cover image generation.

## Objective

Migrate the `generateCoverImage()` function to use the `ImageProvider` abstraction. This involves identifying the appropriate `ImageProvider` methods or extending the interface if necessary, and refactoring `generateCoverImage()` to route through this abstracted layer.

## Allowed Scope

- `functions/src/image/` (e.g., `imageProviders.ts`, `imageGenerator.ts` if adapting)
- `functions/src/imageGenerator/` (e.g., `generateCoverImage.ts` and related files)
- `functions/src/book/` (e.g., `bookProcessor.ts` if `generateCoverImage` is called from there, `types.ts` if minor type updates are strictly necessary)
- `functions/test/` (for unit/integration tests related to cover image generation)
- `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md` (to document the completion of this follow-up)

## Forbidden Scope

- `firebase.json`, `package.json`, `.yaml` files in the root or outside `functions/`
- Billing-related logic or services
- User authentication or authorization system changes
- Database schema migrations (e.g., Firestore rules that are not type-only definitions)
- Any auto-generated files or assets

## Requirements

1.  **Refactor `generateCoverImage()`**:
    *   Locate the `generateCoverImage()` function (likely in `functions/src/imageGenerator/`).
    *   Modify its implementation to utilize an instance of `ImageProvider` (e.g., `openaiImageProvider`, `replicateImageProvider`) instead of directly calling provider-specific APIs.
    *   Ensure the function correctly passes the necessary prompt, `styleBible`, and other parameters to the `ImageProvider`.
2.  **Update `ImageProvider` usage**:
    *   Confirm that `ImageProvider` interface (e.g., `functions/src/image/imageProviders.ts`) contains a suitable method for generating cover images. If not, carefully consider if a minor extension to the interface is warranted, or if an existing method can be adapted. Prioritize adapting existing methods if possible to avoid interface bloat.
    *   Ensure the correct `ImageProvider` implementation is selected and injected/passed to `generateCoverImage()`.
3.  **Testing**:
    *   Add or update unit tests for `generateCoverImage()` to assert that it correctly calls the `ImageProvider`'s method with the expected parameters. Mock the `ImageProvider` where appropriate.
    *   Verify that existing integration tests (if any for cover generation) still pass.
4.  **Documentation**:
    *   Add a small note to `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md` under the "Phase 4: Tracking Tasks" section to indicate that `generateCoverImage()` has now been migrated to use the `ImageProvider` adapter.

## Acceptance Criteria

- `generateCoverImage()` successfully generates cover images by routing through the `ImageProvider` interface.
- All related tests pass.
- No direct calls to low-level image generation APIs are made within `generateCoverImage()`.
- The `PHASE3_IMAGE_PROVIDER_CLOSURE.md` document is updated.

## Required Test Commands

- `npm test --prefix functions`
- Manual verification of cover image generation through admin UI (after deployment, if possible in a dev environment).

## Suggested next task

Migrate `ensureRecurringCharacterReferences()` to use the `ImageProvider` adapter.
```
