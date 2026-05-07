import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { randomUUID } from "crypto";
import {
  ReplicateImageClient,
  resolveImageFallbackProfiles,
  withImageTimeout,
  ImageTimeoutError,
} from "./lib/replicate";
import type { PageData, BookData, ImageModelProfile, PageStatus, GenerationReliabilityStatus } from "./lib/types";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");
const IMAGE_GENERATION_TIMEOUT_MS = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? "120000");
const STORAGE_BUCKET = "story-gen-8a769.firebasestorage.app";

export function buildRegenerationSuccessPatch(params: {
  newPageStatus: PageStatus;
  imageUrl: string;
  durationMs: number;
  attemptCount: number;
  usedProfile: ImageModelProfile;
  timeoutCount: number;
  fallbackUsed: boolean;
  primaryProfile: ImageModelProfile;
  deleteSentinel: unknown;
  serverTimestampSentinel: unknown;
  nowMs: number;
}): Record<string, unknown> {
  const {
    newPageStatus, imageUrl, durationMs, attemptCount, usedProfile,
    timeoutCount, fallbackUsed, primaryProfile,
    deleteSentinel: del, serverTimestampSentinel, nowMs,
  } = params;
  return {
    status: newPageStatus,
    imageUrl,
    imageDurationMs: durationMs,
    imageAttemptCount: attemptCount,
    imageModelProfile: usedProfile,
    imageFailureReason: del,
    imageRetryable: del,
    imageTimeoutCount: timeoutCount > 0 ? timeoutCount : del,
    imageFallbackUsed: fallbackUsed ? true : del,
    fallbackFromModelProfile: fallbackUsed ? primaryProfile : del,
    imageRegeneratedAt: serverTimestampSentinel,
    imageRegeneratedAtMs: nowMs,
  };
}

interface RegeneratePageImageRequest {
  bookId: string;
  pageId?: string;
  pageNumber?: number;
}

interface RegeneratePageImageResponse {
  success: boolean;
  pageStatus: PageStatus;
  imageUrl: string;
}

