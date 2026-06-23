import type { BookStatus, PageStatus } from "./types";

/* ------------------------------------------------------------------ */
/*  Lightweight shapes used by the pure computation functions          */
/* ------------------------------------------------------------------ */

interface BookLike {
  id: string;
  status: BookStatus;
  hasCoverPage?: boolean;
  coverStatus?: string;
  coverImageModelProfile?: string;
}

interface PageLike {
  status: PageStatus;
  imageModel?: string;
  imageModelProfile?: string;
  replicateModel?: string;
  imageQualityTier?: string;
  imageDurationMs?: number;
  imageTimeoutCount?: number;
  imageFallbackUsed?: boolean;
  imageFailureReason?: string;
  regenerationAttemptCount?: number;
}

/* ------------------------------------------------------------------ */
/*  SLO types                                                          */
/* ------------------------------------------------------------------ */

export interface SloMetrics {
  totalBooks: number;
  completedBooks: number;
  partialCompletedBooks: number;
  failedBooks: number;
  bookReadableRate: number;
  bookHardFailedRate: number;
  totalPages: number;
  imageFailedPages: number;
  pageImageFailureRate: number;
  fallbackPages: number;
  fallbackRate: number;
  timeoutPages: number;
  timeoutRate: number;
  imageP50Ms: number;
  imageP90Ms: number;
  imageP95Ms: number;
  regenerationCount: number;
  regenerationSuccessCount: number;
  regenerationSuccessRate: number;
  totalEstimatedCostUsd?: number;
  avgCostPerBookUsd?: number;
}

