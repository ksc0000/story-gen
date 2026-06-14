# Display LLM Auto Review Results in Admin Quality Review UI

## Context

The LLM Auto Review prototype (`PR #318`) and its result persistence (`PR #357`) have been implemented. The roadmap lists "LLM auto review prototype" and "human review と LLM review の比較分析" as ongoing quality management efforts. To facilitate the comparison and analysis of human and AI-generated quality assessments, the Admin UI needs to display the LLM's review alongside the human review.

## Objective

Enhance the Admin Quality Review UI to clearly display the persisted LLM auto review scores and any flagged issues for a given book, in a read-only format, next to or below the human review sections.

## Allowed Scope

- `web/src/` (specifically components related to `Admin/QualityReview` and data fetching hooks)
- `functions/src/` (if any backend data fetching logic needs adjustment, though unlikely for read-only display)
- `docs/` (to update documentation on the Admin UI changes)

## Forbidden Scope

- Infrastructure changes (Firebase rules, CI/CD, etc.)
- Billing or payment logic
- Authentication redesign
- Secrets management
- Generation of new assets (images, icons)
- Modifying the LLM auto review generation logic itself
- Modifying human review input fields or persistence logic

## Requirements

- **Fetch & Display LLM Scores:**
    - Retrieve the latest LLM auto review data for the currently viewed book. This data should include `storyQualityScore`, `illustrationQualityScore`, `characterConsistencyScore`, `personalizationScore`, `safetyScore`, and `flaggedIssues` as stored by `PR #357`.
    - Display these scores in the Admin Quality Review UI in a read-only manner.
    - Clearly label these scores as "LLM Auto Review" to distinguish them from human-provided scores.
- **Display LLM Flagged Issues:**
    - Render the `flaggedIssues` array from the LLM review, if available, in a readable format within the UI.
- **Visual Separation:**
    - Ensure a clear visual distinction between the human review panel and the new LLM auto review display.
- **No Functional Changes to Human Review:**
    - The existing human quality review input fields and functionality must remain unchanged.
- **Tests:**
    - Add or update relevant unit/integration tests for the UI components to ensure correct data rendering.
- **Documentation:**
    - Update `docs/QUALITY_METRICS.md` or a new `docs/ADMIN_LLM_REVIEW_UI.md` to describe the new UI elements and their purpose.

## Worker Prompt

```
Please implement the display of LLM auto review results in the Admin Quality Review UI.

1.  **Retrieve LLM Auto Review Data:** In the `AdminQualityReviewPanel` (or relevant component for displaying a single book's review details), fetch the latest LLM auto review data associated with the book. This data is expected to be stored in the `book.qualityReviews` subcollection, identifiable by a specific `reviewerId` (e.g., `llm_auto_reviewer`) or a dedicated field/structure.
2.  **Render LLM Scores:**
    *   Add a new section or panel clearly labeled "LLM Auto Review" to display the scores: `storyQualityScore`, `illustrationQualityScore`, `characterConsistencyScore`, `personalizationScore`, and `safetyScore`.
    *   Ensure these scores are displayed as read-only numeric values.
3.  **Render LLM Flagged Issues:**
    *   Below the scores, display the `flaggedIssues` array from the LLM review. Each issue should be listed clearly.
4.  **Styling & Readability:**
    *   Use appropriate styling (e.g., distinct background, border, or heading) to visually separate the LLM review section from the human review input fields and summaries.
    *   Ensure the displayed data is easy to read and interpret for administrators.
5.  **Testing:**
    *   Add or update React Testing Library tests for the relevant UI component to verify that LLM review data (scores and flagged issues) is correctly fetched and rendered. Use mock data representing a book with both human and LLM reviews.
6.  **Documentation:**
    *   Create a new markdown file `docs/ADMIN_LLM_REVIEW_UI.md` detailing the new LLM auto review display in the Admin UI, including screenshots if possible. Describe how to access this view and what information is presented.

**Required Test Commands:**
- `npm test web/src/components/Admin/QualityReview/AdminQualityReviewPanel.test.tsx` (or relevant test file)
- `npm run dev` (to manually verify UI in browser)
```

## Suggested next task

# Develop UI for LLM Auto Review History

## Context

The Admin Quality Review UI now displays the latest LLM auto review results. To further enable the "human review と LLM review の比較分析" goal and track potential regressions or improvements in LLM performance over time, it's crucial to view historical LLM review data.

## Objective

Implement a read-only UI component within the Admin Quality Review section that allows administrators to view a history of LLM auto review runs for a specific book, showing how scores and flagged issues might have changed across different LLM executions.

## Allowed Scope

- `web/src/` (specifically components related to `Admin/QualityReview` and data fetching hooks)
- `functions/src/` (if any backend data fetching logic needs adjustment for historical data, e.g., if history is stored in a subcollection that needs specific querying)
- `docs/` (to document the new UI and data structure)

## Forbidden Scope

- Infrastructure changes (Firebase rules, CI/CD, etc.)
- Billing or payment logic