export const regeneratePageImage = onCall<RegeneratePageImageRequest, Promise<RegeneratePageImageResponse>>(
  { secrets: [replicateApiToken] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }

    const uid = request.auth.uid;
    const isAdmin = request.auth.token?.admin === true;
    const { bookId, pageId, pageNumber } = request.data;

    if (!bookId) throw new HttpsError("invalid-argument", "bookId は必須です。");
    if (pageId === undefined && pageNumber === undefined) {
      throw new HttpsError("invalid-argument", "pageId または pageNumber は必須です。");
    }

    const db = admin.firestore();
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) throw new HttpsError("not-found", "絵本が見つかりません。");
    const bookData = bookSnap.data() as BookData;

    if (!isAdmin && bookData.userId !== uid) {
      throw new HttpsError("permission-denied", "この操作を実行する権限がありません。");
    }

    const resolvedPageId = pageId ?? `page-${pageNumber}`;
    const pageRef = bookRef.collection("pages").doc(resolvedPageId);
    const pageSnap = await pageRef.get();
    if (!pageSnap.exists) throw new HttpsError("not-found", "ページが見つかりません。");
    const pageData = pageSnap.data() as PageData;

    const allowedStatuses: PageStatus[] = ["image_failed", "fallback_completed"];
    if (isAdmin) allowedStatuses.push("completed");

    if (!allowedStatuses.includes(pageData.status)) {
      throw new HttpsError(
        "failed-precondition",
        `ページステータス "${pageData.status}" は再生成できません。`
      );
    }

    const startMs = Date.now();

    await pageRef.update({
      status: "generating",
      imageRegenerationStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      imageRegenerationStartedAtMs: startMs,
      regenerationAttemptCount: admin.firestore.FieldValue.increment(1),
      regenerationTriggeredBy: isAdmin ? "admin" : "owner",
    });

    const imageClient = new ReplicateImageClient(replicateApiToken.value());
    const primaryProfile = (pageData.imageModelProfile ?? "pro_consistent") as ImageModelProfile;
    const inputImageUrls = (pageData.inputImageRefs ?? []).map((ref) => ref.url);

    const fallbackProfiles = resolveImageFallbackProfiles(primaryProfile);
    let imageBuffer: Buffer | undefined;
    let usedProfile = primaryProfile;
    let fallbackUsed = false;
    let attemptCount = 0;
    let timeoutCount = 0;
    let failureReason: string | undefined;
    let success = false;

    outer: for (const profile of fallbackProfiles) {
      const maxRetries = 2;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        attemptCount++;
        try {
          imageBuffer = await withImageTimeout(
            imageClient.generateImage(pageData.imagePrompt, {
              purpose: pageData.imagePurpose,
              imageQualityTier: pageData.imageQualityTier,
              imageModelProfile: profile,
              inputImageUrls,
            }),
            IMAGE_GENERATION_TIMEOUT_MS
          );
          usedProfile = profile;
          fallbackUsed = profile !== primaryProfile;
          success = true;
          break outer;
        } catch (err) {
          if (err instanceof ImageTimeoutError) {
            timeoutCount++;
            failureReason = "image_timeout";
            logger.warn("Regeneration timeout", { bookId, pageId: resolvedPageId, profile, attempt });
            break;
          }
          failureReason = err instanceof Error ? err.message : "unknown";
          logger.warn("Regeneration attempt failed", {
            bookId,
            pageId: resolvedPageId,
            profile,
            attempt,
            error: failureReason,
          });
          if (attempt < maxRetries - 1) continue;
          break;
        }
      }
    }

    const durationMs = Date.now() - startMs;

    if (!success || !imageBuffer) {
      const failurePatch: Record<string, unknown> = {
        status: "image_failed" as PageStatus,
        imageFailureReason: failureReason ?? "unknown",
        imageRetryable: true,
        imageDurationMs: durationMs,
        imageAttemptCount: attemptCount,
        lastRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastRegeneratedAtMs: Date.now(),
        lastRegenerationSucceeded: false,
      };
      if (timeoutCount > 0) failurePatch.imageTimeoutCount = timeoutCount;
      await pageRef.update(failurePatch);

      // Write regeneration history entry
      const historyEntry = {
        attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptedAtMs: Date.now(),
        attemptedBy: uid,
        triggeredBy: isAdmin ? "admin" : "owner",
        beforeStatus: pageData.status,
        afterStatus: "image_failed" as PageStatus,
        beforeImageUrl: pageData.imageUrl ?? null,
        imageModelProfile: primaryProfile,
        fallbackUsed: false,
        durationMs,
        failureReason: failureReason ?? "unknown",
        success: false,
      };
      await pageRef.collection("regenerationHistory").add(historyEntry);

      await recalculateBookMetrics(bookId, bookRef);
      throw new HttpsError("internal", `画像生成に失敗しました: ${failureReason}`);
    }

    const storage = admin.storage();
    const bucket = storage.bucket(STORAGE_BUCKET);
    const filename = `books/${bookId}/page-${pageData.pageNumber}-regen-${Date.now()}.png`;
    const file = bucket.file(filename);
    const downloadToken = randomUUID();
    await file.save(imageBuffer, {
      contentType: "image/png",
      metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
    });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;

    const newPageStatus: PageStatus = fallbackUsed ? "fallback_completed" : "completed";

    const successPatch = buildRegenerationSuccessPatch({
      newPageStatus,
      imageUrl,
      durationMs,
      attemptCount,
      usedProfile,
      timeoutCount,
      fallbackUsed,
      primaryProfile,
      deleteSentinel: admin.firestore.FieldValue.delete(),
      serverTimestampSentinel: admin.firestore.FieldValue.serverTimestamp(),
      nowMs: Date.now(),
    });
    await pageRef.update(successPatch);

    // Write regeneration history entry
    const historyEntry = {
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      attemptedAtMs: Date.now(),
      attemptedBy: uid,
      triggeredBy: isAdmin ? "admin" : "owner",
      beforeStatus: pageData.status,
      afterStatus: newPageStatus,
      beforeImageUrl: pageData.imageUrl ?? null,
      afterImageUrl: imageUrl,
      imageModelProfile: usedProfile,
      fallbackUsed,
      durationMs,
      success: true,
    };
    await pageRef.collection("regenerationHistory").add(historyEntry);

    // Update page-level regeneration metadata
    await pageRef.update({
      lastRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRegeneratedAtMs: Date.now(),
      lastRegenerationSucceeded: true,
    });

    if (pageData.pageNumber === 0) {
      await bookRef.update({ coverImageUrl: imageUrl });
    }

    await recalculateBookMetrics(bookId, bookRef);

    logger.info("Page image regenerated", {
      bookId,
      pageId: resolvedPageId,
      pageNumber: pageData.pageNumber,
      usedProfile,
      fallbackUsed,
      durationMs,
      triggeredBy: isAdmin ? "admin" : "owner",
    });

    return { success: true, pageStatus: newPageStatus, imageUrl };
  }
);

