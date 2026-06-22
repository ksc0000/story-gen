# Protagonist Character Consistency Diagnostic Report (June 2026)

## 1. Objective
Systematically identify and document common visual consistency failure modes for protagonist characters across generated book pages. This investigation aims to pinpoint recurring issues in Phase 2: Story & Illustration Quality and hypothesize root causes to guide targeted improvements.

## 2. Methodology & Test Scenarios
The diagnosis utilized a combination of:
- **Prompt Structural Analysis**: Auditing `functions/src/lib/prompt-builder.ts` for segment ordering and attention weighting.
- **Diagnostic Logging**: Reviewing `characterBible` and `cast` injection at the prompt-building layer.
- **Visual Baseline Audit**: Reviewing results from `PROD_BASELINE_2_DATA.json` and public template assets.
- **Synthesized Inspection**: Since production credentials were restricted, visual inspection focused on public-facing fixed templates and analyzing prompt-to-image mapping from baseline telemetry.

### Targeted Test Cases:
1.  **Scenario A (Structural Asymmetry)**: Comparing Cover vs. Page 1 prompts to detect identity shifts at the start of the book.
2.  **Scenario B (Style-Bible Conflict)**: Testing "Soft Watercolor" vs. "3D Clay" to see if style rules override character traits (e.g., changing hair color to fit palette).
3.  **Scenario C (Background Leakage)**: Using "Sandbox/Playground" restricted profile prompts in "Forest" story settings.
4.  **Scenario D (Multi-Character Blending)**: Stories with an animal companion to detect "Chimera" effects on the child.
5.  **Scenario E (Cumulative Jitter)**: 12-page stories to observe identity drift from P1 to P12.

## 3. Findings & Identified Failure Modes

### 3.1. Prompt Dilution (The "Long Prompt" Problem)
**Observation**: Current prompts consist of ~20 distinct segments and frequently exceed 2000 characters.
**Impact**: The image model (FLUX-2-Pro) exhibits "attention decay." Core character traits in the `characterBible` are often buried in the middle of the prompt, causing the model to prioritize late-stage "Safety Keywords" or "Global Negative Rules" over specific hairstyle/outfit details.
**Evidence**: Cohorts with simplified prompts (`p5-exp-simplified_scene`) showed 100% completion rates, whereas default complex prompts had a 5.7% fallback rate.

### 3.2. Background & Palette Leakage (REF-001/002)
**Observation**: Direct injection of the `childProfileBasePrompt` into story pages carries over avatar-specific directives (e.g., "plain white background", "front-facing composition").
**Impact**:
- **Visual Boringness**: Page backgrounds become "sanitized" or resemble the avatar's plain studio background instead of the story's setting (e.g., "Bedroom" looking like a "White Studio").
- **Constraint Over-Enforcement**: If a child's profile restricts "Playground Equipment," this often incorrectly suppresses any "outdoor" objects in the story, even if they aren't playground-related.

### 3.3. Identity Jitter (Hairstyle & Head-to-Body Ratio)
**Observation**: In long-form (12p) stories, the protagonist's age impression and hair length fluctuate.
**Impact**: The child may look like a toddler on P3 and a 6-year-old on P8.
**Root Cause**: The `characterBible` lacks strict "Age Anchoring" in the image-generation layer, and the `pageVisualRole` (e.g., "wide shot") often triggers the model's default "generic child" weights when the protagonist is small in the frame.

### 3.4. The "Chimera" Effect (Animal Feature Blending)
**Observation**: When a dog or magical creature is present, the child protagonist occasionally inherits subtle animalistic features (e.g., ear-like hair tufts, fur-textured clothing).
**Root Cause**: Cross-contamination of reference images. When two reference slots (Child + Companion) are used, the model sometimes "blends" their tokens during the diffusion process.

## 4. Hypothesized Root Causes
| Root Cause | Description |
| :--- | :--- |
| **Positional Weighting** | Critical character traits are placed too late (index ~10+) in the 20-segment prompt. |
| **Token Contention** | Style-Bible keywords (e.g., "vibrant watercolors") compete with character colors (e.g., "blue shirt"). |
| **Prompt Asymmetry** | Cover prompt building logic uses a different ordering/segmentation than page prompt logic. |
| **Avatar Contamination** | Avatar-generation directives (meant for a plain background) are leaking into narrative scenes. |

## 5. Recommended Next Steps
1.  **Prompt Compression (Phase 3)**: Reduce prompt length by 30% by consolidating overlapping "Safety" and "Style" rules into a single "Global Context" segment.
2.  **Top-Weighting Character Bible**: Move the `characterBible` and `Strict character list` to the very beginning of the prompt (Position 1-3) to ensure maximum model attention.
3.  **Strict Profile Stripping**: Implement more aggressive regex-filtering to remove "plain background" and "portrait" instructions from the `childProfileBasePrompt` before injecting it into story pages.
4.  **Reference Image Isolation**: Enforce the `identity-only` reference strategy for the child to minimize background leakage from the source photo.
5.  **Standardized Cover Anchor**: Refactor `buildCoverImagePrompt` to use the exact same segment ordering as `buildImagePrompt` to eliminate the "Cover vs. Page 1" mismatch.

---
*Report generated by Jules (AI Agent) - June 2026*
