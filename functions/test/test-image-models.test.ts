import { describe, expect, it } from "vitest";
import { normalizeTestImageModelsRequest } from "../src/test-image-models";

describe("normalizeTestImageModelsRequest", () => {
  it("uses quality tier comparison by default", () => {
    const normalized = normalizeTestImageModelsRequest({
      prompt: "storybook prompt",
      inputImageUrls: ["https://example.com/a.png", "https://example.com/a.png"],
    });

    expect(normalized.compareByModelProfile).toBe(false);
    expect(normalized.purpose).toBe("book_page");
    expect(normalized.inputImageUrls).toEqual(["https://example.com/a.png"]);
    expect(normalized.qualityTiers).toEqual(["light", "standard", "premium"]);
    expect(normalized.modelProfiles).toEqual([
      "klein_fast",
      "klein_base",
      "pro_consistent",
    ]);
  });

  it("switches to model profile comparison when modelProfiles are supplied", () => {
    const normalized = normalizeTestImageModelsRequest({
      prompt: "storybook prompt",
      purpose: "book_cover",
      qualityTiers: ["premium"],
      modelProfiles: ["klein_base", "pro_consistent"],
    });

    expect(normalized.compareByModelProfile).toBe(true);
    expect(normalized.purpose).toBe("book_cover");
    expect(normalized.qualityTiers).toEqual(["premium"]);
    expect(normalized.modelProfiles).toEqual(["klein_base", "pro_consistent"]);
  });
});
