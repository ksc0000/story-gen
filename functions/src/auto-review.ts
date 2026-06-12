import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { runLLMAutoReview } from "./lib/auto-review-llm";
import type { BookData, PageData, QualityReviewDoc, LLMQualityReviewResult } from "./lib/types";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const onBookCompletion_triggerLLMAutoReview = onDocumentUpdated(
  {
    document: "books/{bookId}",
    secrets: [geminiApiKey],
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const bookId = event.params.bookId;
    const beforeData = event.data?.before.data() as BookData | undefined;
    const afterData = event.data?.after.data() as BookData | undefined;

    if (!afterData) return;

    // Trigger only when status changes to "completed"
    if (afterData.status !== "completed" || beforeData?.status === "completed") {
      return;
    }

    const db = admin.firestore();

    // Idempotency check: skip if llm_auto_review already exists
    const existingReviews = await db
      .collection("books")
      .doc(bookId)
      .collection("qualityReviews")
      .where("reviewType", "==", "llm_auto_review")
      .limit(1)
      .get();

    if (!existingReviews.empty) {
      logger.info(`LLM auto review already exists for book ${bookId}, skipping.`, { bookId });
      return;
    }

    try {
      logger.info(`Starting LLM auto review for book ${bookId}`, { bookId });

      // Fetch pages for content
      const pagesSnap = await db
        .collection("books")
        .doc(bookId)
        .collection("pages")
        .orderBy("pageNumber", "asc")
        .get();
      const pages = pagesSnap.docs.map((doc) => doc.data() as PageData);

      if (pages.length === 0) {
        logger.warn(`No pages found for book ${bookId}, cannot run LLM auto review.`, { bookId });
        return;
      }

      // Call LLM for review
      const reviewResult = await runLLMAutoReview({
        apiKey: geminiApiKey.value(),
        book: afterData,
        pages,
      });

      // Prepare review document
      const now = Date.now();
      const reviewId = `llm_auto_review_${now}`;
      const reviewDoc: QualityReviewDoc = {
        id: reviewId,
        reviewType: "llm_auto_review",
        createdAt: admin.firestore.Timestamp.now() as any, // Cast for compatibility if needed
        createdAtMs: now,
        result: reviewResult,
        reviewedBy: "system_llm",
      };

      // Save to Firestore
      await db
        .collection("books")
        .doc(bookId)
        .collection("qualityReviews")
        .doc(reviewId)
        .set(reviewDoc);

      logger.info(`Successfully saved LLM auto review for book ${bookId}`, { bookId, reviewId });

      // Also update BookDoc summary fields (optional but recommended in prototype)
      await db.collection("books").doc(bookId).update({
        qualityReviewStatus: "llm_reviewed",
        storyQualityScore: reviewResult.storyQualityScore,
        illustrationQualityScore: reviewResult.illustrationQualityScore,
        characterConsistencyScore: reviewResult.characterConsistencyScore,
        personalizationScore: reviewResult.personalizationScore,
        safetyScore: reviewResult.safetyScore,
        overallQualityScore: reviewResult.overallQualityScore,
        qualityReviewedAtMs: now,
        qualityReviewer: "system_llm",
        qualityReviewReason: reviewResult.reviewReason,
        qualityFlaggedIssues: reviewResult.flaggedIssues,
        qualityRecommendedFixes: reviewResult.recommendedFixes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtMs: now,
      });

    } catch (err) {
      logger.error(`Error during LLM auto review for book ${bookId}`, {
        bookId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
