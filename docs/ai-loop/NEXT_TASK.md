# Refine Character Generation to Prevent Hallucinated Characters (Outside of `storyCast`)

## Context

Phase 2 of the roadmap, "Story & Illustration Quality," aims to make generated results "satisfactory picture books for sale." A critical component of this is character consistency. The roadmap explicitly lists "余計な人物が増えない制御（cast 外のキャラが登場しない）" (Control to prevent additional people from appearing, i.e., characters outside `cast` should not appear) under the "キャラクター一貫性" section. Currently, the AI may sometimes introduce extraneous characters not defined in the `storyCast` or `appearingCharacterIds`, leading to inconsistencies in the narrative and illustrations.

## Objective

Enhance the story generation and/or image prompt generation logic to prevent the halluc