export interface DerivedBookMetrics {
  imageSuccessCount: number;
  imageFailureCount: number;
  totalImageCount: number;
  failedPageNumbers: number[];
  pendingPageNumbers: number[];
  generationReliabilityStatus: GenerationReliabilityStatus;
  bookStatus: "completed" | "partial_completed" | "failed";
}

/**
 * Pure function to derive book status from page statuses.
 * Considers intermediate statuses (generating, pending) as incomplete.
 */
export function deriveBookMetrics(
  pages: Pick<PageData, "status" | "pageNumber">[],
): DerivedBookMetrics {
  const totalImageCount = pages.length;
  const successPages = pages.filter(
    (p) => p.status === "completed" || p.status === "fallback_completed",
  );
  const failedPages = pages.filter((p) => p.status === "image_failed" || p.status === "failed");
  const pendingPages = pages.filter(
    (p) => p.status === "generating" || p.status === "pending",
  );
  const imageSuccessCount = successPages.length;
  const imageFailureCount = failedPages.length;
  const failedPageNumbers = failedPages.map((p) => p.pageNumber).sort((a, b) => a - b);
  const pendingPageNumbers = pendingPages.map((p) => p.pageNumber).sort((a, b) => a - b);

  const incompleteCount = imageFailureCount + pendingPages.length;

  const generationReliabilityStatus: GenerationReliabilityStatus =
    incompleteCount === 0 ? "ok" : imageSuccessCount > 0 ? "partial" : "failed";

  const bookStatus: "completed" | "partial_completed" | "failed" =
    incompleteCount === 0
      ? "completed"
      : imageSuccessCount > 0
        ? "partial_completed"
        : "failed";

  return {
    imageSuccessCount,
    imageFailureCount,
    totalImageCount,
    failedPageNumbers,
    pendingPageNumbers,
    generationReliabilityStatus,
    bookStatus,
  };
}

async function recalculateBookMetrics(
  bookId: string,
  bookRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const pagesSnap = await bookRef.collection("pages").get();
  const pages = pagesSnap.docs.map((d) => d.data() as PageData);

  const bookSnap = await bookRef.get();
  const previousStatus = (bookSnap.data() as BookData | undefined)?.status;

  const metrics = deriveBookMetrics(pages);

  const updateData: Record<string, unknown> = {
    imageSuccessCount: metrics.imageSuccessCount,
    imageFailureCount: metrics.imageFailureCount,
    totalImageCount: metrics.totalImageCount,
    failedPageNumbers: metrics.failedPageNumbers,
    generationReliabilityStatus: metrics.generationReliabilityStatus,
    status: metrics.bookStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtMs: Date.now(),
    lastCompletionCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCompletionCheckedAtMs: Date.now(),
  };

  // Track recovery from partial_completed to completed
  if (previousStatus === "partial_completed" && metrics.bookStatus === "completed") {
    updateData.recoveredFromPartialCompleted = true;
    updateData.recoveredAt = admin.firestore.FieldValue.serverTimestamp();
    updateData.recoveredAtMs = Date.now();
    logger.info("Book recovered from partial_completed to completed", { bookId });
  }

  await bookRef.update(updateData);

  logger.info("Book metrics recalculated after regeneration", {
    bookId,
    imageSuccessCount: metrics.imageSuccessCount,
    imageFailureCount: metrics.imageFailureCount,
    bookStatus: metrics.bookStatus,
    generationReliabilityStatus: metrics.generationReliabilityStatus,
    recoveredFromPartialCompleted: previousStatus === "partial_completed" && metrics.bookStatus === "completed",
  });
}

/**
 * Admin-only callable to re-check a book's completion status.
 * Useful when pages were fixed but book status was not updated.
 */
export const checkBookCompletion = onCall<{ bookId: string }, Promise<{ bookStatus: string; recovered: boolean }>>(
  {},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    if (request.auth.token?.admin !== true) {
      throw new HttpsError("permission-denied", "管理者権限が必要です。");
    }
    const { bookId } = request.data;
    if (!bookId) throw new HttpsError("invalid-argument", "bookId は必須です。");

    const db = admin.firestore();
    const bookRef = db.collection("books").doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) throw new HttpsError("not-found", "絵本が見つかりません。");

    const previousStatus = (bookSnap.data() as BookData).status;
    await recalculateBookMetrics(bookId, bookRef);

    const updatedSnap = await bookRef.get();
    const newStatus = (updatedSnap.data() as BookData).status;

    return {
      bookStatus: newStatus,
      recovered: previousStatus === "partial_completed" && newStatus === "completed",
    };
  },
);
