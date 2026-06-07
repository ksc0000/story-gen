import { describe, it, expect } from "vitest";
import {
  normalizeQualityReviewForm,
  parseQualityScore,
  calculateOverallQualityScore,
  splitTextareaLines,
  formatQualityScore,
  getQualityReviewStatusLabel,
  getQualityReviewStatusBadgeClass,
  validateQualityReviewForm,
  buildQualityReviewPayload,
  buildQualitySummaryPayload,
  QUALITY_RUBRIC_VERSION,
  getPageHighlightLevel,
  getSectionHighlights,
} from "@/lib/quality-review";
import type { QualityReviewScore, Timestamp, PageDoc } from "@/lib/types";

describe("normalizeQualityReviewForm", () => {
  it("returns the correct default form structure", () => {
    expect(normalizeQualityReviewForm()).toEqual({
      storyScore: "",
      illustrationScore: "",
      characterConsistencyScore: "",
      personalizationScore: "",
      safetyScore: "",
      status: "reviewed",
      reviewReason: "",
      flaggedIssues: "",
      recommendedFixes: "",
    });
  });
});

describe("getPageHighlightLevel", () => {
  const basePage = {
    status: "completed",
    imageDurationMs: 50000,
    imageFallbackUsed: false,
    appearingCharacterIds: [],
    usedCharacterReference: false,
    focusCharacterId: undefined,
  } as unknown as PageDoc;

  it("returns 'none' if intent is null", () => {
    expect(getPageHighlightLevel(null, basePage)).toBe("none");
  });

  it("handles 'review_image_regeneration' intent", () => {
    expect(getPageHighlightLevel("review_image_regeneration", basePage)).toBe("subtle");

    const failedPage = { ...basePage, status: "image_failed" } as PageDoc;
    expect(getPageHighlightLevel("review_image_regeneration", failedPage)).toBe("strong");

    const fallbackPage = { ...basePage, status: "fallback_completed" } as PageDoc;
    expect(getPageHighlightLevel("review_image_regeneration", fallbackPage)).toBe("strong");

    const slowPage = { ...basePage, imageDurationMs: 130000 } as PageDoc;
    expect(getPageHighlightLevel("review_image_regeneration", slowPage)).toBe("strong");

    const fallbackUsedPage = { ...basePage, imageFallbackUsed: true } as PageDoc;
    expect(getPageHighlightLevel("review_image_regeneration", fallbackUsedPage)).toBe("strong");
  });

  it("handles 'review_character_consistency' intent", () => {
    expect(getPageHighlightLevel("review_character_consistency", basePage)).toBe("subtle");

    const pageWithChar = { ...basePage, appearingCharacterIds: ["char1"] } as PageDoc;
    expect(getPageHighlightLevel("review_character_consistency", pageWithChar)).toBe("strong");

    const pageWithRef = { ...basePage, usedCharacterReference: true } as PageDoc;
    expect(getPageHighlightLevel("review_character_consistency", pageWithRef)).toBe("strong");

    const pageWithFocus = { ...basePage, focusCharacterId: "char1" } as PageDoc;
    expect(getPageHighlightLevel("review_character_consistency", pageWithFocus)).toBe("strong");
  });

  it("handles other intents", () => {
    expect(getPageHighlightLevel("prepare_story_rewrite", basePage)).toBe("subtle");
    expect(getPageHighlightLevel("require_human_safety_review", basePage)).toBe("subtle");
    expect(getPageHighlightLevel("confirm_approval", basePage)).toBe("none");
  });
});

describe("getSectionHighlights", () => {
  it("returns no highlights if intent is null", () => {
    expect(getSectionHighlights(null)).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });

  it("returns correct highlights for different intents", () => {
    expect(getSectionHighlights("review_image_regeneration")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });

    expect(getSectionHighlights("review_character_consistency")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: true,
    });

    expect(getSectionHighlights("prepare_story_rewrite")).toEqual({
      bookDetail: true,
      inputAndProfile: false,
      storyText: true,
      pages: false,
    });

    expect(getSectionHighlights("review_personalization_inputs")).toEqual({
      bookDetail: true,
      inputAndProfile: true,
      storyText: false,
      pages: false,
    });

    expect(getSectionHighlights("require_human_safety_review")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: true,
      pages: true,
    });

    expect(getSectionHighlights("confirm_approval")).toEqual({
      bookDetail: false,
      inputAndProfile: false,
      storyText: false,
      pages: false,
    });
  });
});

