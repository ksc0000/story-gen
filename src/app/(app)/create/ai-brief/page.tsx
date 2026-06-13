"use client";

import { Suspense, useState, useRef, useEffect } from "react";
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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type InputMode = "chat" | "free";
type ProtagonistType = "child" | "fictional";

type ChatAnswers = {
  protagonistType?: ProtagonistType;
  protagonistName?: string;
  storyTheme?: string;
  mood?: string;
  place?: string;
  message?: string;
  pageCount?: number;
  freeInput?: string;
};

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

// ─────────────────────────────────────────────
// Question definitions
// ─────────────────────────────────────────────

type ChatQuestion = {
  id: string;
  text: string;
  chips?: { emoji: string; label: string; value: string }[];
  freeInput?: boolean;    // チップに加えて自由入力欄を表示
  textOnly?: boolean;     // テキスト入力のみ（チップなし）
  textPlaceholder?: string;
};

const QUESTIONS: ChatQuestion[] = [
  {
    id: "protagonistType",
    text: "主人公は？",
    chips: [
      { emoji: "👶", label: "お子さんが主人公", value: "child" },
      { emoji: "🌟", label: "架空のキャラクター", value: "fictional" },
    ],
  },
  // Q1b は protagonistType === "fictional" のときだけ挿入（動的）
  {
    id: "storyTheme",
    text: "どんな話がいい？",
    chips: [
      { emoji: "🗺️", label: "冒険・旅", value: "冒険・旅" },
      { emoji: "🌱", label: "はじめての挑戦", value: "はじめての挑戦" },
      { emoji: "🤝", label: "友だちとの絆", value: "友だちとの絆" },
      { emoji: "👨‍👩‍👧", label: "家族の思い出", value: "家族の思い出" },
      { emoji: "🌈", label: "夢・なりたいもの", value: "夢・なりたいもの" },
      { emoji: "✨", label: "不思議なできごと", value: "不思議なできごと" },
    ],
    freeInput: true,
  },
  {
    id: "mood",
    text: "どんな雰囲気にする？",
    chips: [
      { emoji: "😄", label: "たのしい・明るい", value: "たのしい・明るい" },
      { emoji: "🫶", label: "ほっこり・あたたかい", value: "ほっこり・あたたかい" },
      { emoji: "💫", label: "ドキドキ・わくわく", value: "ドキドキ・わくわく" },
      { emoji: "🧚", label: "ふしぎ・ファンタジー", value: "ふしぎ・ファンタジー" },
    ],
    freeInput: true,
  },
  {
    id: "place",
    text: "場所はどこ？",
    chips: [
      { emoji: "🏠", label: "家やまち", value: "家やまち" },
      { emoji: "🌳", label: "自然・公園", value: "自然・公園" },
      { emoji: "✈️", label: "旅先・おでかけ", value: "旅先・おでかけ" },
      { emoji: "🚀", label: "宇宙・異世界", value: "宇宙・異世界" },
      { emoji: "🤷", label: "どこでもOK", value: "どこでもOK" },
    ],
    freeInput: true,
  },
  {
    id: "message",
    text: "伝えたいことは？",
    chips: [
      { emoji: "💪", label: "勇気・チャレンジ", value: "勇気・チャレンジ" },
      { emoji: "💕", label: "やさしさ・思いやり", value: "やさしさ・思いやり" },
      { emoji: "🧡", label: "家族の愛", value: "家族の愛" },
      { emoji: "👫", label: "友だちって大切", value: "友だちって大切" },
      { emoji: "🎉", label: "とにかく楽しく！", value: "とにかく楽しく！" },
    ],
    freeInput: true,
  },
  {
    id: "pageCount",
    text: "ページ数はどうする？",
    chips: [
      { emoji: "📖", label: "4ページ（短め）", value: "4" },
      { emoji: "📚", label: "8ページ（読み応えあり）", value: "8" },
    ],
  },
  {
    id: "freeInput",
    text: "他に伝えたいことはありますか？",
    textOnly: true,
    textPlaceholder: "自由に入力してください（空欄で次へ）",
  },
];

