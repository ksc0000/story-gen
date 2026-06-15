import { describe, it, expect } from "vitest";
import { computeProviderCostMetrics, getEstimatedImageCost, getProviderId } from "../lib/admin-cost-metrics";
import type { BookDoc, PageDoc } from "../lib/types";

describe("admin-cost-metrics", () => {
  const mockPage = (overrides: Partial<PageDoc>): PageDoc => ({
    pageNumber: 0,
    text: "test",
    imageUrl: "http://example.com/image.png",
    imagePrompt: "test prompt",
    status: "completed",
    ...overrides,
  });

  const mockBook = (id: string, overrides: Partial<BookDoc>): BookDoc & { id: string } => ({
    id,
    userId: "user1",
    title: "test book",
    theme: "animals",
    style: "soft_watercolor",
    pageCount: 4,
    status: "completed",
    progress: 100,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as BookDoc["createdAt"],
    input: { childName: "test" },
    ...overrides,
  });

  describe("getEstimatedImageCost", () => {
    it("should return cost based on imageModel", () => {
      expect(getEstimatedImageCost(mockPage({ imageModel: "black-forest-labs/flux-2-pro" }))).toBe(0.05);
      expect(getEstimatedImageCost(mockPage({ imageModel: "openai/gpt-image-1-mini" }))).toBe(0.011);
    });

    it("should return cost based on imageModelProfile", () => {
      expect(getEstimatedImageCost(mockPage({ imageModelProfile: "pro_consistent" }))).toBe(0.05);
      expect(getEstimatedImageCost(mockPage({ imageModelProfile: "klein_fast" }))).toBe(0.025);
      expect(getEstimatedImageCost(mockPage({ imageModelProfile: "openai_mini" }))).toBe(0.011);
    });

    it("should fallback to quality tier if model/profile is missing", () => {
      expect(getEstimatedImageCost(mockPage({ imageQualityTier: "premium" }))).toBe(0.05);
      expect(getEstimatedImageCost(mockPage({ imageQualityTier: "standard" }))).toBe(0.025);
    });
  });

  describe("getProviderId", () => {
    it("should identify openai", () => {
      expect(getProviderId(mockPage({ imageModel: "openai/gpt-4o" }))).toBe("openai");
      expect(getProviderId(mockPage({ imageModelProfile: "openai_mini" }))).toBe("openai");
      expect(getProviderId(mockPage({ imageModelProfile: "openai_image_candidate" as PageDoc["imageModelProfile"] }))).toBe("openai");
    });

    it("should identify replicate", () => {
      expect(getProviderId(mockPage({ imageModel: "black-forest-labs/flux-2-pro" }))).toBe("replicate");
      expect(getProviderId(mockPage({ replicateModel: "black-forest-labs/flux-2-pro" }))).toBe("replicate");
      expect(getProviderId(mockPage({ imageModelProfile: "pro_consistent" }))).toBe("replicate");
    });
  });

  describe("computeProviderCostMetrics", () => {
    it("should aggregate costs across books and pages", () => {
      const books = [
        mockBook("book1", { status: "completed", hasCoverPage: true, coverStatus: "completed", coverImageModelProfile: "pro_consistent" }),
        mockBook("book2", { status: "completed" }),
      ];
      const pagesMap = new Map();
      pagesMap.set("book1", [
        mockPage({ imageModel: "black-forest-labs/flux-2-pro" }), // 0.05
        mockPage({ imageModel: "black-forest-labs/flux-2-pro" }), // 0.05
      ]);
      pagesMap.set("book2", [
        mockPage({ imageModel: "openai/gpt-image-1-mini" }), // 0.011
      ]);

      const metrics = computeProviderCostMetrics(books, pagesMap);

      // Book 1: 2 pages ($0.10) + 1 cover ($0.05) = $0.15
      // Book 2: 1 page ($0.011) = $0.011
      // Total: $0.161
      expect(metrics.totalCostUsd).toBeCloseTo(0.161);
      expect(metrics.totalImages).toBe(4);
      expect(metrics.totalBooks).toBe(2);
      expect(metrics.avgCostPerBook).toBeCloseTo(0.0805);

      expect(metrics.providers.replicate.costUsd).toBeCloseTo(0.15);
      expect(metrics.providers.openai.costUsd).toBeCloseTo(0.011);

      expect(metrics.providers.replicate.models["black-forest-labs/flux-2-pro"].imageCount).toBe(2);
      expect(metrics.providers.replicate.models["pro_consistent"].imageCount).toBe(1); // the cover
    });
  });
});
