import { describe, it, expect } from "vitest";
import {
  buildQualityReviewPayload,
  buildQualitySummaryPayload,
  type QualityReviewForm,
  QUALITY_RUBRIC_VERSION,
} from "@/lib/quality-review";
import type { Timestamp } from "@/lib/types";

describe("quality-review payloads", () => {
  const baseForm: QualityReviewForm = {
    storyScore: "4",
    illustrationScore: "3",
    characterConsistencyScore: "5",
    personalizationScore: "4",
    safetyScore: "5",
    status: "reviewed",
    reviewReason: "  Good overall  ",
    flaggedIssues: "issue 1\nissue 2\n",
    recommendedFixes: "fix 1",
  };

  const serverTimestamp = { seconds: 100, nanoseconds: 0 } as Timestamp;
  const now = 100000;

  describe("buildQualityReviewPayload", () => {
    it("builds the correct payload object", () => {
      const payload = buildQualityReviewPayload({
        form: baseForm,
        bookId: "book-1",
        reviewerId: "reviewer-1",
        now,
        serverTimestamp,
      });

      expect(payload.bookId).toBe("book-1");
      expect(payload.reviewerType).toBe("human");
      expect(payload.reviewerId).toBe("reviewer-1");
      expect(payload.storyScore).toBe(4);
      expect(payload.illustrationScore).toBe(3);
      expect(payload.characterConsistencyScore).toBe(5);
      expect(payload.personalizationScore).toBe(4);
      expect(payload.safetyScore).toBe(5);
      expect(payload.overallScore).toBe(4.2); // (4+3+5+4+5)/5 = 21/5 = 4.2
      expect(payload.status).toBe("reviewed");
      expect(payload.reviewReason).toBe("Good overall"); // checks trim
      expect(payload.flaggedIssues).toEqual(["issue 1", "issue 2"]);
      expect(payload.recommendedFixes).toEqual(["fix 1"]);
      expect(payload.rubricVersion).toBe(QUALITY_RUBRIC_VERSION);
      expect(payload.createdAt).toBe(serverTimestamp);
      expect(payload.createdAtMs).toBe(now);
      expect(payload.updatedAt).toBe(serverTimestamp);
      expect(payload.updatedAtMs).toBe(now);
    });
  });

  describe("buildQualitySummaryPayload", () => {
    it("builds the correct summary payload object", () => {
      const payload = buildQualitySummaryPayload({
        reviewId: "review-1",
        form: baseForm,
        now,
        serverTimestamp,
      });

      expect(payload.latestQualityReviewId).toBe("review-1");
      expect(payload.qualityReviewStatus).toBe("reviewed");
      expect(payload.storyQualityScore).toBe(4);
      expect(payload.illustrationQualityScore).toBe(3);
      expect(payload.characterConsistencyScore).toBe(5);
      expect(payload.personalizationScore).toBe(4);
      expect(payload.safetyScore).toBe(5);
      expect(payload.overallQualityScore).toBe(4.2);
      expect(payload.qualityReviewedAt).toBe(serverTimestamp);
      expect(payload.qualityReviewedAtMs).toBe(now);
      expect(payload.qualityReviewerType).toBe("human");
    });
  });
});
