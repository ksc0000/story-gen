# Worker Prompt Template

## Context

The `ImageProvider` abstraction was previously completed for page generation (P3-15s), but cover image generation was noted as a remaining scope item for Phase 4 tracking. This task addresses that technical debt by refactoring the cover image generation to use the established `ImageProvider` interface.

## Objective

Refactor the `generateCoverImage()` function to utilize the `ImageProvider` abstraction, ensuring consistency with existing page image generation logic.

## Allowed Scope

- `functions/src/generator/`: Modifications to `generateCoverImage()` and its callers.
- `functions/src/image/`: Integration of `ImageProvider` implementations.
- `functions/src/index.ts`: If dependency injection of `ImageProvider` is required.
- `functions/src/types.ts`: If any related types need minor adjustments for `ImageProvider` compatibility.
- `functions/tests/`: Corresponding test files for cover image generation.

## Forbidden Scope

- Infrastructure changes (e.g., Firebase project settings, Cloud Run/Functions configuration not related to `ImageProvider` instantiation).
- Billing logic or Stripe integration.
- Authentication redesign.
- Secrets management system redesign.
- Changes to generated asset storage (e.g., GCS buckets).
- Changes to the core `ImageProvider` interface definition itself unless absolutely critical for cover image integration.
- Modifications to existing page image generation logic.
- Creation of new story templates or content.

## Requirements

- `generateCoverImage()` must no longer directly invoke a specific image generation provider (e.g., Replicate), but instead delegate to an instance of `ImageProvider`.
- The refactored code should maintain the existing functionality and quality of cover image generation.
- All existing tests related to cover image generation must pass.
- Add new unit or integration tests to ensure the `ImageProvider` is correctly utilized for cover images.
- Ensure the refactoring is clearly documented within the code.

## Output Format

### Summary
Refactored `generateCoverImage()` to use the `ImageProvider` abstraction for unified image generation logic.

### Changed files
- `functions/src/generator/story-generator.ts`
- `functions/src/generator/cover-image-generator.ts` (if separate)
- `functions/src/image/image-provider.ts` (minor changes possible for usage)
- `functions/src/index.ts` (if `ImageProvider` injection changes)
- `functions/tests/generator/story-generator.test.ts`
- `functions/tests/generator/cover-image-generator.test.ts` (if separate)

### Tests executed
- `npm test`
- Specific tests for `generateCoverImage()`
- New tests for `ImageProvider` integration with cover image generation.

### Known issues
None.

### Suggested next task
Refactor `ensureRecurringCharacterReferences()` to use the `ImageProvider` adapter, following the completion of the `generateCoverImage()` refactoring.
