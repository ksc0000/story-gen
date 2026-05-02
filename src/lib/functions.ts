import type { Functions, HttpsCallable } from "firebase/functions";
import type {
  AvatarRevisionRequest,
  IllustrationStyle,
  ImageModelProfile,
  ImagePurpose,
  ImageQualityTier,
} from "@/lib/types";

let cachedFunctions: Functions | null = null;

async function getClientFunctions(): Promise<Functions> {
  if (cachedFunctions) {
    return cachedFunctions;
  }

  if (typeof window === "undefined") {
    throw new Error("Firebase Functions is only available in the browser.");
  }

  const [{ getFunctions }, { auth }] = await Promise.all([
    import("firebase/functions"),
    import("@/lib/firebase"),
  ]);

  cachedFunctions = getFunctions(auth.app, "asia-northeast1");
  return cachedFunctions;
}

async function getCallable<RequestData, ResponseData>(
  name: string
): Promise<HttpsCallable<RequestData, ResponseData>> {
  const [{ httpsCallable }, functions] = await Promise.all([
    import("firebase/functions"),
    getClientFunctions(),
  ]);

  return httpsCallable<RequestData, ResponseData>(functions, name);
}

export async function generateChildCharacterCallable(data: {
  childId: string;
  revisionRequest?: AvatarRevisionRequest;
  baseGenerationId?: string;
  variantStyle?: IllustrationStyle;
}): Promise<{
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
}> {
  const callable = await getCallable<
    { childId: string; revisionRequest?: AvatarRevisionRequest; baseGenerationId?: string; variantStyle?: IllustrationStyle },
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
  >("generateChildCharacter");

  const result = await callable(data);
  return result.data;
}

export type TestImageModelsRequest = {
  prompt: string;
  purpose?: ImagePurpose;
  inputImageUrls?: string[];
  qualityTiers?: ImageQualityTier[];
  modelProfiles?: ImageModelProfile[];
};

export type TestImageModelsResult = {
  batchId: string;
  purpose: ImagePurpose;
  inputImageUrls: string[];
  results: Array<{
    tier?: ImageQualityTier;
    modelProfile?: ImageModelProfile;
    model: string;
    imageUrl: string;
  }>;
};

export async function testImageModelsCallable(
  data: TestImageModelsRequest
): Promise<TestImageModelsResult> {
  const callable = await getCallable<TestImageModelsRequest, TestImageModelsResult>(
    "testImageModels"
  );
  const result = await callable(data);
  return result.data as TestImageModelsResult;
}

export type BootstrapAdminResult = {
  ok: boolean;
  admin: boolean;
  alreadyAdmin?: boolean;
  message?: string;
};

export async function bootstrapAdminCallable(): Promise<BootstrapAdminResult> {
  const callable = await getCallable<Record<string, never>, BootstrapAdminResult>(
    "bootstrapAdmin"
  );
  const result = await callable({});
  return result.data as BootstrapAdminResult;
}
