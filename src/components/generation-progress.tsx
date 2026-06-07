"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { pulseVariants } from "@/lib/motion";
import type { BookDoc, PageDoc } from "@/lib/types";

interface GenerationProgressProps { book: BookDoc; pages: PageDoc[]; }

export function GenerationProgress({ book, pages }: GenerationProgressProps) {
  const total = book.pageCount;
  const completed = pages.filter((p) => p.status === "completed" || p.status === "fallback_completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const currentStatus =
    completed === total ? "まもなく完成です！" :
    completed > total / 2 ? "もう少しで描き終わります..." :
    completed > 0 ? "お話に合わせて絵を描いています..." :
    "物語を組み立てています...";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="em-loading__ring-wrap mb-4">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="em-loading__ring-track" />
            <motion.circle
              cx="50" cy="50" r="45"
              className="em-loading__ring-progress"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * percent) / 100}
            />
          </svg>
          <div className="em-loading__percent">{percent}%</div>
        </div>
        <h2 className="em-loading__title">{currentStatus}</h2>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Progress value={percent} className="h-2 w-48" />
          <span className="text-xs font-bold text-purple-600"><span>{completed}</span> / <span>{total}</span> ページ</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: total }, (_, i) => {
          const page = pages.find((p) => p.pageNumber === i);
          return (
            <motion.div
              key={i}
              className="aspect-[3/4] rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white flex items-center justify-center overflow-hidden"
              variants={page?.status === "generating" ? pulseVariants : undefined}
              animate={page?.status === "generating" ? "pulse" : undefined}
            >
              {(page?.status === "completed" || page?.status === "fallback_completed") && page.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.imageUrl} alt={`ページ ${i + 1}`} className="h-full w-full object-cover" />
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
