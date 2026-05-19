/**
 * P2-2: Tests for generation-event-logger.ts
 *
 * Coverage:
 * - categorizeError: E005, timeout, validation, quota, provider_error, unknown, empty
 * - logGenerationEvent: emits structured JSON via logger.info (no raw prompts)
 * - Event shapes: generation_started, book_outcome, book_early_failed, page_image_failed
 * - CandidateDecision: pass / blocked / not_applicable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "firebase-functions/logger";
import {
  categorizeError,
  logGenerationEvent,
  type GenerationStartedEvent,
  type BookOutcomeEvent,
  type BookEarlyFailedEvent,
  type PageImageFailedEvent,
} from "../src/lib/generation-event-logger";

vi.mock("firebase-functions/logger");

describe("categorizeError", () => {
  it("returns 'unknown' for undefined", () => {
    expect(categorizeError(undefined)).toBe("unknown");
  });

  it("returns 'unknown' for empty string", () => {
    expect(categorizeError("")).toBe("unknown");
  });

  it("classifies 'image_timeout' as timeout", () => {
    expect(categorizeError("image_timeout")).toBe("timeout");
  });

  it("classifies timeout via 'timeout' keyword", () => {
    expect(categorizeError("Connection timeout after 120000ms")).toBe("timeout");
  });

  it("classifies 'deadline exceeded' as timeout", () => {
    expect(categorizeError("deadline exceeded")).toBe("timeout");
  });

  it("classifies E005 as safety_or_policy", () => {
    expect(categorizeError("Replicate error E005: content rejected")).toBe("safety_or_policy");
  });

  it("classifies 'content policy' as safety_or_policy", () => {
    expect(categorizeError("Request blocked: content policy violation")).toBe("safety_or_policy");
  });

  it("classifies 'safety filter' as safety_or_policy", () => {
    expect(categorizeError("Image blocked by safety filter")).toBe("safety_or_policy");
  });

  it("classifies 'monthly' quota error", () => {
    expect(categorizeError("Monthly quota exceeded")).toBe("quota");
  });

  it("classifies 'rate limit' as quota", () => {
    expect(categorizeError("rate limit reached")).toBe("quota");
  });

  it("classifies 'firestore' error", () => {
    expect(categorizeError("firestore write failed")).toBe("firestore");
  });

  it("classifies 'schema' error as validation", () => {
    expect(categorizeError("schema validation failed")).toBe("validation");
  });

  it("classifies 'parse error' as validation", () => {
    expect(categorizeError("JSON parse error in response")).toBe("validation");
  });

  it("classifies 'replicate' API error as provider_error", () => {
    expect(categorizeError("replicate api error 500")).toBe("provider_error");
  });

  it("classifies 'openai' error as provider_error", () => {
    expect(categorizeError("OpenAI HTTP error 503")).toBe("provider_error");
  });

  it("classifies unrecognized error as unknown", () => {
    expect(categorizeError("some completely unexpected error")).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(categorizeError("IMAGE_TIMEOUT")).toBe("timeout");
    expect(categorizeError("E005 Content Rejected")).toBe("safety_or_policy");
  });
});

describe("logGenerationEvent", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls logger.info with label 'generation_event'", () => {
    const event: GenerationStartedEvent = {
      eventName: "generation_started",
      bookId: "book-test-001",
      userPresent: true,
      templateId: "animals",
      requestedImageModelProfile: "pro_consistent",
      resolvedImageModelProfile: "pro_consistent",
      candidateRequested: false,
      candidateAllowed: false,
      candidateDecision: "not_applicable",
    };
    logGenerationEvent(event);
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledWith("generation_event", event);
  });

  it("generation_started does not include raw userId field", () => {
    const event: GenerationStartedEvent = {
      eventName: "generation_started",
      bookId: "book-001",
      userPresent: true,
      templateId: "fantasy",
      requestedImageModelProfile: "openai_image_candidate",
      resolvedImageModelProfile: undefined,
      candidateRequested: true,
      candidateAllowed: false,
      candidateDecision: "blocked",
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, GenerationStartedEvent];
    expect(emitted).not.toHaveProperty("userId");
    expect(emitted).not.toHaveProperty("prompt");
    expect(emitted).not.toHaveProperty("storyText");
    expect(emitted.candidateDecision).toBe("blocked");
    expect(emitted.userPresent).toBe(true);
  });

  it("generation_started with candidate 'pass' decision", () => {
    const event: GenerationStartedEvent = {
      eventName: "generation_started",
      bookId: "book-002",
      userPresent: true,
      requestedImageModelProfile: "openai_image_candidate",
      resolvedImageModelProfile: "openai_image_candidate",
      candidateRequested: true,
      candidateAllowed: true,
      candidateDecision: "pass",
    };
    logGenerationEvent(event);
    const [label, emitted] = infoSpy.mock.calls[0] as [string, GenerationStartedEvent];
    expect(label).toBe("generation_event");
    expect(emitted.candidateDecision).toBe("pass");
    expect(emitted.candidateAllowed).toBe(true);
  });

  it("book_outcome does not include raw prompts or child names", () => {
    const event: BookOutcomeEvent = {
      eventName: "book_outcome",
      bookId: "book-003",
      userPresent: true,
      templateId: "bedtime",
      creationMode: "guided_ai",
      resolvedImageModelProfile: "pro_consistent",
      bookStatus: "completed",
      totalPages: 4,
      completedPages: 4,
      failedPages: 0,
      fallbackPages: 0,
      timedOutPages: 0,
      durationMs: 45000,
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, BookOutcomeEvent];
    expect(emitted).not.toHaveProperty("prompt");
    expect(emitted).not.toHaveProperty("childName");
    expect(emitted).not.toHaveProperty("storyText");
    expect(emitted.bookStatus).toBe("completed");
    expect(emitted.totalPages).toBe(4);
  });

  it("book_outcome partial_completed carries correct page counts", () => {
    const event: BookOutcomeEvent = {
      eventName: "book_outcome",
      bookId: "book-004",
      userPresent: true,
      templateId: "adventure",
      creationMode: "guided_ai",
      resolvedImageModelProfile: "pro_consistent",
      bookStatus: "partial_completed",
      totalPages: 4,
      completedPages: 3,
      failedPages: 1,
      fallbackPages: 1,
      timedOutPages: 0,
      durationMs: 130000,
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, BookOutcomeEvent];
    expect(emitted.bookStatus).toBe("partial_completed");
    expect(emitted.failedPages).toBe(1);
    expect(emitted.fallbackPages).toBe(1);
  });

  it("book_early_failed emits failure metadata without raw error message", () => {
    const event: BookEarlyFailedEvent = {
      eventName: "book_early_failed",
      bookId: "book-005",
      userPresent: true,
      templateId: "emotional-growth",
      creationMode: "guided_ai",
      failureStage: "story_generation",
      failureProvider: "gemini",
      errorCategory: "provider_error",
      retryable: true,
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, BookEarlyFailedEvent];
    expect(emitted.eventName).toBe("book_early_failed");
    expect(emitted.errorCategory).toBe("provider_error");
    expect(emitted.failureStage).toBe("story_generation");
    expect(emitted).not.toHaveProperty("technicalErrorMessage");
    expect(emitted).not.toHaveProperty("userId");
  });

  it("page_image_failed classifies E005 correctly", () => {
    const event: PageImageFailedEvent = {
      eventName: "page_image_failed",
      bookId: "book-006",
      pageIndex: 2,
      imageModelProfile: "pro_consistent",
      attemptCount: 4,
      timeoutCount: 0,
      durationMs: 90000,
      failureReason: "Replicate error E005: content rejected",
      errorCategory: categorizeError("Replicate error E005: content rejected"),
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, PageImageFailedEvent];
    expect(emitted.errorCategory).toBe("safety_or_policy");
    expect(emitted).not.toHaveProperty("prompt");
  });

  it("page_image_failed classifies timeout correctly", () => {
    const event: PageImageFailedEvent = {
      eventName: "page_image_failed",
      bookId: "book-007",
      pageIndex: 0,
      imageModelProfile: "klein_fast",
      attemptCount: 2,
      timeoutCount: 2,
      durationMs: 240000,
      failureReason: "image_timeout",
      errorCategory: categorizeError("image_timeout"),
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, PageImageFailedEvent];
    expect(emitted.errorCategory).toBe("timeout");
    expect(emitted.timeoutCount).toBe(2);
  });

  it("page_image_failed uses 'unknown' for unrecognized reason", () => {
    const event: PageImageFailedEvent = {
      eventName: "page_image_failed",
      bookId: "book-008",
      pageIndex: 1,
      imageModelProfile: "pro_consistent",
      attemptCount: 2,
      timeoutCount: 0,
      durationMs: 30000,
      failureReason: "some mysterious error from the ether",
      errorCategory: categorizeError("some mysterious error from the ether"),
    };
    logGenerationEvent(event);
    const [, emitted] = infoSpy.mock.calls[0] as [string, PageImageFailedEvent];
    expect(emitted.errorCategory).toBe("unknown");
  });
});
