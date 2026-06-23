import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import type {
  IllustrationStyle,
  ImageModelProfile,
  ImagePurpose,
  ImageQualityTier,
  InputImageRole,
} from "./lib/types";
import { ReplicateImageClient, resolveReplicateModel } from "./lib/replicate";
import {
  OpenAIImageClient,
  OPENAI_IMAGE_CANDIDATE_PROFILE,
  resolveOpenAIProfileOptions,
  resolveOpenAIModelLabel,
} from "./lib/openai-image";
import { PROFILE_PROVIDER_MAP } from "./lib/image-provider";
import { getEstimatedImageCostForModel } from "./lib/slo-metrics";
import { getIllustrationStyleProfile } from "./lib/illustration-styles";
import type { ImageClient } from "./lib/types";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");
const openaiApiKey = defineSecret("OPENAI_API_KEY");
const DEFAULT_TIERS: ImageQualityTier[] = ["light", "standard", "premium"];
const DEFAULT_MODEL_PROFILES: ImageModelProfile[] = [
  "klein_fast",
  "klein_base",
  "pro_consistent",
];

type TestImageModelsRequest = {
  prompt: string;
  purpose?: ImagePurpose;
  inputImageUrls?: string[];
  qualityTiers?: ImageQualityTier[];
  modelProfiles?: ImageModelProfile[];
  style?: IllustrationStyle;
  stylePreviewReference?: boolean;
};

export function normalizeTestImageModelsRequest(data: TestImageModelsRequest): {
  purpose: ImagePurpose;
  inputImageUrls: string[];
  qualityTiers: ImageQualityTier[];
  modelProfiles: ImageModelProfile[];
  compareByModelProfile: boolean;
  style: IllustrationStyle;
  stylePreviewReference: boolean;
  inputImageRoles: InputImageRole[];
} {
  const style = data.style ?? "soft_watercolor";
  const stylePreviewReference = data.stylePreviewReference === true;
  const dedupedInputImageUrls = [...new Set(data.inputImageUrls ?? [])].slice(0, 8);
  const stylePreviewUrl = stylePreviewReference
    ? `https://story-gen-8a769.web.app${getIllustrationStyleProfile(style).previewImageUrl}`
    : undefined;
  const inputImageUrls = stylePreviewUrl
    ? [...new Set([...dedupedInputImageUrls, stylePreviewUrl])]
    : dedupedInputImageUrls;
  const inputImageRoles: InputImageRole[] = [];
  if (dedupedInputImageUrls.length > 0) {
    inputImageRoles.push("character_reference");
  }
  if (stylePreviewUrl) {
    inputImageRoles.push("style_reference");
  }

  return {
    purpose: data.purpose ?? "book_page",
    inputImageUrls,
    qualityTiers: (data.qualityTiers?.length ? data.qualityTiers : DEFAULT_TIERS).filter(Boolean),
    modelProfiles: (data.modelProfiles?.length ? data.modelProfiles : DEFAULT_MODEL_PROFILES).filter(
      Boolean
    ),
    compareByModelProfile: Boolean(data.modelProfiles?.length),
    style,
    stylePreviewReference,
    inputImageRoles,
  };
}

export const testImageModels = onCall(
  {
    region: "asia-northeast1",
    secrets: [replicateApiToken, openaiApiKey],
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

    try {
    const normalized = normalizeTestImageModelsRequest(data);
    const {
      purpose,
      qualityTiers,
      inputImageUrls,
      modelProfiles,
      compareByModelProfile,
      inputImageRoles,
    } = normalized;

    const bucket = admin.storage().bucket("story-gen-8a769.firebasestorage.app");
    const batchId = randomUUID();
    const hasReferenceImages = inputImageUrls.length > 0;

    // Route each profile to its owning provider so cross-provider batches
    // (e.g. gpt-image-2 vs flux-2-pro) compare correctly in a single run.
    const clientForProfile = (modelProfile: ImageModelProfile): ImageClient => {
      if (PROFILE_PROVIDER_MAP[modelProfile] === "openai") {
        const opts = resolveOpenAIProfileOptions(modelProfile) ?? OPENAI_IMAGE_CANDIDATE_PROFILE;
        return new OpenAIImageClient(openaiApiKey.value(), opts);
      }
      return new ReplicateImageClient(replicateApiToken.value());
    };

    const labelForProfile = (modelProfile: ImageModelProfile): string => {
      if (PROFILE_PROVIDER_MAP[modelProfile] === "openai") {
        const opts = resolveOpenAIProfileOptions(modelProfile) ?? OPENAI_IMAGE_CANDIDATE_PROFILE;
        return resolveOpenAIModelLabel(hasReferenceImages, opts);
      }
      return resolveReplicateModel({ purpose, imageModelProfile: modelProfile });
    };

    const results: Array<{
      tier?: ImageQualityTier;
      modelProfile?: ImageModelProfile;
      model: string;
      imageUrl?: string;
      latencyMs?: number;
      estimatedCostUsd?: number;
      error?: string;
    }> = [];

    if (compareByModelProfile) {
      // Generate every profile in parallel; one failure must not abort the batch.
      const settled = await Promise.allSettled(
        modelProfiles.map(async (modelProfile) => {
          const model = labelForProfile(modelProfile);
          const startedAt = Date.now();
          const imageBuffer = await clientForProfile(modelProfile).generateImage(data.prompt, {
            purpose,
            imageModelProfile: modelProfile,
            inputImageUrls,
          });
          const latencyMs = Date.now() - startedAt;
          const filename = `internal-tests/image-models/${batchId}/${modelProfile}.png`;
          const token = randomUUID();
          await bucket.file(filename).save(imageBuffer, {
            contentType: "image/png",
            metadata: { metadata: { firebaseStorageDownloadTokens: token } },
          });
          return {
            modelProfile,
            model,
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`,
            latencyMs,
            estimatedCostUsd: getEstimatedImageCostForModel(model),
          };
        })
      );

      settled.forEach((outcome, index) => {
        if (outcome.status === "fulfilled") {
          results.push(outcome.value);
        } else {
          const modelProfile = modelProfiles[index];
          const message =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason);
          logger.error("testImageModels: profile generation failed", {
            modelProfile,
            provider: PROFILE_PROVIDER_MAP[modelProfile],
            message,
          });
          results.push({
            modelProfile,
            model: labelForProfile(modelProfile),
            error: message,
          });
        }
      });

      return {
        batchId,
        purpose,
        inputImageUrls,
        inputImageRoles,
        results,
      };
    }

    const tierImageClient = new ReplicateImageClient(replicateApiToken.value());
    const imageClient = tierImageClient;

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
      inputImageRoles,
      results,
    };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("testImageModels: top-level failure", { message, stack: err instanceof Error ? err.stack : undefined });
      throw new HttpsError("internal", `testImageModels failed: ${message}`);
    }
  }
);
