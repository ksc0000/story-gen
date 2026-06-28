"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Share2, Check, Copy, Globe, Sparkles, Loader2, Pencil, X, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookViewer, buildReadingItems } from "@/components/book-viewer";
import { CinematicViewer } from "@/components/cinematic-viewer";
import { BookNextActions } from "@/components/book-next-actions";
import { BookSeriesControl } from "@/components/book-series-control";
import { BookSettingsPanel } from "@/components/book/book-settings-panel";
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
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
  const [coverRegenerationError, setCoverRegenerationError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [titleUpdateError, setTitleUpdateError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isCinematicOpen, setIsCinematicOpen] = useState(false);
  const [templateDisplayName, setTemplateDisplayName] = useState<string | undefined>();
  const canSubmitFeedback = Boolean(user && book && book.userId === user.uid && !isDemoMode);
  const isOwner = Boolean(user && book && book.userId === user.uid);

  useEffect(() => {
    const templateId = book?.templateId;
    if (!templateId) return;
    getDoc(doc(db, "templates", templateId)).then((snap) => {
      if (!snap.exists()) return;
      const rawName = (snap.data() as { name?: string }).name;
      if (!rawName) return;
      // テンプレ名は表示用ラベル（"{childName}と …（8ページ）"）でプレースホルダや
      // 管理用のページ数サフィックスを含む。シネマティックの主タイトルに使うため、
      // 実際の子ども名で置換し、未置換プレースホルダと（Nページ）を取り除く。
      const cleaned = rawName
        .replace(/\{childName\}/g, book?.input?.childName ?? "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/（\s*\d+\s*ページ\s*）/g, "")
        .replace(/\(\s*\d+\s*pages?\s*\)/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      setTemplateDisplayName(cleaned || undefined);
    });
  }, [book?.templateId, book?.input?.childName]);

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

  async function handleRegenerateAll() {
    if (!bookId || failedPages.length === 0) return;
    for (const page of failedPages) {
      if (!regeneratingPages.has(page.pageNumber)) {
        // Use individual await to avoid overloading the function/concurrency if many
        // but since it's 4-12 pages usually, it's fine.
        // We call them sequentially or in parallel? Sequential is safer for UI feedback.
        await handleRegeneratePage(page);
      }
    }
  }

  async function handleUpdateTitle() {
    if (!bookId || !newTitle.trim() || isUpdatingTitle) return;
    setIsUpdatingTitle(true);
    setTitleUpdateError(null);
    try {
      const updateTitle = httpsCallable(functions, "updateBookTitle");
      await updateTitle({ bookId, newTitle: newTitle.trim() });
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Failed to update title:", err);
      setTitleUpdateError(err instanceof Error ? err.message : "タイトルの更新に失敗しました。");
    } finally {
      setIsUpdatingTitle(false);
    }
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
      console.error("Failed to regenerate page:", err);
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

  async function handleRegenerateCover() {
    if (!bookId || isRegeneratingCover) return;
    setIsRegeneratingCover(true);
    setCoverRegenerationError(null);
    try {
      const regenerate = httpsCallable(functions, "regenerateCoverImage");
      await regenerate({ bookId });
    } catch (err) {
      console.error("Failed to regenerate cover:", err);
      setCoverRegenerationError(err instanceof Error ? err.message : "表紙の再生成に失敗しました。");
    } finally {
      setIsRegeneratingCover(false);
    }
  }

  async function handleGeneratePdf() {
    if (!bookId || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const generatePdf = httpsCallable(functions, "generateBookPdf");
      await generatePdf({ bookId });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      window.alert("PDFの作成に失敗しました。しばらく時間をおいて再度お試しください。");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <PageTransition className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col items-center gap-4">
        {isEditingTitle ? (
          <div className="w-full max-w-md space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-purple-200 px-4 py-2 text-center text-xl font-bold text-purple-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                placeholder="新しいタイトル"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleUpdateTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                disabled={isUpdatingTitle}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingTitle(false)}
                disabled={isUpdatingTitle}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {titleUpdateError && (
              <p className="text-center text-sm text-rose-500">{titleUpdateError}</p>
            )}
            <div className="flex justify-center gap-2">
              <Button
                size="sm"
                onClick={handleUpdateTitle}
                disabled={isUpdatingTitle || !newTitle.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isUpdatingTitle ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "保存"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative flex items-center gap-2">
            <h1 className="text-center text-2xl font-bold text-purple-900">{book.title}</h1>
            {isOwner && !isDemoMode && (
              <button
                onClick={() => {
                  setNewTitle(book.title);
                  setIsEditingTitle(true);
                  setTitleUpdateError(null);
                }}
                className="rounded-full p-1 text-violet-400 opacity-0 transition hover:bg-purple-50 hover:text-purple-600 group-hover:opacity-100"
                title="タイトルを編集"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
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
            {user && <BookSeriesControl bookId={bookId} userId={user.uid} seriesId={book.seriesId} />}
          </div>
        )}
      </div>

      {isOwner && user && (book.status === "completed" || book.status === "partial_completed") && (
        <BookSettingsPanel book={book} userId={user.uid} />
      )}

      {isPartial && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">絵本を完成させましょう</p>
              <p className="text-sm text-amber-800">一部のページがまだ完成していません。</p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full bg-amber-500 hover:bg-amber-600 sm:w-auto"
            onClick={handleRegenerateAll}
            disabled={regeneratingPages.size > 0}
          >
            {regeneratingPages.size > 0 ? "仕上げ中..." : "すべての未完成ページを仕上げる"}
          </Button>
        </div>
      )}

      <div className="mt-6">
        {/* Cinematic mode trigger */}
        {viewablePages.length > 0 && (
          <div className="mb-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCinematicOpen(true)}
              className="rounded-full border-violet-200 text-violet-600 hover:border-violet-400 hover:text-purple-700 gap-1.5"
            >
              <Clapperboard className="size-4" />
              シネマティックで見る
            </Button>
          </div>
        )}
        <BookViewer
          pages={viewablePages}
          title={book.title}
          coverImageUrl={book.coverImageUrl}
          hasCoverPage={book.hasCoverPage}
          coverStatus={book.coverStatus}
          readingStructureVersion={book.readingStructureVersion}
          titleSpreadText={book.titleSpreadText}
          openingNarration={book.openingNarration}
          onRegeneratePage={
            isOwner && !isDemoMode && (book.status === "completed" || book.status === "partial_completed")
              ? (index) => handleRegeneratePage(viewablePages[index])
              : undefined
          }
          isRegeneratingPage={(index) => regeneratingPages.has(viewablePages[index].pageNumber)}
          onRegenerateCover={
            isOwner && !isDemoMode && (book.status === "completed" || book.status === "partial_completed")
              ? handleRegenerateCover
              : undefined
          }
          isRegeneratingCover={isRegeneratingCover}
        />
        {/* Cinematic viewer overlay */}
        {isCinematicOpen && (
          <CinematicViewer
            items={buildReadingItems({
              pages: viewablePages,
              title: book.title,
              coverImageUrl: book.coverImageUrl,
              hasCoverPage: book.hasCoverPage,
              coverStatus: book.coverStatus,
              readingStructureVersion: book.readingStructureVersion,
              titleSpreadText: book.titleSpreadText,
              openingNarration: book.openingNarration,
            })}
            title={book.title}
            originalTitle={templateDisplayName}
            onClose={() => setIsCinematicOpen(false)}
            onFeedback={canSubmitFeedback ? () => {
              setIsCinematicOpen(false);
              setTimeout(() => {
                document.getElementById("feedback-section")?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            } : undefined}
          />
        )}
        {coverRegenerationError && (
          <p className="mt-2 text-center text-sm text-rose-500">{coverRegenerationError}</p>
        )}
      </div>

      {isOwner && (
        <BookNextActions
          bookId={bookId}
          book={book}
          isDemoMode={isDemoMode}
          onToggleShare={handleToggleShare}
          isSharing={isSharing}
          onGeneratePdf={handleGeneratePdf}
          isGeneratingPdf={isGeneratingPdf}
        />
      )}

      {(failedPages.length > 0 || generatingPages.length > 0) && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <h2 className="text-xl font-bold text-purple-900">未完成のページ</h2>
            {failedPages.length > 1 && isOwner && !isDemoMode && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={handleRegenerateAll}
                disabled={regeneratingPages.size > 0}
              >
                まとめて仕上げる
              </Button>
            )}
          </div>

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
                className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-rose-200" />
                <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-rose-100 bg-rose-50/50 text-xs font-bold text-rose-400 sm:h-24 sm:w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">🎨</span>
                    <span>未完成</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-purple-900">
                      ページ {page.pageNumber + 1}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-violet-600">
                      {page.text}
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                      {error}
                    </div>
                  )}
                  {isOwner && !isDemoMode && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRegeneratePage(page)}
                        disabled={isRegenerating}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            仕上げ中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            このページを仕上げる
                          </>
                        )}
                      </Button>
                      <p className="text-[10px] text-violet-400">
                        ※数分かかる場合があります
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && !isDemoMode && isOwner ? (
        <div id="feedback-section" className="mt-8 rounded-3xl border border-[rgba(216,180,254,0.45)] bg-[rgba(250,245,255,0.96)] p-6">
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
                      storyModel: book.storyModel ?? null,
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
