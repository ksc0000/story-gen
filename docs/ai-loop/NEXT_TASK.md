# Verify Firestore Indexes and Permissions for Production Reliability

## Context

The product roadmap for Phase 1: Reliability First indicates that `Firestore index / permission 確認` for `collection group query` and `runs subcollection` read permissions are remaining tasks. Ensuring correct Firestore indexes and rules are critical for the reliability and performance of administrative features and background jobs, especially those involving `collection group query` (e.g., `cleanupStaleGeneration` or SLO reporting).

## Objective

Verify that the necessary Firestore composite indexes are in place for efficient `collection group query` operations and that the `runs` subcollection has appropriate read permissions defined in Firestore Security Rules, specifically for administrative access. Document findings and propose any required additions or modifications.

## Allowed Scope

- `firestore.indexes.json` (read and propose changes if needed)
- `firestore.rules` (read and propose changes if needed)
- Firebase Console (for verifying existing indexes and rules)
- `docs/` (for documenting findings, verification steps, and proposed changes)
- `functions/src/` (read-only to identify collection group queries)
- `functions/package.json`, `functions/tsconfig.json` (read-only)

## Forbidden Scope

- Infrastructure setup beyond Firestore indexes/rules.
- Billing configurations.
- User authentication redesign.
- Management of secrets.
- Generation of front-end assets or UI changes.
- Modification of core story/image generation logic.

## Requirements

- Keep changes reviewable.
- Prefer docs-first updates: Document the current state, verification steps, and then propose changes.
- Include tests where appropriate: For Firestore rules, unit tests would be ideal, but for index verification, manual checks are often sufficient.
- Report follow-up items.

### Acceptance Criteria

- A new document in `docs/reliability/` detailing:
    - The identified `collection group query` operations within the codebase (if any, specifically related to `runs`).
    - The current Firestore composite indexes (`firestore.indexes.json` or Firebase Console export) related to `runs` or other `collection group query` targets.
    - An assessment of whether the existing indexes are sufficient for the identified queries.
    - The current Firestore Security Rules relevant to reading `runs` subcollections, especially for admin/backend services.
    - An assessment of whether these rules grant appropriate access.
    - A clear recommendation for any missing indexes or rule adjustments, including the exact `firestore.indexes.json` snippet or rule changes.
- If changes are needed, a pull request modifying `firestore.indexes.json` and/or `firestore.rules` based on the recommendations.

### Required Test Commands

1.  **Manual Verification (for current state):**
    -   Access the Firebase Console for the project.
    -   Navigate to "Firestore Database" -> "Indexes".
    -   Review existing composite indexes, looking for `collection group` scope, particularly for `runs` or other relevant collections.
    -   Navigate to "Firestore Database" -> "Rules".
    -   Review the security rules, focusing on `match /{
