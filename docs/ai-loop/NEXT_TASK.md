# Design Document for Image Provider Comparison and A/B Testing Framework

## Context

The `ImageProvider` abstraction has been implemented (PR #315, PR #241, PR #250), unifying the interface for various image generation models and services. Phase 4 (Gemini JSON Hardening) is complete, and Phase 5 (Monetization) is in a limited rollout (Cohort B is `実施中`). As the product begins to receive real user traffic and generate books, optimizing for image quality, generation speed, and cost across different providers is a critical next step. The roadmap explicitly lists `provider 比較・A/B テスト` under "未実装" (unimplemented). This task focuses on designing the framework for this capability before implementation.

## Objective

Create a comprehensive design document (`docs/IMAGE_PROVIDER_AB_TESTING_DESIGN.md`) outlining a framework for systematically comparing and A/B testing different image generation providers, models, and configuration parameters within the existing `ImageProvider` abstraction.

## Allowed Scope

- `docs/` (for the design document)
- `src/types/` (for preliminary type definitions relevant to the A/B testing framework, if deemed necessary within the design document)

## Forbidden Scope

- Infrastructure changes (e.g., new Cloud Run services, IAM roles)
- Billing system modifications
- Authentication redesign
- Secrets management changes
- Generation of new assets (images, PDFs, etc.)
- Direct code implementation of the A/B testing logic

## Requirements

- The design document must be clear, detailed, and address the requirements outlined in the "Worker prompt" section.
- The design should leverage the existing `ImageProvider` abstraction.
- Consider both technical feasibility and product needs (e.g., quality, cost, speed metrics).
- Identify potential follow-up implementation tasks.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

## Worker prompt

Please create a detailed design document at `docs/IMAGE_PROVIDER_AB_TESTING_DESIGN.md` that addresses the following:

1.  **Goals:** Clearly define the primary goals of implementing an image provider comparison and A/B testing framework (e.g., optimize image quality, reduce generation latency, minimize cost, improve character consistency across providers).
2.
