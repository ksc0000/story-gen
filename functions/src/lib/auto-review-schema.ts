/**
 * Phase 2: LLM Auto Review JSON Schema definition.
 *
 * This schema defines the structure for automated book quality assessments
 * performed by an LLM evaluator. It covers scores, confidence, reasoning,
 * and actionable feedback (flagged issues and recommended fixes).
 */

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

/** Semantic version for the auto review response schema. */
export const AUTO_REVIEW_RESPONSE_SCHEMA_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Enum values
// ---------------------------------------------------------------------------

const ISSUE_SEVERITY_ENUM = ["low", "medium", "high", "blocker"];
const ISSUE_AREA_ENUM = ["story", "illustration", "character", "personalization", "safety"];

const FIX_ACTION_ENUM = [
  "rewrite_story",
  "repair_prompt",
  "regenerate_page_image",
  "fix_character_reference",
  "reduce_personal_data",
  "human_review_required",
];

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const FLAGGED_ISSUE_SCHEMA = {
  type: "object" as const,
  properties: {
    severity: {
      type: "string" as const,
      enum: ISSUE_SEVERITY_ENUM,
      description: "Severity level of the issue",
    },
    area: {
      type: "string" as const,
      enum: ISSUE_AREA_ENUM,
      description: "Quality area where the issue was found",
    },
    message: {
      type: "string" as const,
      description: "Detailed description of the issue in Japanese",
    },
    pageNumber: {
      type: "number" as const,
      description: "Optional page number (1-indexed) related to the issue",
      nullable: true,
    },
  },
  required: ["severity", "area", "message"] as const,
};

const RECOMMENDED_FIX_SCHEMA = {
  type: "object" as const,
  properties: {
    action: {
      type: "string" as const,
      enum: FIX_ACTION_ENUM,
      description: "Recommended system action to address the quality issue",
    },
    reason: {
      type: "string" as const,
      description: "Explanation for why this fix is recommended in Japanese",
    },
    pageNumber: {
      type: "number" as const,
      description: "Optional page number (1-indexed) where the fix should be applied",
      nullable: true,
    },
  },
  required: ["action", "reason"] as const,
};

// ---------------------------------------------------------------------------
// Root schema
// ---------------------------------------------------------------------------

/**
 * Gemini-compatible JSON Schema for the automated quality review response.
 */
export const AUTO_REVIEW_RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    storyQualityScore: {
      type: "number" as const,
      description: "Score for story quality (0-100)",
    },
    illustrationQualityScore: {
      type: "number" as const,
      description: "Score for illustration quality (0-100)",
    },
    characterConsistencyScore: {
      type: "number" as const,
      description: "Score for character consistency across pages (0-100)",
    },
    personalizationScore: {
      type: "number" as const,
      description: "Score for child personalization depth (0-100)",
    },
    safetyScore: {
      type: "number" as const,
      description: "Score for safety and age appropriateness (0-100)",
    },
    overallQualityScore: {
      type: "number" as const,
      description: "Weighted overall quality score (0-100)",
    },
    confidence: {
      type: "number" as const,
      description: "Model's confidence in this review (0.0 to 1.0)",
    },
    reviewReason: {
      type: "string" as const,
      description: "Summary of the overall review finding in Japanese",
    },
    flaggedIssues: {
      type: "array" as const,
      items: FLAGGED_ISSUE_SCHEMA,
      description: "Specific quality issues identified during review",
    },
    recommendedFixes: {
      type: "array" as const,
      items: RECOMMENDED_FIX_SCHEMA,
      description: "Actionable recommendations for quality improvement",
    },
  },
  required: [
    "storyQualityScore",
    "illustrationQualityScore",
    "characterConsistencyScore",
    "personalizationScore",
    "safetyScore",
    "overallQualityScore",
    "confidence",
    "reviewReason",
    "flaggedIssues",
    "recommendedFixes",
  ] as const,
};
