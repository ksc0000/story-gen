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
  buildQualityRecommendations,
  getPageHighlightLevel,
  getSectionHighlights,
  buildTaskDraft,
  buildQualityTaskPayload,
  QUALITY_RUBRIC_VERSION,
  QualityReviewForm,
} from "./quality-review";
import type { BookDoc, PageDoc, Timestamp } from "./types";

describe("quality-review pure functions", () => {
  describe("normalizeQualityReviewForm", () => {
    it("should return the expected default structure", () => {
      const result = normalizeQualityReviewForm();
      expect(result).toEqual({
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

  describe("parseQualityScore", () => {
    it("should parse valid numbers 1-5", () => {
      expect(parseQualityScore("1")).toBe(1);
      expect(parseQualityScore("3")).toBe(3);
      expect(parseQualityScore("5")).toBe(5);
    });

    it("should return null for invalid inputs", () => {
      expect(parseQualityScore("0")).toBeNull();
      expect(parseQualityScore("6")).toBeNull();
      expect(parseQualityScore("1.5")).toBeNull();
      expect(parseQualityScore("abc")).toBeNull();
      expect(parseQualityScore("")).toBeNull();
    });
  });

  describe("calculateOverallQualityScore", () => {
    it("should correctly calculate average score and round it", () => {
      const scores = {
        storyScore: 4 as const,
        illustrationScore: 3 as const,
        characterConsistencyScore: 5 as const,
        personalizationScore: 4 as const,
        safetyScore: 5 as const,
      };
      // (4+3+5+4+5)/5 = 21/5 = 4.2
      expect(calculateOverallQualityScore(scores)).toBe(4.2);
    });

    it("should correctly round to 1 decimal place", () => {
      const scores = {
        storyScore: 3 as const,
        illustrationScore: 3 as const,
        characterConsistencyScore: 3 as const,
        personalizationScore: 3 as const,
        safetyScore: 4 as const,
      };
      // (3+3+3+3+4)/5 = 16/5 = 3.2
      expect(calculateOverallQualityScore(scores)).toBe(3.2);

      const scores2 = {
        storyScore: 3 as const,
        illustrationScore: 3 as const,
        characterConsistencyScore: 3 as const,
        personalizationScore: 4 as const,
        safetyScore: 4 as const,
      };
      // 17/5 = 3.4
      expect(calculateOverallQualityScore(scores2)).toBe(3.4);
    });
  });

  describe("splitTextareaLines", () => {
    it("should correctly split and trim lines", () => {
      const text = "  line 1  \n\nline 2\r\n  \nline 3";
      expect(splitTextareaLines(text)).toEqual(["line 1", "line 2", "line 3"]);
    });

    it("should return empty array for empty string", () => {
      expect(splitTextareaLines("")).toEqual([]);
      expect(splitTextareaLines("   \n  ")).toEqual([]);
    });
  });

  describe("formatQualityScore", () => {
    it("should return string representation of number", () => {
      expect(formatQualityScore(4.5)).toBe("4.5");
      expect(formatQualityScore(0)).toBe("0");
    });

    it("should return fallback for undefined or null", () => {
      expect(formatQualityScore(undefined)).toBe("—");
      // @ts-ignore
      expect(formatQualityScore(null)).toBe("—");
    });
  });

  describe("getQualityReviewStatusLabel", () => {
    it("should return correct label", () => {
      expect(getQualityReviewStatusLabel("reviewed")).toBe("Reviewed");
      expect(getQualityReviewStatusLabel("needs_fix")).toBe("Needs fix");
      expect(getQualityReviewStatusLabel("approved")).toBe("Approved");
      expect(getQualityReviewStatusLabel("not_reviewed")).toBe("Not reviewed");
      expect(getQualityReviewStatusLabel(undefined)).toBe("Not reviewed");
    });
  });

  describe("getQualityReviewStatusBadgeClass", () => {
    it("should return correct class", () => {
      expect(getQualityReviewStatusBadgeClass("approved")).toBe("bg-emerald-100 text-emerald-800");
      expect(getQualityReviewStatusBadgeClass("reviewed")).toBe("bg-blue-100 text-blue-800");
      expect(getQualityReviewStatusBadgeClass("needs_fix")).toBe("bg-rose-100 text-rose-800");
      expect(getQualityReviewStatusBadgeClass("not_reviewed")).toBe("bg-gray-100 text-gray-600");
      expect(getQualityReviewStatusBadgeClass(undefined)).toBe("bg-gray-100 text-gray-600");
    });
  });

  describe("validateQualityReviewForm", () => {
    const validForm: QualityReviewForm = {
      storyScore: "4",
      illustrationScore: "3",
      characterConsistencyScore: "5",
      personalizationScore: "4",
      safetyScore: "5",
      status: "reviewed",
      reviewReason: "Looks good",
      flaggedIssues: "",
      recommendedFixes: "",
    };

    it("should return null for valid form", () => {
      expect(validateQualityReviewForm(validForm)).toBeNull();
    });

    it("should return error if a score is missing", () => {
      expect(validateQualityReviewForm({ ...validForm, storyScore: "" })).toBe("Story Score を入力してください");
    });

    it("should return error if a score is invalid", () => {
      expect(validateQualityReviewForm({ ...validForm, illustrationScore: "6" })).toBe(
        "Illustration Score は 1〜5 の整数で入力してください"
      );
      expect(validateQualityReviewForm({ ...validForm, safetyScore: "abc" })).toBe(
        "Safety Score は 1〜5 の整数で入力してください"
      );
    });

    it("should return error if review reason is too long", () => {
      const longReason = "a".repeat(1001);
      expect(validateQualityReviewForm({ ...validForm, reviewReason: longReason })).toBe(
        "Review Reason は 1000 文字以内にしてください"
      );
    });
  });

  describe("buildQualityReviewPayload", () => {
    it("should correctly map inputs to output payload", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "3",
        characterConsistencyScore: "5",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "  Good job  ",
        flaggedIssues: "issue 1\nissue 2",
        recommendedFixes: "fix 1",
      };
      const serverTimestamp = {} as Timestamp;
      const now = 123456789;

      const payload = buildQualityReviewPayload({
        form,
        bookId: "book-123",
        reviewerId: "reviewer-1",
        now,
        serverTimestamp,
      });

      expect(payload).toEqual({
        bookId: "book-123",
        reviewerType: "human",
        reviewerId: "reviewer-1",
        storyScore: 4,
        illustrationScore: 3,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
        overallScore: 4.2,
        status: "reviewed",
        reviewReason: "Good job",
        flaggedIssues: ["issue 1", "issue 2"],
        recommendedFixes: ["fix 1"],
        rubricVersion: QUALITY_RUBRIC_VERSION,
        createdAt: serverTimestamp,
        createdAtMs: now,
        updatedAt: serverTimestamp,
        updatedAtMs: now,
      });
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("should correctly map inputs to summary payload", () => {
      const form: QualityReviewForm = {
        storyScore: "4",
        illustrationScore: "3",
        characterConsistencyScore: "5",
        personalizationScore: "4",
        safetyScore: "5",
        status: "reviewed",
        reviewReason: "",
        flaggedIssues: "",
        recommendedFixes: "",
      };
      const serverTimestamp = {} as Timestamp;
      const now = 123456789;

      const payload = buildQualitySummaryPayload({
        reviewId: "review-123",
        form,
        now,
        serverTimestamp,
      });

      expect(payload).toEqual({
        latestQualityReviewId: "review-123",
        qualityReviewStatus: "reviewed",
        storyQualityScore: 4,
        illustrationQualityScore: 3,
        characterConsistencyScore: 5,
        personalizationScore: 4,
        safetyScore: 5,
        overallQualityScore: 4.2,
        qualityReviewedAt: serverTimestamp,
        qualityReviewedAtMs: now,
        qualityReviewerType: "human",
      });
    });
  });

  describe("buildQualityRecommendations", () => {
    it("should return empty array if overallQualityScore is missing", () => {
      const book = {} as BookDoc;
      expect(buildQualityRecommendations(book)).toEqual([]);
    });

    it("should return recommendations for low scores", () => {
      const book = {
        overallQualityScore: 2.0,
        safetyScore: 2,
        storyQualityScore: 2,
        illustrationQualityScore: 2,
        characterConsistencyScore: 2,
        personalizationScore: 2,
      } as BookDoc;

      const recs = buildQualityRecommendations(book);
      expect(recs).toHaveLength(5);
      expect(recs.map((r) => r.action)).toEqual([
        "human_review_required",
        "rewrite_story",
        "regenerate_images",
        "fix_character_consistency",
        "improve_personalization",
      ]);
    });

    it("should return approve recommendation for high score and approved status", () => {
      const book = {
        overallQualityScore: 4.5,
        qualityReviewStatus: "approved",
      } as BookDoc;

      const recs = buildQualityRecommendations(book);
      expect(recs).toHaveLength(1);
      expect(recs[0].action).toBe("approve");
    });
  });

  describe("getPageHighlightLevel", () => {
    const defaultPage = {} as PageDoc;

    it("should return none if intent is null", () => {
      expect(getPageHighlightLevel(null, defaultPage)).toBe("none");
    });

    it("should return strong for review_image_regeneration on failed page", () => {
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, status: "image_failed" })).toBe(
        "strong"
      );
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, imageDurationMs: 150000 })).toBe(
        "strong"
      );
      expect(getPageHighlightLevel("review_image_regeneration", { ...defaultPage, status: "completed" })).toBe("subtle");
    });

    it("should return strong for review_character_consistency on pages with characters", () => {
      expect(
        getPageHighlightLevel("review_character_consistency", { ...defaultPage, appearingCharacterIds: ["char-1"] })
      ).toBe("strong");
      expect(getPageHighlightLevel("review_character_consistency", { ...defaultPage })).toBe("subtle");
    });

    it("should return subtle for prepare_story_rewrite and require_human_safety_review", () => {
      expect(getPageHighlightLevel("prepare_story_rewrite", defaultPage)).toBe("subtle");
      expect(getPageHighlightLevel("require_human_safety_review", defaultPage)).toBe("subtle");
    });

    it("should return none for other intents", () => {
      expect(getPageHighlightLevel("confirm_approval", defaultPage)).toBe("none");
    });
  });

  describe("getSectionHighlights", () => {
    it("should return all false if intent is null or confirm_approval", () => {
      const expectedNone = {
        bookDetail: false,
        inputAndProfile: false,
        storyText: false,
        pages: false,
      };
      expect(getSectionHighlights(null)).toEqual(expectedNone);
      expect(getSectionHighlights("confirm_approval")).toEqual(expectedNone);
    });

    it("should highlight correctly based on intent", () => {
      expect(getSectionHighlights("review_image_regeneration").pages).toBe(true);
      expect(getSectionHighlights("review_character_consistency").pages).toBe(true);
      expect(getSectionHighlights("prepare_story_rewrite").storyText).toBe(true);
      expect(getSectionHighlights("prepare_story_rewrite").bookDetail).toBe(true);
      expect(getSectionHighlights("review_personalization_inputs").inputAndProfile).toBe(true);
      expect(getSectionHighlights("require_human_safety_review").storyText).toBe(true);
      expect(getSectionHighlights("require_human_safety_review").pages).toBe(true);
    });
  });

  describe("buildTaskDraft", () => {
    const mockBook = { id: "book-1" } as BookDoc & { id: string };
    const mockPages: PageDoc[] = [];

    it("should build task draft for prepare_story_rewrite", () => {
      const draft = buildTaskDraft("prepare_story_rewrite", mockBook, mockPages);
      expect(draft.title).toBe("Story Rewrite 確認タスク");
      expect(draft.intent).toBe("prepare_story_rewrite");
      expect(draft.checklist.length).toBeGreaterThan(0);
    });

    it("should build task draft for review_image_regeneration", () => {
      const draft = buildTaskDraft("review_image_regeneration", mockBook, mockPages);
      expect(draft.title).toBe("画像再生成 確認タスク");
    });

    it("should build task draft for review_character_consistency", () => {
      const draft = buildTaskDraft("review_character_consistency", mockBook, mockPages);
      expect(draft.title).toBe("キャラクター一貫性 確認タスク");
    });

    it("should build task draft for review_personalization_inputs", () => {
      const draft = buildTaskDraft("review_personalization_inputs", mockBook, mockPages);
      expect(draft.title).toBe("パーソナライズ 確認タスク");
    });

    it("should build task draft for require_human_safety_review", () => {
      const draft = buildTaskDraft("require_human_safety_review", mockBook, mockPages);
      expect(draft.title).toBe("安全性 確認タスク");
    });

    it("should build task draft for confirm_approval", () => {
      const draft = buildTaskDraft("confirm_approval", mockBook, mockPages);
      expect(draft.title).toBe("承認済み");
      expect(draft.checklist).toHaveLength(0);
    });
  });

  describe("buildQualityTaskPayload", () => {
    it("should build payload for qualityTasks collection", () => {
      const mockBook = { id: "book-1" } as BookDoc & { id: string };
      const mockPages: PageDoc[] = [];

      const payload = buildQualityTaskPayload("prepare_story_rewrite", mockBook, mockPages, "admin-1");

      expect(payload.bookId).toBe("book-1");
      expect(payload.intent).toBe("prepare_story_rewrite");
      expect(payload.status).toBe("open");
      expect(payload.createdBy).toBe("admin-1");
      expect(payload.assignedTo).toBeNull();
      expect(payload.resolvedBy).toBeNull();
      expect(payload.checklist[0].checked).toBe(false);
      expect(payload.createdAtMs).toBeDefined();
      expect(payload.updatedAtMs).toBeDefined();
    });
  });
});
