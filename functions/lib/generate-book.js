"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBook = void 0;
exports.processBookGeneration = processBookGeneration;
exports.shouldUseCharacterReferenceForPage = shouldUseCharacterReferenceForPage;
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const content_filter_1 = require("./lib/content-filter");
const prompt_builder_1 = require("./lib/prompt-builder");
const gemini_1 = require("./lib/gemini");
const replicate_1 = require("./lib/replicate");
const plans_1 = require("./lib/plans");
const entitlements_1 = require("./lib/entitlements");
const usage_1 = require("./lib/usage");
const age_reading_profile_1 = require("./lib/age-reading-profile");
const story_quality_1 = require("./lib/story-quality");
const IMAGE_RETRY_LIMIT = 3;
const IMAGE_REQUEST_INTERVAL_MS = 11_000;
const PUBLIC_SITE_URL = "https://story-gen-8a769.web.app";
function shouldThrottleImageRequests() {
    return process.env.NODE_ENV !== "test";
}
async function processBookGeneration(bookId, bookData, deps) {
    try {
        let lastImageAttemptAt = 0;
        // Step 1: Validate input
        const mergedInput = mergeInputWithChildProfile(bookData.input, bookData.childProfileSnapshot);
        const sanitizeResult = (0, content_filter_1.sanitizeInput)(mergedInput);
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
        const readingProfile = (0, age_reading_profile_1.getAgeReadingProfile)(mergedInput.childAge);
        // Step 3: Check quota (skip in development)
        if (process.env.NODE_ENV !== "development") {
            const monthlyCount = await deps.getUserMonthlyCount(bookData.userId);
            if (!(0, usage_1.canGenerateBookThisMonth)({ userPlan, currentCount: monthlyCount })) {
                const message = userPlan === "premium"
                    ? "今月の生成回数に達しました。来月またご利用ください。"
                    : "今月の無料生成回数に達しました。来月またお試しください。";
                console.error(`User ${bookData.userId} exceeded monthly quota (${monthlyCount})`);
                await deps.updateBookFailure(bookId, message);
                await deps.updateBookStatus(bookId, "failed");
                return;
            }
        }
        // Step 4: Build reference assets
        const coverReferenceImageUrls = buildReferenceImageUrls(normalizedBookData.style, template, normalizedBookData.childProfileSnapshot);
        // Step 5: Generate story with quality gate
        const { story, qualityReport } = template.creationMode === "fixed_template" && template.fixedStory
            ? (() => {
                console.log(`Book ${bookId} uses fixed_template; skipping LLM story generation.`);
                return generateFixedTemplateStoryWithQualityReport(template.fixedStory, mergedInput, normalizedBookData, template, readingProfile);
            })()
            : await generateStoryWithQualityGate({
                llmClient: deps.llmClient,
                template,
                normalizedBookData,
                mergedInput,
                readingProfile,
            });
        await deps.updateBookStoryQualityReport(bookId, (0, story_quality_1.toFirestoreStoryQualityReport)(qualityReport));
        if (template.creationMode === "fixed_template" && !qualityReport.ok) {
            logger.warn("Fixed template quality report has errors but generation continues", {
                bookId,
                issues: qualityReport.issues,
                summary: qualityReport.summary,
            });
        }
        if (template.creationMode !== "fixed_template" && !qualityReport.ok) {
            logger.warn("Story quality gate failed after retry", {
                bookId,
                issues: qualityReport.issues,
                summary: qualityReport.summary,
            });
            await deps.updateBookFailure(bookId, "本文の品質基準を満たす絵本を作れませんでした。もう一度お試しください。");
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
            const imagePrompt = (0, prompt_builder_1.buildImagePrompt)(storyPage.imagePrompt, normalizedBookData.style, buildFinalCharacterBible(story.characterBible, normalizedBookData), story.styleBible, {
                pageNumber: i,
                compositionHint: storyPage.compositionHint,
                visualMotif: story.narrativeDevice?.visualMotif,
                visualMotifUsage: storyPage.visualMotifUsage,
                hiddenDetail: storyPage.hiddenDetail ?? story.narrativeDevice?.hiddenDetails?.[i],
                ageBand: readingProfile.ageBand,
            });
            // Generate image with retries (skip in development)
            let imageBuffer = null;
            let imageUrl = "";
            const imagePurpose = getPageImagePurpose(i, normalizedBookData.theme);
            const imageQualityTier = normalizedBookData.imageQualityTier ?? "light";
            const imageModel = (0, replicate_1.resolveReplicateModel)({
                purpose: imagePurpose,
                imageQualityTier,
            });
            // Skip image generation in development to avoid API costs
            if (process.env.NODE_ENV === 'development') {
                console.log(`Skipping image generation for page ${i} in development mode`);
                imageUrl = `https://via.placeholder.com/512x512/cccccc/666666?text=Page+${i}`;
            }
            else {
                for (let attempt = 0; attempt < IMAGE_RETRY_LIMIT; attempt++) {
                    try {
                        const now = Date.now();
                        const waitMs = Math.max(0, IMAGE_REQUEST_INTERVAL_MS - (now - lastImageAttemptAt));
                        if (waitMs > 0 && shouldThrottleImageRequests()) {
                            await new Promise((resolve) => setTimeout(resolve, waitMs));
                        }
                        const shouldUseReference = shouldUseCharacterReferenceForPage({
                            pageIndex: i,
                            totalPages,
                            imagePurpose,
                            characterConsistencyMode: normalizedBookData.characterConsistencyMode,
                        });
                        const inputImageUrls = shouldUseReference ? coverReferenceImageUrls : [];
                        // Page 1 is treated as the cover-quality image, while later pages can be tiered for model comparison.
                        imageBuffer = await deps.imageClient.generateImage(imagePrompt, {
                            purpose: imagePurpose,
                            imageQualityTier,
                            inputImageUrls,
                        });
                        lastImageAttemptAt = Date.now();
                        imageUrl = await deps.uploadImage(bookId, i, imageBuffer);
                        break; // Success
                    }
                    catch (err) {
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
            const pageData = {
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
    }
    catch (err) {
        console.error(`Book generation failed for ${bookId}:`, err);
        const message = err instanceof Error ? err.message : "Unknown generation error";
        await deps.updateBookFailure(bookId, message);
        await deps.updateBookStatus(bookId, "failed");
    }
}
function normalizeBookForGeneration(bookData, template, userPlan) {
    const creationMode = template.creationMode ?? bookData.creationMode ?? "guided_ai";
    const requestedProductPlan = bookData.productPlan ?? (0, plans_1.getDefaultProductPlanForCreationMode)(creationMode);
    let normalizedPlan = requestedProductPlan;
    if (!(0, entitlements_1.canUseProductPlan)({ userPlan, productPlan: requestedProductPlan })) {
        if (creationMode === "fixed_template") {
            normalizedPlan = "free";
            console.log(`Paid plan normalized to free for book generation. requested=${requestedProductPlan}, userPlan=${userPlan}, creationMode=${creationMode}`);
        }
        else {
            // TODO: Tighten paid-plan entitlement enforcement for guided_ai / original_ai after billing rollout.
            console.log(`Paid plan requested without entitlement, but kept for compatibility. requested=${requestedProductPlan}, userPlan=${userPlan}, creationMode=${creationMode}`);
        }
    }
    const requestedPlanConfig = (0, plans_1.getPlanConfig)(normalizedPlan);
    normalizedPlan =
        requestedPlanConfig.allowedCreationModes.includes(creationMode)
            ? normalizedPlan
            : (0, plans_1.getDefaultProductPlanForCreationMode)(creationMode);
    const normalizedPlanConfig = (0, plans_1.getPlanConfig)(normalizedPlan);
    const fixedTemplatePageCount = template.fixedStory?.pages.length;
    const normalizedPageCount = creationMode === "fixed_template" && isValidPageCount(fixedTemplatePageCount)
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
function isValidPageCount(value) {
    return value === 4 || value === 8 || value === 12;
}
function buildReferenceImageUrls(style, template, childProfileSnapshot) {
    const urls = [
        childProfileSnapshot?.visualProfile.referenceImageUrl,
        childProfileSnapshot?.visualProfile.approvedImageUrl,
        (0, prompt_builder_1.getStyleReferenceImagePath)(style),
        template.sampleImageUrl,
    ]
        .filter((value) => Boolean(value))
        .map(toPublicUrl);
    return [...new Set(urls)];
}
async function generateStoryWithQualityGate(params) {
    const baseSystemPrompt = (0, prompt_builder_1.buildSystemPrompt)(params.template, params.normalizedBookData.style, params.readingProfile);
    let story = await params.llmClient.generateStory({
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
    });
    let qualityReport = (0, story_quality_1.validateGeneratedStoryQuality)({
        story,
        readingProfile: params.readingProfile,
        creationMode: params.normalizedBookData.creationMode,
    });
    if (qualityReport.ok) {
        return { story, qualityReport };
    }
    story = await params.llmClient.generateStory({
        systemPrompt: (0, prompt_builder_1.appendQualityRetryInstruction)(baseSystemPrompt, qualityReport),
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
    });
    qualityReport = (0, story_quality_1.validateGeneratedStoryQuality)({
        story,
        readingProfile: params.readingProfile,
        creationMode: params.normalizedBookData.creationMode,
    });
    return { story, qualityReport };
}
function generateFixedTemplateStoryWithQualityReport(fixedStory, mergedInput, bookData, template, readingProfile) {
    const story = buildStoryFromFixedTemplate(fixedStory, mergedInput, bookData, template, readingProfile);
    return {
        story,
        qualityReport: (0, story_quality_1.validateGeneratedStoryQuality)({
            story,
            readingProfile,
            creationMode: "fixed_template",
        }),
    };
}
function buildStoryFromFixedTemplate(fixedStory, mergedInput, bookData, template, readingProfile) {
    const replacements = buildFixedTemplateReplacements(mergedInput);
    const pages = fixedStory.pages.map((page) => ({
        text: applyTemplateReplacements(page.textTemplatesByAge?.[readingProfile.ageBand]
            ?? page.textTemplatesByAge?.general_child
            ?? page.textTemplate, replacements),
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
function buildFixedTemplateReplacements(input) {
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
function applyTemplateReplacements(template, replacements) {
    return template.replace(/\{(\w+)\}/g, (_, key) => replacements[key] ?? "");
}
function buildFixedCharacterBible(bookData, input) {
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
function buildFixedStyleBible(bookData, template) {
    return [
        `Use a consistent ${bookData.style} picture book rendering across every page.`,
        template.visualDirection ? `Visual direction: ${template.visualDirection}` : "",
        "Keep lighting soft, compositions clear, and the mood safe and gentle for young children.",
    ]
        .filter(Boolean)
        .join(" ");
}
function getPageImagePurpose(pageIndex, theme) {
    if (pageIndex === 0) {
        return theme === "memory" ? "memory_key_page" : "book_cover";
    }
    return "book_page";
}
function shouldUseCharacterReferenceForPage(params) {
    const mode = params.characterConsistencyMode ?? "cover_only";
    if (mode === "all_pages") {
        return true;
    }
    if (mode === "cover_only") {
        return params.imagePurpose === "book_cover" || params.imagePurpose === "memory_key_page";
    }
    const emotionalPeakIndex = Math.min(Math.max(0, Math.floor(params.totalPages * 0.6)), Math.max(0, params.totalPages - 1));
    return (params.pageIndex === 0 ||
        params.pageIndex === emotionalPeakIndex ||
        params.pageIndex === params.totalPages - 1);
}
function mergeInputWithChildProfile(input, snapshot) {
    if (!snapshot)
        return input;
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
function bookSignatureItem(snapshot, input) {
    return input.signatureItem || snapshot.visualProfile.signatureItem;
}
function buildFinalCharacterBible(storyCharacterBible, bookData) {
    const visual = bookData.childProfileSnapshot?.visualProfile;
    const outfitRule = buildOutfitRule(bookData);
    return [
        visual?.characterBible ? `Approved child profile: ${visual.characterBible}` : "",
        storyCharacterBible,
        buildCharacterConsistencyRules(bookData),
        outfitRule,
    ].filter(Boolean).join(" ");
}
function buildCharacterConsistencyRules(bookData) {
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
function buildOutfitRule(bookData) {
    const usage = bookData.characterUsage;
    const visual = bookData.childProfileSnapshot?.visualProfile;
    if (!usage)
        return "";
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
function toPublicUrl(pathOrUrl) {
    if (/^https?:\/\//i.test(pathOrUrl))
        return pathOrUrl;
    return `${PUBLIC_SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
function getRetryAfterMs(err) {
    if (!err || typeof err !== "object")
        return 0;
    const response = err.response;
    const retryAfterHeader = response?.headers?.get?.("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000;
    }
    const fallback = err.retry_after;
    if (typeof fallback === "number" && fallback > 0) {
        return fallback * 1000;
    }
    return 0;
}
// Firebase Cloud Function
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const replicateApiToken = (0, params_1.defineSecret)("REPLICATE_API_TOKEN");
exports.generateBook = (0, firestore_1.onDocumentCreated)({
    document: "books/{bookId}",
    secrets: [geminiApiKey, replicateApiToken],
    region: "asia-northeast1",
    memory: "1GiB",
    timeoutSeconds: 540,
}, async (event) => {
    const bookId = event.params.bookId;
    const bookData = event.data?.data();
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
    const deps = {
        getTemplate: async (theme) => {
            const templateDoc = await db.collection("templates").doc(theme).get();
            if (!templateDoc.exists)
                throw new Error(`Template not found: ${theme}`);
            return templateDoc.data();
        },
        getUserPlan: async (userId) => {
            const userDoc = await db.collection("users").doc(userId).get();
            const userData = userDoc.data();
            if (userData?.generationOverride?.bypassMonthlyLimit === true) {
                return "premium";
            }
            return userData?.plan ?? "free";
        },
        llmClient: new gemini_1.GeminiClient(geminiApiKey.value()),
        imageClient: new replicate_1.ReplicateImageClient(replicateApiToken.value()),
        uploadImage: async (bookId, pageNumber, buffer) => {
            const bucket = storage.bucket("story-gen-8a769.firebasestorage.app");
            const filename = `books/${bookId}/page-${pageNumber}.png`;
            const file = bucket.file(filename);
            const downloadToken = (0, crypto_1.randomUUID)();
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
        updateBookTitle: async (bookId, title) => {
            await db.collection("books").doc(bookId).update({ title });
        },
        updateBookCoverImage: async (bookId, imageUrl) => {
            await db.collection("books").doc(bookId).update({ coverImageUrl: imageUrl });
        },
        writePage: async (bookId, page) => {
            await db.collection("books").doc(bookId).collection("pages").doc(`page-${page.pageNumber}`).set(page);
        },
        updateBookProgress: async (bookId, progress) => {
            await db.collection("books").doc(bookId).update({ progress });
        },
        updateBookStatus: async (bookId, status) => {
            await db.collection("books").doc(bookId).update({ status });
        },
        updateBookFailure: async (bookId, message) => {
            await db.collection("books").doc(bookId).update({ errorMessage: message.slice(0, 500) });
        },
        updateBookStoryQualityReport: async (bookId, report) => {
            await db.collection("books").doc(bookId).update({ storyQualityReport: report });
        },
        getUserMonthlyCount: async (userId) => {
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const countDoc = await db.collection("users").doc(userId).collection("usage").doc(yearMonth).get();
            return countDoc.exists ? (countDoc.data()?.count || 0) : 0;
        },
        incrementMonthlyCount: async (userId) => {
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const countRef = db.collection("users").doc(userId).collection("usage").doc(yearMonth);
            await countRef.set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true });
        },
    };
    await processBookGeneration(bookId, bookData, deps);
});
//# sourceMappingURL=generate-book.js.map