"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { StylePicker } from "@/components/style-picker";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { useTemplates } from "@/lib/hooks/use-templates";
import { db } from "@/lib/firebase";
import { isDemoMode, saveDemoBook, loadDemoBook, updateDemoBook, type DemoBook } from "@/lib/demo";
import { getAgeReadingDisplayProfile } from "@/lib/age-reading-profile";
import {
  CHARACTER_CONSISTENCY_LABELS,
  CREATION_MODE_LABELS,
  getDefaultProductPlanForCreationMode,
  IMAGE_QUALITY_LABELS,
  OUTFIT_MODE_LABELS,
  PLAN_CONFIGS,
} from "@/lib/plans";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type {
  CharacterUsage,
  CharacterConsistencyMode,
  ChildProfileSnapshot,
  IllustrationStyle,
  OutfitMode,
  PageCount,
  ProductPlan,
} from "@/lib/types";

function StyleSelectionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren(user?.uid);
  const { templates } = useTemplates();
  const [selected, setSelected] = useState<IllustrationStyle | null>("soft_watercolor");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const theme = searchParams.get("theme") ?? "";
  const childId = searchParams.get("childId");
  const child = children.find((item) => item.id === childId) ?? null;
  const template = templates.find((item) => item.id === theme);
  const childName = child?.nickname || child?.displayName || "";
  const mode = (searchParams.get("mode") ?? template?.creationMode ?? "guided_ai") as
    | "fixed_template"
    | "guided_ai"
    | "original_ai";
  const productPlanParam = (searchParams.get("productPlan") as ProductPlan | null)
    ?? getDefaultProductPlanForCreationMode(mode);
  const selectedPlanConfig = PLAN_CONFIGS[productPlanParam] ?? PLAN_CONFIGS.free;
  const pageCountParam = Number(searchParams.get("pageCount") ?? "8") as PageCount;
  const fixedPageCount = template?.fixedStory?.pages.length;
  const pageCount = (
    mode === "fixed_template" && fixedPageCount
      ? fixedPageCount
      : selectedPlanConfig.allowedPageCounts.includes(pageCountParam)
        ? pageCountParam
        : selectedPlanConfig.defaultPageCount
  ) as PageCount;
  const storyRequest = searchParams.get("storyRequest");
  const lessonToTeach = searchParams.get("lessonToTeach");
  const memoryToRecreate = searchParams.get("memoryToRecreate");
  const familyMembers = searchParams.get("familyMembers");
  const place = searchParams.get("place");
  const parentMessage = searchParams.get("parentMessage");
  const outfitMode = (searchParams.get("outfitMode") ?? "profile_default") as OutfitMode;
  const customOutfit = searchParams.get("customOutfit");
  const keepSignatureItem = searchParams.get("keepSignatureItem") !== "false";
  const qualityLabel = IMAGE_QUALITY_LABELS[selectedPlanConfig.imageQualityTier];
  const consistencyLabel = CHARACTER_CONSISTENCY_LABELS[selectedPlanConfig.characterConsistencyMode];
  const creationModeLabel = CREATION_MODE_LABELS[mode];
  const outfitModeLabel = OUTFIT_MODE_LABELS[outfitMode];
  const ageReadingProfile = getAgeReadingDisplayProfile(child?.age);
  const hasChildAge = typeof child?.age === "number";

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
    if (!selected || !user || !template) return;
    setCreating(true);
    setCreateError(null);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      const createdAtMs = Date.now();
      let bookId: string;

      if (isDemoMode) {
        bookId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const demoBook: DemoBook = {
          id: bookId,
          title: "",
          theme,
          style: selected,
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
          style: selected,
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
        creationMode: mode,
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

  return (
    <PageTransition className="mx-auto max-w-5xl px-4 py-8">
      <StepIndicator currentStep={3} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">絵のタッチを選んでね</h1>
      <p className="mt-2 text-center text-sm text-violet-500">
        {childName ? `${childName}を主人公にします。` : "主人公が未選択です。"}
        {template ? ` ${template.name} をこのタッチで仕上げます。` : ""}迷ったら「やさしい水彩」のままで大丈夫です。
      </p>
      <div className="mt-6"><StylePicker selected={selected} onSelect={setSelected} /></div>
      <div className="mx-auto mt-6 max-w-3xl rounded-3xl border border-[rgba(216,180,254,0.45)] bg-[rgba(250,245,255,0.96)] p-5">
        <h2 className="text-base font-semibold text-purple-900">作成内容を確認</h2>
        <p className="mt-1 text-sm text-violet-600">
          この内容で絵本を作ります。あとから本棚で確認できます。
        </p>
        <div className="mt-3 rounded-2xl bg-violet-50 p-4 text-sm text-violet-600">
          <p className="font-medium text-purple-900">年齢に合わせた文章レベル</p>
          <p className="mt-1">
            登録された年齢に合わせて、文章量や言葉のむずかしさを調整します。
          </p>
          {!hasChildAge ? (
            <p className="mt-2 text-xs leading-relaxed text-violet-500">
              年齢が未登録のため、3〜6歳向けの標準設定で作成します。年齢を登録すると、より合った文章量に調整できます。
            </p>
          ) : null}
          {mode === "fixed_template" ? (
            <p className="mt-2 text-xs leading-relaxed text-violet-500">
              AI生成のお話では、年齢に合わせて文章量を調整します。テンプレート絵本では、今後さらに細かく対応予定です。
            </p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryItem label="プラン名" value={selectedPlanConfig.label} />
          <SummaryItem label="ページ数" value={`${pageCount}ページ`} />
          <SummaryItem
            label="画質"
            value={`${qualityLabel.label} / ${qualityLabel.description}`}
          />
          <SummaryItem
            label="一貫性"
            value={`${consistencyLabel.label} / ${consistencyLabel.description}`}
          />
          <SummaryItem label="作成モード" value={creationModeLabel} />
          <SummaryItem label="主人公名" value={childName || "未設定"} />
          <SummaryItem label="テーマ名" value={template?.name ?? "未設定"} />
          <SummaryItem label="文章レベル" value={hasChildAge ? ageReadingProfile.label : "3〜6歳向けの標準設定"} />
          <SummaryItem label="本文量" value={ageReadingProfile.targetCharsPerPage} />
          <SummaryItem label="お話の深さ" value={ageReadingProfile.storyLevelSummary} />
          <SummaryItem label="服装モード" value={outfitModeLabel} />
          <SummaryItem
            label="固定アイテム"
            value={keepSignatureItem ? "できるだけ出す" : "必要な場面だけにする"}
          />
          <SummaryItem label="文章の雰囲気" value={ageReadingProfile.uiDescription} />
        </div>
      </div>
      {createError ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">生成を開始できませんでした</p>
          <p className="mt-1 break-words">{createError}</p>
        </div>
      ) : null}
      <div className="mt-8 flex justify-center">
        <Button onClick={handleCreate} disabled={!selected || creating || !childName || !template} size="lg" className="px-8 py-6 text-lg">
          {creating ? "絵本を作っています..." : "絵本を作る！"}
        </Button>
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

export default function StyleSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <StyleSelectionPageContent />
    </Suspense>
  );
}
