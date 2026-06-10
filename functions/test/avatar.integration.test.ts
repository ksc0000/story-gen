import { describe, expect, it, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";
import { onAvatarJobCreated, onCharacterProfileUpdated } from "../src/generate-avatar-job";
import { processAvatarGeneration } from "../src/lib/avatar-generation";

vi.mock("firebase-admin", () => {
  const data = new Map<string, any>();

  const update = vi.fn(async function(this: any, patch: any) {
    const current = data.get(this.path) || {};
    const updated = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (key.includes(".")) {
        const parts = key.split(".");
        let obj = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          obj[parts[i]] = { ...obj[parts[i]] };
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
      } else {
        updated[key] = value;
      }
    }
    data.set(this.path, updated);
    return {};
  });

  const set = vi.fn(async function(this: any, docData: any) {
    data.set(this.path, docData);
    return {};
  });

  const get = vi.fn(async function(this: any) {
    return {
      exists: data.has(this.path),
      data: () => data.get(this.path),
      id: this.path.split("/").pop(),
    };
  });

  const add = vi.fn(async function(this: any, docData: any) {
    const id = "mock-id-" + Math.random().toString(36).substring(7);
    const path = `${this.collectionPath}/${id}`;
    data.set(path, docData);
    return { id, path };
  });

  const doc = vi.fn((path: string) => ({
    path,
    update,
    set,
    get,
    collection: (sub: string) => collection(`${path}/${sub}`),
  }));

  const collection = vi.fn((collectionPath: string) => ({
    collectionPath,
    doc: (id: string) => doc(`${collectionPath}/${id}`),
    add,
  }));

  const db = { collection, doc };

  return {
    firestore: Object.assign(vi.fn(() => db), {
      FieldValue: {
        serverTimestamp: vi.fn(() => "mock-timestamp"),
      },
    }),
    storage: vi.fn(() => ({
      bucket: vi.fn(() => ({
        file: vi.fn(() => ({
          save: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
    __data: data, // Exposure for verification
  };
});

vi.mock("../src/lib/avatar-generation", () => ({
  processAvatarGeneration: vi.fn(),
  normalizeSensitiveError: vi.fn((err: any) => err.message),
}));

describe("Avatar Async End-to-End Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (admin as any).__data.clear();
  });

  it("completes the full flow from profile update to job completion", async () => {
    const characterId = "char-456";
    const userId = "user-123";

    // 1. Initial Profile State
    const profilePath = `characterProfiles/${characterId}`;
    (admin as any).__data.set(profilePath, {
      userId,
      displayName: "Test Child",
      visualProfile: { referenceImageUrl: "initial-url", version: 1 },
    });

    // 2. Simulate User Updating referenceImageUrl
    const beforeSnap = {
      data: () => (admin as any).__data.get(profilePath),
    };
    const afterData = {
      ...beforeSnap.data(),
      visualProfile: { ...beforeSnap.data().visualProfile, referenceImageUrl: "new-upload-url" },
    };
    const afterSnap = {
      data: () => afterData,
    };

    const updateEvent = {
      params: { characterId },
      data: {
        before: beforeSnap,
        after: afterSnap,
      },
    };

    // Trigger onCharacterProfileUpdated
    // @ts-ignore
    await onCharacterProfileUpdated.run(updateEvent);

    // 3. Verify Job Creation
    const jobs = Array.from((admin as any).__data.entries())
      .filter(([path]) => path.startsWith("childAvatarGenerationJobs/"))
      .map(([path, data]) => ({ id: path.split("/").pop(), ...(data as any) }));

    expect(jobs).toHaveLength(1);
    const createdJob = jobs[0];
    expect(createdJob.characterId).toBe(characterId);
    expect(createdJob.status).toBe("pending");

    // 4. Simulate Background Worker processing the job
    const mockResult = {
      batchId: "batch-789",
      attemptNumber: 1,
      candidates: [{
        generationId: "gen-1",
        imageUrl: "http://example.com/generated.png",
        prompt: "generated prompt"
      }],
      characterBible: "generated bible",
    };
    (processAvatarGeneration as any).mockResolvedValue(mockResult);

    const jobEvent = {
      params: { jobId: createdJob.id },
      data: {
        data: () => createdJob,
      },
    };

    // Trigger onAvatarJobCreated
    // @ts-ignore
    await onAvatarJobCreated.run(jobEvent);

    // 5. Verify Final Profile State
    const finalProfile = (admin as any).__data.get(profilePath);
    expect(finalProfile.visualProfile.approvedImageUrl).toBe("http://example.com/generated.png");
    expect(finalProfile.visualProfile.referenceImageUrl).toBe("http://example.com/generated.png");
    expect(finalProfile.visualProfile.characterBible).toBe("generated bible");
    expect(finalProfile.visualProfile.version).toBe(2);

    // 6. Verify Job Status
    const finalJob = (admin as any).__data.get(`childAvatarGenerationJobs/${createdJob.id}`);
    expect(finalJob.status).toBe("completed");
    expect(finalJob.result.candidates[0].imageUrl).toBe("http://example.com/generated.png");
  });
});
