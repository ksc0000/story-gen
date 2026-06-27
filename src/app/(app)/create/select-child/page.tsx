"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { StepIndicator } from "@/components/step-indicator";
import { AvatarNudgeBanner } from "@/components/avatar-nudge-banner";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { childProfileToSummary } from "@/lib/child-profile";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useCompanions } from "@/app/(app)/companions/use-companions-hook";
import {
  getSpeciesEmoji,
  getSpeciesLabel,
  COMPANION_PRESETS,
  SPECIES_OPTIONS,
  buildVisualDescription,
} from "@/app/(app)/companions/companions-utils";

type ProtagonistChoice =
  | { type: "child"; childId: string }
  | { type: "companion_preset"; presetId: string; companionName: string; companionVisualDescription: string }
  | { type: "companion_my"; companionId: string; companionName: string; companionVisualDescription: string }
  | null;

function SelectChildContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { children, loading, error } = useChildren(user?.uid);
  const { companions, loading: companionsLoading } = useCompanions(user?.uid);
  const { profile } = useUserProfile(user?.uid);
  const { isAdmin } = useAdminClaim();
  const [choice, setChoice] = useState<ProtagonistChoice>(null);

  const productPlan = resolveProductPlan(profile);
  const planConfig = PLAN_CONFIGS[productPlan];
  const isChildLimitReached = children.length >= planConfig.maxChildren;

  const quota = planConfig?.monthlyBookQuota ?? 1;
  const consumed = profile?.monthlyGenerationCount ?? 0;
  const remaining = Math.max(0, quota - consumed);
  const isUnlimited = isAdmin || profile?.generationOverride?.bypassMonthlyLimit === true;
  const isGenerationLimitReached = !isUnlimited && remaining <= 0;

  const handleNext = () => {
    if (!choice) return;

    if (choice.type === "child") {
      router.push(`/create/theme?childId=${choice.childId}`);
      return;
    }

    // Companion as protagonist
    const params = new URLSearchParams();
    params.set("protagonistType", "companion");
    if (choice.type === "companion_my") {
      params.set("companionId", choice.companionId);
    }
    params.set("companionName", choice.companionName);
    params.set("companionVisualDescription", choice.companionVisualDescription);
    router.push(`/create/theme?${params.toString()}`);
  };

  const selectedChildId = choice?.type === "child" ? choice.childId : null;

  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <BackButton className="mb-3" />
      <StepIndicator currentStep={1} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">誰を主人公にしますか？</h1>
        <p className="mt-1 text-sm text-violet-500">子どもまたはなかよしキャラクターを選べます。</p>
      </div>

      {isGenerationLimitReached && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="font-semibold text-amber-800">今月の絵本生成上限に達しています</p>
          <p className="mt-1 text-sm text-amber-600">プランをアップグレードするとさらに絵本を作れます。</p>
          <Link href="/pricing">
            <Button size="sm" className="mt-3">プランを見る</Button>
          </Link>
        </div>
      )}

      {loading || companionsLoading ? (
        <p className="mt-10 text-center text-violet-400">読み込み中...</p>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          {error.message}
        </div>
      ) : children.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-8 text-center">
          <p className="text-violet-500">先に子どもプロフィールを登録しましょう。</p>
          <Link href="/onboarding/child" className="mt-4 inline-block">
            <Button>子どもを登録する</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* 子ども */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setChoice({ type: "child", childId: child.id })}
                className="text-left"
              >
                <div
                  className={cn(
                    "h-full rounded-2xl border bg-white transition-all",
                    selectedChildId === child.id
                      ? "border-purple-400 ring-2 ring-purple-200 shadow-md"
                      : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
                  )}
                >
                  {child.visualProfile?.approvedImageUrl ? (
                    <Image
                      src={child.visualProfile.approvedImageUrl}
                      alt={`${child.nickname || child.displayName}のキャラクター`}
                      width={400}
                      height={300}
                      className="aspect-[4/3] w-full rounded-t-2xl object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-t-2xl bg-violet-50 text-4xl sm:text-5xl">
                      👶
                    </div>
                  )}
                  <div className="p-3 sm:p-4">
                    <p className="text-sm font-bold text-purple-900 sm:text-base">
                      {child.nickname || child.displayName}
                    </p>
                    <p className="text-xs text-violet-400">
                      {child.displayName}
                      {child.age ? ` / ${child.age}歳` : ""}
                    </p>
                    {childProfileToSummary(child) ? (
                      <p className="mt-2 hidden text-xs leading-relaxed text-violet-500 sm:block">
                        {childProfileToSummary(child)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* なかよしキャラを主人公に */}
          {(COMPANION_PRESETS.length > 0 || companions.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-purple-900">⭐ なかよしキャラを主人公にする</h2>
                <Badge variant="secondary" className="border-none bg-amber-100 text-amber-700 text-xs">新機能</Badge>
              </div>

              {/* 公式プリセット */}
              <div className="grid grid-cols-1 gap-2">
                {COMPANION_PRESETS.map((preset) => {
                  const speciesOpt = SPECIES_OPTIONS.find((o) => o.value === preset.species);
                  const isSelected = choice?.type === "companion_preset" && choice.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const vd = buildVisualDescription({
                          species: preset.species,
                          personalities: preset.personality,
                          ability: preset.ability,
                          color: preset.color,
                          bodyType: preset.bodyType,
                          colorDepth: preset.colorDepth,
                          size: preset.size,
                          pattern: preset.pattern,
                          accessories: preset.accessories,
                        });
                        setChoice({ type: "companion_preset", presetId: preset.id, companionName: preset.defaultName, companionVisualDescription: vd });
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-white p-3 transition-all text-left",
                        isSelected
                          ? "border-amber-400 ring-2 ring-amber-200 shadow-md"
                          : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
                      )}
                    >
                      {speciesOpt?.imageUrl ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                          <Image src={speciesOpt.imageUrl} alt={preset.defaultName} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                          {speciesOpt?.emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-purple-900 text-sm">{preset.defaultName}</p>
                        <p className="text-xs text-violet-400 truncate">{preset.tagline}</p>
                      </div>
                      {isSelected && <Badge className="shrink-0 bg-amber-400 text-white border-none text-xs">主人公</Badge>}
                    </button>
                  );
                })}
              </div>

              {/* マイなかよしキャラ */}
              {companions.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {companions.map((companion) => {
                    const isSelected = choice?.type === "companion_my" && choice.companionId === companion.id;
                    return (
                      <button
                        key={companion.id}
                        type="button"
                        onClick={() =>
                          setChoice({
                            type: "companion_my",
                            companionId: companion.id,
                            companionName: companion.name,
                            companionVisualDescription: companion.visualDescription,
                          })
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-white p-3 transition-all text-left",
                          isSelected
                            ? "border-amber-400 ring-2 ring-amber-200 shadow-md"
                            : "border-violet-100 hover:border-purple-300 hover:shadow-sm"
                        )}
                      >
                        {companion.generatedImageUrl ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-violet-100">
                            <Image src={companion.generatedImageUrl} alt={companion.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                            {getSpeciesEmoji(companion.species)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-purple-900 text-sm">{companion.name}</p>
                          <p className="text-xs text-violet-400">{getSpeciesLabel(companion.species)}</p>
                        </div>
                        {isSelected && <Badge className="shrink-0 bg-amber-400 text-white border-none text-xs">主人公</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedChildId &&
        !children.find((c) => c.id === selectedChildId)?.visualProfile?.approvedImageUrl && (
          <div className="mt-6">
            <AvatarNudgeBanner childId={selectedChildId} />
          </div>
        )}

      <div className="mt-5 text-center">
        {isChildLimitReached ? (
          <p className="text-sm text-violet-300">プランをアップグレードすると子どもを追加できます</p>
        ) : (
          <Link href="/onboarding/child" className="text-sm text-violet-400 hover:text-purple-600 hover:underline">
            ＋ 新しい子を登録する
          </Link>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className={cn("w-full", choice?.type?.startsWith("companion") && "bg-amber-500 hover:bg-amber-600")}
            disabled={!choice || isGenerationLimitReached}
            onClick={handleNext}
          >
            {choice?.type === "child"
              ? "この子で作る"
              : choice?.type?.startsWith("companion")
              ? `${(choice as { companionName: string }).companionName}の絵本を作る`
              : "主人公を選んでください"}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default function SelectChildPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <SelectChildContent />
    </Suspense>
  );
}
