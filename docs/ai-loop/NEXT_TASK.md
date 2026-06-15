# Implement Aggregated Axis-Level Quality Score Persistence on BookDoc

## Context

The product roadmap for Phase 2, "Story & Illustration Quality," includes "axis-level quality metrics 保存" (saving axis-level quality metrics) as a remaining task under Quality Management. While granular human quality review scores (PR #365) and LLM auto review results (PR #357) are persisted, and the Admin UI displays them (PR #372, PR #368), these are stored in subcollections. To effectively enable "Quality Trend Dashboard / Regression Detection" (marked as done, but requires underlying aggregated data) and "human review と LLM review の比較分析," we need a mechanism to store summary or aggregated axis-level scores directly on the `Book
