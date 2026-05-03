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
} from "./lib/types";
import { sanitizeInput } from "./lib/content-filter";
import { buildSystemPrompt, buildImagePrompt, getStyleReferenceImagePath, appendQualityRetryInstruction } from "./lib/prompt-builder";
import { GeminiClient, GeminiServiceUnavailableError, resolveStoryModelCandidates } from "./lib/gemini";
import {
  ReplicateImageClient,
  resolveImageModelProfile,
  resolveReplicateModel,
} from "./lib/replicate";
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
import { removeUndefinedDeep } from "./lib/firestore-sanitize";

const IMAGE_RETRY_LIMIT = 3;
const IMAGE_REQUEST_INTERVAL_MS = 11_000;
const PUBLIC_SITE_URL = "https://story-gen-8a769.web.app";
const GEMINI_RETRYABLE_USER_MESSAGE =
  "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成してください。";
const STORY_SCHEMA_FAILURE_USER_MESSAGE =
  "絵本の構成データを整える途中で失敗しました。入力内容が原因ではない可能性があります。もう一度お試しください。";
const STORY_QUALITY_FAILURE_USER_MESSAGE =
  "絵本の内容を整えきれませんでした。もう一度作成すると、別の構成で成功する場合があります。";

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
        silhouette: character.silhouette,
        colorPalette: character.colorPalette,
        signatureItems: character.signatureItems,
        doNotChange: character.doNotChange,
        canChangeByScene: character.canChangeByScene,
        referenceImageUrl: character.referenceImageUrl,
        approvedImageUrl: character.approvedImageUrl,
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

  const protagonistCast: StoryCharacter = removeUndefinedDeep({
    characterId: protagonistId,
    displayName: protagonistDisplayName,
    role: "protagonist" satisfies StoryCharacterRole,
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
  const normalizedPages = story.pages.map((page) => ({
    ...page,
    appearingCharacterIds: page.appearingCharacterIds?.map((characterId) =>
      isGeneratedProtagonistId(characterId, childProfileSnapshot) ? protagonistId : characterId
    ),
    focusCharacterId:
      page.focusCharacterId && isGeneratedProtagonistId(page.focusCharacterId, childProfileSnapshot)
        ? protagonistId
        : page.focusCharacterId,
  }));

  return {
    ...story,
    characterBible: visualProfile.characterBible || story.characterBible,
    cast: [protagonistCast, ...otherCast],
    pages: normalizedPages,
  };
}

function normalizeStoryForBook(
  story: GeneratedStory,
  bookData: BookData,
  mergedInput: BookInput
): GeneratedStory {
  const withNormalizedCast = normalizeStoryCastWithChildProfile(
    story,
    bookData.childProfileSnapshot
  );

  return {
    ...withNormalizedCast,
    forbiddenQuestObjects: sanitizeForbiddenQuestObjects(
      withNormalizedCast.forbiddenQuestObjects,
      bookData,
      mergedInput
    ),
  };
}

function sanitizeForbiddenQuestObjects(
  forbiddenQuestObjects: string[] | undefined,
  bookData: BookData,
  mergedInput: BookInput
): string[] | undefined {
  if (!forbiddenQuestObjects?.length) {
    return undefined;
  }

  const signatureItem = mergedInput.signatureItem ?? bookData.childProfileSnapshot?.visualProfile.signatureItem;
  const signatureTokens = new Set(
    (signatureItem ?? "")
      .split(/[、,\s]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );
  const genericForbidden = new Set(["おもちゃ", "おもちゃたち", "玩具", "toys", "toy"]);

  const sanitized = forbiddenQuestObjects.filter((value, index, array) => {
    const normalized = value.trim();
    if (!normalized) return false;
    if (array.findIndex((item) => item.trim() === normalized) !== index) return false;
    if (genericForbidden.has(normalized)) return false;
    if ([...signatureTokens].some((token) => normalized.includes(token) || token.includes(normalized))) {
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

function shouldThrottleImageRequests(): boolean {
  return process.env.NODE_ENV !== "test";
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
    err.message.includes("pageVisualRole")
  );
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
  updateBookTitle: (bookId: string, title: string) => Promise<void>;
  updateBookCoverImage: (bookId: string, imageUrl: string) => Promise<void>;
  writePage: (bookId: string, page: PageData) => Promise<void>;
  updateBookProgress: (bookId: string, progress: number) => Promise<void>;
  updateBookStatus: (bookId: string, status: "completed" | "failed") => Promise<void>;
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
  incrementMonthlyCount: (userId: string) => Promise<void>;
}

export async function processBookGeneration(
  bookId: string,
  bookData: BookData,
  deps: GenerationDeps
): Promise<void> {
  try {
    let lastImageAttemptAt = 0;

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
    const userPlan = await deps.getUserPlan(bookData.userId);
    const normalizedBookData = normalizeBookForGeneration(bookData, template, userPlan);
    const readingProfile = getAgeReadingProfile(mergedInput.childAge);
    await deps.updateBookStoryGenerationMetadata(bookId, {
      ...(normalizedBookData.imageModelProfile
        ? { imageModelProfile: normalizedBookData.imageModelProfile }
        : {}),
      ...createGenerationStartedPatch(),
    });

    // Step 3: Check quota (skip in development)
    if (process.env.NODE_ENV !== "development") {
      const monthlyCount = await deps.getUserMonthlyCount(bookData.userId);
      if (!canGenerateBookThisMonth({ userPlan, currentCount: monthlyCount })) {
        const message =
          userPlan === "premium"
            ? "今月の生成回数に達しました。来月またご利用ください。"
            : "今月の無料生成回数に達しました。来月またお試しください。";
        console.error(`User ${bookData.userId} exceeded monthly quota (${monthlyCount})`);
        await deps.updateBookFailure(bookId, message);
        await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
          failureStage: "validation",
          failureProvider: "system",
          failureReason: "unknown",
          retryable: false,
          technicalErrorMessage: `Monthly quota exceeded: ${monthlyCount}`,
        }));
        await deps.updateBookStatus(bookId, "failed");
        return;
      }
    }

    // Step 4: Build reference assets
    const coverReferenceImageUrls = buildReferenceImageUrls(
      normalizedBookData.style,
      template,
      normalizedBookData.childProfileSnapshot
    );

    // Step 5: Generate the whole-book story JSON once with Gemini and validate it.
    // Gemini is not called per page. After this step, Replicate is invoked page by page for illustrations.
    let storyResult: {
      story: GeneratedStory;
      qualityReport: StoryQualityReport;
      rewriteMetadata?: Pick<BookData, "storyTextRewriteUsed" | "storyTextRewriteModel" | "storyTextRewriteAttempts">;
    };
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
            });
    } catch (err) {
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
        return;
      }

      if (isStorySchemaValidationError(err)) {
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
        return;
      }

      throw err;
    }

    const { story, qualityReport } = storyResult;
    const storyGenerationMetadata = removeUndefinedDeep({
        storyModel: story.storyModel,
        storyModelFallbackUsed: story.storyModelFallbackUsed,
        storyGenerationAttempts: story.storyGenerationAttempts,
        storyTextRewriteUsed: storyResult.rewriteMetadata?.storyTextRewriteUsed,
        storyTextRewriteModel: storyResult.rewriteMetadata?.storyTextRewriteModel,
        storyTextRewriteAttempts: storyResult.rewriteMetadata?.storyTextRewriteAttempts,
        storyTitleCandidate: story.title,
        storyCast: sanitizeStoryCastForFirestore(story.cast),
        storyGoal: story.storyGoal,
        mainQuestObject: story.mainQuestObject,
        forbiddenQuestObjects: story.forbiddenQuestObjects,
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
      return;
    }

    if (qualityReport.issues.length > 0) {
      logger.warn("Story quality issues", {
        bookId,
        issues: qualityReport.issues,
        summary: qualityReport.summary,
      });
    }

    // Step 6: Update book title
    await deps.updateBookTitle(bookId, story.title);

    // Step 7: Process each page
    const totalPages = story.pages.length;
    for (let i = 0; i < totalPages; i++) {
      const storyPage = story.pages[i];
      const imagePrompt = buildImagePrompt(
        storyPage.imagePrompt,
        normalizedBookData.style,
        buildFinalCharacterBible(story.characterBible, normalizedBookData),
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
          appearingCharacterIds: storyPage.appearingCharacterIds,
          focusCharacterId: storyPage.focusCharacterId,
          childProfileBasePrompt: normalizedBookData.childProfileSnapshot?.visualProfile.basePrompt,
          scenePolicy: normalizedBookData.scenePolicy,
        }
      );

      // Generate image with retries (skip in development)
      let imageBuffer: Buffer | null = null;
      let imageUrl = "";
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
      const inputImageUrls = shouldUseReference
        ? buildPageReferenceImageUrls(coverReferenceImageUrls, story.cast, storyPage.appearingCharacterIds)
        : [];

      // Skip image generation in development to avoid API costs
      if (process.env.NODE_ENV === 'development') {
        console.log(`Skipping image generation for page ${i} in development mode`);
        imageUrl = `https://via.placeholder.com/512x512/cccccc/666666?text=Page+${i}`;
      } else {
        for (let attempt = 0; attempt < IMAGE_RETRY_LIMIT; attempt++) {
          try {
            const now = Date.now();
            const waitMs = Math.max(0, IMAGE_REQUEST_INTERVAL_MS - (now - lastImageAttemptAt));
            if (waitMs > 0 && shouldThrottleImageRequests()) {
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            }

            // Page 1 is treated as the cover-quality image, while later pages can be tiered for model comparison.
            imageBuffer = await deps.imageClient.generateImage(imagePrompt, {
              purpose: imagePurpose,
              imageQualityTier,
              imageModelProfile,
              inputImageUrls,
            });
            lastImageAttemptAt = Date.now();
            imageUrl = await deps.uploadImage(bookId, i, imageBuffer);
            break; // Success
          } catch (err) {
            lastImageAttemptAt = Date.now();
            console.error(`Image generation attempt ${attempt + 1}/${IMAGE_RETRY_LIMIT} failed for page ${i}:`, err);
            const retryAfterMs = getRetryAfterMs(err);
            if (retryAfterMs > 0 && attempt < IMAGE_RETRY_LIMIT - 1 && shouldThrottleImageRequests()) {
              await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
            }
            if (attempt === IMAGE_RETRY_LIMIT - 1) {
              console.error(`All ${IMAGE_RETRY_LIMIT} attempts failed for page ${i}`);
              const message = err instanceof Error ? err.message : "Image generation failed";
              await deps.writePage(bookId, removeUndefinedDeep({
                pageNumber: i,
                text: storyPage.text,
                imageUrl: "",
                imagePrompt,
                textCharCount: countJapaneseTextChars(storyPage.text),
                textSentenceCount: countSentences(storyPage.text),
                textQualityWarnings: collectPageTextQualityWarnings(qualityReport, i),
                status: "failed",
                imageModel,
                imageQualityTier,
                imagePurpose,
                inputImageUrlsCount: inputImageUrls.length,
                inputReferenceCount: inputImageUrls.length,
                usedCharacterReference: inputImageUrls.length > 0,
                characterConsistencyMode: normalizedBookData.characterConsistencyMode,
                imageModelProfile,
                pageVisualRole: storyPage.pageVisualRole,
                appearingCharacterIds: storyPage.appearingCharacterIds,
                focusCharacterId: storyPage.focusCharacterId,
              }));
              await deps.updateBookFailure(bookId, `画像生成に失敗しました（${message}）`);
              await deps.updateBookFailureMetadata(bookId, buildFailureMetadata({
                failureStage: "image_generation",
                failureProvider: "replicate",
                failureReason: "unknown",
                retryable: true,
                technicalErrorMessage: message,
              }));
              await deps.updateBookStatus(bookId, "failed");
              return;
            }
          }
        }
      }

      // Write page document
      const pageData: PageData = {
        pageNumber: i,
        text: storyPage.text,
        imageUrl,
        imagePrompt,
        textCharCount: countJapaneseTextChars(storyPage.text),
        textSentenceCount: countSentences(storyPage.text),
        textQualityWarnings: collectPageTextQualityWarnings(qualityReport, i),
        status: "completed",
        imageModel,
        imageQualityTier,
        imagePurpose,
        inputImageUrlsCount: inputImageUrls.length,
        inputReferenceCount: inputImageUrls.length,
        usedCharacterReference: inputImageUrls.length > 0,
        characterConsistencyMode: normalizedBookData.characterConsistencyMode,
        imageModelProfile,
        pageVisualRole: storyPage.pageVisualRole,
        appearingCharacterIds: storyPage.appearingCharacterIds,
        focusCharacterId: storyPage.focusCharacterId,
      };
      await deps.writePage(bookId, removeUndefinedDeep(pageData));
      if (i === 0 && imageUrl) {
        await deps.updateBookCoverImage(bookId, imageUrl);
      }

      // Update progress
      const progress = Math.round(((i + 1) / totalPages) * 100);
      await deps.updateBookProgress(bookId, progress);
    }

    // Step 8: Mark book as completed
    await deps.updateBookStatus(bookId, "completed");

    // Step 9: Increment monthly count
    await deps.incrementMonthlyCount(bookData.userId);

    console.log(`Book ${bookId} generation completed successfully`);
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
  }
}

