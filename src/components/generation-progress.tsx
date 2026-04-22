"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { pulseVariants } from "@/lib/motion";
import type { BookDoc, PageDoc } from "@/lib/types";

interface GenerationProgressProps { book: BookDoc; pages: PageDoc[]; }

export function GenerationProgress({ book, pages }: GenerationProgressProps) {
  const total = book.pageCount;
  const completed = pages.filter((p) => p.status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm text-purple-800">
          <span>生成中...</span>
          <span>{completed} / {total} ページ</span>
        </div>
        <Progress value={percent} className="mt-2 h-3" />
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
              {page?.status === "completed" && page.imageUrl ? (
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
