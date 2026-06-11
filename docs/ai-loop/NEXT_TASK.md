# Display Template Preview Images in Theme Selection UI

## Context

The product roadmap for Phase 3: Template Mode includes enhancing the `fixed_template` mode. A key completion criterion for this phase is "テーマ選択画面にプレビュー画像が表示される" (Template preview images are displayed on the theme selection screen). While the UI structure for template selection has been significantly improved through recent PRs (#224, #234), the actual preview images are not yet displayed. This task aims to implement the display functionality for these images, improving the user experience by providing a visual representation of each template before selection.

## Objective

Implement the display of template preview images in the theme selection UI, allowing users to visually differentiate between available templates.

## Allowed Scope

-   `web/`: For modifying the React components responsible for the theme selection UI.
-   `functions/src/types/`: If the `FixedStoryTemplate` type definition needs to be extended to include a `previewImageUrl` field.
-   `shared/types/`: If the `FixedStoryTemplate` type definition is located here.

## Forbidden Scope

-   Infrastructure changes (Firebase project setup, CI/CD, etc.)
-   Billing logic or Stripe integration.
-   Authentication system redesign.
-   Management of API keys or other sensitive secrets.
-   Modification or generation of actual image assets; assume image URLs will be provided or can be mocked initially.

## Requirements

-   **Type Definition Update:** Add a `previewImageUrl: string` field to the `FixedStoryTemplate` type definition. This field will store the URL of the preview image for each template.
-   **UI Integration:** Modify the relevant React component(s) in `web/` (e.g., `web/components/CreationFlow/ThemeSelection.tsx` or `web/components/TemplateCard.tsx`) to fetch and display the `previewImageUrl` for each `FixedStoryTemplate`.
-   **Placeholder/Fallback:** Implement a robust fallback mechanism (e.g., a generic placeholder image or a loading spinner) in case a `previewImageUrl` is missing or fails to load.
-   **Responsive Design:** Ensure the preview images are displayed correctly and responsively across various screen sizes (mobile and desktop).
-   **Component Tests:** Add or update unit/integration tests for the affected UI components to ensure correct rendering of preview images and graceful handling of missing images.
-   **Docs-first:** If adding the `previewImageUrl` field requires changes to documentation or example data structures, include those updates.

## Output Format

```markdown
# Display Template Preview Images in Theme Selection UI

## Context

... (as above)

## Objective

... (as above)

## Allowed Scope

... (as above)

## Forbidden Scope

... (as above)

## Requirements

... (as above)

## Output Format

... (as above)

## Summary

Implemented the display of template preview images within the theme selection UI. The `FixedStoryTemplate` type was updated to include a `previewImageUrl` field. The UI component responsible for rendering template cards now fetches and displays this image, with a fallback for missing images.

## Changed files

- `functions/src/types/fixed-template-types.ts` (or `shared/types/fixed-template-types.ts`)
- `web/components/CreationFlow/ThemeSelection.tsx`
- `web/components/TemplateCard.tsx` (if a separate component)
- `web/components/CreationFlow/__tests__/ThemeSelection.test.tsx` (or other relevant test files)

## Tests executed

1.  `npm test` in `web/` passed.
2.  Verified in a local development environment:
    *   Theme selection screen now shows placeholder images for templates (or actual images if hardcoded for testing).
    *   Layout is correct on desktop and mobile.
    *   No console errors related to image loading.
    *   Missing `previewImageUrl` gracefully shows a fallback.

## Known issues

-   Actual template preview images need to be generated and stored, and their URLs populated in the `FixedStoryTemplate` data in Firestore. This task only covers the *display* of these images.

## Suggested next task

# Generate and Populate Template Preview Image URLs
```
