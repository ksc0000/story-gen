import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import type {
  BookData,
  TemplateData,
  LLMClient,
  ImageClient,
  PageData,
  BookInput,
  ImagePurpose,
  FixedStoryTemplate,
  GeneratedStory,
  AgeBand,
  CharacterConsistencyMode,
  StoryCharacter,
  StoryCharacterRole,
  ScenePolicy,
  InputImageRole,
  InputImageSource,
  StoryCharacterKind,
  ImageModelProfile,
  CoverStatus,
} from "./lib/types";
import { sanitizeInput } from "./lib/content-filter";
import {
  buildSystemPrompt,
  buildImagePrompt,
  buildCoverImagePrompt,
  buildP5SimplifiedPagePrompt,
  appendQualityRetryInstruction,
  buildFinalCharacterBible,
  buildCharacterConsistencyRules,
} from "./lib/prompt-builder";
import { GeminiClient, GeminiServiceUnavailableError, resolveStoryModelCandidates, getParseErrorDiagnostics } from "./lib/gemini";
import {
  ReplicateImageClient,
  resolveImageModelProfile,
  resolveReplicateModel,
  resolveImageFallbackProfiles,
  isCandidateProfile,
  isSaferRetryEnabled,
  withImageTimeout,
  ImageTimeoutError,
} from "./lib/replicate";
import { OpenAIImageClient, OPENAI_IMAGE_CANDIDATE_PROFILE, resolveOpenAIModelLabel } from "./lib/openai-image";
import { getDefaultProductPlanForCreationMode, getPlanConfig } from "./lib/plans";
import { canUseProductPlan } from "./lib/entitlements";
import { canGenerateBookThisMonth } from "./lib/usage";
import { getAgeReadingProfile, type AgeReadingProfile } from "./lib/age-reading-profile";
import {
  validateGeneratedStoryQuality,
  toFirestoreStoryQualityReport,
  countJapaneseTextChars,
  countSentences,
  type StoryQualityReport,
} from "./lib/story-quality";
import { analyzePromptCompleteness } from "./lib/prompt-analyzer";
import { removeUndefinedDeep } from "./lib/firestore-sanitize";
import { getIllustrationStyleProfile } from "./lib/illustration-styles";
import { generateCoverImageWithFallback } from "./controllers/imageGeneration";
import {
  getStyleTemplateExposure,
  isAllowedStyleExposureStatus,
} from "./lib/style-exposure";
import {
  logGenerationEvent,
  logPromptAnalysis,
  categorizeError,
  classifyError,
  classifyStoryJsonFailure,
  resolveProviderFromProfile,
  type CandidateDecision,
} from "./lib/generation-event-logger";
import { ReplicateImageAdapter } from "./lib/replicate-image-adapter";
import { OpenAIImageAdapter } from "./lib/openai-image-adapter";
import {
  makePageUploader,
  makeCharacterReferenceUploader,
  type PageImageUploadFn,
} from "./lib/image-storage-uploader";
import { PROFILE_PROVIDER_MAP } from "./lib/image-provider";
import { createImageAdapter, resolveImageProviderId } from "./lib/image-adapter-factory";

// 画像生成のタイムアウト（フォールバック発火までの時間）。
// 既定 120s だと flux-2-pro が間に合わず klein_fast へフォールバックして画質が
// ばらつくため、3倍の 360s に引き上げ（2026-06）。env で上書き可能。
const IMAGE_GENERATION_TIMEOUT_MS = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? "360000");
const IMAGE_CONCURRENCY = Math.max(1, Math.min(5, Number(process.env.IMAGE_CONCURRENCY ?? "2")));

// P3-15: USE_REPLICATE_ADAPTER and USE_OPENAI_ADAPTER feature flags removed.
// Adapter path is now the canonical page generation path (no env var gate required).
// Routing is determined by PROFILE_PROVIDER_MAP[profile] when adapter tokens are present.
const PUBLIC_SITE_URL = "https://story-gen-8a769.web.app";
const GEMINI_RETRYABLE_USER_MESSAGE =
  "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。";
const STORY_SCHEMA_FAILURE_USER_MESSAGE =
  "絵本の構成データを整える途中で失敗しました。入力内容が原因ではない可能性があります。もう一度お試しください。";
const STORY_QUALITY_FAILURE_USER_MESSAGE =
  "絵本の内容を整えきれませんでした。もう一度作成すると、別の構成で成功する場合があります。";
const STYLE_EXPOSURE_BLOCKED_USER_MESSAGE =
  "この絵のタッチは、今はこのテンプレートでは選べません。別のタッチを選んでください。";

function createUpdatedAtPatch() {
  return {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
  };
}

function createGenerationStartedPatch() {
  return {
    generationStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    generationStartedAtMs: Date.now(),
    ...createUpdatedAtPatch(),
  };
}

function createCompletedAtPatch() {
  return {
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAtMs: Date.now(),
    ...createUpdatedAtPatch(),
  };
}

function createFailedAtPatch() {
  return {
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    failedAtMs: Date.now(),
    ...createUpdatedAtPatch(),
  };
}

function buildFailureMetadata<T extends Record<string, unknown>>(data: T) {
  return {
    ...removeUndefinedDeep(data),
    ...createFailedAtPatch(),
  };
}

export function sanitizeStoryCastForFirestore(cast?: GeneratedStory["cast"]): GeneratedStory["cast"] | undefined {
  if (!cast?.length) {
    return undefined;
  }

  const sanitized = cast
    .filter(
      (character) =>
        Boolean(character?.characterId) &&
        Boolean(character?.displayName) &&
        Boolean(character?.role) &&
        Boolean(character?.visualBible)
    )
    .map((character) =>
      removeUndefinedDeep({
        characterId: character.characterId,
        displayName: character.displayName,
        role: character.role,
        visualBible: character.visualBible,
        characterKind: character.characterKind,
        nonHuman: character.nonHuman,
        noHumanFace: character.noHumanFace,
        noHumanBody: character.noHumanBody,
        scaleHint: character.scaleHint,
        silhouette: character.silhouette,
        colorPalette: character.colorPalette,
        signatureItems: character.signatureItems,
        doNotChange: character.doNotChange,
        negativeCharacterRules: character.negativeCharacterRules,
        canChangeByScene: character.canChangeByScene,
        referenceImageUrl: character.referenceImageUrl,
        approvedImageUrl: character.approvedImageUrl,
        generatedReferenceImageUrl: character.generatedReferenceImageUrl,
        referenceImageGeneratedAt: character.referenceImageGeneratedAt,
        referenceImagePrompt: character.referenceImagePrompt,
        referenceImageStatus: character.referenceImageStatus,
      })
    );

  return sanitized.length > 0 ? sanitized : undefined;
}

export function normalizeStoryCastWithChildProfile(
  story: GeneratedStory,
  childProfileSnapshot?: BookData["childProfileSnapshot"]
): GeneratedStory {
  if (!childProfileSnapshot) {
    return story;
  }

  const protagonistId = resolveProtagonistCharacterId(story, childProfileSnapshot);
  const protagonistDisplayName =
    childProfileSnapshot.nickname || childProfileSnapshot.displayName || "主人公";
  const visualProfile = childProfileSnapshot.visualProfile;
  const signatureItems = [
    visualProfile.signatureItem,
    ...(story.cast ?? [])
      .filter((character) => character.characterId === protagonistId || character.role === "protagonist")
      .flatMap((character) => character.signatureItems ?? []),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
  const doNotChange = [
    visualProfile.characterLook ? `Do not change the child's look: ${visualProfile.characterLook}.` : undefined,
    visualProfile.outfit ? `Do not change the outfit: ${visualProfile.outfit}.` : undefined,
    visualProfile.signatureItem ? `Do not remove the signature item: ${visualProfile.signatureItem}.` : undefined,
    ...(story.cast ?? [])
      .filter((character) => character.characterId === protagonistId || character.role === "protagonist")
      .flatMap((character) => character.doNotChange ?? []),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);
  const existingProtagonist =
    story.cast?.find((character) => character.characterId === protagonistId) ??
    story.cast?.find((character) => character.role === "protagonist");

  const wrongName = existingProtagonist?.displayName;
  const fixName = (text: string | undefined): string | undefined => {
    if (!text || !wrongName || wrongName === protagonistDisplayName) return text;
    return text.split(wrongName).join(protagonistDisplayName);
  };
  const validateName = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    if (!text.includes(protagonistDisplayName)) {
      logger.warn("Protagonist name mismatch detected in story text", {
        field: fieldName,
        expected: protagonistDisplayName,
        text: text.slice(0, 100),
      });
    }
  };

  const correctedTitle = fixName(story.title) ?? story.title;
  const correctedStoryGoal = fixName(story.storyGoal);
  const correctedOpeningNarration = fixName(story.openingNarration);
  const correctedTitleSpreadText = fixName(story.titleSpreadText);

  validateName(correctedTitle, "title");
  validateName(correctedStoryGoal, "storyGoal");
  validateName(correctedOpeningNarration, "openingNarration");
  validateName(correctedTitleSpreadText, "titleSpreadText");

  const protagonistCast: StoryCharacter = removeUndefinedDeep({
    characterId: protagonistId,
    displayName: protagonistDisplayName,
    role: "protagonist" satisfies StoryCharacterRole,
    characterKind: "human_child" satisfies StoryCharacterKind,
    nonHuman: false,
    noHumanFace: false,
    noHumanBody: false,
    visualBible:
      visualProfile.characterBible ||
      existingProtagonist?.visualBible ||
      story.characterBible,
    silhouette: existingProtagonist?.silhouette,
    colorPalette: existingProtagonist?.colorPalette,
    signatureItems: signatureItems.length > 0 ? signatureItems : undefined,
    doNotChange: doNotChange.length > 0 ? doNotChange : undefined,
    canChangeByScene: existingProtagonist?.canChangeByScene,
    referenceImageUrl: visualProfile.referenceImageUrl,
    approvedImageUrl: visualProfile.approvedImageUrl,
  });

  const otherCast = (story.cast ?? []).filter(
    (character) =>
      character.characterId !== protagonistId &&
      character.role !== "protagonist"
  );
  const normalizedPages = story.pages.map((page, index) => {
    const correctedText = fixName(page.text) ?? page.text;
    validateName(correctedText, `pages[${index}].text`);

    return {
      ...page,
      text: correctedText,
      appearingCharacterIds: page.appearingCharacterIds?.map((characterId) =>
        isGeneratedProtagonistId(characterId, childProfileSnapshot) ? protagonistId : characterId
      ),
      focusCharacterId:
        page.focusCharacterId && isGeneratedProtagonistId(page.focusCharacterId, childProfileSnapshot)
          ? protagonistId
          : page.focusCharacterId,
    };
  });

  return {
    ...story,
    title: correctedTitle,
    storyGoal: correctedStoryGoal,
    openingNarration: correctedOpeningNarration,
    titleSpreadText: correctedTitleSpreadText,
    characterBible: visualProfile.characterBible || story.characterBible,
    cast: [protagonistCast, ...otherCast],
    pages: normalizedPages,
  };
}

function inferCharacterKind(character: StoryCharacter): StoryCharacterKind {
  if (character.role === "protagonist") {
    return "human_child";
  }
  if (character.role === "parent") {
    return "human_adult";
  }
  if (character.role === "animal") {
    return "animal";
  }
  if (character.role === "object_character") {
    return "object_character";
  }
  if (character.role === "background_recurring") {
    return "background";
  }
  return "magical_creature";
}

function isHumanLikePrompt(text: string | undefined): boolean {
  if (!text) {
    return false;
  }
  return /\b(child|boy|girl|person|human|fairy child|spirit child)\b/i.test(text);
}

