import { describe, expect, it } from "vitest";
import {
  buildReferenceImageRoles,
  buildReferenceImageInstruction,
} from "../src/lib/avatar-generation";

describe("buildReferenceImageRoles", () => {
  it("orders child_photo first when provided", () => {
    const roles = buildReferenceImageRoles({
      childPhotoUrl: "https://example.com/photo.jpg",
      baseGenerationImageUrl: "https://example.com/base.png",
      styleReferenceImageUrl: "https://example.com/style.png",
    });
    expect(roles[0]).toEqual({ role: "child_photo", url: "https://example.com/photo.jpg" });
    expect(roles.map((r) => r.role)).toEqual(["child_photo", "base_generation", "style_reference"]);
  });

  it("omits child_photo when not provided", () => {
    const roles = buildReferenceImageRoles({
      baseGenerationImageUrl: "https://example.com/base.png",
    });
    expect(roles.some((r) => r.role === "child_photo")).toBe(false);
  });

  it("dedupes identical urls", () => {
    const roles = buildReferenceImageRoles({
      childPhotoUrl: "https://example.com/same.png",
      approvedImageUrl: "https://example.com/same.png",
    });
    expect(roles).toHaveLength(1);
  });
});

describe("buildReferenceImageInstruction with child_photo", () => {
  it("includes non-photorealistic safety guidance for the photo", () => {
    const instruction = buildReferenceImageInstruction([
      { role: "child_photo", url: "https://example.com/photo.jpg" },
    ]);
    expect(instruction).toMatch(/reference photo provided by the parent/i);
    expect(instruction).toMatch(/non-photorealistic/i);
    expect(instruction).toMatch(/do not copy the exact face/i);
    expect(instruction).toMatch(/clearly fictional/i);
  });

  it("numbers the photo reference correctly when combined with a style reference", () => {
    const instruction = buildReferenceImageInstruction([
      { role: "child_photo", url: "https://example.com/photo.jpg" },
      { role: "style_reference", url: "https://example.com/style.png" },
    ]);
    expect(instruction).toMatch(/Reference image 1: this is a reference photo/i);
    expect(instruction).toMatch(/Reference image 2: use this only as the visual style reference/i);
  });
});
