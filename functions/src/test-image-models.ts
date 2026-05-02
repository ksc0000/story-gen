import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import type { ImageModelProfile, ImagePurpose, ImageQualityTier } from "./lib/types";
import { ReplicateImageClient, resolveReplicateModel } from "./lib/replicate";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");
const DEFAULT_TIERS: ImageQualityTier[] = ["light", "standard", "premium"];

type TestImageModelsRequest = {
  prompt: string;
  purpose?: ImagePurpose;
  inputImageUrls?: string[];
  qualityTiers?: ImageQualityTier[];
  modelProfiles?: ImageModelProfile[];
};

export const testImageModels = onCall(
  {
    region: "asia-northeast1",
    secrets: [replicateApiToken],
    memory: "1GiB",
    timeoutSeconds: 300,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    if (request.auth.token.admin !== true) {
      throw new HttpsError("permission-denied", "管理者のみ利用できます");
    }

    const data = request.data as TestImageModelsRequest;
    if (!data.prompt || typeof data.prompt !== "string") {
      throw new HttpsError("invalid-argument", "prompt is required");
    }

    const purpose = data.purpose ?? "book_page";
    const qualityTiers = (data.qualityTiers?.length ? data.qualityTiers : DEFAULT_TIERS).filter(Boolean);
    const modelProfiles = (data.modelProfiles?.length ? data.modelProfiles : []).filter(Boolean);
    const inputImageUrls = [...new Set(data.inputImageUrls ?? [])].slice(0, 8);

    const imageClient = new ReplicateImageClient(replicateApiToken.value());
    const bucket = admin.storage().bucket("story-gen-8a769.firebasestorage.app");
    const batchId = randomUUID();
    const results: Array<{
      tier?: ImageQualityTier;
      modelProfile?: ImageModelProfile;
      model: string;
      imageUrl: string;
    }> = [];

    if (modelProfiles.length > 0) {
      const profilesToRun = modelProfiles.includes("kontext_reference")
        ? modelProfiles
        : modelProfiles.filter(Boolean);

      for (const modelProfile of profilesToRun) {
        const imageBuffer = await imageClient.generateImage(data.prompt, {
          purpose,
          imageModelProfile: modelProfile,
          inputImageUrls,
        });
        const filename = `internal-tests/image-models/${batchId}/${modelProfile}.png`;
        const token = randomUUID();
        await bucket.file(filename).save(imageBuffer, {
          contentType: "image/png",
          metadata: {
            metadata: {
              firebaseStorageDownloadTokens: token,
            },
          },
        });

        results.push({
          modelProfile,
          model: resolveReplicateModel({ purpose, imageModelProfile: modelProfile }),
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`,
        });
      }

      return {
        batchId,
        purpose,
        inputImageUrls,
        results,
      };
    }

    for (const tier of qualityTiers) {
      const imageBuffer = await imageClient.generateImage(data.prompt, {
        purpose,
        imageQualityTier: tier,
        inputImageUrls,
      });
      const filename = `internal-tests/image-models/${batchId}/${tier}.png`;
      const token = randomUUID();
      await bucket.file(filename).save(imageBuffer, {
        contentType: "image/png",
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });

      results.push({
        tier,
        model: resolveReplicateModel({ purpose, imageQualityTier: tier }),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`,
      });
    }

    return {
      batchId,
      purpose,
      inputImageUrls,
      results,
    };
  }
);
