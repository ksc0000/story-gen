"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Share2, Check, Copy, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookViewer } from "@/components/book-viewer";
import { BookNextActions } from "@/components/book-next-actions";
import { PageTransition } from "@/components/page-transition";
import { useGenerationProgress } from "@/lib/hooks/use-generation-progress";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { db, functions } from "@/lib/firebase";
import { isDemoMode } from "@/lib/demo";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { BookFeedbackDoc, PageDoc } from "@/lib/types";

function BookContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id") ?? "";
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
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
  const [regeneratingPages, setRegeneratingPages] = useState<Set<number>>(new Set());
  const [regenerationErrors, setRegenerationErrors] = useState<Record<number, string>>({});
  const [isSharing, setIsSharing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const canSubmitFeedback = Boolean(user && book && book.userId === user.uid && !isDemoMode);
  const isOwner = Boolean(user && book && book.userId === user.uid);

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

  const viewablePages = pages
    .filter((p) => p.status === "completed" || p.status === "fallback_completed" || p.status === "image_failed")
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const failedPages = pages
    .filter((p) => p.status === "image_failed")
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const generatingPages = pages.filter((p) => p.status === "generating");

  const isPartial = book.status === "partial_completed";

  async function handleToggleShare() {
    if (!book || !isOwner) return;
    setIsSharing(true);
    try {
      const isPublic = !book.public;
      await updateDoc(doc(db, "books", bookId), {
        public: isPublic,
        updatedAt: serverTimestamp(),
      });
      if (isPublic) {
        handleCopyLink();
      }
    } catch (err) {
      console.error("Failed to toggle share:", err);
    } finally {
      setIsSharing(false);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/share?id=${bookId}`;
    navigator.clipboard.writeText(url).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  }

  async function handleRegeneratePage(page: PageDoc) {
    if (!bookId || regeneratingPages.has(page.pageNumber)) return;
    setRegeneratingPages((prev) => new Set(prev).add(page.pageNumber));
    setRegenerationErrors((prev) => {
      const next = { ...prev };
      delete next[page.pageNumber];
      return next;
    });
    try {
      const regenerate = httpsCallable(functions, "regeneratePageImage");
      await regenerate({ bookId, pageNumber: page.pageNumber });
    } catch (err) {
      const message = err instanceof Error ? err.message : "再生成に失敗しました。";
      setRegenerationErrors((prev) => ({ ...prev, [page.pageNumber]: message }));
    } finally {
      setRegeneratingPages((prev) => {
        const next = new Set(prev);
        next.delete(page.pageNumber);
        return next;
      });
    }
  }

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-center text-2xl font-bold text-purple-900">{book.title}</h1>
        {isOwner && !isDemoMode && (
          <div className="flex items-center gap-2">
            <Button
              variant={book.public ? "outline" : "default"}
              size="sm"
              onClick={handleToggleShare}
              disabled={isSharing}
              className={cn("rounded-full px-4", book.public && "border-purple-200 text-purple-700")}
            >
              {isSharing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : book.public ? (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  公開中
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  共有する
                </>
              )}
            </Button>
            {book.public && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="rounded-full px-4 border-purple-200 text-purple-700"
              >
                {showCopied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    リンクをコピー
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {isPartial && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          一部のページが完成していません。「このページを仕上げる」ボタンで再試行できます。
        </div>
      )}

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
          onRegeneratePage={isOwner && !isDemoMode ? (index) => handleRegeneratePage(viewablePages[index]) : undefined}
          isRegeneratingPage={(index) => regeneratingPages.has(viewablePages[index].pageNumber)}
        />
      </div>

      {isOwner && (
        <BookNextActions
          bookId={bookId}
          book={book}
          isDemoMode={isDemoMode}
          onToggleShare={handleToggleShare}
          isSharing={isSharing}
        />
      )}

      {(failedPages.length > 0 || generatingPages.length > 0) && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-purple-900">未完成のページ</h2>

          {generatingPages.map((page) => (
            <div
              key={page.pageNumber}
              className="flex items-center gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"
            >
              <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-xs text-violet-400">
                仕上げ中...
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">
                  ページ {page.pageNumber + 1}
                </p>
                <p className="text-xs text-violet-500">生成中です。しばらくお待ちください。</p>
              </div>
            </div>
          ))}

          {failedPages.map((page) => {
            const isRegenerating = regeneratingPages.has(page.pageNumber);
            const error = regenerationErrors[page.pageNumber];
            return (
              <div
                key={page.pageNumber}
                className="flex items-start gap-4 rounded-2xl border border-rose-100 bg-rose-50 p-4"
              >
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-xs text-rose-400">
                  未完成
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-purple-900">
                    ページ {page.pageNumber + 1}
                  </p>
                  <p className="text-xs text-violet-600">{page.text?.slice(0, 60)}…</p>
                  {error && (
                    <p className="text-xs text-rose-600">{error}</p>
                  )}
                  {isOwner && !isDemoMode && (
                    <Button
                      size="sm"
                      onClick={() => handleRegeneratePage(page)}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? "仕上げ中..." : "このページを仕上げる"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && !isDemoMode && isOwner ? (
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
            <StarRating
              label="子どもらしさ"
              value={feedback.childLikenessRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, childLikenessRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <StarRating
              label="絵のかわいさ"
              value={feedback.illustrationRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, illustrationRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <StarRating
              label="お話のよさ"
              value={feedback.storyRating}
              onChange={(value) => {
                setFeedback((current) => ({ ...current, storyRating: value }));
                setFeedbackSaved(false);
              }}
            />
            <StarRating
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
      {user && !isDemoMode && isOwner && profile?.plan === "free" && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-amber-900 leading-tight">
              ✨ プレミアムにアップグレードすると<br className="sm:hidden" />
              次の絵本から高品質生成が使えます
            </p>
          </div>
          <Link href="/pricing" className="shrink-0 w-full sm:w-auto">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0 w-full">
              プランを見る
            </Button>
          </Link>
        </div>
      )}
      {!isOwner && (
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/home"><Button variant="outline">本棚に戻る</Button></Link>
          <Link href="/create/theme"><Button>もう一冊作る</Button></Link>
        </div>
      )}
    </PageTransition>
  );
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-violet-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "text-2xl transition",
              star <= value ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"
            )}
          >
            ★
          </button>
        ))}
      </div>
    </div>
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
