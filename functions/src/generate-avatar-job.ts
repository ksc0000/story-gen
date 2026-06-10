import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { processAvatarGeneration, normalizeSensitiveError } from "./lib/avatar-generation";
import type { ChildAvatarGenerationJob } from "./lib/types";

const replicateApiToken = defineSecret("REPLICATE_API_TOKEN");

export const onAvatarJobCreated = onDocumentCreated(
  {
    document: "childAvatarGenerationJobs/{jobId}",
    secrets: [replicateApiToken],
    region: "asia-northeast1",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    const jobId = event.params.jobId;
    const jobData = event.data?.data() as ChildAvatarGenerationJob;

    if (!jobData) {
      return;
    }

    // Only process jobs in "pending" status
    if (jobData.status !== "pending") {
      return;
    }

    const db = admin.firestore();
    const storage = admin.storage();
    const jobRef = db.collection("childAvatarGenerationJobs").doc(jobId);

    try {
      await jobRef.update({
        status: "generating",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const result = await processAvatarGeneration({
        db,
        storage,
        replicateApiToken: replicateApiToken.value(),
        userId: jobData.userId,
        childId: jobData.childId,
        request: jobData.request,
      });

      await jobRef.update({
        status: "completed",
        result: {
          batchId: result.batchId,
          attemptNumber: result.attemptNumber,
          candidates: result.candidates,
        },
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
