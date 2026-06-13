# Enable 8-Page Fixed Templates for Light Paid Plan

## Context

The product is currently in Phase 5 (Monetization), with Cohort B limited rollout underway. Recent progress includes the implementation of 8-page variants for select fixed templates (PR #276) and a page number selector in the template detail UI (PR #287). However, these 8-page templates are not yet enabled for `light_paid` plan users, preventing the full utilization of this feature for monetization.

## Objective

Update the `PlanConfig` in Firestore to allow `light_paid` users to generate 8-page fixed templates. This will enable access to new, longer story options for a paid tier, supporting the ongoing monetization efforts.

## Allowed Scope
