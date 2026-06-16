# Human vs. LLM Auto Review Comparison Report (2026-06-16)

## 1. Executive Summary
This report analyzes the agreement and discrepancies between Human Quality Reviews and LLM-based Auto Reviews. Based on a sample of 10 mock books designed to simulate current system behaviors, we observe high agreement in **Safety** and **Overall Quality**, but significant divergence in **Story Quality** (where the LLM tends to be more lenient) and **Character Consistency** (where the LLM misses subtle visual drifts).

## 2. Methodology
- **Data Source:** A curated mock dataset (`docs/quality-analysis/mock-reviews-dataset.json`) representing 10 diverse quality scenarios.
- **Comparison Tool:** `scripts/analysis/compare-human-llm-reviews-local.mjs`.
- **Metrics:**
    - **Mean Absolute Error (MAE):** Average magnitude of score difference.
    - **Bias:** Average directional difference (LLM Score - Human Score).
    - **Confusion Matrix:** Issue detection agreement (TP, FP, FN, TN).

## 3. Quantitative Results

### 3.1 Score Metrics (1-5 Scale)
| Axis | MAE | Bias (LLM - Human) | Interpretation |
| :--- | :---: | :---: | :--- |
| **Story** | 0.40 | +0.40 | LLM is consistently lenient. |
| **Illustration** | 0.20 | -0.20 | LLM is slightly harsher on minor artifacts. |
| **Character Consistency** | 0.30 | +0.10 | Generally aligned but misses drifts. |
| **Personalization** | 0.20 | -0.20 | LLM expects explicit visual markers. |
| **Safety** | 0.00 | 0.00 | Perfect agreement on critical violations. |
| **Overall** | 0.26 | +0.10 | High overall alignment. |

### 3.2 Issue Detection Agreement
| Area | Recall | Precision | Observation |
| :--- | :---: | :---: | :--- |
| **Story** | 0.33 | 1.00 | Misses semantic/logical issues (FN). |
| **Illustration** | 1.00 | 0.50 | Flags minor technical artifacts humans ignore (FP). |
| **Character** | 0.00 | 0.00 | Misses color drift; flags minor hat size changes. |
| **Safety** | 1.00 | 1.00 | Robust detection of safety violations. |

## 4. Qualitative Analysis & Discrepancies

### 4.1 LLM Leniency in Story Quality
In books like `book-02-llm-lenient-story` and `book-08-llm-missed-semantic`, the human reviewer flagged poor plot logic and insufficient semantic content (missing location/emotion), while the LLM gave high scores.
- **Hypothesis:** The LLM's internal "quality" bar for story structure is too low, or it fails to strictly enforce the age-appropriate semantic requirements defined in `docs/LLM_AUTO_REVIEW_SEMANTIC_CONTENT.md`.

### 4.2 Character Consistency "Blind Spots"
In `book-04-char-drift-missed`, the LLM failed to detect a hair color change from blonde to brown.
- **Hypothesis:** Current vision-based character review might focus on "general vibe" rather than specific anchor attributes (hair color, eye color) defined in the `visualBible`.

### 4.3 Hallucinated Technical Issues
In `book-09-llm-hallucinated-issue`, the LLM flagged a minor "hat size variation" which the human reviewer considered irrelevant to product quality.
- **Hypothesis:** LLM-as-a-judge can be "overly pedantic" on pixel-level consistency that doesn't impact user experience.

## 5. Actionable Recommendations

### 5.1 Refine LLM Auto-Review Prompts
- **Story Quality:** Inject strict semantic checklists into the prompt. Force the LLM to explicitly count "Location", "Action", "Emotion", and "Discovery" elements for Age 3+ books.
- **Character Consistency:** Instruct the LLM to verify specific "anchor attributes" from the `storyCast` (e.g., "Does the character always have blonde hair?").

### 5.2 Clarify Human Review Rubrics
- **Illustration Quality:** Update the rubric to clarify whether minor "background distortion" should be penalized or ignored, to better align with LLM sensitivity.
- **Personalization:** Provide examples of "visual personalization" (e.g., favorite toy appearance) vs. "textual personalization" to ensure humans and LLMs use the same criteria.

### 5.3 Next Steps
1. Implement the prompt refinements in `functions/src/lib/auto-review-llm.ts`.
2. Run a follow-up analysis on real production data once the next batch of human reviews is completed.
3. Integrate the "Discrepancy Score" (MAE) into the Admin Quality Dashboard for proactive monitoring.
