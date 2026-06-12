import { QualityFlaggedIssue, QualityRecommendedFix } from "./types";

/**
 * Phase 2: LLM Auto Review Result.
 * This matches the AUTO_REVIEW_RESPONSE_SCHEMA defined in the backend.
 */
export interface LLMQualityReviewResult {
  storyQualityScore: number;
  illustrationQualityScore: number;
  characterConsistencyScore: number;
  personalizationScore: number;
  safetyScore: number;
  overallQualityScore: number;
  confidence: number;
  reviewReason: string;
  flaggedIssues: QualityFlaggedIssue[];
  recommendedFixes: QualityRecommendedFix[];
}
