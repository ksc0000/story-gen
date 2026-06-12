# Generate and Set Unique Preview Images for New Fixed Templates

## Context

Phase 3 of the roadmap focuses on strengthening Template Mode. PR #274 introduced 42 new fixed templates, and PR #283/284 improved the UI and addressed generic images for existing templates. Task #290 focused on auditing the quality of these preview images and planning for their generation. The next logical step is to implement the generation and setting of unique, high-quality preview images for the templates that still lack them, or use generic/inappropriate ones. This directly supports the Phase 3 goal of enhancing the user experience in the template selection UI by providing accurate visual representations.

## Objective

Generate and set unique preview images for the newly added and existing fixed templates that lack them, ensuring each image accurately represents the template's style and content, and improves user selection clarity.

## Allowed Scope

-   `functions/src/`: For any new or adapted image generation scripts (e.g., modifying `generate-cover-image.ts` for batch processing, or creating a new utility script).
-   `apps/web/`: For verifying display of updated preview images in the client application (e.g., `/create/input`). No UI changes should be made here.
-   `docs/`: For documenting the generation and update process.
-   Firestore operations: Specifically, updating `fixed_templates` documents with `previewImageUrl` fields.
-   Storage operations: Uploading generated images to Firebase Storage/GCS.

## Forbidden Scope

-   Infrastructure changes (outside of specific Firestore rule/index updates if strictly required for the `previewImageUrl` field, which is unlikely).
-   Billing system changes.
-   Authentication redesign.
-   Secrets management changes (beyond utilizing existing image generation API keys).
-   Core UI/UX changes to the template selection component itself; this task focuses solely on data updates.

## Requirements

1.  **Identify Templates:** Identify all `fixed_templates` entries that currently use a generic placeholder image, an inappropriate image, or are missing the `previewImageUrl` field. A starting point is the templates added in PR #274 and any identified in the audit from #290.
2.  **Image Generation Script/Process:** Develop or adapt a script (e.g., based on `generate-cover-image.ts` or a new ad-hoc script in `functions/src/utils/`) that can generate a unique, high-quality preview image for each identified template.
    *   The prompt for each preview image should be derived from the template's `titleSpreadText`, `storyGoal`, `styleBible`, or `bookTitle` to best represent its content and visual style.
    *   Ensure the generated images are visually distinct from one another and clearly represent the story's theme.
3.  **Image Upload:** Upload the generated images to Firebase Storage/GCS. Use a consistent naming convention (e.g., `templates/{templateId}/preview.webp`).
4.  **Firestore Update Script:** Create a script (e.g., in `functions/src/utils/`) to update the corresponding `fixed_templates` Firestore documents with the new `previewImageUrl` field, pointing to the uploaded image URLs.
5.  **Manual Verification:** Manually verify in the Admin UI and the client application (`/create/input`) that the new preview images are displayed correctly for their respective templates. Ensure there are no regressions for templates that already had appropriate images.
6.  **Documentation:** Create a new document `docs/TEMPLATE_PREVIEW_IMAGE_UPDATE_PROCESS.md` detailing the steps taken for generation, upload, and Firestore update, including any scripts used and commands executed.

## Tests Executed

-   Manual verification of preview image display in the client application (`/create/input`) after Firestore updates.
-   Manual verification in Firebase Console (Firestore and Storage) that images are uploaded and references are correct.

## Known Issues

-   None anticipated at this stage, assuming existing image generation services are stable.

## Suggested Next Task

# [AI Loop] Refine `fixed_template` Image Prompts for Consistency and Diversity

## Context

Following the generation and update of unique preview images for fixed templates, the next step in enhancing Phase 3 (Template Mode) quality is to refine the `imagePromptTemplate` and `pageVisualRole` for all existing fixed templates
