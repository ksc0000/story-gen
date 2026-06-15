import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeQualityMetrics } from "./quality-metrics";
import { buildSnapshotKey } from "./slo-snapshot";
import type { BookData } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QualitySnapshotConfig {
  source: string;
  window: "weekly";
  sampleSize: number;
}

export interface QualitySnapshotResult {
  saved: boolean;
  totalReviewed: number;
  avgOverall: number;
  regressionCount: number;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export function buildQualitySnapshotDoc(
  metrics: ReturnType<typeof computeQualityMetrics>,
  config: QualitySnapshotConfig,
  nowMs: number,
) {
  const snapshotKey = buildSnapshotKey(config.window, nowMs);
  return {
    ...metrics,
    snapshotKey,
    source: config.source,
    createdBy: "system",
    sampleSize: config.sampleSize,
    sampleUnit: "reviewed_books",
    window: config.window,
  };
}

/* ------------------------------------------------------------------ */
/*  Shared snapshot runner                                             */
/* ------------------------------------------------------------------ */

export async function saveQualitySnapshot(
  config: QualitySnapshotConfig,
): Promise<QualitySnapshotResult> {
  const db = getFirestore();

  logger.info(`Starting ${config.window} Quality snapshot`, {
    source: config.source,
    sampleSize: config.sampleSize,
  });

  // 1. Fetch reviewed books
  // We fetch books ordered by qualityReviewedAtMs.
  // Firestore single-field index is enough for this.
  const booksSnap = await db
    .collection("books")
    .orderBy("qualityReviewedAtMs", "desc")
    .limit(config.sampleSize)
    .get();

  if (booksSnap.empty) {
    logger.info("No reviewed books found, skipping snapshot");
    return {
      saved: false,
      totalReviewed: 0,
      avgOverall: 0,
      regressionCount: 0,
    };
  }

  const books = booksSnap.docs.map((d) => {
    const data = d.data() as BookData;
    return {
      id: d.id,
      overallQualityScore: data.overallQualityScore,
      storyQualityScore: data.storyQualityScore,
      illustrationQualityScore: data.illustrationQualityScore,
      characterConsistencyScore: data.characterConsistencyScore,
      personalizationScore: data.personalizationScore,
      safetyScore: data.safetyScore,
      qualityReviewedAtMs: data.qualityReviewedAtMs,
    };
  }).filter(b => b.overallQualityScore != null && b.qualityReviewedAtMs != null);

  if (books.length === 0) {
    logger.info("No books with overallQualityScore found in the sample, skipping snapshot");
    return {
      saved: false,
      totalReviewed: 0,
      avgOverall: 0,
      regressionCount: 0,
    };
  }

  // 2. Compute metrics
  const metrics = computeQualityMetrics(books);

  // 3. Save snapshot
  const nowMs = Date.now();
  const docData = buildQualitySnapshotDoc(metrics, config, nowMs);
  const itemsRef = db
    .collection("adminMetrics")
    .doc("qualitySnapshots")
    .collection("items");
  const docRef = itemsRef.doc(docData.snapshotKey);

  const existingSnap = await docRef.get();
  const existingCreatedAtMs = existingSnap.exists
    ? ((existingSnap.data() as Record<string, unknown>).createdAtMs as
        | number
        | undefined)
    : undefined;
  const isNew = !existingSnap.exists;

  const payload = {
    ...docData,
    createdAtMs: existingCreatedAtMs ?? nowMs,
    updatedAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
    ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
  };

  await docRef.set(payload, { merge: true });

  logger.info(`${config.window} Quality snapshot saved`, {
    source: config.source,
    totalReviewed: metrics.totalReviewed,
    avgOverall: metrics.avgOverall,
    regressionCount: metrics.regressions.length,
  });

  return {
    saved: true,
    totalReviewed: metrics.totalReviewed,
    avgOverall: metrics.avgOverall,
    regressionCount: metrics.regressions.length,
  };
}
