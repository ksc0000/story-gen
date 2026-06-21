# Complete `approvedImageUrl` / `referenceImageUrl` Integration for All Character Types

## Context

The product roadmap indicates that the structure for `approvedImageUrl` and `referenceImageUrl` is prepared for cast members, but full integration across all character types in the image generation pipeline is still "in progress." This task aims to complete that integration to enhance character visual consistency.

## Objective

Ensure that `approvedImageUrl` and `referenceImageUrl` fields are correctly utilized for all character types (children's avatars, companions, and original characters) in the image generation process. This will leverage existing data structures to improve the consistency of character appearances, especially when explicit visual references are available and approved.

## Allowed Scope

-   `functions/src/`: Modifications to the book generation pipeline, specifically `generate-book
