import { describe, expect, it } from "vitest";
import { buildReplicateInput, resolveReplicateModel } from "../src/lib/replicate";

describe("resolveReplicateModel", () => {
  it("uses flux-2-klein-9b for light book pages and covers", () => {
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
    expect(resolveReplicateModel({ purpose: "book_cover", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
  });

  it("uses flux-2-klein-9b for standard book pages by default", () => {
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "standard" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
  });

  it("uses flux-2-pro for premium book pages and covers", () => {
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
    expect(resolveReplicateModel({ purpose: "book_cover", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });

  it("keeps child avatar generation on flux-2-pro regardless of requested profile", () => {
    expect(resolveReplicateModel({ purpose: "child_avatar", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
    expect(
      resolveReplicateModel({
        purpose: "child_avatar_revision",
        imageQualityTier: "premium",
        imageModelProfile: "klein_base",
      })
    ).toBe("black-forest-labs/flux-2-pro");
  });

  it("prefers explicit imageModelProfile when provided", () => {
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageQualityTier: "light",
        imageModelProfile: "klein_base",
      })
    ).toBe("black-forest-labs/flux-2-klein-9b-base");
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageQualityTier: "light",
        imageModelProfile: "pro_consistent",
      })
    ).toBe("black-forest-labs/flux-2-pro");
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageQualityTier: "light",
        imageModelProfile: "kontext_reference",
      })
    ).toBe("black-forest-labs/flux-kontext-pro");
  });
});

describe("buildReplicateInput", () => {
  it("keeps the legacy schnell input shape available for emergency fallback only", () => {
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

  it("builds klein fast input with images, megapixels, and go_fast", () => {
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
      megapixels: "1",
      go_fast: true,
      images: [
        "https://example.com/1.png",
        "https://example.com/2.png",
        "https://example.com/3.png",
        "https://example.com/4.png",
        "https://example.com/5.png",
      ],
    });
  });

  it("builds klein base input with images", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-2-klein-9b-base",
        prompt: "test prompt",
        inputImageUrls: ["https://example.com/1.png"],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      megapixels: "1",
      go_fast: true,
      images: ["https://example.com/1.png"],
    });
  });

  it("builds pro input with input_images and caps them at 8", () => {
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
          "https://example.com/6.png",
          "https://example.com/7.png",
          "https://example.com/8.png",
          "https://example.com/9.png",
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
        "https://example.com/5.png",
        "https://example.com/6.png",
        "https://example.com/7.png",
        "https://example.com/8.png",
      ],
    });
  });

  it("builds kontext input with a single input_image", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-kontext-pro",
        prompt: "test prompt",
        inputImageUrls: ["https://example.com/1.png", "https://example.com/2.png"],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      input_image: "https://example.com/1.png",
    });
  });
});
