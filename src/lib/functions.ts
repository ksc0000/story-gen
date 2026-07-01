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
  name: string,
  options?: { timeout?: number }
): Promise<HttpsCallable<RequestData, ResponseData>> {
  const [{ httpsCallable }, functions] = await Promise.all([
    import("firebase/functions"),
    getClientFunctions(),
  ]);

  return httpsCallable<RequestData, ResponseData>(functions, name, options);
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
  // 複数モデルの並列生成は数十秒〜数分かかるため、クライアント既定の 70s では
  // deadline-exceeded になる。関数側の timeoutSeconds(300) に合わせて延長する。
  const callable = await getCallable<TestImageModelsRequest, TestImageModelsResult>(
    "testImageModels",
    { timeout: 300000 }
  );
  const result = await callable(data);
  return result.data as TestImageModelsResult;
}

export type RegenerateStylePreviewsResult = {
  count: number;
  results: Array<{ styleId: string; url?: string; error?: string }>;
};

export async function regenerateStylePreviewsCallable(
  styleIds?: string[]
): Promise<RegenerateStylePreviewsResult> {
  // 11スタイル × gpt-image-2 high は数分かかるため timeout を延長。
  const callable = await getCallable<{ styleIds?: string[] }, RegenerateStylePreviewsResult>(
    "regenerateStylePreviews",
    { timeout: 540000 }
  );
  const result = await callable({ styleIds });
  return result.data as RegenerateStylePreviewsResult;
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

// ---------------------------------------------------------------------------
// analyzeChildPhoto（写真 → プロフィール下書き）
// ---------------------------------------------------------------------------

export type GenderExpression = "boy" | "girl" | "neutral" | "unspecified";

export interface ChildProfileDraft {
  characterLook: string;
  outfit: string;
  colorMood: string;
  ageGuess: number | null;
  genderExpression: GenderExpression;
}

export async function analyzeChildPhotoCallable(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<ChildProfileDraft> {
  const callable = await getCallable<
    { imageBase64: string; mimeType: string },
    ChildProfileDraft
  >("analyzeChildPhoto", { timeout: 60000 });
  const result = await callable(input);
  return result.data;
}

// ---------------------------------------------------------------------------
// 組織（エンタープライズ）
// ---------------------------------------------------------------------------

export type OrgRole = "org_admin" | "teacher";

export async function createOrganizationCallable(
  name: string
): Promise<{ orgId: string; inviteCode: string; role: OrgRole }> {
  const callable = await getCallable<
    { name: string },
    { orgId: string; inviteCode: string; role: OrgRole }
  >("createOrganization");
  const result = await callable({ name });
  return result.data;
}

export async function joinOrganizationByCodeCallable(input: {
  code: string;
  displayName?: string;
}): Promise<{ orgId: string; orgName: string; role: OrgRole }> {
  const callable = await getCallable<
    { code: string; displayName?: string },
    { orgId: string; orgName: string; role: OrgRole }
  >("joinOrganizationByCode");
  const result = await callable(input);
  return result.data;
}

export async function rotateInviteCodeCallable(): Promise<{ inviteCode: string }> {
  const callable = await getCallable<Record<string, never>, { inviteCode: string }>(
    "rotateInviteCode"
  );
  const result = await callable({});
  return result.data;
}

export async function createOrgCheckoutSessionCallable(input: {
  orgId: string;
  orgPlan: "enterprise_standard" | "enterprise_pro";
}): Promise<{ url: string | null; configured: boolean }> {
  const callable = await getCallable<
    { orgId: string; orgPlan: string },
    { url: string | null; configured: boolean }
  >("createOrgCheckoutSession");
  const result = await callable(input);
  return result.data;
}

export async function bulkGenerateClassBooksCallable(input: {
  orgId: string;
  classId: string;
  templateId: string;
  message?: string;
}): Promise<{ created: number; remainingThisMonth: number }> {
  const callable = await getCallable<
    { orgId: string; classId: string; templateId: string; message?: string },
    { created: number; remainingThisMonth: number }
  >("bulkGenerateClassBooks", { timeout: 60000 });
  const result = await callable(input);
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
