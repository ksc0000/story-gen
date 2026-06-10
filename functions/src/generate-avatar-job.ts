import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { processAvatarGeneration, normalizeSensitiveError } from "./lib/avatar-generation";
import type { ChildAvatarGenerationJob, CharacterProfileData } from "./lib/types";

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

    logger.info("Avatar generation job started", { jobId, userId: jobData.userId, childId: jobData.childId, characterId: jobData.characterId });

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
        characterId: jobData.characterId,
        request: jobData.request,
      });

      const firstCandidate = result.candidates[0];

      if (firstCandidate) {
        let characterRef: admin.firestore.DocumentReference | undefined;
        if (jobData.characterId) {
          characterRef = db.collection("characterProfiles").doc(jobData.characterId);
        } else if (jobData.userId && jobData.childId) {
          characterRef = db.collection("users").doc(jobData.userId).collection("children").doc(jobData.childId);
        }

        if (characterRef) {
          const characterSnap = await characterRef.get();
          const characterData = characterSnap.data() as CharacterProfileData | undefined;

          await characterRef.update({
            "visualProfile.approvedImageUrl": firstCandidate.imageUrl,
            "visualProfile.referenceImageUrl": firstCandidate.imageUrl,
            "visualProfile.characterBible": result.characterBible,
            "visualProfile.basePrompt": firstCandidate.prompt,
            "visualProfile.version": (characterData?.visualProfile?.version ?? 0) + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info("Character profile updated with generated avatar", { characterId: characterRef.id });
        }
      }

      await jobRef.update({
        status: "completed",
        result: {
          batchId: result.batchId,
          attemptNumber: result.attemptNumber,
          candidates: result.candidates,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("Avatar generation job completed", { jobId });
    } catch (err) {
      const message = normalizeSensitiveError(err);
      logger.error("Avatar generation job failed", { jobId, error: message });
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

/**
 * Triggered when a character profile is updated.
 * Automatically creates an avatar generation job if the referenceImageUrl changes.
 */
export const onCharacterProfileUpdated = onDocumentUpdated(
  {
    document: "characterProfiles/{characterId}",
    region: "asia-northeast1",
  },
  async (event) => {
    const characterId = event.params.characterId;
    const before = event.data?.before.data() as CharacterProfileData | undefined;
    const after = event.data?.after.data() as CharacterProfileData | undefined;

    if (!before || !after) return;

    const beforeRefUrl = before.visualProfile?.referenceImageUrl;
    const afterRefUrl = after.visualProfile?.referenceImageUrl;

    // Trigger only if referenceImageUrl has changed and is not empty
    if (afterRefUrl && beforeRefUrl !== afterRefUrl) {
      // Check if this update was likely from onAvatarJobCreated (identity update)
      // by comparing the version or other fields if necessary.
      // Here we assume if referenceImageUrl changed to a new URL, we might want to process it.
      // BUT if it's the SAME URL as approvedImageUrl, it might be our own update.
      if (afterRefUrl === after.visualProfile?.approvedImageUrl) {
        logger.info("Skipping avatar job creation: referenceImageUrl matches approvedImageUrl", { characterId });
        return;
      }

      const db = admin.firestore();
      const jobData: Partial<ChildAvatarGenerationJob> = {
        userId: after.userId,
        characterId: characterId,
        status: "pending",
        request: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const jobRef = await db.collection("childAvatarGenerationJobs").add(jobData);
      logger.info("Created avatar generation job for updated character profile", { characterId, jobId: jobRef.id });
    }
  }
);
