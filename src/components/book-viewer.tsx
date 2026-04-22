"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { PageDoc } from "@/lib/types";
import type { Variants } from "framer-motion";

interface BookViewerProps { pages: PageDoc[]; title: string; }

const pageFlip: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
};

export function BookViewer({ pages, title }: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length;
  const goNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 0));
  const page = pages[currentPage];
  if (!page) return null;

  return (
    <div>
      {/* Desktop: spread view */}
      <div className="hidden md:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageFlip}
            initial="initial"
            animate="animate"
            exit="exit"
            className="grid grid-cols-2 gap-0 overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)]"
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
              {page.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.imageUrl} alt={`${title} - ページ${currentPage + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-violet-200">
                  <div className="text-6xl">○</div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-8">
              <p className="text-lg leading-relaxed text-purple-900">{page.text}</p>
              <p className="mt-4 text-sm text-violet-400">{currentPage + 1} / {totalPages}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Mobile: single page */}
      <div className="md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageFlip}
            initial="initial"
            animate="animate"
            exit="exit"
            className="overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)]"
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
              {page.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.imageUrl} alt={`${title} - ページ${currentPage + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-violet-200">
                  <div className="text-6xl">○</div>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-base leading-relaxed text-purple-900">{page.text}</p>
              <p className="mt-2 text-sm text-violet-400">{currentPage + 1} / {totalPages}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Navigation */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button variant="outline" onClick={goPrev} disabled={currentPage === 0} className="px-6">← 前</Button>
        <span className="text-sm text-violet-500">{currentPage + 1} / {totalPages}</span>
        <Button variant="outline" onClick={goNext} disabled={currentPage >= totalPages - 1} className="px-6">次 →</Button>
      </div>
    </div>
  );
}