export const EMPTY_SLO: SloMetrics = {
  totalBooks: 0,
  completedBooks: 0,
  partialCompletedBooks: 0,
  failedBooks: 0,
  bookReadableRate: 0,
  bookHardFailedRate: 0,
  totalPages: 0,
  imageFailedPages: 0,
  pageImageFailureRate: 0,
  fallbackPages: 0,
  fallbackRate: 0,
  timeoutPages: 0,
  timeoutRate: 0,
  imageP50Ms: 0,
  imageP90Ms: 0,
  imageP95Ms: 0,
  regenerationCount: 0,
  regenerationSuccessCount: 0,
  regenerationSuccessRate: 0,
  totalEstimatedCostUsd: 0,
  avgCostPerBookUsd: 0,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/**
 * Estimated cost per image generation in USD.
 * Mirrors src/lib/admin-cost-metrics.ts.
 */
const ESTIMATED_COST_PER_IMAGE: Record<string, number> = {
  "black-forest-labs/flux-2-pro": 0.05,
  "black-forest-labs/flux-2-klein-9b": 0.025,
  "black-forest-labs/flux-2-klein-9b-base": 0.025,
  "black-forest-labs/flux-kontext-pro": 0.05,
  "black-forest-labs/flux-kontext-max": 0.05,
  "black-forest-labs/flux-1.1-pro": 0.04,
  "black-forest-labs/flux-schnell": 0.003,
  "openai/gpt-image-1-mini": 0.011,
  "openai/gpt-image-1": 0.042,
  "openai/gpt-image-2": 0.08, // estimate (high quality); refine once billed usage is observed
  "openai/gpt-4o": 0.042,
  "dall-e-3": 0.04,
};

/**
 * Returns the estimated USD cost per image for a resolved model label
 * (e.g. "openai/gpt-image-2", "black-forest-labs/flux-2-pro"), or undefined
 * if the label is unknown. Used by the admin image-model comparison tool.
 */
export function getEstimatedImageCostForModel(modelLabel: string): number | undefined {
  return ESTIMATED_COST_PER_IMAGE[modelLabel];
}

function getEstimatedImageCost(page: PageLike): number {
  if (page.imageModel && ESTIMATED_COST_PER_IMAGE[page.imageModel]) {
    return ESTIMATED_COST_PER_IMAGE[page.imageModel];
  }
  if (page.replicateModel && ESTIMATED_COST_PER_IMAGE[page.replicateModel]) {
    return ESTIMATED_COST_PER_IMAGE[page.replicateModel];
  }
  if (page.imageModelProfile) {
    const profileCosts: Record<string, number> = {
      klein_fast: 0.025,
      klein_base: 0.025,
      pro_consistent: 0.05,
      kontext_reference: 0.05,
      kontext_max: 0.05,
      openai_mini: 0.011,
      openai_standard: 0.042,
      openai_gpt_image_2: 0.08,
      flux11_pro_candidate: 0.04,
      openai_image_candidate: 0.042,
    };
    if (profileCosts[page.imageModelProfile]) return profileCosts[page.imageModelProfile];
  }
  if (page.imageQualityTier === "premium") return 0.05;
  return 0.025;
}

/**
 * Detect whether a page experienced a timeout.
 * Mirrors the logic in src/lib/admin-slo-metrics.ts.
 */
function isTimeoutPage(page: PageLike): boolean {
  if ((page.imageTimeoutCount ?? 0) > 0) return true;

  // Future-proof: accept imageDeadlineExceeded
  if ((page as unknown as Record<string, unknown>)["imageDeadlineExceeded"] === true) return true;

  const reason = page.imageFailureReason;
  if (reason && /timeout|deadline/i.test(reason)) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/*  Main computation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Pure function to compute SLO metrics from books and their pages.
 * Equivalent to the frontend computeSloMetrics in src/lib/admin-slo-metrics.ts.
 */
export function computeSloMetrics(
  books: BookLike[],
  pagesMap: Map<string, PageLike[]>,
): SloMetrics {
  const terminalBooks = books.filter(
    (b) => b.status === "completed" || b.status === "partial_completed" || b.status === "failed",
  );
  const totalBooks = terminalBooks.length;
  if (totalBooks === 0) return EMPTY_SLO;

  const completedBooks = terminalBooks.filter((b) => b.status === "completed").length;
  const partialCompletedBooks = terminalBooks.filter((b) => b.status === "partial_completed").length;
  const failedBooks = terminalBooks.filter((b) => b.status === "failed").length;
  const bookReadableRate = ((completedBooks + partialCompletedBooks) / totalBooks) * 100;
  const bookHardFailedRate = (failedBooks / totalBooks) * 100;

  const allPages: PageLike[] = [];
  for (const book of terminalBooks) {
    const bp = pagesMap.get(book.id);
    if (bp) allPages.push(...bp);
  }

  const totalPages = allPages.length;
  const imageFailedPages = allPages.filter((p) => p.status === "image_failed").length;
  const pageImageFailureRate = totalPages > 0 ? (imageFailedPages / totalPages) * 100 : 0;
  const fallbackPages = allPages.filter((p) => p.imageFallbackUsed === true).length;
  const fallbackRate = totalPages > 0 ? (fallbackPages / totalPages) * 100 : 0;
  const timeoutPages = allPages.filter(isTimeoutPage).length;
  const timeoutRate = totalPages > 0 ? (timeoutPages / totalPages) * 100 : 0;

  const durations = allPages
    .map((p) => p.imageDurationMs)
    .filter((d): d is number => typeof d === "number" && d > 0)
    .sort((a, b) => a - b);
  const imageP50Ms = computePercentile(durations, 50);
  const imageP90Ms = computePercentile(durations, 90);
  const imageP95Ms = computePercentile(durations, 95);

  const regeneratedPages = allPages.filter((p) => (p.regenerationAttemptCount ?? 0) > 0);
  const regenerationCount = regeneratedPages.length;
  const regenerationSuccessCount = regeneratedPages.filter(
    (p) => p.status === "completed" || p.status === "fallback_completed",
  ).length;
  const regenerationSuccessRate =
    regenerationCount > 0 ? (regenerationSuccessCount / regenerationCount) * 100 : 0;

  let totalEstimatedCostUsd = 0;
  for (const page of allPages) {
    totalEstimatedCostUsd += getEstimatedImageCost(page);
  }
  for (const book of terminalBooks) {
    if (book.hasCoverPage && book.coverStatus === "completed") {
      totalEstimatedCostUsd += book.coverImageModelProfile === "openai_image_candidate" ? 0.042 : 0.05;
    }
  }
  const avgCostPerBookUsd = totalBooks > 0 ? totalEstimatedCostUsd / totalBooks : 0;

  return {
    totalBooks,
    completedBooks,
    partialCompletedBooks,
    failedBooks,
    bookReadableRate,
    bookHardFailedRate,
    totalPages,
    imageFailedPages,
    pageImageFailureRate,
    fallbackPages,
    fallbackRate,
    timeoutPages,
    timeoutRate,
    imageP50Ms,
    imageP90Ms,
    imageP95Ms,
    regenerationCount,
    regenerationSuccessCount,
    regenerationSuccessRate,
    totalEstimatedCostUsd,
    avgCostPerBookUsd,
  };
}
