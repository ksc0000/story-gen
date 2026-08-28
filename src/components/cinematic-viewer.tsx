"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, ChevronLeft, ChevronRight, BookOpen, MessageCircle, RotateCcw, SunMoon } from "lucide-react";
import type { ReadingItem } from "./book-viewer";

interface CinematicViewerProps {
  items: ReadingItem[];
  initialIndex?: number;
  title: string;
  originalTitle?: string;
  onClose: () => void;
  onFeedback?: () => void;
}

/**
 * 自動再生の送り間隔に関する定数（ミリ秒）
 * 読み聞かせ速度の目安（ひらがな主体で1文字約55ms）に基づき、
 * 基本時間 + 文字数 × 単価 で動的にページ閲覧時間を計算する。
 */
export const AUTOPLAY_BASE_MS = 2500;
export const AUTOPLAY_PER_CHAR_MS = 55;
export const AUTOPLAY_MIN_MS = 3000;
export const AUTOPLAY_MAX_MS = 10000;
export const AUTOPLAY_COVER_MS = 4500;

const HINT_VISIBLE_MS = 4000;
const ROTATE_HINT_MS = 3000;

/**
 * ページの文字数に応じて自動送り間隔（ミリ秒）を算出する。
 * 表紙や未定義アイテムは固定時間 (4.5秒) を返し、
 * 本文ページは文字数比例 (base 2.5s + 1文字55ms) で最小3秒〜最大10秒にクランプする。
 */
export function getAutoplayIntervalMs(item?: ReadingItem): number {
  if (!item || item.kind === "cover_title_spread") {
    return AUTOPLAY_COVER_MS;
  }

  const text = item.page.text ?? "";
  const calculated = AUTOPLAY_BASE_MS + text.length * AUTOPLAY_PER_CHAR_MS;

  return Math.min(Math.max(calculated, AUTOPLAY_MIN_MS), AUTOPLAY_MAX_MS);
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: "easeOut" as const } },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.45, ease: "easeIn" as const } }),
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    setIsLandscape(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isLandscape;
}

