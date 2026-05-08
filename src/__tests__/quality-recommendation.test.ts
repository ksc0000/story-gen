import { describe, it, expect } from "vitest";
import { buildQualityRecommendations } from "@/lib/quality-review";
import type { BookDoc } from "@/lib/types";

function makeBook(overrides: Partial<BookDoc> = {}): BookDoc {
  return {
    title: "test",
    userId: "u1",
    childId: "c1",
    status: "completed",
    totalPages: 5,
    createdAt: null as unknown as import("firebase/firestore").Timestamp,
    createdAtMs: Date.now(),
    ...overrides,
  } as BookDoc;
}

describe("buildQualityRecommendations", () => {
  it("Scenario G: score 未設定 → 空配列", () => {
    const book = makeBook();
    expect(buildQualityRecommendations(book)).toEqual([]);
  });

  it("Scenario G: overallQualityScore が undefined → 空配列", () => {
    const book = makeBook({ overallQualityScore: undefined });
    expect(buildQualityRecommendations(book)).toEqual([]);
  });

  it("Scenario A: storyQualityScore <= 2 → rewrite_story / high", () => {
    const book = makeBook({
      overallQualityScore: 3.2,
      storyQualityScore: 2,
      illustrationQualityScore: 4,
      characterConsistencyScore: 4,
      personalizationScore: 4,
      safetyScore: 4,
    });
    const recs = buildQualityRecommendations(book);
    const found = recs.find((r) => r.action === "rewrite_story");
    expect(found).toBeDefined();
    expect(found!.severity).toBe("high");
  });

  it("Scenario B: illustrationQualityScore <= 2 → regenerate_images / high", () => {
    const book = makeBook({
      overallQualityScore: 3.2,
      storyQualityScore: 4,
      illustrationQualityScore: 2,
      characterConsistencyScore: 4,
      personalizationScore: 4,
      safetyScore: 4,
    });
    const recs = buildQualityRecommendations(book);
    const found = recs.find((r) => r.action === "regenerate_images");
    expect(found).toBeDefined();
    expect(found!.severity).toBe("high");
  });

  it("Scenario C: characterConsistencyScore <= 2 → fix_character_consistency / high", () => {
    const book = makeBook({
      overallQualityScore: 3.2,
      storyQualityScore: 4,
      illustrationQualityScore: 4,
      characterConsistencyScore: 2,
      personalizationScore: 4,
      safetyScore: 4,
    });
    const recs = buildQualityRecommendations(book);
    const found = recs.find((r) => r.action === "fix_character_consistency");
    expect(found).toBeDefined();
    expect(found!.severity).toBe("high");
  });

  it("Scenario D: personalizationScore <= 2 → improve_personalization / medium", () => {
    const book = makeBook({
      overallQualityScore: 3.2,
      storyQualityScore: 4,
      illustrationQualityScore: 4,
      characterConsistencyScore: 4,
      personalizationScore: 2,
      safetyScore: 4,
    });
    const recs = buildQualityRecommendations(book);
    const found = recs.find((r) => r.action === "improve_personalization");
    expect(found).toBeDefined();
    expect(found!.severity).toBe("medium");
  });

  it("Scenario E: safetyScore <= 2 → human_review_required / high", () => {
    const book = makeBook({
      overallQualityScore: 3.2,
      storyQualityScore: 4,
      illustrationQualityScore: 4,
      characterConsistencyScore: 4,
      personalizationScore: 4,
      safetyScore: 2,
    });
    const recs = buildQualityRecommendations(book);
    const found = recs.find((r) => r.action === "human_review_required");
    expect(found).toBeDefined();
    expect(found!.severity).toBe("high");
  });

  it("Scenario F: overallQualityScore >= 4.2 && approved → approve / low", () => {
    const book = makeBook({
      overallQualityScore: 4.4,
      storyQualityScore: 5,
      illustrationQualityScore: 4,
      characterConsistencyScore: 4,
      personalizationScore: 5,
      safetyScore: 4,
      qualityReviewStatus: "approved",
    });
    const recs = buildQualityRecommendations(book);
    const found = recs.find((r) => r.action === "approve");
    expect(found).toBeDefined();
    expect(found!.severity).toBe("low");
  });

  it("複数条件該当 → 複数 recommendation", () => {
    const book = makeBook({
      overallQualityScore: 1.6,
      storyQualityScore: 1,
      illustrationQualityScore: 2,
      characterConsistencyScore: 1,
      personalizationScore: 2,
      safetyScore: 2,
    });
    const recs = buildQualityRecommendations(book);
    expect(recs.length).toBe(5);
    expect(recs.map((r) => r.action)).toContain("human_review_required");
    expect(recs.map((r) => r.action)).toContain("rewrite_story");
    expect(recs.map((r) => r.action)).toContain("regenerate_images");
    expect(recs.map((r) => r.action)).toContain("fix_character_consistency");
    expect(recs.map((r) => r.action)).toContain("improve_personalization");
  });

  it("全 score 高 + reviewed (not approved) → approve は出ない", () => {
    const book = makeBook({
      overallQualityScore: 4.6,
      storyQualityScore: 5,
      illustrationQualityScore: 5,
      characterConsistencyScore: 4,
      personalizationScore: 5,
      safetyScore: 4,
      qualityReviewStatus: "reviewed",
    });
    const recs = buildQualityRecommendations(book);
    expect(recs.find((r) => r.action === "approve")).toBeUndefined();
  });

  it("score = 3 (境界) → recommendation 出ない", () => {
    const book = makeBook({
      overallQualityScore: 3.0,
      storyQualityScore: 3,
      illustrationQualityScore: 3,
      characterConsistencyScore: 3,
      personalizationScore: 3,
      safetyScore: 3,
    });
    const recs = buildQualityRecommendations(book);
    expect(recs).toEqual([]);
  });
});
