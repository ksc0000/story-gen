"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { BookOpen, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookCard } from "@/components/bookshelf/book-card";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { HeroBook3D } from "@/components/hero-book-3d";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { toMillisSafe } from "@/lib/date-utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBooks } from "@/lib/hooks/use-books";
import { useChildren } from "@/lib/hooks/use-children";
import type { BookDoc } from "@/lib/types";

type SortMode = "newest" | "oldest" | "title";

const SORT_LABELS: Record<SortMode, string> = {
  newest: "新しい順",
  oldest: "古い順",
  title: "タイトル順",
};

export default function BookshelfPage() {
  const { user } = useAuth();
  const { books, loading, error } = useBooks(user?.uid);
  const { children } = useChildren(user?.uid);

  const [search, setSearch] = useState("");
  const [childFilter, setChildFilter] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("newest");
  const [selectedBook, setSelectedBook] = useState<(BookDoc & { id: string }) | null>(null);

  const handleToggleFavorite = async (book: BookDoc & { id: string }) => {
    if (isDemoMode || !user) return;
    try {
      await updateDoc(doc(db, "books", book.id), {
        favorite: !book.favorite,
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      });
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // 子どもフィルタは実際に絵本がある子だけ表示する。
  const childrenWithBooks = useMemo(() => {
    const ids = new Set(books.map((b) => b.childId).filter(Boolean));
    return children.filter((c) => ids.has(c.id));
  }, [books, children]);

  const visibleBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = books.filter((b) => {
      if (favoritesOnly && !b.favorite) return false;
      if (childFilter && b.childId !== childFilter) return false;
      if (q) {
        const hay = `${b.title ?? ""} ${b.input?.childName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const ms = (b: BookDoc & { id: string }) => toMillisSafe(b.createdAtMs ?? b.createdAt) ?? 0;
    list = [...list].sort((a, b) => {
      // お気に入りは常に上位に固定。
      if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
      if (sort === "title") return (a.title ?? "").localeCompare(b.title ?? "", "ja");
      if (sort === "oldest") return ms(a) - ms(b);
      return ms(b) - ms(a);
    });
    return list;
  }, [books, search, childFilter, favoritesOnly, sort]);

  const hasFiltersActive = Boolean(search.trim() || childFilter || favoritesOnly);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-purple-900 sm:text-4xl">本棚</h1>
        <p className="mt-2 text-violet-500">これまでにつくった絵本</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] rounded-xl bg-violet-100/60" />
              <div className="mt-2 h-3 w-3/4 rounded bg-violet-100/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          <p className="font-semibold">データの取得に失敗しました</p>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <HeroBook3D />
          <p className="mt-6 text-lg font-medium text-purple-800">まだ絵本がありません</p>
          <p className="mt-1 text-sm text-violet-500">最初の一冊を一緒につくってみませんか？</p>
          <Link href="/create/select-child" className="mt-8">
            <Button size="lg" className="px-8 text-lg shadow-lg shadow-purple-200">
              新しい絵本をつくる
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 検索・絞り込み・並べ替え */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="タイトル・お子さんの名前で検索"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFavoritesOnly((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  favoritesOnly
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-violet-200 text-violet-500 hover:border-purple-300"
                )}
              >
                <Star className={cn("h-3.5 w-3.5", favoritesOnly && "fill-current")} />
                お気に入り
              </button>

              {childrenWithBooks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setChildFilter(null)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      childFilter === null
                        ? "border-purple-300 bg-purple-50 text-purple-700"
                        : "border-violet-200 text-violet-500 hover:border-purple-300"
                    )}
                  >
                    すべて
                  </button>
                  {childrenWithBooks.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChildFilter(c.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        childFilter === c.id
                          ? "border-purple-300 bg-purple-50 text-purple-700"
                          : "border-violet-200 text-violet-500 hover:border-purple-300"
                      )}
                    >
                      {c.nickname || c.displayName}
                    </button>
                  ))}
                </>
              )}

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="ml-auto rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-600 focus:border-purple-400 focus:outline-none"
                aria-label="並べ替え"
              >
                {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
                  <option key={m} value={m}>{SORT_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          {visibleBooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 py-12 text-center">
              <p className="text-violet-500">条件に合う絵本が見つかりませんでした。</p>
              {hasFiltersActive && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setChildFilter(null); setFavoritesOnly(false); }}
                  className="mt-3 text-sm font-medium text-purple-600 hover:underline"
                >
                  条件をクリア
                </button>
              )}
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {visibleBooks.map((book) => (
                <StaggerItem key={book.id}>
                  <BookCard book={book} onToggleFavorite={handleToggleFavorite} onSelect={setSelectedBook} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          <div className="flex justify-center pt-4">
            <Link href="/create/select-child">
              <Button size="lg" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                新しい絵本をつくる
              </Button>
            </Link>
          </div>
        </div>
      )}
      <BookPreviewDialog book={selectedBook} onClose={() => setSelectedBook(null)} />
    </PageTransition>
  );
}

function BookPreviewDialog({
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
