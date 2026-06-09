"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import type { BookDoc, PageDoc } from "@/lib/types";

function getProgressStep(progress: number, pages: PageDoc[]) {
  const completedPages = pages.filter((p) => p.status === "completed" || p.status === "fallback_completed").length;
  const totalPages = pages.length;

  if (progress < 20) return "本文を作っています";
  if (progress < 35) return "キャラクターを整えています";
  if (totalPages > 0 && completedPages < totalPages) {
    return `画像を生成しています ${completedPages}/${totalPages}`;
  }
  if (progress < 80) return "ページのイラストを描いています";
  return "仕上げています";
}

function getGeneratingSummary(book: BookDoc, completedPages: number, totalPages: number, pages: PageDoc[]) {
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
    step: getProgressStep(book.progress ?? 0, pages),
  };
}

function getFailureMessage(book: BookDoc): string {
  if (book.failureStage === "story_generation" && book.failureProvider === "gemini" && book.retryable) {
    return "現在、ストーリー生成AIが混み合っています。少し時間をおいて、同じ内容で再作成できます。";
  }

  if (book.failureStage === "schema_validation") {
    return "絵本の構成データを整える途中で失敗しました。入力内容が原因ではない可能性があります。もう一度お試しください。";
  }

  if (book.failureStage === "quality_gate") {
    return "絵本の内容を整えきれませんでした。もう一度作成すると、別の構成で成功する場合があります。";
  }

  if (book.failureStage === "image_generation" && book.failureProvider === "replicate") {
    return "画像生成AIの処理に時間がかかっています。少し時間をおいて再試行してください。";
  }

  if (book.failureStage === "validation") {
    return "入力内容を確認してください。";
  }

  return "途中で生成処理に失敗しました。少し時間をおいて、もう一度お試しください。すぐ作りたい場合は、テンプレート絵本なら短時間で作成できます。";
}

const TRIVIA = [
  "FLUX という画像 AI が、主人公の表情を 1 ページずつ丁寧に描いています",
  "絵本の文章は Gemini が、お子さんの年齢に合わせて書いています",
  "キャラクター一貫性モードでは、全ページに同じキャラクターが登場するよう調整しています",
  "画像 1 枚の生成には 30〜60 秒かかることがあります",
  "テンプレートモードなら、より短時間で絵本を作れます",
  "完成した絵本は本棚から何度でも読み返せます",
  "ページ数が多いほど、より豊かなストーリーになります",
  "生成中もこの画面を閉じて大丈夫。本棚から確認できます",
];

function TriviaRotation() {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TRIVIA.length);
    }, 7000); // 7 seconds

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <p className="mt-4 text-xs text-violet-400">
        豆知識: {TRIVIA[0]}
      </p>
    );
  }

  return (
    <div className="mt-4 flex min-h-[2.5rem] items-center justify-center px-4 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="text-xs text-violet-400"
        >
          豆知識: {TRIVIA[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function GeneratingContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const router = useRouter();
  const { book, pages, loading } = useGenerationProgress(bookId);
  const completedPages = pages.filter((page) => page.status === "completed" || page.status === "fallback_completed").length;
  const totalPages = book?.pageCount ?? Math.max(pages.length, 1);

  useEffect(() => {
    if (book?.status === "completed" || book?.status === "partial_completed") {
      router.push(`/book?id=${bookId}`);
    }
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
    } else if (book.status === "partial_completed") {
      trackAnalyticsEvent("partial_complete_book_generation", {
        productPlan: book.productPlan ?? "free",
        imageQualityTier: book.imageQualityTier ?? "light",
        pageCount: book.pageCount,
        creationMode: book.creationMode ?? "guided_ai",
        templateId: book.templateId ?? book.theme,
        imageSuccessCount: book.imageSuccessCount,
        imageFailureCount: book.imageFailureCount,
      });
    } else if (book.status === "failed") {
      trackAnalyticsEvent("fail_book_generation", {
        productPlan: book.productPlan ?? "free",
        imageQualityTier: book.imageQualityTier ?? "light",
        pageCount: book.pageCount,
        creationMode: book.creationMode ?? "guided_ai",
        templateId: book.templateId ?? book.theme,
        failureStage: book.failureStage,
        failureProvider: book.failureProvider,
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
        {getFailureMessage(book)}
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

  const summary = getGeneratingSummary(book, completedPages, totalPages, pages);
  const hasLongWait = pages.some((p) => (p.imageDurationMs ?? 0) > 90_000);

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
              <TriviaRotation />
              {hasLongWait ? (
                <p className="mt-1 text-xs text-amber-600">一部画像の仕上げに時間がかかっています</p>
              ) : null}
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
