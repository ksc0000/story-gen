# Implement User-Editable Book Title

## Context

The product roadmap for Phase 6 (User Experience) includes "タイトル編集" (Title Editing) as a recommended feature before monetization. Currently, book titles are generated once and are not editable by the user. With the Bookshelf UI and Reader UI now implemented, and Cohort B soft-launch in progress, providing users with basic editing capabilities for their creations becomes increasingly important for a polished user experience. This task focuses on allowing users to modify the title of their generated storybooks.

## Objective

Implement a user interface and backend logic to allow users to edit the title of a generated storybook. The updated title should be saved to Firestore.

## Allowed Scope

- `functions/src/` (for Callable Cloud Function for title update)
- `lib/src/` (for shared types or Firestore interaction logic)
- `web/src/components/` (for UI components in Reader or Bookshelf)
- `web/src/app/` (for page-level UI logic)
- `web/src/hooks/` (for data fetching/mutation hooks)
- `web/src/stores/` (if necessary for global state related to editing)
- `web/src/firebase/` (for client-side Firestore interactions)

## Forbidden Scope

- Infrastructure (e.g., Firebase project settings, CI/CD configuration outside `firebase.json` callable function entry)
- Billing / Payment gateway integrations
- Authentication redesign
- Secrets management redesign
- Generated assets (e.g., images, LLM prompts that are not directly part of the title update)
- Core story generation logic
- `image-generation-orchestrator`

## Requirements

- Add an editable UI element (e.g., an inline editable text field or a modal) to either the Bookshelf UI (on book detail view) or the Reader UI that displays the book title.
- When the user edits and saves the title, update the `title` field of the corresponding `BookDoc` in Firestore.
- Ensure proper validation for the new title (e.g., non-empty, reasonable length).
- Update the `updatedAt` timestamp in the `BookDoc` upon a successful title edit.
- The solution should be robust and handle potential concurrent updates gracefully (e.g., by using a Callable Cloud Function for server-side validation and update).

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker prompt

Please implement the user-editable book title feature.

1.  **Backend (Callable Cloud Function):**
    *   Create a new Callable Cloud Function, e.g., `updateBookTitle`, that takes `bookId: string` and `newTitle: string` as arguments.
    *   This function should validate:
        *   The `bookId` exists.
        *   The authenticated user is the `ownerId` of the book.
        *   `newTitle` is not empty and meets a reasonable length constraint (e.g., 1 to 100 characters).
    *   If validation passes, update the `title` field and `updatedAt` timestamp of the `BookDoc` in Firestore.
    *   Return a success or error response.

2.  **Frontend (UI Integration):**
    *   Integrate an editable title component into the **Reader UI** (e.g., on the cover page or title spread).
    *   This component should display the current `BookDoc.title`.
    *   When the user clicks/focuses, allow them to edit the text.
    *   Add a "Save" button or trigger save on blur/Enter key press.
    *   Call the `updateBookTitle` Cloud Function with the new title.
    *   Provide visual feedback (loading state, success message, error message) to the user.
    *   Ensure the `updatedAt` field is reflected in the UI where applicable (e.g., on the Bookshelf).

3.  **Error Handling and Edge Cases:**
    *   Handle cases where the user is not authorized to edit the book.
    *   Handle cases where the new title is invalid.
    *   Consider optimistic UI updates if feasible, but ensure eventual consistency.

## Acceptance Criteria

- A user can navigate to the Reader UI of a book they own.
- The user can
