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
import {
  CHARACTER_CONSISTENCY_LABELS,
  CREATION_MODE_LABELS,
  getPlanDisplayLabel,
  IMAGE_QUALITY_LABELS,
} from "@/lib/plans";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { BookDoc } from "@/lib/types";

function getProgressStep(progress: number) {
  if (progress < 20) return "お話の準備をしています";
  if (progress < 40) return "絵本の世界観を整えています";
  if (progress < 80) return "ページのイラストを描いています";
  return "仕上げています";
}

function getGeneratingSummary(book: BookDoc, completedPages: number, totalPages: number) {
  const productPlan = getPlanDisplayLabel(book.productPlan ?? "free");
  const quality = IMAGE_QUALITY_LABELS[book.imageQualityTier ?? "light"];
  const consistency =
    CHARACTER_CONSISTENCY_LABELS[book.characterConsistencyMode ?? "cover_only"];
  const creationMode = CREATION_MODE_LABELS[book.creationMode ?? "guided_ai"];

  return {
    productPlan,
    quality,
    consistency,
    creationMode,
    completedPages,
    totalPages,
    step: getProgressStep(book.progress ?? 0),
  };
}

function GeneratingContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { book, pages, loading } = useGenerationProgress(bookId);
  const completedPages = pages.filter((page) => page.status === "completed").length;
  const totalPages = book?.pageCount ?? Math.max(pages.length, 1);

  useEffect(() => {
    if (book?.status === "completed") router.push(`/book?id=${bookId}`);
  }, [book?.status, bookId, router]);

  useEffect(() => {
    if (!book) return;
    if (book.status === "completed") {
      trackAnalyticsEvent("complete_book_generation", {
        productPlan: book.productPlan ?? "free",
        imageQualityTier: book.imageQualityTier ?? "light",
        pageCount: book.pageCount,
        creationMode: book.creationMode ?? "guided_ai",
        templateId: book.templateId ?? book.theme,
      });
    } else if (book.status === "failed") {
      trackAnalyticsEvent("fail_book_generation", {
        productPlan: book.productPlan ?? "free",
        imageQualityTier: book.imageQualityTier ?? "light",
        pageCount: book.pageCount,
        creationMode: book.creationMode ?? "guided_ai",
        templateId: book.templateId ?? book.theme,
      });
    }
  }, [book]);

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
      <p className="mt-2 text-sm text-violet-500">
        途中で画像生成が止まったか、生成条件のどこかで失敗しました。内容は本棚に残らないので、条件を少し変えてもう一度お試しください。
      </p>
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

  const summary = getGeneratingSummary(book, completedPages, totalPages);

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
              <p className="mt-1 text-sm text-violet-500">{summary.step}</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SummaryCard label="プラン" value={summary.productPlan} />
              <SummaryCard label="ページ数" value={`${book.pageCount}ページ`} />
              <SummaryCard
                label="画質"
                value={`${summary.quality.label} / ${summary.quality.description}`}
              />
              <SummaryCard label="作成モード" value={summary.creationMode} />
              <SummaryCard
                label="進み具合"
                value={`${summary.completedPages} / ${summary.totalPages} ページ`}
              />
              <SummaryCard label="仕上がり方針" value={summary.consistency.label} />
            </div>
            <div className="mt-6"><GenerationProgress book={book} pages={pages} /></div>
            <p className="mt-4 text-center text-sm text-violet-500">
              この画面を閉じても、本棚から確認できます。
            </p>
          </CardContent>
        </Card>
        <div className="mt-4 text-center">
          <Link href="/home" className="text-sm text-violet-500 hover:underline">本棚に戻る</Link>
        </div>
      </div>
    </PageTransition>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-violet-50 p-3 text-left">
      <p className="text-xs font-medium text-violet-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-purple-900">{value}</p>
    </div>
  );
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-violet-500">読み込み中...</p></div>}>
      <GeneratingContent />
    </Suspense>
  );
}
