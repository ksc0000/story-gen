# Human vs. LLM Quality Review Comparison Report

## 1. Executive Summary

This report analyzes the agreement between human quality reviews and LLM-based automated reviews for EhonAI storybooks. Based on a synthetic dataset of 10 matched pairs, we observe high overall score agreement (MAE < 5 points) but some divergences in specific issue detection areas, particularly in Safety and Illustration consistency.

## 2. Statistical Metrics

**Summary**
- Total Matched Pairs: 10

### 2.1 Score Metrics (MAE & Bias)
*Human scores (1-5) are normalized to 0-100 scale (Score * 20).*

| Axis | MAE | Bias (LLM - Human) |
| :--- | :---: | :---: |
| storyScore | 4.50 | -2.50 |
| illustrationScore | 3.50 | 0.50 |
| characterConsistencyScore | 3.50 | -3.50 |
| personalizationScore | 2.50 | -1.50 |
| safetyScore | 2.50 | 2.50 |
| overallScore | 2.70 | -0.90 |

- **Mean Absolute Error (MAE):** The average error is very low (less than 5 points on a 100-point scale), indicating that the linear mapping (Human * 20) is an effective baseline.
- **Bias:** The LLM shows a slight negative bias in `storyScore` and `characterConsistencyScore`, suggesting it may be slightly more critical than humans in these areas. It shows a positive bias in `safetyScore`, potentially indicating it is more lenient on borderline safety issues.

### 2.2 Issue Detection Agreement (Confusion Matrix)

| Area | TP | FP | FN | TN | Precision | Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| story | 1 | 0 | 0 | 9 | 1.00 | 1.00 |
| illustration | 1 | 1 | 0 | 8 | 0.50 | 1.00 |
| character | 1 | 1 | 0 | 8 | 0.50 | 1.00 |
| personalization | 0 | 0 | 0 | 10 | N/A | N/A |
| safety | 1 | 0 | 1 | 8 | 1.00 | 0.50 |

- **Safety (Recall 0.50):** The LLM missed one safety issue flagged by a human (False Negative). Given that Safety is a blocker, improving recall in this area is the highest priority.
- **Illustration/Character (Precision 0.50):** The LLM flagged issues that the human reviewer did not (False Positives). This indicates the LLM might be hyper-sensitive to visual artifacts or consistency drift that humans find acceptable.

## 3. Analysis of Discrepancies

### 3.1 Safety Oversights
The discrepancy in `safetyScore` bias (+2.50) and the False Negative in safety detection suggest that the LLM might not be as sensitive to "scary" or "inappropriate" nuances that a human parent would notice.

### 3.2 Visual Artifact Sensitivity
The False Positives in `illustration` and `character` areas suggest the LLM evaluator (likely multimodal Gemini 1.5 Flash) is detecting pixel-level or structural inconsistencies that don't necessarily degrade the human reading experience.

## 4. Recommendations for Refinement

1. **Safety Prompt Hardening:** Update the `buildAutoReviewPrompt` to include more explicit examples of "borderline" safety issues (e.g., subtle scary elements, unsafe child behaviors) to increase recall.
2. **Severity Tuning:** Introduce a "threshold of noticeability" for visual artifacts. If the LLM identifies a minor consistency drift but gives a score > 70, it should perhaps be categorized as an "Observation" rather than a "Flagged Issue".
3. **Calibrated Mapping:** Monitor if the negative bias in `storyScore` persists with larger real-world datasets. If so, adjust the normalization logic or the model's scoring instructions.

## 5. Conclusion

The LLM auto-review prototype shows promising alignment with human judgment for baseline scoring. The next iteration should focus on hardening safety detection and calibrating visual issue sensitivity to reduce false positives.
