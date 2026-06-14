# Admin LLM Auto Review UI

## Overview
The Admin Quality Review UI now includes a dedicated section for viewing LLM Auto Review results. This enhancement allows administrators to see the AI's assessment of a book's quality alongside human reviews, facilitating comparison and analysis of AI performance.

## Key Features
- **LLM Auto Review Display**: A read-only section that displays the latest LLM-generated quality assessment.
- **Visual Distinction**: The LLM review section is styled with a light slate background to clearly distinguish it from the manual human review form.
- **Detailed Metrics**: Displays individual scores for Story, Illustration, Character Consistency, Personalization, and Safety, as well as an Overall score.
- **Flagged Issues**: Lists issues identified by the LLM, including their severity (low, medium, high, blocker).

## Accessing the LLM Auto Review
1. Navigate to the Admin Book Quality Review page (`/admin/book-quality-review`).
2. Select a book from the list on the left.
3. Scroll down to the "Quality Review (Phase 2)" section.
4. If an LLM auto review has been performed for the book, the "🤖 LLM Auto Review Result" panel will be visible above the manual review form.

## Components of the Display
- **Overall Score**: The calculated average of all quality scores.
- **Category Scores**: Individual ratings (1-5) for each quality dimension.
- **Review Reason**: A text summary from the LLM explaining its assessment.
- **Flagged Issues**: A list of specific problems detected by the LLM, categorized by severity.

## Purpose
This UI component supports the project's goal of "human review と LLM review の比較分析" (comparative analysis of human and LLM reviews) by making the AI's internal quality metrics visible and easily accessible to human reviewers.
