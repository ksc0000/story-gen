"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import type { BookDoc } from "@/lib/types";

/**
 * 本棚カードをタップしたときの表紙プレビューポップアップ。
 * 水彩フレーム画像の中央窓に実際の表紙を埋め込み、明示的な CTA から
 * 絵本ビューア（生成中は進捗画面）へ遷移する。/home と /bookshelf で共用。
 */
export function BookPreviewDialog({
  book,
  onClose,
}: {
  book: (BookDoc & { id: string }) | null;
  onClose: () => void;
}) {
  const isOpen = book !== null;

  // Escape で閉じる＋表示中は背景スクロールを止める。
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!book) return null;

  const href = book.status === "generating" ? `/generating?id=${book.id}` : `/book?id=${book.id}`;
  const title = book.title || (book.status === "generating" ? "生成中の絵本" : "無題の絵本");
  const ctaLabel = book.status === "generating" ? "生成状況を見る" : "絵本を読む";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-purple-950/35 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-preview-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[2rem] border border-white/70 bg-white/95 p-4 shadow-2xl shadow-purple-950/20 sm:max-w-md sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-violet-500 shadow-sm transition hover:bg-violet-50 hover:text-purple-700"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto max-w-[260px] sm:max-w-[300px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[1.6rem] shadow-xl shadow-purple-900/20">
            <Image
              src="/images/bookshelf/cover-popup-frame.webp"
              alt=""
              fill
              sizes="300px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-x-[21%] bottom-[25%] top-[24%] overflow-hidden rounded-xl bg-white shadow-inner">
              {book.coverImageUrl ? (
                <Image
                  src={book.coverImageUrl}
                  alt={`${title}の表紙`}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-50 to-purple-100 text-violet-300">
                  <Image src="/images/icons/book.webp" alt="" width={64} height={64} className="opacity-60" />
                  {book.status === "generating" && (
                    <span className="text-xs font-medium text-violet-400">生成中...</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <h2 id="book-preview-title" className="text-lg font-bold text-purple-950">
            {title}
          </h2>
          <p className="mt-1 text-sm text-violet-500">
            表紙をひらいて、物語の世界へ。
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 px-7 text-sm font-semibold text-white shadow-[0_4px_0_rgb(139,92,246),0_8px_16px_rgba(167,139,250,0.35)] transition hover:from-purple-500 hover:to-violet-500 active:translate-y-[2px] active:shadow-[0_2px_0_rgb(109,40,217),0_4px_8px_rgba(167,139,250,0.25)]"
            onClick={onClose}
          >
            <BookOpen className="h-4 w-4" />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
