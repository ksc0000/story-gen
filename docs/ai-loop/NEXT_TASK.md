# Implement Admin UI for Character Consistency Diagnostics

## Context

Phase 2 of the roadmap focuses on Story & Illustration Quality, with a specific aim to improve character consistency. LLM auto-review for character consistency has been implemented (PR #380), and granular human quality review scores are persisted (PR #365) and displayed (PR #372). To effectively manage and debug character consistency issues, administrators need clear diagnostic information within the Quality Review UI. This task focuses on surfacing the existing character consistency insights in an actionable way.

## Objective

Enhance the Admin Quality Review UI to present a clear diagnostic view of character consistency issues, drawing from LLM auto-review results, `qualityReviews` documents, and generation logs. This will enable administrators to quickly identify and understand the root
