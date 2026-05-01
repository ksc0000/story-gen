"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book-card";
import { FloatingParticles } from "@/components/floating-particles";
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
  const { profile } = useUserProfile(user?.uid);
  const { children, loading: childrenLoading, activeChild } = useChildren(user?.uid);
  const { isAdmin } = useAdminClaim();
  const remaining = FREE_MONTHLY_LIMIT - (profile?.monthlyGenerationCount ?? 0);

  useEffect(() => {
    if (!childrenLoading && children.length === 0) {
      router.replace("/onboarding/child");
    }
  }, [children.length, childrenLoading, router]);

  return (
    <PageTransition className="relative mx-auto max-w-4xl px-4 py-8">
      <FloatingParticles />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-900">あなたの本棚</h1>
            {activeChild ? (
              <p className="mt-1 text-sm text-violet-500">主人公: {activeChild.nickname || activeChild.displayName}</p>
            ) : null}
          </div>
          <Badge variant="outline">今月あと{Math.max(0, remaining)}冊作れます</Badge>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/create/select-child">
            <Button size="lg" className="text-base px-6">新しい絵本を作る</Button>
          </Link>
          <Link href="/children">
            <Button size="lg" variant="outline" className="text-base px-6">子どもプロフィール</Button>
          </Link>
          {isAdmin ? (
            <Link href="/admin/image-model-tests/">
              <Button size="lg" variant="outline" className="text-base px-6">画像モデル比較</Button>
            </Link>
          ) : null}
        </div>
        {isAdmin ? (
          <p className="mt-2 text-sm text-violet-500">
            管理者向け: light / standard / premium の生成結果を比較
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
          <div className="mt-16 text-center">
            <Image
              src="/images/illustrations/empty-shelf.webp"
              alt="空の本棚"
              width={200}
              height={150}
              className="mx-auto rounded-xl"
            />
            <p className="mt-4 text-violet-500">まだ絵本がありません。最初の一冊を作りましょう！</p>
          </div>
        ) : (
          <StaggerContainer className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => (
              <StaggerItem key={book.id}>
                <BookCard book={book} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
