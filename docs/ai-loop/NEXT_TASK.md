# Refactor `ensureRecurringCharacterReferences()` to use `ImageProvider` adapter

## Context

The product roadmap (Phase 3 Closure, `P3-15s COMPLETE`) outlined the need for `ImageProvider` abstraction, with remaining scope for cover images and character references (`P4 追跡`). The `generateCoverImage()` function has successfully been refactored to use the `ImageProvider` adapter (PR #241). This task addresses the remaining piece of the `ImageProvider` abstraction for character reference generation.

## Objective

Refactor the `ensureRecurringCharacterReferences()` function to utilize the `ImageProvider` interface for generating character reference images. This completes the `ImageProvider` abstraction scope for image generation logic, making the system more modular and prepared for future provider comparisons or A/B testing.

## Allowed Scope

- `functions/src/`: Modifications to `generate-book.ts`, `imageProviders/` directory (e.g., `imageProvider.ts`, concrete implementations like `replicateImageProvider.ts`, `openaiImageProvider.ts`).
- `functions/tests/`: Updates to existing tests or addition of new tests to cover the refactored logic.
- `docs/`: Update `PHASE3_IMAGE_PROVIDER_CLOSURE.md` to reflect the completion of this scope.

## Forbidden Scope

- Infrastructure changes (e.g., Firebase project settings, Cloud Functions deployment config beyond function code).
- Billing logic changes.
- Authentication redesign.
- Management of secrets not directly related to `ImageProvider` instantiation.
- Changes to generated assets (e.g., image files, pre-rendered previews).

## Requirements

1.  **Identify Current Logic**: Pinpoint the existing image generation logic within `ensureRecurringCharacterReferences()` that is responsible for creating character reference images.
2.  **Abstract to `ImageProvider`**: Introduce a new method (or modify an existing one) in the `ImageProvider` interface (e.g., `generateCharacterReferenceImage` or an extended `generateImage` call with specific context) that encapsulates the logic for generating character reference images.
3.  **Implement New Method**: Provide concrete implementations for this new/modified `ImageProvider` method in existing providers (e.g., `ReplicateImageProvider`, `OpenAIImageProvider`).
4.  **Update `generate-book.ts`**: Modify `ensureRecurringCharacterReferences()` in `generate-book.ts` to call the appropriate `ImageProvider` method to generate character reference images.
5.  **Maintain Functionality**: Ensure that character reference image generation continues to work correctly, maintaining the existing character consistency quality.
6.  **Tests**:
    *   Add or update unit tests for the `ImageProvider` implementations to verify the new character reference image generation logic.
    *   Run relevant integration tests (if any exist) or simulate `generate-book.ts` flow to ensure no regressions.
7.  **Documentation**: Update `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md` to mark the "キャラ参照" part of the `ImageProvider` abstraction as completed.

## Output Format

### Summary

Refactored `ensureRecurringCharacterReferences()` to use the `ImageProvider` interface, completing the abstraction for character reference image generation. This involved adding a new method to the `ImageProvider` interface and its concrete implementations, then updating the call site in `generate-book.ts`.

### Changed files

- `functions/src/imageProviders/imageProvider.ts`
- `functions/src/imageProviders/replicateImageProvider.ts`
- `functions/src/imageProviders/openaiImageProvider.ts`
- `functions/src/generate-book.ts`
- `functions/tests/imageProviders/replicateImageProvider.test.ts`
- `functions/tests/generate-book.test.ts` (if relevant integration tests are modified/added)
- `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md`

### Tests executed

- `npm test -- workspace=functions`
- Specific unit tests for `imageProviders` and `generate-book.ts` related to character reference generation.

### Known issues

None.

### Suggested next task

**P4-logging: Cloud Logging クエリ自動化**

## Worker prompt

```markdown
Please refactor the `ensureRecurringCharacterReferences()` function in `functions/src/generate-book.ts` to use the `ImageProvider` interface for generating character reference images.

Here are the detailed steps:

1.  **Modify `ImageProvider` Interface**:
    *   In `functions/src/imageProviders/imageProvider.ts`, add a new method to the `ImageProvider` interface, for example, `generateCharacterReferenceImage(prompt: string, characterId: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>`. The `characterId` is crucial for linking the generated image back to the specific character.
    *   `ImageGenerationOptions` might need to be extended if specific options are required for character references.

2.  **Implement in Concrete Providers**:
    *   Implement `generateCharacterReferenceImage` in `functions/src/imageProviders/replicateImageProvider.ts` and `functions/src/imageProviders/openaiImageProvider.ts`.
    *   The implementation should leverage the respective provider's capabilities to generate an image based on the provided prompt and ideally associate it with the character ID for potential future tracking or logging.
    *   Ensure the prompt construction for character references (e.g., for `flux11_pro_consistent`) is correctly passed to the new method.

3.  **Update `ensureRecurringCharacterReferences()`**:
    *   In `functions/src/generate-book.ts`, locate the `ensureRecurringCharacterReferences()` function.
    *   Modify the logic within this function to call `this.imageProvider.generateCharacterReferenceImage(...)` instead of directly calling provider-specific image generation methods or existing generic `generateImage` if it doesn't fit the character reference context well.
    *   Ensure all necessary parameters (prompt, characterId, options) are correctly passed to the new `ImageProvider` method.

4.  **Add/Update Tests**:
    *   In `functions/tests/imageProviders/replicateImageProvider.test.ts` (and potentially `openaiImageProvider.test.ts`), add new test cases to verify the `generateCharacterReferenceImage` method. Mock the underlying API calls (e.g., `replicate.predictions.create`, OpenAI API) to ensure the method behaves as expected.
    *   Review `functions/tests/generate-book.test.ts` to see if any existing tests cover `ensureRecurringCharacterReferences()` and update them if the refactoring changes their internal workings or expectations. Ensure no regressions occur.

5.  **Update Documentation**:
    *   Edit `docs/PHASE3_IMAGE_PROVIDER_CLOSURE.md`. Find the section mentioning `残余スコープ: カバー画像・キャラ参照（P4 追跡）` and update it to mark the "キャラ参照" part as completed, along with a reference to this change.
```
