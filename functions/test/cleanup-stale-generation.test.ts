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

const NOW = 1_700_000_000_000;
const THRESHOLD = DEFAULT_STALE_CONFIG.staleThresholdMs; // 30 min
const STALE_TIME = NOW - THRESHOLD - 1; // just past threshold
const FRESH_TIME = NOW - THRESHOLD + 60_000; // 1 min before threshold

/* ------------------------------------------------------------------ */
/*  isStaleBook                                                        */
/* ------------------------------------------------------------------ */
describe("isStaleBook", () => {
  it("returns true for generating book older than threshold", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating", updatedAtMs: STALE_TIME };
    expect(isStaleBook(book, NOW, THRESHOLD)).toBe(true);
  });

  it("returns false for generating book within threshold", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating", updatedAtMs: FRESH_TIME };
    expect(isStaleBook(book, NOW, THRESHOLD)).toBe(false);
  });

  it("returns true when updatedAtMs is missing", () => {
    const book: StaleBookCandidate = { id: "b1", status: "generating" };
    expect(isStaleBook(book, NOW, THRESHOLD)).toBe(true);
  });

  it("returns false for non-generating book", () => {
    const book: StaleBookCandidate = { id: "b1", status: "completed", updatedAtMs: STALE_TIME };
    expect(isStaleBook(book, NOW, THRESHOLD)).toBe(false);
  });

  it("returns false for failed book", () => {
    const book: StaleBookCandidate = { id: "b1", status: "failed", updatedAtMs: STALE_TIME };
    expect(isStaleBook(book, NOW, THRESHOLD)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  isStalePage                                                        */
/* ------------------------------------------------------------------ */
describe("isStalePage", () => {
  it("returns true for generating page older than threshold", () => {
    const page: StalePageCandidate = {
      id: "p1", bookId: "b1", pageNumber: 0, status: "generating",
      imageGenerationStartedAtMs: STALE_TIME,
    };
    expect(isStalePage(page, NOW, THRESHOLD)).toBe(true);
  });

  it("returns false for generating page within threshold", () => {
    const page: StalePageCandidate = {
      id: "p1", bookId: "b1", pageNumber: 0, status: "generating",
      imageGenerationStartedAtMs: FRESH_TIME,
    };
    expect(isStalePage(page, NOW, THRESHOLD)).toBe(false);
  });

  it("prefers imageRegenerationStartedAtMs over imageGenerationStartedAtMs", () => {
    const page: StalePageCandidate = {
      id: "p1", bookId: "b1", pageNumber: 0, status: "generating",
      imageGenerationStartedAtMs: STALE_TIME,
      imageRegenerationStartedAtMs: FRESH_TIME,
    };
    expect(isStalePage(page, NOW, THRESHOLD)).toBe(false);
  });

  it("returns true when both timestamps are missing", () => {
    const page: StalePageCandidate = {
      id: "p1", bookId: "b1", pageNumber: 0, status: "generating",
    };
    expect(isStalePage(page, NOW, THRESHOLD)).toBe(true);
  });

  it("returns false for non-generating page", () => {
    const page: StalePageCandidate = {
      id: "p1", bookId: "b1", pageNumber: 0, status: "completed",
      imageGenerationStartedAtMs: STALE_TIME,
    };
    expect(isStalePage(page, NOW, THRESHOLD)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  findStaleBooks                                                     */
/* ------------------------------------------------------------------ */
describe("findStaleBooks", () => {
  it("filters and limits stale books", () => {
    const books: StaleBookCandidate[] = [
      { id: "b1", status: "generating", updatedAtMs: STALE_TIME },
      { id: "b2", status: "generating", updatedAtMs: FRESH_TIME },
      { id: "b3", status: "generating", updatedAtMs: STALE_TIME },
      { id: "b4", status: "completed", updatedAtMs: STALE_TIME },
    ];
    const config = { ...DEFAULT_STALE_CONFIG, maxBooks: 1 };
    const result = findStaleBooks(books, NOW, config);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b1");
  });

  it("returns empty for no stale books", () => {
    const books: StaleBookCandidate[] = [
      { id: "b1", status: "generating", updatedAtMs: FRESH_TIME },
    ];
    const result = findStaleBooks(books, NOW, DEFAULT_STALE_CONFIG);
    expect(result).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  findStalePages                                                     */
/* ------------------------------------------------------------------ */
describe("findStalePages", () => {
  it("filters and limits stale pages", () => {
    const pages: StalePageCandidate[] = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      bookId: "b1",
      pageNumber: i,
      status: "generating" as const,
      imageGenerationStartedAtMs: STALE_TIME,
    }));
    const config = { ...DEFAULT_STALE_CONFIG, maxPages: 3 };
    const result = findStalePages(pages, NOW, config);

    expect(result).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ */
/*  buildStalePagePatch                                                */
/* ------------------------------------------------------------------ */
describe("buildStalePagePatch", () => {
  it("returns correct patch fields", () => {
    const patch = buildStalePagePatch(NOW);

    expect(patch.status).toBe("image_failed");
    expect(patch.imageFailureReason).toBe("stale_generation_timeout");
    expect(patch.imageRetryable).toBe(true);
    expect(patch.lastStaleCleanupAtMs).toBe(NOW);
  });
});

/* ------------------------------------------------------------------ */
/*  extractBookIdFromPagePath                                          */
/* ------------------------------------------------------------------ */
describe("extractBookIdFromPagePath", () => {
  it("extracts bookId from valid page path", () => {
    expect(extractBookIdFromPagePath("books/abc123/pages/page0")).toBe("abc123");
  });

  it("returns null for invalid path", () => {
    expect(extractBookIdFromPagePath("users/u1/books/b1")).toBeNull();
  });

  it("returns null for empty path", () => {
    expect(extractBookIdFromPagePath("")).toBeNull();
  });

  it("handles book IDs with hyphens and underscores", () => {
    expect(extractBookIdFromPagePath("books/book-id_123/pages/p1")).toBe("book-id_123");
  });
});

/* ------------------------------------------------------------------ */
/*  buildCleanupRunKey                                                 */
/* ------------------------------------------------------------------ */
describe("buildCleanupRunKey", () => {
  it("generates key in JST at 03:30", () => {
    // 2026-05-07 03:30 JST = 2026-05-06 18:30 UTC
    const jst0330 = Date.UTC(2026, 4, 6, 18, 30, 0);
    expect(buildCleanupRunKey(jst0330)).toBe("daily-2026-05-07-0330");
  });

  it("pads single-digit hour and minute", () => {
    // 2026-01-05 01:05 JST = 2026-01-04 16:05 UTC
    const jst0105 = Date.UTC(2026, 0, 4, 16, 5, 0);
    expect(buildCleanupRunKey(jst0105)).toBe("daily-2026-01-05-0105");
  });

  it("handles midnight JST", () => {
    // 2026-05-07 00:00 JST = 2026-05-06 15:00 UTC
    const jstMidnight = Date.UTC(2026, 4, 6, 15, 0, 0);
    expect(buildCleanupRunKey(jstMidnight)).toBe("daily-2026-05-07-0000");
  });
});
