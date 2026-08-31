import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeQualityMetrics } from "./quality-metrics";
import { buildSnapshotKey, resolveWindowStartMs } from "./slo-snapshot";
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
  const windowStartMs = resolveWindowStartMs(config.window, nowMs);
  return {
    ...metrics,
    snapshotKey,
    source: config.source,
    createdBy: "system",
    sampleSize: config.sampleSize,
    sampleUnit: "reviewed_books",
    window: config.window,
    // 集計対象期間（null = 全期間）。
    windowStartMs,
    windowEndMs: nowMs,
  };
}

/**
 * Build the final write payload with correct timestamp semantics.
 * - New doc: sets both createdAtMs and updatedAtMs to nowMs.
 * - Existing doc: preserves existing createdAtMs, updates updatedAtMs.
 * Pure function — no side effects.
 */
export function buildQualitySnapshotWritePayload(
  doc: ReturnType<typeof buildQualitySnapshotDoc>,
  nowMs: number,
  existingCreatedAtMs: number | undefined,
) {
  return {
    ...doc,
    createdAtMs: existingCreatedAtMs ?? nowMs,
    updatedAtMs: nowMs,
  };
}

/* ------------------------------------------------------------------ */
/*  Shared snapshot runner                                             */
/* ------------------------------------------------------------------ */

export async function saveQualitySnapshot(
  config: QualitySnapshotConfig,
): Promise<QualitySnapshotResult> {
  const db = getFirestore();
  const nowMs = Date.now();

  logger.info(`Starting ${config.window} Quality snapshot`, {
    source: config.source,
    sampleSize: config.sampleSize,
  });

  // 1. Fetch books reviewed inside the aggregation window.
  // Inequality + orderBy on the same field → single-field index is enough.
  // ウィンドウを掛けないと「全期間の直近 sampleSize 件」を毎週同じように
  // 集計してしまい、週次スナップショットが常に同じ値になる。
  const windowStartMs = resolveWindowStartMs(config.window, nowMs);
  let booksQuery: FirebaseFirestore.Query = db
    .collection("books")
    .orderBy("qualityReviewedAtMs", "desc");
  if (windowStartMs !== null) {
    booksQuery = booksQuery.where("qualityReviewedAtMs", ">=", windowStartMs);
  }
  const booksSnap = await booksQuery.limit(config.sampleSize).get();

  if (booksSnap.empty) {
    logger.info("No reviewed books in window, skipping snapshot", {
      window: config.window,
      windowStartMs,
    });
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

  const payload = buildQualitySnapshotWritePayload(docData, nowMs, existingCreatedAtMs);

  await docRef.set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );

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
