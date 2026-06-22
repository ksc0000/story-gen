import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "crypto";
import { REPLICATE_PREDICTIONS_COLLECTION } from "./lib/replicate";
import type { ReplicatePredictionDoc, ReplicatePredictionStatus } from "./lib/types";

const replicateWebhookSecret = defineSecret("REPLICATE_WEBHOOK_SECRET");

/**
 * Replicate Webhook Receiver
 * Handles status updates for image generation predictions.
 */
export const replicateWebhook = onRequest(
  {
    secrets: [replicateWebhookSecret],
    region: "asia-northeast1",
  },
  async (req, res) => {
    const id = req.get("webhook-id");
    const timestamp = req.get("webhook-timestamp");
    const signature = req.get("webhook-signature");

    if (!id || !timestamp || !signature) {
      logger.error("Missing webhook headers", { id, timestamp, signature });
      res.status(401).send("Missing headers");
      return;
    }

    const secret = replicateWebhookSecret.value();
    if (!secret) {
      logger.error("REPLICATE_WEBHOOK_SECRET not configured");
      res.status(500).send("Internal Error");
      return;
    }

    const signedContent = `${id}.${timestamp}.${req.rawBody.toString()}`;
    const secretKey = secret.startsWith("whsec_") ? secret.substring(6) : secret;
    const secretBytes = Buffer.from(secretKey, "base64");
    const computedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const expectedSignatures = signature.split(" ");
    const isValid = expectedSignatures.some((sig) => {
      const [v, s] = sig.split(",");
      if (v !== "v1") return false;
      if (!s) return false;

      const sBuffer = Buffer.from(s, "base64");
      const computedBuffer = Buffer.from(computedSignature, "base64");

      if (sBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sBuffer, computedBuffer);
    });

    if (!isValid) {
      logger.error("Invalid webhook signature", { id, expected: signature, computed: computedSignature });
      res.status(401).send("Invalid signature");
      return;
    }

    const payload = req.body;
    const predictionId = payload.id;
    const status = payload.status as ReplicatePredictionStatus;
    const output = payload.output;
    const error = payload.error;

    if (!predictionId) {
      res.status(400).send("Missing prediction ID");
      return;
    }

    const db = admin.firestore();
    const predictionRef = db.collection(REPLICATE_PREDICTIONS_COLLECTION).doc(predictionId);
    const predictionSnap = await predictionRef.get();

    if (!predictionSnap.exists) {
      // It's possible the prediction was not recorded yet due to race condition,
      // but unlikely if createPrediction and recordPrediction are called before returning.
      logger.warn("Prediction record not found for webhook", { predictionId });
      res.status(200).send("OK (Prediction not found)");
      return;
    }

    const predictionData = predictionSnap.data() as ReplicatePredictionDoc;
    const now = Date.now();

    const updateData: Partial<ReplicatePredictionDoc> = {
      status,
      updatedAtMs: now,
    };

    if (output) updateData.output = output;
    if (error) updateData.error = String(error);
    if (payload.completed_at) {
      updateData.completedAtMs = new Date(payload.completed_at).getTime();
    }

    await predictionRef.update(updateData);

    // If completed, update the target document (Book or Page)
    if (status === "succeeded" || status === "failed" || status === "canceled") {
      await handlePredictionCompletion(db, {
        ...predictionData,
        ...updateData,
      } as ReplicatePredictionDoc);
    }

    res.status(200).send("OK");
  }
);

/**
 * Update the corresponding target document (Book or Page) when a prediction completes.
 */
async function handlePredictionCompletion(
  db: admin.firestore.Firestore,
  prediction: ReplicatePredictionDoc
): Promise<void> {
  const { targetId, targetType, status, output, error, metadata } = prediction;

  try {
    if (targetType === "book_page" && metadata?.bookId && metadata?.pageNumber !== undefined) {
      const pageRef = db
        .collection("books")
        .doc(metadata.bookId)
        .collection("pages")
        .doc(`page-${metadata.pageNumber}`);

      if (status === "succeeded" && output) {
        const imageUrl = Array.isArray(output) ? output[0] : output;
        await pageRef.update({
          status: "completed",
          imageUrl,
          imageCompletedAtMs: Date.now(),
        });
        // Also update coverImageUrl if it's the first page
        if (metadata.pageNumber === 0) {
          await db.collection("books").doc(metadata.bookId).update({ coverImageUrl: imageUrl });
        }
      } else {
        await pageRef.update({
          status: "image_failed",
          imageFailureReason: error || "Prediction failed",
        });
      }
    } else if (targetType === "book_cover" && targetId) {
      const bookRef = db.collection("books").doc(targetId);
      if (status === "succeeded" && output) {
        const imageUrl = Array.isArray(output) ? output[0] : output;
        await bookRef.update({
          coverStatus: "completed",
          coverImageUrl: imageUrl,
          coverGeneratedAtMs: Date.now(),
        });
      } else {
        await bookRef.update({
          coverStatus: "failed",
          coverFailureReason: error || "Prediction failed",
        });
      }
    } else if (targetType === "companion_image" && metadata?.companionId) {
      const companionRef = db.collection("companions").doc(metadata.companionId);
      if (status === "succeeded" && output) {
        const imageUrl = Array.isArray(output) ? output[0] : output;
        await companionRef.update({
          generatedImageUrl: imageUrl,
          imageGenerationStatus: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Also update the job if it exists
        const jobQuery = await db.collection("companionImageJobs")
          .where("companionId", "==", metadata.companionId)
          .limit(1)
          .get();
        if (!jobQuery.empty) {
          await jobQuery.docs[0].ref.update({
            status: "completed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        await companionRef.update({
          imageGenerationStatus: "failed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else if (targetType === "child_avatar" && metadata?.childId) {
       // Avatar generation usually involves batches, this might need more complex handling
       // if we use async webhooks for individual avatar candidates.
       // For now, logging it as not fully implemented for targetType.
       logger.info("Avatar prediction completion received via webhook - not implemented for granular update", { predictionId: prediction.id });
    }
  } catch (err) {
    logger.error("Error updating target document from webhook", {
      predictionId: prediction.id,
      targetId,
      targetType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
