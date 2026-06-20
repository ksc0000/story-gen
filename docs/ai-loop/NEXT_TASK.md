# Define Read-Aloud Pacing Quality Rubric and Prompt Engineering Plan

## Context

The product roadmap explicitly lists "読み聞かせ向け pacing 改善" under Phase 2: Story & Illustration Quality, and "読み聞かせ用途として、story opening と page progression が不自然でないこと" under Product SLO. While improvements have been made to opening and ending quality (PR #548), the overall pacing and natural progression of the narrative across pages for a read-aloud experience remains an area for refinement. This task focuses on establishing a clear understanding of "good pacing" in this context and devising a strategy for prompt engineering to achieve it.

## Objective

To improve the read-aloud pacing of generated storybooks by formally defining quality metrics for page progression and outlining a prompt engineering plan to address common pacing issues.

## Allowed Scope

- `docs/`: For creating the detailed rubric and prompt engineering plan document.

## Forbidden Scope

- `functions/`: No changes to backend logic or existing prompts in this task.
- `web/`: No changes to frontend UI in this task.
- Infrastructure
- Billing
- Authentication redesign
- Secrets
- Generated assets

## Requirements

- Create a new Markdown document `docs/READ_ALOUD_PACING_RUBRIC.md`.
- This document must define a rubric for "Read-Aloud Pacing Quality," focusing on:
    - Natural flow and progression between pages.
    - Appropriate distribution of story beats (e.g., action, emotion, revelation) within each page.
    - Suitability of sentence
