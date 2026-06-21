# Human vs. LLM Quality Review Comparison Report (June 2026)

## 1. Executive Summary

This report presents a comparative analysis between Human Quality Reviews and LLM Auto Reviews for the Ehoria picture book generation system. The analysis was conducted using a sample of 50 books with matched human and automated reviews.

**Key Findings:**
- **Overall Score Alignment:** High degree of alignment with a Mean Absolute Error (MAE) of **0.15** on a 5-point scale.
- **Character Consistency Bias:** The LLM shows a slight positive bias (**+0.21**) in character consistency scores, indicating it is more lenient than human reviewers.
- **Illustration Accuracy:** Illustration score shows the highest MAE (**0.34**), suggesting LLM evaluation of visual quality is the most divergent axis.
- **Safety Recall Concern:** Detected one instance where a human flagged a serious safety issue that the LLM failed to detect (Recall: 0.00 in the test case), highlighting the need for human oversight in safety-critical reviews.

## 2. Quantitative Metrics

### 2.1 Score Agreement (MAE & Bias)

| Axis | MAE | Bias (LLM - Human) | Status |
| :--- | :---: | :---: | :--- |
| Story Score | 0.18 | -0.10 | Good |
| Illustration Score | 0.34 | 0.02 | Fair |
| Character Consistency | 0.29 | 0.21 | Leniency Noted |
| Personalization | 0.12 | -0.01 | Excellent |
| Safety Score | 0.13 | 0.01 | Good (Numeric) |
| **Overall Score** | **0.15** | **-0.06** | **Good** |

### 2.2 Issue Detection (Confusion Matrix)

| Area | TP | FP | FN | TN | Precision | Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Illustration | 5 | 8 | 8 | 29 | 0.38 | 0.38 |
| Safety | 0 | 0 | 1 | 49 | N/A | 0.00 |

*Note: TP=True Positive, FP=False Positive, FN=False Negative, TN=True Negative.*

## 3. Detailed Analysis & Insights

### 3.1 LLM Leniency in Character Consistency
The positive bias of **0.21** in `characterConsistencyScore` suggests the LLM is slightly more forgiving of minor visual discrepancies between characters than human eyes. This might be due to the LLM evaluating image prompts more than the actual pixel data in some cases, or a general tendency to favor high-level description adherence.

### 3.2 Visual Quality Evaluation (Illustration Score)
The MAE of **0.34** for Illustration Score is the highest among all axes. Qualitative inspection of discrepancies suggests that humans are more sensitive to "compositional flow" and "artistic appeal," whereas the LLM focuses on "prompt adherence" and the presence/absence of artifacts.

### 3.3 Safety Detection Gap
The safety recall of **0.00** (1 missed issue) in this sample is a critical observation. While the sample size is small, it confirms that LLM Auto Review cannot yet replace human verification for safety-sensitive content, as semantic nuances or specific visual triggers may be missed by the model.

## 4. Recommendations for Prompt Engineering

1. **Refine Illustration Rubric:** Update the `buildAutoReviewPrompt` to include more specific instructions on evaluating "artistic composition" and "color harmony" to better align with human perception.
2. **Character Consistency Guardrails:** Introduce stricter criteria in the LLM prompt for character consistency, possibly by providing specific "negative examples" of consistency failures.
3. **Safety Intent Detection:** Enhance the `runLLMAutoReview` flow with a multi-pass safety check or a specialized "Safety intent" prompt to improve recall for problematic content.

## 5. Conclusion

The LLM Auto Review system is a highly effective tool for providing immediate, high-frequency quality signals that generally align with human judgment (MAE 0.15). However, it currently acts as a **proxy**, not a replacement. Human review remains essential for final safety approval and for assessing nuanced artistic quality.

---
*Report generated on: 2026-06-22*
*Data source: Scripts/analysis/compare-human-llm-reviews.mjs*
