import { describe, it, expect } from "vitest";
import {
  isStaleBook,
  isStalePage,
  findStaleBooks,
  findStalePages,
  buildStalePagePatch,
  extractBookIdFromPagePath,
  buildCleanupRunKey,
  DEFAULT_STALE_CONFIG,
} from "../src/lib/stale-detection";
import type { StaleBookCandidate, StalePageCandidate } from "../src/lib/stale-detection";

describe("isStaleBook", () => {
  const nowMs = Date.UTC(2026, 4, 7, 12, 0, 0);
  const thresholdMs = 30 * 60 * 1000;

  it("returns false for non-generating status", () => {
    const book: StaleBookCandidate = { id: "b1", status: "completed", updatedAtMs: nowMs - 1000 };
    expect(isStaleBook(book, nowMs, thresholdMs)).toBe(false);
  });

  it("returns true when updatedAtMs is missing", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating" };
    expect(isStaleBook(book, nowMs, thresholdMs)).toBe(true);
  });

  it("returns false when updated just under the threshold", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating", updatedAtMs: nowMs - (thresholdMs - 1) };
    expect(isStaleBook(book, nowMs, thresholdMs)).toBe(false);
  });

  it("returns true when updated exactly at the threshold", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating", updatedAtMs: nowMs - thresholdMs };
    expect(isStaleBook(book, nowMs, thresholdMs)).toBe(true);
  });

  it("returns true when updated well past the threshold", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating", updatedAtMs: nowMs - thresholdMs * 10 };
    expect(isStaleBook(book, nowMs, thresholdMs)).toBe(true);
  });
});

describe("isStalePage", () => {
  const nowMs = Date.UTC(2026, 4, 7, 12, 0, 0);
  const thresholdMs = 30 * 60 * 1000;

  it("returns false for non-generating status", () => {
    const page: StalePageCandidate = {
      id: "p1",
      bookId: "b1",
      pageNumber: 1,
      status: "completed",
      imageGenerationStartedAtMs: nowMs - thresholdMs * 10,
    };
    expect(isStalePage(page, nowMs, thresholdMs)).toBe(false);
  });

  it("returns true when both start timestamps are missing", () => {
    const page: StalePageCandidate = { id: "p1", bookId: "b1", pageNumber: 1, status: "generating" };
    expect(isStalePage(page, nowMs, thresholdMs)).toBe(true);
  });

  it("prefers imageRegenerationStartedAtMs over imageGenerationStartedAtMs when both are set", () => {
    // Regeneration started recently (not stale) even though the original generation was long ago.
    const page: StalePageCandidate = {
      id: "p1",
      bookId: "b1",
      pageNumber: 1,
      status: "generating",
      imageGenerationStartedAtMs: nowMs - thresholdMs * 10,
      imageRegenerationStartedAtMs: nowMs - 1000,
    };
    expect(isStalePage(page, nowMs, thresholdMs)).toBe(false);
  });

  it("falls back to imageGenerationStartedAtMs when regeneration timestamp is absent", () => {
    const page: StalePageCandidate = {
      id: "p1",
      bookId: "b1",
      pageNumber: 1,
      status: "generating",
      imageGenerationStartedAtMs: nowMs - thresholdMs * 10,
    };
    expect(isStalePage(page, nowMs, thresholdMs)).toBe(true);
  });

  it("returns false when started just under the threshold", () => {
    const page: StalePageCandidate = {
      id: "p1",
      bookId: "b1",
      pageNumber: 1,
      status: "generating",
      imageGenerationStartedAtMs: nowMs - (thresholdMs - 1),
    };
    expect(isStalePage(page, nowMs, thresholdMs)).toBe(false);
  });
});

