# Worker Prompt Template

## Context

The design document for asynchronous avatar image processing (`docs/AVATAR_ASYNC_DESIGN.md`, derived from Issue #108 and PR #200) has been approved and merged. This design outlines how user-uploaded avatar images will be processed asynchronously to generate `approvedImageUrl` and `referenceImageUrl` for use in story generation. This task focuses on implementing the server-side logic for this approved design. This directly supports improving character consistency (Phase 2) and user experience (Phase 6) by ensuring avatar images are correctly prepared for AI generation.

## Objective

Implement the server-side logic for asynchronous processing of user-uploaded avatar images, ensuring that the `approvedImageUrl` and `referenceImageUrl` fields are populated correctly and reliably on `characterProfiles` documents after an avatar image upload.

## Allowed Scope

- `functions/src/`
- `types/`
- `test/`

## Forbidden Scope

- Infrastructure configuration (e.g., `firebase.json` for non-function deployments, CI/CD)
- Billing logic or configuration
- Authentication system redesign
- Secret management changes
- Generated assets (e.g., UI build outputs)

## Requirements

- Implement the core asynchronous processing flow as outlined in `docs/AVATAR_ASYNC_DESIGN.md`.
- Ensure the process is triggered appropriately upon a new avatar image upload or update to a `characterProfile` document.
- Populate `approvedImageUrl` and `referenceImageUrl` fields on the corresponding `characterProfiles/{characterId}` document in Firestore.
- Add comprehensive unit tests for new functions and integration tests covering the end-to-end async processing flow.
- Include detailed logging for monitoring the status and potential failures of the asynchronous process.
- Keep changes minimal and focused to ensure a reviewable PR.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Acceptance Criteria

- When a user uploads a new avatar image, the asynchronous process is successfully triggered.
- `approvedImageUrl` and `referenceImageUrl` fields are correctly set on the `characterProfiles` document after processing.
- The system handles potential failures gracefully, logging errors without blocking the main user flow.
- All new code is covered by unit tests.
- An integration test demonstrates the end-to-end flow from image upload trigger to Firestore field update.

## Required Test Commands

```bash
# Run all unit tests
npm test

# Run specific integration tests (if created)
npm test -- test/path/to/avatar.integration.test.ts
```

## Suggested Next Task

Implement the `ImageProvider` abstraction for `generateCoverImage()` and `ensureRecurringCharacterReferences()` to complete the image provider migration for all image generation types.