function buildNonHumanRecurringCharacter(character: StoryCharacter): StoryCharacter {
  const isStarLike =
    /star|ほし|星|magic_friend|ひかり|light/i.test(character.characterId) ||
    /star|ほし|星|ひかり|light/i.test(character.displayName) ||
    /star|ほし|星|spark/i.test(character.visualBible);

  const visualBible = isStarLike
    ? "A tiny glowing non-human star creature, about the size of a child's hand. It has a rounded five-point star silhouette, soft golden light, two small expressive eyes, no human body, no human arms like a child, no human legs, no human hairstyle, and no clothing. It floats gently and leaves a faint trail of golden sparkles."
    : "A tiny non-human magical creature with a clear simple silhouette, child-safe expression, no human body, no human clothing, and a small floating presence that is easy to recognize across pages.";

  const doNotChange = [
    "Must remain a non-human recurring character.",
    "Must not become a child, boy, girl, person, fairy child, or second protagonist.",
    isStarLike ? "Must keep a rounded five-point star silhouette." : undefined,
    ...(character.doNotChange ?? []),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  const negativeCharacterRules = [
    "Do not draw this character as a human child.",
    "Do not create a second child protagonist.",
    "Do not give it human hair, human clothes, or human body proportions.",
    ...(character.negativeCharacterRules ?? []),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  const signatureItems = [
    ...(character.signatureItems ?? []),
    ...(isStarLike ? ["soft golden glow", "tiny expressive eyes", "sparkling golden trail"] : []),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  return removeUndefinedDeep({
    ...character,
    characterKind: "magical_creature" satisfies StoryCharacterKind,
    nonHuman: true,
    noHumanFace: true,
    noHumanBody: true,
    scaleHint: character.scaleHint ?? "about the size of a child's hand",
    visualBible: isHumanLikePrompt(character.visualBible) ? visualBible : character.visualBible,
    silhouette:
      character.silhouette ??
      (isStarLike ? "small rounded five-point star silhouette with a soft floating glow" : undefined),
    colorPalette: character.colorPalette ?? (isStarLike ? ["gold", "warm white", "pale yellow"] : undefined),
    signatureItems: signatureItems.length > 0 ? signatureItems : undefined,
    doNotChange: doNotChange.length > 0 ? doNotChange : undefined,
    negativeCharacterRules:
      negativeCharacterRules.length > 0 ? negativeCharacterRules : undefined,
  }) as StoryCharacter;
}

function normalizeRecurringCharacterKinds(story: GeneratedStory): GeneratedStory {
  if (!story.cast?.length) {
    return story;
  }

  return {
    ...story,
    cast: story.cast.map((character) => {
      const characterKind = character.characterKind ?? inferCharacterKind(character);
      const withKind = {
        ...character,
        characterKind,
      } satisfies StoryCharacter;

      if (characterKind === "magical_creature" || characterKind === "object_character") {
        return buildNonHumanRecurringCharacter(withKind);
      }

      if (characterKind === "human_child" && character.role !== "protagonist") {
        return removeUndefinedDeep({
          ...withKind,
          nonHuman: false,
          noHumanFace: false,
          noHumanBody: false,
        }) as StoryCharacter;
      }

      return withKind;
    }),
  };
}

function normalizeStoryForBook(
  story: GeneratedStory,
  bookData: BookData,
  mergedInput: BookInput
): GeneratedStory {
  const withNormalizedCast = normalizeRecurringCharacterKinds(
    normalizeStoryCastWithChildProfile(story, bookData.childProfileSnapshot)
  );

  const withCompanion = normalizeStoryWithCompanion(withNormalizedCast, mergedInput);

  return {
    ...withCompanion,
    forbiddenQuestObjects: sanitizeForbiddenQuestObjects(
      withCompanion.forbiddenQuestObjects,
      bookData,
      mergedInput
    ),
  };
}

/**
 * Ensures the companion character is correctly registered in the cast and appears
 * in at least 50% of the pages.
 */
export function normalizeStoryWithCompanion(
  story: GeneratedStory,
  mergedInput: BookInput
): GeneratedStory {
  const { companionId, companionName, companionVisualDescription } = mergedInput;
  if (!companionId || !companionName || !companionVisualDescription) {
    return story;
  }

  const companionCharacterId = "companion_character";
  const companionNameLower = companionName.toLowerCase();

  // 1. Check if companion is already in cast
  const existingCompanion = story.cast?.find(
    (c) =>
      c.characterId === companionCharacterId ||
      c.displayName.toLowerCase().includes(companionNameLower) ||
      companionNameLower.includes(c.displayName.toLowerCase())
  );

  let updatedCast = story.cast ? [...story.cast] : [];
  let effectiveCompanionId = companionCharacterId;

  if (existingCompanion) {
    effectiveCompanionId = existingCompanion.characterId;
    // Ensure the visualBible is consistent with the selected companion's description
    if (!existingCompanion.visualBible || existingCompanion.visualBible.length < 20) {
      existingCompanion.visualBible = companionVisualDescription;
    }
  } else {
    updatedCast.push({
      characterId: companionCharacterId,
      displayName: companionName,
      role: "buddy" as StoryCharacterRole,
      characterKind: "magical_creature" as StoryCharacterKind,
      visualBible: companionVisualDescription,
      nonHuman: true,
      noHumanFace: true,
      noHumanBody: true,
    });
  }

  // 2. Ensure presence in >= 50% of pages
  const totalPages = story.pages.length;
  const targetCount = Math.ceil(totalPages * 0.5);
  const appearingIndices = story.pages
    .map((p, i) => (p.appearingCharacterIds?.includes(effectiveCompanionId) ? i : -1))
    .filter((i) => i !== -1);

  let currentCount = appearingIndices.length;
  const updatedPages = story.pages.map((page, index) => {
    const isPresent = page.appearingCharacterIds?.includes(effectiveCompanionId);
    if (isPresent) return page;

    // If we still need more appearances, add to this page (prefer even pages)
    if (currentCount < targetCount && index % 2 === 0) {
      currentCount++;
      return {
        ...page,
        appearingCharacterIds: [...(page.appearingCharacterIds || []), effectiveCompanionId],
      };
    }
    return page;
  });

  return {
    ...story,
    cast: updatedCast,
    pages: updatedPages,
  };
}

export function sanitizeForbiddenQuestObjects(
  forbiddenQuestObjects: string[] | undefined,
  bookData: BookData,
  mergedInput: BookInput
): string[] | undefined {
  if (!forbiddenQuestObjects?.length) {
    return undefined;
  }

  const signatureItem = mergedInput.signatureItem ?? bookData.childProfileSnapshot?.visualProfile.signatureItem;
  const profileTokens = new Set(
    [
      ...(signatureItem ?? "").split(/[、,\s]+/),
      ...(mergedInput.favorites ?? "").split(/[、,\s]+/),
      ...(mergedInput.colorMood ?? "").split(/[、,\s]+/),
    ]
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2)
  );

  const genericForbidden = new Set(["おもちゃ", "おもちゃたち", "玩具", "toys", "toy"]);

  const sanitized = forbiddenQuestObjects.filter((value, index, array) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (array.findIndex((item) => item.trim().toLowerCase() === normalized) !== index) return false;
    if (genericForbidden.has(normalized)) return false;
    if ([...profileTokens].some((token) => normalized.includes(token) || token.includes(normalized))) {
      return false;
    }
    return true;
  });

  return sanitized.length > 0 ? sanitized : undefined;
}

function resolveScenePolicy(bookData: BookData, template: TemplateData): ScenePolicy {
  if (bookData.scenePolicy) {
    return bookData.scenePolicy;
  }

  if (template.creationMode === "fixed_template") {
    return {
      backgroundMode: "fixed",
      sceneCoherenceRules: ["Keep the template setting stable across pages."],
    };
  }

  return {
    backgroundMode: "story_flexible",
    sceneCoherenceRules: [
      "Choose a setting that supports the page's story beat.",
      "Avoid unrelated objects and setting contradictions.",
    ],
  };
}

function resolveProtagonistCharacterId(
  story: GeneratedStory,
  childProfileSnapshot: NonNullable<BookData["childProfileSnapshot"]>
): string {
  const explicitProtagonistId = story.cast?.find((character) => character.role === "protagonist")?.characterId;
  if (explicitProtagonistId) {
    return explicitProtagonistId;
  }

  const candidateIds = new Set<string>();
  for (const page of story.pages) {
    for (const characterId of page.appearingCharacterIds ?? []) {
      if (isGeneratedProtagonistId(characterId, childProfileSnapshot)) {
        candidateIds.add(characterId);
      }
    }
    if (page.focusCharacterId && isGeneratedProtagonistId(page.focusCharacterId, childProfileSnapshot)) {
      candidateIds.add(page.focusCharacterId);
    }
  }

  return candidateIds.values().next().value ?? "child_protagonist";
}

function isGeneratedProtagonistId(
  value: string,
  childProfileSnapshot: NonNullable<BookData["childProfileSnapshot"]>
): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized === "child_protagonist" || normalized === "protagonist") {
    return true;
  }

  const nameCandidates = [
    childProfileSnapshot.nickname,
    childProfileSnapshot.displayName,
  ]
    .filter(Boolean)
    .map((name) => name!.replace(/\s+/g, "").toLowerCase());

  return nameCandidates.includes(normalized.replace(/\s+/g, ""));
}

function isStorySchemaValidationError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  return (
    err.message.includes("Failed to parse LLM JSON response") ||
    err.message.includes("LLM response") ||
    err.message.includes("Each page must") ||
    err.message.includes("narrativeDevice") ||
    err.message.includes("pageVisualRole") ||
    // P4-5: field_type_mismatch keywords — fixes P4-1 §5 routing gap so these errors
    // are counted under "schema_validation" rather than falling to the outer catch.
    err.message.includes("must be a string") ||
    err.message.includes("must be an array") ||
    err.message.includes("must be a number") ||
    err.message.includes("must be a boolean") ||
    err.message.includes("must be an object")
  );
}

/**
 * P4-5: Feature flag for one-shot schema repair retry.
 * When true, a single retry of generateStoryWithQualityGate() is attempted
 * after a schema_validation failure before hard-failing the book.
 * Also enables the enhanced extractJsonFromLLMResponse() parser in GeminiClient.
 * Default: off. Enable via ENABLE_SCHEMA_REPAIR_RETRY=true env var.
 */
function enableSchemaRepairRetry(): boolean {
  return process.env.ENABLE_SCHEMA_REPAIR_RETRY === "true";
}

function isRetryableGeminiFailure(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  const message = err.message.toLowerCase();
  return (
    message.includes("[429") ||
    message.includes("[500") ||
    message.includes("[502") ||
    message.includes("[503") ||
    message.includes("[504") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("service unavailable") ||
    message.includes("unavailable")
  );
}

export interface GenerationDeps {
  getTemplate: (theme: string) => Promise<TemplateData>;
  getUserPlan: (userId: string) => Promise<"free" | "premium">;
  llmClient: LLMClient;
  imageClient: ImageClient;
  uploadImage: (bookId: string, pageNumber: number, buffer: Buffer) => Promise<string>;
  /** API token for ReplicateImageAdapter. Always set in production; optional for test environments that mock imageClient directly. */
  replicateApiToken?: string;
  /** OpenAI API key for OpenAIImageAdapter. Always set in production; optional for test environments that mock imageClient directly. */
  openaiApiKey?: string;
  uploadCoverImage?: (bookId: string, buffer: Buffer) => Promise<string>;
  updateBookTitle: (bookId: string, title: string) => Promise<void>;
  updateBookCoverImage: (bookId: string, imageUrl: string) => Promise<void>;
  writePage: (bookId: string, page: PageData) => Promise<void>;
  updateBookProgress: (bookId: string, progress: number) => Promise<void>;
  updateBookStatus: (bookId: string, status: "completed" | "partial_completed" | "failed") => Promise<void>;
  updateBookFailure: (bookId: string, message: string) => Promise<void>;
  updateBookFailureMetadata: (
    bookId: string,
    data: Record<string, unknown>
  ) => Promise<void>;
  updateBookStoryQualityReport: (bookId: string, report: BookData["storyQualityReport"]) => Promise<void>;
  updateBookStoryGenerationMetadata: (
    bookId: string,
    data: Record<string, unknown>
  ) => Promise<void>;
  getUserMonthlyCount: (userId: string) => Promise<number>;
  /** 管理者（admin カスタムクレーム保持者）かどうか。テスト生成のため月次上限を回避する。 */
  isUserAdmin: (userId: string) => Promise<boolean>;
  incrementMonthlyCount: (userId: string) => Promise<void>;
  getUserCredits: (userId: string) => Promise<{
    singleBookCredits: number;
    aiGuidedCredits: number;
    photoStoryCredits: number;
  }>;
  consumeCredit: (userId: string, type: "ai_guided" | "photo_story" | "legacy") => Promise<void>;
  /**
   * P5-3c: Gated experiment mode for page image generation.
   * "simplified_scene" = cover-style short prompt without character bible.
   * Only set when the user's Firestore doc has generationOverride.p5PageExperiment === "simplified_scene".
   */
  p5PageExperiment?: "simplified_scene";
  /**
   * P5-3f: Option C Safer High-Quality Retry gate.
   * When "safer_retry": Step b (pro_consistent + simplified prompt + no reference images) is
   * attempted before klein_fast when Step a fails.
   * Only set when the user's Firestore doc has generationOverride.p5ModelUnification === "safer_retry".
   */
  p5ModelUnification?: "safer_retry";
}

interface PageImageResult {
  pageIndex: number;
  success: boolean;
  imageUrl: string;
  imageBuffer?: Buffer;
  usedProfile: ImageModelProfile;
  imageModel: string;
  primaryProfile: ImageModelProfile;
  fallbackUsed: boolean;
  attemptCount: number;
  timeoutCount: number;
  durationMs: number;
  failureReason?: string;
  retryable?: boolean;
}


/**
 * P5-3f: Classify why Step a failed so the diagnostic log can report the cause category.
 * Returns one of "safety_rejection" (E005/flagged), "timeout", or "other".
 * Never logs raw error text — only the classified string is emitted.
 */
function classifyFallbackReasonClass(
  failureReason: string | undefined
): "safety_rejection" | "timeout" | "other" {
  if (!failureReason) return "other";
  const lower = failureReason.toLowerCase();
  if (lower.includes("e005") || lower.includes("flagged") || lower.includes("sensitive")) {
    return "safety_rejection";
  }
  if (failureReason === "image_timeout" || lower.includes("timeout")) {
    return "timeout";
  }
  return "other";
}

