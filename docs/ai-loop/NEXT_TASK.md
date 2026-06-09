# Worker Prompt Template

## Context

The product roadmap identifies `REF-001 (Character Reference Strategy)` as a key `design-in-progress` item under "Now" priorities. This strategy aims to improve character consistency by minimizing unwanted background and composition leakage from reference images. The current state shows several Phase 5 (Monetization) tasks are in progress or completed, and Phase 4 (Gemini JSON Hardening) is closed. The focus is on preparing the foundation for robust image generation.

## Objective

Draft the "Problem Statement" and "Proposed Solution Overview" sections within the `docs/CHARACTER_REFERENCE_STRATEGY.md` document. This task specifically focuses on formalizing the design for an `identity-only reference strategy`, articulating the issues with current character reference approaches and outlining the high-level vision for the new strategy.

## Allowed Scope

- `docs/CHARACTER_REFERENCE_STRATEGY.md`

## Forbidden Scope

- `functions/`
- `web/`
- `tests/`
- `scripts/`
- Infrastructure configuration (`firebase.json`, `.firebaserc`, `package.json` scripts)
- Billing
- Authentication redesign
- Secrets management
- Generated assets (`lib/`, `dist/`)

## Requirements

- Clearly define the problem of background/composition leakage in character reference.
- Outline the core concept of an `identity-only reference strategy`, including the role of neutral reference images and character sheets.
- Ensure the language is precise and aligns with the existing technical terminology in the project.
- The update should be a self-contained addition to the existing document, clearly labeled.

## Output Format

- Summary
- Changed files
- Tests executed
- Known issues
- Suggested next task

---

### Worker Prompt

Please update the `docs/CHARACTER_REFERENCE_STRATEGY.md` file.

1.  **Add a new top-level section titled "Problem Statement: Background and Composition Leakage"**
    *   Describe how the current method of using character reference images can inadvertently transfer background elements, poses, or compositional biases from the reference image into the generated page illustrations.
    *   Explain why this is an issue for story consistency and artistic quality.
    *   Reference `IMG-002` (prompt-level character reference isolation) as an existing mitigation, but highlight its limitations and the need for a more structural solution.

2.  **Add another new top-level section titled "Proposed Solution Overview: Identity-Only Reference Strategy"**
    *   Introduce the concept of an "identity-only reference strategy."
    *   Explain that this strategy aims to decouple character identity (facial features, unique traits, attire) from environmental context, pose, and composition.
    *   Describe the high-level components of this solution:
        *   **Neutral Reference Images:** Standardized, context-free images of characters (e.g., full-body, neutral pose, plain background) used solely to capture identity.
        *   **Character Sheets (Conceptual):** A collection of prompt directives and potentially multiple neutral reference images (for different angles/expressions) that collectively define a character's visual identity.
    *   Briefly explain how this strategy is expected to reduce background/composition leakage while maintaining character consistency across diverse scenes and actions.
    *   Mention that this is a "design-in-progress" and subsequent sections will detail implementation steps.
