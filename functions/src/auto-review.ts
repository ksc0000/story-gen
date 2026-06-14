import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { runLLMAutoReview } from "./lib/auto-review-llm";
import type { BookData, PageData, QualityReview } from "./lib/types";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Feature flag (kill switch) for the LLM auto-review prototype.
 * Disabled by default — set the env var `ENABLE_LLM_AUTO_REVIEW=true` to activate.
 * This lets us toggle the automatic Gemini review per book completion without redeploying.
 */
function isLLMAutoReviewEnabled(): boolean {
  return process.env.ENABLE_LLM_AUTO_REVIEW === "true";
}

export const onBookCompletion_triggerLLMAutoReview = onDocumentUpdated(
  {
    document: "books/{bookId}",
    secrets: [geminiApiKey],
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    // Kill switch: skip entirely unless explicitly enabled.
    if (!isLLMAutoReviewEnabled()) return;

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
      .where("reviewerType", "==", "llm")
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

      // Normalize scores from 0-100 to 1-5 scale (Human reviewer scale)
      const storyScore = Math.round((reviewResult.storyQualityScore / 20) * 10) / 10;
      const illustrationScore = Math.round((reviewResult.illustrationQualityScore / 20) * 10) / 10;
      const characterScore = Math.round((reviewResult.characterConsistencyScore / 20) * 10) / 10;
      const personalizationScore = Math.round((reviewResult.personalizationScore / 20) * 10) / 10;
      const safetyScore = Math.round((reviewResult.safetyScore / 20) * 10) / 10;
      const overallScore = Math.round((reviewResult.overallQualityScore / 20) * 10) / 10;

      const reviewDoc: QualityReview = {
        id: reviewId,
        bookId,
        reviewerType: "llm",
        reviewerId: "system_llm",
        storyScore,
        illustrationScore,
        characterConsistencyScore: characterScore,
        personalizationScore,
        safetyScore,
        overallScore,
        status: "llm_reviewed",
        reviewReason: reviewResult.reviewReason,
        flaggedIssues: reviewResult.flaggedIssues,
        recommendedFixes: reviewResult.recommendedFixes,
        rubricVersion: "llm-auto-v1",
        llmAutoReviewResult: reviewResult,
        createdAt: admin.firestore.Timestamp.now(),
        createdAtMs: now,
        updatedAt: admin.firestore.Timestamp.now(),
        updatedAtMs: now,
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
        latestQualityReviewId: reviewId,
        qualityReviewStatus: "llm_reviewed",
        storyQualityScore: storyScore,
        illustrationQualityScore: illustrationScore,
        characterConsistencyScore: characterScore,
        personalizationScore,
        safetyScore,
        overallQualityScore: overallScore,
        qualityReviewedAtMs: now,
        qualityReviewerType: "llm",
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