describe("findStaleBooks", () => {
  const nowMs = Date.UTC(2026, 4, 7, 12, 0, 0);

  it("filters to only stale generating books", () => {
    const books: StaleBookCandidate[] = [
      { id: "b1", status: "generating", updatedAtMs: nowMs - DEFAULT_STALE_CONFIG.staleThresholdMs * 2 },
      { id: "b2", status: "generating", updatedAtMs: nowMs - 1000 },
      { id: "b3", status: "completed", updatedAtMs: nowMs - DEFAULT_STALE_CONFIG.staleThresholdMs * 2 },
    ];
    const result = findStaleBooks(books, nowMs, DEFAULT_STALE_CONFIG);
    expect(result.map((b) => b.id)).toEqual(["b1"]);
  });

  it("caps results at config.maxBooks", () => {
    const books: StaleBookCandidate[] = Array.from({ length: 5 }, (_, i) => ({
      id: `b${i}`,
      status: "generating" as const,
      updatedAtMs: nowMs - DEFAULT_STALE_CONFIG.staleThresholdMs * 2,
    }));
    const result = findStaleBooks(books, nowMs, { ...DEFAULT_STALE_CONFIG, maxBooks: 2 });
    expect(result).toHaveLength(2);
  });
});

describe("findStalePages", () => {
  const nowMs = Date.UTC(2026, 4, 7, 12, 0, 0);

  it("filters to only stale generating pages", () => {
    const pages: StalePageCandidate[] = [
      {
        id: "p1",
        bookId: "b1",
        pageNumber: 1,
        status: "generating",
        imageGenerationStartedAtMs: nowMs - DEFAULT_STALE_CONFIG.staleThresholdMs * 2,
      },
      {
        id: "p2",
        bookId: "b1",
        pageNumber: 2,
        status: "generating",
        imageGenerationStartedAtMs: nowMs - 1000,
      },
    ];
    const result = findStalePages(pages, nowMs, DEFAULT_STALE_CONFIG);
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });

  it("caps results at config.maxPages", () => {
    const pages: StalePageCandidate[] = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      bookId: "b1",
      pageNumber: i,
      status: "generating" as const,
      imageGenerationStartedAtMs: nowMs - DEFAULT_STALE_CONFIG.staleThresholdMs * 2,
    }));
    const result = findStalePages(pages, nowMs, { ...DEFAULT_STALE_CONFIG, maxPages: 3 });
    expect(result).toHaveLength(3);
  });
});

describe("buildStalePagePatch", () => {
  it("builds the expected failure patch fields", () => {
    const nowMs = Date.UTC(2026, 4, 7, 12, 0, 0);
    expect(buildStalePagePatch(nowMs)).toEqual({
      status: "image_failed",
      imageFailureReason: "stale_generation_timeout",
      imageRetryable: true,
      lastStaleCleanupAtMs: nowMs,
    });
  });
});

describe("extractBookIdFromPagePath", () => {
  it("extracts bookId from a well-formed page path", () => {
    expect(extractBookIdFromPagePath("books/abc123/pages/page1")).toBe("abc123");
  });

  it("returns null for a malformed path", () => {
    expect(extractBookIdFromPagePath("books/abc123")).toBeNull();
    expect(extractBookIdFromPagePath("pages/page1")).toBeNull();
    expect(extractBookIdFromPagePath("books/abc123/pages/page1/extra")).toBeNull();
  });
});

describe("buildCleanupRunKey", () => {
  it("formats the run key using JST date and time", () => {
    // 2026-05-07 03:05 JST = 2026-05-06 18:05 UTC
    const nowMs = Date.UTC(2026, 4, 6, 18, 5, 0);
    expect(buildCleanupRunKey(nowMs)).toBe("daily-2026-05-07-0305");
  });

  it("crosses the JST midnight boundary correctly", () => {
    // 2026-05-07 00:00 JST = 2026-05-06 15:00 UTC
    const nowMs = Date.UTC(2026, 4, 6, 15, 0, 0);
    expect(buildCleanupRunKey(nowMs)).toBe("daily-2026-05-07-0000");
  });

  it("pads single-digit hour and minute values", () => {
    // 2026-01-01 01:02 JST = 2025-12-31 16:02 UTC
    const nowMs = Date.UTC(2025, 11, 31, 16, 2, 0);
    expect(buildCleanupRunKey(nowMs)).toBe("daily-2026-01-01-0102");
  });
});
