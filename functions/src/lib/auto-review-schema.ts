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
    issueType: {
      type: "string" as const,
      description: "Machine-readable issue code (e.g., 'insufficient_semantic_content')",
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

const STORY_AXES_SCHEMA = {
  type: "object" as const,
  properties: {
    childPersonalization: { type: "number" as const, description: "Child personalization (0-100)" },
    storyCoherence: { type: "number" as const, description: "Story coherence and pacing (0-100)" },
    ageAppropriateness: { type: "number" as const, description: "Age appropriateness of language and themes (0-100)" },
    emotionalSatisfaction: { type: "number" as const, description: "Emotional engagement and satisfaction (0-100)" },
    pageLengthBalance: { type: "number" as const, description: "Balance of text length across pages (0-100)" },
    characterConsistency: { type: "number" as const, description: "Consistency of character personalities (0-100)" },
    endingSatisfaction: { type: "number" as const, description: "Satisfaction and closure of the ending (0-100)" },
  },
  required: [
    "childPersonalization",
    "storyCoherence",
    "ageAppropriateness",
    "emotionalSatisfaction",
    "pageLengthBalance",
    "characterConsistency",
    "endingSatisfaction",
  ] as const,
};

const ILLUSTRATION_AXES_SCHEMA = {
  type: "object" as const,
  properties: {
    promptCompleteness: { type: "number" as const, description: "Prompt completeness and detail (0-100)" },
    visualConsistency: { type: "number" as const, description: "Visual style consistency (0-100)" },
    characterConsistency: { type: "number" as const, description: "Visual character consistency (0-100)" },
    sceneRelevance: { type: "number" as const, description: "Relevance of prompts to page text (0-100)" },
    styleConsistency: { type: "number" as const, description: "Consistency with the chosen art style (0-100)" },
    artifactAvoidance: { type: "number" as const, description: "Avoidance of visual artifacts and unwanted text (0-100)" },
  },
  required: [
    "promptCompleteness",
    "visualConsistency",
    "characterConsistency",
    "sceneRelevance",
    "styleConsistency",
    "artifactAvoidance",
  ] as const,
};

const CHARACTER_CONSISTENCY_AXES_SCHEMA = {
  type: "object" as const,
  properties: {
    visualBibleReflected: {
      type: "number" as const,
      description: "Score for how well character descriptions (visualBible) are reflected in prompts (0-100)",
    },
    characterIdConsistency: {
      type: "number" as const,
      description: "Score for consistency of character IDs and names across pages (0-100)",
    },
    appearingCharacterConsistency: {
      type: "number" as const,
      description: "Score for whether the correct characters appear as intended by story cast (0-100)",
    },
    focusCharacterConsistency: {
      type: "number" as const,
      description: "Score for consistency of focus character selection (0-100)",
    },
    pageLevelCharacterLinkage: {
      type: "number" as const,
      description: "Score for logical linkage of character actions between pages (0-100)",
    },
    outfitHairstyleConsistency: {
      type: "number" as const,
      description: "Score for consistency in clothing and hair descriptions (0-100)",
    },
    colorPaletteConsistency: {
      type: "number" as const,
      description: "Score for consistency in character-specific color palettes (0-100)",
    },
  },
  required: [
    "visualBibleReflected",
    "characterIdConsistency",
    "appearingCharacterConsistency",
    "focusCharacterConsistency",
    "pageLevelCharacterLinkage",
    "outfitHairstyleConsistency",
    "colorPaletteConsistency",
  ] as const,
};

const PERSONALIZATION_AXES_SCHEMA = {
  type: "object" as const,
  properties: {
    childProfileUsage: { type: "number" as const, description: "Usage of child profile traits (0-100)" },
    nameNicknameUsage: { type: "number" as const, description: "Natural usage of name/nickname (0-100)" },
    favoriteThings: { type: "number" as const, description: "Integration of favorite things (0-100)" },
    familyContext: { type: "number" as const, description: "Appropriate family context (0-100)" },
    memoryEventContext: { type: "number" as const, description: "Integration of specific memories (0-100)" },
    overPersonalizationRisk: { type: "number" as const, description: "Avoidance of over-personalization/PII risks (0-100)" },
  },
  required: [
    "childProfileUsage",
    "nameNicknameUsage",
    "favoriteThings",
    "familyContext",
    "memoryEventContext",
    "overPersonalizationRisk",
  ] as const,
};

const SAFETY_AXES_SCHEMA = {
  type: "object" as const,
  properties: {
    ageAppropriateVocabulary: { type: "number" as const, description: "Age-appropriate vocabulary (0-100)" },
    notTooScary: { type: "number" as const, description: "Avoidance of overly scary themes (0-100)" },
    dangerAvoidance: { type: "number" as const, description: "Avoidance of encouraging dangerous behavior (0-100)" },
    familyFriendlyPeace: { type: "number" as const, description: "Overall family-friendly and peaceful tone (0-100)" },
    privacyConsideration: { type: "number" as const, description: "Privacy and PII considerations (0-100)" },
  },
  required: [
    "ageAppropriateVocabulary",
    "notTooScary",
    "dangerAvoidance",
    "familyFriendlyPeace",
    "privacyConsideration",
  ] as const,
};

const PAGE_ASSESSMENT_SCHEMA = {
  type: "object" as const,
  properties: {
    pageNumber: { type: "number" as const, description: "Page number (1-indexed)" },
    semanticContentDetectedElements: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Detected semantic elements: 場所, 行動, 気持ち, 発見",
    },
    hasSufficientSemanticContent: {
      type: "boolean" as const,
      description: "Whether the page has at least 2 semantic elements",
    },
  },
  required: ["pageNumber", "semanticContentDetectedElements", "hasSufficientSemanticContent"] as const,
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
    storyAxes: STORY_AXES_SCHEMA,
    illustrationAxes: ILLUSTRATION_AXES_SCHEMA,
    characterAxes: CHARACTER_CONSISTENCY_AXES_SCHEMA,
    personalizationAxes: PERSONALIZATION_AXES_SCHEMA,
    safetyAxes: SAFETY_AXES_SCHEMA,
    pageAssessments: {
      type: "array" as const,
      items: PAGE_ASSESSMENT_SCHEMA,
      description: "Per-page semantic content assessment",
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
    "storyAxes",
    "illustrationAxes",
    "characterAxes",
    "personalizationAxes",
    "safetyAxes",
    "pageAssessments",
  ] as const,
};
