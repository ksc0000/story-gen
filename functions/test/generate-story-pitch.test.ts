import { describe, it, expect, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import { generateStoryPitch } from "../src/generate-story-pitch";
import { HttpsError } from "firebase-functions/v2/https";

// Mock firebase-admin
vi.mock("firebase-admin", () => {
  return {
    firestore: vi.fn(),
  };
});

// Mock rate-limit utility
vi.mock("../src/lib/rate-limit", () => {
  return {
    isRateLimited: vi.fn(),
  };
});

// Mock GoogleGenerativeAI
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: "Test Title",
              intro: "Intro",
              rising: "Rising",
              climax: "Climax",
              resolution: "Resolution",
            }),
          },
        }),
      })),
    })),
  };
});

import { isRateLimited } from "../src/lib/rate-limit";

describe("generateStoryPitch rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (admin.firestore as any).mockReturnValue({});
  });

  const mockContext: any = {
    auth: {
      uid: "user123",
      token: { admin: false },
    },
  };

  const mockData = {
    protagonistName: "Yuta",
    storyBrief: "A grand adventure in the backyard",
    pageCount: 8,
    protagonistType: "child" as const,
  };

  it("throws unauthenticated error when user is not logged in", async () => {
    await expect(generateStoryPitch.run({ data: mockData, auth: undefined } as any))
      .rejects.toThrow(expect.objectContaining({ code: "unauthenticated" }));
  });

  it("throws resource-exhausted error when rate limited", async () => {
    (isRateLimited as any).mockResolvedValue(true);

    await expect(generateStoryPitch.run({ data: mockData, auth: mockContext.auth } as any))
      .rejects.toThrow(expect.objectContaining({ code: "resource-exhausted" }));

    expect(isRateLimited).toHaveBeenCalledWith(
      expect.any(Object),
      "user123",
      "generate_story_pitch",
      expect.any(Object),
      false
    );
  });

  it("proceeds when not rate limited", async () => {
    (isRateLimited as any).mockResolvedValue(false);

    const result = await generateStoryPitch.run({ data: mockData, auth: mockContext.auth } as any);

    expect(result).toEqual(expect.objectContaining({
      title: "Test Title",
    }));
    expect(isRateLimited).toHaveBeenCalled();
  });
});