describe("parseQualityScore", () => {
  it("parses valid scores '1' to '5' into numbers", () => {
    expect(parseQualityScore("1")).toBe(1);
    expect(parseQualityScore("2")).toBe(2);
    expect(parseQualityScore("3")).toBe(3);
    expect(parseQualityScore("4")).toBe(4);
    expect(parseQualityScore("5")).toBe(5);
  });

  it("returns null for out-of-bounds inputs", () => {
    expect(parseQualityScore("0")).toBeNull();
    expect(parseQualityScore("6")).toBeNull();
    expect(parseQualityScore("-1")).toBeNull();
  });

  it("returns null for non-integer inputs", () => {
    expect(parseQualityScore("3.5")).toBeNull();
  });

  it("returns null for non-numeric inputs", () => {
    expect(parseQualityScore("abc")).toBeNull();
    expect(parseQualityScore("")).toBeNull();
  });
});

describe("calculateOverallQualityScore", () => {
  it("calculates the exact average", () => {
    const score = calculateOverallQualityScore({
      storyScore: 5 as QualityReviewScore,
      illustrationScore: 4 as QualityReviewScore,
      characterConsistencyScore: 3 as QualityReviewScore,
      personalizationScore: 4 as QualityReviewScore,
      safetyScore: 5 as QualityReviewScore,
    });
    // sum = 21, average = 4.2
    expect(score).toBe(4.2);
  });

  it("rounds to 1 decimal point correctly", () => {
    const score = calculateOverallQualityScore({
      storyScore: 4 as QualityReviewScore,
      illustrationScore: 4 as QualityReviewScore,
      characterConsistencyScore: 4 as QualityReviewScore,
      personalizationScore: 4 as QualityReviewScore,
      safetyScore: 3 as QualityReviewScore,
    });
    // sum = 19, average = 3.8
    expect(score).toBe(3.8);

    const score2 = calculateOverallQualityScore({
      storyScore: 3 as QualityReviewScore,
      illustrationScore: 3 as QualityReviewScore,
      characterConsistencyScore: 3 as QualityReviewScore,
      personalizationScore: 3 as QualityReviewScore,
      safetyScore: 4 as QualityReviewScore,
    });
    // sum = 16, average = 3.2
    expect(score2).toBe(3.2);
  });
});

describe("splitTextareaLines", () => {
  it("splits by newline and trims lines", () => {
    const input = " line 1 \nline 2\n  line 3  ";
    expect(splitTextareaLines(input)).toEqual(["line 1", "line 2", "line 3"]);
  });

  it("removes empty lines", () => {
    const input = "line 1\n\n\nline 2\n  \nline 3";
    expect(splitTextareaLines(input)).toEqual(["line 1", "line 2", "line 3"]);
  });

  it("handles empty string", () => {
    expect(splitTextareaLines("")).toEqual([]);
    expect(splitTextareaLines("   \n  ")).toEqual([]);
  });
});

describe("formatQualityScore", () => {
  it("formats numbers as strings", () => {
    expect(formatQualityScore(5)).toBe("5");
    expect(formatQualityScore(3.5)).toBe("3.5");
    expect(formatQualityScore(0)).toBe("0");
  });

  it("returns '—' for null or undefined", () => {
    expect(formatQualityScore(undefined)).toBe("—");
    expect(formatQualityScore(null as unknown as undefined)).toBe("—");
  });
});

describe("getQualityReviewStatusLabel", () => {
  it("returns correct labels for valid statuses", () => {
    expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
    expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
    expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
    expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
  });

  it("returns 'Not reviewed' for undefined or unknown status", () => {
    expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
    expect(getQualityReviewStatusLabel("unknown_status" as any)).toBe("Not reviewed");
  });
});

describe("getQualityReviewStatusBadgeClass", () => {
  it("returns correct CSS classes for valid statuses", () => {
    expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
    expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
    expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
    expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
  });

  it("returns default CSS classes for undefined or unknown status", () => {
    expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    expect(getQualityReviewStatusBadgeClass("unknown" as any)).toBe("bg-gray-100 text-gray-600");
  });
});

