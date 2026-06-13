"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/bookshelf/book-card";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { HeroBook3D } from "@/components/hero-book-3d";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBooks } from "@/lib/hooks/use-books";

export default function BookshelfPage() {
  const { user } = useAuth();
  const { books, loading, error } = useBooks(user?.uid);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-purple-900 sm:text-4xl">本棚</h1>
        <p className="mt-2 text-violet-500">これまでにつくった絵本</p>
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
          <p className="mt-6 text-lg font-medium text-purple-800">まだ絵本がありません</p>
          <p className="mt-1 text-sm text-violet-500">最初の一冊を一緒につくってみませんか？</p>
          <Link href="/create/select-child" className="mt-8">
            <Button size="lg" className="px-8 text-lg shadow-lg shadow-purple-200">
              新しい絵本をつくる
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

          <div className="flex justify-center pt-8">
            <Link href="/create/select-child">
              <Button size="lg" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                新しい絵本をつくる
              </Button>
            </Link>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
