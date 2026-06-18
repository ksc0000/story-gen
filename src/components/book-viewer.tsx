"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegenerateConfirmationDialog } from "@/components/regenerate-confirmation-dialog";
import type { PageDoc, CoverStatus, ReadingStructureVersion } from "@/lib/types";
import type { Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Reading item types                                                 */
/* ------------------------------------------------------------------ */

export type ReadingItem =
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
  onRegeneratePage?: (index: number) => void;
  isRegeneratingPage?: (index: number) => boolean;
  onRegenerateCover?: () => void;
  isRegeneratingCover?: boolean;
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

const bookTransitionVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 100 : -100,
    rotateY: direction > 0 ? 45 : -45,
    scale: 0.95,
  }),
  animate: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.32, 0.72, 0, 1],
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -100 : 100,
    rotateY: direction > 0 ? -45 : 45,
    scale: 0.95,
    transition: {
      duration: 0.5,
      ease: [0.32, 0.72, 0, 1],
    },
  }),
};

const shadowVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 0 },
  exit: {
    opacity: 0.08,
    transition: { duration: 0.3 },
  },
};

/** Swipe threshold (px) and velocity threshold (px/s). */
export const SWIPE_OFFSET_THRESHOLD = 80;
export const SWIPE_VELOCITY_THRESHOLD = 500;

/* ------------------------------------------------------------------ */
/*  Per-item renderers                                                 */
/* ------------------------------------------------------------------ */

function CoverSheetDesktop({
  item,
  onRegenerate,
  isRegenerating,
}: {
  item: Extract<ReadingItem, { kind: "cover_title_spread" }>;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-0">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.title} - 表紙`}
          className="h-full w-full object-cover"
        />
        {onRegenerate && (
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/80 text-violet-500 shadow-sm transition hover:bg-white hover:text-purple-700 active:scale-95 sm:size-10"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate();
            }}
            disabled={isRegenerating}
          >
            <RefreshCcw className="size-4 sm:size-5" />
          </Button>
        )}
        {isRegenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-sm">
              <Loader2 className="size-6 animate-spin text-purple-600" />
            </div>
            <p className="text-xs font-bold text-purple-900">再生成中...</p>
          </div>
        )}
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

