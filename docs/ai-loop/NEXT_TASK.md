# Define Rubric for Detecting and Scoring Unintended Character Appearances

## Context

The product roadmap for Phase 2, "Story & Illustration Quality," lists "余計な人物が増えない制御（cast 外のキャラが登場しない）" (Control against extra characters appearing (characters outside cast do not appear)) as a goal under "キャラクター一貫性" (Character Consistency). While recent efforts (e.g., PR #445) have addressed companion hallucination, a comprehensive, general rubric is needed to systematically detect and score any unintended character appearances across all generated illustrations. This will establish a baseline for manual review and guide future prompt engineering and automated quality checks.

## Objective

Create a markdown document (`docs/QUALITY_RUBRICS/UNINTENDED_CHARACTER_RUBRIC.md`) that