function normalizeBookForGeneration(
  bookData: BookData,
  template: TemplateData,
  userPlan: "free" | "premium"
): BookData {
  const creationMode = template.creationMode ?? bookData.creationMode ?? "guided_ai";
  const requestedProductPlan = bookData.productPlan ?? getDefaultProductPlanForCreationMode(creationMode);
  let normalizedPlan = requestedProductPlan;

  if (!canUseProductPlan({ userPlan, productPlan: requestedProductPlan })) {
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

  const requestedPlanConfig = getPlanConfig(normalizedPlan);
  normalizedPlan =
    requestedPlanConfig.allowedCreationModes.includes(creationMode)
      ? normalizedPlan
      : getDefaultProductPlanForCreationMode(creationMode);
  const normalizedPlanConfig = getPlanConfig(normalizedPlan);
  const fixedTemplatePageCount = template.fixedStory?.pages.length;
  const normalizedPageCount =
    creationMode === "fixed_template" && isValidPageCount(fixedTemplatePageCount)
      ? fixedTemplatePageCount
      : normalizedPlanConfig.allowedPageCounts.includes(bookData.pageCount)
        ? bookData.pageCount
        : normalizedPlanConfig.defaultPageCount;

  return {
    ...bookData,
    creationMode,
    productPlan: normalizedPlan,
    imageQualityTier: normalizedPlanConfig.imageQualityTier,
    characterConsistencyMode:
      bookData.characterConsistencyMode ?? normalizedPlanConfig.characterConsistencyMode,
    imageModelProfile:
      userPlan === "premium"
        ? bookData.imageModelProfile ?? normalizedPlanConfig.imageModelProfile
        : normalizedPlanConfig.imageModelProfile ?? bookData.imageModelProfile,
    scenePolicy: resolveScenePolicy(bookData, template),
    pageCount: normalizedPageCount,
  };
}

function isValidPageCount(value: number | undefined): value is BookData["pageCount"] {
  return value === 4 || value === 8 || value === 12;
}

function buildReferenceImageUrls(
  style: BookData["style"],
  template: TemplateData,
  childProfileSnapshot?: BookData["childProfileSnapshot"]
): string[] {
  const urls = [
    childProfileSnapshot?.visualProfile.referenceImageUrl,
    childProfileSnapshot?.visualProfile.approvedImageUrl,
    getStyleReferenceImagePath(style),
    template.sampleImageUrl,
  ]
    .filter((value): value is string => Boolean(value))
    .map(toPublicUrl);

  return [...new Set(urls)];
}

function buildPageReferenceImageUrls(
  baseReferenceImageUrls: string[],
  cast: GeneratedStory["cast"],
  appearingCharacterIds?: string[]
): string[] {
  const castUrls = (cast ?? [])
    .filter((character) => appearingCharacterIds?.includes(character.characterId))
    .flatMap((character) => [character.approvedImageUrl, character.referenceImageUrl])
    .filter((value): value is string => Boolean(value))
    .map(toPublicUrl);

  return [...new Set([...baseReferenceImageUrls, ...castUrls])].slice(0, 8);
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
  bookData: BookData,
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
}): Promise<{
  story: GeneratedStory;
  qualityReport: StoryQualityReport;
  rewriteMetadata?: Pick<BookData, "storyTextRewriteUsed" | "storyTextRewriteModel" | "storyTextRewriteAttempts">;
}> {
  const baseSystemPrompt = buildSystemPrompt(
    params.template,
    params.normalizedBookData.style,
    params.readingProfile
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
    pageCount: params.normalizedBookData.pageCount,
    style: params.normalizedBookData.style,
    productPlan: params.normalizedBookData.productPlan,
    creationMode: params.normalizedBookData.creationMode,
    theme: params.normalizedBookData.theme,
    categoryGroupId: params.template.categoryGroupId,
    storyModelCandidates,
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
    pageCount: params.normalizedBookData.pageCount,
    style: params.normalizedBookData.style,
    productPlan: params.normalizedBookData.productPlan,
    creationMode: params.normalizedBookData.creationMode,
    theme: params.normalizedBookData.theme,
    categoryGroupId: params.template.categoryGroupId,
    storyModelCandidates,
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
  const pages = fixedStory.pages.map((page) => ({
    text: applyTemplateReplacements(
      page.textTemplatesByAge?.[readingProfile.ageBand]
        ?? page.textTemplatesByAge?.general_child
        ?? page.textTemplate,
      replacements
    ),
    imagePrompt: applyTemplateReplacements(page.imagePromptTemplate, replacements),
  }));

  return {
    title: applyTemplateReplacements(fixedStory.titleTemplate, replacements),
    characterBible: buildFixedCharacterBible(bookData, mergedInput),
    styleBible: buildFixedStyleBible(bookData, template),
    narrativeDevice: undefined,
    pages,
  };
}

function buildFixedTemplateReplacements(input: BookInput): Record<string, string> {
  const fallbackParentMessage = "またひとつ、たいせつな思い出がふえました。";

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

function applyTemplateReplacements(template: string, replacements: Record<string, string>): string {
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
  return [
    `Use a consistent ${bookData.style} picture book rendering across every page.`,
    template.visualDirection ? `Visual direction: ${template.visualDirection}` : "",
    "Keep lighting soft, compositions clear, and the mood safe and gentle for young children.",
  ]
    .filter(Boolean)
    .join(" ");
}

function getPageImagePurpose(pageIndex: number, theme: string): ImagePurpose {
  if (pageIndex === 0) {
    return theme === "memory" ? "memory_key_page" : "book_cover";
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

function buildFinalCharacterBible(storyCharacterBible: string, bookData: BookData): string {
  const visual = bookData.childProfileSnapshot?.visualProfile;
  const outfitRule = buildOutfitRule(bookData);
  return [
    visual?.characterBible ? `Approved child profile: ${visual.characterBible}` : "",
    storyCharacterBible,
    buildCharacterConsistencyRules(bookData),
    outfitRule,
  ].filter(Boolean).join(" ");
}

function buildCharacterConsistencyRules(bookData: BookData): string {
  const visual = bookData.childProfileSnapshot?.visualProfile;
  const age = bookData.childProfileSnapshot?.age ?? bookData.input.childAge;

  return [
    "Character consistency rules:",
    "The protagonist must be the same child on every page.",
    age ? `Keep the same age impression: around ${age} years old.` : "",
    "Do not change hairstyle, hair length, face shape, age impression, or body proportions.",
    visual?.outfit
      ? `Keep the same outfit unless the outfit mode explicitly allows adaptation: ${visual.outfit}.`
      : "Keep the same outfit unless the outfit mode explicitly allows adaptation.",
    visual?.signatureItem
      ? `Keep the same signature item when appropriate: ${visual.signatureItem}.`
      : "Keep the same signature item when appropriate.",
    "If the child is seen from behind, from the side, or far away, preserve hairstyle, silhouette, outfit logic, and recognizable body proportions.",
    "Do not redesign the protagonist between pages.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildOutfitRule(bookData: BookData): string {
  const usage = bookData.characterUsage;
  const visual = bookData.childProfileSnapshot?.visualProfile;
  if (!usage) return "";

  const signatureRule = usage.keepSignatureItem && visual?.signatureItem
    ? `Keep the signature item when appropriate: ${visual.signatureItem}.`
    : "Do not force the signature item if it does not fit the scene.";

  if (usage.outfitMode === "profile_default") {
    return `Outfit rule: use the child's registered default outfit: ${visual?.outfit || "the approved profile outfit"}. ${signatureRule}`;
  }
  if (usage.outfitMode === "theme_auto") {
    return `Outfit rule: keep the same face and age impression, but adapt the outfit to the story theme in a cute child-safe way. ${signatureRule}`;
  }
  return `Outfit rule: use this custom outfit: ${usage.customOutfit || visual?.outfit || "a cute child-safe outfit"}. ${signatureRule}`;
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

// Firebase Cloud Function
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");

export const generateBook = onDocumentCreated(
  {
    document: "books/{bookId}",
    secrets: [geminiApiKey, replicateApiToken],
    region: "asia-northeast1",
    memory: "1GiB",
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

    // Create production dependencies
    const deps: GenerationDeps = {
      getTemplate: async (theme: string) => {
        const templateDoc = await db.collection("templates").doc(theme).get();
        if (!templateDoc.exists) throw new Error(`Template not found: ${theme}`);
        return templateDoc.data() as TemplateData;
      },

      getUserPlan: async (userId: string) => {
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();
        if (userData?.generationOverride?.bypassMonthlyLimit === true) {
          return "premium";
        }
        return (userData?.plan as "free" | "premium" | undefined) ?? "free";
      },

      llmClient: new GeminiClient(geminiApiKey.value()),
      imageClient: new ReplicateImageClient(replicateApiToken.value()),

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

      updateBookStatus: async (bookId: string, status: "completed" | "failed") => {
        const statusPatch =
          status === "completed" ? createCompletedAtPatch() : createFailedAtPatch();
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

      incrementMonthlyCount: async (userId: string) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const countRef = db.collection("users").doc(userId).collection("usage").doc(yearMonth);
        await countRef.set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true });
      },
    };

    await processBookGeneration(bookId, bookData, deps);
  }
);
