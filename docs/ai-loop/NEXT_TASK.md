# Implement API-level Rate Limiting for Book Creation

## Context

The product is currently in a limited rollout phase (Cohort B), and user traffic is expected to grow. To ensure system stability, prevent abuse, and manage resource consumption effectively, implementing API-level rate limiting is crucial. This feature is explicitly listed under the "未実装" section of the product roadmap (`rate limit（API レベル）`).

## Objective

Implement API-level rate limiting for the book creation process, specifically targeting the callable function responsible for initiating book generation, to control the frequency of requests per user.

## Allowed Scope

- `functions/`: Implement rate limiting logic for the `generateBook` callable function and related backend processes.
- `src/`: Add or update shared utility functions or types
