import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";

const functions = getFunctions(auth.app, "asia-northeast1");

export const generateChildCharacterCallable = httpsCallable<
  { childId: string; correctionText?: string },
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
