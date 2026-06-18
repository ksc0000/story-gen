"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReadingItem } from "./book-viewer";

interface CinematicViewerProps {
  items: ReadingItem[];
  initialIndex?: number;
  title: string;
  onClose: () => void;
}

const AUTOPLAY_INTERVAL_MS = 4500;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: { duration: 0.45, ease: "easeIn" as const },
  }),
};

const textVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.3, ease: "easeOut" as const },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

export function CinematicViewer({ items, initialIndex = 0, title, onClose }: CinematicViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [dir, setDir] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = items.length;

  const go = useCallback((next: number, direction: number) => {
    setDir(direction);
    setCurrent(next);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => {
      if (c >= total - 1) { setIsPlaying(false); return c; }
      setDir(1);
      return c + 1;
    });
  }, [total]);

  const goPrev = useCallback(() => {
    if (current <= 0) return;
    go(current - 1, -1);
  }, [current, go]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(goNext, AUTOPLAY_INTERVAL_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, current, goNext]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === " ") { e.preventDefault(); setIsPlaying((p) => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStartXRef.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartXRef.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (delta < -60) goNext();
    else if (delta > 60) goPrev();
  };

  const item = items[current];
  if (!item) return null;

  const imageUrl =
    item.kind === "cover_title_spread"
      ? item.imageUrl
      : item.page.imageUrl ?? null;

  const text =
    item.kind === "cover_title_spread"
      ? item.titleSpreadText ?? item.openingNarration ?? null
      : item.page.text ?? null;

  const label =
    item.kind === "cover_title_spread"
      ? "表紙"
      : `${item.storyPageIndex + 1} / ${items.filter((i) => i.kind === "story_page").length}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Close & title bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-sm font-medium text-white/80 truncate max-w-[60vw]">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">{label}</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
            aria-label="閉じる"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Main slide area */}
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={current}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            {imageUrl ? (
              <motion.img
                src={imageUrl}
                alt={`${title} ページ${current + 1}`}
                className="h-full w-full object-cover"
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={{ duration: AUTOPLAY_INTERVAL_MS / 1000 + 0.5, ease: "linear" }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-purple-950">
                <span className="text-6xl opacity-30">📖</span>
              </div>
            )}
            {/* Gradient overlay for text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-24">
          <AnimatePresence mode="wait">
            {text && (
              <motion.p
                key={current}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-center text-lg font-medium leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] md:text-xl"
              >
                {text}
              </motion.p>
            )}
          </AnimatePresence>
          {item.kind === "cover_title_spread" && !text && (
            <motion.p
              key={`title-${current}`}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="text-center text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            >
              {title}
            </motion.p>
          )}
        </div>

        {/* Side nav arrows (desktop) */}
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 md:flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition disabled:opacity-0"
          aria-label="前のページ"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={goNext}
          disabled={current >= total - 1}
          className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 md:flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition disabled:opacity-0"
          aria-label="次のページ"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 pb-[env(safe-area-inset-bottom,16px)] pt-3 bg-gradient-to-t from-black/70 to-transparent">
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 overflow-hidden max-w-[50vw]">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i, i > current ? 1 : -1)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-5 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60"
              }`}
              aria-label={`ページ ${i + 1}`}
            />
          ))}
        </div>

        {/* Play/pause */}
        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
          aria-label={isPlaying ? "一時停止" : "自動再生"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-0.5" />}
        </button>
      </div>
    </div>
  );
}
