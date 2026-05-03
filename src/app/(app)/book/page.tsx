"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { BookViewer } from "@/components/book-viewer";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";
import { useAuth } from "@/lib/hooks/use-auth";
import { db } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { BookFeedbackDoc } from "@/lib/types";

function BookContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const { user } = useAuth();
  const { book, pages, loading } = useGenerationProgress(bookId);
  const [feedback, setFeedback] = useState<{
    rating: "great" | "okay" | "redo";
    childLikenessRating: number;
    illustrationRating: number;
    storyRating: number;
    consistencyRating: number;
    wantToCreateAgain: number;
    comment: string;
  }>({
    rating: "great",
    childLikenessRating: 5,
    illustrationRating: 5,
    storyRating: 5,
    consistencyRating: 5,
    wantToCreateAgain: 5,
    comment: "",
  });
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const canSubmitFeedback = Boolean(user && book && book.userId === user.uid && !isDemoMode);

  useEffect(() => {
    if (!user || !bookId || isDemoMode) return;

    return onSnapshot(doc(db, "books", bookId, "feedback", user.uid), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as Partial<BookFeedbackDoc>;
      setFeedback({
        rating: data.rating ?? "great",
        childLikenessRating: data.childLikenessRating ?? 5,
        illustrationRating: data.illustrationRating ?? 5,
        storyRating: data.storyRating ?? 5,
        consistencyRating: data.consistencyRating ?? 5,
        wantToCreateAgain: data.wantToCreateAgain ?? 5,
        comment: data.comment ?? "",
      });
      setFeedbackSaved(true);
    });
  }, [bookId, user]);

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

  const completedPages = pages.filter((p) => p.status === "completed").sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-purple-900">{book.title}</h1>
      <div className="mt-6"><BookViewer pages={completedPages} title={book.title} /></div>
      {user && !isDemoMode ? (
        <div className="mt-8 rounded-3xl border border-[rgba(216,180,254,0.45)] bg-[rgba(250,245,255,0.96)] p-6">
          <h2 className="text-lg font-semibold text-purple-900">この絵本はどうでしたか？</h2>
          <p className="mt-1 text-sm text-violet-600">
            仕上がりの感想を教えてもらえると、今後の品質改善に活かせます。
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { value: "great", label: "とてもよい" },
              { value: "okay", label: "まあまあ" },
              { value: "redo", label: "作り直したい" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFeedback((current) => ({ ...current, rating: option.value as "great" | "okay" | "redo" }));
                  setFeedbackSaved(false);
                }}
                className={`rounded-2xl border px-4 py-3 text-sm transition ${
                  feedback.rating === option.value
                    ? "border-purple-400 bg-white text-purple-700"
                    : "border-[rgba(240,171,252,0.35)] bg-white/80 text-violet-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <RatingField
              label="子どもらしさ"
              value={feedback.childLikenessRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, childLikenessRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <RatingField
              label="絵のかわいさ"
              value={feedback.illustrationRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, illustrationRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <RatingField
              label="お話のよさ"
              value={feedback.storyRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, storyRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <RatingField
              label="ページ間の統一感"
              value={feedback.consistencyRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, consistencyRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <RatingField
              label="また作りたいか"
              value={feedback.wantToCreateAgain}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, wantToCreateAgain: value }));
                setFeedbackSaved(false);
              }}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="feedback-comment" className="text-sm font-medium text-purple-800">
              気になったところがあれば教えてください
            </label>
            <textarea
              id="feedback-comment"
              value={feedback.comment}
              onChange={(event) => {
                setFeedback((current) => ({ ...current, comment: event.target.value }));
                setFeedbackSaved(false);
              }}
              rows={4}
              className="mt-2 w-full rounded-[20px] border border-[rgba(240,171,252,0.35)] bg-background px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              placeholder="もう少し子どもらしい表情だとうれしい、背景はすごくよかった、など"
            />
          </div>

          {feedbackError ? (
            <p className="mt-3 text-sm text-rose-600">{feedbackError}</p>
          ) : null}
          {!canSubmitFeedback ? (
            <p className="mt-3 text-sm text-violet-600">
              この絵本のフィードバックを送信できるのは、この絵本を作成したユーザーのみです。
            </p>
          ) : null}
          {feedbackSaved ? (
            <p className="mt-3 text-sm text-emerald-600">ご協力ありがとうございます。</p>
          ) : null}

          <div className="mt-4">
            <Button
              onClick={async () => {
                if (!user || !book || book.userId !== user.uid) {
                  setFeedbackError("この絵本のフィードバックを保存する権限がありません。");
                  return;
                }
                setFeedbackSaving(true);
                setFeedbackError(null);
                try {
                  const nowMs = Date.now();
                  const createdFields = feedbackSaved
                    ? {}
                    : {
                        createdAt: serverTimestamp(),
                        createdAtMs: nowMs,
                      };
                  await setDoc(
                    doc(db, "books", bookId, "feedback", user.uid),
                    {
                      userId: user.uid,
                      bookId,
                      productPlan: book.productPlan ?? "free",
                      imageModelProfile: book.imageModelProfile,
                      storyModel: book.storyModel,
                      rating: feedback.rating,
                      childLikenessRating: feedback.childLikenessRating,
                      illustrationRating: feedback.illustrationRating,
                      storyRating: feedback.storyRating,
                      consistencyRating: feedback.consistencyRating,
                      wantToCreateAgain: feedback.wantToCreateAgain,
                      comment: feedback.comment.trim(),
                      ...createdFields,
                      updatedAt: serverTimestamp(),
                      updatedAtMs: nowMs,
                    },
                    { merge: true }
                  );
                  setFeedbackSaved(true);
                  trackAnalyticsEvent("submit_book_feedback", {
                    productPlan: book.productPlan ?? "free",
                    imageQualityTier: book.imageQualityTier ?? "light",
                    pageCount: book.pageCount,
                    creationMode: book.creationMode ?? "guided_ai",
                    templateId: book.templateId ?? book.theme,
                    rating: feedback.rating,
                  });
                } catch (error) {
                  console.error("Failed to save book feedback:", error);
                  const message = error instanceof Error ? error.message : "Unknown error";
                  setFeedbackError(`フィードバックの保存に失敗しました: ${message}`);
                } finally {
                  setFeedbackSaving(false);
                }
              }}
              disabled={feedbackSaving || !canSubmitFeedback}
            >
              {feedbackSaving ? "保存中..." : "フィードバックを送る"}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
        <Link href="/create/theme"><Button>もう一冊作る</Button></Link>
      </div>
    </PageTransition>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-purple-800">{label}</label>
      <select
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-[18px] border border-[rgba(240,171,252,0.35)] bg-background px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-violet-500">読み込み中...</p></div>}>
      <BookContent />
    </Suspense>
  );
}
