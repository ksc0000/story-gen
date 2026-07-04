"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { HelpModal, type HelpContent } from "@/components/help-modal";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { CreationMode } from "@/lib/types";
import { useState } from "react";

const MODE_OPTIONS: Array<{
  mode: CreationMode;
  label: string;
  description: string;
  icon: string;
  recommended?: boolean;
}> = [
  {
    mode: "fixed_template",
    label: "できあがり絵本",
    description: "ストーリーは完成済み。名前と思い出を入れるだけ。約3分でできます。",
    icon: "⚡",
    recommended: true,
  },
  {
    mode: "guided_ai",
    label: "AIにおまかせ",
    description: "テーマを教えると、AIがオリジナルストーリーを作ります。",
    icon: "✨",
  },
  {
    mode: "photo_story",
    label: "写真から作る",
    description: "3〜5枚の写真から、AIが思い出を絵本に描き直します。",
    icon: "📸",
  },
];

const MODE_HELP: Record<CreationMode, HelpContent> = {
  fixed_template: {
    emoji: "⚡",
    title: "できあがり絵本とは？",
    subtitle: "最短3分で完成。はじめての方に最適です",
    points: [
      "プロが作ったストーリーテンプレートから選ぶだけ",
      "お子さんの名前・思い出を入力すると絵本が完成",
      "テーマ（誕生日・旅行・季節行事など）が豊富に揃っています",
      "絵のタッチは自由に選べます",
    ],
    note: "💡 まず絵本を試してみたい方はこのモードがおすすめ！",
  },
  guided_ai: {
    emoji: "✨",
    title: "AIにおまかせとは？",
    subtitle: "AIがオリジナルのストーリーを生成します",
    points: [
      "テーマ・気分・場所など数問に答えるだけでOK",
      "AIが起承転結のある本格的な物語を作ります",
      "「子どもが主人公」でも「架空キャラ」でも作れます",
      "なかよしキャラも一緒に登場させられます",
    ],
    note: "⏱ 生成には2〜5分ほどかかります",
  },
  photo_story: {
    emoji: "📸",
    title: "写真から作るとは？",
    subtitle: "思い出の写真がそのまま絵本になります",
    points: [
      "3〜5枚の写真をアップロードするだけ",
      "AIが写真の「瞬間」を読み取り、絵本の世界に描き直します",
      "運動会・旅行・誕生日パーティーなどの思い出に最適",
      "絵本風のタッチで仕上がるので、まるでプロの作品のよう",
    ],
    note: "✨ プレミアムプラン、またはスタンダードプランで利用できます",
  },
  original_ai: {
    emoji: "✍️",
    title: "フリー入力モードとは？",
    subtitle: "細かくこだわりたい方向け",
    points: [
      "登場人物・場所・伝えたいことを自由に記入",
      "指定が細かいほど、イメージに近い絵本になります",
      "オリジナリティの高いストーリーを作りたい方に",
    ],
  },
};

function ThemeModeSelectContent() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const [helpMode, setHelpMode] = useState<CreationMode | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const selectedMode = (searchParams.get("mode") as CreationMode | null) ?? "fixed_template";

  const handleNext = () => {
    trackAnalyticsEvent("select_story_theme", { creationMode: selectedMode });
    // Preserve all incoming params (childId, companionId, companionName, protagonistType, etc.)
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", selectedMode);

    if (selectedMode === "fixed_template") {
      // テンプレート選択画面へ
      router.push(`/create/select-template?${params.toString()}`);
    } else {
      // AI系モードはそのままなかよしキャラ選択へ
      router.push(`/create/select-companion?${params.toString()}`);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-4 pb-28 md:py-8 md:pb-32">
      <BackButton className="mb-3" />
      <StepIndicator currentStep={1} />

      <div className="mt-6 space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-purple-900 md:text-xl">作り方を選ぶ</h1>
          <p className="mt-1 text-xs text-violet-500 md:text-sm">
            目的や手間、自由度に合わせて選べます。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {MODE_OPTIONS.map((option) => {
            const active = selectedMode === option.mode;
            const currentPlan = resolveProductPlan(profile);
            const planConfig = PLAN_CONFIGS[currentPlan];
            const isAllowed = planConfig?.allowedCreationModes.includes(option.mode);

            return (
              <div key={option.mode} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("mode", option.mode);
                    router.replace(`/create/theme?${params.toString()}`);
                  }}
                  className={cn(
                    "group relative flex w-full flex-col items-start rounded-2xl border p-4 pr-16 text-left transition-all",
                    active
                      ? "border-purple-400 ring-2 ring-purple-200 bg-purple-50 shadow-sm"
                      : "border-purple-100 bg-white hover:border-purple-300"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{option.icon}</span>
                      <div className="text-sm font-bold text-purple-900 md:text-base">{option.label}</div>
                      {option.recommended && (
                        <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200">
                          おすすめ ✨
                        </Badge>
                      )}
                      {!isAllowed && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          プレミアムプラン限定
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-violet-500 md:text-sm">
                    {option.description}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setHelpMode(option.mode); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                  aria-label={`${option.label}の説明を見る`}
                >
                  <HelpCircle className="size-4" />
                </button>
                {!isAllowed && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    <Link href="/pricing" className="text-xs font-bold text-purple-600 hover:underline">
                      アップグレード
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 画面下部固定 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3">
        <div className="mx-auto max-w-lg">
          {(() => {
            const currentPlan = resolveProductPlan(profile);
            const planConfig = PLAN_CONFIGS[currentPlan];
            const isAllowed = planConfig?.allowedCreationModes.includes(selectedMode);

            if (!isAllowed) {
              return (
                <Link href="/pricing" className="block w-full">
                  <Button size="lg" className="w-full">
                    アップグレードして作る
                  </Button>
                </Link>
              );
            }

            return (
              <Button size="lg" className="w-full" onClick={handleNext}>
                次へ
              </Button>
            );
          })()}
        </div>
      </div>

      <HelpModal
        open={helpMode !== null}
        onClose={() => setHelpMode(null)}
        content={helpMode ? MODE_HELP[helpMode] : MODE_HELP.fixed_template}
      />
    </PageTransition>
  );
}

export default function ThemeSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <ThemeModeSelectContent />
    </Suspense>
  );
}
