import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
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
} from "./lib/types";
import { sanitizeInput } from "./lib/content-filter";
import { buildSystemPrompt, buildImagePrompt, getStyleReferenceImagePath } from "./lib/prompt-builder";
import { GeminiClient } from "./lib/gemini";
import { ReplicateImageClient, resolveReplicateModel } from "./lib/replicate";
import { getDefaultProductPlanForCreationMode, getPlanConfig } from "./lib/plans";
import { canUseProductPlan } from "./lib/entitlements";
import { canGenerateBookThisMonth } from "./lib/usage";
import { getAgeReadingProfile } from "./lib/age-reading-profile";

const IMAGE_RETRY_LIMIT = 3;
const IMAGE_REQUEST_INTERVAL_MS = 11_000;
const PUBLIC_SITE_URL = "https://story-gen-8a769.web.app";

function shouldThrottleImageRequests(): boolean {
  return process.env.NODE_ENV !== "test";
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
      await deps.updateBookStatus(bookId, "failed");
      return;
    }

    // Step 2: Get template and normalize plan settings
    const template = await deps.getTemplate(bookData.theme);
    const userPlan = await deps.getUserPlan(bookData.userId);
    const normalizedBookData = normalizeBookForGeneration(bookData, template, userPlan);
    const readingProfile = getAgeReadingProfile(mergedInput.childAge);

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
        await deps.updateBookStatus(bookId, "failed");
        return;
      }
    }

    // Step 4: Build prompts
    const systemPrompt = buildSystemPrompt(
      template,
      normalizedBookData.style,
      readingProfile
    );
    const coverReferenceImageUrls = buildReferenceImageUrls(
      normalizedBookData.style,
      template,
      normalizedBookData.childProfileSnapshot
    );

    // Step 5: Generate story with LLM
    const story =
      template.creationMode === "fixed_template" && template.fixedStory
        ? (() => {
            console.log(`Book ${bookId} uses fixed_template; skipping LLM story generation.`);
            return buildStoryFromFixedTemplate(
              template.fixedStory,
              mergedInput,
              bookData,
              template,
              readingProfile
            );
          })()
        : await deps.llmClient.generateStory({
            systemPrompt,
            childName: mergedInput.childName,
            childAge: mergedInput.childAge,
            favorites: mergedInput.favorites,
            lessonToTeach: mergedInput.lessonToTeach,
            memoryToRecreate: mergedInput.memoryToRecreate,
            characterLook: mergedInput.characterLook,
            signatureItem: mergedInput.signatureItem,
            colorMood: mergedInput.colorMood,
            place: mergedInput.place,
            familyMembers: mergedInput.familyMembers,
            season: mergedInput.season,
            parentMessage: mergedInput.parentMessage,
            storyRequest: mergedInput.storyRequest,
            pageCount: normalizedBookData.pageCount,
            style: normalizedBookData.style,
          });

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
        story.styleBible
      );

      // Generate image with retries (skip in development)
      let imageBuffer: Buffer | null = null;
      let imageUrl = "";
      const imagePurpose = getPageImagePurpose(i, normalizedBookData.theme);
      const imageQualityTier = normalizedBookData.imageQualityTier ?? "light";
      const imageModel = resolveReplicateModel({
        purpose: imagePurpose,
        imageQualityTier,
      });

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

            const inputImageUrls = imagePurpose === "book_cover" || imagePurpose === "memory_key_page"
              ? coverReferenceImageUrls
              : [];

            // Page 1 is treated as the cover-quality image, while later pages can be tiered for model comparison.
            imageBuffer = await deps.imageClient.generateImage(imagePrompt, {
              purpose: imagePurpose,
              imageQualityTier,
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
              await deps.writePage(bookId, {
                pageNumber: i,
                text: storyPage.text,
                imageUrl: "",
                imagePrompt,
                status: "failed",
                imageModel,
                imageQualityTier,
                imagePurpose,
              });
              await deps.updateBookFailure(bookId, `画像生成に失敗しました（${message}）`);
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
        status: "completed",
        imageModel,
        imageQualityTier,
        imagePurpose,
      };
      await deps.writePage(bookId, pageData);
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
    characterConsistencyMode: normalizedPlanConfig.characterConsistencyMode,
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
    outfitRule,
  ].filter(Boolean).join(" ");
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
        await db.collection("books").doc(bookId).update({ status });
      },

      updateBookFailure: async (bookId: string, message: string) => {
        await db.collection("books").doc(bookId).update({ errorMessage: message.slice(0, 500) });
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
