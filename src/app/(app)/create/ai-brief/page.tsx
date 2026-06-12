"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChildren } from "@/lib/hooks/use-children";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  generateStoryPitchCallable,
  type StoryPitch,
} from "@/lib/functions";
import { cn } from "@/lib/utils";

type ProtagonistType = "child" | "fictional";

type PitchState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "error"; message: string }
  | {
      status: "shown";
      pitch: StoryPitch;
      showRefinement: boolean;
      refinementText: string;
    }
  | { status: "refining"; pitch: StoryPitch; refinementText: string };

const STORY_BRIEF_PLACEHOLDERS = [
  "例：初めて自転車に乗れた日の、緊張とよろこびの話",
  "例：宇宙を旅するちいさなロボットが、星の友だちをさがす冒険",
  "例：おばあちゃんの家で秘密の庭を見つけ、不思議な出会いをした話",
  "例：ライオンとウサギが力を合わせて、大きな嵐をのりこえる話",
];

const PITCH_LABELS = [
  { key: "intro", label: "起", color: "text-violet-700 bg-violet-50" },
  { key: "rising", label: "承", color: "text-blue-700 bg-blue-50" },
  { key: "climax", label: "転", color: "text-amber-700 bg-amber-50" },
  { key: "resolution", label: "結", color: "text-emerald-700 bg-emerald-50" },
] as const;

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
  const [pitchState, setPitchState] = useState<PitchState>({ status: "idle" });
  const [placeholderIndex] = useState(
    () => Math.floor(Math.random() * STORY_BRIEF_PLACEHOLDERS.length)
  );

  const effectiveName =
    protagonistType === "child" ? childDisplayName || protagonistName : protagonistName;

  const canRequestPitch =
    storyBrief.trim().length >= 10 && effectiveName.trim().length > 0;

  // ── ストーリーピッチ生成 ──────────────────────────────────────
  const requestPitch = async (refinementRequest?: string) => {
    if (!canRequestPitch) return;

    const isRefining =
      refinementRequest != null &&
      pitchState.status === "shown" &&
      pitchState.showRefinement;

    if (isRefining && pitchState.status === "shown") {
      setPitchState({
        status: "refining",
        pitch: pitchState.pitch,
        refinementText: pitchState.refinementText,
      });
    } else {
      setPitchState({ status: "generating" });
    }

    try {
      const pitch = await generateStoryPitchCallable({
        protagonistName: effectiveName.trim(),
        storyBrief: storyBrief.trim(),
        pageCount,
        protagonistType,
        refinementRequest: refinementRequest?.trim(),
      });

      trackAnalyticsEvent("submit_ai_brief", { protagonistType, pageCount });

      setPitchState({
        status: "shown",
        pitch,
        showRefinement: false,
        refinementText: "",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "ストーリーの提案生成に失敗しました。もう一度お試しください。";
      setPitchState({ status: "error", message });
    }
  };

  // ── 絵本作成へ進む ─────────────────────────────────────────────
  const handleConfirm = () => {
    if (pitchState.status !== "shown") return;
    const { pitch } = pitchState;

    const enrichedRequest =
      `${storyBrief.trim()}\n\n承認済みのあらすじ：\n` +
      `起：${pitch.intro}\n承：${pitch.rising}\n転：${pitch.climax}\n結：${pitch.resolution}`;

    const params = new URLSearchParams();
    if (theme) params.set("theme", theme);
    params.set("mode", modeParam);
    params.set("pageCount", String(pageCount));
    params.set("storyRequest", enrichedRequest);

    if (protagonistType === "child") {
      if (childId) params.set("childId", childId);
      if (!childId && protagonistName) params.set("protagonistName", protagonistName.trim());
    } else {
      params.set("protagonistName", protagonistName.trim());
      params.set("outfitMode", "theme_auto");
    }

    const companionId = searchParams.get("companionId");
    const companionName = searchParams.get("companionName");
    const companionVisualDescription = searchParams.get("companionVisualDescription");
    if (companionId) params.set("companionId", companionId);
    if (companionName) params.set("companionName", companionName);
    if (companionVisualDescription)
      params.set("companionVisualDescription", companionVisualDescription);

    router.push(`/create/style?${params.toString()}`);
  };

  const isGeneratingAny =
    pitchState.status === "generating" || pitchState.status === "refining";

  // ── render ────────────────────────────────────────────────────
  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <StepIndicator currentStep={2} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">どんな絵本を作りますか？</h1>
        <p className="mt-1 text-sm text-violet-500">
          AIが起承転結のあるオリジナルストーリーを作ります
        </p>
      </div>

      {/* ── 入力フォーム ──────────────────────────────────────── */}
      <div
        className={cn(
          "mt-6 space-y-4 transition-opacity",
          pitchState.status === "shown" ? "opacity-60" : "opacity-100"
        )}
      >
        {/* 主人公タイプ */}
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
                disabled={isGeneratingAny || pitchState.status === "shown"}
                onClick={() => setProtagonistType(opt.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3.5 text-sm font-semibold transition-all",
                  protagonistType === opt.value
                    ? "border-purple-400 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                    : "border-violet-100 bg-white text-violet-500 hover:border-purple-300",
                  (isGeneratingAny || pitchState.status === "shown") && "pointer-events-none"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="whitespace-pre-line text-center text-xs leading-tight">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

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
                    disabled={isGeneratingAny || pitchState.status === "shown"}
                    placeholder="お子さんのお名前（例：そうたろう）"
                    className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-60"
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

          {protagonistType === "fictional" && (
            <div className="mt-3">
              <input
                type="text"
                value={protagonistName}
                onChange={(e) => setProtagonistName(e.target.value)}
                disabled={isGeneratingAny || pitchState.status === "shown"}
                placeholder="主人公の名前（例：ルナ、そらくん）"
                className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-60"
                maxLength={20}
              />
            </div>
          )}
        </div>

        {/* ストーリーブリーフ */}
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
            disabled={isGeneratingAny || pitchState.status === "shown"}
            placeholder={STORY_BRIEF_PLACEHOLDERS[placeholderIndex]}
            className="min-h-36 w-full resize-none rounded-xl border border-violet-200 px-3 py-2.5 text-sm leading-relaxed focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-60"
            rows={5}
            maxLength={600}
          />
          <p className="mt-1 text-right text-xs text-violet-300">
            {storyBrief.length}/600
          </p>
        </div>

        {/* ページ数 */}
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
                disabled={isGeneratingAny || pitchState.status === "shown"}
                onClick={() => setPageCount(opt.value)}
                className={cn(
                  "flex-1 rounded-xl border py-3 text-center transition-all",
                  pageCount === opt.value
                    ? "border-purple-400 bg-purple-50 ring-2 ring-purple-200"
                    : "border-violet-100 bg-white hover:border-purple-300",
                  (isGeneratingAny || pitchState.status === "shown") && "pointer-events-none"
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

      {/* ── バリデーションヒント ── */}
      {pitchState.status === "idle" && storyBrief.length > 0 && storyBrief.trim().length < 10 && (
        <p className="mt-3 text-center text-xs text-rose-500">
          もう少し詳しく書いてください（10文字以上）
        </p>
      )}

      {/* ── エラー表示 ── */}
      <AnimatePresence>
        {pitchState.status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600"
          >
            <p>{pitchState.message}</p>
            <button
              type="button"
              onClick={() => setPitchState({ status: "idle" })}
              className="mt-2 text-xs text-rose-500 underline"
            >
              もう一度試す
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ローディング ── */}
      <AnimatePresence>
        {(pitchState.status === "generating" || pitchState.status === "refining") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex flex-col items-center gap-3 py-6"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <p className="text-sm text-violet-500">
              {pitchState.status === "refining"
                ? "修正案を考えています..."
                : "ストーリーを考えています..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ピッチカード ── */}
      <AnimatePresence>
        {pitchState.status === "shown" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="mt-5 rounded-2xl border border-purple-200 bg-white shadow-md"
          >
            {/* ヘッダー */}
            <div className="rounded-t-2xl bg-gradient-to-r from-purple-500 to-violet-500 px-5 py-3">
              <p className="text-xs font-medium text-purple-100">✨ こんな絵本はいかがですか？</p>
              <h2 className="mt-0.5 text-base font-bold text-white">
                「{pitchState.pitch.title}」
              </h2>
            </div>

            {/* 起承転結 */}
            <div className="space-y-2 px-5 py-4">
              {PITCH_LABELS.map(({ key, label, color }) => (
                <div key={key} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      color
                    )}
                  >
                    {label}
                  </span>
                  <p className="text-sm leading-relaxed text-violet-700">
                    {pitchState.pitch[key]}
                  </p>
                </div>
              ))}
            </div>

            {/* アクションボタン */}
            <div className="border-t border-violet-100 px-5 pb-5 pt-3">
              <Button
                size="lg"
                className="w-full"
                onClick={handleConfirm}
              >
                このストーリーで作る ✓
              </Button>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPitchState((prev) =>
                      prev.status === "shown"
                        ? { ...prev, showRefinement: !prev.showRefinement }
                        : prev
                    )
                  }
                  className="flex-1 rounded-xl border border-violet-200 py-2 text-sm font-medium text-violet-500 transition hover:border-purple-300 hover:text-purple-600"
                >
                  もう少し変えたい 💬
                </button>
                <button
                  type="button"
                  onClick={() => setPitchState({ status: "idle" })}
                  className="flex-1 rounded-xl border border-violet-200 py-2 text-sm font-medium text-violet-400 transition hover:border-violet-300"
                >
                  最初からやり直す ↩
                </button>
              </div>

              {/* 修正入力 */}
              <AnimatePresence>
                {pitchState.status === "shown" && pitchState.showRefinement && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-violet-50 p-3">
                      <p className="text-xs font-medium text-violet-600">
                        どこを変えますか？
                      </p>
                      <textarea
                        value={pitchState.refinementText}
                        onChange={(e) =>
                          setPitchState((prev) =>
                            prev.status === "shown"
                              ? { ...prev, refinementText: e.target.value }
                              : prev
                          )
                        }
                        placeholder="例：結末をもっとハッピーにして、主人公の冒険をもっと長くして"
                        className="w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        rows={3}
                        maxLength={300}
                      />
                      <button
                        type="button"
                        disabled={!pitchState.refinementText.trim()}
                        onClick={() =>
                          pitchState.status === "shown" &&
                          requestPitch(pitchState.refinementText)
                        }
                        className="w-full rounded-xl bg-purple-500 py-2 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:opacity-50"
                      >
                        変えてみる →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 画面下部固定ボタン（ピッチ未表示時のみ）── */}
      <AnimatePresence>
        {pitchState.status !== "shown" && (
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
            <div className="mx-auto max-w-lg">
              <Button
                size="lg"
                className="w-full"
                disabled={!canRequestPitch || isGeneratingAny}
                onClick={() => requestPitch()}
              >
                {isGeneratingAny ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">✦</span>
                    考えています...
                  </span>
                ) : (
                  "AIにストーリーを考えてもらう ✨"
                )}
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

export default function AiBriefPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-violet-400">読み込み中...</div>
      }
    >
      <AiBriefPageContent />
    </Suspense>
  );
}
