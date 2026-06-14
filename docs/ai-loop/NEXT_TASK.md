# Implement Image Generation Usage Monitoring Dashboard

## Context

The product is currently in Phase 5 (Monetization) with a limited rollout (`Cohort B`) in progress. As we move towards broader availability and potential A/B testing of image generation providers, it is crucial to have clear visibility into the usage patterns and resource consumption of different image models. While `ImageProvider` abstraction and `imageModel` tracking are in place, there is currently no dedicated dashboard to visualize usage by model. This task addresses the "P4-cost: provider コスト比較ダッシュボード (`imageModel` フィールド活用)" follow-up item identified from the P3 closure, providing foundational metrics for cost optimization and provider comparison.

## Objective

Create a Cloud Monitoring dashboard panel that displays image generation usage, specifically
