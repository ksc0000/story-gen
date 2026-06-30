"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GenerationProgress } from "@/components/generation-progress";
import { FloatingParticles } from "@/components/floating-particles";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";
import { useAuth } from "@/lib/hooks/use-auth";
import { createRetryBook } from "@/lib/retry-book";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
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
  const heroName =
    book.childProfileSnapshot?.nickname ||
    book.childProfileSnapshot?.displayName ||
    book.input?.childName ||
    "おこさま";
  const styleName = book.selectedStyleName;
  const companionName = book.input?.companionName;

  return {
    heroName,
    styleName,
    companionName,
    title: book.title?.trim() || null,
    completedPages,
    totalPages,
    step: getProgressStep(book.progress ?? 0, pages),
  };
}

function isQuotaExceeded(book: BookDoc): boolean {
  return book.failureStage === "validation" && book.failureProvider === "system";
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

  if (isQuotaExceeded(book)) {
    return book.errorMessage ?? "今月の生成回数に達しました。プランをアップグレードすると続けて作成できます。";
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
  const { user } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  // Firestore onSnapshot は毎更新で新しいオブジェクト参照を返すため、
  // useEffect([book]) が重複発火する。bookId:status をキーに1回だけ送信する。
  const reportedStatusRef = useRef<string | null>(null);
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
    const terminalStatuses = ["completed", "partial_completed", "failed"];
    if (!terminalStatuses.includes(book.status)) return;
    // 同じ (bookId, status) の組み合わせで重複発火しないよう dedup
    const key = `${book.id}:${book.status}`;
    if (reportedStatusRef.current === key) return;
    reportedStatusRef.current = key;

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

  const handleRetrySameSettings = async () => {
    if (!user || isRetrying) return;
    setIsRetrying(true);
    setRetryError(null);
    try {
      trackAnalyticsEvent("retry_book_generation", {
        creationMode: book.creationMode ?? "guided_ai",
        templateId: book.templateId ?? book.theme,
        failureStage: book.failureStage,
      });
      const newId = await createRetryBook(book, user.uid);
      router.push(`/generating?id=${newId}`);
    } catch (err) {
      console.error("Failed to retry book generation:", err);
      setRetryError("再試行を開始できませんでした。少し時間をおいてお試しください。");
      setIsRetrying(false);
    }
  };

  if (book.status === "failed") {
    const quota = isQuotaExceeded(book);
    return (
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
        {retryError ? (
          <p className="mt-3 text-sm text-rose-500">{retryError}</p>
        ) : null}
        {quota ? (
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/pricing"><Button>プランをアップグレード</Button></Link>
            <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button onClick={handleRetrySameSettings} disabled={isRetrying || !user} className="w-full max-w-xs">
              {isRetrying ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              同じ内容でもう一度つくる
            </Button>
            <div className="flex gap-3">
              <Link href="/create/select-child"><Button variant="outline" disabled={isRetrying}>条件を変えてつくる</Button></Link>
              <Link href="/home"><Button variant="ghost" className="text-violet-500" disabled={isRetrying}>本棚に戻る</Button></Link>
            </div>
          </div>
        )}
      </PageTransition>
    );
  }

  const summary = getGeneratingSummary(book, completedPages, totalPages, pages);
  const hasLongWait = pages.some((p) => (p.imageDurationMs ?? 0) > 90_000);

  return (
    <PageTransition className="relative mx-auto max-w-2xl px-4 py-8">
      <FloatingParticles />
      <div className="relative z-10">
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="text-center">
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/images/illustrations/generating.webp" alt="生成中" width={120} height={90} className="mx-auto rounded-xl" />
              </motion.div>
              <h1 className="mt-3 text-xl font-bold text-purple-900">
                {summary.heroName}の絵本を作っています
              </h1>
              {summary.title ? (
                <p className="mt-1 text-base font-semibold text-purple-700">「{summary.title}」</p>
              ) : null}
              <p className="mt-1 text-sm text-violet-500">{summary.step}</p>
              <TriviaRotation />
              {hasLongWait ? (
                <p className="mt-1 text-xs text-amber-600">一部画像の仕上げに時間がかかっています</p>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SummaryCard label="主人公" value={summary.heroName} />
              {summary.companionName ? (
                <SummaryCard label="いっしょに登場" value={summary.companionName} />
              ) : null}
              {summary.styleName ? (
                <SummaryCard label="絵のタッチ" value={summary.styleName} />
              ) : null}
              <SummaryCard label="ページ数" value={`${book.pageCount}ページ`} />
              <SummaryCard
                label="進み具合"
                value={`${summary.completedPages} / ${summary.totalPages} ページ`}
              />
            </div>
            <div className="mt-6"><GenerationProgress book={book} pages={pages} /></div>
            <p className="mt-4 text-center text-sm text-violet-500">
              この画面を閉じても、本棚から確認できます。
            </p>
        </div>
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
