# Refactor `generateCoverImage()` to use `ImageProvider` Adapter

## Context

The product roadmap (Phase 3 Closure and Phase 4 Tracking) explicitly states that the `ImageProvider` abstraction, previously completed for page generation (`P3-15s`), has remaining scope for "カバー画像・キャラ参照". The current `generateCoverImage()` function directly interacts with image generation providers without using this abstraction. This task addresses this technical debt to unify the image generation logic.

## Objective

Refactor the `generateCoverImage()` function to utilize the `ImageProvider` interface, ensuring that cover image generation goes through the established abstraction layer.

## Allowed Scope

- `functions/src/ai/image/` (for `ImageProvider` implementation details if any new specific cover logic is needed, though ideally, existing `ReplicateImageProvider` should suffice)
- `functions/src/controllers/imageGeneration.ts` (where `generateCoverImage` resides)
- `functions/src/types/` (for any type definition updates related to image providers or cover generation)
- `functions/src/index.ts` (for wiring the `ImageProvider` if not already done for cover generation context)
- `functions/tests/` (for adding/updating tests)

## Forbidden Scope

- Infrastructure changes (e.g., Firebase project settings, Cloud Functions deployment config beyond `index.ts` changes)
- Billing system modifications
- Authentication redesign
- Secrets management (e.g., adding new secrets, changing existing secret access)
- Generated assets (e.g., client-side generated code)
- Any changes to the actual image generation models or prompts, beyond adapting them to the `ImageProvider` interface.

## Requirements

- **Refactor `generateCoverImage()`:** Modify the `generateCoverImage` function in `functions/src/controllers/imageGeneration.ts` to call an `ImageProvider` instance (e.g., `ReplicateImageProvider`) instead of directly interacting with the Replicate API.
- **Preserve Existing Logic:** Ensure that the original logic for selecting the cover image model (e.g., FLUX, SDXL) and handling input parameters (prompt, negative prompt, style, `generationOverride`s, etc.) is maintained and correctly passed through the `ImageProvider`.
- **Maintain Data Flow:** Verify that the `coverImagePrompt`, `coverStatus`, and other relevant fields in the `BookDoc` are updated correctly after the image generation, just as they are currently.
- **Type Safety:** Update any relevant
