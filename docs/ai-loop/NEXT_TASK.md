# Implement CRUD for Original Characters

## Context

The product roadmap (Section 0, "一部実装済み") explicitly states that `originalCharacters` have their type definitions and Firestore structure designed, but "本格CRUD未実装" (full CRUD not implemented). This refers to a feature allowing users to define and manage their own custom characters (beyond their child's avatar or pre-defined companions) for use in story generation. This is crucial for expanding the personalization capabilities, especially for the `original_ai` mode.

Many foundational elements, such as core story generation, character consistency, image generation, and user/admin UIs, are already in place. Integrating custom `originalCharacters` will leverage these existing systems.

The current `Current State` shows extensive work on companion characters and child avatars, but
