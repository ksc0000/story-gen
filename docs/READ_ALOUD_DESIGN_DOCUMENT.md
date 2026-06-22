# Read-Aloud Feature Design Document

## 1. Overview
The "Read-Aloud" (音声読み聞かせ) feature provides an automated voice narration of the generated picture books. This enhances the user experience by allowing children to enjoy the stories independently or alongside their parents, improving engagement and accessibility.

## 2. Goals
- **High-Quality Audio**: Provide natural, expressive Japanese narration suitable for children's stories.
- **Low Latency**: Ensure audio is generated or retrieved quickly during the reading experience.
- **Visual Sync**: Synchronize text highlighting or page turns with the audio playback.
- **Scalability**: Handle audio generation for multiple users without significant cost or performance bottlenecks.

## 3. Architecture
The feature follows a cloud-based Text-to-Speech (TTS) architecture with persistent caching.

### 3.1. Voice Provider
- **Primary Option**: Google Cloud Text-to-Speech (Wavenet or Neural2 voices for high-quality Japanese).
- **Secondary Option**: OpenAI TTS (expressive but higher cost) or ElevenLabs (for highly emotional narration).

### 3.2. Generation Flow
1. **Trigger**: When a book is completed or when a user enters "Read-Aloud Mode" for the first time.
2. **Cloud Function**: An HTTPS `onCall` or background function processes the request.
3. **TTS API Call**: The function sends page text to the TTS provider.
4. **Storage**: The generated audio file (e.g., MP3 or AAC) is saved to Firebase Storage.
5. **Metadata**: The Firestore `BookDoc` or a `PageDoc` subcollection is updated with the `audioUrl`.

### 3.3. Caching Strategy
- **Per-Page Audio**: Audio is generated per page to allow for granular playback and easier synchronization.
- **Persistence**: Once generated, audio files are stored indefinitely in Firebase Storage, keyed by the hash of the text to avoid redundant generation.

## 4. User Experience (UX)

### 4.1. Integration Points
- **Cinematic Viewer**: The primary interface for read-aloud. A "Play" button triggers the narration.
- **Standard Viewer**: An optional "Audio" icon on each page.

### 4.2. Playback & Sync
- **Highlighting**: Use word-level or sentence-level timestamps (provided by some TTS engines) to highlight text as it's read.
- **Auto-Advance**: Optional mode where pages turn automatically once the audio finishes.
- **Controls**: Play/Pause, Replay Page, and Volume controls.

## 5. Data Schema Changes

### 5.1. Firestore (BookData / PageData)
- `audioUrl`: URL of the full-book audio (optional).
- `pages[].audioUrl`: URL of the audio file for the specific page.
- `pages[].audioDurationMs`: Duration of the audio.
- `pages[].audioTimestamps`: JSON object containing sentence/word timestamps for highlighting.

### 5.2. Firebase Storage
- Path: `books/{bookId}/audio/page_{pageNumber}.mp3`

## 6. Implementation Phases

### Phase 1: MVP (Manual Trigger)
- Implement TTS generation via Cloud Functions.
- Add basic playback button in Cinematic Viewer.
- Basic storage and URL linking.

### Phase 2: Enhanced UX (Auto-Sync)
- Implement sentence-level highlighting using TTS metadata.
- Auto-advance pages during playback.
- Background music (BGM) integration.

### Phase 3: Premium Features
- Choice of narrator voices (Male, Female, Storyteller).
- Personalized narration (using the child's name with correct pitch/intonation).

## 7. Security & Compliance
- Ensure TTS API usage complies with data privacy requirements (no PII sent beyond text).
- App Check enforcement for audio generation endpoints.
