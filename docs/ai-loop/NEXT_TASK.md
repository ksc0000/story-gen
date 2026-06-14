# Implement LLM Auto Review for Character Consistency

## Context

Phase 2 focuses on Story & Illustration Quality. The foundation for LLM auto-review has been laid with the prototype (PR #318), result persistence (PR #357), and display in the Admin UI (PR #368). Granular human quality review scores, including `characterConsistencyScore`, are also persisted (PR #365) and displayed (PR #372). The roadmap explicitly lists "character consistency diagnostics" as a remaining task under Phase 2. This task will leverage the existing LLM auto-review framework to generate specific diagnostics for character consistency.

## Objective

Implement a new LLM auto-review type focused on character consistency, generate consistency scores or feedback for each page, persist
