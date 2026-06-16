# Implement Audio Read-Aloud Feature for Story Pages

## Context

Phase 6 of the product roadmap focuses on enhancing the user experience, with "音声読み聞かせ" (read-aloud mode) explicitly listed as a "売り物化前 推奨" (recommended before commercialization) feature that is currently unimplemented. Core reading UI elements such as swipe/slide navigation and animated page transitions are already in place. This task aims to integrate audio playback for story text within the reader UI, significantly improving accessibility and engagement for young users.

## Objective

Enable users to listen to the story text of each page directly from the book reader UI, providing a foundational read-aloud experience.

## Allowed Scope

- `functions/`: Implement server-side logic for text-to-speech (TTS) conversion and potentially audio storage/streaming.
- `web/`: Implement client-side UI for audio playback controls (play/pause), integrate audio into the existing reader component, and manage audio state.
- `shared/`: Update types or interfaces as needed for audio URLs or status.
- `docs/`: Create a brief design note on the chosen TTS service and implementation approach.

## Forbidden Scope

- Changes to billing or subscription logic.
- Redesign of the authentication system.
- Modification of secret management infrastructure.
- Automated generation of images or stories, beyond what is strictly necessary for testing the read-aloud feature.
- Major refactoring of existing core story generation LLM calls.

## Requirements

- **Text-to-Speech (TTS) Integration:**
    - Choose and integrate a suitable TTS service (e.g., Google Cloud Text-to-Speech or an existing robust library). Prioritize ease of integration for an MVP.
    - Implement a backend function (e.g., a new Callable Cloud Function or an extension to `generateBook` / `generatePage`) to convert `page.text` into an audio file.
    - Store the generated audio file (e.g., in Cloud Storage) and save its URL to the corresponding `page` document in Firestore.
- **Reader UI Controls:**
    - Add clear play/pause controls to each page in the book reader UI.
    - The audio should play the `page.text` when activated.
    - Visually indicate when audio is playing or loading.
- **Performance and Reliability:**
    - Implement caching for generated audio files to avoid regenerating the same audio multiple times.
    - Handle cases where audio generation fails gracefully (e.g., displaying a message or disabling the play button).
- **Testing:**
    - Include unit tests
