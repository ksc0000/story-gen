"use client";

import Link from "next/link";
import Image from "next/image";
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

const FREE_MONTHLY_LIMIT = 3;

export default function HomePage() {
  const { user } = useAuth();
  const { books, loading, error } = useBooks(user?.uid);
  const { profile } = useUserProfile(user?.uid);
  const remaining = FREE_MONTHLY_LIMIT - (profile?.monthlyGenerationCount ?? 0);

  return (
    <PageTransition className="relative mx-auto max-w-4xl px-4 py-8">
      <FloatingParticles />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-900">あなたの本棚</h1>
          <Badge variant="outline">今月あと{Math.max(0, remaining)}冊作れます</Badge>
        </div>
        <div className="mt-6">
          <Link href="/create/theme">
            <Button size="lg" className="text-base px-6">新しい絵本を作る</Button>
          </Link>
        </div>
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