const FICTIONAL_NAME_QUESTION: ChatQuestion = {
  id: "protagonistName",
  text: "キャラクターの名前は？",
  textOnly: true,
  textPlaceholder: "例：ルナ、そらくん、ミルク",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildStoryBriefFromAnswers(answers: ChatAnswers, name: string): string {
  return [
    `主人公：${name}`,
    answers.storyTheme && `テーマ：${answers.storyTheme}`,
    answers.mood && `雰囲気：${answers.mood}`,
    answers.place && `場所：${answers.place}`,
    answers.message && `伝えたいこと：${answers.message}`,
    answers.freeInput && `追加リクエスト：${answers.freeInput}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** チャットモード用の質問シーケンスを構築 */
function buildQuestionSequence(answers: ChatAnswers): ChatQuestion[] {
  const questions = [...QUESTIONS];
  // protagonistType === "fictional" のとき Q1b を挿入
  if (answers.protagonistType === "fictional") {
    const idx = questions.findIndex((q) => q.id === "storyTheme");
    questions.splice(idx, 0, FICTIONAL_NAME_QUESTION);
  }
  return questions;
}

const PITCH_LABELS = [
  { key: "intro", label: "起", color: "text-violet-700 bg-violet-50" },
  { key: "rising", label: "承", color: "text-blue-700 bg-blue-50" },
  { key: "climax", label: "転", color: "text-amber-700 bg-amber-50" },
  { key: "resolution", label: "結", color: "text-emerald-700 bg-emerald-50" },
] as const;

const STORY_BRIEF_PLACEHOLDERS = [
  "例：初めて自転車に乗れた日の、緊張とよろこびの話",
  "例：宇宙を旅するちいさなロボットが、星の友だちをさがす冒険",
  "例：おばあちゃんの家で秘密の庭を見つけ、不思議な出会いをした話",
  "例：ライオンとウサギが力を合わせて、大きな嵐をのりこえる話",
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** モード切り替えトグル */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode;
  onChange: (m: InputMode) => void;
}) {
  return (
    <div className="flex rounded-full border border-violet-200 bg-violet-50 p-0.5">
      {(["chat", "free"] as InputMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
            mode === m
              ? "bg-white text-purple-700 shadow-sm"
              : "text-violet-400 hover:text-violet-600"
          )}
        >
          {m === "chat" ? "💬 チャット形式" : "✍️ フリーテキスト"}
        </button>
      ))}
    </div>
  );
}

/** チャット履歴の1行 */
function ChatHistoryItem({
  question,
  answer,
  onBack,
}: {
  question: string;
  answer: string;
  onBack?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-base">🤖</span>
        <p className="text-xs text-violet-400">{question}</p>
      </div>
      <div className="flex items-center gap-2 pl-7">
        <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
          ✓ {answer}
        </span>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] text-violet-300 transition-colors hover:text-violet-500"
          >
            変更
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main page content
// ─────────────────────────────────────────────

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

  // ── モード ──────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>("chat");

  // ── チャットモード状態 ─────────────────────
  const [chatAnswers, setChatAnswers] = useState<ChatAnswers>(() =>
    // childId があれば主人公は自動で「子ども」に
    childId ? { protagonistType: "child" } : {}
  );
  const [chatStep, setChatStep] = useState(() => (childId ? 1 : 0)); // childId なら Q1 スキップ
  const [freeInputValue, setFreeInputValue] = useState(""); // 自由入力欄の一時値
  const [showFreeInput, setShowFreeInput] = useState(false); // チップ以外の自由入力表示フラグ
  const [summaryReady, setSummaryReady] = useState(false); // 全問完了フラグ

  // ── フリーテキストモード状態 ───────────────
  const [protagonistType, setProtagonistType] = useState<ProtagonistType>(
    childId ? "child" : "fictional"
  );
  const [protagonistName, setProtagonistName] = useState("");
  const [storyBrief, setStoryBrief] = useState("");
  const [pageCount, setPageCount] = useState(8);
  const [placeholderIndex] = useState(
    () => Math.floor(Math.random() * STORY_BRIEF_PLACEHOLDERS.length)
  );

  // ── ピッチ状態（チャット・フリー共用） ──────
  const [pitchState, setPitchState] = useState<PitchState>({ status: "idle" });

  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しい質問が表示されるたびに下までスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatStep, summaryReady, pitchState.status]);

  // ── チャットモード: 質問シーケンス ──────────
  const questionSequence = buildQuestionSequence(chatAnswers);
  const currentQuestion = questionSequence[chatStep];
  const isAllAnswered = summaryReady;
  const minChatStep = childId ? 1 : 0; // childId がある場合 Q1 はスキップ済みで戻れない

  // ── 指定ステップ「以降すべて」クリアして戻る（← 戻るボタン、protagonistType 変更時）
  const handleGoBackTo = (targetStep: number) => {
    if (targetStep < minChatStep) return;
    const seq = buildQuestionSequence(chatAnswers);
    const newAnswers = { ...chatAnswers };
    for (let i = targetStep; i < seq.length; i++) {
      const q = seq[i];
      if (q.id === "pageCount") newAnswers.pageCount = undefined;
      else (newAnswers as Record<string, string | number | ProtagonistType | undefined>)[q.id] = undefined;
    }
    setChatAnswers(newAnswers);
    setChatStep(targetStep);
    setSummaryReady(false);
    setFreeInputValue("");
    setShowFreeInput(false);
    setPitchState({ status: "idle" });
  };

  // ── 指定ステップの回答だけクリアして戻る（「変更」ボタン）
  const handleEditStep = (targetStep: number) => {
    if (targetStep < minChatStep) return;
    const seq = buildQuestionSequence(chatAnswers);
    const q = seq[targetStep];
    if (!q) return;
    // protagonistType は変更するとシーケンス自体が変わるので以降もリセット
    if (q.id === "protagonistType") {
      handleGoBackTo(targetStep);
      return;
    }
    const newAnswers = { ...chatAnswers };
    if (q.id === "pageCount") newAnswers.pageCount = undefined;
    else (newAnswers as Record<string, string | number | ProtagonistType | undefined>)[q.id] = undefined;
    setChatAnswers(newAnswers);
    setChatStep(targetStep);
    setSummaryReady(false);
    setFreeInputValue("");
    setShowFreeInput(false);
    setPitchState({ status: "idle" });
  };

  // ── 次の未回答ステップを探す（単一箇所変更後のスキップ用）
  const findNextUnansweredStep = (fromStep: number, answers: ChatAnswers): number | null => {
    const seq = buildQuestionSequence(answers);
    for (let i = fromStep; i < seq.length; i++) {
      const q = seq[i];
      const val = (answers as Record<string, unknown>)[q.id];
      if (val == null || val === "") return i;
    }
    return null; // 全問回答済み
  };

  // チャットモード: 名前の解決
  const chatEffectiveName =
    chatAnswers.protagonistType === "child"
      ? childDisplayName || chatAnswers.protagonistName || ""
      : chatAnswers.protagonistName || "";

  // フリーモード: 名前の解決
  const freeEffectiveName =
    protagonistType === "child" ? childDisplayName || protagonistName : protagonistName;

  // ── チップ選択ハンドラ ─────────────────────
  const handleChipSelect = (questionId: string, value: string) => {
    const newAnswers = { ...chatAnswers };

    if (questionId === "protagonistType") {
      newAnswers.protagonistType = value as ProtagonistType;
      // 子どもを選択した場合、childDisplayName があれば名前も自動設定
      if (value === "child" && childDisplayName) {
        newAnswers.protagonistName = childDisplayName;
      }
    } else if (questionId === "pageCount") {
      newAnswers.pageCount = Number(value);
    } else {
      (newAnswers as Record<string, string | number | ProtagonistType | undefined>)[questionId] = value;
    }

    setChatAnswers(newAnswers);
    setFreeInputValue("");
    setShowFreeInput(false);

    // 次の未回答ステップへ（変更モードで後の回答が残っている場合はスキップ）
    const nextUnanswered = findNextUnansweredStep(chatStep + 1, newAnswers);
    if (nextUnanswered === null) {
      setSummaryReady(true);
    } else {
      setChatStep(nextUnanswered);
    }
  };

  // ── テキスト入力確定ハンドラ ───────────────
  const handleTextConfirm = (questionId: string) => {
    if (!freeInputValue.trim() && questionId !== "freeInput") return;
    const newAnswers = { ...chatAnswers };

    if (questionId === "protagonistName") {
      newAnswers.protagonistName = freeInputValue.trim();
    } else {
      (newAnswers as Record<string, string | number | ProtagonistType | undefined>)[questionId] = freeInputValue.trim();
    }

    setChatAnswers(newAnswers);
    setFreeInputValue("");
    setShowFreeInput(false);

    // 次の未回答ステップへ（変更モードで後の回答が残っている場合はスキップ）
    const nextUnanswered = findNextUnansweredStep(chatStep + 1, newAnswers);
    if (nextUnanswered === null) {
      setSummaryReady(true);
    } else {
      setChatStep(nextUnanswered);
    }
  };

  // ── ストーリーピッチ生成 ──────────────────
  const requestPitch = async (refinementRequest?: string) => {
    let brief: string;
    let effectiveName: string;
    let effectiveProtagonistType: ProtagonistType;
    let effectivePageCount: number;

    if (inputMode === "chat") {
      brief = buildStoryBriefFromAnswers(chatAnswers, chatEffectiveName);
      effectiveName = chatEffectiveName;
      effectiveProtagonistType = chatAnswers.protagonistType ?? "child";
      effectivePageCount = chatAnswers.pageCount ?? 8;
    } else {
      brief = storyBrief.trim();
      effectiveName = freeEffectiveName.trim();
      effectiveProtagonistType = protagonistType;
      effectivePageCount = pageCount;
    }

    if (!brief || !effectiveName) return;

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
        protagonistName: effectiveName,
        storyBrief: brief,
        pageCount: effectivePageCount,
        protagonistType: effectiveProtagonistType,
        refinementRequest: refinementRequest?.trim(),
      });

      trackAnalyticsEvent("submit_ai_brief", {
        protagonistType: effectiveProtagonistType,
        pageCount: effectivePageCount,
      });

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

  // ── 絵本作成へ進む ──────────────────────────
  const handleConfirm = () => {
    if (pitchState.status !== "shown") return;
    const { pitch } = pitchState;

    const rawBrief =
      inputMode === "chat"
        ? buildStoryBriefFromAnswers(chatAnswers, chatEffectiveName)
        : storyBrief.trim();

    const effectivePageCount =
      inputMode === "chat" ? (chatAnswers.pageCount ?? 8) : pageCount;

    const effectivePType =
      inputMode === "chat" ? (chatAnswers.protagonistType ?? "child") : protagonistType;

    const effectiveName =
      inputMode === "chat" ? chatEffectiveName : freeEffectiveName;

    const enrichedRequest =
      `${rawBrief}\n\n承認済みのあらすじ：\n` +
      `起：${pitch.intro}\n承：${pitch.rising}\n転：${pitch.climax}\n結：${pitch.resolution}`;

    const params = new URLSearchParams();
    if (theme) params.set("theme", theme);
    params.set("mode", modeParam);
    params.set("pageCount", String(effectivePageCount));
    params.set("storyRequest", enrichedRequest);
    const effectiveFreeInput = inputMode === "chat" ? chatAnswers.freeInput : undefined;
    if (effectiveFreeInput) params.set("freeInput", effectiveFreeInput);

    if (effectivePType === "child") {
      if (childId) params.set("childId", childId);
      else if (effectiveName) params.set("protagonistName", effectiveName);
    } else {
      params.set("protagonistName", effectiveName);
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

  // チャットモード: 概要カードからピッチ生成可能か
  const canGenerateFromChat =
    summaryReady && !!chatEffectiveName && !isGeneratingAny && pitchState.status === "idle";

  // フリーモード: ピッチ生成可能か
  const canRequestFreePitch =
    storyBrief.trim().length >= 10 && freeEffectiveName.trim().length > 0;

  // ── render ────────────────────────────────────
  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <StepIndicator currentStep={2} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-purple-900">どんな絵本を作りますか？</h1>
        <p className="mt-1 text-sm text-violet-500">
          AIが起承転結のあるオリジナルストーリーを作ります
        </p>
      </div>

      {/* モード切り替えトグル */}
      <div className="mt-5">
        <ModeToggle mode={inputMode} onChange={(m) => {
          setInputMode(m);
          setPitchState({ status: "idle" });
        }} />
      </div>

      {/* ══════════════════════════════════════════
          チャットモード
      ══════════════════════════════════════════ */}
      {inputMode === "chat" && (
        <div className="mt-5 space-y-4">
          {/* childId がある場合の主人公表示 */}
          {childId && child && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3"
            >
              <span>🤖</span>
              <p className="text-sm text-violet-700">
                <span className="font-medium">{childDisplayName}</span>
                {child.age ? `（${child.age}歳）` : ""}を主人公にするね！
              </p>
            </motion.div>
          )}

          {/* 回答済み履歴 */}
          {questionSequence.slice(0, chatStep).map((q, i) => {
            const rawAnswer = (chatAnswers as Record<string, string | number | ProtagonistType | undefined>)[q.id];
            if (rawAnswer == null) return null;
            let displayAnswer = String(rawAnswer);
            if (q.id === "protagonistType") {
              displayAnswer = rawAnswer === "child" ? "👶 お子さんが主人公" : "🌟 架空のキャラクター";
            } else if (q.id === "pageCount") {
              displayAnswer = `${rawAnswer}ページ`;
            }
            if (q.id === "protagonistName" && !rawAnswer) return null;
            const canEdit = i >= minChatStep && pitchState.status === "idle";
            return (
              <ChatHistoryItem
                key={q.id + i}
                question={q.text}
                answer={displayAnswer}
                onBack={canEdit ? () => handleEditStep(i) : undefined}
              />
            );
          })}

          {/* 概要カード（全問回答後） */}
          <AnimatePresence>
            {summaryReady && pitchState.status === "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50 to-violet-50 p-5"
              >
                <p className="mb-3 font-bold text-purple-900">📋 こんな絵本を作りますか？</p>
                <ul className="space-y-1.5 text-sm text-violet-700">
                  {chatEffectiveName && (
                    <li className="flex gap-2">
                      <span>👤</span>
                      <span>主人公：<span className="font-medium">{chatEffectiveName}</span></span>
                    </li>
                  )}
                  {chatAnswers.pageCount && (
                    <li className="flex gap-2">
                      <span>📖</span>
                      <span>ページ数：<span className="font-medium">{chatAnswers.pageCount}ページ</span></span>
                    </li>
                  )}
                  {chatAnswers.storyTheme && (
                    <li className="flex gap-2">
                      <span>🗺️</span>
                      <span>テーマ：<span className="font-medium">{chatAnswers.storyTheme}</span></span>
                    </li>
                  )}
                  {chatAnswers.mood && (
                    <li className="flex gap-2">
                      <span>🎨</span>
                      <span>雰囲気：<span className="font-medium">{chatAnswers.mood}</span></span>
                    </li>
                  )}
                  {chatAnswers.place && (
                    <li className="flex gap-2">
                      <span>📍</span>
                      <span>場所：<span className="font-medium">{chatAnswers.place}</span></span>
                    </li>
                  )}
                  {chatAnswers.message && (
                    <li className="flex gap-2">
                      <span>💬</span>
                      <span>伝えたいこと：<span className="font-medium">{chatAnswers.message}</span></span>
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleGoBackTo(questionSequence.length - 1)}
                    className="text-xs text-violet-400 transition hover:text-violet-600"
                  >
                    ← 前の質問に戻る
                  </button>
                  <span className="text-violet-200">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setChatAnswers(childId ? { protagonistType: "child" } : {});
                      setChatStep(childId ? 1 : 0);
                      setSummaryReady(false);
                      setPitchState({ status: "idle" });
                    }}
                    className="text-xs text-violet-400 transition hover:text-violet-600"
                  >
                    最初からやり直す
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 現在の質問 */}
          <AnimatePresence mode="wait">
            {!summaryReady && currentQuestion && pitchState.status === "idle" && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", damping: 24, stiffness: 280 }}
                className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
              >
                {/* ボットアイコン + 質問文 + 戻るボタン */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">🤖</span>
                    <p className="pt-0.5 text-base font-semibold text-purple-900">
                      {currentQuestion.text}
                    </p>
                  </div>
                  {chatStep > minChatStep && (
                    <button
                      type="button"
                      onClick={() => handleGoBackTo(chatStep - 1)}
                      className="shrink-0 rounded-full border border-violet-100 px-2.5 py-1 text-[11px] text-violet-400 transition hover:border-violet-300 hover:text-violet-600"
                    >
                      ← 戻る
                    </button>
                  )}
                </div>

                {/* テキスト入力のみ（Q1b: キャラクター名） */}
                {currentQuestion.textOnly ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={freeInputValue}
                      onChange={(e) => setFreeInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTextConfirm(currentQuestion.id);
                      }}
                      placeholder={currentQuestion.textPlaceholder ?? "入力してください"}
                      className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      maxLength={30}
                    />
                    <button
                      type="button"
                      disabled={!freeInputValue.trim() && currentQuestion.id !== "freeInput"}
                      onClick={() => handleTextConfirm(currentQuestion.id)}
                      className="w-full rounded-xl bg-purple-500 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:opacity-40"
                    >
                      {currentQuestion.id === "freeInput" ? "次へ" : "次の質問へ →"}
                    </button>
                  </div>
                ) : (
                  /* チップ選択 */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {currentQuestion.chips?.map((chip) => (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => handleChipSelect(currentQuestion.id, chip.value)}
                          className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-left text-sm font-medium text-violet-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 active:scale-95"
                        >
                          <span className="text-base">{chip.emoji}</span>
                          <span className="text-xs leading-tight">{chip.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* 自由入力オプション */}
                    {currentQuestion.freeInput && (
                      <div>
                        {!showFreeInput ? (
                          <button
                            type="button"
                            onClick={() => setShowFreeInput(true)}
                            className="w-full rounded-xl border border-dashed border-violet-200 py-2 text-xs text-violet-400 transition hover:border-purple-300 hover:text-purple-500"
                          >
                            ✍️ 自由に書く
                          </button>
                        ) : (
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="space-y-2"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={freeInputValue}
                                onChange={(e) => setFreeInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleTextConfirm(currentQuestion.id);
                                }}
                                placeholder="自由に入力してください"
                                className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                                maxLength={60}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setShowFreeInput(false); setFreeInputValue(""); }}
                                  className="flex-1 rounded-xl border border-violet-200 py-2 text-xs text-violet-400"
                                >
                                  チップから選ぶ
                                </button>
                                <button
                                  type="button"
                                  disabled={!freeInputValue.trim()}
                                  onClick={() => handleTextConfirm(currentQuestion.id)}
                                  className="flex-1 rounded-xl bg-purple-500 py-2 text-xs font-semibold text-white disabled:opacity-40"
                                >
                                  決定 →
                                </button>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ローディング（チャットモード） */}
          <AnimatePresence>
            {isGeneratingAny && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-6"
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
                  {pitchState.status === "refining" ? "修正案を考えています..." : "ストーリーを考えています..."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* エラー（チャットモード） */}
          <AnimatePresence>
            {pitchState.status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600"
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
        </div>
      )}

      {/* ══════════════════════════════════════════
          フリーテキストモード（既存UI）
      ══════════════════════════════════════════ */}
      {inputMode === "free" && (
        <div
          className={cn(
            "mt-5 space-y-4 transition-opacity",
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
                  <p className={cn("text-sm font-semibold", pageCount === opt.value ? "text-purple-700" : "text-violet-600")}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-violet-400">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* バリデーションヒント */}
          {pitchState.status === "idle" && storyBrief.length > 0 && storyBrief.trim().length < 10 && (
            <p className="text-center text-xs text-rose-500">
              もう少し詳しく書いてください（10文字以上）
            </p>
          )}

          {/* エラー */}
          <AnimatePresence>
            {pitchState.status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600"
              >
                <p>{pitchState.message}</p>
                <button type="button" onClick={() => setPitchState({ status: "idle" })} className="mt-2 text-xs text-rose-500 underline">
                  もう一度試す
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ローディング */}
          <AnimatePresence>
            {isGeneratingAny && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-6"
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
                  {pitchState.status === "refining" ? "修正案を考えています..." : "ストーリーを考えています..."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ピッチカード（チャット・フリー共用）
      ══════════════════════════════════════════ */}
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
                  <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold", color)}>
                    {label}
                  </span>
                  <p className="text-sm leading-relaxed text-violet-700">
                    {pitchState.pitch[key]}
                  </p>
                </div>
              ))}
            </div>

            {/* アクション */}
            <div className="border-t border-violet-100 px-5 pb-5 pt-3">
              <Button size="lg" className="w-full" onClick={handleConfirm}>
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
                      <p className="text-xs font-medium text-violet-600">どこを変えますか？</p>
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

      {/* スクロール用アンカー */}
      <div ref={bottomRef} />

      {/* ══════════════════════════════════════════
          画面下部固定ボタン
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {pitchState.status !== "shown" && (
          // チャットモード: 概要カード表示後にのみ表示
          // フリーモード: 常に表示
          (inputMode === "free" || summaryReady) && (
            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
              <div className="mx-auto max-w-lg">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={
                    isGeneratingAny ||
                    (inputMode === "free" ? !canRequestFreePitch : !canGenerateFromChat)
                  }
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
          )
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

export default function AiBriefPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <AiBriefPageContent />
    </Suspense>
  );
}
