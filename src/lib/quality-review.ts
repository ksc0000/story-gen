import type {
  BookDoc,
  QualityReview,
  QualityReviewScore,
  QualityReviewStatus,
  QualityReviewerType,
  Timestamp,
} from "@/lib/types";

export const QUALITY_RUBRIC_VERSION = "phase2-quality-v1";

export type QualityReviewForm = {
  storyScore: string;
  illustrationScore: string;
  characterConsistencyScore: string;
  personalizationScore: string;
  safetyScore: string;
  status: QualityReviewStatus;
  reviewReason: string;
  flaggedIssues: string;
  recommendedFixes: string;
};

export type QualityReviewWithId = QualityReview & { id: string };

export function normalizeQualityReviewForm(): QualityReviewForm {
  return {
    storyScore: "",
    illustrationScore: "",
    characterConsistencyScore: "",
    personalizationScore: "",
    safetyScore: "",
    status: "reviewed",
    reviewReason: "",
    flaggedIssues: "",
    recommendedFixes: "",
  };
}

export function parseQualityScore(value: string): QualityReviewScore | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) return null;
  return num as QualityReviewScore;
}

export function calculateOverallQualityScore(scores: {
  storyScore: QualityReviewScore;
  illustrationScore: QualityReviewScore;
  characterConsistencyScore: QualityReviewScore;
  personalizationScore: QualityReviewScore;
  safetyScore: QualityReviewScore;
}): number {
  const sum =
    scores.storyScore +
    scores.illustrationScore +
    scores.characterConsistencyScore +
    scores.personalizationScore +
    scores.safetyScore;
  return Math.round((sum / 5) * 10) / 10;
}

export function splitTextareaLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function formatQualityScore(value?: number): string {
  if (value == null) return "—";
  return String(value);
}

export function getQualityReviewStatusLabel(status?: QualityReviewStatus): string {
  switch (status) {
    case "reviewed":
      return "Reviewed";
    case "needs_fix":
      return "Needs fix";
    case "approved":
      return "Approved";
    case "not_reviewed":
      return "Not reviewed";
    default:
      return "Not reviewed";
  }
}

