"use client";

import { useCallback, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { PageDoc, CoverStatus, ReadingStructureVersion } from "@/lib/types";
import type { Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Reading item types                                                 */
/* ------------------------------------------------------------------ */

type ReadingItem =
  | {
      kind: "cover_title_spread";
      imageUrl: string;
      title: string;
      titleSpreadText?: string;
      openingNarration?: string;
    }
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

/** Build reading items: cover+title spread (single sheet) → story pages (when v2 is active). */
export function buildReadingItems(props: BookViewerProps): ReadingItem[] {
  const {
    pages,
    title,
    coverImageUrl,
    hasCoverPage,
    coverStatus,
    readingStructureVersion,
    titleSpreadText,
    openingNarration,
  } = props;

  const items: ReadingItem[] = [];

  const showCover =
    hasCoverPage === true &&
    readingStructureVersion === "v2_cover_title_story" &&
    coverStatus === "completed" &&
    typeof coverImageUrl === "string" &&
    coverImageUrl.length > 0;

  if (showCover) {
    items.push({
      kind: "cover_title_spread",
      imageUrl: coverImageUrl,
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
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 50 : -50,
  }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -50 : 50,
    transition: { duration: 0.3 },
  }),
};

/** Swipe threshold (px) and velocity threshold (px/s). */
export const SWIPE_OFFSET_THRESHOLD = 80;
export const SWIPE_VELOCITY_THRESHOLD = 500;

/* ------------------------------------------------------------------ */
/*  Per-item renderers                                                 */
/* ------------------------------------------------------------------ */

function CoverSheetDesktop({ item }: { item: Extract<ReadingItem, { kind: "cover_title_spread" }> }) {
  return (
    <div className="grid grid-cols-2 gap-0">
      <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.title} - 表紙`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center bg-gradient-to-br from-[#fdf4ff] via-[#f8fafc] to-[#e0f2fe] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Cover & Title</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-purple-900">
          {item.title}
        </h2>
        {item.titleSpreadText && (
          <p className="mt-5 text-lg leading-relaxed text-purple-800">
            {item.titleSpreadText}
          </p>
        )}
        {item.openingNarration && (
          <p className="mt-4 text-base italic leading-relaxed text-violet-700">
            {item.openingNarration}
          </p>
        )}
        {!item.titleSpreadText && !item.openingNarration && (
          <p className="mt-5 text-sm text-violet-500">この絵本のはじまり</p>
        )}
      </div>
    </div>
  );
}

function CoverSheetMobile({ item }: { item: Extract<ReadingItem, { kind: "cover_title_spread" }> }) {
  return (
    <div className="bg-white">
      <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.title} - 表紙`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="bg-gradient-to-br from-[#fdf4ff] via-[#f8fafc] to-[#e0f2fe] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">Cover & Title</p>
        <h2 className="mt-2 text-xl font-bold leading-tight text-purple-900">
          {item.title}
        </h2>
        {item.titleSpreadText && (
          <p className="mt-3 text-sm leading-relaxed text-purple-800">
            {item.titleSpreadText}
          </p>
        )}
        {item.openingNarration && (
          <p className="mt-2 text-xs italic leading-relaxed text-violet-700">
            {item.openingNarration}
          </p>
        )}
        {!item.titleSpreadText && !item.openingNarration && (
          <p className="mt-3 text-xs text-violet-500">この絵本のはじまり</p>
        )}
      </div>
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
  /** 1 = forward (next), -1 = backward (prev). Used for animation direction. */
  const directionRef = useRef(1);
  const touchStartXRef = useRef<number | null>(null);
  const totalPages = items.length;

  const goNext = useCallback(() => {
    directionRef.current = 1;
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    directionRef.current = -1;
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const { offset, velocity } = info;
      if (offset.x < -SWIPE_OFFSET_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
        goNext();
      } else if (offset.x > SWIPE_OFFSET_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  // Fallback for mobile browsers where framer-motion drag events can be unreliable.
  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const startX = touchStartXRef.current;
      const endX = event.changedTouches[0]?.clientX;
      touchStartXRef.current = null;
      if (startX == null || endX == null) return;

      const deltaX = endX - startX;
      if (deltaX < -SWIPE_OFFSET_THRESHOLD) {
        goNext();
      } else if (deltaX > SWIPE_OFFSET_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  const item = items[currentPage];
  if (!item) return null;

  /** Page label: cover/title spread show descriptive text, story pages show numbers. */
  const storyPageCount = props.pages.length;
  const pageLabel =
    item.kind === "cover_title_spread"
      ? "表紙・タイトル"
        : `${item.storyPageIndex + 1} / ${storyPageCount}`;

  /** Shared drag props for swipe navigation. */
  const dragProps = {
    drag: "x" as const,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.18,
    onDragEnd: handleDragEnd,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };

  return (
    <div>
      {/* Desktop: spread view */}
      <div className="hidden md:block">
        <AnimatePresence mode="wait" custom={directionRef.current}>
          <motion.div
            key={currentPage}
            custom={directionRef.current}
            variants={pageFlip}
            initial="initial"
            animate="animate"
            exit="exit"
            {...dragProps}
            className={`cursor-grab overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)] active:cursor-grabbing ${
              item.kind === "story_page" ? "grid grid-cols-2 gap-0" : ""
            }`}
          >
            {item.kind === "cover_title_spread" && <CoverSheetDesktop item={item} />}
            {item.kind === "story_page" && (
              <>
                <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
                  {item.page.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.page.imageUrl} alt={`${title} - ページ${item.storyPageIndex + 1}`} className="pointer-events-none h-full w-full object-cover" />
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
        <AnimatePresence mode="wait" custom={directionRef.current}>
          <motion.div
            key={currentPage}
            custom={directionRef.current}
            variants={pageFlip}
            initial="initial"
            animate="animate"
            exit="exit"
            {...dragProps}
            className="cursor-grab overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)] active:cursor-grabbing"
          >
            {item.kind === "cover_title_spread" && <CoverSheetMobile item={item} />}
            {item.kind === "story_page" && (
              <>
                <div className="aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
                  {item.page.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.page.imageUrl} alt={`${title} - ページ${item.storyPageIndex + 1}`} className="pointer-events-none h-full w-full object-cover" />
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
