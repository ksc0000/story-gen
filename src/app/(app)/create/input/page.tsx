"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { useChildren } from "@/lib/hooks/use-children";
import { useTemplates } from "@/lib/hooks/use-templates";
import { db } from "@/lib/firebase";
import { isDemoMode, saveDemoBook, loadDemoBook, updateDemoBook, type DemoBook } from "@/lib/demo";
import { getIllustrationStyleProfile } from "@/lib/illustration-styles";
import {
  getCompatiblePlanConfigs,
  getDefaultProductPlanForCreationMode,
  IMAGE_QUALITY_LABELS,
  PLAN_CONFIGS,
} from "@/lib/plans";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type {
  CharacterUsage,
  CharacterConsistencyMode,
  ChildProfileSnapshot,
  CreationMode,
  FixedStoryPageTemplate,
  IllustrationStyle,
  OutfitMode,
  PageVisualRole,
  ProductPlan,
  TemplateDoc,
} from "@/lib/types";

const PAGE_COUNT_OPTIONS = [
  { value: 4, label: "短い（4ページ）" },
  { value: 8, label: "ふつう（8ページ）" },
  { value: 12, label: "長い（12ページ）" },
] as const;

const STORY_REQUEST_PLACEHOLDERS: Record<string, string> = {
  memories: "例：初めて動物園に行った日のこと",
  "growth-support": "例：歯みがきを楽しくできるようになってほしい",
  bedtime: "例：今日がんばったことを思い出して安心して眠る話",
  imagination: "例：雲の上の国へ冒険に行く話",
  "seasonal-events": "例：クリスマスの日に家族で過ごした思い出",
};

const INPUT_LABELS: Record<string, string> = {
  childName: "お子さんの名前",
  place: "場所",
  familyMembers: "一緒に登場する人",
  parentMessage: "伝えたいメッセージ",
  lessonToTeach: "教えたいこと",
  memoryToRecreate: "再現したい思い出",
  storyRequest: "作りたい内容",
};

const TEMPLATE_PREVIEW_PLACEHOLDERS: Record<string, string> = {
  "{childName}": "お子さん",
  "{childAge}": "お子さんの年齢",
  "{favorites}": "好きなもの",
  "{lessonToTeach}": "伝えたいこと",
  "{memoryToRecreate}": "思い出",
  "{characterLook}": "お子さんらしい見た目",
  "{signatureItem}": "お気に入りのアイテム",
  "{colorMood}": "やさしい雰囲気",
  "{place}": "思い出の場所",
  "{familyMembers}": "家族",
  "{season}": "その季節",
  "{parentMessage}": "伝えたいメッセージ",
};

const ALLOWED_FIXED_TEMPLATE_PAGE_COUNTS = [4, 8, 12] as const;

const PAGE_VISUAL_ROLE_LABELS: Record<PageVisualRole, string> = {
  opening_establishing: "おはなしのはじまり",
  discovery: "発見シーン",
  action: "行動シーン",
  emotional_closeup: "気持ちのシーン",
  object_detail: "だいじなもののシーン",
  setback_or_question: "困りごと・問いのシーン",
  payoff: "締めのシーン",
  quiet_ending: "おやすみシーン",
};

function isAllowedFixedTemplatePageCount(value: number): value is 4 | 8 | 12 {
  return ALLOWED_FIXED_TEMPLATE_PAGE_COUNTS.includes(value as 4 | 8 | 12);
}

function getFixedTemplatePageCount(template?: (TemplateDoc & { id: string }) | null): number {
  const metadataPageCount = (template?.fixedStory as { pageCount?: number } | undefined)?.pageCount;
  if (typeof metadataPageCount === "number" && isAllowedFixedTemplatePageCount(metadataPageCount)) {
    return metadataPageCount;
  }

  const pagesLength = Array.isArray(template?.fixedStory?.pages) ? template.fixedStory.pages.length : 0;
  if (isAllowedFixedTemplatePageCount(pagesLength)) {
    return pagesLength;
  }

  return 4;
}