export function CinematicViewer({ items, initialIndex = 0, title, originalTitle, onClose, onFeedback }: CinematicViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [dir, setDir] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEndCard, setShowEndCard] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const [rotateHintVisible, setRotateHintVisible] = useState(true);
  const [isTextInverted, setIsTextInverted] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLandscape = useIsLandscape();
  const total = items.length;

  // Hide rotate hint after 3s
  useEffect(() => {
    const t = setTimeout(() => setRotateHintVisible(false), ROTATE_HINT_MS);
    return () => clearTimeout(t);
  }, []);

  // Hide controls hint after 4s
  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), HINT_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  const go = useCallback((next: number, direction: number) => {
    setDir(direction);
    setCurrent(next);
    setShowEndCard(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => {
      if (c >= total - 1) { setIsPlaying(false); setShowEndCard(true); return c; }
      setDir(1);
      setShowEndCard(false);
      return c + 1;
    });
  }, [total]);

  const goPrev = useCallback(() => {
    if (showEndCard) { setShowEndCard(false); return; }
    setCurrent((c) => { if (c <= 0) return c; setDir(-1); return c - 1; });
  }, [showEndCard]);

  const item = items[current];
  const currentInterval = getAutoplayIntervalMs(item);

  useEffect(() => {
    if (!isPlaying) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    timerRef.current = setTimeout(goNext, currentInterval);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, currentInterval, goNext]);

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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchStartYRef.current = e.changedTouches[0]?.clientY ?? null;
  };
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const endX = e.changedTouches[0]?.clientX;
    const endY = e.changedTouches[0]?.clientY;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (startX == null || endX == null) return;
    const deltaX = endX - startX;
    const deltaY = endY != null && startY != null ? endY - startY : 0;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
  };

  const handleContainerClick = () => {
    setShowControls((prev) => !prev);
  };

  if (!item) return null;

  const imageUrl = item.kind === "cover_title_spread" ? item.imageUrl : item.page.imageUrl ?? null;
  const text = item.kind === "cover_title_spread"
    ? item.titleSpreadText ?? item.openingNarration ?? null
    : item.page.text ?? null;
  const displayText = text ?? (item.kind === "cover_title_spread" ? title : null);
  const label = item.kind === "cover_title_spread"
    ? "表紙"
    : `${item.storyPageIndex + 1} / ${items.filter((i) => i.kind === "story_page").length}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
    >

      {/* ── Rotate hint (3s, portrait only) ───────────────────── */}
      <AnimatePresence>
        {rotateHintVisible && !isLandscape && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute bottom-24 left-0 right-0 z-50 flex justify-center"
          >
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2.5 backdrop-blur-sm">
              <motion.div
                animate={{ rotate: [0, -90, -90, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.8 }}
              >
                <RotateCcw className="size-4 text-white/80" />
              </motion.div>
              <span className="text-xs text-white/80">横向きにするとより楽しめます</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] bg-gradient-to-b from-black/80 via-black/40 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium text-white/80 truncate max-w-[50vw]">{title}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTextInverted((v) => !v)}
                className={`flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors ${
                  isTextInverted ? "bg-white text-gray-900" : "bg-white/15 text-white hover:bg-white/25"
                }`}
                aria-label="文字の明暗を切り替え"
              >
                <SunMoon className="size-4" />
              </button>
              {!showEndCard && <span className="text-xs text-white/50">{label}</span>}
              <button onClick={onClose} className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition" aria-label="閉じる">
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="absolute inset-0 flex">
        {isLandscape ? (
          /* ── LANDSCAPE: left=image, right=text ── */
          <AnimatePresence mode="popLayout" custom={dir}>
            <motion.div
              key={current}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex h-full w-full"
            >
              {/* Left: image */}
              <div className="relative h-full w-1/2 shrink-0 overflow-hidden">
                {imageUrl ? (
                  <motion.img
                    src={imageUrl}
                    alt={`${title} ページ${current + 1}`}
                    className="h-full w-full object-cover"
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: currentInterval / 1000 + 0.5, ease: "linear" }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-purple-950">
                    <span className="text-6xl opacity-30">📖</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
              </div>

              {/* Right: text panel */}
              <div className={`relative flex h-full w-1/2 flex-col items-center justify-center px-8 transition-colors duration-300 ${isTextInverted ? "bg-white" : "bg-[#0d0d14]"}`}>
                <AnimatePresence mode="wait">
                  {item.kind === "cover_title_spread" ? (
                    <motion.div
                      key={`cover-${current}`}
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="text-center"
                    >
                      <p className={`text-3xl font-bold md:text-4xl ${isTextInverted ? "text-gray-900" : "text-white"}`} style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}>
                        {originalTitle || title}
                      </p>
                      {originalTitle && originalTitle !== title && (
                        <p className={`mt-2 text-base md:text-lg ${isTextInverted ? "text-gray-500" : "text-white/70"}`} style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}>
                          {title}
                        </p>
                      )}
                    </motion.div>
                  ) : displayText ? (
                    <motion.p
                      key={`text-${current}`}
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`whitespace-pre-line text-center text-base font-medium leading-loose md:text-lg ${isTextInverted ? "text-gray-900" : "text-white/90"}`}
                      style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}
                    >
                      {displayText.replace(/。(?=\S)/g, "。\n")}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                <motion.p
                  key={`label-${current}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-6 text-xs ${isTextInverted ? "text-gray-400" : "text-white/30"}`}
                >
                  {label}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          /* ── PORTRAIT: full image + text overlay ── */
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
                  transition={{ duration: currentInterval / 1000 + 0.5, ease: "linear" }}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-purple-950">
                  <span className="text-6xl opacity-30">📖</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Portrait text overlay ─────────────────────────────── */}
      {!isLandscape && !showEndCard && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-24">
          <div className={`p-4 rounded-2xl transition-colors duration-300 ${isTextInverted ? "bg-white/90 text-gray-900 shadow-lg backdrop-blur-md" : ""}`}>
            <AnimatePresence mode="wait">
              {item.kind === "cover_title_spread" ? (
                <motion.div
                  key={`cover-portrait-${current}`}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center"
                >
                  {originalTitle && (
                    <p className={`text-3xl font-bold md:text-4xl ${isTextInverted ? "text-gray-900" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"}`} style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}>
                      {originalTitle}
                    </p>
                  )}
                  <p className={`mt-1 text-base md:text-lg ${isTextInverted ? "text-gray-700" : "text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"}`} style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}>
                    {title}
                  </p>
                </motion.div>
              ) : displayText ? (
                <motion.p
                  key={current}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`whitespace-pre-line text-center text-lg font-medium leading-relaxed md:text-xl ${isTextInverted ? "text-gray-900" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"}`}
                  style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}
                >
                  {displayText.replace(/。(?=\S)/g, "。\n")}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── End card ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showEndCard && (
          <motion.div
            key="end-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 px-6"
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
              className="text-5xl font-light tracking-[0.25em] text-white/90"
              style={{ fontFamily: "var(--font-body), 'Noto Sans JP', sans-serif" }}
            >
              おしまい
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-10 flex flex-col items-center gap-3 w-full max-w-xs"
            >
              <button
                onClick={() => { setShowEndCard(false); go(0, -1); }}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm text-white hover:bg-white/20 transition"
              >
                <RotateCcw className="size-4" />
                さいしょからよむ
              </button>
              <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white/80 hover:bg-white/15 transition">
                <BookOpen className="size-4" />
                絵本ビューに戻る
              </button>
              {onFeedback && (
                <button onClick={() => { onClose(); onFeedback(); }} className="flex w-full items-center justify-center gap-2 rounded-full bg-violet-500/80 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 transition">
                  <MessageCircle className="size-4" />
                  感想を送る
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop side arrows ───────────────────────────────── */}
      {!showEndCard && showControls && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            disabled={current === 0}
            className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 md:flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition disabled:opacity-0"
            aria-label="前のページ"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 md:flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
            aria-label="次のページ"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* ── Bottom controls ───────────────────────────────────── */}
      <AnimatePresence>
        {!showEndCard && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence>
              {hintVisible && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-[11px] text-white/40 text-center">
                  画面タップでUI切替 / スワイプ / ← → / スペースで操作 · Esc で閉じる
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden max-w-[60vw]">
                {items.map((_, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); go(i, i > current ? 1 : -1); }} className="flex min-h-[44px] min-w-[24px] items-center justify-center" aria-label={`ページ ${i + 1}`}><span className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/35"}`} /></button>
                ))}
              </div>
              <button onClick={() => setIsPlaying((p) => !p)} className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition" aria-label={isPlaying ? "一時停止" : "自動再生"}>
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-0.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
