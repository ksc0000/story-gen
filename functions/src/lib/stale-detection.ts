import type { BookStatus, PageStatus } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StaleBookCandidate {
  id: string;
  status: BookStatus;
  updatedAtMs?: number;
}

export interface StalePageCandidate {
  id: string;
  bookId: string;
  pageNumber: number;
  status: PageStatus;
  imageGenerationStartedAtMs?: number;
  imageRegenerationStartedAtMs?: number;
}

export interface StaleCleanupSummary {
  checkedBooks: number;
  updatedBooks: number;
  updatedPages: number;
  skippedBooks: number;
}

export interface StaleDetectionConfig {
  staleThresholdMs: number;
  maxBooks: number;
  maxPages: number;
}

export const DEFAULT_STALE_CONFIG: StaleDetectionConfig = {
  staleThresholdMs: 30 * 60 * 1000, // 30 minutes
  maxBooks: 50,
  maxPages: 200,
};

/* ------------------------------------------------------------------ */
/*  Pure detection functions (testable)                                */
/* ------------------------------------------------------------------ */

/**
 * Determine if a "generating" book is stale based on updatedAtMs.
 */
export function isStaleBook(
  book: StaleBookCandidate,
  nowMs: number,
  thresholdMs: number,
): boolean {
  if (book.status !== "generating") return false;
  if (book.updatedAtMs == null) return true; // missing timestamp = stale
  return nowMs - book.updatedAtMs >= thresholdMs;
}

/**
 * Determine if a "generating" page is stale.
 * Checks imageRegenerationStartedAtMs first (for regeneration),
 * then imageGenerationStartedAtMs (for initial generation).
 */
export function isStalePage(
  page: StalePageCandidate,
  nowMs: number,
  thresholdMs: number,
): boolean {
  if (page.status !== "generating") return false;
  const startedAtMs = page.imageRegenerationStartedAtMs ?? page.imageGenerationStartedAtMs;
  if (startedAtMs == null) return true; // missing timestamp = stale
  return nowMs - startedAtMs >= thresholdMs;
}

/**
 * Filter books to find stale candidates (pure).
 */
export function findStaleBooks(
  books: StaleBookCandidate[],
  nowMs: number,
  config: StaleDetectionConfig,
): StaleBookCandidate[] {
  return books
    .filter((b) => isStaleBook(b, nowMs, config.staleThresholdMs))
    .slice(0, config.maxBooks);
}

/**
 * Filter pages to find stale candidates (pure).
 */
export function findStalePages(
  pages: StalePageCandidate[],
  nowMs: number,
  config: StaleDetectionConfig,
): StalePageCandidate[] {
  return pages
    .filter((p) => isStalePage(p, nowMs, config.staleThresholdMs))
    .slice(0, config.maxPages);
}

/**
 * Build the Firestore update patch for a stale page.
 */
export function buildStalePagePatch(nowMs: number) {
  return {
    status: "image_failed" as const,
    imageFailureReason: "stale_generation_timeout",
    imageRetryable: true,
    lastStaleCleanupAtMs: nowMs,
  };
}
