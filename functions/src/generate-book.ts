import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import type { BookData, TemplateData, LLMClient, ImageClient, PageData } from "./lib/types";
import { sanitizeInput } from "./lib/content-filter";
import { buildSystemPrompt, buildImagePrompt, buildUserPrompt } from "./lib/prompt-builder";
import { GeminiClient } from "./lib/gemini";
import { ReplicateImageClient } from "./lib/replicate";

const FREE_MONTHLY_LIMIT = 3;
const IMAGE_RETRY_LIMIT = 3;

export interface GenerationDeps {
  getTemplate: (theme: string) => Promise<TemplateData>;
  llmClient: LLMClient;
  imageClient: ImageClient;
  uploadImage: (bookId: string, pageNumber: number, buffer: Buffer) => Promise<string>;
  updateBookTitle: (bookId: string, title: string) => Promise<void>;
  writePage: (bookId: string, page: PageData) => Promise<void>;
  updateBookProgress: (bookId: string, progress: number) => Promise<void>;
  updateBookStatus: (bookId: string, status: "completed" | "failed") => Promise<void>;
  getUserMonthlyCount: (userId: string) => Promise<number>;
  incrementMonthlyCount: (userId: string) => Promise<void>;
}

export async function processBookGeneration(
  bookId: string,
  bookData: BookData,
  deps: GenerationDeps
): Promise<void> {
  try {
    // Step 1: Validate input
    const sanitizeResult = sanitizeInput(bookData.input);
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
    const systemPrompt = buildSystemPrompt(template, bookData.style);
    buildUserPrompt(bookData.input, bookData.pageCount);

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
      const imagePrompt = buildImagePrompt(storyPage.imagePrompt, bookData.style);

      // Generate image with retries
      let imageBuffer: Buffer | null = null;
      let imageUrl = "";
      let pageStatus: "completed" | "failed" = "completed";

      for (let attempt = 0; attempt < IMAGE_RETRY_LIMIT; attempt++) {
        try {
          imageBuffer = await deps.imageClient.generateImage(imagePrompt);
          imageUrl = await deps.uploadImage(bookId, i, imageBuffer);
          break; // Success
        } catch (err) {
          console.error(`Image generation attempt ${attempt + 1}/${IMAGE_RETRY_LIMIT} failed for page ${i}:`, err);
          if (attempt === IMAGE_RETRY_LIMIT - 1) {
            // All retries exhausted
            pageStatus = "failed";
            console.error(`All ${IMAGE_RETRY_LIMIT} attempts failed for page ${i}`);
          }
        }
      }

      // Write page document
      const pageData: PageData = {
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
  } catch (err) {
    console.error(`Book generation failed for ${bookId}:`, err);
    await deps.updateBookStatus(bookId, "failed");
  }
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

      llmClient: new GeminiClient(geminiApiKey.value()),
      imageClient: new ReplicateImageClient(replicateApiToken.value()),

      uploadImage: async (bookId: string, pageNumber: number, buffer: Buffer) => {
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

      updateBookTitle: async (bookId: string, title: string) => {
        await db.collection("books").doc(bookId).update({ title });
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
