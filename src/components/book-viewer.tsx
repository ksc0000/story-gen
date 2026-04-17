"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PageDoc } from "@/lib/types";

interface BookViewerProps { pages: PageDoc[]; title: string; }

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
        <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
          <div className="aspect-[3/4] bg-amber-50">
            {page.imageUrl ? <img src={page.imageUrl} alt={`${title} - ページ${currentPage + 1}`} className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-gray-300"><span className="text-6xl">🖼️</span></div>}
          </div>
          <div className="flex flex-col justify-center p-8">
            <p className="text-lg leading-relaxed text-gray-800">{page.text}</p>
            <p className="mt-4 text-sm text-gray-400">{currentPage + 1} / {totalPages}</p>
          </div>
        </div>
      </div>
      {/* Mobile: single page */}
      <div className="md:hidden">
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
          <div className="aspect-[3/4] bg-amber-50">
            {page.imageUrl ? <img src={page.imageUrl} alt={`${title} - ページ${currentPage + 1}`} className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-gray-300"><span className="text-6xl">🖼️</span></div>}
          </div>
          <div className="p-4">
            <p className="text-base leading-relaxed text-gray-800">{page.text}</p>
            <p className="mt-2 text-sm text-gray-400">{currentPage + 1} / {totalPages}</p>
          </div>
        </div>
      </div>
      {/* Navigation */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button variant="outline" onClick={goPrev} disabled={currentPage === 0} className="px-6">← 前</Button>
        <span className="text-sm text-gray-500">{currentPage + 1} / {totalPages}</span>
        <Button variant="outline" onClick={goNext} disabled={currentPage >= totalPages - 1} className="px-6">次 →</Button>
      </div>
    </div>
  );
}
