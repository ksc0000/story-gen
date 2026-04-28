"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationProgress } from "@/components/generation-progress";
import { FloatingParticles } from "@/components/floating-particles";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";

function GeneratingContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { book, pages, loading } = useGenerationProgress(bookId);

  useEffect(() => {
    if (book?.status === "completed") router.push(`/book?id=${bookId}`);
  }, [book?.status, bookId, router]);

  if (!bookId || loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-violet-500">読み込み中...</p>
    </div>
  );

  if (!book) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-violet-500">絵本が見つかりません</p>
      <Link href="/home" className="mt-4 inline-block"><Button variant="outline">本棚に戻る</Button></Link>
    </div>
  );

  if (book.status === "failed") return (
    <PageTransition className="mx-auto max-w-lg px-4 py-16 text-center">
      <Image src="/images/illustrations/generating.webp" alt="失敗" width={120} height={90} className="mx-auto rounded-xl opacity-50" />
      <h2 className="mt-4 text-lg font-bold text-purple-900">絵本の生成に失敗しました</h2>
      <p className="mt-2 text-sm text-violet-500">申し訳ありません。もう一度お試しください。</p>
      {book.errorMessage ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
          {book.errorMessage}
        </p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/create/theme"><Button>もう一度試す</Button></Link>
        <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
      </div>
    </PageTransition>
  );

  return (
    <PageTransition className="relative mx-auto max-w-2xl px-4 py-8">
      <FloatingParticles />
      <div className="relative z-10">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/images/illustrations/generating.webp" alt="生成中" width={120} height={90} className="mx-auto rounded-xl" />
              </motion.div>
              <h1 className="mt-3 text-xl font-bold text-purple-900">絵本を作っています</h1>
              <p className="mt-1 text-sm text-violet-500">しばらくお待ちください...</p>
            </div>
            <div className="mt-6"><GenerationProgress book={book} pages={pages} /></div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center">
          <Link href="/home" className="text-sm text-violet-500 hover:underline">本棚に戻る</Link>
        </div>
      </div>
    </PageTransition>
  );
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-violet-500">読み込み中...</p></div>}>
      <GeneratingContent />
    </Suspense>
  );
}
