"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Timer, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { pulseVariants } from "@/lib/motion";
import {
  getGenerationStages,
  getOverallProgressPercent,
  getEstimatedTimeText,
  formatElapsedTime,
} from "@/lib/generation-progress-utils";
import type { BookDoc, PageDoc } from "@/lib/types";

interface GenerationProgressProps {
  book: BookDoc;
  pages: PageDoc[];
}

export function GenerationProgress({ book, pages }: GenerationProgressProps) {
  const { stages, currentStageIndex, completedPages, totalPages, statusText } =
    getGenerationStages(book, pages);

  const percent = getOverallProgressPercent(book, pages);
  const estimatedTimeText = getEstimatedTimeText(totalPages);

  // Timer for elapsed time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTimeMs =
      book?.generationStartedAtMs ??
      (book?.generationStartedAt?.toMillis
        ? book.generationStartedAt.toMillis()
        : null) ??
      book?.createdAtMs ??
      (book?.createdAt?.toMillis ? book.createdAt.toMillis() : null) ??
      Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startTimeMs) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    book?.generationStartedAtMs,
    book?.generationStartedAt,
    book?.createdAtMs,
    book?.createdAt,
  ]);

  const currentStage = stages[currentStageIndex];
  const isIndeterminate = currentStage?.isIndeterminate ?? false;

  return (
    <div className="space-y-6">
      {/* 4-Stage Step Bar */}
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {stages.map((stage, idx) => {
            const isDone = stage.status === "completed";
            const isCurrent = stage.status === "current";

            return (
              <div
                key={stage.id}
                className={`relative flex flex-col items-center rounded-xl p-2.5 text-center transition-all ${
                  isCurrent
                    ? "border border-purple-200 bg-white shadow-sm ring-1 ring-purple-400/30"
                    : isDone
                    ? "bg-white/80"
                    : "bg-violet-50/30 opacity-60"
                }`}
              >
                <div className="flex items-center justify-center">
                  {isDone ? (
                    <div className="flex size-6 items-center justify-center rounded-full bg-purple-600 text-white">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="relative flex size-6 items-center justify-center rounded-full border-2 border-purple-600 bg-purple-50 text-purple-700">
                      {stage.isIndeterminate ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full border border-violet-200 bg-white text-xs font-semibold text-violet-400">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <span
                  className={`mt-1.5 text-xs font-bold ${
                    isCurrent
                      ? "text-purple-900"
                      : isDone
                      ? "text-purple-700"
                      : "text-violet-400"
                  }`}
                >
                  {stage.label}
                </span>

                <span className="mt-0.5 text-[10px] text-violet-500">
                  {stage.id === "pages" && (isCurrent || isDone)
                    ? `${completedPages}/${totalPages}`
                    : stage.detail}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Ring & Status */}
      <div
        className="text-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="em-loading__ring-wrap mb-4">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" className="em-loading__ring-track" />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              className={`em-loading__ring-progress ${
                isIndeterminate ? "animate-pulse stroke-purple-400" : ""
              }`}
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * percent) / 100}
            />
          </svg>
          <div className="em-loading__percent" aria-label={`進捗 ${percent}%`}>{percent}%</div>
        </div>

        <h2 className="em-loading__title text-lg font-bold text-purple-900">
          {statusText}
        </h2>

        {/* Estimated Duration & Elapsed Time Banner */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-purple-800">
          <div className="flex items-center gap-1.5 rounded-full bg-violet-100/80 px-3 py-1">
            <Clock className="size-3.5 text-purple-600" />
            <span>所要目安: {estimatedTimeText}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-violet-100/80 px-3 py-1">
            <Timer className="size-3.5 text-purple-600" />
            <span>経過時間: {formatElapsedTime(elapsedSeconds)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Progress
            value={percent}
            aria-label={`絵本生成進捗: ${percent}%`}
            className={`h-2 w-48 ${
              isIndeterminate ? "animate-pulse" : ""
            }`}
          />
          <span className="text-xs font-bold text-purple-700">
            <span>{completedPages}</span> / <span>{totalPages}</span> ページ
          </span>
        </div>
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: totalPages }, (_, i) => {
          const page = pages.find((p) => p.pageNumber === i);
          const isPageCompleted =
            page?.status === "completed" || page?.status === "fallback_completed";

          return (
            <motion.div
              key={i}
              className="aspect-[3/4] flex items-center justify-center overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white"
              variants={page?.status === "generating" ? pulseVariants : undefined}
              animate={page?.status === "generating" ? "pulse" : undefined}
            >
              {isPageCompleted && page.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.imageUrl}
                  alt={`ページ ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : page?.status === "generating" ? (
                <div className="text-center">
                  <motion.div
                    className="mx-auto h-8 w-8 rounded-full border-2 border-purple-300 border-t-purple-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="mt-2 text-xs text-violet-400">描いています...</p>
                </div>
              ) : page?.status === "failed" ? (
                <div className="text-center">
                  <div className="text-2xl text-red-300">×</div>
                  <p className="mt-1 text-xs text-red-400">失敗</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl text-violet-200">○</div>
                  <p className="mt-1 text-xs text-violet-300">{i + 1}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