async function generatePageImageWithFallback(params: {
  prompt: string;
  primaryProfile: ImageModelProfile;
  inputImageUrls: string[];
  imageQualityTier: import("./lib/types").ImageQualityTier;
  imagePurpose: ImagePurpose;
  imageClient: ImageClient;
  bookId: string;
  pageIndex: number;
  skip: boolean;
  /** API token for ReplicateImageAdapter. When present, adapter path is used for Replicate profiles. */
  replicateApiToken?: string;
  /** Upload function injected into the adapter via makePageUploader. Required when adapter tokens are present. */
  uploadFn?: PageImageUploadFn;
  /** OpenAI API key for OpenAIImageAdapter. When present, adapter path is used for OpenAI profiles. */
  openaiApiKey?: string;
  /**
   * P5-3f: Option C Step b config.
   * When provided and Step a fails on the primary profile, retry with this prompt and
   * inputImageUrls=[] before falling back to klein_fast (Step c).
   * Applies to both photo-backed and no-photo books — reference images are intentionally
   * cleared to bypass safety rejections triggered by reference-aware input.
   */
  stepBConfig?: {
    prompt: string;
    inputImageUrls: string[];
  };
}): Promise<PageImageResult> {
  const { primaryProfile, pageIndex, skip } = params;
  const base: Omit<PageImageResult, "success" | "imageUrl" | "imageBuffer"> = {
    pageIndex,
    usedProfile: primaryProfile,
    imageModel: "",
    primaryProfile,
    fallbackUsed: false,
    attemptCount: 0,
    timeoutCount: 0,
    durationMs: 0,
  };

  if (skip) {
    return { ...base, success: true, imageUrl: `https://via.placeholder.com/512x512/cccccc/666666?text=Page+${pageIndex}` };
  }

  const fallbackProfiles = resolveImageFallbackProfiles(primaryProfile);
  const startMs = Date.now();
  let totalAttempts = 0;
  let timeoutCount = 0;
  let lastFailureReason: string | undefined;
  let lastError: unknown; // P2-3: preserve original error for richer classification

  for (const profile of fallbackProfiles) {
    const maxRetries = 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      totalAttempts++;

      // P5-3f: Option C Step b — on the primary profile's second attempt (attempt === 1),
      // use the simplified prompt with no reference images to bypass safety rejections.
      // Step b does NOT apply to fallback profiles (e.g. klein_fast).
      const useStepBParams =
        params.stepBConfig != null &&
        profile === params.primaryProfile &&
        attempt === 1;
      // params.stepBConfig is non-null when useStepBParams is true (checked above in the condition).
      const effectivePrompt = useStepBParams ? params.stepBConfig!.prompt : params.prompt;
      const effectiveInputImageUrls = useStepBParams ? params.stepBConfig!.inputImageUrls : params.inputImageUrls;

      if (useStepBParams) {
        logger.info("p5_model_unification_retry_active", {
          bookId: params.bookId,
          pageIndex: params.pageIndex,
          step: "b",
          originalProfile: params.primaryProfile,
          retryProfile: profile,
          inputReferenceCount: params.inputImageUrls.length,
          retryInputReferenceCount: 0,
          fallbackReasonClass: classifyFallbackReasonClass(lastFailureReason),
        });
      }

      try {
        // P3-15: Adapter path for Replicate profiles.
        // useReplicateAdapter() flag removed — adapter is now the canonical page generation path.
        // Upload happens inside the adapter via makePageUploader; imageBuffer is not returned.
        // Falls through to legacy imageClient path below only when replicateApiToken is absent
        // (test environments that mock imageClient directly without providing adapter tokens).
        if (
          params.replicateApiToken != null &&
          params.uploadFn != null &&
          PROFILE_PROVIDER_MAP[profile] === "replicate"
        ) {
          const uploader = makePageUploader({
            bookId: params.bookId,
            pageNumber: params.pageIndex,
            uploadImage: params.uploadFn,
          });
          const adapter = new ReplicateImageAdapter(params.replicateApiToken, uploader);
          const adapterResult = await withImageTimeout(
            adapter.generateImage({
              prompt: effectivePrompt,
              imageModelProfile: profile,
              inputImageUrls: effectiveInputImageUrls,
            }),
            IMAGE_GENERATION_TIMEOUT_MS
          );
          const durationMs = Date.now() - startMs;
          const currentImageModel = resolveReplicateModel({
            purpose: params.imagePurpose,
            imageQualityTier: params.imageQualityTier,
            imageModelProfile: profile,
          });

          logGenerationEvent({
            eventName: "page_image_succeeded",
            bookId: params.bookId,
            pageIndex: params.pageIndex,
            imageModelProfile: profile,
            imageModel: currentImageModel,
            provider: "replicate",
            durationMs,
            attemptCount: totalAttempts,
            fallbackUsed: profile !== primaryProfile,
          });

          return {
            ...base,
            success: true,
            imageUrl: adapterResult.imageUrl,
            usedProfile: profile,
            imageModel: currentImageModel,
            fallbackUsed: profile !== primaryProfile,
            attemptCount: totalAttempts,
            timeoutCount,
            durationMs,
          };
        }
        // P3-15: Adapter path for OpenAI profiles.
        // useOpenAIAdapter() flag removed — adapter is now the canonical page generation path.
        // Upload happens inside the adapter via makePageUploader; imageBuffer is not returned.
        if (
          params.openaiApiKey != null &&
          params.uploadFn != null &&
          PROFILE_PROVIDER_MAP[profile] === "openai"
        ) {
          const uploader = makePageUploader({
            bookId: params.bookId,
            pageNumber: params.pageIndex,
            uploadImage: params.uploadFn,
          });
          const adapter = new OpenAIImageAdapter(params.openaiApiKey, uploader);
          const adapterResult = await withImageTimeout(
            adapter.generateImage({
              prompt: effectivePrompt,
              imageModelProfile: profile,
              inputImageUrls: effectiveInputImageUrls,
            }),
            IMAGE_GENERATION_TIMEOUT_MS
          );
          const durationMs = Date.now() - startMs;
          const currentImageModel = resolveOpenAIModelLabel(effectiveInputImageUrls.length > 0);

          logGenerationEvent({
            eventName: "page_image_succeeded",
            bookId: params.bookId,
            pageIndex: params.pageIndex,
            imageModelProfile: profile,
            imageModel: currentImageModel,
            provider: "openai",
            durationMs,
            attemptCount: totalAttempts,
            fallbackUsed: profile !== primaryProfile,
          });

          return {
            ...base,
            success: true,
            imageUrl: adapterResult.imageUrl,
            usedProfile: profile,
            imageModel: currentImageModel,
            fallbackUsed: profile !== primaryProfile,
            attemptCount: totalAttempts,
            timeoutCount,
            durationMs,
          };
        }
        // Legacy imageClient path — reached only when adapter tokens are absent
        // (test environments that mock imageClient directly without providing adapter tokens).
        // In production, replicateApiToken and openaiApiKey are always present via Firebase secrets.
        const buffer = await withImageTimeout(
          params.imageClient.generateImage(effectivePrompt, {
            purpose: params.imagePurpose,
            imageQualityTier: params.imageQualityTier,
            imageModelProfile: profile,
            inputImageUrls: effectiveInputImageUrls,
          }),
          IMAGE_GENERATION_TIMEOUT_MS
        );
        const durationMs = Date.now() - startMs;
        const currentProvider = resolveProviderFromProfile(profile);
        const currentImageModel = currentProvider === "replicate"
          ? resolveReplicateModel({
              purpose: params.imagePurpose,
              imageQualityTier: params.imageQualityTier,
              imageModelProfile: profile,
            })
          : resolveOpenAIModelLabel(effectiveInputImageUrls.length > 0);

        logGenerationEvent({
          eventName: "page_image_succeeded",
          bookId: params.bookId,
          pageIndex: params.pageIndex,
          imageModelProfile: profile,
          imageModel: currentImageModel,
          provider: currentProvider,
          durationMs,
          attemptCount: totalAttempts,
          fallbackUsed: profile !== primaryProfile,
        });

        return {
          ...base,
          success: true,
          imageUrl: "",
          imageBuffer: buffer,
          usedProfile: profile,
          imageModel: currentImageModel,
          fallbackUsed: profile !== primaryProfile,
          attemptCount: totalAttempts,
          timeoutCount,
          durationMs,
        };
      } catch (err) {
        if (err instanceof ImageTimeoutError) {
          timeoutCount++;
          lastFailureReason = "image_timeout";
          lastError = err; // P2-3
          logger.warn("Image generation timeout", {
            bookId: params.bookId,
            pageIndex,
            profile,
            attempt,
            timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
          });
          break;
        }
        const retryAfterMs = getRetryAfterMs(err);
        lastFailureReason = err instanceof Error ? err.message : "unknown";
        lastError = err; // P2-3
        logger.warn("Image generation attempt failed", {
          bookId: params.bookId,
          pageIndex,
          profile,
          attempt,
          error: lastFailureReason,
        });
        if (attempt < maxRetries - 1) {
          if (retryAfterMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 30_000)));
          }
          continue;
        }
        break;
      }
    }
  }

  // P2-2/P2-3: Log page-level image failure after all fallback profiles are exhausted.
  const finalDurationMs = Date.now() - startMs;
  const finalProfile = fallbackProfiles[fallbackProfiles.length - 1];
  const normalized = classifyError(lastError ?? lastFailureReason);
  logGenerationEvent({
    eventName: "page_image_failed",
    bookId: params.bookId,
    pageIndex,
    primaryProfile: params.primaryProfile,
    imageModelProfile: finalProfile,
    provider: resolveProviderFromProfile(finalProfile),
    isFinalFallbackFailure: true,
    fallbackUsed: fallbackProfiles.length > 1,
    attemptCount: totalAttempts,
    timeoutCount,
    durationMs: finalDurationMs,
    // Truncate to 120 chars; prompts are never the failure reason
    failureReason: lastFailureReason ? lastFailureReason.slice(0, 120) : undefined,
    errorCategory: normalized.errorCategory,
    errorCode: normalized.errorCode,
  });

  return {
    ...base,
    success: false,
    imageUrl: "",
    usedProfile: finalProfile,
    fallbackUsed: fallbackProfiles.length > 1,
    attemptCount: totalAttempts,
    timeoutCount,
    durationMs: finalDurationMs,
    failureReason: lastFailureReason,
    retryable: true,
  };
}

async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}


