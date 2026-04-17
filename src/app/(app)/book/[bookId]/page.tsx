"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookViewer } from "@/components/book-viewer";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

export default function BookPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const { book, pages, loading } = useGenerationProgress(bookId);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-amber-700">読み込み中...</p></div>;

  if (!book) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-gray-500">絵本が見つかりません</p>
      <Link href="/home" className="mt-4 inline-block"><Button variant="outline">本棚に戻る</Button></Link>
    </div>
  );

  const completedPages = pages.filter((p) => p.status === "completed").sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-amber-900">{book.title}</h1>
      <div className="mt-6"><BookViewer pages={completedPages} title={book.title} /></div>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
        <Link href="/create/theme"><Button className="bg-amber-600 hover:bg-amber-700 text-white">もう一冊作る</Button></Link>
      </div>
    </div>
  );
}
