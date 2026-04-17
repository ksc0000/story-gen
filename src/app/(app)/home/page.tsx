"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book-card";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBooks } from "@/lib/hooks/use-books";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

const FREE_MONTHLY_LIMIT = 3;

export default function HomePage() {
  const { user } = useAuth();
  const { books, loading } = useBooks(user?.uid);
  const { profile } = useUserProfile(user?.uid);
  const remaining = FREE_MONTHLY_LIMIT - (profile?.monthlyGenerationCount ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">あなたの本棚</h1>
        <Badge variant="outline" className="text-amber-700 border-amber-300">今月あと{Math.max(0, remaining)}冊作れます</Badge>
      </div>
      <div className="mt-6">
        <Link href="/create/theme"><Button className="bg-amber-600 hover:bg-amber-700 text-white">新しい絵本を作る</Button></Link>
      </div>
      {loading ? <p className="mt-8 text-center text-gray-400">読み込み中...</p>
        : books.length === 0 ? (
          <div className="mt-16 text-center">
            <span className="text-6xl">📚</span>
            <p className="mt-4 text-gray-500">まだ絵本がありません。最初の一冊を作りましょう！</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        )}
    </div>
  );
}
