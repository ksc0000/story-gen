"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationProgress } from "@/components/generation-progress";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

function GeneratingContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { book, pages, loading } = useGenerationProgress(bookId);

  useEffect(() => {
    if (book?.status === "completed") router.push(`/book?id=${bookId}`);
  }, [book?.status, bookId, router]);

  if (!bookId || loading) return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-amber-700">読み込み中...</p></div>;

  if (!book) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-gray-500">絵本が見つかりません</p>
      <Link href="/home" className="mt-4 inline-block"><Button variant="outline">本棚に戻る</Button></Link>
    </div>
  );

  if (book.status === "failed") return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <span className="text-5xl">😢</span>
      <h2 className="mt-4 text-lg font-bold text-amber-900">絵本の生成に失敗しました</h2>
      <p className="mt-2 text-sm text-gray-500">申し訳ありません。もう一度お試しください。</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/create/theme"><Button className="bg-amber-600 hover:bg-amber-700 text-white">もう一度試す</Button></Link>
        <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="border-amber-200">
        <CardContent className="p-6">
          <div className="text-center">
            <span className="text-4xl animate-bounce">📖</span>
            <h1 className="mt-3 text-xl font-bold text-amber-900">絵本を作っています</h1>
            <p className="mt-1 text-sm text-gray-500">しばらくお待ちください...</p>
          </div>
          <div className="mt-6"><GenerationProgress book={book} pages={pages} /></div>
        </CardContent>
      </Card>
      <div className="mt-4 text-center"><Link href="/home" className="text-sm text-amber-600 hover:underline">本棚に戻る</Link></div>
    </div>
  );
}

export default function GeneratingPage() {
  return <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-amber-700">読み込み中...</p></div>}><GeneratingContent /></Suspense>;
}