export async function processBookGeneration(
  bookId: string,
  bookData: BookData,
  deps: GenerationDeps
): Promise<void> {
  const generationStartMs = Date.now();

  try {
    // Step 1: Validate input
    const mergedInput = mergeInputWithChildProfile(bookData.input, bookData.childProfileSnapshot);
    const sanitizeResult = sanitizeInput(mergedInput);
    if (!sanitizeResult.valid) {
      console.error(`Input validation failed for ${bookId}: ${sanitizeResult.reason}`);
      await deps.updateBookFailure(bookId, sanitizeResult.reason ?? "Input validation failed");
      await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
        failureStage: "validation",
        failureProvider: "system",
        failureReason: "unknown",
        retryable: false,
        technicalErrorMessage: sanitizeResult.reason ?? "Input validation failed",
      }));
      await deps.updateBookStatus(bookId, "failed");
      return;
    }

    // Step 2: Get template and normalize plan settings
    const template = await deps.getTemplate(bookData.theme);
    const resolvedTemplateId = bookData.templateId ?? bookData.theme;
    const resolvedCreationMode = template.creationMode ?? bookData.creationMode ?? "guided_ai";
    if (resolvedCreationMode === "fixed_template") {
      const exposure = getStyleTemplateExposure(resolvedTemplateId, bookData.style);
      if (!isAllowedStyleExposureStatus(exposure.status)) {
        const technicalMessage =
          `style_exposure_blocked: template=${resolvedTemplateId} style=${String(bookData.style)} ` +
          `status=${exposure.status} rationale=${exposure.rationale}`;
        console.error(`Style exposure validation failed for ${bookId}: ${technicalMessage}`);
        await deps.updateBookFailure(bookId, STYLE_EXPOSURE_BLOCKED_USER_MESSAGE);
        await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
          failureStage: "validation",
          failureProvider: "system",
          failureReason: "unknown",
          retryable: false,
          technicalErrorMessage: technicalMessage,
        }));
        await deps.updateBookStatus(bookId, "failed");
        return;
      }
    }
    const userPlan = await deps.getUserPlan(bookData.userId);
    const isAdminUser = await deps.isUserAdmin(bookData.userId);
    const normalizedBookData = normalizeBookForGeneration(bookData, template, userPlan);
    const readingProfile = getAgeReadingProfile(mergedInput.childAge);
    const generationMode = normalizedBookData.generationMode ?? "reliable_fast";

    await deps.updateBookStoryGenerationMetadata(bookId, {
      ...(normalizedBookData.imageModelProfile
        ? { imageModelProfile: normalizedBookData.imageModelProfile }
        : {}),
      imageQualityTier: normalizedBookData.imageQualityTier,
      generationMode,
      ...createGenerationStartedPatch(),
    });

    // Step 3: Check quota and credits (skip in development)
    let quotaExceeded = false;
    let hasSingleBookCredits = false;

    if (process.env.NODE_ENV !== "development") {
      const monthlyCount = await deps.getUserMonthlyCount(bookData.userId);
      quotaExceeded = !canGenerateBookThisMonth({ userPlan, currentCount: monthlyCount, isAdmin: isAdminUser });

      if (quotaExceeded || normalizedBookData.isSinglePurchase) {
        const credits = await deps.getUserCredits(bookData.userId);
        const purchaseType = normalizedBookData.singlePurchaseType || (normalizedBookData.creationMode === "photo_story" ? "photo_story" : "ai_guided");
        const hasSpecificCredit = purchaseType === "photo_story" ? (credits.photoStoryCredits > 0) : (credits.aiGuidedCredits > 0);
        hasSingleBookCredits = hasSpecificCredit || credits.singleBookCredits > 0;

        if (!hasSingleBookCredits) {
          const message =
            userPlan === "premium"
              ? "今月の生成回数に達しました。来月またご利用ください。"
              : "今月の無料生成回数に達しました。来月またお試しください。";
          console.error(`User ${bookData.userId} exceeded monthly quota (${monthlyCount}) and has no credits`);
          await deps.updateBookFailure(bookId, message);
          await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
            failureStage: "validation",
            failureProvider: "system",
            failureReason: "unknown",
            retryable: false,
            technicalErrorMessage: `Monthly quota exceeded: ${monthlyCount} and no single credits`,
          }));
          await deps.updateBookStatus(bookId, "failed");
          return;
        }
      }
    }

    // Step 4: Build reference assets
    const childHasReferenceImages = Boolean(
      normalizedBookData.childProfileSnapshot?.visualProfile.referenceImageUrl ||
        normalizedBookData.childProfileSnapshot?.visualProfile.approvedImageUrl
    );

    // Step 5: Generate story JSON once with Gemini and validate it.
    // P4-2: Track story generation start time for storyDurationMs SLO field.
    const storyStartMs = Date.now();
    let storyResult!: {
      story: GeneratedStory;
      qualityReport: StoryQualityReport;
      rewriteMetadata?: Pick<BookData, "storyTextRewriteUsed" | "storyTextRewriteModel" | "storyTextRewriteAttempts">;
    };

    // Vision: photo_story mode downloads and encodes photos before story generation
    let base64Photos: Array<{ mimeType: string; data: string }> | undefined = undefined;
    if (resolvedCreationMode === "photo_story" && bookData.sourcePhotos?.length) {
      try {
        base64Photos = await Promise.all(
          bookData.sourcePhotos.map(async (url) => {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to fetch source photo: ${resp.statusText}`);
            const buffer = Buffer.from(await resp.arrayBuffer());
            const mimeType = resp.headers.get("content-type") || "image/jpeg";
            return { mimeType, data: buffer.toString("base64") };
          })
        );
      } catch (err) {
        const message = `Vision analysis failed: Photo download error. ${err instanceof Error ? err.message : String(err)}`;
        logger.error(message, { bookId });
        await deps.updateBookFailure(bookId, message);
        await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
          failureStage: "story_generation",
          failureProvider: "gemini",
          failureReason: "unknown",
          retryable: false,
          technicalErrorMessage: message,
        }));
        await deps.updateBookStatus(bookId, "failed");
        return;
      }
    }

    // P4-5: true when a schema repair retry succeeded; stored in Firestore metadata.
    let schemaRepairRetryUsed = false;
    try {
      storyResult =
        template.creationMode === "fixed_template" && template.fixedStory
          ? (() => {
              console.log(`Book ${bookId} uses fixed_template; skipping LLM story generation.`);
              return generateFixedTemplateStoryWithQualityReport(
                template.fixedStory,
                mergedInput,
                normalizedBookData,
                template,
                readingProfile
              );
            })()
          : await generateStoryWithQualityGate({
              llmClient: deps.llmClient,
              template,
              normalizedBookData,
              mergedInput,
              readingProfile,
              sourcePhotos: base64Photos,
            });
    } catch (err) {
      // P4-2: Capture story duration for logging before each early-return path.
      const storyDurationMs = Date.now() - storyStartMs;

      if (err instanceof GeminiServiceUnavailableError || isRetryableGeminiFailure(err)) {
        const technicalMessage =
          err instanceof GeminiServiceUnavailableError
            ? `${err.technicalMessage} | models=${err.modelNamesTried.join(",")} | attempts=${err.totalAttempts}`
            : err instanceof Error
              ? err.message
              : "Unknown Gemini retryable error";
        await deps.updateBookFailure(bookId, GEMINI_RETRYABLE_USER_MESSAGE);
        await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
          failureStage: "story_generation",
          failureProvider: "gemini",
          failureReason:
            err instanceof GeminiServiceUnavailableError ? err.reason : "service_unavailable",
          retryable: true,
          technicalErrorMessage: technicalMessage,
        }));
        await deps.updateBookStatus(bookId, "failed");
        logGenerationEvent({
          eventName: "book_early_failed",
          bookId,
          userPresent: !!bookData.userId,
          templateId: resolvedTemplateId,
          creationMode: resolvedCreationMode as import("./lib/types").CreationMode,
          failureStage: "story_generation",
          failureProvider: "gemini",
          errorCategory: "provider_error",
          retryable: true,
          storyDurationMs,
        });
        return;
      }

      if (isStorySchemaValidationError(err)) {
        // P4-5: When ENABLE_SCHEMA_REPAIR_RETRY=true, attempt one retry before hard-failing.
        // Only retry for non-fixed-template books (fixed templates don't call Gemini).
        if (enableSchemaRepairRetry() && template.creationMode !== "fixed_template") {
          try {
            storyResult = await generateStoryWithQualityGate({
              llmClient: deps.llmClient,
              template,
              normalizedBookData,
              mergedInput,
              readingProfile,
              sourcePhotos: base64Photos,
            });
            schemaRepairRetryUsed = true;
            // Retry succeeded — do NOT throw; fall through the catch block to continue generation.
          } catch (retryErr) {
            // Both attempts failed. Hard-fail with storyGenerationAttempts=2.
            const retryStoryDurationMs = Date.now() - storyStartMs;
            const technicalMessage = retryErr instanceof Error ? retryErr.message : "Unknown schema validation error after retry";
            await deps.updateBookFailure(bookId, STORY_SCHEMA_FAILURE_USER_MESSAGE);
            await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
              failureStage: "schema_validation",
              failureProvider: "gemini",
              failureReason: "unknown",
              retryable: false,
              technicalErrorMessage: technicalMessage,
            }));
            await deps.updateBookStatus(bookId, "failed");
            logGenerationEvent({
              eventName: "book_early_failed",
              bookId,
              userPresent: !!bookData.userId,
              templateId: resolvedTemplateId,
              creationMode: resolvedCreationMode as import("./lib/types").CreationMode,
              failureStage: "schema_validation",
              failureProvider: "gemini",
              errorCategory: "validation",
              retryable: false,
              storyJsonFailureCategory: classifyStoryJsonFailure(retryErr),
              storyDurationMs: retryStoryDurationMs,
              storyGenerationAttempts: 2,
              storyJsonParseDiagnostics: getParseErrorDiagnostics(retryErr) as Record<string, unknown> | undefined,
            });
            return;
          }
        } else {
          // Flag off (or fixed_template): original behavior — fail immediately.
          const technicalMessage = err instanceof Error ? err.message : "Unknown schema validation error";
          await deps.updateBookFailure(bookId, STORY_SCHEMA_FAILURE_USER_MESSAGE);
          await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
            failureStage: "schema_validation",
            failureProvider: "gemini",
            failureReason: "unknown",
            retryable: false,
            technicalErrorMessage: technicalMessage,
          }));
          await deps.updateBookStatus(bookId, "failed");
          // P4-2: Include storyJsonFailureCategory for fine-grained SLO sub-classification.
          logGenerationEvent({
            eventName: "book_early_failed",
            bookId,
            userPresent: !!bookData.userId,
            templateId: resolvedTemplateId,
            creationMode: resolvedCreationMode as import("./lib/types").CreationMode,
            failureStage: "schema_validation",
            failureProvider: "gemini",
            errorCategory: "validation",
            retryable: false,
            storyJsonFailureCategory: classifyStoryJsonFailure(err),
            storyDurationMs,
            storyJsonParseDiagnostics: getParseErrorDiagnostics(err) as Record<string, unknown> | undefined,
          });
          return;
        }
      }

      // P4-5: If schema repair retry succeeded (schemaRepairRetryUsed = true), do not rethrow.
      // Otherwise, rethrow any error not handled above.
      if (!schemaRepairRetryUsed) {
        throw err;
      }
    }
    // P4-2: Capture story generation wall time for SLO fields on success path.
    const storyDurationMs = Date.now() - storyStartMs;

    // Step 6: Ensure recurring character references (premium + quality mode only)
    const enableRecurringRef = resolveEnableRecurringCharacterReference(generationMode);
    let story = enableRecurringRef
      ? await ensureRecurringCharacterReferences({
          bookId,
          story: storyResult.story,
          normalizedBookData,
          deps,
        })
      : storyResult.story;

    // Step 6b: Inject companion character reference image (if companion selected)
    story = await injectCompanionCharacterReference({ story, mergedInput });

    const { qualityReport } = storyResult;
    const selectedStyleProfile = getIllustrationStyleProfile(normalizedBookData.style);
    const hasAnyCharacterReference =
      childHasReferenceImages ||
      (story.cast ?? []).some(
        (character) =>
          Boolean(character.approvedImageUrl) ||
          Boolean(character.referenceImageUrl) ||
          Boolean(character.generatedReferenceImageUrl)
      );
    const storyGenerationMetadata = removeUndefinedDeep({
        storyModel: story.storyModel,
        storyModelFallbackUsed: story.storyModelFallbackUsed,
        storyGenerationAttempts: story.storyGenerationAttempts,
        // P4-5: Record when schema repair retry was the reason the book recovered.
        schemaRepairRetryUsed: schemaRepairRetryUsed ? true : undefined,
        selectedStyleId: selectedStyleProfile.id,
        selectedStyleName: selectedStyleProfile.name,
        styleBible: story.styleBible,
        stylePreviewImageUrl: selectedStyleProfile.previewImageUrl,
        stylePreviewUsedAsReference: false,
        inputImageRoles: hasAnyCharacterReference ? ["character_reference"] : [],
        storyTextRewriteUsed: storyResult.rewriteMetadata?.storyTextRewriteUsed,
        storyTextRewriteModel: storyResult.rewriteMetadata?.storyTextRewriteModel,
        storyTextRewriteAttempts: storyResult.rewriteMetadata?.storyTextRewriteAttempts,
        storyTitleCandidate: story.title,
        storyCast: sanitizeStoryCastForFirestore(story.cast),
        storyGoal: story.storyGoal,
        mainQuestObject: story.mainQuestObject,
        forbiddenQuestObjects: story.forbiddenQuestObjects,
        titleSpreadText: story.titleSpreadText,
        openingNarration: story.openingNarration,
        coverImagePrompt: story.coverImagePrompt,
        generatedTextPreview: story.pages.map((page) => page.text),
        imageModelProfile: normalizedBookData.imageModelProfile,
      });
    if (Object.keys(storyGenerationMetadata).length > 0) {
      await deps.updateBookStoryGenerationMetadata(bookId, storyGenerationMetadata);
    }

    await deps.updateBookStoryQualityReport(bookId, toFirestoreStoryQualityReport(qualityReport));

    if (template.creationMode === "fixed_template" && !qualityReport.ok) {
      logger.warn("Fixed template quality report has errors but generation continues", {
        bookId,
        issues: qualityReport.issues,
        summary: qualityReport.summary,
      });
    }

    if (template.creationMode !== "fixed_template" && shouldFailBookForQuality(qualityReport, normalizedBookData.productPlan)) {
      logger.warn("Story quality gate failed after retry", {
        bookId,
        issues: qualityReport.issues,
        summary: qualityReport.summary,
      });
      await deps.updateBookFailure(bookId, STORY_QUALITY_FAILURE_USER_MESSAGE);
      await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
        failureStage: "quality_gate",
        failureProvider: "system",
        failureReason: "unknown",
        retryable: false,
        technicalErrorMessage: buildStoryQualityTechnicalMessage(qualityReport),
      }));
      await deps.updateBookStatus(bookId, "failed");
      // P4-2: Log book_early_failed for quality_gate failures (was previously missing).
      logGenerationEvent({
        eventName: "book_early_failed",
        bookId,
        userPresent: !!bookData.userId,
        templateId: resolvedTemplateId,
        creationMode: resolvedCreationMode as import("./lib/types").CreationMode,
        failureStage: "quality_gate",
        failureProvider: "system",
        errorCategory: "validation",
        retryable: false,
        storyDurationMs,
      });
      return;
    }

    if (qualityReport.issues.length > 0) {
      logger.warn("Story quality issues", {
        bookId,
        issues: qualityReport.issues,
        summary: qualityReport.summary,
      });
    }

    // Step 7: Update book title
    await deps.updateBookTitle(bookId, story.title);

    // Step 7b: Run prompt completeness checker and log diagnostics
    try {
      const diagnostic = analyzePromptCompleteness(story);
      logPromptAnalysis({
        eventName: "prompt_analysis",
        bookId,
        templateId: resolvedTemplateId,
        averageCompletenessScore: diagnostic.averageCompletenessScore,
        pagesWithMissingCharacters: diagnostic.pages.filter((p) =>
          p.characterPresence.some((cp) => !cp.present)
        ).length,
        pagesWithMissingMotifs: diagnostic.pages.filter((p) =>
          p.visualMotifPresent === false
        ).length,
        pagesWithMissingHiddenDetails: diagnostic.pages.filter((p) =>
          p.hiddenDetailPresent === false
        ).length,
        pagesWithMissingVisualRoles: diagnostic.pages.filter((p) =>
          !p.visualRolePresent
        ).length,
        pagesWithMissingCompositionHints: diagnostic.pages.filter((p) =>
          !p.compositionHintPresent
        ).length,
      });
    } catch (analysisErr) {
      logger.warn("Prompt completeness analysis failed", {
        bookId,
        error: analysisErr instanceof Error ? analysisErr.message : String(analysisErr),
      });
    }

    // P5-3c: Log cover/page generation profile comparison for diagnostic purposes (PII-safe).
    // Captures the key structural difference between cover (legacy path, no ref images)
    // and pages (adapter path, with ref images when shouldUseCharacterReferenceForPage).
    logger.info("cover_vs_page_profile_diagnostic", {
      bookId,
      coverProfile: normalizedBookData.imageModelProfile ?? "plan_default",
      pageDefaultProfile: normalizedBookData.imageModelProfile ?? "plan_default",
      characterConsistencyMode: normalizedBookData.characterConsistencyMode ?? "cover_only",
      creationMode: resolvedCreationMode,
      p5PageExperiment: deps.p5PageExperiment ?? "none",
      note: "cover=legacy path no ref images; pages=adapter path with ref images if shouldUseRef",
    });

    // Step 8: Process pages with fallback and partial success
    const totalPages = story.pages.length;
    const isDev = process.env.NODE_ENV === "development";
    const concurrency = IMAGE_CONCURRENCY;
    let completedPageCount = 0;

    const generatePageTask = async (i: number, prevPageImageUrl?: string) => {
      const storyPage = story.pages[i];
      const sourcePhotoUrl = (storyPage.sourcePhotoIndex !== undefined && bookData.sourcePhotos)
        ? bookData.sourcePhotos[storyPage.sourcePhotoIndex]
        : undefined;
      const imagePurpose = getPageImagePurpose(i, normalizedBookData.theme);
      const imageQualityTier = normalizedBookData.imageQualityTier ?? "light";
      const imageModelProfile = resolveImageModelProfile({
        purpose: imagePurpose,
        imageQualityTier,
        imageModelProfile: normalizedBookData.imageModelProfile,
      });
      const imageModel = resolveReplicateModel({
        purpose: imagePurpose,
        imageQualityTier,
        imageModelProfile,
      });
      const shouldUseReference = shouldUseCharacterReferenceForPage({
        pageIndex: i,
        totalPages,
        imagePurpose,
        characterConsistencyMode: normalizedBookData.characterConsistencyMode,
      });
      const inputImageRefs = shouldUseReference
        ? buildInputImageRefs(
            normalizedBookData.childProfileSnapshot,
            story.cast,
            storyPage.appearingCharacterIds,
            prevPageImageUrl,
            sourcePhotoUrl
          )
        : [];
      const inputImageUrls = inputImageRefs.map((ref) => ref.url);
      const inputImageRoles = buildInputImageRoles(inputImageRefs, false);
      const missingReferenceCharacters = collectMissingReferenceCharacters(
        story.cast,
        storyPage.appearingCharacterIds,
        inputImageRefs
      );

      const imagePrompt = buildImagePrompt(
        storyPage.imagePrompt,
        normalizedBookData.style,
        buildFinalCharacterBible({
          storyCharacterBible: story.characterBible,
          childProfileSnapshot: normalizedBookData.childProfileSnapshot,
          characterUsage: normalizedBookData.characterUsage,
          childAge: mergedInput.childAge,
        }),
        story.styleBible,
        {
          pageNumber: i,
          pageVisualRole: storyPage.pageVisualRole,
          compositionHint: storyPage.compositionHint,
          visualMotif: story.narrativeDevice?.visualMotif,
          visualMotifUsage: storyPage.visualMotifUsage,
          hiddenDetail: storyPage.hiddenDetail ?? story.narrativeDevice?.hiddenDetails?.[i],
          ageBand: readingProfile.ageBand,
          imageModelProfile: normalizedBookData.imageModelProfile,
          imageQualityTier: normalizedBookData.imageQualityTier,
          cast: story.cast,
          appearingCharacterIds: storyPage.appearingCharacterIds ?? [],
          focusCharacterId: storyPage.focusCharacterId,
          childProfileBasePrompt: normalizedBookData.childProfileSnapshot?.visualProfile.basePrompt,
          scenePolicy: normalizedBookData.scenePolicy,
          categoryGroupId: template.categoryGroupId,
          hasAnimalCharacters: normalizedBookData.theme === "animals",
        }
      );

      // P5-fix: Log per-page imagePrompt prefix and scene hash for debugging "all pages same image".
      // Privacy: only first 60 chars of the Gemini-generated scene description are logged (no child name / PII).
      const sceneSnippet = storyPage.imagePrompt.slice(0, 60).replace(/\s+/g, " ");
      logger.info("page_image_prompt_scene", {
        bookId,
        pageIndex: i,
        style: normalizedBookData.style,
        sceneSnippet,
        sceneLength: storyPage.imagePrompt.length,
      });

      // P5-3d: Guarded conditional routing — simplified_scene applies only to photo-less books.
      // Photo-backed books (referenceImageUrl or approvedImageUrl present) must
      // remain on the reference-aware path because simplified_scene clears finalInputImageUrls=[],
      // which would discard the child's reference photo and break face likeness.
      const hasReferenceImage = Boolean(
        normalizedBookData.childProfileSnapshot?.visualProfile?.referenceImageUrl ||
        normalizedBookData.childProfileSnapshot?.visualProfile?.approvedImageUrl
      );
      const useSimplifiedScene =
        deps.p5PageExperiment === "simplified_scene" && !hasReferenceImage;
      const finalImagePrompt = useSimplifiedScene
        ? buildP5SimplifiedPagePrompt(storyPage.imagePrompt, normalizedBookData.style, { hasAnimalCharacters: normalizedBookData.theme === "animals" })
        : imagePrompt;
      const finalInputImageUrls = useSimplifiedScene ? [] : inputImageUrls;
      if (deps.p5PageExperiment === "simplified_scene") {
        logger.info("p5_page_experiment_active", {
          bookId,
          pageIndex: i,
          experiment: "simplified_scene",
          p5PageExperimentRequested: deps.p5PageExperiment,
          hasReferenceImage,
          useSimplifiedScene,
          originalPromptLength: imagePrompt.length,
          simplifiedPromptLength: finalImagePrompt.length,
          inputImageUrlsClearedCount: useSimplifiedScene ? inputImageUrls.length : 0,
          resolvedProfile: imageModelProfile,
        });
      }

      // P5-4a: Promoted safer_retry to production default for pro_consistent.
      // Option C: drop reference images on retry when pro_consistent is used — the
      // combination most likely to trigger Replicate safety rejections.
      // P5-3f safer_retry override preserved as an additional path for other cases.
      const stepBConfig =
        (isSaferRetryEnabled(imageModelProfile) || deps.p5ModelUnification === "safer_retry") &&
        storyPage.imagePrompt &&
        storyPage.imagePrompt.length >= 10
          ? {
              prompt: buildP5SimplifiedPagePrompt(storyPage.imagePrompt, normalizedBookData.style, { hasAnimalCharacters: normalizedBookData.theme === "animals" }),
              inputImageUrls: [] as string[],
            }
          : undefined;

      const imageStartMs = Date.now();

      const imageResult = await generatePageImageWithFallback({
        prompt: finalImagePrompt,
        primaryProfile: imageModelProfile,
        inputImageUrls: finalInputImageUrls,
        imageQualityTier,
        imagePurpose,
        imageClient: deps.imageClient,
        bookId,
        pageIndex: i,
        skip: isDev,
        // Adapter tokens: present in production (always), absent in test environments that mock imageClient directly.
        replicateApiToken: deps.replicateApiToken,
        uploadFn: deps.uploadImage,
        openaiApiKey: deps.openaiApiKey,
        stepBConfig,
      });

      let imageUrl = imageResult.imageUrl;
      if (imageResult.success && imageResult.imageBuffer) {
        try {
          imageUrl = await deps.uploadImage(bookId, i, imageResult.imageBuffer);
        } catch (uploadErr) {
          logger.error("Image upload failed", {
            bookId,
            pageIndex: i,
            error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
          imageResult.success = false;
          imageResult.failureReason = `upload_failed: ${uploadErr instanceof Error ? uploadErr.message : "unknown"}`;
          imageUrl = "";
        }
      }

      const pageStatus = imageResult.success
        ? (imageResult.fallbackUsed ? "fallback_completed" : "completed")
        : "image_failed";

      const pageData: PageData = removeUndefinedDeep({
        pageNumber: i,
        text: storyPage.text,
        imageUrl,
        imagePrompt,
        textCharCount: countJapaneseTextChars(storyPage.text),
        textSentenceCount: countSentences(storyPage.text),
        textQualityWarnings: collectPageTextQualityWarnings(qualityReport, i),
        status: pageStatus as PageData["status"],
        imageModel: imageResult.imageModel || (imageResult.usedProfile === "openai_image_candidate"
          ? resolveOpenAIModelLabel(finalInputImageUrls.length > 0)
          : imageModel),
        imageQualityTier,
        imagePurpose,
        inputImageRoles,
        inputImageRefs,
        inputImageUrlsCount: finalInputImageUrls.length,
        inputReferenceCount: finalInputImageUrls.length,
        usedCharacterReference: finalInputImageUrls.length > 0,
        missingReferenceCharacters,
        characterConsistencyMode: normalizedBookData.characterConsistencyMode,
        imageModelProfile: imageResult.usedProfile,
        fallbackFromModelProfile: imageResult.fallbackUsed ? imageResult.primaryProfile : undefined,
        pageVisualRole: storyPage.pageVisualRole,
        appearingCharacterIds: storyPage.appearingCharacterIds,
        focusCharacterId: storyPage.focusCharacterId,
        imageGenerationStartedAtMs: imageStartMs,
        imageCompletedAtMs: Date.now(),
        imageDurationMs: imageResult.durationMs,
        imageAttemptCount: imageResult.attemptCount,
        imageTimeoutCount: imageResult.timeoutCount > 0 ? imageResult.timeoutCount : undefined,
        imageFallbackUsed: imageResult.fallbackUsed || undefined,
        imageFailureReason: imageResult.failureReason,
        imageRetryable: imageResult.retryable,
        replicateModel: imageResult.usedProfile === "openai_image_candidate"
          ? undefined
          : resolveReplicateModel({
              purpose: imagePurpose,
              imageQualityTier,
              imageModelProfile: imageResult.usedProfile,
            }),
      });

      await deps.writePage(bookId, pageData);

      if (i === 0 && imageResult.success && imageUrl) {
        await deps.updateBookCoverImage(bookId, imageUrl);
      }

      completedPageCount++;
      const progress = Math.round((completedPageCount / totalPages) * 100);
      await deps.updateBookProgress(bookId, progress);

      return imageResult;
    };

    const isSequentialMode = normalizedBookData.imageModelProfile === "kontext_max";
    let pageResults: PageImageResult[];

    if (isSequentialMode) {
      pageResults = [];
      let prevPageImageUrl: string | undefined = undefined;
      for (let i = 0; i < totalPages; i++) {
        const result = await generatePageTask(i, prevPageImageUrl);
        pageResults.push(result);
        prevPageImageUrl = result.success && result.imageUrl ? result.imageUrl : undefined;
      }
    } else {
      const pageTasks = story.pages.map((_, i) => () => generatePageTask(i));
      pageResults = await runWithConcurrencyLimit(pageTasks, concurrency);
    }

    // P5-fix: Regression guard — detect duplicate imageUrls across pages after generation.
    // Identical URLs indicate a storage path collision or adapter re-use bug.
    const successfulUrls = pageResults
      .filter((r) => r.success && r.imageUrl)
      .map((r) => r.imageUrl as string);
    const urlSet = new Set(successfulUrls);
    if (successfulUrls.length > 1 && urlSet.size < successfulUrls.length) {
      logger.warn("duplicate_page_image_urls_detected", {
        bookId,
        successfulPageCount: successfulUrls.length,
        distinctUrlCount: urlSet.size,
      });
    }

    // Step 8.5: Generate cover image (independent of page results)
    const baseCoverPrompt = story.coverImagePrompt ?? normalizedBookData.coverImagePrompt;
    const coverImagePrompt = baseCoverPrompt
      ? buildCoverImagePrompt(
          baseCoverPrompt,
          normalizedBookData.style,
          buildFinalCharacterBible({
            storyCharacterBible: story.characterBible,
            childProfileSnapshot: normalizedBookData.childProfileSnapshot,
            characterUsage: normalizedBookData.characterUsage,
            childAge: mergedInput.childAge,
          }),
          story.styleBible,
          {
            cast: story.cast,
            childProfileBasePrompt: normalizedBookData.childProfileSnapshot?.visualProfile.basePrompt,
            imageModelProfile: normalizedBookData.imageModelProfile,
            imageQualityTier: normalizedBookData.imageQualityTier,
            ageBand: readingProfile.ageBand,
            categoryGroupId: template.categoryGroupId,
          }
        )
      : undefined;

    let coverMetadata: Record<string, unknown> | undefined;
    if (coverImagePrompt && deps.uploadCoverImage) {
      try {
        await deps.updateBookStoryGenerationMetadata(bookId, { coverStatus: "generating" });
        const coverInputImageRefs = buildInputImageRefs(
          normalizedBookData.childProfileSnapshot,
          story.cast,
          undefined // Cover includes all cast by default in prompt; refs follow logic
        );
        const coverInputImageUrls = coverInputImageRefs.map((ref) => ref.url);

        const coverResult = await generateCoverImageWithFallback({
          coverImagePrompt,
          bookId,
          imageQualityTier: normalizedBookData.imageQualityTier ?? "light",
          imageModelProfile: normalizedBookData.imageModelProfile,
          inputImageUrls: coverInputImageUrls,
          replicateApiToken: deps.replicateApiToken,
          openaiApiKey: deps.openaiApiKey,
          imageClient: deps.imageClient,
          uploadCoverImage: deps.uploadCoverImage,
        });

        if (coverResult.success) {
          let coverUrl = coverResult.imageUrl;
          if (!coverUrl && coverResult.imageBuffer && deps.uploadCoverImage) {
            try {
              coverUrl = await deps.uploadCoverImage(bookId, coverResult.imageBuffer);
            } catch (uploadErr) {
              logger.error("Cover image upload failed (legacy path)", {
                bookId,
                error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
              });
            }
          }

          if (coverUrl) {
            await deps.updateBookCoverImage(bookId, coverUrl);
            coverMetadata = removeUndefinedDeep({
              coverStatus: "completed" as CoverStatus,
              coverGeneratedAtMs: Date.now(),
              coverImageModelProfile: coverResult.usedProfile,
              coverImageDurationMs: coverResult.durationMs,
              coverImageFallbackUsed: coverResult.fallbackUsed,
              hasCoverPage: true,
              readingStructureVersion: "v2_cover_title_story",
            });
          } else {
            coverMetadata = removeUndefinedDeep({
              coverStatus: "failed" as CoverStatus,
              coverFailureReason: "upload_failed",
              coverImageDurationMs: coverResult.durationMs,
              coverImageModelProfile: coverResult.usedProfile,
              coverImageFallbackUsed: coverResult.fallbackUsed,
              hasCoverPage: false,
              readingStructureVersion: "v1_pages_only",
            });
          }
        } else {
          coverMetadata = removeUndefinedDeep({
            coverStatus: "failed" as CoverStatus,
            coverFailureReason: coverResult.failureReason,
            coverImageModelProfile: coverResult.primaryProfile,
            coverImageDurationMs: coverResult.durationMs,
            coverImageFallbackUsed: coverResult.fallbackUsed,
            hasCoverPage: false,
            readingStructureVersion: "v1_pages_only",
          });
        }
      } catch (err) {
        logger.error("Cover image generation unexpected error", {
          bookId,
          error: err instanceof Error ? err.message : String(err),
        });
        coverMetadata = { coverStatus: "failed" as CoverStatus, coverFailureReason: "unexpected_error", hasCoverPage: false, readingStructureVersion: "v1_pages_only" as const };
      }
    } else if (coverImagePrompt && !deps.uploadCoverImage) {
      logger.warn("uploadCoverImage not configured, skipping cover generation", { bookId });
      coverMetadata = { coverStatus: "failed" as CoverStatus, coverFailureReason: "upload_not_configured", hasCoverPage: false, readingStructureVersion: "v1_pages_only" as const };
    }

    // Step 9: Compute book-level metrics and status
    const successResults = pageResults.filter((r) => r.success);
    const failedResults = pageResults.filter((r) => !r.success);
    const imageSuccessCount = successResults.length;
    const imageFailureCount = failedResults.length;
    const failedPageNumbers = failedResults.map((r) => r.pageIndex);
    const durations = pageResults.map((r) => r.durationMs).filter((d) => d > 0);
    const averageImageDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    const maxImageDurationMs = durations.length > 0 ? Math.max(...durations) : 0;
    const generationDurationMs = Date.now() - generationStartMs;
    const generationReliabilityStatus =
      imageFailureCount === 0 ? "ok" : imageSuccessCount > 0 ? "partial" : "failed";

    const bookStatus: "completed" | "partial_completed" | "failed" =
      imageFailureCount === 0
        ? "completed"
        : imageSuccessCount > 0
          ? "partial_completed"
          : "failed";

    const bookMetrics = removeUndefinedDeep({
      imageSuccessCount,
      imageFailureCount,
      totalImageCount: totalPages,
      failedPageNumbers: failedPageNumbers.length > 0 ? failedPageNumbers : undefined,
      generationDurationMs,
      averageImageDurationMs,
      maxImageDurationMs,
      generationReliabilityStatus,
      generationMode,
    });

    if (bookStatus === "failed") {
      await deps.updateBookFailure(bookId, "すべてのページの画像生成に失敗しました。しばらく経ってから再作成してください。");
      await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
        ...bookMetrics,
        ...coverMetadata,
        failureStage: "image_generation",
        failureProvider: "replicate",
        failureReason: "unknown",
        retryable: true,
        technicalErrorMessage: `All ${totalPages} pages failed`,
      }));
    } else {
      await deps.updateBookStoryGenerationMetadata(bookId, {
        ...bookMetrics,
        ...coverMetadata,
        ...(bookStatus === "completed" ? createCompletedAtPatch() : createCompletedAtPatch()),
      });
    }

    await deps.updateBookStatus(bookId, bookStatus);

    if (bookStatus !== "failed") {
      // Consumption logic: Prefer monthly quota, then single credits.
      if (isAdminUser) {
        // 管理者のテスト生成は月次カウント・クレジットを一切消費しない。
      } else if (process.env.NODE_ENV !== "development") {
        const monthlyCount = await deps.getUserMonthlyCount(bookData.userId);
        const canUseMonthly = canGenerateBookThisMonth({ userPlan, currentCount: monthlyCount });

        if (canUseMonthly && !normalizedBookData.isSinglePurchase) {
          await deps.incrementMonthlyCount(bookData.userId);
        } else {
          const credits = await deps.getUserCredits(bookData.userId);
          const purchaseType = normalizedBookData.singlePurchaseType || (normalizedBookData.creationMode === "photo_story" ? "photo_story" : "ai_guided");
          const hasSpecificCredit = purchaseType === "photo_story" ? (credits.photoStoryCredits > 0) : (credits.aiGuidedCredits > 0);

          if (hasSpecificCredit) {
            await deps.consumeCredit(bookData.userId, purchaseType);
          } else if (credits.singleBookCredits > 0) {
            await deps.consumeCredit(bookData.userId, "legacy");
          } else if (canUseMonthly) {
            // fallback to monthly if somehow isSinglePurchase was set but no credits found
            await deps.incrementMonthlyCount(bookData.userId);
          } else {
            // This should ideally not happen if Step 3 passed, but as a safety:
            await deps.incrementMonthlyCount(bookData.userId);
          }
        }
      } else {
        // In dev, just increment monthly
        await deps.incrementMonthlyCount(bookData.userId);
      }
    }

    console.log(`Book ${bookId} generation ${bookStatus}: ${imageSuccessCount}/${totalPages} pages succeeded`);

    // P2-2/P4-2: Log book outcome for SLO measurement.
    logGenerationEvent({
      eventName: "book_outcome",
      bookId,
      userPresent: !!bookData.userId,
      templateId: resolvedTemplateId,
      creationMode: resolvedCreationMode as import("./lib/types").CreationMode,
      resolvedImageModelProfile: normalizedBookData.imageModelProfile,
      bookStatus,
      totalPages,
      completedPages: imageSuccessCount,
      failedPages: imageFailureCount,
      fallbackPages: pageResults.filter((r) => r.fallbackUsed).length,
      timedOutPages: pageResults.filter((r) => r.timeoutCount > 0).length,
      durationMs: generationDurationMs,
      storyDurationMs,
    });
  } catch (err) {
    console.error(`Book generation failed for ${bookId}:`, err);
    const message = err instanceof Error ? err.message : "Unknown generation error";
    await deps.updateBookFailure(bookId, message);
    await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
      failureStage: "validation",
      failureProvider: "system",
      failureReason: "unknown",
      retryable: false,
      technicalErrorMessage: message,
    }));
    await deps.updateBookStatus(bookId, "failed");
    // P2-2: Log unexpected failure. templateId/creationMode not in scope here (declared inside try).
    logGenerationEvent({
      eventName: "book_early_failed",
      bookId,
      userPresent: !!bookData.userId,
      templateId: bookData.templateId ?? bookData.theme,
      failureStage: "unexpected",
      failureProvider: "system",
      errorCategory: categorizeError(message),
      retryable: false,
    });
  }
}

function resolveEnableRecurringCharacterReference(generationMode: string): boolean {
  if (process.env.ENABLE_RECURRING_CHARACTER_REFERENCE === "true") {
    return true;
  }
  if (process.env.ENABLE_RECURRING_CHARACTER_REFERENCE === "false") {
    return false;
  }
  return generationMode === "quality";
}

/**
 * T3-C: Normalize and validate book generation settings based on user plan and creation mode.
 * Enforces page count restrictions, especially for fixed templates.
 * Throws an error if the requested configuration is prohibited by the user's plan.
 */
export function normalizeBookForGeneration(
  bookData: BookData,
  template: TemplateData,
  userPlan: "free" | "premium"
): BookData {
  const creationMode = template.creationMode ?? bookData.creationMode ?? "guided_ai";
  const isSinglePurchase = bookData.isSinglePurchase === true;

  // 1. Determine the base product plan.
  // Single purchases always use premium-equivalent settings (T3-B).
  const requestedProductPlan = isSinglePurchase
    ? "premium_paid"
    : (bookData.productPlan ?? getDefaultProductPlanForCreationMode(creationMode));

  let normalizedPlan = requestedProductPlan;

  // 2. Entitlement check (only for non-single-purchase)
  if (!isSinglePurchase && !canUseProductPlan({ userPlan, productPlan: requestedProductPlan })) {
    if (creationMode === "fixed_template") {
      normalizedPlan = "free";
      console.log(
        `Paid plan normalized to free for book generation. requested=${requestedProductPlan}, userPlan=${userPlan}, creationMode=${creationMode}`
      );
    } else {
      // TODO: Tighten paid-plan entitlement enforcement for guided_ai / original_ai after billing rollout.
      console.log(
        `Paid plan requested without entitlement, but kept for compatibility. requested=${requestedProductPlan}, userPlan=${userPlan}, creationMode=${creationMode}`
      );
    }
  }

  // 3. Creation mode compatibility check
  const requestedPlanConfig = getPlanConfig(normalizedPlan);
  normalizedPlan =
    requestedPlanConfig.allowedCreationModes.includes(creationMode)
      ? normalizedPlan
      : getDefaultProductPlanForCreationMode(creationMode);

  const normalizedPlanConfig = getPlanConfig(normalizedPlan);

  // 4. Page count enforcement (Phase 3-C)
  const fixedTemplatePageCount = template.fixedStory?.pages.length;
  let normalizedPageCount: BookData["pageCount"];

  if (creationMode === "fixed_template" && fixedTemplatePageCount !== undefined) {
    // For fixed templates, the template's page count MUST be allowed by the plan.
    if (!normalizedPlanConfig.allowedPageCounts.includes(fixedTemplatePageCount as BookData["pageCount"])) {
      // User-facing message (surfaced via updateBookFailure). UI also gates the
      // page-count selector, so this is a defense-in-depth safety net.
      throw new Error(
        `${fixedTemplatePageCount}ページの絵本は現在のプランでは作成できません。上位プランにアップグレードすると作成できます。`
      );
    }
    normalizedPageCount = fixedTemplatePageCount as BookData["pageCount"];
  } else {
    normalizedPageCount = normalizedPlanConfig.allowedPageCounts.includes(bookData.pageCount)
      ? bookData.pageCount
      : normalizedPlanConfig.defaultPageCount;
  }

  return {
    ...bookData,
    creationMode,
    productPlan: normalizedPlan,
    imageQualityTier: isSinglePurchase ? "premium" : normalizedPlanConfig.imageQualityTier,
    characterConsistencyMode:
      bookData.characterConsistencyMode ?? normalizedPlanConfig.characterConsistencyMode,
    imageModelProfile:
      isSinglePurchase
        ? "kontext_max"
        : (bookData.imageModelProfile ?? normalizedPlanConfig.imageModelProfile),
    scenePolicy: resolveScenePolicy(bookData, template),
    pageCount: normalizedPageCount,
    generationMode: isSinglePurchase ? "quality" : normalizedPlanConfig.generationMode,
  };
}


function buildInputImageRefs(
  childProfileSnapshot: BookData["childProfileSnapshot"] | undefined,
  cast: GeneratedStory["cast"],
  appearingCharacterIds?: string[],
  prevPageImageUrl?: string,
  sourcePhotoUrl?: string
): Array<{
  role: InputImageRole;
  characterId?: string;
  url: string;
  source?: InputImageSource;
}> {
  const refs: Array<{
    role: InputImageRole;
    characterId?: string;
    url: string;
    source?: InputImageSource;
  }> = [
    sourcePhotoUrl
      ? {
          role: "style_reference" as const, // High priority for photo_story mode consistency
          url: sourcePhotoUrl,
        }
      : undefined,
    childProfileSnapshot?.visualProfile.referenceImageUrl
      ? {
          role: "character_reference",
          characterId: "child_protagonist",
          url: toPublicUrl(childProfileSnapshot.visualProfile.referenceImageUrl),
          source: "referenceImageUrl" as const,
        }
      : undefined,
    childProfileSnapshot?.visualProfile.approvedImageUrl
      ? {
          role: "character_reference",
          characterId: "child_protagonist",
          url: toPublicUrl(childProfileSnapshot.visualProfile.approvedImageUrl),
          source: "approvedImageUrl" as const,
        }
      : undefined,
  ].filter(Boolean) as Array<{
    role: InputImageRole;
    characterId?: string;
    url: string;
    source?: InputImageSource;
  }>;

  for (const character of cast ?? []) {
    if (!appearingCharacterIds?.includes(character.characterId)) {
      continue;
    }

    const candidates: Array<[string | undefined, InputImageSource]> = [
      [character.approvedImageUrl, "approvedImageUrl"],
      [character.referenceImageUrl, "referenceImageUrl"],
      [character.generatedReferenceImageUrl, "generatedReferenceImageUrl"],
    ];

    for (const [url, source] of candidates) {
      if (!url) {
        continue;
      }
      refs.push({
        role: "character_reference",
        characterId: character.characterId,
        url: toPublicUrl(url),
        source,
      });
    }
  }

  if (prevPageImageUrl) {
    refs.push({
      role: "prev_page_reference",
      url: prevPageImageUrl,
    });
  }

  const deduped = refs.filter(
    (ref, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.url === ref.url &&
          candidate.characterId === ref.characterId &&
          candidate.source === ref.source &&
          candidate.role === ref.role
      ) === index
  );

  return deduped.slice(0, 2);
}

function buildInputImageRoles(
  inputImageRefs: Array<{ role: InputImageRole }>,
  stylePreviewUsedAsReference = false
): InputImageRole[] {
  const roles = new Set(inputImageRefs.map((ref) => ref.role));
  if (stylePreviewUsedAsReference) {
    roles.add("style_reference");
  }
  return Array.from(roles);
}

function shouldGenerateRecurringCharacterReference(
  character: StoryCharacter,
  story: GeneratedStory,
  bookData: BookData
): boolean {
  if (!["standard_paid", "premium_paid"].includes(bookData.productPlan ?? "free")) {
    return false;
  }

  if (
    character.approvedImageUrl ||
    character.referenceImageUrl ||
    character.generatedReferenceImageUrl
  ) {
    return false;
  }

  if (!["magical_creature", "object_character", "animal"].includes(character.characterKind ?? "")) {
    return false;
  }

  const appearances = story.pages.filter((page) =>
    page.appearingCharacterIds?.includes(character.characterId)
  ).length;
  return appearances >= 2;
}

function buildRecurringCharacterReferencePrompt(
  character: StoryCharacter,
  story: GeneratedStory,
  bookData: BookData
): string {
  const styleProfile = getIllustrationStyleProfile(bookData.style);
  return [
    `Character reference illustration for recurring character ${character.characterId}.`,
    `Draw exactly one recurring ${character.characterKind ?? "non-human"} character on a clean, simple background.`,
    "No protagonist, no extra children, no other characters, no duplicated character, no scenery clutter.",
    character.nonHuman ? "This character must remain clearly non-human." : "",
    character.noHumanFace ? "Do not give it a human face." : "",
    character.noHumanBody ? "Do not give it a human body, human hair, human clothes, human arms, or human legs." : "",
    character.scaleHint ? `Scale hint: ${character.scaleHint}.` : "",
    `Visual identity: ${character.visualBible}`,
    character.silhouette ? `Silhouette: ${character.silhouette}.` : "",
    character.colorPalette?.length ? `Color palette: ${character.colorPalette.join(", ")}.` : "",
    character.signatureItems?.length ? `Signature items: ${character.signatureItems.join(", ")}.` : "",
    character.doNotChange?.length ? `Do not change: ${character.doNotChange.join("; ")}.` : "",
    character.negativeCharacterRules?.length
      ? `Negative rules: ${character.negativeCharacterRules.join("; ")}.`
      : "",
    `Illustration style: ${styleProfile.styleBible}`,
    story.styleBible ? `Story-specific style consistency: ${story.styleBible}` : "",
    "wordless reference illustration, no written text, no captions, no labels, no signage, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * 相棒キャラクターの generatedImageUrl を cast エントリの referenceImageUrl に注入する。
 * companion が未設定・画像なし・cast に見つからない場合はそのまま返す（エラー非致命的）。
 */
async function injectCompanionCharacterReference(params: {
  story: GeneratedStory;
  mergedInput: BookInput;
}): Promise<GeneratedStory> {
  const { story, mergedInput } = params;
  if (!mergedInput.companionId || !story.cast?.length) return story;
  try {
    const companionSnap = await admin.firestore()
      .collection("companions").doc(mergedInput.companionId).get();
    if (!companionSnap.exists) {
      logger.warn("injectCompanionCharacterReference: companion not found", {
        companionId: mergedInput.companionId,
      });
      return story;
    }
    const companionData = companionSnap.data() as { name: string; generatedImageUrl?: string };
    if (!companionData.generatedImageUrl) return story;
    const companionNameLower = (mergedInput.companionName ?? companionData.name).toLowerCase();
    const updatedCast = story.cast.map((character) => {
      if (character.displayName.toLowerCase().includes(companionNameLower)) {
        return { ...character, referenceImageUrl: companionData.generatedImageUrl };
      }
      return character;
    });
    return { ...story, cast: updatedCast };
  } catch (err) {
    logger.warn("injectCompanionCharacterReference: failed, continuing without companion ref", {
      companionId: mergedInput.companionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return story;
  }
}

async function ensureRecurringCharacterReferences(params: {
  bookId: string;
  story: GeneratedStory;
  normalizedBookData: BookData;
  deps: Pick<GenerationDeps, "imageClient" | "uploadImage" | "replicateApiToken" | "openaiApiKey">;
}): Promise<GeneratedStory> {
  if (!params.story.cast?.length) {
    return params.story;
  }

  const nextCast: StoryCharacter[] = [];

  for (const [index, character] of params.story.cast.entries()) {
    if (!shouldGenerateRecurringCharacterReference(character, params.story, params.normalizedBookData)) {
      nextCast.push(character);
      continue;
    }

    const referencePrompt = buildRecurringCharacterReferencePrompt(
      character,
      params.story,
      params.normalizedBookData
    );

    const imagePurpose = "book_page" as const;
    const primaryProfile = resolveImageModelProfile({
      purpose: imagePurpose,
      imageQualityTier: params.normalizedBookData.imageQualityTier ?? "light",
      imageModelProfile: params.normalizedBookData.imageModelProfile,
    });
    const fallbackProfiles = resolveImageFallbackProfiles(primaryProfile);

    let success = false;
    let url: string | undefined;
    let lastError: unknown;

    search_loop: for (const profile of fallbackProfiles) {
      const maxRetries = 2;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const pid = resolveImageProviderId(profile);
          const hasToken = pid === "replicate" ? !!params.deps.replicateApiToken : !!params.deps.openaiApiKey;

          if (hasToken) {
            const uploader = makeCharacterReferenceUploader({
              bookId: params.bookId,
              characterIndex: index,
              uploadImage: params.deps.uploadImage,
            });

            const adapter = createImageAdapter({
              imageModelProfile: profile,
              replicateApiToken: params.deps.replicateApiToken || "",
              openaiApiKey: params.deps.openaiApiKey || "",
              replicateUploader: uploader,
              openaiUploader: uploader,
            });

            const result = await withImageTimeout(
              adapter.generateCharacterReferenceImage({
                prompt: referencePrompt,
                imageModelProfile: profile,
                inputImageUrls: [],
                metadata: {
                  bookId: params.bookId,
                  characterId: character.characterId,
                },
              }),
              IMAGE_GENERATION_TIMEOUT_MS
            );

            logGenerationEvent({
              eventName: "page_image_succeeded",
              bookId: params.bookId,
              pageIndex: -100 - index, // Conventional negative index for character references
              imageModelProfile: profile,
              imageModel: result.modelLabel || resolveReplicateModel({
                purpose: imagePurpose,
                imageQualityTier: params.normalizedBookData.imageQualityTier,
                imageModelProfile: profile,
              }),
              provider: pid as "replicate" | "openai",
              durationMs: result.durationMs ?? 0,
              attemptCount: (profile === primaryProfile ? attempt + 1 : 2 + attempt + 1), // best effort attempt count
              fallbackUsed: profile !== primaryProfile,
            });

            url = result.imageUrl;
            success = true;
            break search_loop;
          }

          // Legacy path fallback (primarily for test environments without adapter tokens)
          const refStartMs = Date.now();
          const buffer = await withImageTimeout(
            params.deps.imageClient.generateImage(referencePrompt, {
              purpose: imagePurpose,
              imageQualityTier: params.normalizedBookData.imageQualityTier,
              imageModelProfile: profile,
              inputImageUrls: [],
            }),
            IMAGE_GENERATION_TIMEOUT_MS
          );
          const durationMs = Date.now() - refStartMs;
          const currentProvider = resolveProviderFromProfile(profile);
          const currentImageModel = currentProvider === "replicate"
            ? resolveReplicateModel({
                purpose: imagePurpose,
                imageQualityTier: params.normalizedBookData.imageQualityTier,
                imageModelProfile: profile,
              })
            : resolveOpenAIModelLabel(false);

          logGenerationEvent({
            eventName: "page_image_succeeded",
            bookId: params.bookId,
            pageIndex: -100 - index,
            imageModelProfile: profile,
            imageModel: currentImageModel,
            provider: currentProvider,
            durationMs,
            attemptCount: (profile === primaryProfile ? attempt + 1 : 2 + attempt + 1),
            fallbackUsed: profile !== primaryProfile,
          });

          url = await params.deps.uploadImage(params.bookId, -100 - index, buffer);
          success = true;
          break search_loop;
        } catch (err) {
          lastError = err;
          if (err instanceof ImageTimeoutError) {
            logger.warn("Recurring character reference generation timeout", {
              bookId: params.bookId,
              characterId: character.characterId,
              profile,
              attempt,
              timeoutMs: IMAGE_GENERATION_TIMEOUT_MS,
            });
            break; // Try next profile
          }

          const retryAfterMs = getRetryAfterMs(err);
          logger.warn("Recurring character reference generation attempt failed", {
            bookId: params.bookId,
            characterId: character.characterId,
            profile,
            attempt,
            error: err instanceof Error ? err.message : String(err),
          });
          if (attempt < maxRetries - 1) {
            if (retryAfterMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 30_000)));
            } else {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            continue;
          }
          break; // Try next profile
        }
      }
    }

    if (success && url) {
      nextCast.push(
        removeUndefinedDeep({
          ...character,
          generatedReferenceImageUrl: url,
          referenceImageGeneratedAt: admin.firestore.Timestamp.now(),
          referenceImagePrompt: referencePrompt,
          referenceImageStatus: "completed" as const,
        }) as StoryCharacter
      );
    } else {
      logger.warn("Recurring character reference generation failed after fallbacks, continuing without reference", {
        bookId: params.bookId,
        characterId: character.characterId,
        error: lastError instanceof Error ? lastError.message : String(lastError),
      });
      nextCast.push(
        removeUndefinedDeep({
          ...character,
          referenceImagePrompt: referencePrompt,
          referenceImageStatus: "failed" as const,
        }) as StoryCharacter
      );
    }
  }

  return {
    ...params.story,
    cast: nextCast,
  };
}

function collectMissingReferenceCharacters(
  cast: GeneratedStory["cast"],
  appearingCharacterIds?: string[],
  inputImageRefs?: Array<{ characterId?: string }>
): string[] | undefined {
  if (!appearingCharacterIds?.length) {
    return undefined;
  }

  const referencedCharacterIds = new Set(
    (inputImageRefs ?? []).map((ref) => ref.characterId).filter((value): value is string => Boolean(value))
  );

  const missing = appearingCharacterIds.filter((characterId) => {
    if (characterId === "child_protagonist") {
      return !referencedCharacterIds.has("child_protagonist");
    }
    const character = cast?.find((entry) => entry.characterId === characterId);
    if (!character) {
      return true;
    }
    return !(
      character.approvedImageUrl ||
      character.referenceImageUrl ||
      character.generatedReferenceImageUrl
    );
  });

  return missing.length > 0 ? [...new Set(missing)] : undefined;
}

function collectPageTextQualityWarnings(
  report: StoryQualityReport,
  pageIndex: number
): string[] {
  return report.issues
    .filter((issue) => issue.pageIndex === pageIndex && issue.severity === "warning")
    .map((issue) => issue.code);
}

function shouldRewriteStoryText(
  _bookData: BookData,
  report: StoryQualityReport
): boolean {
  return report.issues.some((issue) =>
    [
      "text_too_childish",
      "too_many_sound_words",
      "unnatural_japanese_risk",
      "text_too_generic",
      "sentence_too_short_for_age",
      "missing_story_goal",
      "missing_main_quest_object",
      "main_quest_drift",
      "forbidden_object_became_goal",
      "hidden_detail_used_as_main_goal",
      "page_text_not_connected_to_story_goal",
    ].includes(issue.code)
  );
}

const FATAL_QUALITY_ERROR_CODES = new Set([
  "pages.empty",
  "text.empty",
  "missing_quest_object_resolution",
  "main_quest_drift_persistent",
  "forbidden_object_became_goal_persistent",
]);

export function shouldFailBookForQuality(
  report: StoryQualityReport,
  productPlan?: BookData["productPlan"]
): boolean {
  if (productPlan !== "premium_paid") {
    return report.issues.some((issue) => issue.severity === "error");
  }

  return report.issues.some(
    (issue) => issue.severity === "error" && FATAL_QUALITY_ERROR_CODES.has(issue.code)
  );
}

function buildStoryQualityTechnicalMessage(report: StoryQualityReport): string {
  return report.issues
    .map((issue) => {
      const page = issue.pageIndex !== undefined ? `page=${issue.pageIndex + 1}` : "";
      const actual = issue.actual !== undefined ? `actual=${issue.actual}` : "";
      const expected = issue.expected !== undefined ? `expected=${issue.expected}` : "";
      return [issue.code, page, actual, expected].filter(Boolean).join(" ");
    })
    .join(" | ")
    .slice(0, 1000);
}

async function generateStoryWithQualityGate(params: {
  llmClient: LLMClient;
  template: TemplateData;
  normalizedBookData: BookData;
  mergedInput: BookInput;
  readingProfile: AgeReadingProfile;
  sourcePhotos?: Array<{ mimeType: string; data: string }>;
}): Promise<{
  story: GeneratedStory;
  qualityReport: StoryQualityReport;
  rewriteMetadata?: Pick<BookData, "storyTextRewriteUsed" | "storyTextRewriteModel" | "storyTextRewriteAttempts">;
}> {
  const baseSystemPrompt = buildSystemPrompt(
    params.template,
    params.normalizedBookData.style,
    params.readingProfile,
    params.mergedInput
  );
  const storyModelCandidates = resolveStoryModelCandidates({
    productPlan: params.normalizedBookData.productPlan,
    creationMode: params.normalizedBookData.creationMode,
    theme: params.normalizedBookData.theme,
    categoryGroupId: params.template.categoryGroupId,
  });

  let story = normalizeStoryForBook(await params.llmClient.generateStory({
    systemPrompt: baseSystemPrompt,
    childName: params.mergedInput.childName,
    childAge: params.mergedInput.childAge,
    favorites: params.mergedInput.favorites,
    lessonToTeach: params.mergedInput.lessonToTeach,
    memoryToRecreate: params.mergedInput.memoryToRecreate,
    characterLook: params.mergedInput.characterLook,
    signatureItem: params.mergedInput.signatureItem,
    colorMood: params.mergedInput.colorMood,
    place: params.mergedInput.place,
    familyMembers: params.mergedInput.familyMembers,
    season: params.mergedInput.season,
    parentMessage: params.mergedInput.parentMessage,
    storyRequest: params.mergedInput.storyRequest,
    freeInput: params.mergedInput.freeInput,
    pageCount: params.normalizedBookData.pageCount,
    style: params.normalizedBookData.style,
    productPlan: params.normalizedBookData.productPlan,
    creationMode: params.normalizedBookData.creationMode,
    theme: params.normalizedBookData.theme,
    categoryGroupId: params.template.categoryGroupId,
    storyModelCandidates,
    sourcePhotos: params.sourcePhotos,
  }), params.normalizedBookData, params.mergedInput);

  let qualityReport = validateGeneratedStoryQuality({
    story,
    readingProfile: params.readingProfile,
    creationMode: params.normalizedBookData.creationMode,
    productPlan: params.normalizedBookData.productPlan,
  });
  let rewriteMetadata:
    | Pick<BookData, "storyTextRewriteUsed" | "storyTextRewriteModel" | "storyTextRewriteAttempts">
    | undefined;

  const forceRewrite =
    params.normalizedBookData.productPlan === "premium_paid" ||
    params.normalizedBookData.creationMode === "original_ai";
  const maxRewritePasses = forceRewrite ? 2 : 1;
  let rewritePassCount = 0;
  let lastRewriteModel: string | undefined;

  while (
    params.llmClient.rewriteStoryText &&
    rewritePassCount < maxRewritePasses &&
    (forceRewrite || shouldRewriteStoryText(params.normalizedBookData, qualityReport))
  ) {
    const rewritten = await params.llmClient.rewriteStoryText({
      story,
      systemPrompt: baseSystemPrompt,
      childName: params.mergedInput.childName,
      childAge: params.mergedInput.childAge,
      style: params.normalizedBookData.style,
      productPlan: params.normalizedBookData.productPlan,
      creationMode: params.normalizedBookData.creationMode,
      storyModelCandidates,
    });

    rewritePassCount += 1;
    lastRewriteModel = rewritten.storyTextRewriteModel ?? lastRewriteModel;
    story = {
      ...story,
      pages: story.pages.map((page, index) => ({
        ...page,
        text: rewritten.pages[index]?.text ?? page.text,
      })),
    };
    rewriteMetadata = {
      storyTextRewriteUsed: true,
      storyTextRewriteModel: lastRewriteModel,
      storyTextRewriteAttempts: rewritePassCount,
    };
    qualityReport = validateGeneratedStoryQuality({
      story,
      readingProfile: params.readingProfile,
      creationMode: params.normalizedBookData.creationMode,
      productPlan: params.normalizedBookData.productPlan,
    });

    if (!forceRewrite && !shouldRewriteStoryText(params.normalizedBookData, qualityReport)) {
      break;
    }
    if (qualityReport.ok && rewritePassCount >= 1) {
      break;
    }
  }

  if (qualityReport.ok) {
    return { story, qualityReport, rewriteMetadata };
  }

  story = normalizeStoryForBook(await params.llmClient.generateStory({
    systemPrompt: appendQualityRetryInstruction(baseSystemPrompt, qualityReport),
    childName: params.mergedInput.childName,
    childAge: params.mergedInput.childAge,
    favorites: params.mergedInput.favorites,
    lessonToTeach: params.mergedInput.lessonToTeach,
    memoryToRecreate: params.mergedInput.memoryToRecreate,
    characterLook: params.mergedInput.characterLook,
    signatureItem: params.mergedInput.signatureItem,
    colorMood: params.mergedInput.colorMood,
    place: params.mergedInput.place,
    familyMembers: params.mergedInput.familyMembers,
    season: params.mergedInput.season,
    parentMessage: params.mergedInput.parentMessage,
    storyRequest: params.mergedInput.storyRequest,
    freeInput: params.mergedInput.freeInput,
    pageCount: params.normalizedBookData.pageCount,
    style: params.normalizedBookData.style,
    productPlan: params.normalizedBookData.productPlan,
    creationMode: params.normalizedBookData.creationMode,
    theme: params.normalizedBookData.theme,
    categoryGroupId: params.template.categoryGroupId,
    storyModelCandidates,
    sourcePhotos: params.sourcePhotos,
  }), params.normalizedBookData, params.mergedInput);

  rewritePassCount = rewriteMetadata?.storyTextRewriteAttempts ?? 0;
  while (
    params.llmClient.rewriteStoryText &&
    rewritePassCount < maxRewritePasses &&
    (forceRewrite || shouldRewriteStoryText(params.normalizedBookData, qualityReport))
  ) {
    const rewritten = await params.llmClient.rewriteStoryText({
      story,
      systemPrompt: baseSystemPrompt,
      childName: params.mergedInput.childName,
      childAge: params.mergedInput.childAge,
      style: params.normalizedBookData.style,
      productPlan: params.normalizedBookData.productPlan,
      creationMode: params.normalizedBookData.creationMode,
      storyModelCandidates,
    });
    rewritePassCount += 1;
    lastRewriteModel = rewritten.storyTextRewriteModel ?? lastRewriteModel;
    story = {
      ...story,
      pages: story.pages.map((page, index) => ({
        ...page,
        text: rewritten.pages[index]?.text ?? page.text,
      })),
    };
    rewriteMetadata = {
      storyTextRewriteUsed: true,
      storyTextRewriteModel: lastRewriteModel,
      storyTextRewriteAttempts: rewritePassCount,
    };
    qualityReport = validateGeneratedStoryQuality({
      story,
      readingProfile: params.readingProfile,
      creationMode: params.normalizedBookData.creationMode,
      productPlan: params.normalizedBookData.productPlan,
    });
    if (!forceRewrite && !shouldRewriteStoryText(params.normalizedBookData, qualityReport)) {
      break;
    }
    if (qualityReport.ok && rewritePassCount >= 1) {
      break;
    }
  }

  qualityReport = validateGeneratedStoryQuality({
    story,
    readingProfile: params.readingProfile,
    creationMode: params.normalizedBookData.creationMode,
    productPlan: params.normalizedBookData.productPlan,
  });

  return { story, qualityReport, rewriteMetadata };
}

function generateFixedTemplateStoryWithQualityReport(
  fixedStory: FixedStoryTemplate,
  mergedInput: BookInput,
  bookData: BookData,
  template: TemplateData,
  readingProfile: AgeReadingProfile
): { story: GeneratedStory; qualityReport: StoryQualityReport } {
  const story = buildStoryFromFixedTemplate(
    fixedStory,
    mergedInput,
    bookData,
    template,
    readingProfile
  );
  return {
    story,
    qualityReport: validateGeneratedStoryQuality({
      story,
      readingProfile,
      creationMode: "fixed_template",
      productPlan: bookData.productPlan,
    }),
  };
}

function buildStoryFromFixedTemplate(
  fixedStory: FixedStoryTemplate,
  mergedInput: BookInput,
  bookData: BookData,
  template: TemplateData,
  readingProfile: { ageBand: AgeBand }
): GeneratedStory {
  const replacements = buildFixedTemplateReplacements(mergedInput);

  const companionId = mergedInput.companionId;
  const companionName = mergedInput.companionName;
  const companionVisual = mergedInput.companionVisualDescription;

  const hasCompanion = Boolean(companionId && companionName && companionVisual);
  const companionCharacterId = "companion_character";

  const pages = fixedStory.pages.map((page, index) => {
    const text = applyTemplateReplacements(
      page.textTemplatesByAge?.[readingProfile.ageBand]
        ?? page.textTemplatesByAge?.general_child
        ?? page.textTemplate,
      replacements
    );
    const imagePrompt = applyTemplateReplacements(page.imagePromptTemplate, replacements);

    // 相棒がいる場合、1ページおき（0, 2, 4...）に登場させる（半数以上）
    const appearingCharacterIds = ["child_protagonist"];
    if (hasCompanion && index % 2 === 0) {
      appearingCharacterIds.push(companionCharacterId);
    }

    return {
      text,
      imagePrompt,
      pageVisualRole: page.pageVisualRole,
      appearingCharacterIds,
    };
  });

  const cast: StoryCharacter[] = [];
  if (hasCompanion) {
    cast.push({
      characterId: companionCharacterId,
      displayName: companionName!,
      role: "buddy",
      characterKind: "magical_creature",
      visualBible: companionVisual!,
      nonHuman: true,
      noHumanFace: true,
      noHumanBody: true,
    });
  }

  return {
    title: applyTemplateReplacements(fixedStory.titleTemplate, replacements),
    coverImagePrompt: fixedStory.coverImagePromptTemplate
      ? applyTemplateReplacements(fixedStory.coverImagePromptTemplate, replacements)
      : undefined,
    titleSpreadText: fixedStory.titleSpreadTextTemplate
      ? applyTemplateReplacements(fixedStory.titleSpreadTextTemplate, replacements)
      : undefined,
    openingNarration: fixedStory.openingNarrationTemplate
      ? applyTemplateReplacements(fixedStory.openingNarrationTemplate, replacements)
      : undefined,
    characterBible: buildFixedCharacterBible(bookData, mergedInput),
    styleBible: buildFixedStyleBible(bookData, template),
    narrativeDevice: undefined,
    pages,
    cast: cast.length > 0 ? cast : undefined,
  };
}

export function buildFixedTemplateReplacements(input: BookInput): Record<string, string> {
  const fallbackParentMessage = "いつもありがとう";

  return {
    childName: input.childName,
    childAge: input.childAge ? String(input.childAge) : "3",
    favorites: input.favorites || "だいすきなもの",
    lessonToTeach: input.lessonToTeach || "やさしさ",
    memoryToRecreate: input.memoryToRecreate || "たのしい思い出",
    characterLook: input.characterLook || "gentle preschool child",
    signatureItem: input.signatureItem || "a small familiar item",
    colorMood: input.colorMood || "soft warm colors",
    place: input.place || "たのしい場所",
    familyMembers: input.familyMembers || "家族",
    season: input.season || "やさしい季節",
    parentMessage: input.parentMessage || fallbackParentMessage,
    storyRequest: input.storyRequest || "a gentle family story",
  };
}

export function applyTemplateReplacements(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => replacements[key] ?? "");
}

function buildFixedCharacterBible(bookData: BookData, input: BookInput): string {
  const childProfile = bookData.childProfileSnapshot;
  const appearance = [
    childProfile?.visualProfile.characterBible,
    input.characterLook ? `Appearance: ${input.characterLook}.` : "",
    input.signatureItem ? `Signature item: ${input.signatureItem}.` : "",
    input.childAge ? `Age impression: ${input.childAge} years old.` : "",
    `Keep the protagonist as ${input.childName}, a warm child-friendly picture book hero.`,
    buildCharacterConsistencyRules(bookData),
  ]
    .filter(Boolean)
    .join(" ");

  return appearance;
}

function buildFixedStyleBible(bookData: BookData, template: TemplateData): string {
  const styleProfile = getIllustrationStyleProfile(bookData.style);
  return [
    `Use a consistent ${styleProfile.name} picture book rendering across every page.`,
    styleProfile.styleBible,
    template.visualDirection ? `Visual direction: ${template.visualDirection}` : "",
    "Keep lighting soft, compositions clear, and the mood safe and gentle for young children.",
  ]
    .filter(Boolean)
    .join(" ");
}

function getPageImagePurpose(pageIndex: number, theme: string): ImagePurpose {
  if (pageIndex === 0 && theme === "memory") {
    return "memory_key_page";
  }
  return "book_page";
}

export function shouldUseCharacterReferenceForPage(params: {
  pageIndex: number;
  totalPages: number;
  imagePurpose: ImagePurpose;
  characterConsistencyMode?: CharacterConsistencyMode;
}): boolean {
  const mode = params.characterConsistencyMode ?? "cover_only";

  if (mode === "all_pages") {
    return true;
  }

  if (mode === "cover_only") {
    return params.imagePurpose === "book_cover" || params.imagePurpose === "memory_key_page";
  }

  const emotionalPeakIndex = Math.min(
    Math.max(0, Math.floor(params.totalPages * 0.6)),
    Math.max(0, params.totalPages - 1)
  );

  return (
    params.pageIndex === 0 ||
    params.pageIndex === emotionalPeakIndex ||
    params.pageIndex === params.totalPages - 1
  );
}

function mergeInputWithChildProfile(input: BookInput, snapshot: BookData["childProfileSnapshot"]): BookInput {
  if (!snapshot) return input;

  const favoriteThings = snapshot.personality.favoriteThings?.join("、");
  const visualProfile = snapshot.visualProfile;
  const signatureItem = bookSignatureItem(snapshot, input);

  return {
    ...input,
    childName: input.childName || snapshot.nickname || snapshot.displayName,
    childAge: input.childAge ?? snapshot.age,
    favorites: input.favorites || favoriteThings,
    characterLook: input.characterLook || visualProfile.characterLook,
    signatureItem,
    colorMood: input.colorMood || visualProfile.colorMood,
  };
}

function bookSignatureItem(snapshot: NonNullable<BookData["childProfileSnapshot"]>, input: BookInput): string | undefined {
  return input.signatureItem || snapshot.visualProfile.signatureItem;
}


function toPublicUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${PUBLIC_SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function getRetryAfterMs(err: unknown): number {
  if (!err || typeof err !== "object") return 0;

  const response = (err as { response?: { headers?: { get?: (name: string) => string | null } } }).response;
  const retryAfterHeader = response?.headers?.get?.("retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const fallback = (err as { retry_after?: number }).retry_after;
  if (typeof fallback === "number" && fallback > 0) {
    return fallback * 1000;
  }

  return 0;
}

/**
 * T6-59: Controlled production exposure gate for candidate image profiles.
 * Strips candidate profiles (e.g. "openai_image_candidate", "flux11_pro_candidate")
 * for users who have not been explicitly enrolled via generationOverride.allowCandidateProfile.
 * Returns undefined when gated (→ normalizeBookForGeneration falls back to plan default).
 */
export function gateImageModelProfile(
  requestedProfile: ImageModelProfile | undefined,
  candidateProfileEnabled: boolean
): ImageModelProfile | undefined {
  if (isCandidateProfile(requestedProfile) && !candidateProfileEnabled) {
    return undefined;
  }
  return requestedProfile;
}

// Firebase Cloud Function
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");
const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * Legacy image client factory for non-page image flows.
 * Used by: generateCoverImage() and ensureRecurringCharacterReferences().
 * Page image generation uses ImageProvider adapters (ReplicateImageAdapter / OpenAIImageAdapter)
 * via PROFILE_PROVIDER_MAP routing in generatePageImageWithFallback. (P3-15)
 */
function createImageClient(imageModelProfile?: ImageModelProfile): ImageClient {
  if (imageModelProfile === "openai_image_candidate") {
    const key = openaiApiKey.value();
    if (!key) {
      throw new Error("OPENAI_API_KEY secret is not configured");
    }
    return new OpenAIImageClient(key, OPENAI_IMAGE_CANDIDATE_PROFILE);
  }
  return new ReplicateImageClient(replicateApiToken.value());
}

export const generateBook = onDocumentCreated(
  {
    document: "books/{bookId}",
    secrets: [geminiApiKey, replicateApiToken, openaiApiKey],
    region: "asia-northeast1",
    memory: "1GiB",
    // Firestore トリガー関数の timeoutSeconds はプラットフォーム上限が 540s
    // （3600s は HTTP 関数のみ）。画像タイムアウトは 360s に引き上げ済みで、
    // 通常画像は数十秒で完了するため複数ページでも 540s 内に収まる。
    timeoutSeconds: 540,
  },
  async (event) => {
    const bookId = event.params.bookId;
    const bookData = event.data?.data() as BookData;

    if (!bookData) {
      console.error(`No book data found for ${bookId}`);
      return;
    }

    // Only process books with status "generating"
    if (bookData.status !== "generating") {
      console.log(`Skipping book ${bookId} with status ${bookData.status}`);
      return;
    }

    const db = admin.firestore();
    const storage = admin.storage();

    // T6-59: Controlled production exposure gate.
    // Read user doc once to check candidate profile enrollment AND plan (avoids duplicate reads).
    // Candidate profiles (openai_image_candidate, flux11_pro_candidate) are stripped for users
    // without generationOverride.allowCandidateProfile === true.
    const gateUserDoc = await db.collection("users").doc(bookData.userId).get();
    const gateUserData = gateUserDoc.data();
    const candidateProfileEnabled =
      gateUserData?.generationOverride?.allowCandidateProfile === true;
    const gatedModelProfile = gateImageModelProfile(bookData.imageModelProfile, candidateProfileEnabled);
    if (gatedModelProfile !== bookData.imageModelProfile) {
      logger.warn("Candidate image profile gated out — user not enrolled", {
        bookId,
        userId: bookData.userId,
        requestedProfile: bookData.imageModelProfile,
        effectiveProfile: gatedModelProfile ?? "(plan default)",
      });
    }
    // Apply gated profile to bookData before deps and processBookGeneration.
    const bookDataForProcessing: BookData =
      gatedModelProfile !== bookData.imageModelProfile
        ? { ...bookData, imageModelProfile: gatedModelProfile }
        : bookData;

    // P2-2: Log generation start with gate decision for SLO measurement.
    // Raw userId is intentionally omitted; userPresent is sufficient.
    const candidateWasRequested = isCandidateProfile(bookData.imageModelProfile);
    const candidateDecision: CandidateDecision = candidateWasRequested
      ? (candidateProfileEnabled ? "pass" : "blocked")
      : "not_applicable";
    logGenerationEvent({
      eventName: "generation_started",
      bookId,
      userPresent: !!bookData.userId,
      templateId: bookData.templateId ?? bookData.theme,
      requestedImageModelProfile: bookData.imageModelProfile,
      resolvedImageModelProfile: gatedModelProfile,
      candidateRequested: candidateWasRequested,
      candidateAllowed: candidateProfileEnabled,
      candidateDecision,
    });

    // Create production dependencies
    const deps: GenerationDeps = {
      getTemplate: async (theme: string) => {
        const templateDoc = await db.collection("templates").doc(theme).get();
        if (!templateDoc.exists) throw new Error(`Template not found: ${theme}`);
        return templateDoc.data() as TemplateData;
      },

      getUserPlan: async (userId: string) => {
        // Re-use pre-fetched gateUserData for the generating user to avoid a duplicate read.
        const userData =
          userId === bookData.userId
            ? gateUserData
            : (await db.collection("users").doc(userId).get()).data();
        if (userData?.generationOverride?.bypassMonthlyLimit === true) {
          return "premium";
        }
        return (userData?.plan as "free" | "premium" | undefined) ?? "free";
      },

      llmClient: new GeminiClient(geminiApiKey.value()),
      imageClient: createImageClient(gatedModelProfile),
      replicateApiToken: replicateApiToken.value(),
      openaiApiKey: openaiApiKey.value(),

      uploadImage: async (bookId: string, pageNumber: number, buffer: Buffer) => {
        const bucket = storage.bucket("story-gen-8a769.firebasestorage.app");
        const filename = `books/${bookId}/page-${pageNumber}.png`;
        const file = bucket.file(filename);
        const downloadToken = randomUUID();
        await file.save(buffer, {
          contentType: "image/png",
          metadata: {
            metadata: {
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
      },

      uploadCoverImage: async (bookId: string, buffer: Buffer) => {
        const bucket = storage.bucket("story-gen-8a769.firebasestorage.app");
        const filename = `books/${bookId}/cover.png`;
        const file = bucket.file(filename);
        const downloadToken = randomUUID();
        await file.save(buffer, {
          contentType: "image/png",
          metadata: {
            metadata: {
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
      },

      updateBookTitle: async (bookId: string, title: string) => {
        await db.collection("books").doc(bookId).update({ title });
      },

      updateBookCoverImage: async (bookId: string, imageUrl: string) => {
        await db.collection("books").doc(bookId).update({ coverImageUrl: imageUrl });
      },

      writePage: async (bookId: string, page: PageData) => {
        await db.collection("books").doc(bookId).collection("pages").doc(`page-${page.pageNumber}`).set(page);
      },

      updateBookProgress: async (bookId: string, progress: number) => {
        await db.collection("books").doc(bookId).update({ progress });
      },

      updateBookStatus: async (bookId: string, status: "completed" | "partial_completed" | "failed") => {
        const statusPatch =
          status === "failed" ? createFailedAtPatch() : createCompletedAtPatch();
        await db.collection("books").doc(bookId).update({
          status,
          ...statusPatch,
        });
      },

      updateBookFailure: async (bookId: string, message: string) => {
        await db.collection("books").doc(bookId).update({ errorMessage: message.slice(0, 500) });
      },

      updateBookFailureMetadata: async (bookId: string, data) => {
        await db.collection("books").doc(bookId).update({
          ...data,
          ...createUpdatedAtPatch(),
        });
      },

      updateBookStoryQualityReport: async (bookId: string, report) => {
        await db.collection("books").doc(bookId).update({
          storyQualityReport: report,
          ...createUpdatedAtPatch(),
        });
      },

      updateBookStoryGenerationMetadata: async (bookId: string, data) => {
        await db.collection("books").doc(bookId).update({
          ...data,
          ...createUpdatedAtPatch(),
        });
      },

      getUserMonthlyCount: async (userId: string) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const countDoc = await db.collection("users").doc(userId).collection("usage").doc(yearMonth).get();
        return countDoc.exists ? (countDoc.data()?.count || 0) : 0;
      },

      isUserAdmin: async (userId: string) => {
        try {
          const userRecord = await admin.auth().getUser(userId);
          return userRecord.customClaims?.admin === true;
        } catch (err) {
          console.error(`Failed to resolve admin claim for ${userId}:`, err);
          return false;
        }
      },

      incrementMonthlyCount: async (userId: string) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const countRef = db.collection("users").doc(userId).collection("usage").doc(yearMonth);
        await countRef.set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true });
      },

      getUserCredits: async (userId: string) => {
        const userDoc = await db.collection("users").doc(userId).get();
        const data = userDoc.data();
        return {
          singleBookCredits: data?.singleBookCredits || 0,
          aiGuidedCredits: data?.singlePurchaseCredits?.ai_guided || 0,
          photoStoryCredits: data?.singlePurchaseCredits?.photo_story || 0,
        };
      },

      consumeCredit: async (userId: string, type: "ai_guided" | "photo_story" | "legacy") => {
        const userRef = db.collection("users").doc(userId);
        if (type === "legacy") {
          await userRef.update({
            singleBookCredits: admin.firestore.FieldValue.increment(-1),
          });
        } else {
          // Keep singleBookCredits (total count) in sync when consuming typed credit
          await userRef.update({
            [`singlePurchaseCredits.${type}`]: admin.firestore.FieldValue.increment(-1),
            singleBookCredits: admin.firestore.FieldValue.increment(-1),
          });
        }
      },

      // P5-3c: Gated experiment flag — only set when the user's Firestore doc has
      // generationOverride.p5PageExperiment === "simplified_scene" (admin/QA testers only).
      p5PageExperiment:
        gateUserData?.generationOverride?.p5PageExperiment === "simplified_scene"
          ? "simplified_scene"
          : undefined,

      // P5-3f: Option C Safer High-Quality Retry gate — only set when the user's Firestore doc has
      // generationOverride.p5ModelUnification === "safer_retry" (admin/QA testers only).
      p5ModelUnification:
        gateUserData?.generationOverride?.p5ModelUnification === "safer_retry"
          ? "safer_retry"
          : undefined,
    };

    await processBookGeneration(bookId, bookDataForProcessing, deps);
  }
);
