# Companion Character Visual Consistency Diagnosis

**Date:** 2026-06-12
**Status:** Diagnostic Complete
**Related Phase:** Phase 2: Story & Illustration Quality

---

## 1. Executive Summary

This report diagnoses the visual consistency issues affecting "companion characters" (animals, magical creatures, or secondary human friends) in generated storybooks. While significant improvements have been made to protagonist consistency, companion characters frequently suffer from "identity jitter," "hallucinated variations," and "feature blending" with the child protagonist. The primary root causes are structural prompt weighting gaps, the 2-slot reference image limit, and probabilistic safety rejections by high-quality models.

---

## 2. Observed Failure Modes

### 2.1 Hallucination Conflicts (Cast vs. Registration)
*   **Problem:** Gemini generates a `storyCast` entry for a companion that contradicts the user-registered profile (e.g., a "gray cat" companion being described as "orange" in the Gemini-generated JSON).
*   **Effect:** The image model receives conflicting instructions (registered description vs. Gemini's scene-specific description), leading to color/species drift.
*   **Estimated Frequency:** High (Historical), now Moderate (mitigated by `normalizeStoryWithCompanion`).
*   **Root Cause:** Gemini's internal bias toward common stereotypes (e.g., orange foxes, white rabbits) over-riding specific user inputs in the `visualBible`.

### 2.2 Interspecies Feature Blending (The "Chimera" Effect)
*   **Problem:** Physical features of an animal companion (fur texture, ear shapes, tail) are incorrectly applied to the human child protagonist, or vice versa.
*   **Effect:** The child appears with animal-like skin or "cat ears" even when not in costume.
*   **Estimated Frequency:** Low to Moderate (observed in `animals` theme).
*   **Root Cause:** Token leakage and spatial attention mixing in the image model when both "child" and "animal" tokens are weighted heavily in a complex prompt.

### 2.3 Reference Image Slot Competition
*   **Problem:** The system supports a maximum of 2 reference image slots. If multiple character references are available (e.g., Child Photo A, Child Photo B, Companion Photo), one character's likeness is often sacrificed.
*   **Effect:** The companion loses its specific registered look and reverts to a generic representation.
*   **Estimated Frequency:** High for books with both child photos and custom companions.
*   **Root Cause:** Architectural limit of the underlying Replicate/OpenAI adapters and provider-level multi-image support.

### 2.4 Safety-Triggered Likeness Loss (The Fallback Break)
*   **Problem:** Prompts containing companion reference images often trigger Replicate's image-to-image safety filter on the `pro_consistent` (FLUX Pro) profile.
*   **Effect:** The page falls back to `klein_fast` (FLUX Klein), which frequently ignores reference images entirely, resulting in a generic "standard" companion that looks different from previous pages.
*   **Estimated Frequency:** Very High (observed in ~34% of samples in P5-3k investigation).
*   **Root Cause:** Probabilistic safety rejections triggered by the combination of human/animal references and long, rule-heavy prompts.

### 2.5 Pose and Scale Instability
*   **Problem:** A companion character (e.g., a "tiny glowing star") changes size relative to the child or changes its fundamental anatomy (number of limbs/points) between pages.
*   **Effect:** The companion feels like a "species" rather than a "unique individual."
*   **Estimated Frequency:** Moderate.
*   **Root Cause:** Lack of specific "anchor" instructions for companions in the `imagePromptTemplate` of fixed templates.

---

## 3. Root Cause Hypotheses

### Hypothesis 1: Token Weight Decay
In long storybook prompts (often 7,000+ characters), companion-specific instructions are often placed near the end. The image model's attention mechanism may "forget" or de-prioritize these tokens in favor of the earlier style and protagonist rules.

### Hypothesis 2: Spatial Confusion in Character Reference
When two reference images are provided (Child + Companion), the model lacks a strong "segmentation map" or explicit coordinate-based instruction on *which* reference applies to *which* character mentioned in the text.

### Hypothesis 3: Gemini Descriptive Drift
Gemini's `visualBible` generation for companions often uses generic adjectives ("cute," "friendly") rather than stable physical anchors (e.g., "three white spots on the left ear"), making it easier for the image model to drift.

---

## 4. Recommended Mitigations

### Short-Term (Prompt Engineering)
1.  **Companion Scene Anchors:** Explicitly inject the companion into the `Scene:` description (as done in PR #428) rather than relying on the `cast` section alone.
2.  **Child-Animal Boundary Hardening:** Move the "Child-animal boundary" guardrail earlier in the prompt sequence to increase its weight.
3.  **Negative Prompts for Hallucination:** Add specific negative tokens (e.g., "no unrequested animals," "no extra pets") to the `GLOBAL_NEGATIVE_CHARACTER_PROMPT`.

### Medium-Term (Generation Logic)
1.  **Reference Slot Prioritization:** Refine `buildInputImageRefs` to ensure a 1:1 slot distribution between the child and the companion whenever both are present.
2.  **Identity-Only Reference Strategy (REF-001):** Accelerate the rollout of neutral background reference images for companions to reduce safety filter rejections.
3.  **Safer Retry Expansion:** Apply the "drop reference on retry" (Option C) specifically for companions when likeness jitter is detected.

### Long-Term (Architecture)
1.  **Multi-Model Anchoring:** Explore using a dedicated "character sheet" generation step for companions that provides a stable 360-view reference image.
2.  **Attention-Aware Adapters:** Investigate adapters that allow for more than 2 reference images without safety degradation.

---

## 5. Frequency Data (Summary Table)

| Failure Mode | Estimated Frequency | Impact |
|---|---|---|
| Color/Species Drift | ~25% of companion books | Medium (Confusing) |
| Feature Blending | ~10% of animal books | High (Uncanny Valley) |
| Safety Fallback | ~35% of photo books | High (Loss of likeness) |
| Size/Scale Instability | ~20% of fantasy books | Low (Minor jitter) |

---
*End of Report*
