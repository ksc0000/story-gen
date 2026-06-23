import type { Functions, HttpsCallable } from "firebase/functions";
import type {
  IllustrationStyle,
  ImageModelProfile,
  ImagePurpose,
  ImageQualityTier,
  InputImageRole,
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

export type TestImageModelsRequest = {
  prompt: string;
  purpose?: ImagePurpose;
  inputImageUrls?: string[];
  qualityTiers?: ImageQualityTier[];
  modelProfiles?: ImageModelProfile[];
  style?: IllustrationStyle;
  stylePreviewReference?: boolean;
};

export type TestImageModelsResult = {
  batchId: string;
  purpose: ImagePurpose;
  inputImageUrls: string[];
  inputImageRoles: InputImageRole[];
  results: Array<{
    tier?: ImageQualityTier;
    modelProfile?: ImageModelProfile;
    model: string;
    imageUrl?: string;
    latencyMs?: number;
    estimatedCostUsd?: number;
    error?: string;
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

// ---------------------------------------------------------------------------
// generateStoryPitch
// ---------------------------------------------------------------------------

export interface StoryPitch {
  title: string;
  intro: string;
  rising: string;
  climax: string;
  resolution: string;
}

export interface GenerateStoryPitchInput {
  protagonistName: string;
  storyBrief: string;
  pageCount: number;
  protagonistType: "child" | "original_character" | "companion";
  refinementRequest?: string;
  companionName?: string;
  companionVisualDescription?: string;
}

export async function generateStoryPitchCallable(
  data: GenerateStoryPitchInput
): Promise<StoryPitch> {
  const callable = await getCallable<GenerateStoryPitchInput, StoryPitch>(
    "generateStoryPitch"
  );
  const result = await callable(data);
  return result.data;
}

export async function bootstrapAdminCallable(): Promise<BootstrapAdminResult> {
  const callable = await getCallable<Record<string, never>, BootstrapAdminResult>(
    "bootstrapAdmin"
  );
  const result = await callable({});
  return result.data as BootstrapAdminResult;
}

// ---------------------------------------------------------------------------
// backfillDailyMetrics（管理者：日次メトリクスの遡及集計）
// ---------------------------------------------------------------------------

export type BackfillDailyMetricsResult = {
  ok: boolean;
  days: number;
  saved: number;
};

export async function backfillDailyMetricsCallable(
  days: number
): Promise<BackfillDailyMetricsResult> {
  const callable = await getCallable<{ days: number }, BackfillDailyMetricsResult>(
    "backfillDailyMetrics"
  );
  const result = await callable({ days });
  return result.data as BackfillDailyMetricsResult;
}

// ---------------------------------------------------------------------------
// クーポン（テスター向け無料生成クレジット）
// ---------------------------------------------------------------------------

export type RedeemCouponResult = { ok: boolean; creditsGranted: number };

export async function redeemCouponCallable(code: string): Promise<RedeemCouponResult> {
  const callable = await getCallable<{ code: string }, RedeemCouponResult>("redeemCoupon");
  const result = await callable({ code });
  return result.data as RedeemCouponResult;
}

export type CreateCouponInput = {
  code?: string;
  creditsGranted: number;
  maxRedemptions: number;
  expiresAtMs?: number;
  note?: string;
};
export type CreateCouponResult = {
  ok: boolean;
  code: string;
  creditsGranted: number;
  maxRedemptions: number;
};

export async function createCouponCallable(
  input: CreateCouponInput
): Promise<CreateCouponResult> {
  const callable = await getCallable<CreateCouponInput, CreateCouponResult>("createCoupon");
  const result = await callable(input);
  return result.data as CreateCouponResult;
}
