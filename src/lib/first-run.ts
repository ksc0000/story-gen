import { serverTimestamp, Timestamp } from "firebase/firestore";
import type {
  ChildProfileDoc,
  ChildProfileSnapshot,
  TemplateDoc, IllustrationStyle } from "@/lib/types";
import { getIllustrationStyleProfile } from "@/lib/illustration-styles";
import { getDefaultProductPlanForCreationMode, PLAN_CONFIGS } from "@/lib/plans";

export interface IsFirstRunOptions {
  isOffline?: boolean;
  loading?: boolean;
  userProfile?: {
    firstBookCreatedAt?: Timestamp | number | null;
    onboardingCompletedAt?: Timestamp | number | null;
  } | null;
}

/**
 * 初回判定ロジック
 * 仕様要点:
 * 1. loading 中またはオフライン時は初回扱いしない (false)
 * 2. ユーザープロファイルに firstBookCreatedAt または onboardingCompletedAt が存在する場合は初回扱いしない (false)
 * 3. 上記に該当しない場合、books 0冊 && children <= 1 の場合のみ初回扱い (true)
 */
export function isFirstRun(
  booksCount: number,
  childrenCount: number,
  options?: IsFirstRunOptions
): boolean {
  if (options?.loading || options?.isOffline) {
    return false;
  }
  if (
    options?.userProfile?.firstBookCreatedAt ||
    options?.userProfile?.onboardingCompletedAt
  ) {
    return false;
  }
  return booksCount === 0 && childrenCount <= 1;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
    ) as T;
  }
  return value;
}

function getTemplateBaseId(t: { id: string; variantOf?: string }): string {
  return t.variantOf ?? t.id.replace(/-\d+p$/, "");
}

/**
 * おすすめテンプレ3択の推薦ロジック
 * 仕様要点: 子どもの年齢 → age-reading-profile の年齢帯 → activeテンプレのorder上位3件 (新index禁止)
 */
export function getRecommendedTemplates(
  templates: (TemplateDoc & { id: string })[],
  childAge?: number
): (TemplateDoc & { id: string })[] {
  // 1. active かつ fixed_template のものを抽出
  const fixedTemplates = templates.filter(
    (t) => (t.creationMode ?? "guided_ai") === "fixed_template"
  );

  // 年齢帯が適合するテンプレを優先（指定がなければ全体）
  let matching = fixedTemplates.filter((t) => {
    if (!t.recommendedAgeMin && !t.recommendedAgeMax) return true;
    if (childAge === undefined || childAge === null) return true;
    const min = t.recommendedAgeMin ?? 0;
    const max = t.recommendedAgeMax ?? 99;
    return childAge >= min && childAge <= max;
  });

  if (matching.length === 0) {
    matching = fixedTemplates;
  }

  // baseId ごとに最小ページ数のものを 1 つ残す
  const uniqueMap = new Map<string, (TemplateDoc & { id: string })>();
  for (const t of matching) {
    const baseId = getTemplateBaseId(t);
    if (!uniqueMap.has(baseId)) {
      uniqueMap.set(baseId, t);
    } else {
      const existing = uniqueMap.get(baseId)!;
      const existingPages = existing.fixedStory?.pages?.length ?? 4;
      const currentPages = t.fixedStory?.pages?.length ?? 4;
      if (currentPages < existingPages) {
        uniqueMap.set(baseId, t);
      }
    }
  }

  // order 上位3件を返す
  return Array.from(uniqueMap.values())
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 3);
}

/**
 * Track A の初回おまかせ生成用ブックペロード構築
 */
export function buildFirstRunBookPayload({
  userId,
  child,
  template,
}: {
  userId: string;
  child: (ChildProfileDoc & { id?: string }) | null;
  template: TemplateDoc & { id: string };
}) {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
  const createdAtMs = Date.now();

  const childName = child?.nickname || child?.displayName || "おともだち";
  const childProfileSnapshot: ChildProfileSnapshot = child
    ? {
        displayName: child.displayName,
        nickname: child.nickname,
        age: child.age,
        genderExpression: child.genderExpression,
        personality: child.personality ?? {},
        visualProfile: {
          ...(child.visualProfile ?? { version: 1 }),
          referenceImageUrl: child.visualProfile?.referenceImageUrl || child.visualProfile?.approvedImageUrl,
          version: child.visualProfile?.version ?? 1,
        },
      }
    : {
        displayName: childName,
        personality: {},
        visualProfile: { version: 1 },
      };

  // TemplateDoc / FixedStoryTemplate にスタイル指定のフィールドは存在しないため、
  // Track A では既定スタイル(soft_watercolor)で作成する。
  // 将来テンプレートごとの既定スタイルを持たせる場合はここで解決する。
  const selectedStyle: IllustrationStyle = "soft_watercolor";
  const selectedStyleProfile = getIllustrationStyleProfile(selectedStyle);
  const productPlanParam = getDefaultProductPlanForCreationMode("fixed_template");
  const selectedPlanConfig = PLAN_CONFIGS[productPlanParam] ?? PLAN_CONFIGS.free;
  const pageCount = template.fixedStory?.pages?.length ?? 8;

  return stripUndefined({
    userId,
    childId: child?.id || null,
    childProfileSnapshot,
    characterUsage: {
      useRegisteredCharacter: Boolean(child),
      faceSource: "child_profile",
      outfitMode: "theme_auto",
      customOutfit: null,
      keepSignatureItem: true,
    },
    protagonistType: "child",
    title: "",
    theme: template.id,
    templateId: template.id,
    categoryGroupId: template.categoryGroupId ?? "favorite-worlds",
    creationMode: "fixed_template",
    isSinglePurchase: false,
    singlePurchaseType: "ai_guided",
    priceTier: template.priceTier ?? "take",
    storyCostLevel: template.storyCostLevel ?? "standard",
    productPlan: selectedPlanConfig.productPlan,
    imageQualityTier: selectedPlanConfig.imageQualityTier,
    imageModelProfile: selectedPlanConfig.imageModelProfile,
    characterConsistencyMode: selectedPlanConfig.characterConsistencyMode,
    style: selectedStyle,
    selectedStyleId: selectedStyleProfile.id,
    selectedStyleName: selectedStyleProfile.name,
    styleBible: selectedStyleProfile.styleBible,
    stylePreviewImageUrl: selectedStyleProfile.previewImageUrl,
    stylePreviewUsedAsReference: false,
    pageCount,
    status: "generating",
    progress: 0,
    input: {
      childName,
      ...(child?.age != null ? { childAge: child.age } : {}),
      ...(child?.personality?.favoriteThings?.length
        ? { favorites: child.personality.favoriteThings.join("、") }
        : {}),
    },
    createdAt: serverTimestamp(),
    createdAtMs,
    createdAtSource: "client_create",
    updatedAt: serverTimestamp(),
    updatedAtMs: createdAtMs,
    expiresAt,
  });
}
