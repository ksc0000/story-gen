import { describe, expect, it } from "vitest";
import {
  buildReplicateInput,
  CANDIDATE_IMAGE_PROFILES,
  ImageTimeoutError,
  isCandidateProfile,
  resolveImageFallbackProfiles,
  resolveImageModelProfile,
  resolveReplicateModel,
  withImageTimeout,
} from "../src/lib/replicate";

describe("resolveReplicateModel", () => {
  it("uses flux-2-klein-9b for light and standard pages by default", () => {
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
    expect(resolveReplicateModel({ purpose: "book_cover", imageQualityTier: "light" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "standard" })).toBe(
      "black-forest-labs/flux-2-klein-9b"
    );
  });

  it("uses flux-2-pro for premium pages", () => {
    expect(resolveReplicateModel({ purpose: "book_page", imageQualityTier: "premium" })).toBe(
      "black-forest-labs/flux-2-pro"
    );
  });

  it("prefers explicit image model profiles", () => {
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageModelProfile: "klein_base",
      })
    ).toBe("black-forest-labs/flux-2-klein-9b-base");
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageModelProfile: "pro_consistent",
      })
    ).toBe("black-forest-labs/flux-2-pro");
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageModelProfile: "kontext_reference",
      })
    ).toBe("black-forest-labs/flux-kontext-pro");
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageModelProfile: "kontext_max",
      })
    ).toBe("black-forest-labs/flux-kontext-max");
    expect(
      resolveReplicateModel({
        purpose: "book_page",
        imageModelProfile: "flux11_pro_candidate",
      })
    ).toBe("black-forest-labs/flux-1.1-pro");
  });

  it("keeps child avatar generation on flux-2-pro regardless of requested profile", () => {
    expect(
      resolveReplicateModel({
        purpose: "child_avatar",
        imageQualityTier: "light",
        imageModelProfile: "klein_base",
      })
    ).toBe("black-forest-labs/flux-2-pro");
  });
});

describe("resolveImageModelProfile", () => {
  it("derives default profiles from quality tier", () => {
    expect(resolveImageModelProfile({ imageQualityTier: "light" })).toBe("klein_fast");
    expect(resolveImageModelProfile({ imageQualityTier: "standard" })).toBe("klein_fast");
    expect(resolveImageModelProfile({ imageQualityTier: "premium" })).toBe("pro_consistent");
  });
});

describe("resolveImageFallbackProfiles", () => {
  it("returns pro_consistent then klein_fast for pro_consistent", () => {
    expect(resolveImageFallbackProfiles("pro_consistent")).toEqual(["pro_consistent", "klein_fast"]);
  });

  it("returns klein_base then klein_fast for klein_base", () => {
    expect(resolveImageFallbackProfiles("klein_base")).toEqual(["klein_base", "klein_fast"]);
  });

  it("returns kontext_reference then klein_fast for kontext_reference", () => {
    expect(resolveImageFallbackProfiles("kontext_reference")).toEqual(["kontext_reference", "klein_fast"]);
  });

  it("returns kontext_max then klein_fast for kontext_max", () => {
    expect(resolveImageFallbackProfiles("kontext_max")).toEqual(["kontext_max", "klein_fast"]);
  });

  it("returns only klein_fast for klein_fast (no further fallback)", () => {
    expect(resolveImageFallbackProfiles("klein_fast")).toEqual(["klein_fast"]);
  });

  it("returns flux11_pro_candidate then klein_fast for flux11_pro_candidate", () => {
    expect(resolveImageFallbackProfiles("flux11_pro_candidate")).toEqual(["flux11_pro_candidate", "klein_fast"]);
  });
});

describe("withImageTimeout", () => {
  it("resolves with the value when the promise resolves before timeout", async () => {
    const result = await withImageTimeout(Promise.resolve("ok"), 1000);
    expect(result).toBe("ok");
  });

  it("rejects with ImageTimeoutError when the promise exceeds the timeout", async () => {
    const neverResolves = new Promise<never>(() => {});
    await expect(withImageTimeout(neverResolves, 10)).rejects.toBeInstanceOf(ImageTimeoutError);
  });

  it("ImageTimeoutError has the correct name property", async () => {
    const neverResolves = new Promise<never>(() => {});
    await withImageTimeout(neverResolves, 10).catch((err) => {
      expect(err.name).toBe("ImageTimeoutError");
      expect(err.message).toContain("10ms");
    });
  });

  it("propagates rejection from the original promise when it rejects before timeout", async () => {
    const fails = Promise.reject(new Error("original error"));
    await expect(withImageTimeout(fails, 1000)).rejects.toThrow("original error");
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

  it("builds klein fast input with images max 5", () => {
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

  it("builds pro input with input_images max 8", () => {
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

  it("builds kontext input with input_images when multiple URLs are provided", () => {
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
      input_images: ["https://example.com/1.png", "https://example.com/2.png"],
    });
  });

  it("builds kontext input with input_image when a single URL is provided", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-kontext-pro",
        prompt: "test prompt",
        inputImageUrls: ["https://example.com/1.png"],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      input_image: "https://example.com/1.png",
    });
  });

  it("builds kontext max input using default format (input_images)", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-kontext-max",
        prompt: "test prompt",
        inputImageUrls: ["https://example.com/1.png"],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      input_images: ["https://example.com/1.png"],
    });
  });

  it("builds flux-1.1-pro input with safety_tolerance and prompt_upsampling, no image_prompt when no reference", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-1.1-pro",
        prompt: "test prompt",
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      safety_tolerance: 5,
      prompt_upsampling: false,
    });
  });

  it("builds flux-1.1-pro input with image_prompt (first URL only) when reference URLs provided", () => {
    expect(
      buildReplicateInput({
        model: "black-forest-labs/flux-1.1-pro",
        prompt: "test prompt",
        inputImageUrls: ["https://example.com/1.png", "https://example.com/2.png"],
      })
    ).toEqual({
      prompt: "test prompt",
      aspect_ratio: "4:3",
      output_format: "png",
      safety_tolerance: 5,
      prompt_upsampling: false,
      image_prompt: "https://example.com/1.png",
    });
  });
});

describe("isCandidateProfile (T6-59)", () => {
  it("returns false for undefined", () => {
    expect(isCandidateProfile(undefined)).toBe(false);
  });

  it("returns false for production routing profiles", () => {
    expect(isCandidateProfile("klein_fast")).toBe(false);
    expect(isCandidateProfile("klein_base")).toBe(false);
    expect(isCandidateProfile("pro_consistent")).toBe(false);
    expect(isCandidateProfile("kontext_reference")).toBe(false);
  });

  it("returns true for candidate profiles", () => {
    expect(isCandidateProfile("openai_image_candidate")).toBe(true);
    expect(isCandidateProfile("flux11_pro_candidate")).toBe(true);
  });

  it("CANDIDATE_IMAGE_PROFILES contains exactly the candidate entries", () => {
    expect(CANDIDATE_IMAGE_PROFILES).toContain("openai_image_candidate");
    expect(CANDIDATE_IMAGE_PROFILES).toContain("flux11_pro_candidate");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("pro_consistent");
    expect(CANDIDATE_IMAGE_PROFILES).not.toContain("klein_fast");
  });
});