function formatTemplatePreviewText(text: string) {
  const replaced = Object.entries(TEMPLATE_PREVIEW_PLACEHOLDERS).reduce(
    (current, [placeholder, label]) => current.replaceAll(placeholder, label),
    text,
  );

  return replaced.replace(/\s+/g, " ").trim();
}

function shortenTemplatePreview(text: string, maxLength = 42) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;
}

function getFixedPageRoleLabel(page: FixedStoryPageTemplate, index: number, total: number) {
  if (page.pageVisualRole) {
    return PAGE_VISUAL_ROLE_LABELS[page.pageVisualRole] ?? `ページ ${index + 1}`;
  }

  const textTemplate = page.textTemplate ?? "";
  if (textTemplate.includes("{parentMessage}") || index === total - 1) {
    return "伝えたいメッセージ";
  }
  if (index === 0) {
    return "おはなしのはじまり";
  }
  if (index === 1) {
    return "発見や体験";
  }
  if (index === 2) {
    return "うれしかった瞬間";
  }
  return `ページ ${index + 1}`;
}

function shouldShowTemplateField(field: string, requiredInputs: string[], optionalInputs: string[]) {
  return field === "parentMessage" || requiredInputs.includes(field) || optionalInputs.includes(field);
}

function getMissingTemplateFields(params: {
  requiredInputs: string[];
  place: string;
  familyMembers: string;
  parentMessage: string;
  lessonToTeach: string;
  memoryToRecreate: string;
  storyRequest: string;
}) {
  const fieldValues: Record<string, string> = {
    place: params.place,
    familyMembers: params.familyMembers,
    parentMessage: params.parentMessage,
    lessonToTeach: params.lessonToTeach,
    memoryToRecreate: params.memoryToRecreate,
    storyRequest: params.storyRequest,
  };

  return params.requiredInputs.filter((field) => field !== "childName" && !(fieldValues[field]?.trim()));
}

