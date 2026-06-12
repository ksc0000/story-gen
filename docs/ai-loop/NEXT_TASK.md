# Document and Verify Firestore Indexes and Permissions for Production Reliability

## Context

The product roadmap explicitly lists "Firestore index / permission 確認（collection group query の composite index、runs subcollection の read 権限）" under Phase 1: Reliability First. Phase 1 is currently in a "production smoke evidence pending" state, indicating that foundational reliability tasks are still being addressed. Correct Firestore index and security rule configuration is critical for the stability, performance, and security of the application, especially for features relying on collection group queries (like `cleanupStaleGeneration`) and administrative access to sensitive data (like `runs` subcollection).

## Objective

Document the required Firestore composite indexes and security rules, specifically focusing on those necessary for collection group queries and `runs` subcollection read permissions. Subsequently, verify their correct configuration in a development environment to ensure readiness for production.

## Allowed Scope

- `firestore.indexes.json` (for documenting required composite indexes)
- `firestore.rules` (for documenting required security rules)
- `docs/` directory (create `docs/FIRESTORE_CONFIG_VERIFICATION.md` to host the documentation and verification results)
- Firebase Console (for manual verification in dev/staging environment)
- `firebase` CLI (for checking local config and deploying if necessary in follow-up tasks)

## Forbidden Scope

- Modifications to existing application logic, UI components, or core features.
- Changes to other Firebase services (e.g., Cloud Functions code, Storage rules) unless directly related to Firestore configuration.
- Deployment to the production environment (this task focuses on documentation and dev/staging verification).

## Requirements

1.  **Create Documentation:**
    *   Create a new Markdown file: `docs/FIRESTORE_CONFIG_VERIFICATION.md`.
    *   In this document, clearly define and list:
        *   **Required Composite Indexes:** Identify all composite indexes necessary for efficient execution of collection group queries (e.g., for `cleanupStaleGeneration` that queries across `generationRuns` subcollections, or any admin UIs that use complex filters). Specify the collection group, the fields, and their order.
        *   **Required Security Rules:** Document the Firestore security rules that grant appropriate read permissions to the `runs` subcollection (e.g., for administrative access or SLO reporting mechanisms). Ensure these rules follow the principle of least privilege.
2.  **Verification Steps:**
    *   Outline a step-by-step process in `docs/FIRESTORE_CONFIG_VERIFICATION.md` for verifying the existence and correctness of these indexes and rules in a development or staging Firebase project. This may involve:
        *   Checking the "Indexes" section in the Firebase Console.
        *   Testing rules using the Firebase Rules Playground or the `firebase emulators:start` command.
        *   Executing example queries (e.g., using `gcloud firestore databases query`) that would rely on these indexes.
3.  **Perform Verification:**
    *   Execute the defined verification steps in a designated development environment (e.g., your local Firebase project, or a shared dev/staging project).
    *   Record the findings in `docs/FIRESTORE_CONFIG_VERIFICATION.md`, noting whether each index/rule is correctly configured, missing, or requires adjustment.
    *   If discrepancies are found, clearly describe them.

## Output Format

-   **Summary:** Briefly describe the documented indexes and rules, and the outcome of the verification in the dev environment.
-   **Changed Files:**
    -   `docs/FIRESTORE_CONFIG_VERIFICATION.md`
    -   (Potentially `firestore.indexes.json` or `firestore.rules` if minor documentation-level comments are added, but not for functional changes in this task)
-   **Tests Executed:** Describe the manual verification steps performed.
    -   Example: "Manually checked Firebase Console for index `[INDEX_NAME]` on collection group `[COLLECTION_GROUP_NAME]` with fields `[FIELD1, FIELD2]`. Verified
