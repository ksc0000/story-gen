# Design Document: LLM Auto Review vs. Human Review Comparison Methodology

## 1. Context & Objective

As part of Phase 2: Story & Illustration Quality, we have implemented both human quality review mechanisms and an LLM-based auto-review prototype. To ensure the reliability of automated reviews and to identify systematic biases or gaps in AI generation, we need a robust methodology to compare these two data sources.

The objective of this comparison is to:
- Validate the accuracy of LLM Auto Reviews against human "Ground Truth".
- Identify dimensions where LLM and human judgments diverge significantly.
- Enable proactive quality regression detection by using LLM reviews as a high-frequency proxy for human reviews.
- Continuous improvement of the LLM review prompt and the human review rubric.

## 2. Comparison Dimensions

We will compare reviews across the following dimensions, which are common to both human and LLM schemas:

| Dimension | Data Points (Human) | Data Points (LLM) |
| :--- | :--- | :--- |
| **Scores** | 1-5 scale for each axis | 0-100 scale for each axis |
| **Story Quality** | `storyScore` | `storyQualityScore` |
| **Illustration Quality** | `illustrationScore` | `illustrationQualityScore` |
| **Character Consistency** | `characterConsistencyScore` | `characterConsistencyScore` |
| **Personalization** | `personalizationScore` | `personalizationScore` |
| **Safety** | `safetyScore` | `safetyScore` |
| **Overall Quality** | `overallScore` (1-5) | `overallQualityScore` (0-100) |
| **Flagged Issues** | `flaggedIssues` (area, message) | `flaggedIssues` (area, severity, message) |
| **Recommended Fixes** | `recommendedFixes` (action, reason) | `recommendedFixes` (action, reason) |

## 3. Data Normalization Logic

To compare the quantitative scores, we must align the human 1-5 scale with the LLM 0-100 scale.

### 3.1 Score Mapping
We will use a linear mapping for the baseline comparison:
- **Human Score 1** $\rightarrow$ **LLM 20** (Critical Failure / Unusable)
- **Human Score 2** $\rightarrow$ **LLM 40** (Poor / Needs Major Fixes)
- **Human Score 3** $\rightarrow$ **LLM 60** (Acceptable / Fair)
- **Human Score 4** $\rightarrow$ **LLM 80** (Good / Paid Quality)
- **Human Score 5** $\rightarrow$ **LLM 100** (Excellent / Premium Quality)

*Alternative Mapping (Mid-point):* Some analysis might use the midpoint of ranges (e.g., Human 3 maps to 50 instead of 60) if the LLM shows a tendency to avoid extreme scores.

### 3.2 Categorical Alignment
- **Issue Areas:** Both systems use `story`, `illustration`, `character`, `personalization`, and `safety`. These map 1:1.
- **Actions:** Map human `human_review_required` to LLM `human_review_required`. Other actions like `rewrite_story` or `regenerate_images` are also aligned.

## 4. Quantitative Analysis Metrics

For each book that has both a Human Review and an LLM Review, we will calculate:

- **Mean Absolute Error (MAE):** $\frac{1}{N} \sum |Score_{LLM} - Score_{HumanNormalized}|$
  - Target: MAE < 15 points (roughly 0.75 on a 5-point scale).
- **Pearson Correlation Coefficient:** To measure how well LLM scores track with human perception across a large dataset.
- **Bias (Mean Error):** $\frac{1}{N} \sum (Score_{LLM} - Score_{HumanNormalized})$
  - Positive bias indicates the LLM is "too lenient".
  - Negative bias indicates the LLM is "too harsh".
- **Safety Recall:** The percentage of safety issues flagged by humans that were also flagged by the LLM. Target: 100% for high-severity issues.

## 5. Qualitative Comparison Methodology

### 5.1 Issue Detection Agreement (Confusion Matrix)
For each issue area (e.g., Story), we treat it as a binary classification: "Was an issue flagged?"
- **True Positive:** Both Human and LLM flagged an issue.
- **False Positive:** LLM flagged an issue, Human did not.
- **False Negative:** Human flagged an issue, LLM did not.

### 5.2 Severity Alignment
Analyze if "high" severity issues flagged by LLM correspond to Human scores of 1 or 2.
- **Severity Heatmap:** Plot LLM Severity (Low/Med/High/Blocker) against Human Scores (1-5).

### 5.3 Semantic Similarity (Future)
Use a separate LLM (e.g., Gemini 1.5 Pro) to evaluate the similarity between the human `reviewReason` and the LLM `reviewReason`.

## 6. Comparison Workflow & Tooling

### 6.1 Data Retrieval
Comparison logic will query:
1. `books/{bookId}/qualityReviews` for `reviewerType: 'llm'`.
2. `books/{bookId}/qualityReviews` for `reviewerType: 'human'`.

### 6.2 The "Ground Truth" Principle
In all comparisons, the **Human Review** is treated as the definitive Ground Truth.
- Discrepancies where the Human score is significantly lower than the LLM score are treated as "LLM Oversight".
- Discrepancies where the Human score is significantly higher are treated as "LLM Over-criticism".

## 7. Reporting & Feedback Loop

### 7.1 Automated Dashboard (Admin Panel)
- **Scatter Plots:** Human Score vs. LLM Score per dimension.
- **Trend Lines:** Tracking MAE over time (or per model version).
- **Discrepancy Alerts:** Flagging books where $|Score_{LLM} - Score_{HumanNormalized}| > 30$.

### 7.2 Feedback Loop
- **Prompt Tuning:** If LLM consistently misses "Character Consistency" issues flagged by humans, update the `buildAutoReviewPrompt` with better examples or instructions.
- **Rubric Tuning:** If humans are inconsistent in areas where the LLM is consistent (e.g., word count based quality), refine the human rubric for better alignment.
- **Regression Detection:** Use the established MAE baseline to detect if a change in the story generation prompt causes a drop in quality even before human reviews are completed.
