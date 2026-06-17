# Implement User-Facing UI for Account and Child Profile Deletion

## Context

The backend logic for securely deleting user accounts and individual child profiles has been implemented (refer to `PR #454` for `deleteUserAccount` and `deleteChildProfile`, and `PR #469` for related cleanup). This includes the removal of associated data like books, avatars, and companion characters. To provide users with complete control over their data and ensure compliance with privacy regulations (e.g., GDPR), a user-facing interface is required to trigger these deletion processes. This task focuses on building the necessary frontend UI components and integration with the existing backend callable functions.

## Objective

Develop and integrate user interface elements that allow users to:
1.  Initiate the deletion of their own user account.
2.  Initiate the deletion of a specific child profile associated with their account.

Both actions must include clear warnings and confirmation steps.

## Allowed Scope

-   `src/app/`: Routing, page components for settings/profile.
-   `src/components/`: New or modified UI components (buttons, modals, forms).
-   `src/hooks/`: Custom hooks for managing deletion state and calls.
-   `src/lib/`: Client-side utility functions (e.g., form validation, confirmation logic).
-   `src/firebase/`: Client-side calls to existing Cloud Functions (`deleteUserAccount`, `deleteChildProfile`).
-   `functions/src/callable/`: Minor modifications if a dedicated client-facing callable wrapper is deemed necessary for enhanced security or specific UI-triggered logging (unlikely, but allowed if justified).
-   `src/types/`: Type definitions relevant to UI state or deletion operations.

## Forbidden Scope

-   Modifying the core backend deletion logic within `functions/src/index.ts` (only calling existing functions is allowed).
-   Altering Firestore security rules beyond what is strictly necessary to enable the UI to call the existing deletion functions (if any such changes are identified as missing from the backend task).
-   Infrastructure setup or configuration (e.g., CI/CD, deployment pipelines).
-   Billing or Stripe integration.
-   Authentication system redesign (beyond logging out the user post-deletion).
-   Manipulation of secrets.
-   Generation of new assets.

## Requirements

1.  **Account Deletion UI:**
    *   Add a prominent "Delete Account" button within the user's account settings or profile page.
    *   Clicking the button must trigger a multi-step confirmation dialog.
    *   The confirmation dialog must clearly warn the user about the irreversible nature of the action and the permanent loss of all associated data (books, children, avatars, companions, subscription history, etc.).
    *   The confirmation must require explicit user input, such as typing a specific phrase (e.g., "DELETE MY ACCOUNT") into a text field to proceed.
    *   Upon successful deletion, the user must be automatically logged out of the application.
    *   Handle loading states, success messages, and error feedback gracefully.
2.  **Child Profile Deletion UI:**
    *   Add a "Delete Profile" button within each child's profile management section.
    *   This button must trigger a confirmation dialog similar to account deletion, warning about the permanent loss of that child's data (books, avatar, companions, etc.) and requiring explicit user input.
    *   Upon successful deletion, the child's profile must be immediately removed