describe("validateQualityReviewForm", () => {
  it("returns null for a valid form", () => {
    const validForm = normalizeQualityReviewForm();
    validForm.storyScore = "5";
    validForm.illustrationScore = "4";
    validForm.characterConsistencyScore = "3";
    validForm.personalizationScore = "2";
    validForm.safetyScore = "1";
    validForm.reviewReason = "Looks good.";

    expect(validateQualityReviewForm(validForm)).toBeNull();
  });

  it("returns an error if a score is missing", () => {
    const form = normalizeQualityReviewForm();
    form.storyScore = "5";
    form.illustrationScore = "4";
    form.characterConsistencyScore = "3";
    form.personalizationScore = ""; // missing
    form.safetyScore = "1";

    expect(validateQualityReviewForm(form)).toBe("Personalization Score を入力してください");
  });

  it("returns an error if a score is invalid", () => {
    const form = normalizeQualityReviewForm();
    form.storyScore = "5";
    form.illustrationScore = "4";
    form.characterConsistencyScore = "3";
    form.personalizationScore = "2";
    form.safetyScore = "6"; // out of bounds

    expect(validateQualityReviewForm(form)).toBe("Safety Score は 1〜5 の整数で入力してください");
  });

  it("returns an error if reviewReason exceeds 1000 characters", () => {
    const form = normalizeQualityReviewForm();
    form.storyScore = "5";
    form.illustrationScore = "4";
    form.characterConsistencyScore = "3";
    form.personalizationScore = "2";
    form.safetyScore = "1";
    form.reviewReason = "a".repeat(1001);

    expect(validateQualityReviewForm(form)).toBe("Review Reason は 1000 文字以内にしてください");
  });
});

describe("buildQualityReviewPayload", () => {
  it("builds the correct payload object", () => {
    const form = normalizeQualityReviewForm();
    form.storyScore = "5";
    form.illustrationScore = "4";
    form.characterConsistencyScore = "3";
    form.personalizationScore = "4";
    form.safetyScore = "5";
    form.status = "approved";
    form.reviewReason = " Great job! ";
    form.flaggedIssues = "issue1\nissue2";
    form.recommendedFixes = "fix1\n\nfix2";

    const mockTimestamp = { seconds: 12345, nanoseconds: 0 } as Timestamp;
    const now = 100000;

    const payload = buildQualityReviewPayload({
      form,
      bookId: "book123",
      reviewerId: "reviewer456",
      now,
      serverTimestamp: mockTimestamp,
    });

    expect(payload).toEqual({
      bookId: "book123",
      reviewerType: "human",
      reviewerId: "reviewer456",
      storyScore: 5,
      illustrationScore: 4,
      characterConsistencyScore: 3,
      personalizationScore: 4,
      safetyScore: 5,
      overallScore: 4.2, // (5+4+3+4+5)/5
      status: "approved",
      reviewReason: "Great job!",
      flaggedIssues: ["issue1", "issue2"],
      recommendedFixes: ["fix1", "fix2"],
      rubricVersion: QUALITY_RUBRIC_VERSION,
      createdAt: mockTimestamp,
      createdAtMs: now,
      updatedAt: mockTimestamp,
      updatedAtMs: now,
    });
  });
});

describe("buildQualitySummaryPayload", () => {
  it("builds the correct summary object", () => {
    const form = normalizeQualityReviewForm();
    form.storyScore = "5";
    form.illustrationScore = "4";
    form.characterConsistencyScore = "3";
    form.personalizationScore = "4";
    form.safetyScore = "5";
    form.status = "approved";

    const mockTimestamp = { seconds: 12345, nanoseconds: 0 } as Timestamp;
    const now = 100000;

    const payload = buildQualitySummaryPayload({
      reviewId: "review789",
      form,
      now,
      serverTimestamp: mockTimestamp,
    });

    expect(payload).toEqual({
      latestQualityReviewId: "review789",
      qualityReviewStatus: "approved",
      storyQualityScore: 5,
      illustrationQualityScore: 4,
      characterConsistencyScore: 3,
      personalizationScore: 4,
      safetyScore: 5,
      overallQualityScore: 4.2,
      qualityReviewedAt: mockTimestamp,
      qualityReviewedAtMs: now,
      qualityReviewerType: "human",
    });
  });
});
