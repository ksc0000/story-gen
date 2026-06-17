# Implement Admin Dashboard Panel for Aggregated Quality Metrics and Human vs. LLM Review Comparison

## Context

Phase 2 of the roadmap, "Story & Illustration Quality," aims to make generated books "a convincing picture book as a commodity." Key completion criteria for this phase include achieving target average `Story Quality Scores` for `standard_paid` (>= 80) and `premium_paid` (>= 88) books. Additionally, the roadmap explicitly calls for `human review と LLM review の比較分析` (comparison analysis of human vs. LLM reviews).

Currently, the necessary data points exist:
- Granular human quality review scores are persisted (`PR #365`).
- LLM auto review results are persisted (`PR #357`)
