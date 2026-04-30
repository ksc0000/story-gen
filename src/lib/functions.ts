import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";
import type { AvatarRevisionRequest, ImagePurpose, ImageQualityTier } from "@/lib/types";

const functions = getFunctions(auth.app, "asia-northeast1");

export const generateChildCharacterCallable = httpsCallable<
  { childId: string; revisionRequest?: AvatarRevisionRequest; baseGenerationId?: string },
  {
    batchId: string;
    attemptNumber: number;
    maxAttempts: number;
    remainingAttempts: number;
    characterBible: string;
    candidates: Array<{
      generationId: string;
      imageUrl: string;
      style: string;
      styleLabel: string;
      prompt: string;
    }>;
  }
>(functions, "generateChildCharacter");

export type TestImageModelsRequest = {
  prompt: string;
  purpose?: ImagePurpose;
  inputImageUrls?: string[];
  qualityTiers?: ImageQualityTier[];
};

export type TestImageModelsResult = {
  batchId: string;
  purpose: ImagePurpose;
  inputImageUrls: string[];
  results: Array<{
    tier: ImageQualityTier;
    model: string;
    imageUrl: string;
  }>;
};

export async function testImageModelsCallable(
  data: TestImageModelsRequest
): Promise<TestImageModelsResult> {
  const callable = httpsCallable<TestImageModelsRequest, TestImageModelsResult>(functions, "testImageModels");
  const result = await callable(data);
  return result.data as TestImageModelsResult;
}
