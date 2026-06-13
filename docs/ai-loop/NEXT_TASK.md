# Implement Bookshelf UI for Created Books

## Context

The product roadmap for EhonAI (now Ehoria) emphasizes moving towards monetization (Phase 5) and enhancing user experience (Phase 6). Many foundational features, including core generation capabilities, template expansion, AI brief flows, companion character integration, and critical SLO monitoring/alerting, have recently been completed. Stripe Checkout for subscriptions is also implemented.

With monetization enabled, users will soon be creating and purchasing multiple books. The current state lacks a centralized user interface for them to view and manage their collection of created books. The roadmap explicitly lists "本棚UI（作成済み絵本一覧）" under "Phase 6: User Experience - 売り物化前 必須" as a critical component before a full launch.

This task focuses on building this essential "Bookshelf UI" to provide users with a clear overview and access point for all their generated stories.

## Objective

Implement a basic "Bookshelf UI" page that displays a list of all books created by the current user, showing essential details for each book and allowing navigation to the book's reader view.

## Allowed Scope

- `functions/`: (Read-only for data fetching, no write operations)
- `src/`:
    - `components/`: New components for the Bookshelf UI (e.g., `BookshelfPage.tsx`, `BookCard.tsx`).
    - `pages/`: New page for the Bookshelf (`/bookshelf`).
    - `hooks/`: New or updated hooks for fetching user books.
    - `types/`: New types for UI state or book display.
    - `firebase/`: (Read-only for querying Firestore `books` collection).
    - `lib/`: (Minor utility functions if needed for UI formatting).
- `public/`: (For static assets like placeholder images for books if no cover is available yet).
- `package.json`, `pnpm-lock.yaml`: (For new UI library dependencies if strictly necessary, but prefer existing ones).
- `tsconfig.json`: (Minor updates for new file paths if needed).

## Forbidden Scope

- Infrastructure configuration (Firebase rules, Cloud Functions deployment changes beyond adding a new HTTP endpoint if absolutely required, but client-side fetching is preferred).
- Billing or payment logic.
- Authentication redesign.
- Secrets management.
- Generated assets.
- Modifying core generation logic (`generate-book.ts`).
- Implementing editing or deletion functionality for books.
- Implementing "Sample picture book gallery" (separate task).
- Implementing pagination or complex filtering.

## Requirements

- Create a new UI page (e.g., `/bookshelf`) accessible to authenticated users.
- Fetch and display a list of books associated with the currently logged-in user.
- For each book, display:
    - The book title.
    - The `coverImageUrl` (if available, otherwise a placeholder).
    - The `createdAt` timestamp (formatted for user readability).
    - A mechanism to navigate to the book's reader page (e.g., `/read/[bookId]`).
- Handle the case where a user has no created books, displaying an appropriate message and a call to action to create a new book.
- Ensure the UI is responsive and accessible on both desktop and mobile.
- Use existing UI components and design system elements where possible.
- Include unit/integration tests for any new hooks or complex components.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker prompt

```text
As an AI Loop Worker, your task is to implement the "Bookshelf UI" feature.

1.  **Create a new page component** at `src/pages/bookshelf/index.tsx`. This page will serve as the main Bookshelf UI.
2.  **Develop a data fetching mechanism** (e.g., a custom React hook `useUserBooks`) that queries the Firestore `books` collection for documents where `userId` matches the current authenticated user's ID. Fetch fields like `title`, `coverImageUrl`, `createdAt`, and `id`.
3.  **Design the Bookshelf UI:**
    *   Display books in a grid or list format.
    *   For each book, create a `BookCard` component (e.g., `src/components/bookshelf/BookCard.tsx`) that renders the `coverImageUrl`, `title`, and `createdAt` timestamp.
    *   Ensure clicking a `BookCard` navigates to the book's reader page (e.g., `/read/[bookId]`).
    *   If `coverImageUrl` is not available, use a generic placeholder image or a simple colored square with the title.
    *   Display a clear message and a "Create your first book" button if the user has no books.
4.  **Integrate the Bookshelf page** into the application's navigation (e.g., add a link in the header or user menu).
5.  **Write unit/integration tests** for the `useUserBooks` hook and `BookCard` component to ensure correct data display and navigation behavior.

**Acceptance Criteria:**
- A new page `/bookshelf` exists
