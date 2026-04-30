import { afterEach, describe, expect, it } from "vitest";
import { buildReplicateInput, resolveReplicateModel } from "../src/lib/replicate";

describe("resolveReplicateModel", () => {
  const originalFlag = process.env.ENABLE_FLUX_KLEIN;

  afterEach(() => {
    process.env.ENABLE_FLUX_KLEIN = originalFlag;
  });

  it("keeps cover and avatar generation on flux-2-pro", () => {
    expect(resolveReplicateModel({ purpose: "book_cover", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
    expect(resolveReplicateModel({ purpose: "child_avatar_revision", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });

  it("falls back to flux-schnell for standard book pages when ENABLE_FLUX_KLEIN is false", () => {
    process.env.ENABLE_FLUX_KLEIN = "false";
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "standard" })).toBe(
      "black-forest-labs/flux-schnell"
    );
  });

  it("uses flux-2-klein-9b for standard book pages when ENABLE_FLUX_KLEIN is true", () => {
    process.env.ENABLE_FLUX_KLEIN = "true";
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "standard" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
  });

  it("uses flux-2-pro for premium book pages", () => {
    process.env.ENABLE_FLUX_KLEIN = "false";
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });

  it("builds schnell input without reference images and with num_outputs", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-schnell",
        prompt: "test prompt",
        inputImageUrls: ["https://example.com/a.png"],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      num_outputs: 1,
    });
  });

  it("builds klein input with images and without input_images", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-2-klein-9b",
        prompt: "test prompt",
        inputImageUrls: [
          "https://example.com/1.png",
          "https://example.com/2.png",
          "https://example.com/3.png",
          "https://example.com/4.png",
          "https://example.com/5.png",
          "https://example.com/6.png",
        ],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      images: [
        "https://example.com/1.png",
        "https://example.com/2.png",
        "https://example.com/3.png",
        "https://example.com/4.png",
        "https://example.com/5.png",
      ],
    });
  });

  it("builds pro input with input_images and caps them at 4", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-2-pro",
        prompt: "test prompt",
        inputImageUrls: [
          "https://example.com/1.png",
          "https://example.com/2.png",
          "https://example.com/3.png",
          "https://example.com/4.png",
          "https://example.com/5.png",
        ],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      input_images: [
        "https://example.com/1.png",
        "https://example.com/2.png",
        "https://example.com/3.png",
        "https://example.com/4.png",
      ],
    });
  });
});
