# Design Document: Abuse Detection in Content Filter

## 1. Introduction
This document outlines the design for implementing abuse detection capabilities within EhonAI's content filter system. Currently, a basic NG-word filter exists, but it lacks sophisticated detection of abusive intent, prompt injection, and automated handling of violations.

## 2. Objectives
- **Safety**: Protect children and users from inappropriate or harmful content.
- **Compliance**: Adhere to platform policies (Google Cloud, OpenAI, Replicate).
- **Automation**: Reduce manual moderation burden by automatically flagging or blocking abusive behavior.
- **Fairness**: Provide a clear path for resolving false positives via admin review.

## 3. Multi-Layered Defense Strategy

Abuse detection will be applied at three primary stages of the content generation pipeline:

### 3.1. Layer 1: Input Moderation (Pre-Generation)
- **Keyword Matching (Existing)**: Continue using and expanding the `NG_WORDS` list in `content-filter.ts`.
- **LLM-based Intent Detection**: Before calling the story generation model, use a lightweight LLM (e.g., Gemini Flash) to analyze the user's input for malicious intent, prompt injection attempts, or sophisticated bypasses of keywords.
- **Rate Limiting**: Apply per-user rate limits to prevent automated abuse or spamming.

### 3.2. Layer 2: Output Moderation (Post-Story Generation)
- **Story Quality Check (Heuristics)**: Use existing `validateGeneratedStoryQuality` to detect "weird" outputs.
- **LLM Auto-Review**: Leverage the existing `runLLMAutoReview` to specifically score "Safety & Age Appropriateness".
- **Violated Output Handling**: If the generated story fails safety checks, it should be flagged and potentially hidden from the user until reviewed.

### 3.3. Layer 3: Image Moderation (Post-Image Generation)
- **Provider-level Moderation**: Rely on OpenAI's `moderation: "low"` and Replicate's internal safety filters.
- **Visual Artifact Detection**: Use Gemini Vision (via `runLLMAutoReview`) to detect visual artifacts that might be scary or inappropriate.

## 4. User Violation Tracking & Abuse Status

We will introduce a `UserAbuseStatus` to track user behavior over time.

### 4.1. Violation Categories
- `PROMPT_INJECTION`: Attempting to override system instructions.
- `HARMFUL_CONTENT`: Requesting violence, hate speech, or adult themes.
- `SPAM`: Rapidly generating low-quality or repetitive content.
- `POLICY_BYPASS`: Repeatedly trying to find words that bypass the NG filter.

### 4.2. Abuse Status Levels
- `CLEAN`: No violations.
- `WARNED`: User has been notified of a minor policy violation.
- `RESTRICTED`: User's generation capability is limited (e.g., reduced rate limits).
- `BLOCKED`: User is banned from generating content.

## 5. Components & Data Models

### 5.1. Firestore Schema Updates

#### `users/{userId}`
```typescript
{
  abuseStatus: UserAbuseStatus; // "clean" | "warned" | "restricted" | "blocked"
  violationCount: number;
  lastViolationAt?: Timestamp;
}
```

#### `books/{bookId}`
```typescript
{
  moderationResult: {
    status: "safe" | "flagged" | "blocked";
    reason?: string;
    categories: ViolationCategory[];
    scoredBy: "heuristics" | "llm" | "human";
  };
}
```

### 5.2. Content Moderation Logic
A new service or set of functions will handle the orchestration of these checks.

## 6. Admin Workflow
- **Moderation Queue**: A dedicated UI in the Admin Dashboard to review "flagged" or "blocked" books.
- **Audit Logs**: Record all moderation actions (automated and manual).
- **Override Capability**: Admins can manually mark a book as "safe" or "blocked", which updates the user's abuse status.

## 7. Implementation Plan

### Phase 1: Foundation (Type Definitions & Logging)
- Define types for moderation results and abuse status.
- Add `moderationResult` field to `BookDoc`.

### Phase 2: Input Intent Detection
- Implement an LLM call to analyze input for intent before generation.
- Integrate this check into `processBookGeneration`.

### Phase 3: Violation Tracking
- Implement logic to update `violationCount` and `abuseStatus` in the `UserDoc`.
- Enforce blocks/restrictions based on status.

### Phase 4: Admin UI & Review
- Build the moderation queue UI.
- Implement manual override and review actions.

## 8. Success Metrics
- Reduction in reported inappropriate content.
- High precision in automated flagging (low false-positive rate).
- Rapid response time for admin reviews.
