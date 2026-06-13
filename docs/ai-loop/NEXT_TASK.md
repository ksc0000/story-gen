# Implement Persistence for Granular Human Quality Review Scores

## Context

The EhonAI product roadmap outlines the need for detailed quality metrics in Phase 2: Story & Illustration Quality. While an overall "manual quality score" is currently saved, the roadmap explicitly lists "Story Quality Score rubric 導入", "Illustration Quality Score rubric 導入", "Character Consistency / Personalization / Safety score 導入", and "axis-level quality metrics 保存" as remaining tasks under Phase 2.

Implementing the persistence of these granular, axis-level scores is crucial for enabling robust quality analysis, tracking regressions, and facilitating the comparison between human and LLM-generated reviews (as planned by open task #352: "Design LLM Auto Review vs. Human Review Comparison Methodology"). This task focuses on preparing the data layer for human reviews.

## Objective

Enhance the manual quality review process in
