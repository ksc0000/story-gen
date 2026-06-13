"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/bookshelf/book-card";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { HeroBook3D } from "@/components/hero-book-3d";
import { usePublicBooks } from "@/lib/hooks/use-public-books";

export default function GalleryPage() {
  const { books, loading, error } = usePublicBooks(40);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-5 py-2 text-xs font-bold tracking-wide text-purple-900 shadow-sm backdrop-blur-sm mb-4">
          ✨ サンプルギャラリー
        </div>
        <h1 className="text-3xl font-bold text-purple-900 sm:text-4xl">みんなの絵本ギャラリー</h1>
        <p className="mt-2 text-violet-500 text-sm sm:text-base">
          Ehoriaで作られた素敵な絵本のサンプルをご紹介します。
          <br className="hidden sm:inline" />
          物語やスタイルの参考にしてみてください。
        </p>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-violet-400">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          <p className="font-semibold">データの取得に失敗しました</p>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <HeroBook3D />
          <p className="mt-6 text-lg font-medium text-purple-800">まだ公開されている絵本がありません</p>
          <p className="mt-1 text-sm text-violet-500">これからたくさんの作品が登場する予定です。お楽しみに！</p>
          <Link href="/create/select-child" className="mt-8">
            <Button size="lg" className="px-8 text-lg shadow-lg shadow-purple-200">
              自分だけの絵本をつくる
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => (
              <StaggerItem key={book.id}>
                <BookCard book={book} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="flex flex-col items-center gap-4 pt-12 border-t border-violet-100 mt-12">
            <p className="text-sm text-violet-500 font-medium">あなたも自分だけの物語を作ってみませんか？</p>
            <Link href="/create/select-child">
              <Button size="lg" className="px-10 text-lg shadow-xl shadow-purple-200">
                新しい絵本をつくる
              </Button>
            </Link>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
