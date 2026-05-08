import { describe, it, expect } from "vitest";
import {
  buildCoverRegenerationSuccessPatch,
  buildCoverRegenerationFailurePatch,
  hasValidExistingCover,
} from "../src/regenerate-cover-image";

const TS = "SERVER_TIMESTAMP_SENTINEL";
const NOW_MS = 1_700_000_000_000;

describe("buildCoverRegenerationSuccessPatch", () => {
  it("returns all success fields", () => {
    const result = buildCoverRegenerationSuccessPatch({
      coverImageUrl: "https://example.com/cover.png",
      usedProfile: "pro_consistent",
      durationMs: 5000,
      fallbackUsed: false,
      serverTimestamp: TS,
      nowMs: NOW_MS,
    });

    expect(result.coverStatus).toBe("completed");
    expect(result.hasCoverPage).toBe(true);
    expect(result.readingStructureVersion).toBe("v2_cover_title_story");
    expect(result.coverImageUrl).toBe("https://example.com/cover.png");
    expect(result.coverGeneratedAt).toBe(TS);
    expect(result.coverGeneratedAtMs).toBe(NOW_MS);
    expect(result.coverImageModelProfile).toBe("pro_consistent");
    expect(result.coverImageDurationMs).toBe(5000);
    expect(result.coverImageFallbackUsed).toBe(false);
    expect(result.coverFailureReason).toBeNull();
  });

  it("records fallbackUsed=true when fallback model was used", () => {
    const result = buildCoverRegenerationSuccessPatch({
      coverImageUrl: "https://example.com/cover.png",
      usedProfile: "klein_fast",
      durationMs: 3000,
      fallbackUsed: true,
      serverTimestamp: TS,
      nowMs: NOW_MS,
    });

    expect(result.coverImageFallbackUsed).toBe(true);
    expect(result.coverImageModelProfile).toBe("klein_fast");
  });

  it("clears coverFailureReason on success", () => {
    const result = buildCoverRegenerationSuccessPatch({
      coverImageUrl: "https://example.com/cover.png",
      usedProfile: "pro_consistent",
      durationMs: 5000,
      fallbackUsed: false,
      serverTimestamp: TS,
      nowMs: NOW_MS,
    });

    expect(result.coverFailureReason).toBeNull();
  });
});

describe("buildCoverRegenerationFailurePatch", () => {
  describe("without valid existing cover (hadValidCover=false)", () => {
    it("sets coverStatus=failed, hasCoverPage=false, v1", () => {
      const result = buildCoverRegenerationFailurePatch({
        failureReason: "image_timeout",
      });

      expect(result.coverStatus).toBe("failed");
      expect(result.hasCoverPage).toBe(false);
      expect(result.readingStructureVersion).toBe("v1_pages_only");
      expect(result.coverFailureReason).toBe("image_timeout");
    });

    it("includes optional fields when provided", () => {
      const result = buildCoverRegenerationFailurePatch({
        failureReason: "upload_failed",
        usedProfile: "pro_consistent",
        durationMs: 8000,
        fallbackUsed: true,
      });

      expect(result.coverStatus).toBe("failed");
      expect(result.coverFailureReason).toBe("upload_failed");
      expect(result.coverImageModelProfile).toBe("pro_consistent");
      expect(result.coverImageDurationMs).toBe(8000);
      expect(result.coverImageFallbackUsed).toBe(true);
    });
  });

  describe("with valid existing cover (hadValidCover=true)", () => {
    it("preserves coverStatus=completed, does not set hasCoverPage or readingStructureVersion", () => {
      const result = buildCoverRegenerationFailurePatch({
        failureReason: "image_timeout",
        hadValidCover: true,
      });

      expect(result.coverStatus).toBe("completed");
      expect(result.coverFailureReason).toBe("image_timeout");
      // hasCoverPage and readingStructureVersion should NOT be overwritten
      expect(result).not.toHaveProperty("hasCoverPage");
      expect(result).not.toHaveProperty("readingStructureVersion");
    });

    it("preserves cover visibility while recording failure metrics", () => {
      const result = buildCoverRegenerationFailurePatch({
        failureReason: "cover_regeneration_failed",
        usedProfile: "pro_consistent",
        durationMs: 5000,
        fallbackUsed: false,
        hadValidCover: true,
      });

      expect(result.coverStatus).toBe("completed");
      expect(result.coverFailureReason).toBe("cover_regeneration_failed");
      expect(result.coverImageModelProfile).toBe("pro_consistent");
      expect(result.coverImageDurationMs).toBe(5000);
      expect(result).not.toHaveProperty("coverImageUrl");
      expect(result).not.toHaveProperty("hasCoverPage");
      expect(result).not.toHaveProperty("readingStructureVersion");
    });
  });

  it("does not include coverImageUrl (preserves existing)", () => {
    const result = buildCoverRegenerationFailurePatch({
      failureReason: "cover_regeneration_failed",
      usedProfile: "pro_consistent",
      durationMs: 5000,
      fallbackUsed: false,
    });

    expect(result).not.toHaveProperty("coverImageUrl");
  });

  it("does not modify book status fields", () => {
    const result = buildCoverRegenerationFailurePatch({
      failureReason: "unexpected_error",
    });

    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("progress");
    expect(result).not.toHaveProperty("failureReason");
    expect(result).not.toHaveProperty("errorMessage");
  });
});

describe("hasValidExistingCover", () => {
  const validCover = {
    hasCoverPage: true,
    readingStructureVersion: "v2_cover_title_story",
    coverStatus: "completed",
    coverImageUrl: "https://example.com/cover.png",
  };

  it("returns true when all conditions are met", () => {
    expect(hasValidExistingCover(validCover)).toBe(true);
  });

  it("returns false when hasCoverPage is false", () => {
    expect(hasValidExistingCover({ ...validCover, hasCoverPage: false })).toBe(false);
  });

  it("returns false when hasCoverPage is undefined", () => {
    expect(hasValidExistingCover({ ...validCover, hasCoverPage: undefined })).toBe(false);
  });

  it("returns false when readingStructureVersion is v1", () => {
    expect(hasValidExistingCover({ ...validCover, readingStructureVersion: "v1_pages_only" })).toBe(false);
  });

  it("returns false when readingStructureVersion is undefined", () => {
    expect(hasValidExistingCover({ ...validCover, readingStructureVersion: undefined })).toBe(false);
  });

  it("returns false when coverStatus is failed", () => {
    expect(hasValidExistingCover({ ...validCover, coverStatus: "failed" })).toBe(false);
  });

  it("returns false when coverImageUrl is empty", () => {
    expect(hasValidExistingCover({ ...validCover, coverImageUrl: "" })).toBe(false);
  });

  it("returns false when coverImageUrl is undefined", () => {
    expect(hasValidExistingCover({ ...validCover, coverImageUrl: undefined })).toBe(false);
  });

  it("returns false when all fields are undefined", () => {
    expect(hasValidExistingCover({})).toBe(false);
  });
});
