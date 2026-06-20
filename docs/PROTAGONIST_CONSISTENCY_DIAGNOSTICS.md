# Protagonist Visual Consistency Diagnostic Report

## Introduction
This report provides a systematic analysis of recurring failure patterns in the visual consistency of the protagonist character within EhonAI (Ehoria). As identified in the Phase 2 product roadmap (主人公一貫性の改善), maintaining a stable appearance across the cover and all story pages is critical for high-quality personalized picture books.

## Executive Summary
Current diagnostics and manual reviews reveal four primary failure modes:
1.  **Cover-Page Character Mismatch**: Protagonists often appear significantly different on the cover compared to the inner pages due to prompt architecture asymmetry.
2.  **Reference Image Background/Composition Leakage**: Background elements from reference photos (e.g., sandboxes) unintentionally bleed into unrelated story scenes.
3.  **Unintended Character Hallucination & Duplication**: The model sometimes "clones" the protagonist or introduces "ghost companions" not defined in the story cast.
4.  **Identity Jitter & Animal-Child Feature Leakage**: Subtle shifts in facial features, hairstyle, or age, along with the "merging" of child features with animal companions.

## Table of Contents
- [1. Cover-Page Character Mismatch](#1-cover-page-character-mismatch)
- [2. Reference Image Background/Composition Leakage](#2-reference-image-backgroundcomposition-leakage)
- [3. Unintended Character Hallucination & Duplication](#3-unintended-character-hallucination--duplication)
- [4. Identity Jitter & Animal-Child Feature Leakage](#4-identity-jitter--animal-child-feature-leakage)
- [5. Contributing Factors & Recommended Mitigations](#5-contributing-factors--recommended-mitigations)

## 1. Cover-Page Character Mismatch
### Pattern Description
The protagonist often exhibits a "visual jump" when moving from the book cover to the first story page. While the inner pages typically maintain high consistency using `buildImagePrompt()`, the cover often features a different outfit, age impression, or even a different character concept entirely.

### Contributing Factors
- **Structural Asymmetry**: Inner pages are enriched with the `characterBible` (containing specific visual rules like hairstyle, body proportions, and outfit) and the `visualBible` for cast members. Historically, `generateCoverImage()` received only the raw, non-enriched prompt.
- **Missing characterBible**: Without the `characterBible` as an anchor, the image model relies on generic placeholders in the `coverImagePromptTemplate` (e.g., `{childName}`), leading to hallucinations based on name alone.
- **Reference Image Absence**: Character reference images (e.g., child photos) are prioritized for inner pages but were not consistently applied to the cover generation path.

### Evidence
- **Source**: `docs/P5_CHARACTER_CONSISTENCY_ANALYSIS.md`
- **Analysis**: "ページには `buildImagePrompt()` による豊富なキャラクター固定情報が付与されるが、カバーはテンプレートを埋めた生テキストのみで生成される。" (Pages are given rich fixed character info, but the cover is generated with raw text only.)

## 2. Reference Image Background/Composition Leakage
### Pattern Description
When a character reference image is used (e.g., a photo of a child in a sandbox), the image generation model sometimes adopts the *background* or *composition* of the reference photo, even when the story describes a completely different setting (e.g., a zoo or a space rocket).

### Contributing Factors
- **Identity-Background Entanglement**: Image models (especially those using `character_reference` roles) may struggle to isolate the character's facial features from the surrounding environment in the input photo.
- **Reference Image Selection**: Using photos with complex or distinct backgrounds (like playgrounds) increases the risk of "leakage" into story pages.
- **Prompt Weighting**: If the `Scene` description in the prompt is buried or lacks sufficient weight, the visual information from the reference image can become the dominant guide for the background.

### Evidence
- **Source**: `docs/IMG-002_REFERENCE_VERIFICATION_REPORT.md`
- **Case Study**: The `fixed-first-zoo` template was used to test for playground/sandbox leakage. Prompt-based mitigations (e.g., `REF_ISOLATION_SUFFIX`) were required to enforce scene-lock constraints.
- **Mitigation Status**: Functionally verified in PR #447, but remains a risk for new templates or high-variance reference photos.

## 3. Unintended Character Hallucination & Duplication
### Pattern Description
The generation process occasionally introduces unauthorized characters or duplicates existing ones. Common variations include:
- **Character Doubling**: The protagonist appears twice in the same frame (e.g., interacting with themselves).
- **Ghost Companions**: Unrequested animals, children, or "imaginary friends" that follow the protagonist through multiple scenes.
- **Unauthorized Crowds**: The model fills an empty setting (e.g., a quiet garden) with random people or spectators.

### Contributing Factors
- **Vague Scene Descriptions**: If the `imagePrompt` doesn't explicitly state the scene is a "solo moment" or lacks a strict character count, the model may default to common "picture book" tropes (like a child always having a pet).
- **Prompt Ordering**: Character consistency rules (like hairstyle) are sometimes prioritized over scene-specific constraints, leading the model to focus on the character and "hallucinate" a companion to fill the frame.
- **Reference Image Multiplicity**: Providing multiple character reference images (e.g., child + animal) can sometimes confuse the model into drawing both in every frame, even when only one is requested for a specific page.

### Evidence
- **Heuristic Check**: `functions/src/lib/story-quality.ts` contains `addCastConsistencyIssues` which flags `unauthorized_human_in_prompt` and `unauthorized_animal_in_prompt`.
- **Rubric**: `RUBRIC_CHARACTER_CONSISTENCY.md` defines Score 1 (Failure) for "Multiple characters appear where there should be one."
- **Mitigation**: `GLOBAL_NEGATIVE_CHARACTER_PROMPT` was implemented in `prompt-builder.ts` to suppress unrequested companions and duplication.

## 4. Identity Jitter & Animal-Child Feature Leakage
### Pattern Description
Subtle but disruptive variations in the character's physical appearance across pages:
- **Feature Drift**: Minor changes in eye color, hair length, or age impression (e.g., a 3-year-old suddenly looking 7).
- **Animal-Child Leakage**: When the story features an animal companion, the protagonist's face may "leak" animal features (e.g., whiskers, fur-like hair) or vice versa, especially when both have reference images.

### Contributing Factors
- **Reference Image Interference**: When multiple reference images (child and companion) are provided, FLUX models can sometimes "blend" the visual features of both into a single entity.
- **Inconsistent Hair/Outfit Descriptions**: If the `characterBible` and the page-specific `imagePrompt` have conflicting or overlapping descriptions, the model may oscillate between them.
- **Night Scene Style Drift**: Darker scenes or different lighting conditions can trigger different "interpretations" of the character's face shape and features.

### Evidence
- **PR #431**: Identified and fixed "animal face leakage" and "night scene style drift."
- **PR #447**: Implemented face geometry anchoring to the reference image to reduce jitter.
- **Code**: `functions/src/lib/prompt-builder.ts` now includes a "Child-animal boundary" guardrail to strictly separate human and animal features.

## 5. Contributing Factors & Recommended Mitigations

### Factor A: Structural Prompt Asymmetry (Cover vs. Page)
The primary cause of the "visual jump" between the cover and inner pages.
- **Mitigation**: Implement a `buildCoverImagePrompt()` function in `prompt-builder.ts` that enriches the cover prompt with the `characterBible` and `visualBible` information, matching the richness of the `buildImagePrompt()` used for story pages.

### Factor B: Reference Image Background Leakage
Reference photos often contain strong environmental cues (e.g., sandbox textures) that overpower the text-based `Scene` description.
- **Mitigation**:
    - Prioritize `neutralReferenceImageUrl` (Identity-Only Reference Strategy) to isolate character identity.
    - Reorder the `Scene` description to appear *before* reference-related instructions in the prompt to increase its weight.
    - Explicitly use "no-sandbox", "no-playground" negative tokens in fixed templates that are prone to leakage.

### Factor C: Identity-Companion Blending
Providing multiple reference images can lead the model to "merge" features.
- **Mitigation**:
    - Enforce the "Child-animal boundary" instruction early in the prompt.
    - When multiple characters are requested, use a "Strict character list" in the prompt to prevent the model from drawing every referenced character in every frame.

### Factor D: Identity Jitter
Minor variations in hairstyle or features when reference images are absent or low-resolution.
- **Mitigation**:
    - Strengthen the `characterBible` by including specific head-to-body ratios and definitive hairstyle descriptions.
    - Use "face geometry anchoring" keywords (e.g., "consistent face geometry", "preserve features from reference") in the prompt architecture.
