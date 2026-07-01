"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookViewer } from "@/components/book-viewer";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

function ShareBookContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";

  const { book, pages, loading } = useGenerationProgress(bookId);

  if (!bookId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-violet-500">絵本が指定されていません</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">トップページに戻る</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-violet-500">読み込み中...</p>
      </div>
    );
  }

  if (!book || !book.public) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-violet-500">この絵本は見つからないか、公開されていません</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">トップページに戻る</Button>
        </Link>
      </div>
    );
  }

  const viewablePages = pages
    .filter((p) => p.status === "completed" || p.status === "fallback_completed" || p.status === "image_failed")
    .sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      {book.giftMessage ? (
        <div className="mx-auto mb-6 max-w-xl rounded-3xl border border-pink-100 bg-gradient-to-b from-pink-50 to-violet-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-pink-500">🎁 あなたへ、絵本の贈り物です</p>
          <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-purple-900">
            {book.giftMessage}
          </p>
        </div>
      ) : null}
      <h1 className="text-center text-2xl font-bold text-purple-900">{book.title}</h1>

      <div className="mt-6">
        <BookViewer
          pages={viewablePages}
          title={book.title}
          coverImageUrl={book.coverImageUrl}
          hasCoverPage={book.hasCoverPage}
          coverStatus={book.coverStatus}
          readingStructureVersion={book.readingStructureVersion}
          titleSpreadText={book.titleSpreadText}
          openingNarration={book.openingNarration}
        />
      </div>

      <div className="mt-12 flex flex-col items-center gap-6 rounded-3xl border border-violet-100 bg-violet-50/50 p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-purple-900">あなたも絵本を作ってみませんか？</h2>
          <p className="mt-2 text-violet-600">
            Ehoria（エホリア）なら、お子さまが主人公の物語をAIで簡単に作成できます。
          </p>
        </div>
        <Link href="/">
          <Button size="lg" className="em-btn-cta px-10 text-lg">
            Ehoriaで絵本を作る
          </Button>
        </Link>
      </div>
    </PageTransition>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-violet-500">読み込み中...</p>
        </div>
      }
    >
      <ShareBookContent />
    </Suspense>
  );
}
