"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { isDemoMode, deleteDemoBook } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book-card";
import { HeroBook3D } from "@/components/hero-book-3d";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBooks } from "@/lib/hooks/use-books";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useChildren } from "@/lib/hooks/use-children";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";

const FREE_MONTHLY_LIMIT = 3;

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { books, loading, error } = useBooks(user?.uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { profile } = useUserProfile(user?.uid);
  const { children, loading: childrenLoading, activeChild } = useChildren(user?.uid);
  const { isAdmin } = useAdminClaim();
  const remaining = FREE_MONTHLY_LIMIT - (profile?.monthlyGenerationCount ?? 0);

  useEffect(() => {
    if (!childrenLoading && children.length === 0) {
      router.replace("/onboarding/child");
    }
  }, [children.length, childrenLoading, router]);

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!window.confirm(`「${title || "無題の絵本"}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    setDeletingId(bookId);
    setDeleteError(null);

    try {
      if (isDemoMode) {
        deleteDemoBook(bookId);
        // In demo mode, we need to trigger a re-render or wait for useBooks to update.
        // Since useBooks for demo mode just reads from session storage once,
        // we might need to manually update the local state or reload.
        window.location.reload();
        return;
      }
      const { functions } = await import("@/lib/firebase");
      const deleteBookFn = httpsCallable<{ bookId: string }, { success: boolean }>(
        functions,
        "deleteBook"
      );
      await deleteBookFn({ bookId });
    } catch (err: unknown) {
      console.error("Failed to delete book:", err);
      const message = err instanceof Error ? err.message : "絵本の削除に失敗しました";
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition className="relative mx-auto max-w-4xl px-4 py-8">
      <div className="relative z-10">
        <header className="em-header">
          <div className="em-header__badge">
            ✨ あなたの本棚
          </div>
          {activeChild && (
            <p className="em-header__subtitle">主人公: {activeChild.nickname || activeChild.displayName}</p>
          )}
          <div className="mt-4">
            <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-purple-200 text-purple-700">
              今月あと{Math.max(0, remaining)}冊作れます
            </Badge>
          </div>
        </header>
        {deleteError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {deleteError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/create/select-child" className="w-full sm:w-auto">
            <Button size="lg" className="em-btn-cta text-lg w-full sm:w-auto">
              新しい絵本を作る
            </Button>
          </Link>
          <Link href="/children">
            <Button size="lg" variant="outline" className="text-base px-6">子どもプロフィール</Button>
          </Link>
          {isAdmin ? (
            <>
              <Link href="/admin/book-quality-review/">
                <Button size="lg" variant="outline" className="text-base px-6">Book品質レビュー</Button>
              </Link>
              <Link href="/admin/image-model-tests/">
                <Button size="lg" variant="outline" className="text-base px-6">画像モデル比較</Button>
              </Link>
            </>
          ) : null}
        </div>
        {isAdmin ? (
          <p className="mt-2 text-sm text-violet-500">
            管理者向け: Book品質レビューと画像モデル比較を利用できます
          </p>
        ) : null}
        {loading ? (
          <p className="mt-8 text-center text-violet-400">読み込み中...</p>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/90 p-6 text-center text-red-700">
            <p className="font-semibold">本棚の読み込みに失敗しました</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : books.length === 0 ? (
          <div className="mt-16 text-center em-fade-up">
            <HeroBook3D />
            <p className="mt-4 text-violet-500 font-medium">まだ絵本がありません。最初の一冊を作りましょう！</p>
          </div>
        ) : (
          <StaggerContainer className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => (
              <StaggerItem key={book.id}>
                <BookCard
                  book={book}
                  onDelete={
                    book.userId === user?.uid
                      ? () => handleDeleteBook(book.id, book.title || "")
                      : undefined
                  }
                  isDeleting={deletingId === book.id}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
