# Implement LLM-based Image Regeneration Recommendation

## Context

The product roadmap outlines "image regeneration recommendation" under Phase 2: Story & Illustration Quality, specifically within "画像品質". The broader recommendation framework, including the Admin Quality Review UI, task persistence, action buttons, and task draft panels, is already in place (as evidenced by completed PRs like #357 and #368). The goal of this task is to implement the underlying logic for automatically identifying pages that need image regeneration, and generating a corresponding recommendation within the existing Admin UI. This aligns with the ongoing effort to improve generated image quality and streamline the quality review workflow.

## Objective

Develop and integrate an LLM-based system to automatically detect specific visual artifacts or quality issues in generated page images and propose a recommendation for
