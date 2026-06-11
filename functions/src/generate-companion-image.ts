import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { ReplicateImageClient } from "./lib/replicate";
import { normalizeSensitiveError } from "./lib/avatar-generation";
import type { CompanionImageJob, CompanionData } from "./lib/types";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");

export const onCompanionImageJobCreated = onDocumentCreated(
  {
    document: "companionImageJobs/{jobId}",
    secrets: [replicateApiToken],
    region: "asia-northeast1",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    const jobId = event.params.jobId;
    const jobData = event.data?.data() as CompanionImageJob;

    if (!jobData) {
      return;
    }

    // Only process jobs in "pending" status
    if (jobData.status !== "pending") {
      return;
    }

    const db = admin.firestore();
    const storage = admin.storage();
    const jobRef = db.collection("companionImageJobs").doc(jobId);
    const companionRef = db.collection("companions").doc(jobData.companionId);

    try {
      await jobRef.update({
        status: "generating",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const companionSnap = await companionRef.get();
      if (!companionSnap.exists) {
        throw new Error("相棒データが見つかりません");
      }

      const companion = companionSnap.data() as CompanionData;
      const { visualDescription } = companion;

      if (!visualDescription) {
        throw new Error("見た目の説明(visualDescription)が設定されていません");
      }

      const prompt = buildCompanionPrompt(companion);
      const imageClient = new ReplicateImageClient(replicateApiToken.value());

      const imageBuffer = await imageClient.generateImage(prompt, {
        purpose: "book_page", // Using book_page as it's for general illustration
        imageModelProfile: "pro_consistent",
      });

      const generationId = randomUUID();
      const imageUrl = await uploadCompanionImage(
        storage,
        jobData.userId,
        jobData.companionId,
        generationId,
        imageBuffer
      );

      await companionRef.update({
        generatedImageUrl: imageUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await jobRef.update({
        status: "completed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      const message = normalizeSensitiveError(err);
      await jobRef.update({
        status: "failed",
        error: {
          message,
          code: "internal",
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

function buildCompanionPrompt(companion: CompanionData): string {
  // visualDescription は buildVisualDescription() で生成した英語文字列
  // 例: "A small, white dog with a energetic personality who has the ability to fly."
  return [
    companion.visualDescription,
    "Cute soft children's picture book illustration,",
    "pastel watercolor style, white background,",
    "centered full-body character, simple round friendly shapes,",
    "no text, no letters, no watermarks.",
  ].join(" ");
}

async function uploadCompanionImage(
  storage: admin.storage.Storage,
  uid: string,
  companionId: string,
  generationId: string,
  imageBuffer: Buffer
): Promise<string> {
  const bucket = storage.bucket("story-gen-8a769.firebasestorage.app");
  const filename = `users/${uid}/companions/${companionId}/illustrations/${generationId}.png`;
  const token = randomUUID();
  await bucket.file(filename).save(imageBuffer, {
    contentType: "image/png",
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
}
