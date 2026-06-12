"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ProtagonistType = "child" | "fictional";

const STORY_BRIEF_PLACEHOLDERS = [
  "例：初めて自転車に乗れた日の、緊張とよろこびの話",
  "例：宇宙を旅するちいさなロボットが、星の友だちをさがす冒険",
  "例：おばあちゃんの家で秘密の庭を見つけ、不思議な出会いをした話",
  "例：ライオンとウサギが力を合わせて、大きな嵐をのりこえる話",
];

function AiBriefPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { children, loading: childrenLoading } = useChildren(user?.uid);

  const childId = searchParams.get("childId");
  const theme = searchParams.get("theme") ?? "";
  const modeParam = searchParams.get("mode") ?? "guided_ai";

  const child = children.find((c) => c.id === childId) ?? null;
  const childDisplayName = child?.nickname || child?.displayName || "";

  const [protagonistType, setProtagonistType] = useState<ProtagonistType>(
    childId ? "child" : "fictional"
  );
  const [protagonistName, setProtagonistName] = useState("");
  const [storyBrief, setStoryBrief] = useState("");
  const [pageCount, setPageCount] = useState(8);
  const [placeholderIndex] = useState(
    () => Math.floor(Math.random() * STORY_BRIEF_PLACEHOLDERS.length)
  );

  const effectiveName =
    protagonistType === "child"
      ? childDisplayName || protagonistName
      : protagonistName;

  const canProceed =
    storyBrief.trim().length >= 10 && effectiveName.trim().length > 0;

  const handleNext = () => {
    if (!canProceed) return;

    trackAnalyticsEvent("submit_ai_brief", {
      protagonistType,
      pageCount,
    });

    const params = new URLSearchParams();
    if (theme) params.set("theme", theme);
    params.set("mode", modeParam);
    params.set("pageCount", String(pageCount));
    params.set("storyRequest", storyBrief.trim());

    if (protagonistType === "child") {
      if (childId) params.set("childId", childId);
      if (!childId && protagonistName) params.set("protagonistName", protagonistName.trim());
    } else {
      // 架空キャラクター: childId なし、名前とoutfitModeを渡す
      params.set("protagonistName", protagonistName.trim());
      params.set("outfitMode", "theme_auto");
    }

    // companion params をスルーパス
    const companionId = searchParams.get("companionId");
    const companionName = searchParams.get("companionName");
    const companionVisualDescription = searchParams.get("companionVisualDescription");
    if (companionId) params.set("companionId", companionId);
    if (companionName) params.set("companionName", companionName);
    if (companionVisualDescription)
      params.set("companionVisualDescription", companionVisualDescription);

    router.push(`/create/style?${params.toString()}`);
  };

  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <StepIndicator currentStep={2} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">どんな絵本を作りますか？</h1>
        <p className="mt-1 text-sm text-violet-500">
          AIが起承転結のあるオリジナルストーリーを作ります
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {/* ── 主人公タイプ ── */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-purple-900">主人公は？</p>
          <div className="flex gap-2">
            {(
              [
                { value: "child" as ProtagonistType, emoji: "👶", label: "お子さんが\n主人公" },
                { value: "fictional" as ProtagonistType, emoji: "🌟", label: "架空の\nキャラクター" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProtagonistType(opt.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3.5 text-sm font-semibold transition-all",
                  protagonistType === opt.value
                    ? "border-purple-400 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                    : "border-violet-100 bg-white text-violet-500 hover:border-purple-300"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="whitespace-pre-line text-center text-xs leading-tight">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* 子ども主人公: プロフィール表示 or 名前入力 */}
          {protagonistType === "child" && (
            <div className="mt-3">
              {childrenLoading ? (
                <p className="text-xs text-violet-400">読み込み中...</p>
              ) : child ? (
                <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2.5">
                  <span className="text-base">👤</span>
                  <span className="text-sm font-medium text-violet-700">
                    {childDisplayName}
                    {child.age ? `（${child.age}歳）` : ""}
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={protagonistName}
                    onChange={(e) => setProtagonistName(e.target.value)}
                    placeholder="お子さんのお名前（例：そうたろう）"
                    className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    maxLength={20}
                  />
                  <p className="text-xs text-violet-400">
                    または{" "}
                    <Link href="/children" className="underline">
                      お子さんを登録
                    </Link>{" "}
                    すると外見も絵本に反映されます
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 架空キャラクター: 名前入力 */}
          {protagonistType === "fictional" && (
            <div className="mt-3">
              <input
                type="text"
                value={protagonistName}
                onChange={(e) => setProtagonistName(e.target.value)}
                placeholder="主人公の名前（例：ルナ、そらくん）"
                className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                maxLength={20}
              />
            </div>
          )}
        </div>

        {/* ── ストーリーブリーフ ── */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-purple-900">
            どんな絵本にしたいですか？
          </p>
          <p className="mb-3 text-xs text-violet-400">
            登場人物・場所・気持ち・伝えたいことなど、自由に書いてください
          </p>
          <textarea
            value={storyBrief}
            onChange={(e) => setStoryBrief(e.target.value)}
            placeholder={STORY_BRIEF_PLACEHOLDERS[placeholderIndex]}
            className="min-h-36 w-full resize-none rounded-xl border border-violet-200 px-3 py-2.5 text-sm leading-relaxed focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
            rows={5}
            maxLength={600}
          />
          <p className="mt-1 text-right text-xs text-violet-300">
            {storyBrief.length}/600
          </p>
        </div>

        {/* ── ページ数 ── */}
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-purple-900">ページ数</p>
          <div className="flex gap-2">
            {[
              { value: 4, label: "4ページ", sub: "短め・読みやすい" },
              { value: 8, label: "8ページ", sub: "読み応えあり" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPageCount(opt.value)}
                className={cn(
                  "flex-1 rounded-xl border py-3 text-center transition-all",
                  pageCount === opt.value
                    ? "border-purple-400 bg-purple-50 ring-2 ring-purple-200"
                    : "border-violet-100 bg-white hover:border-purple-300"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold",
                    pageCount === opt.value ? "text-purple-700" : "text-violet-600"
                  )}
                >
                  {opt.label}
                </p>
                <p className="mt-0.5 text-xs text-violet-400">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* バリデーションヒント */}
      {storyBrief.length > 0 && storyBrief.trim().length < 10 && (
        <p className="mt-3 text-center text-xs text-rose-500">
          もう少し詳しく書いてください（10文字以上）
        </p>
      )}
      {storyBrief.trim().length >= 10 && effectiveName.trim().length === 0 && (
        <p className="mt-3 text-center text-xs text-rose-500">
          主人公の名前を入力してください
        </p>
      )}

      {/* 画面下部固定ボタン */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className="w-full"
            disabled={!canProceed}
            onClick={handleNext}
          >
            絵のタッチを選ぶ →
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default function AiBriefPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}
    >
      <AiBriefPageContent />
    </Suspense>
  );
}
