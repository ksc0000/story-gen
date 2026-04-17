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
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const content_filter_1 = require("./lib/content-filter");
const prompt_builder_1 = require("./lib/prompt-builder");
const gemini_1 = require("./lib/gemini");
const replicate_1 = require("./lib/replicate");
const FREE_MONTHLY_LIMIT = 3;
const IMAGE_RETRY_LIMIT = 3;
async function processBookGeneration(bookId, bookData, deps) {
    try {
        // Step 1: Validate input
        const sanitizeResult = (0, content_filter_1.sanitizeInput)(bookData.input);
        if (!sanitizeResult.valid) {
            console.error(`Input validation failed for ${bookId}: ${sanitizeResult.reason}`);
            await deps.updateBookStatus(bookId, "failed");
            return;
        }
        // Step 2: Check quota
        const monthlyCount = await deps.getUserMonthlyCount(bookData.userId);
        if (monthlyCount >= FREE_MONTHLY_LIMIT) {
            console.error(`User ${bookData.userId} exceeded monthly quota (${monthlyCount}/${FREE_MONTHLY_LIMIT})`);
            await deps.updateBookStatus(bookId, "failed");
            return;
        }
        // Step 3: Get template
        const template = await deps.getTemplate(bookData.theme);
        // Step 4: Build prompts
        const systemPrompt = (0, prompt_builder_1.buildSystemPrompt)(template, bookData.style);
        (0, prompt_builder_1.buildUserPrompt)(bookData.input, bookData.pageCount);
        // Step 5: Generate story with LLM
        const story = await deps.llmClient.generateStory({
            systemPrompt,
            childName: bookData.input.childName,
            childAge: bookData.input.childAge,
            favorites: bookData.input.favorites,
            lessonToTeach: bookData.input.lessonToTeach,
            memoryToRecreate: bookData.input.memoryToRecreate,
            pageCount: bookData.pageCount,
            style: bookData.style,
        });
        // Step 6: Update book title
        await deps.updateBookTitle(bookId, story.title);
        // Step 7: Process each page
        const totalPages = story.pages.length;
        for (let i = 0; i < totalPages; i++) {
            const storyPage = story.pages[i];
            const imagePrompt = (0, prompt_builder_1.buildImagePrompt)(storyPage.imagePrompt, bookData.style);
            // Generate image with retries
            let imageBuffer = null;
            let imageUrl = "";
            let pageStatus = "completed";
            for (let attempt = 0; attempt < IMAGE_RETRY_LIMIT; attempt++) {
                try {
                    imageBuffer = await deps.imageClient.generateImage(imagePrompt);
                    imageUrl = await deps.uploadImage(bookId, i, imageBuffer);
                    break; // Success
                }
                catch (err) {
                    console.error(`Image generation attempt ${attempt + 1}/${IMAGE_RETRY_LIMIT} failed for page ${i}:`, err);
                    if (attempt === IMAGE_RETRY_LIMIT - 1) {
                        // All retries exhausted
                        pageStatus = "failed";
                        console.error(`All ${IMAGE_RETRY_LIMIT} attempts failed for page ${i}`);
                    }
                }
            }
            // Write page document
            const pageData = {
                pageNumber: i,
                text: storyPage.text,
                imageUrl,
                imagePrompt: storyPage.imagePrompt,
                status: pageStatus,
            };
            await deps.writePage(bookId, pageData);
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
        await deps.updateBookStatus(bookId, "failed");
    }
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
        llmClient: new gemini_1.GeminiClient(geminiApiKey.value()),
        imageClient: new replicate_1.ReplicateImageClient(replicateApiToken.value()),
        uploadImage: async (bookId, pageNumber, buffer) => {
            const bucket = storage.bucket();
            const filename = `books/${bookId}/page-${pageNumber}.png`;
            const file = bucket.file(filename);
            await file.save(buffer, { contentType: "image/png" });
            const [url] = await file.getSignedUrl({
                action: "read",
                expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
            });
            return url;
        },
        updateBookTitle: async (bookId, title) => {
            await db.collection("books").doc(bookId).update({ title });
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