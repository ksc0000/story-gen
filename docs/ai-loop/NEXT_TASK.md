# Implement Prompt Completeness Checker with Diagnostic Logging

## Context

Phase 2 of the product roadmap, "Story & Illustration Quality," lists "prompt completeness checker" as an unaddressed task under "含めるタスク." This task aims to improve the quality and consistency of generated images by ensuring that the AI's image prompts adequately capture essential story elements defined in the `StoryPage` and `BookDoc`. Recent work on LLM auto-review and quality score persistence provides a solid foundation for integrating such diagnostic tools.

## Objective

Develop a utility function to assess the completeness of generated image prompts against key story and visual elements (`pageVisualRole`, `visualMotif`, `hiddenDetail`, etc.). The function will return structured diagnostic information, which should then be logged to provide insights into prompt quality, aiding in future prompt engineering and automated regeneration decisions.

## Allowed Scope

-   `functions/
