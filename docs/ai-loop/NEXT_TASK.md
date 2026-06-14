# Display Granular Human Quality Review Scores in Admin UI

## Context

Granular human quality review scores (Story, Illustration, Character Consistency, Personalization, and Safety) are now persisted in Firestore following the merge of PR #365 "Implement Persistence for Granular Human Quality Review Scores". The current Admin Quality Review UI displays an overall quality score and flagged issues but does not yet show these newly available detailed breakdown scores. To facilitate more comprehensive quality analysis and review, these granular scores need to be prominently displayed within the administrative interface.

## Objective

Enhance the Admin Quality Review UI to prominently display the newly persisted granular human quality review scores for each book. This will allow administrators and quality reviewers to see a detailed breakdown of quality aspects, supporting better decision-making for quality improvement.

## Allowed Scope
