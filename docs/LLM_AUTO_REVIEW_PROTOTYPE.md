# LLM Auto Review Prototype

## Purpose
This prototype implements an automated quality review process for generated books using a Large Language Model (Gemini). It aims to provide immediate feedback on story structure, illustration quality, character consistency, personalization, and safety upon book completion.

## Trigger
- **Cloud Function**: `onBookCompletion_triggerLLMAutoReview`
- **Trigger Type**: Firestore `onDocumentUpdated`
- **Path**: `books/{bookId}`
- **Condition**: Fires when the `status` field of a `BookDoc` changes to `completed`.

## Inputs to LLM
The LLM (Gemini 1.5 Flash) is provided with the following context:
- **Book Metadata**: Title, theme, story goal, main quest object, forbidden quest objects.
- **Story Content**: A list of all pages, including the text and image prompts for each.

## Evaluation Criteria
1. **Story Quality**: Structure, pacing, coherence, and emotional engagement.
2. **Illustration Quality**: Descriptive quality of the image prompts.
3. **Character Consistency**: Potential for visual consistency across pages based on descriptions.
4. **Personalization Depth**: Incorporation of child-specific elements.
5. **Safety & Age Appropriateness**: Detection of inappropriate content or themes.

## Output Schema
The LLM outputs a JSON object matching the `LLMQualityReviewResult` schema:
- `storyQualityScore`: 0-100
- `illustrationQualityScore`: 0-100
- `characterConsistencyScore`: 0-100
- `personalizationScore`: 0-100
- `safetyScore`: 0-100
- `overallQualityScore`: 0-100
- `confidence`: 0.0-1.0
- `reviewReason`: Summary in Japanese
- `flaggedIssues`: Array of objects (severity, area, message, pageNumber)
- `recommendedFixes`: Array of objects (action, reason, pageNumber)

## Storage
The review result is stored in:
- **Subcollection**: `books/{bookId}/qualityReviews/{reviewId}`
- **Document ID**: `llm_auto_review_{timestamp}`
- **Document Type**: `QualityReviewDoc`

Additionally, the `BookDoc` is updated with summary scores and status for easy access in the UI.

## Idempotency
The function checks for an existing document with `reviewType: 'llm_auto_review'` in the `qualityReviews` subcollection and skips execution if one is already present.
