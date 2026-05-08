"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { PageDoc, CoverStatus, ReadingStructureVersion } from "@/lib/types";
import type { Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Reading item types                                                 */
/* ------------------------------------------------------------------ */

type ReadingItem =
  | { kind: "cover"; imageUrl: string; title: string }
  | { kind: "title_spread"; title: string; titleSpreadText?: string; openingNarration?: string }
  | { kind: "story_page"; page: PageDoc; storyPageIndex: number };

interface BookViewerProps {
  pages: PageDoc[];
  title: string;
  coverImageUrl?: string;
  hasCoverPage?: boolean;
  coverStatus?: CoverStatus;
  readingStructureVersion?: ReadingStructureVersion;
  titleSpreadText?: string;
  openingNarration?: string;
}

/** Build reading items: cover → title spread → story pages (when v2 is active). */
export function buildReadingItems(props: BookViewerProps): ReadingItem[] {
  const {
    pages,
    title,
    coverImageUrl,
    hasCoverPage,
    coverStatus,
    titleSpreadText,
    openingNarration,
  } = props;

  const items: ReadingItem[] = [];

  const showCover =
    hasCoverPage === true &&
    coverStatus === "completed" &&
    typeof coverImageUrl === "string" &&
    coverImageUrl.length > 0;

  if (showCover) {
    items.push({ kind: "cover", imageUrl: coverImageUrl, title });

    // Title spread is always inserted when cover is shown
    items.push({
      kind: "title_spread",
      title,
      titleSpreadText,
      openingNarration,
    });
  }

  pages.forEach((page, i) => {
    items.push({ kind: "story_page", page, storyPageIndex: i });
  });

  return items;
}

const pageFlip: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
};

/* ------------------------------------------------------------------ */
/*  Per-item renderers                                                 */
/* ------------------------------------------------------------------ */

function CoverSpread({ item }: { item: Extract<ReadingItem, { kind: "cover" }> }) {
  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
      <div className="relative aspect-[3/4] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.title} - 表紙`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-6 pb-6 pt-12">
          <h2 className="text-2xl font-bold leading-tight text-white drop-shadow-lg md:text-3xl">
            {item.title}
          </h2>
        </div>
      </div>
    </div>
  );
}

function CoverMobile({ item }: { item: Extract<ReadingItem, { kind: "cover" }> }) {
  return (
    <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={`${item.title} - 表紙`}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-4 pb-4 pt-10">
        <h2 className="text-xl font-bold leading-tight text-white drop-shadow-lg">
          {item.title}
        </h2>
      </div>
    </div>
  );
}

function TitleSpreadDesktop({ item }: { item: Extract<ReadingItem, { kind: "title_spread" }> }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <h2 className="text-3xl font-bold leading-snug text-purple-900">{item.title}</h2>
      {item.titleSpreadText && (
        <p className="mt-6 max-w-md text-lg leading-relaxed text-violet-700">
          {item.titleSpreadText}
        </p>
      )}
      {item.openingNarration && (
        <p className="mt-4 max-w-md text-base italic leading-relaxed text-violet-500">
          {item.openingNarration}
        </p>
      )}
    </div>
  );
}

function TitleSpreadMobile({ item }: { item: Extract<ReadingItem, { kind: "title_spread" }> }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <h2 className="text-2xl font-bold leading-snug text-purple-900">{item.title}</h2>
      {item.titleSpreadText && (
        <p className="mt-4 max-w-sm text-base leading-relaxed text-violet-700">
          {item.titleSpreadText}
        </p>
      )}
      {item.openingNarration && (
        <p className="mt-3 max-w-sm text-sm italic leading-relaxed text-violet-500">
          {item.openingNarration}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BookViewer                                                         */
/* ------------------------------------------------------------------ */

export function BookViewer(props: BookViewerProps) {
  const { title } = props;
  const items = buildReadingItems(props);

  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = items.length;
  const goNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 0));
  const item = items[currentPage];
  if (!item) return null;

  /** Page label: cover/title spread show descriptive text, story pages show numbers. */
  const storyPageCount = props.pages.length;
  const pageLabel =
    item.kind === "cover"
      ? "表紙"
      : item.kind === "title_spread"
        ? "タイトル"
        : `${item.storyPageIndex + 1} / ${storyPageCount}`;

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
            className={`overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)] ${
              item.kind === "story_page" ? "grid grid-cols-2 gap-0" : ""
            }`}
          >
            {item.kind === "cover" && <CoverSpread item={item} />}
            {item.kind === "title_spread" && <TitleSpreadDesktop item={item} />}
            {item.kind === "story_page" && (
              <>
                <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
                  {item.page.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.page.imageUrl} alt={`${title} - ページ${item.storyPageIndex + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-violet-200">
                      <div className="text-6xl">○</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-8">
                  <p className="text-lg leading-relaxed text-purple-900">{item.page.text}</p>
                  <p className="mt-4 text-sm text-violet-400">{pageLabel}</p>
                </div>
              </>
            )}
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
            {item.kind === "cover" && <CoverMobile item={item} />}
            {item.kind === "title_spread" && <TitleSpreadMobile item={item} />}
            {item.kind === "story_page" && (
              <>
                <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
                  {item.page.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.page.imageUrl} alt={`${title} - ページ${item.storyPageIndex + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-violet-200">
                      <div className="text-6xl">○</div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-base leading-relaxed text-purple-900">{item.page.text}</p>
                  <p className="mt-2 text-sm text-violet-400">{pageLabel}</p>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Navigation */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button variant="outline" onClick={goPrev} disabled={currentPage === 0} className="px-6">← 前</Button>
        <span className="text-sm text-violet-500">{pageLabel}</span>
        <Button variant="outline" onClick={goNext} disabled={currentPage >= totalPages - 1} className="px-6">次 →</Button>
      </div>
    </div>
  );
}
