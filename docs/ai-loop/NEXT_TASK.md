# Diagnose Companion Character Visual Consistency Issues

## Context

The product roadmap for Phase 2: Story & Illustration Quality includes "相棒キャラ一貫性の改善" (Improve companion character consistency) under the "キャラクター一貫性" (Character consistency) section. While general character generation has seen improvements (e.g., `PR #545` to prevent hallucinated characters, `PR #445` to enforce registered companion appearance), a dedicated diagnosis of *companion character* visual consistency across pages has not been performed. This task aims to identify and document specific issues related to how companion characters are rendered throughout a story.

## Objective

Identify and document common visual consistency issues observed in companion characters across multiple pages of generated books. The output should be a diagnostic report detailing observed problems, their frequency, and initial hypotheses for root causes, informing future prompt engineering or generation logic improvements.

## Allowed Scope

- `docs/`: To create a new diagnostic report Markdown file (`docs/COMPANION_CHARACTER_CONSISTENCY_DIAGNOSIS.md`).
