import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildInputImageRefs } from "../src/generate-book";
import type { BookData, StoryCharacter } from "../src/lib/types";

describe("buildInputImageRefs (REF-001 Identity-Only Strategy)", () => {
  const mockSnapshot: BookData["childProfileSnapshot"] = {
    displayName: "ゆうた",
    visualProfile: {
      neutralReferenceImageUrl: "https://example.com/neutral.png",
      approvedImageUrl: "https://example.com/approved.png",
      referenceImageUrl: "https://example.com/reference.png",
      version: 1,
    },
    personality: {},
  } as any;

  it("prioritizes neutralReferenceImageUrl for the child protagonist", () => {
    const refs = buildInputImageRefs(mockSnapshot, []);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      characterId: "child_protagonist",
      url: "https://example.com/neutral.png",
      source: "neutralReferenceImageUrl",
    });
  });

  it("falls back to approvedImageUrl if neutral is missing", () => {
    const snapshot = {
      ...mockSnapshot,
      visualProfile: { ...mockSnapshot.visualProfile, neutralReferenceImageUrl: undefined },
    };
    const refs = buildInputImageRefs(snapshot, []);
    expect(refs[0].source).toBe("approvedImageUrl");
    expect(refs[0].url).toBe("https://example.com/approved.png");
  });

  it("picks only ONE best reference per character (REF-001 refinement)", () => {
    const cast: StoryCharacter[] = [
      {
        characterId: "companion_01",
        displayName: "なかよし",
        role: "buddy",
        neutralReferenceImageUrl: "https://example.com/comp-neutral.png",
        approvedImageUrl: "https://example.com/comp-approved.png",
        visualBible: "description",
      } as any,
    ];
    const refs = buildInputImageRefs(mockSnapshot, cast, ["companion_01"]);

    // Total 2 refs: child (neutral) and companion (neutral)
    expect(refs).toHaveLength(2);
    expect(refs.find(r => r.characterId === "child_protagonist")?.source).toBe("neutralReferenceImageUrl");
    expect(refs.find(r => r.characterId === "companion_01")?.source).toBe("neutralReferenceImageUrl");

    // Ensure it DID NOT include approvedImageUrl for either character since neutral was available
    expect(refs.filter(r => r.source === "approvedImageUrl")).toHaveLength(0);
  });

  it("prioritizes style_reference (sourcePhotoUrl) above all else", () => {
    const refs = buildInputImageRefs(mockSnapshot, [], [], undefined, "https://example.com/photo.jpg");
    expect(refs[0].role).toBe("style_reference");
    expect(refs[0].url).toBe("https://example.com/photo.jpg");
  });
});