export function getQualityReviewStatusBadgeClass(status?: QualityReviewStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "reviewed":
      return "bg-blue-100 text-blue-800";
    case "needs_fix":
      return "bg-rose-100 text-rose-800";
    case "not_reviewed":
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function validateQualityReviewForm(form: QualityReviewForm): string | null {
  const scoreFields = [
    { key: "storyScore", label: "Story Score" },
    { key: "illustrationScore", label: "Illustration Score" },
    { key: "characterConsistencyScore", label: "Character Consistency Score" },
    { key: "personalizationScore", label: "Personalization Score" },
    { key: "safetyScore", label: "Safety Score" },
  ] as const;

  for (const field of scoreFields) {
    if (!form[field.key]) {
      return `${field.label} を入力してください`;
    }
    if (parseQualityScore(form[field.key]) === null) {
      return `${field.label} は 1〜5 の整数で入力してください`;
    }
  }

  if (form.reviewReason.length > 1000) {
    return "Review Reason は 1000 文字以内にしてください";
  }

  return null;
}

export function buildQualityReviewPayload(input: {
  form: QualityReviewForm;
  bookId: string;
  reviewerId: string;
  now: number;
  serverTimestamp: Timestamp;
}): Omit<QualityReview, "id"> {
  const storyScore = parseQualityScore(input.form.storyScore)!;
  const illustrationScore = parseQualityScore(input.form.illustrationScore)!;
  const characterConsistencyScore = parseQualityScore(input.form.characterConsistencyScore)!;
  const personalizationScore = parseQualityScore(input.form.personalizationScore)!;
  const safetyScore = parseQualityScore(input.form.safetyScore)!;

  const overallScore = calculateOverallQualityScore({
    storyScore,
    illustrationScore,
    characterConsistencyScore,
    personalizationScore,
    safetyScore,
  });

  return {
    bookId: input.bookId,
    reviewerType: "human" as QualityReviewerType,
    reviewerId: input.reviewerId,
    storyScore,
    illustrationScore,
    characterConsistencyScore,
    personalizationScore,
    safetyScore,
    overallScore,
    status: input.form.status,
    reviewReason: input.form.reviewReason.trim(),
    flaggedIssues: splitTextareaLines(input.form.flaggedIssues),
    recommendedFixes: splitTextareaLines(input.form.recommendedFixes),
    rubricVersion: QUALITY_RUBRIC_VERSION,
    createdAt: input.serverTimestamp,
    createdAtMs: input.now,
    updatedAt: input.serverTimestamp,
    updatedAtMs: input.now,
  };
}

export function buildQualitySummaryPayload(input: {
  reviewId: string;
  form: QualityReviewForm;
  now: number;
  serverTimestamp: Timestamp;
}): Record<string, unknown> {
  const storyScore = parseQualityScore(input.form.storyScore)!;
  const illustrationScore = parseQualityScore(input.form.illustrationScore)!;
  const characterConsistencyScore = parseQualityScore(input.form.characterConsistencyScore)!;
  const personalizationScore = parseQualityScore(input.form.personalizationScore)!;
  const safetyScore = parseQualityScore(input.form.safetyScore)!;

  const overallScore = calculateOverallQualityScore({
    storyScore,
    illustrationScore,
    characterConsistencyScore,
    personalizationScore,
    safetyScore,
  });

  return {
    latestQualityReviewId: input.reviewId,
    qualityReviewStatus: input.form.status,
    storyQualityScore: storyScore,
    illustrationQualityScore: illustrationScore,
    characterConsistencyScore,
    personalizationScore,
    safetyScore,
    overallQualityScore: overallScore,
    qualityReviewedAt: input.serverTimestamp,
    qualityReviewedAtMs: input.now,
    qualityReviewerType: "human" as QualityReviewerType,
  };
}

/* ------------------------------------------------------------------ */
/*  Quality Recommendation                                             */
/* ------------------------------------------------------------------ */

export type QualityRecommendationAction =
  | "rewrite_story"
  | "regenerate_images"
  | "fix_character_consistency"
  | "improve_personalization"
  | "human_review_required"
  | "approve";

export type QualityRecommendation = {
  action: QualityRecommendationAction;
  severity: "low" | "medium" | "high";
  reason: string;
};

export function buildQualityRecommendations(
  book: BookDoc,
): QualityRecommendation[] {
  // No scores yet → no recommendations
  if (book.overallQualityScore == null) return [];

  const recs: QualityRecommendation[] = [];

  if ((book.safetyScore ?? 0) > 0 && book.safetyScore! <= 2) {
    recs.push({
      action: "human_review_required",
      severity: "high",
      reason: `Safety score が ${book.safetyScore} — 人間による安全性確認が必要です`,
    });
  }

  if ((book.storyQualityScore ?? 0) > 0 && book.storyQualityScore! <= 2) {
    recs.push({
      action: "rewrite_story",
      severity: "high",
      reason: `Story score が ${book.storyQualityScore} — ストーリーの書き直しを推奨します`,
    });
  }

  if ((book.illustrationQualityScore ?? 0) > 0 && book.illustrationQualityScore! <= 2) {
    recs.push({
      action: "regenerate_images",
      severity: "high",
      reason: `Illustration score が ${book.illustrationQualityScore} — 画像の再生成を推奨します`,
    });
  }

  if ((book.characterConsistencyScore ?? 0) > 0 && book.characterConsistencyScore! <= 2) {
    recs.push({
      action: "fix_character_consistency",
      severity: "high",
      reason: `Character consistency score が ${book.characterConsistencyScore} — キャラクター一貫性の改善が必要です`,
    });
  }

  if ((book.personalizationScore ?? 0) > 0 && book.personalizationScore! <= 2) {
    recs.push({
      action: "improve_personalization",
      severity: "medium",
      reason: `Personalization score が ${book.personalizationScore} — パーソナライズの改善を推奨します`,
    });
  }

  if (
    book.overallQualityScore >= 4.2 &&
    book.qualityReviewStatus === "approved"
  ) {
    recs.push({
      action: "approve",
      severity: "low",
      reason: `Overall score ${book.overallQualityScore} / Approved — 品質基準を満たしています`,
    });
  }

  return recs;
}

/* ------------------------------------------------------------------ */
/*  Recommendation Intent (action button導線)                          */
/* ------------------------------------------------------------------ */

export type QualityRecommendationIntent =
  | "prepare_story_rewrite"
  | "review_image_regeneration"
  | "review_character_consistency"
  | "review_personalization_inputs"
  | "require_human_safety_review"
  | "confirm_approval";

export const RECOMMENDATION_INTENT_MAP: Record<
  QualityRecommendationAction,
  QualityRecommendationIntent
> = {
  rewrite_story: "prepare_story_rewrite",
  regenerate_images: "review_image_regeneration",
  fix_character_consistency: "review_character_consistency",
  improve_personalization: "review_personalization_inputs",
  human_review_required: "require_human_safety_review",
  approve: "confirm_approval",
};

export const RECOMMENDATION_INTENT_LABELS: Record<QualityRecommendationIntent, string> = {
  prepare_story_rewrite: "Story 確認へ",
  review_image_regeneration: "画像確認へ",
  review_character_consistency: "キャラクター確認へ",
  review_personalization_inputs: "パーソナライズ確認へ",
  require_human_safety_review: "安全性確認へ",
  confirm_approval: "承認済み",
};

export const RECOMMENDATION_INTENT_DESCRIPTIONS: Record<QualityRecommendationIntent, string> = {
  prepare_story_rewrite: "ストーリーテキストを確認し、書き直しが必要か判断します",
  review_image_regeneration: "画像を確認し、再生成が必要なページを特定します",
  review_character_consistency: "各ページのキャラクター描写の一貫性を確認します",
  review_personalization_inputs: "子どもの名前・好みなどのパーソナライズ反映を確認します",
  require_human_safety_review: "安全性に関する内容を目視で確認します",
  confirm_approval: "品質基準を満たしており、承認済みです",
};
