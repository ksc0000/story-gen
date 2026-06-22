# Diagnose and Investigate Protagonist Character Consistency Issues

## Context

The product roadmap for Phase 2: Story & Illustration Quality explicitly lists "主人公一貫性の改善" (Improve Protagonist Consistency) as a key area for improvement under the "キャラクター一貫性" (Character Consistency) section. While general character consistency diagnostic tools have been implemented (PR #388) and companion-specific consistency is being addressed in a separate task (#569), a dedicated investigation into the protagonist's visual consistency across book pages is crucial. This task aims to systematically identify common failure modes and lay the groundwork for targeted improvements, especially as we move towards broader adoption and monetization where consistent quality is paramount.

## Objective

Identify and document common visual inconsistencies of protagonist characters across generated book pages. This involves defining specific test cases, utilizing existing diagnostic tools, and performing visual inspection to pinpoint recurring issues and hypothesize their root causes. The findings will be summarized in a new diagnostic report.

## Allowed Scope

- `docs/`: For creating the diagnostic report.
- `functions/src/`: For potentially adding or modifying diagnostic logging, or creating a new script to orchestrate test generations.
- `scripts/`: For creating a new diagnostic script to automate book generation for test cases, if necessary.
- `lib/`: For defining any new types or interfaces required for diagnostic data or script configurations.
- `firebase.json`: If a new callable function or scheduled job is added for diagnostic purposes (though manual script execution is preferred for initial diagnosis).

## Forbidden Scope

- Frontend UI changes (components, pages, styles).
- Infrastructure