function CoverSheetMobile({
  item,
  onRegenerate,
  isRegenerating,
}: {
  item: Extract<ReadingItem, { kind: "cover_title_spread" }>;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  return (
    <div className="bg-white">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.title} - 表紙`}
          className="h-full w-full object-cover"
        />
        {onRegenerate && (
          <Button
            variant="outline"
            size="icon-xs"
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-violet-500 shadow-sm transition hover:bg-white hover:text-purple-700 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate();
            }}
            disabled={isRegenerating}
          >
            <RefreshCcw className="size-3.5" />
          </Button>
        )}
        {isRegenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[2px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm">
              <Loader2 className="size-5 animate-spin text-purple-600" />
            </div>
            <p className="text-[10px] font-bold text-purple-900">再生成中...</p>
          </div>
        )}
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
  const { title, onRegeneratePage, isRegeneratingPage } = props;
  const items = buildReadingItems(props);

  const [currentPage, setCurrentPage] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pageToRegenerate, setPageToRegenerate] = useState<number | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea/select
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) return;

      // Ignore if a dialog/modal is open
      const isModalOpen = document.querySelector('[role="dialog"]') || document.querySelector('[aria-modal="true"]');
      if (isModalOpen) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

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
    <div className="relative overflow-hidden" style={{ perspective: "1200px" }}>
      {/* Desktop: spread view */}
      <div className="hidden md:block">
        <AnimatePresence mode="popLayout" custom={directionRef.current}>
          <motion.div
            key={currentPage}
            custom={directionRef.current}
            variants={bookTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            {...dragProps}
            style={{ transformStyle: "preserve-3d" }}
            className={`cursor-grab overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)] active:cursor-grabbing ${
              item.kind === "story_page" ? "grid grid-cols-2 gap-0" : ""
            }`}
          >
            {/* Inner shadow overlay */}
            <motion.div
              variants={shadowVariants}
              className="pointer-events-none absolute inset-0 z-50 bg-black/20"
            />
            {item.kind === "cover_title_spread" && (
              <CoverSheetDesktop
                item={item}
                onRegenerate={
                  props.onRegenerateCover
                    ? () => {
                        setPageToRegenerate(-1);
                        setIsConfirmOpen(true);
                      }
                    : undefined
                }
                isRegenerating={props.isRegeneratingCover}
              />
            )}
            {item.kind === "story_page" && (
              <>
                <div className="relative aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
                  {item.page.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.page.imageUrl} alt={`${title} - ページ${item.storyPageIndex + 1}`} className="pointer-events-none h-full w-full object-cover" />
                      {onRegeneratePage && (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/80 text-violet-500 shadow-sm transition hover:bg-white hover:text-purple-700 active:scale-95 sm:size-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPageToRegenerate(item.storyPageIndex);
                            setIsConfirmOpen(true);
                          }}
                          disabled={isRegeneratingPage?.(item.storyPageIndex)}
                        >
                          <RefreshCcw className="size-4 sm:size-5" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-4">
                      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 p-6 text-center">
                        <span className="text-4xl">🎨</span>
                        <p className="text-sm text-orange-700">この絵は生成できませんでした</p>
                        {onRegeneratePage && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegeneratePage(item.storyPageIndex);
                            }}
                            disabled={isRegeneratingPage?.(item.storyPageIndex)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {isRegeneratingPage?.(item.storyPageIndex) ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                仕上げ中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 size-4" />
                                このページを仕上げる
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {isRegeneratingPage?.(item.storyPageIndex) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-sm">
                        <Loader2 className="size-6 animate-spin text-purple-600" />
                      </div>
                      <p className="text-xs font-bold text-purple-900">再生成中...</p>
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
        <AnimatePresence mode="popLayout" custom={directionRef.current}>
          <motion.div
            key={currentPage}
            custom={directionRef.current}
            variants={bookTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            {...dragProps}
            style={{ transformStyle: "preserve-3d" }}
            className="cursor-grab overflow-hidden rounded-[20px] border border-[rgba(240,171,252,0.3)] bg-white shadow-[0_8px_32px_rgba(167,139,250,0.15)] active:cursor-grabbing"
          >
            {/* Inner shadow overlay */}
            <motion.div
              variants={shadowVariants}
              className="pointer-events-none absolute inset-0 z-50 bg-black/20"
            />
            {item.kind === "cover_title_spread" && (
              <CoverSheetMobile
                item={item}
                onRegenerate={
                  props.onRegenerateCover
                    ? () => {
                        setPageToRegenerate(-1);
                        setIsConfirmOpen(true);
                      }
                    : undefined
                }
                isRegenerating={props.isRegeneratingCover}
              />
            )}
            {item.kind === "story_page" && (
              <>
                <div className="relative aspect-[3/4] bg-gradient-to-br from-[#f3e8ff] to-[#e0f2fe]">
                  {item.page.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.page.imageUrl} alt={`${title} - ページ${item.storyPageIndex + 1}`} className="pointer-events-none h-full w-full object-cover" />
                      {onRegeneratePage && (
                        <Button
                          variant="outline"
                          size="icon-xs"
                          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-violet-500 shadow-sm transition hover:bg-white hover:text-purple-700 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPageToRegenerate(item.storyPageIndex);
                            setIsConfirmOpen(true);
                          }}
                          disabled={isRegeneratingPage?.(item.storyPageIndex)}
                        >
                          <RefreshCcw className="size-3.5" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-4">
                      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 p-6 text-center">
                        <span className="text-4xl">🎨</span>
                        <p className="text-sm text-orange-700">この絵は生成できませんでした</p>
                        {onRegeneratePage && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegeneratePage(item.storyPageIndex);
                            }}
                            disabled={isRegeneratingPage?.(item.storyPageIndex)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {isRegeneratingPage?.(item.storyPageIndex) ? (
                              <>
                                <Loader2 className="mr-2 size-3 animate-spin" />
                                仕上げ中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 size-3" />
                                このページを仕上げる
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {isRegeneratingPage?.(item.storyPageIndex) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[2px]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm">
                        <Loader2 className="size-5 animate-spin text-purple-600" />
                      </div>
                      <p className="text-[10px] font-bold text-purple-900">再生成中...</p>
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

      <RegenerateConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (pageToRegenerate === -1 && props.onRegenerateCover) {
            props.onRegenerateCover();
          } else if (pageToRegenerate !== null && onRegeneratePage) {
            onRegeneratePage(pageToRegenerate);
          }
        }}
      />
    </div>
  );
}
