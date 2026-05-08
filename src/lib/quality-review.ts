import type {
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
