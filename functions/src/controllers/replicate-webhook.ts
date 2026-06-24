import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";
import { REPLICATE_PREDICTIONS_COLLECTION, recordPrediction } from "../lib/replicate";
import type { ReplicatePredictionDoc, ReplicatePredictionStatus } from "../lib/types";

const replicateWebhookSecret = defineSecret("REPLICATE_WEBHOOK_SECRET");

/**
 * Verify Replicate webhook signature manually using crypto.
 * Replicate uses Svix for webhooks.
 * https://docs.svix.com/receiving/verifying-payloads/how-to-verify
 */
function verifySignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string
): boolean {
  const id = headers["webhook-id"] as string;
  const timestamp = headers["webhook-timestamp"] as string;
  const signatures = headers["webhook-signature"] as string;

  if (!id || !timestamp || !signatures) {
    return false;
  }

  const signedContent = `${id}.${timestamp}.${rawBody.toString("utf-8")}`;

  // Secret is usually "whsec_..." - we need the part after the prefix
  const secretKey = secret.startsWith("whsec_") ? secret.substring(6) : secret;
  const secretBuffer = Buffer.from(secretKey, "base64");

  const hmac = crypto.createHmac("sha256", secretBuffer);
  hmac.update(signedContent);
  const expectedSignature = hmac.digest("base64");

  const signatureList = signatures.split(" ");
  for (const sig of signatureList) {
    const [version, signature] = sig.split(",");
    if (version !== "v1") continue;

    try {
      if (crypto.timingSafeEqual(Buffer.from(signature, "base64"), Buffer.from(expectedSignature, "base64"))) {
        return true;
      }
    } catch (e) {
      // Ignore length mismatch or other errors
    }
  }

  return false;
}

export const replicateWebhook = onRequest(
  {
    region: "asia-northeast1",
    secrets: [replicateWebhookSecret],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Verify signature if secret is provided
    const secret = replicateWebhookSecret.value();
    if (secret) {
      const isValid = verifySignature(req.rawBody, req.headers, secret);
      if (!isValid) {
        logger.warn("Invalid Replicate webhook signature");
        res.status(401).send("Invalid signature");
        return;
      }
    }

    const prediction = req.body;
    if (!prediction || !prediction.id) {
      res.status(400).send("Invalid payload");
      return;
    }

    const db = admin.firestore();

    try {
      const predictionId = prediction.id;
      const status = prediction.status as ReplicatePredictionStatus;

      // Check if prediction exists BEFORE recording, so we can warn if it's unknown.
      // recordPrediction uses set(merge:true) which would create it.
      const docSnap = await db.collection(REPLICATE_PREDICTIONS_COLLECTION).doc(predictionId).get();
      const exists = docSnap.exists;

      const updateData: Partial<ReplicatePredictionDoc> = {
        id: predictionId,
        status: status,
        output: prediction.output,
        error: prediction.error,
      };

      if (prediction.completed_at) {
        updateData.completedAt = admin.firestore.Timestamp.fromDate(new Date(prediction.completed_at));
      }

      await recordPrediction(db, updateData as any);

      if (!exists) {
        logger.warn("Received webhook for unknown prediction (created doc on demand)", { predictionId });
        res.status(200).send("OK (Created unknown prediction)");
        return;
      }

      const predictionDoc = docSnap.data() as ReplicatePredictionDoc;

      logger.info("Replicate webhook processed successfully", {
        predictionId,
        status,
        targetType: predictionDoc.targetType,
        targetId: predictionDoc.targetId,
      });

      res.status(200).send("OK");
    } catch (err) {
      logger.error("Error processing Replicate webhook", {
        error: err instanceof Error ? err.message : String(err),
        predictionId: prediction.id
      });
      res.status(500).send("Internal Server Error");
    }
  }
);
