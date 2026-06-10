# Implement Avatar Async Frontend UI and Logic

## Context

The backend for asynchronous avatar generation, including the `childAvatarGenerationJobs` trigger and associated Cloud Functions, has been successfully implemented and merged (`Issue #108 Phase 1`). The current state indicates that the frontend implementation for this feature is pending. This task focuses on connecting the frontend UI to this backend process, allowing users to initiate avatar generation, monitor its status, and display the resulting avatar. This is crucial for completing the user experience around personalized character avatars, a core feature for enhancing user engagement within Phase 5 (Monetization).

## Objective

Implement the frontend UI and logic required to integrate asynchronous avatar generation into the child profile creation and editing flow. This includes triggering avatar generation jobs, displaying their status, and showing the generated avatar image.

## Allowed Scope

- `web/src/components/`: UI components related to child profiles and avatar display.
- `web/src/hooks/`: Custom hooks for managing avatar generation state.
- `web/src/services/`: Services interacting with Firebase/Firestore for avatar generation jobs.
- `web/src/pages/`: Pages where child profile creation/editing occurs.
- `web/src/types/`: Type definitions for avatar generation job data.
- `functions/src/`: Minor adjustments to existing Cloud Functions or API endpoints if strictly necessary for frontend consumption (e.g., adding a status field to an existing response).

## Forbidden Scope

- Infrastructure configuration (Firebase rules, Cloud Functions deployment outside of code changes).
- Billing logic.
- Authentication redesign.
- Secrets management (beyond existing patterns).
- Generation of static assets.
- Core UI layout changes not directly related to avatar generation.

## Requirements

- **Trigger Generation:** When a user creates or updates a child profile with an uploaded photo, a new avatar generation job should be initiated.
- **Status Display:** The UI must display the current status of the avatar generation job (e.g., "Generating...", "Generated", "Failed").
- **Avatar Image Display:** Once an avatar is successfully generated, it should be displayed on the child's profile and potentially in other relevant UI areas.
- **Error Handling:** Gracefully handle cases where avatar generation fails or times out, providing user-friendly feedback.
- **`useAvatarGenerationJob` Hook:** Utilize or create a custom React hook (e.g., `useAvatarGenerationJob`) to manage the state and lifecycle of an avatar generation job.
- **Integration with Existing Flows:** Ensure seamless integration with the existing child profile creation and editing flows (`PR #219`).
- **Tests:** Add unit or integration tests for new hooks and complex UI logic where appropriate.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Suggested next task

Finalize the operational monitoring for Phase 5.
