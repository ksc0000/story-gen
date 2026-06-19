# Implement `identity-only` Character Reference Strategy (REF-001 Implementation)

## Context

The product roadmap (Section 10, "Now" priority, and Phase 3: Quality Follow-ups `REF-001`) outlines the design of an `identity-only reference strategy` for character consistency. The design document `docs/CHARACTER_REFERENCE_STRATEGY.md` has been completed. The goal is to evolve from using full reference images (which can leak background/composition) to a more robust method that focuses solely on character identity. This is a critical step towards improving overall character consistency in generated illustrations, a key aspect of Phase 2: Story & Illustration Quality.

Currently, the system relies on reference images which can sometimes lead to issues like background bleeding
