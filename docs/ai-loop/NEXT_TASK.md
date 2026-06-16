# Analyze Human vs. LLM Auto Review Score Discrepancies

## Context

The product roadmap for Phase 2: Story & Illustration Quality includes "human review と LLM review の比較分析" as a key quality management task. `PR #430` recently implemented a script for comparing human and LLM auto review scores. With both human review persistence (`PR #365`, `PR #372`) and LLM auto review persistence (`PR #357`, `PR #368`, `PR #380`, `PR #427`) now in place, the next logical step is to execute this analysis to understand the current state of our quality assessment systems. This analysis will inform future refinements of LLM prompts or human review rubrics.

## Objective

Run the existing comparison script between human and LLM auto review scores, analyze the results to identify patterns, agreements, and discrepancies, and document the findings in a comprehensive report. This will provide actionable insights for improving the accuracy and alignment of our quality evaluation processes.

## Allowed Scope

-   `functions/src/` (for potentially running or slightly modifying the analysis script)
-   `docs/` (for creating the analysis report and any related documentation)
-   `admin/` (if a very simple, immediate visualization is deemed necessary, but prefer a docs report first)

## Forbidden Scope

-   Infrastructure changes (e.g., CI/CD, deployment pipelines)
-   Billing or subscription logic changes
-   Authentication or user management redesign
-   Secrets management changes
-   Changes to generated assets or core LLM generation logic (beyond analysis)

## Requirements

-   Execute the comparison script (implemented in `PR #430`) using a sufficient dataset of books that have both human and LLM auto reviews.
-   Analyze the output to identify:
    -   Overall correlation (or lack thereof) between human and LLM scores across all quality axes (Story, Illustration, Character, Personalization, Safety).
    -   Specific categories or types of issues where LLM and human reviews consistently agree or disagree.
    -   Examples of books where the LLM review was significantly different from the human review, and hypothesize potential reasons.
    -   The distribution of discrepancies (e.g., is LLM always harsher/lenient?).
-   Generate a new Markdown document under `docs/quality-analysis/` (e.g., `docs/quality-analysis/human-llm-comparison-report-YYYYMMDD.md`) detailing the methodology, findings, and actionable recommendations.
-   The report should suggest concrete next steps for either refining LLM auto-review prompts or clarifying human review rubrics.
-
