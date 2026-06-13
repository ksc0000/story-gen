import type {
  BookDoc,
  PageDoc,
  QualityReview,
  QualityReviewScore,
  QualityReviewStatus,
  QualityReviewerType,
  QualityTaskChecklistItem,
  QualityTaskDoc,
  QualityTaskIntent,
  Timestamp,
} from "@/lib/types";

export const QUALITY_RUBRIC_VERSION = "phase2-quality-v1";

export type QualityReviewForm = {
  storyScore: string;
  illustrationScore: string;
  characterConsistencyScore: string;
  personalizationScore: string;
  safetyScore: string;

  // Granular Story
  story_childPersonalization: string;
  story_storyCoherence: string;
  story_ageAppropriateness: string;
  story_emotionalSatisfaction: string;
  story_pageLengthBalance: string;
  story_characterConsistency: string;
  story_endingSatisfaction: string;

  // Granular Illustration
  illust_promptCompleteness: string;
  illust_visualConsistency: string;
  illust_characterConsistency: string;
  illust_sceneRelevance: string;
  illust_styleConsistency: string;
  illust_artifactAvoidance: string;

  // Granular Character Consistency
  char_visualBibleReflected: string;
  char_characterIdConsistency: string;
  char_appearingCharacterConsistency: string;
  char_focusCharacterConsistency: string;
  char_pageLevelCharacterLinkage: string;
  char_outfitHairstyleConsistency: string;
  char_colorPaletteConsistency: string;

  // Granular Personalization
  pers_childProfileUsage: string;
  pers_nameNicknameUsage: string;
  pers_favoriteThings: string;
  pers_familyContext: string;
  pers_memoryEventContext: string;
  pers_overPersonalizationRisk: string;

  // Granular Safety
  safe_ageAppropriateVocabulary: string;
  safe_notTooScary: string;
  safe_dangerAvoidance: string;
  safe_familyFriendlyPeace: string;
  safe_privacyConsideration: string;

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

    // Granular Story
    story_childPersonalization: "",
    story_storyCoherence: "",
    story_ageAppropriateness: "",
    story_emotionalSatisfaction: "",
    story_pageLengthBalance: "",
    story_characterConsistency: "",
    story_endingSatisfaction: "",

    // Granular Illustration
    illust_promptCompleteness: "",
    illust_visualConsistency: "",
    illust_characterConsistency: "",
    illust_sceneRelevance: "",
    illust_styleConsistency: "",
    illust_artifactAvoidance: "",

    // Granular Character Consistency
    char_visualBibleReflected: "",
    char_characterIdConsistency: "",
    char_appearingCharacterConsistency: "",
    char_focusCharacterConsistency: "",
    char_pageLevelCharacterLinkage: "",
    char_outfitHairstyleConsistency: "",
    char_colorPaletteConsistency: "",

    // Granular Personalization
    pers_childProfileUsage: "",
    pers_nameNicknameUsage: "",
    pers_favoriteThings: "",
    pers_familyContext: "",
    pers_memoryEventContext: "",
    pers_overPersonalizationRisk: "",

    // Granular Safety
    safe_ageAppropriateVocabulary: "",
    safe_notTooScary: "",
    safe_dangerAvoidance: "",
    safe_familyFriendlyPeace: "",
    safe_privacyConsideration: "",

    status: "human_reviewed",
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

/**
 * Calculate a 0-100 category score from 1-5 axis scores using weights.
 * @param axisScores Map of axis key to 1-5 score
 * @param weights Map of axis key to point weight (total should be 100)
 */
export function calculateCategoryScoreFromAxes(
  axisScores: Record<string, QualityReviewScore | null>,
  weights: Record<string, number>
): number {
  let totalPoints = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = axisScores[key];
    if (score == null) continue;
    // Map 1-5 to 20%-100% of the weight
    const points = (score / 5) * weight;
    totalPoints += points;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  // Scale back to 100 if only some axes were scored
  return Math.round((totalPoints / totalWeight) * 100);
}

export const STORY_AXIS_WEIGHTS = {
  childPersonalization: 20,
  storyCoherence: 20,
  ageAppropriateness: 15,
  emotionalSatisfaction: 15,
  pageLengthBalance: 10,
  characterConsistency: 10,
  endingSatisfaction: 10,
};

export const ILLUSTRATION_AXIS_WEIGHTS = {
  promptCompleteness: 20,
  visualConsistency: 20,
  characterConsistency: 20,
  sceneRelevance: 15,
  styleConsistency: 15,
  artifactAvoidance: 10,
};

export const CHARACTER_AXIS_WEIGHTS = {
  visualBibleReflected: 15,
  characterIdConsistency: 10,
  appearingCharacterConsistency: 15,
  focusCharacterConsistency: 15,
  pageLevelCharacterLinkage: 15,
  outfitHairstyleConsistency: 15,
  colorPaletteConsistency: 15,
};

export const PERSONALIZATION_AXIS_WEIGHTS = {
  childProfileUsage: 20,
  nameNicknameUsage: 15,
  favoriteThings: 20,
  familyContext: 15,
  memoryEventContext: 20,
  overPersonalizationRisk: 10,
};

export const SAFETY_AXIS_WEIGHTS = {
  ageAppropriateVocabulary: 20,
  notTooScary: 20,
  dangerAvoidance: 20,
  familyFriendlyPeace: 20,
  privacyConsideration: 20,
};

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
    case "human_reviewed":
      return "Reviewed (Human)";
    case "llm_reviewed":
      return "Reviewed (LLM)";
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
    case "human_reviewed":
      return "bg-blue-100 text-blue-800";
    case "llm_reviewed":
      return "bg-violet-100 text-violet-800";
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

  const payload: Omit<QualityReview, "id"> = {
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
    flaggedIssues: splitTextareaLines(input.form.flaggedIssues).map((message) => ({
      severity: "low" as const,
      area: "story" as const,
      message,
    })),
    recommendedFixes: splitTextareaLines(input.form.recommendedFixes).map((reason) => ({
      action: "human_review_required" as const,
      reason,
    })),
    rubricVersion: QUALITY_RUBRIC_VERSION,
    createdAt: input.serverTimestamp,
    createdAtMs: input.now,
    updatedAt: input.serverTimestamp,
    updatedAtMs: input.now,
  };

  // Add granular axes if available
  const storyAxes = {
    childPersonalization: parseQualityScore(input.form.story_childPersonalization),
    storyCoherence: parseQualityScore(input.form.story_storyCoherence),
    ageAppropriateness: parseQualityScore(input.form.story_ageAppropriateness),
    emotionalSatisfaction: parseQualityScore(input.form.story_emotionalSatisfaction),
    pageLengthBalance: parseQualityScore(input.form.story_pageLengthBalance),
    characterConsistency: parseQualityScore(input.form.story_characterConsistency),
    endingSatisfaction: parseQualityScore(input.form.story_endingSatisfaction),
  };
  if (Object.values(storyAxes).every((v) => v !== null)) {
    payload.storyAxes = storyAxes as any;
  }

  const illustrationAxes = {
    promptCompleteness: parseQualityScore(input.form.illust_promptCompleteness),
    visualConsistency: parseQualityScore(input.form.illust_visualConsistency),
    characterConsistency: parseQualityScore(input.form.illust_characterConsistency),
    sceneRelevance: parseQualityScore(input.form.illust_sceneRelevance),
    styleConsistency: parseQualityScore(input.form.illust_styleConsistency),
    artifactAvoidance: parseQualityScore(input.form.illust_artifactAvoidance),
  };
  if (Object.values(illustrationAxes).every((v) => v !== null)) {
    payload.illustrationAxes = illustrationAxes as any;
  }

  const characterAxes = {
    visualBibleReflected: parseQualityScore(input.form.char_visualBibleReflected),
    characterIdConsistency: parseQualityScore(input.form.char_characterIdConsistency),
    appearingCharacterConsistency: parseQualityScore(input.form.char_appearingCharacterConsistency),
    focusCharacterConsistency: parseQualityScore(input.form.char_focusCharacterConsistency),
    pageLevelCharacterLinkage: parseQualityScore(input.form.char_pageLevelCharacterLinkage),
    outfitHairstyleConsistency: parseQualityScore(input.form.char_outfitHairstyleConsistency),
    colorPaletteConsistency: parseQualityScore(input.form.char_colorPaletteConsistency),
  };
  if (Object.values(characterAxes).every((v) => v !== null)) {
    payload.characterAxes = characterAxes as any;
  }

  const personalizationAxes = {
    childProfileUsage: parseQualityScore(input.form.pers_childProfileUsage),
    nameNicknameUsage: parseQualityScore(input.form.pers_nameNicknameUsage),
    favoriteThings: parseQualityScore(input.form.pers_favoriteThings),
    familyContext: parseQualityScore(input.form.pers_familyContext),
    memoryEventContext: parseQualityScore(input.form.pers_memoryEventContext),
    overPersonalizationRisk: parseQualityScore(input.form.pers_overPersonalizationRisk),
  };
  if (Object.values(personalizationAxes).every((v) => v !== null)) {
    payload.personalizationAxes = personalizationAxes as any;
  }

  const safetyAxes = {
    ageAppropriateVocabulary: parseQualityScore(input.form.safe_ageAppropriateVocabulary),
    notTooScary: parseQualityScore(input.form.safe_notTooScary),
    dangerAvoidance: parseQualityScore(input.form.safe_dangerAvoidance),
    familyFriendlyPeace: parseQualityScore(input.form.safe_familyFriendlyPeace),
    privacyConsideration: parseQualityScore(input.form.safe_privacyConsideration),
  };
  if (Object.values(safetyAxes).every((v) => v !== null)) {
    payload.safetyAxes = safetyAxes as any;
  }

  return payload;
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

  const payload: Record<string, unknown> = {
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

  // Add granular axes if available
  const storyAxes = {
    childPersonalization: parseQualityScore(input.form.story_childPersonalization),
    storyCoherence: parseQualityScore(input.form.story_storyCoherence),
    ageAppropriateness: parseQualityScore(input.form.story_ageAppropriateness),
    emotionalSatisfaction: parseQualityScore(input.form.story_emotionalSatisfaction),
    pageLengthBalance: parseQualityScore(input.form.story_pageLengthBalance),
    characterConsistency: parseQualityScore(input.form.story_characterConsistency),
    endingSatisfaction: parseQualityScore(input.form.story_endingSatisfaction),
  };
  if (Object.values(storyAxes).every((v) => v !== null)) payload.storyAxes = storyAxes;

  const illustrationAxes = {
    promptCompleteness: parseQualityScore(input.form.illust_promptCompleteness),
    visualConsistency: parseQualityScore(input.form.illust_visualConsistency),
    characterConsistency: parseQualityScore(input.form.illust_characterConsistency),
    sceneRelevance: parseQualityScore(input.form.illust_sceneRelevance),
    styleConsistency: parseQualityScore(input.form.illust_styleConsistency),
    artifactAvoidance: parseQualityScore(input.form.illust_artifactAvoidance),
  };
  if (Object.values(illustrationAxes).every((v) => v !== null)) payload.illustrationAxes = illustrationAxes;

  const characterAxes = {
    visualBibleReflected: parseQualityScore(input.form.char_visualBibleReflected),
    characterIdConsistency: parseQualityScore(input.form.char_characterIdConsistency),
    appearingCharacterConsistency: parseQualityScore(input.form.char_appearingCharacterConsistency),
    focusCharacterConsistency: parseQualityScore(input.form.char_focusCharacterConsistency),
    pageLevelCharacterLinkage: parseQualityScore(input.form.char_pageLevelCharacterLinkage),
    outfitHairstyleConsistency: parseQualityScore(input.form.char_outfitHairstyleConsistency),
    colorPaletteConsistency: parseQualityScore(input.form.char_colorPaletteConsistency),
  };
  if (Object.values(characterAxes).every((v) => v !== null)) payload.characterAxes = characterAxes;

  const personalizationAxes = {
    childProfileUsage: parseQualityScore(input.form.pers_childProfileUsage),
    nameNicknameUsage: parseQualityScore(input.form.pers_nameNicknameUsage),
    favoriteThings: parseQualityScore(input.form.pers_favoriteThings),
    familyContext: parseQualityScore(input.form.pers_familyContext),
    memoryEventContext: parseQualityScore(input.form.pers_memoryEventContext),
    overPersonalizationRisk: parseQualityScore(input.form.pers_overPersonalizationRisk),
  };
  if (Object.values(personalizationAxes).every((v) => v !== null)) payload.personalizationAxes = personalizationAxes;

  const safetyAxes = {
    ageAppropriateVocabulary: parseQualityScore(input.form.safe_ageAppropriateVocabulary),
    notTooScary: parseQualityScore(input.form.safe_notTooScary),
    dangerAvoidance: parseQualityScore(input.form.safe_dangerAvoidance),
    familyFriendlyPeace: parseQualityScore(input.form.safe_familyFriendlyPeace),
    privacyConsideration: parseQualityScore(input.form.safe_privacyConsideration),
  };
  if (Object.values(safetyAxes).every((v) => v !== null)) payload.safetyAxes = safetyAxes;

  return payload;
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

// ---------------------------------------------------------------------------
// Recommendation Candidate Highlighting
// ---------------------------------------------------------------------------

export type PageHighlightLevel = "strong" | "subtle" | "none";

export type SectionHighlight = {
  bookDetail: boolean;
  inputAndProfile: boolean;
  storyText: boolean;
  pages: boolean;
};

const IMAGE_DURATION_WARN_MS = 120_000;

/**
 * Determine highlight level for a single page given the active intent.
 * - "strong": this page likely needs attention (failed, fallback, slow)
 * - "subtle": this page is in scope for review but not flagged
 * - "none": no highlighting
 */
export function getPageHighlightLevel(
  intent: QualityRecommendationIntent | null,
  page: PageDoc,
): PageHighlightLevel {
  if (!intent) return "none";

  switch (intent) {
    case "review_image_regeneration": {
      if (
        page.status === "image_failed" ||
        page.status === "fallback_completed" ||
        (page.imageDurationMs ?? 0) > IMAGE_DURATION_WARN_MS ||
        page.imageFallbackUsed
      ) {
        return "strong";
      }
      return "subtle";
    }
    case "review_character_consistency": {
      if (
        (page.appearingCharacterIds?.length ?? 0) > 0 ||
        page.usedCharacterReference ||
        page.focusCharacterId
      ) {
        return "strong";
      }
      return "subtle";
    }
    case "prepare_story_rewrite":
    case "require_human_safety_review":
      return "subtle";
    default:
      return "none";
  }
}

/**
 * Determine which sections of the book detail should be highlighted.
 */
export function getSectionHighlights(
  intent: QualityRecommendationIntent | null,
): SectionHighlight {
  const none: SectionHighlight = {
    bookDetail: false,
    inputAndProfile: false,
    storyText: false,
    pages: false,
  };
  if (!intent) return none;

  switch (intent) {
    case "review_image_regeneration":
      return { ...none, pages: true };
    case "review_character_consistency":
      return { ...none, pages: true };
    case "prepare_story_rewrite":
      return { ...none, storyText: true, bookDetail: true };
    case "review_personalization_inputs":
      return { ...none, inputAndProfile: true, bookDetail: true };
    case "require_human_safety_review":
      return { ...none, storyText: true, pages: true };
    case "confirm_approval":
      return none;
  }
}

// ---------------------------------------------------------------------------
// Recommendation Task Draft
// ---------------------------------------------------------------------------

export interface TaskDraftItem {
  label: string;
  detail: string;
}

export interface TaskDraft {
  title: string;
  intent: QualityRecommendationIntent;
  checklist: TaskDraftItem[];
  summary: string;
}

/**
 * Build a copyable task draft for the given intent + book + pages.
 * Pure function — no Firestore writes.
 */
export function buildTaskDraft(
  intent: QualityRecommendationIntent,
  book: BookDoc & { id: string },
  pages: PageDoc[],
): TaskDraft {
  switch (intent) {
    case "prepare_story_rewrite": {
      const warnings = book.storyQualityWarnings ?? [];
      const textPreviewCount = book.generatedTextPreview?.length ?? 0;
      const checklist: TaskDraftItem[] = [
        { label: "generatedTextPreview を確認", detail: `${textPreviewCount} ページ分のテキストを通読する` },
        { label: "storyQualityWarnings を確認", detail: warnings.length > 0 ? warnings.join(", ") : "warning なし" },
        { label: "storyGoal との整合性確認", detail: `storyGoal: ${book.storyGoal ?? "未設定"}` },
        { label: "年齢適切性の確認", detail: `theme: ${book.theme}` },
      ];
      if (book.storyTextRewriteUsed) {
        checklist.push({ label: "既に rewrite 実施済み", detail: `model: ${book.storyTextRewriteModel ?? "—"}, attempts: ${book.storyTextRewriteAttempts ?? "—"}` });
      }
      return {
        title: "Story Rewrite 確認タスク",
        intent,
        checklist,
        summary: `Book ${book.id} のストーリーテキストを確認し、書き直しが必要か判断する。`,
      };
    }

    case "review_image_regeneration": {
      const failedPages = pages.filter((p) => p.status === "image_failed");
      const fallbackPages = pages.filter((p) => p.status === "fallback_completed" || p.imageFallbackUsed);
      const slowPages = pages.filter((p) => (p.imageDurationMs ?? 0) > IMAGE_DURATION_WARN_MS);
      const checklist: TaskDraftItem[] = [
        { label: "image_failed ページ", detail: failedPages.length > 0 ? `page ${failedPages.map((p) => p.pageNumber + 1).join(", ")}` : "なし" },
        { label: "fallback 使用ページ", detail: fallbackPages.length > 0 ? `page ${fallbackPages.map((p) => p.pageNumber + 1).join(", ")}` : "なし" },
        { label: "生成時間 > 120s のページ", detail: slowPages.length > 0 ? `page ${slowPages.map((p) => p.pageNumber + 1).join(", ")}` : "なし" },
        { label: "全体の画像成功率", detail: `${book.imageSuccessCount ?? "—"} / ${book.totalImageCount ?? "—"}` },
      ];
      return {
        title: "画像再生成 確認タスク",
        intent,
        checklist,
        summary: `Book ${book.id} の画像品質を確認し、再生成が必要なページを特定する。問題ページ: ${failedPages.length + fallbackPages.length + slowPages.length} 件。`,
      };
    }

    case "review_character_consistency": {
      const charPages = pages.filter((p) =>
        (p.appearingCharacterIds?.length ?? 0) > 0 || p.usedCharacterReference || p.focusCharacterId,
      );
      const castCount = book.storyCast?.length ?? 0;
      const checklist: TaskDraftItem[] = [
        { label: "storyCast 登録数", detail: `${castCount} キャラクター` },
        { label: "キャラクター登場ページ", detail: charPages.length > 0 ? `page ${charPages.map((p) => p.pageNumber + 1).join(", ")}` : "なし" },
        { label: "characterConsistencyMode", detail: book.characterConsistencyMode ?? "未設定" },
        { label: "各ページの focusCharacterId を比較", detail: "ページ間で描写が一貫しているか確認" },
      ];
      return {
        title: "キャラクター一貫性 確認タスク",
        intent,
        checklist,
        summary: `Book ${book.id} の ${castCount} キャラクターの描写一貫性を確認する。キャラクター登場ページ: ${charPages.length} 件。`,
      };
    }

    case "review_personalization_inputs": {
      const snapshot = book.childProfileSnapshot;
      const hasName = !!snapshot?.displayName;
      const checklist: TaskDraftItem[] = [
        { label: "子どもの名前", detail: hasName ? "設定あり（画面上で確認）" : "未設定" },
        { label: "childProfileSnapshot を確認", detail: snapshot ? "設定あり — 内容を展開して確認" : "未設定" },
        { label: "input を確認", detail: "作成時の入力パラメータを確認" },
        { label: "personalizationScore", detail: `${book.personalizationScore ?? "未評価"} / 5` },
      ];
      return {
        title: "パーソナライズ 確認タスク",
        intent,
        checklist,
        summary: `Book ${book.id} のパーソナライズ反映を確認する。`,
      };
    }

    case "require_human_safety_review": {
      const safetyWarnings = (book.storyQualityWarnings ?? []).filter((w) =>
        /safety|violence|inappropriate|harmful/i.test(w),
      );
      const checklist: TaskDraftItem[] = [
        { label: "safetyScore", detail: `${book.safetyScore ?? "未評価"} / 5` },
        { label: "safety 関連 warnings", detail: safetyWarnings.length > 0 ? safetyWarnings.join(", ") : "なし" },
        { label: "全ページのテキストを目視確認", detail: `${pages.length} ページ` },
        { label: "全ページの画像を目視確認", detail: `${pages.length} ページ` },
        { label: "storyGoal との整合性", detail: `storyGoal: ${book.storyGoal ?? "未設定"}` },
      ];
      return {
        title: "安全性 確認タスク",
        intent,
        checklist,
        summary: `Book ${book.id} の安全性を人手で確認する。safetyScore: ${book.safetyScore ?? "未評価"}。`,
      };
    }

    case "confirm_approval":
      return {
        title: "承認済み",
        intent,
        checklist: [],
        summary: `Book ${book.id} は品質基準を満たしており、タスクはありません。`,
      };
  }
}

// ---------------------------------------------------------------------------
// Quality Task Payload Builder
// ---------------------------------------------------------------------------

/**
 * Build a Firestore-ready payload for qualityTasks collection.
 * Pure function — no Firestore writes.
 * PII-safe: uses buildTaskDraft() which excludes displayName/nickname.
 */
export function buildQualityTaskPayload(
  intent: QualityRecommendationIntent,
  book: BookDoc & { id: string },
  pages: PageDoc[],
  adminUid: string,
): Omit<QualityTaskDoc, "createdAt" | "updatedAt" | "resolvedAt"> {
  const draft = buildTaskDraft(intent, book, pages);
  const now = Date.now();

  const checklist: QualityTaskChecklistItem[] = draft.checklist.map((item) => ({
    label: item.label,
    detail: item.detail,
    checked: false,
  }));

  return {
    bookId: book.id,
    intent: intent as QualityTaskIntent,
    title: draft.title,
    checklist,
    summary: draft.summary,
    status: "open",
    createdBy: adminUid,
    assignedTo: null,
    resolvedBy: null,
    resolvedAtMs: null,
    resolutionNote: "",
    sourceOverallScore: book.overallQualityScore ?? null,
    sourceQualityReviewStatus: book.qualityReviewStatus ?? null,
    createdAtMs: now,
    updatedAtMs: now,
  };
}