function InputPageContent() {
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme") ?? "";
  const childId = searchParams.get("childId") ?? "";
  const mode = (searchParams.get("mode") as CreationMode | null) ?? "guided_ai";
  const style = (searchParams.get("style") as IllustrationStyle | null) ?? "soft_watercolor";
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useAdminClaim();
  const { children, loading: childrenLoading } = useChildren(user?.uid);
  const { templates, loading: templatesLoading } = useTemplates();
  const child = children.find((item) => item.id === childId) ?? null;
  const template = templates.find((item) => item.id === theme);
  const creationMode = template?.creationMode ?? mode;
  const childName = child?.nickname || child?.displayName || "";

  // Find all templates with the same name to allow page count selection for fixed templates
  const relatedTemplates = useMemo(() => {
    if (creationMode !== "fixed_template" || !template) return [];
    return templates.filter((t) => t.name === template.name && t.creationMode === "fixed_template");
  }, [creationMode, template, templates]);

  const fixedStoryPages = template?.fixedStory?.pages ?? [];
  const storyPlaceholder = STORY_REQUEST_PLACEHOLDERS[template?.categoryGroupId ?? ""] ?? "例：うちの子らしい冒険のおはなし";
  const requiredInputs = useMemo(() => template?.requiredInputs ?? [], [template]);
  const optionalInputs = useMemo(() => template?.optionalInputs ?? [], [template]);
  const compatiblePlans = useMemo(
    () => getCompatiblePlanConfigs(creationMode),
    [creationMode]
  );
  const allowUpcomingPlans = isAdmin || process.env.NODE_ENV === "development";
  const visiblePlans = useMemo(
    () => compatiblePlans.filter((plan) => plan.enabled || allowUpcomingPlans),
    [compatiblePlans, allowUpcomingPlans]
  );
  const defaultProductPlan = useMemo(() => {
    const fallback = getDefaultProductPlanForCreationMode(creationMode);
    return compatiblePlans.find((plan) => plan.productPlan === fallback)?.productPlan
      ?? compatiblePlans[0]?.productPlan
      ?? fallback;
  }, [compatiblePlans, creationMode]);

  const [pageCount, setPageCount] = useState<number>(8);

  // Sync pageCount with template when theme changes
  useEffect(() => {
    if (template && creationMode === "fixed_template") {
      setPageCount(getFixedTemplatePageCount(template));
    }
  }, [template, creationMode]);
  const [productPlan, setProductPlan] = useState<ProductPlan>(defaultProductPlan);
  const [storyRequest, setStoryRequest] = useState("");
  const [lessonToTeach, setLessonToTeach] = useState("");
  const [memoryToRecreate, setMemoryToRecreate] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [place, setPlace] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [outfitMode, setOutfitMode] = useState<OutfitMode>("profile_default");
  const [customOutfit, setCustomOutfit] = useState("");
  const [keepSignatureItem, setKeepSignatureItem] = useState(true);
  const [showOptional, setShowOptional] = useState(creationMode === "fixed_template");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedPlanConfig = PLAN_CONFIGS[productPlan] ?? PLAN_CONFIGS.free;
  const planPageCountOptions = PAGE_COUNT_OPTIONS.filter((option) =>
    selectedPlanConfig.allowedPageCounts.includes(option.value)
  );
  const missingTemplateFields = getMissingTemplateFields({
    requiredInputs,
    place,
    familyMembers,
    parentMessage,
    lessonToTeach,
    memoryToRecreate,
    storyRequest,
  });
  const canProceed = Boolean(childId && child && theme) && (creationMode !== "fixed_template" || missingTemplateFields.length === 0);


  useEffect(() => {
    if (!compatiblePlans.some((plan) => plan.productPlan === productPlan)) {
      setProductPlan(defaultProductPlan);
    }
  }, [compatiblePlans, defaultProductPlan, productPlan]);

  useEffect(() => {
    if (creationMode === "fixed_template") return;
    if (!selectedPlanConfig.allowedPageCounts.includes(pageCount as 4 | 8 | 12)) {
      setPageCount(selectedPlanConfig.defaultPageCount);
    }
  }, [creationMode, pageCount, selectedPlanConfig]);

  const simulateDemoGeneration = async (bookId: string) => {
    const demoPages = [
      { text: "むかしむかし、あるところに。", imagePrompt: "A magical storybook opening" },
      { text: `${childName}がいました。`, imagePrompt: "A happy child" },
      { text: "きょうはとくべつな日。", imagePrompt: "A special moment" },
      { text: "すべてが新しくはじまります。", imagePrompt: "A new beginning" },
    ];

    for (let i = 0; i < demoPages.length; i++) {
      const page = {
        id: `page-${i}`,
        pageNumber: i,
        text: demoPages[i].text,
        imageUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3e8ff' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='%23a78bfa'%3EDemo Image %23${i + 1}%3C/text%3E%3C/svg%3E`,
        imagePrompt: demoPages[i].imagePrompt,
        status: "completed" as const,
      };

      updateDemoBook(bookId, {
        pages: [...(loadDemoBook(bookId)?.pages ?? []), page],
        progress: Math.round(((i + 1) / demoPages.length) * 100),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    updateDemoBook(bookId, {
      title: template?.name || `${childName}の絵本`,
      status: "completed",
      progress: 100,
    });
  };

  const handleCreate = async () => {
    if (!style || !user || !template) return;
    setCreating(true);
    setCreateError(null);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      const createdAtMs = Date.now();
      const selectedStyleProfile = getIllustrationStyleProfile(style);
      let bookId: string;

      if (isDemoMode) {
        bookId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const demoBook: DemoBook = {
          id: bookId,
          title: "",
          theme,
          style: style,
          pageCount,
          productPlan: selectedPlanConfig.productPlan,
          imageQualityTier: selectedPlanConfig.imageQualityTier,
          characterConsistencyMode: selectedPlanConfig.characterConsistencyMode,
          status: "generating",
          progress: 0,
          pages: [],
        };
        saveDemoBook(demoBook);
        simulateDemoGeneration(bookId).catch(console.error);
      } else {
        const childProfileSnapshot = child
          ? buildChildProfileSnapshot(child)
          : buildLegacyChildProfileSnapshot({ childName });
        const characterUsage: CharacterUsage = {
          useRegisteredCharacter: Boolean(child),
          faceSource: "child_profile",
          outfitMode,
          customOutfit: customOutfit || null,
          keepSignatureItem,
        };
        const bookPayload = stripUndefined({
          userId: user.uid,
          childId: childId || null,
          childProfileSnapshot,
          characterUsage,
          title: "",
          theme,
          templateId: theme,
          categoryGroupId: template.categoryGroupId ?? "favorite-worlds",
          creationMode: template.creationMode ?? "guided_ai",
          priceTier: template.priceTier ?? "take",
          storyCostLevel: template.storyCostLevel ?? "standard",
          productPlan: selectedPlanConfig.productPlan,
          imageQualityTier: selectedPlanConfig.imageQualityTier,
          imageModelProfile: selectedPlanConfig.imageModelProfile,
          characterConsistencyMode: selectedPlanConfig.characterConsistencyMode as CharacterConsistencyMode,
          style: style,
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
            ...(child?.age ? { childAge: child.age } : {}),
            ...(child?.personality?.favoriteThings?.length
              ? { favorites: child.personality.favoriteThings.join("、") }
              : {}),
            ...(storyRequest ? { storyRequest } : {}),
            ...(lessonToTeach ? { lessonToTeach } : {}),
            ...(memoryToRecreate ? { memoryToRecreate } : {}),
            ...(familyMembers ? { familyMembers } : {}),
            ...(place ? { place } : {}),
            ...(parentMessage ? { parentMessage } : {}),
          },
          createdAt: serverTimestamp(),
          createdAtMs,
          createdAtSource: "client_create",
          updatedAt: serverTimestamp(),
          updatedAtMs: createdAtMs,
          expiresAt,
        });
        const bookRef = await addDoc(collection(db, "books"), bookPayload);
        bookId = bookRef.id;
      }

      trackAnalyticsEvent("start_book_generation", {
        productPlan: selectedPlanConfig.productPlan,
        imageQualityTier: selectedPlanConfig.imageQualityTier,
        pageCount,
        creationMode: creationMode,
        templateId: template.id,
      });

      router.push(`/generating?id=${bookId}`);
    } catch (err) {
      console.error("Failed to create book:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setCreateError(`絵本の作成を開始できませんでした: ${message}`);
      setCreating(false);
    }
  };

  const handleNext = () => {
    const params = new URLSearchParams();
    const finalTemplate = relatedTemplates.find((t) => getFixedTemplatePageCount(t) === pageCount) || template;
    params.set("theme", finalTemplate?.id ?? theme);
    params.set("mode", creationMode);
    if (childId) params.set("childId", childId);
    params.set("productPlan", productPlan);
    params.set("outfitMode", outfitMode);
    params.set("keepSignatureItem", String(keepSignatureItem));
    if (creationMode !== "fixed_template") {
      params.set("pageCount", String(pageCount));
    }
    if (storyRequest) params.set("storyRequest", storyRequest);
    if (lessonToTeach) params.set("lessonToTeach", lessonToTeach);
    if (memoryToRecreate) params.set("memoryToRecreate", memoryToRecreate);
    if (familyMembers) params.set("familyMembers", familyMembers);
    if (place) params.set("place", place);
    if (parentMessage) params.set("parentMessage", parentMessage);
    if (customOutfit) params.set("customOutfit", customOutfit);
    router.push(`/create/style?${params.toString()}`);
  };

  const primaryFieldLabel =
    creationMode === "fixed_template"
      ? "このテンプレートに入れる情報"
      : creationMode === "original_ai"
        ? "どんな絵本にしたい？"
        : "今回の絵本で描きたいこと";

  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <StepIndicator currentStep={2} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">内容を入力してください</h1>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div className="rounded-2xl bg-purple-50 p-4 text-sm text-violet-600">
            {childrenLoading
              ? "主人公を確認中..."
              : child
                ? `主人公: ${child.nickname || child.displayName}${child.age ? `（${child.age}歳）` : ""}`
                : "主人公が選択されていません。戻って選択してください。"}
          </div>

          {templatesLoading ? (
            <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-500">テンプレート情報を読み込み中...</div>
          ) : template ? (
            <div className="rounded-2xl border border-[rgba(240,171,252,0.3)] bg-white p-4 text-sm text-violet-600">
              <p className="font-semibold text-purple-900">{template.name}</p>
              <p className="mt-1">{template.description}</p>
              {creationMode === "fixed_template" ? (
                <div className="mt-2 space-y-1 text-xs text-violet-500">
                  <p>
                    必須: {requiredInputs.map((item) => INPUT_LABELS[item] ?? item).join(" / ") || "お子さんの名前"}
                  </p>
                  <p>
                    任意: {optionalInputs.map((item) => INPUT_LABELS[item] ?? item).join(" / ") || "なし"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 rounded-3xl border border-[rgba(240,171,252,0.3)] bg-[rgba(250,245,255,0.8)] p-4">
            <div>
              <p className="text-base font-semibold text-purple-900">どんな絵本にしますか？</p>
              <p className="mt-1 text-sm text-violet-600">
                ページ数と画質を選べます。まずは短く試すことも、きれいに残すこともできます。
              </p>
            </div>
            {visiblePlans.length === 1 ? (
              <p className="text-sm text-violet-500">無料プランで作成します</p>
            ) : (
              <div className="grid gap-3">
                {visiblePlans.map((plan) => {
                  const locked = !plan.enabled && !allowUpcomingPlans;
                  const selectedPlan = productPlan === plan.productPlan;
                  return (
                    <button
                      key={plan.productPlan}
                      type="button"
                      onClick={() => {
                        if (locked) return;
                        setProductPlan(plan.productPlan);
                        trackAnalyticsEvent("select_product_plan", {
                          productPlan: plan.productPlan,
                          imageQualityTier: plan.imageQualityTier,
                          creationMode,
                        });
                      }}
                      className={`rounded-3xl border p-4 text-left transition ${
                        selectedPlan
                          ? "border-purple-400 bg-white shadow-sm"
                          : "border-[rgba(240,171,252,0.3)] bg-white/80"
                      } ${locked ? "cursor-not-allowed opacity-65" : "hover:border-purple-300"}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-purple-900">{plan.label}</p>
                        {plan.badgeLabels.map((badge) => (
                          <span
                            key={`${plan.productPlan}-${badge}`}
                            className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                          >
                            {badge}
                          </span>
                        ))}
                        {!plan.enabled ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                            準備中
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-violet-600">{plan.description}</p>
                      <div className="mt-3 space-y-1 text-xs text-violet-500">
                        <p>ページ数: {plan.allowedPageCounts.join(" / ")}ページ</p>
                        <p>
                          画質: {IMAGE_QUALITY_LABELS[plan.imageQualityTier].label}
                          {" ・ "}
                          {IMAGE_QUALITY_LABELS[plan.imageQualityTier].description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {!allowUpcomingPlans && visiblePlans.length === 0 ? (
              <p className="text-xs leading-relaxed text-violet-500">
                この作り方の有料プランは準備中です。現在は内部の標準設定で作成フローを進めます。
              </p>
            ) : null}
          </div>

          {creationMode === "original_ai" ? (
            <div>
              <Label htmlFor="storyRequest" className="text-purple-800">{primaryFieldLabel}</Label>
              <textarea
                id="storyRequest"
                value={storyRequest}
                onChange={(e) => setStoryRequest(e.target.value)}
                placeholder="自由に書いてOKです。主人公、場所、気持ち、起きてほしいことなどをまとめて書けます。"
                className="mt-1 min-h-40 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                rows={6}
                maxLength={800}
              />
            </div>
          ) : creationMode === "fixed_template" ? (
            <div className="space-y-3">
              <p className="text-sm text-violet-600">
                このテンプレートに必要な情報だけ入れると、早く安定して絵本を作れます。
              </p>
              <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-600">
                <p className="font-medium text-purple-900">{primaryFieldLabel}</p>
              </div>
              {fixedStoryPages.length ? (
                <div className="rounded-2xl border border-[rgba(216,180,254,0.45)] bg-[rgba(250,245,255,0.95)] p-4">
                  <div className="mt-0">
                    <p className="text-sm font-medium text-purple-900">この絵本の流れ</p>
                    <div className="mt-3 space-y-3">
                      {fixedStoryPages.map((page, index) => {
                        const previewText = shortenTemplatePreview(formatTemplatePreviewText(page.textTemplate));
                        return (
                          <div key={`${theme || "template"}-preview-${index}`} className="rounded-2xl bg-white/90 p-3">
                            <p className="text-xs font-semibold text-purple-700">
                              {index + 1}ページ目: {getFixedPageRoleLabel(page, index, fixedStoryPages.length)}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-violet-600">{previewText}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
              {shouldShowTemplateField("place", requiredInputs, optionalInputs) ? (
                <div>
                  <Label htmlFor="place-fixed" className="text-purple-800">どこでの思い出？</Label>
                  <Input
                    id="place-fixed"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="例：上野動物園、近所の公園"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}
              {shouldShowTemplateField("familyMembers", requiredInputs, optionalInputs) ? (
                <div>
                  <Label htmlFor="familyMembers-fixed" className="text-purple-800">だれと一緒だった？</Label>
                  <Input
                    id="familyMembers-fixed"
                    value={familyMembers}
                    onChange={(e) => setFamilyMembers(e.target.value)}
                    placeholder="例：ママ、パパ、おばあちゃん"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="parentMessage-fixed" className="text-purple-800">伝えたいメッセージ</Label>
                <textarea
                  id="parentMessage-fixed"
                  value={parentMessage}
                  onChange={(e) => setParentMessage(e.target.value)}
                  placeholder="例：また一緒に行こうね"
                  className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  rows={3}
                  maxLength={200}
                />
                <p className="mt-1.5 text-xs text-violet-500">
                  絵本の最後に入るメッセージです。お子さんが読みやすいよう、ひらがな多めでの入力がおすすめです。
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="storyRequest" className="text-purple-800">{primaryFieldLabel}</Label>
              <Input
                id="storyRequest"
                value={storyRequest}
                onChange={(e) => setStoryRequest(e.target.value)}
                placeholder={storyPlaceholder}
                className="mt-1"
                maxLength={200}
              />
            </div>
          )}

          {((creationMode === "fixed_template" && relatedTemplates.length > 1) ||
            (creationMode !== "fixed_template" && planPageCountOptions.length > 1)) && (
            <div>
              <Label className="text-purple-800">ページ数</Label>
              <div className="mt-1 flex gap-2">
                {creationMode === "fixed_template"
                  ? relatedTemplates
                      .map((t) => ({ value: getFixedTemplatePageCount(t), label: `${getFixedTemplatePageCount(t)}ページ` }))
                      .sort((a, b) => a.value - b.value)
                      .map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPageCount(opt.value)}
                          className={`flex-1 rounded-full border px-2 py-2 text-xs transition ${
                            pageCount === opt.value
                              ? "border-purple-400 bg-[rgba(167,139,250,0.1)] font-medium text-purple-700"
                              : "border-[rgba(240,171,252,0.3)] text-violet-400 hover:border-purple-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))
                  : planPageCountOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPageCount(opt.value)}
                        className={`flex-1 rounded-full border px-2 py-2 text-xs transition ${
                          pageCount === opt.value
                            ? "border-purple-400 bg-[rgba(167,139,250,0.1)] font-medium text-purple-700"
                            : "border-[rgba(240,171,252,0.3)] text-violet-400 hover:border-purple-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-sm text-violet-600 hover:underline"
          >
            {showOptional ? "▲ シンプルに戻す" : "▼ もっとカスタマイズ"}
          </button>

          {showOptional && (
            <div className="space-y-4 border-t border-[rgba(240,171,252,0.3)] pt-4">
              <div className="space-y-2">
                <Label className="text-purple-800">服装をどうしますか？</Label>
                <div className="grid gap-2">
                  {[
                    { value: "profile_default", label: "いつもの服装を使う" },
                    { value: "theme_auto", label: "絵本テーマに合わせてAIにおまかせ" },
                    { value: "user_custom", label: "自分で指定する" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOutfitMode(option.value as OutfitMode)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                        outfitMode === option.value
                          ? "border-purple-400 bg-purple-50 text-purple-700"
                          : "border-[rgba(240,171,252,0.3)] text-violet-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {outfitMode === "user_custom" ? (
                <div>
                  <Label htmlFor="customOutfit" className="text-purple-800">指定したい服装</Label>
                  <Input
                    id="customOutfit"
                    value={customOutfit}
                    onChange={(e) => setCustomOutfit(e.target.value)}
                    placeholder="例：赤いパーカー、黄色い長靴、白いリュック"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-2 rounded-2xl bg-purple-50 p-3 text-sm text-violet-600">
                <input type="checkbox" checked={keepSignatureItem} onChange={(e) => setKeepSignatureItem(e.target.checked)} />
                固定アイテムをできるだけ出す
              </label>

              {creationMode !== "fixed_template" ? (
                <div>
                  <Label htmlFor="lesson" className="text-purple-800">教えたいこと</Label>
                  <Input
                    id="lesson"
                    value={lessonToTeach}
                    onChange={(e) => setLessonToTeach(e.target.value)}
                    placeholder="例：はみがきをがんばる"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
              ) : null}

              {creationMode !== "fixed_template" ? (
                <>
                  <div>
                    <Label htmlFor="place-optional" className="text-purple-800">場所</Label>
                    <Input
                      id="place-optional"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="例：上野動物園、近所の公園"
                      className="mt-1"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <Label htmlFor="familyMembers" className="text-purple-800">一緒に登場させたい人</Label>
                    <Input
                      id="familyMembers"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(e.target.value)}
                      placeholder="例：ママ、パパ、おばあちゃん"
                      className="mt-1"
                      maxLength={200}
                    />
                  </div>
                </>
              ) : null}

              {creationMode !== "fixed_template" ? (
                <div>
                  <Label htmlFor="memory" className="text-purple-800">再現したい思い出</Label>
                  <textarea
                    id="memory"
                    value={memoryToRecreate}
                    onChange={(e) => setMemoryToRecreate(e.target.value)}
                    placeholder="例：おばあちゃんの家に遊びに行った"
                    className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    rows={3}
                    maxLength={200}
                  />
                </div>
              ) : null}

              {creationMode !== "fixed_template" ? (
                <div>
                  <Label htmlFor="parentMessage" className="text-purple-800">伝えたいメッセージ</Label>
                  <textarea
                    id="parentMessage"
                    value={parentMessage}
                    onChange={(e) => setParentMessage(e.target.value)}
                    placeholder="例：これからもたくさん一緒に冒険しようね"
                    className="mt-1 w-full rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    rows={3}
                    maxLength={200}
                  />
                  <p className="mt-1.5 text-xs text-violet-500">
                    絵本の最後に入るメッセージです。お子さんが読みやすいよう、ひらがな多めでの入力がおすすめです。
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      {creationMode === "fixed_template" && missingTemplateFields.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-rose-600">テンプレートに必要な情報を入力してください</p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button size="lg" className="w-full" disabled={!canProceed} onClick={handleNext}>
            次へ
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/90 p-3">
      <p className="text-xs font-medium text-violet-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-purple-900">{value}</p>
    </div>
  );
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
    ) as T;
  }
  return value;
}

function buildLegacyChildProfileSnapshot(params: { childName: string }): ChildProfileSnapshot {
  return {
    displayName: params.childName,
    personality: {},
    visualProfile: {
      version: 1,
    },
  };
}

function buildChildProfileSnapshot(child: ChildProfileSnapshot & { id?: string }): ChildProfileSnapshot {
  return {
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
  };
}

export default function InputPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <InputPageContent />
    </Suspense>
  );
}
