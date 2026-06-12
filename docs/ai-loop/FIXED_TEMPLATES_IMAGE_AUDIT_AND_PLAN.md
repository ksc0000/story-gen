# Audit of Fixed Templates Preview Images and Generation Plan

## Overview
This document audits the 56 fixed templates for preview image quality and uniqueness. It identifies templates sharing images and those using generic placeholders, providing a roadmap for improvement to ensure a high-quality user experience.

## Audit Summary
- **Total Fixed Templates:** 56
- **Unique Specific Previews:** 48
- **Shared Previews (4p/8p variants):** 8 templates (4 pairs)
- **Generic Placeholders:** 2 templates

### Shared Previews (Conflict)
The following pairs share the exact same preview image, making it difficult for users to distinguish between the standard and extended versions:
- `fixed-first-zoo` & `fixed-first-zoo-8p`: Both use `/images/templates/fixed-first-zoo.webp`
- `fixed-first-birthday` & `fixed-first-birthday-8p`: Both use `/images/templates/fixed-first-birthday.webp`
- `fixed-brush-teeth` & `fixed-brush-teeth-8p`: Both use `/images/templates/fixed-brush-teeth.webp`
- `fixed-sleepy-moon-adventure` & `fixed-sleepy-moon-adventure-8p`: Both use `/images/templates/fixed-sleepy-moon-adventure.webp`

### Generic Placeholders
The following templates use generic category-level images instead of specific story-based previews:
- `fixed-bedtime-good-day`: Uses `/images/templates/bedtime.webp` (shared with the legacy `bedtime` template)
- `fixed-cardboard-rocket`: Uses `/images/templates/adventure.webp` (shared with the legacy `adventure` template)

## Generation/Update Plan

### Phase 1: Unique Previews for 8-Page Variants (High Priority)
To distinguish the premium 8-page experience from the standard 4-page version, we will generate unique preview images for the following:
- `fixed-first-zoo-8p`
- `fixed-first-birthday-8p`
- `fixed-brush-teeth-8p`
- `fixed-sleepy-moon-adventure-8p`

**Visual Direction:** 8-page previews should feature a slightly more complex composition or a unique scene from later in the story (e.g., the "payoff" or "quiet ending" role) to hint at the additional depth.

### Phase 2: Specific Illustrations for Placeholders (High Priority)
Generate specific, high-quality illustrations to replace generic placeholders:
- `fixed-bedtime-good-day`: Needs a scene showing a child reflecting on their day in a cozy bedroom.
- `fixed-cardboard-rocket`: Needs a scene featuring a child actually inside/near a cardboard rocket in a playroom.

### Phase 3: Structural Cleanup (Medium Priority)
Update `functions/src/seed-templates.ts` to explicitly define `previewImageUrl` within the `fixedStory` block for all fixed templates. Currently, most rely on the top-level `sampleImageUrl`. Explicitly separating them allows for better UI control in `ThemeCard.tsx`.

### Phase 4: Consistency Audit (Medium Priority)
Conduct a visual review of the 42 newly added templates (e.g., `fixed-world-*` series, `fixed-learning-*` series) to ensure they all adhere to the "Soft watercolor picture book" style defined in their `visualDirection` fields.

## Implementation Roadmap
1. **Image Generation:** Trigger generation using the Admin Template Generator with the `coverImagePromptTemplate` defined in each template.
2. **Asset Management:** Save the best candidates as `.webp` in `public/images/templates/` using unique names (e.g., `fixed-first-birthday-8p.webp`).
3. **Seed Update:** Update `functions/src/seed-templates.ts` with the new paths.
4. **Verification:** Run `npm --prefix functions run check:phase2` to ensure template integrity.
5. **Deployment:** Deploy the updated Cloud Function and trigger `seedTemplates`.
