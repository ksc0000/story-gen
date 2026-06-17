"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { Loader2 } from "lucide-react";
import { isDemoMode, deleteDemoBook } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCard } from "@/components/book-card";
import { HeroBook3D } from "@/components/hero-book-3d";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBooks } from "@/lib/hooks/use-books";
import { useSeries } from "@/lib/hooks/use-series";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useChildren } from "@/lib/hooks/use-children";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { cn } from "@/lib/utils";
import { PLAN_CONFIGS, resolveProductPlan } from "@/lib/plans";
import { useCompanions } from "@/app/(app)/companions/use-companions-hook";
import { getSpeciesEmoji } from "@/app/(app)/companions/companions-utils";
import { ILLUSTRATION_STYLE_PROFILES } from "@/lib/illustration-styles";

const CREATION_MODE_LABELS: Record<string, string> = {
  all: "すべてのモード",
  fixed_template: "テンプレート",
  guided_ai: "AI対話",
  original_ai: "かんたんAI",
  photo_story: "写真から作成",
};

const STATUS_LABELS: Record<string, string> = {
  all: "すべての状態",
  completed: "完成",
  partial_completed: "一部未完成",
  failed: "失敗",
  generating: "生成中",
};

/**
 * Internal AlertDialog components to comply with file constraints.
 */
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props & { size?: "default" | "sm" }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-card p-4 text-card-foreground shadow-lg border ring-1 ring-foreground/10 duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-base font-medium", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-balance text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props & Partial<Pick<React.ComponentProps<typeof Button>, "variant" | "size">>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { books, loading, error } = useBooks(user?.uid);
  const { series } = useSeries(user?.uid);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const { profile } = useUserProfile(user?.uid);
  const { children, loading: childrenLoading, activeChild } = useChildren(user?.uid);
  const { isAdmin } = useAdminClaim();
  const { companions, loading: companionsLoading } = useCompanions(user?.uid);
  const productPlan = resolveProductPlan(profile);
  const quota = PLAN_CONFIGS[productPlan]?.monthlyBookQuota ?? 1;
  const consumed = profile?.monthlyGenerationCount ?? 0;
  const remaining = Math.max(0, quota - consumed);
  // 管理者・bypassMonthlyLimit 保持者は月次上限なしで生成できるため、有限クォータではなく「無制限」を表示する。
  const isUnlimited = isAdmin || profile?.generationOverride?.bypassMonthlyLimit === true;

  const [selectedStyle, setSelectedStyle] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const uniqueStyles = useMemo(() => {
    const stylesInBooks = Array.from(new Set(books.map((b) => b.style))).filter(Boolean);
    return ILLUSTRATION_STYLE_PROFILES.filter((p) => stylesInBooks.includes(p.id));
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchStyle = selectedStyle === "all" || book.style === selectedStyle;
      const matchMode = selectedMode === "all" || book.creationMode === selectedMode;
      const matchStatus = selectedStatus === "all" || book.status === selectedStatus;
      return matchStyle && matchMode && matchStatus;
    });
  }, [books, selectedStyle, selectedMode, selectedStatus]);

  const seriesGroups = useMemo(() => {
    const validSeriesIds = new Set(series.map((s) => s.id));
    const bySeriesId = new Map<string, (typeof filteredBooks)>();
    const ungrouped: typeof filteredBooks = [];

    for (const book of filteredBooks) {
      if (book.seriesId && validSeriesIds.has(book.seriesId)) {
        const existing = bySeriesId.get(book.seriesId);
        if (existing) {
          existing.push(book);
        } else {
          bySeriesId.set(book.seriesId, [book]);
        }
      } else {
        ungrouped.push(book);
      }
    }

    const groups = series
      .map((s) => ({ id: s.id, name: s.name, books: bySeriesId.get(s.id) ?? [] }))
      .filter((g) => g.books.length > 0);

    return { groups, ungrouped };
  }, [filteredBooks, series]);

  useEffect(() => {
    if (!childrenLoading && children.length === 0) {
      router.replace("/onboarding/child");
    }
  }, [children.length, childrenLoading, router]);

  const handleDeleteBook = (bookId: string, title: string) => {
    setBookToDelete({ id: bookId, title: title || "無題の絵本" });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;

    const bookId = bookToDelete.id;
    setDeletingId(bookId);
    setDeleteError(null);

    try {
      if (isDemoMode) {
        deleteDemoBook(bookId);
        window.location.reload();
        return;
      }
      const { functions } = await import("@/lib/firebase");
      const deleteBookFn = httpsCallable<{ bookId: string }, { success: boolean }>(functions, "deleteBook");
      await deleteBookFn({ bookId });
      setIsDeleteDialogOpen(false);
    } catch (err: unknown) {
      console.error("Failed to delete book:", err);
      const message = err instanceof Error ? err.message : "絵本の削除に失敗しました";
      setDeleteError(message);
    } finally {
      setDeletingId(null);
      // setBookToDelete is called when dialog actually closes via onOpenChange if needed,
      // or here if we close it.
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open && !deletingId) {
      setBookToDelete(null);
    }
  };

  return (
    <PageTransition className="relative mx-auto max-w-4xl px-4 py-8">
      <div className="relative z-10">
        <header className="mb-7 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-5 py-2 text-xs font-bold tracking-wide text-purple-900 shadow-sm backdrop-blur-sm">
            ✨ あなたの本棚
          </div>
          {activeChild && (
            <p className="mt-2 text-sm text-violet-500">
              主人公: {activeChild.nickname || activeChild.displayName}
            </p>
          )}
          <div className="mt-4">
            {isUnlimited ? (
              <Badge
                variant="outline"
                className="bg-white/50 backdrop-blur-sm border-purple-200 text-purple-700"
              >
                今月 {consumed} 冊作成済み（無制限）
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "bg-white/50 backdrop-blur-sm transition-colors",
                  remaining <= 0
                    ? "border-red-200 text-red-700 bg-red-50/50"
                    : remaining === 1
                    ? "border-orange-200 text-orange-700 bg-orange-50/50"
                    : "border-purple-200 text-purple-700"
                )}
              >
                今月 {consumed} / {quota} 冊作成済み
                {remaining <= 1 && (
                  <>
                    {" "}—{" "}
                    <Link
                      href="/pricing"
                      className="underline ml-1 text-xs opacity-80 hover:opacity-100 transition-opacity"
                    >
                      増やしたい方はこちら
                    </Link>
                  </>
                )}
              </Badge>
            )}
          </div>
        </header>
        {deleteError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {deleteError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/create/select-child" className="w-full sm:w-auto">
            <Button size="lg" className="text-lg w-full sm:w-auto">
              新しい絵本を作る
            </Button>
          </Link>
          <Link href="/children">
            <Button size="lg" variant="outline" className="text-base px-6">
              子どもプロフィール
            </Button>
          </Link>
          <Link href="/gallery">
            <Button size="lg" variant="outline" className="text-base px-6">
              ギャラリー
            </Button>
          </Link>
          {isAdmin ? (
            <>
              <Link href="/admin/book-quality-review/">
                <Button size="lg" variant="outline" className="text-base px-6">
                  Book品質レビュー
                </Button>
              </Link>
              <Link href="/admin/image-model-tests/">
                <Button size="lg" variant="outline" className="text-base px-6">
                  画像モデル比較
                </Button>
              </Link>
            </>
          ) : null}
        </div>
        {isAdmin ? <p className="mt-2 text-sm text-violet-500">管理者向け: Book品質レビューと画像モデル比較を利用できます</p> : null}

        {/* なかよしキャラ widget */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🐾</span>
              <span className="text-sm font-semibold text-purple-800">なかよしキャラ</span>
            </div>
            <Link href="/companions" className="text-xs text-violet-500 hover:underline">
              すべて見る →
            </Link>
          </div>
          {companionsLoading ? null : companions.length === 0 ? (
            <Link href="/companions/create" className="block">
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-purple-200 bg-white/60 px-4 py-3 hover:bg-white/90 hover:border-purple-300 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">✨</div>
                <div>
                  <p className="text-sm font-medium text-purple-800">なかよしキャラを作ろう！</p>
                  <p className="text-xs text-violet-400">動物などのなかよしキャラクターをかんたんに作れます</p>
                </div>
                <span className="ml-auto text-violet-300 text-lg">＋</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {companions.map((companion) => (
                <Link
                  key={companion.id}
                  href={`/companions/profile?id=${companion.id}`}
                  className="flex shrink-0 items-center gap-2 rounded-2xl border border-purple-100 bg-white/70 px-3 py-2 hover:bg-white hover:border-purple-200 transition-all"
                >
                  {companion.generatedImageUrl ? (
                    <Image
                      src={companion.generatedImageUrl}
                      alt={companion.name}
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                      {getSpeciesEmoji(companion.species)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-purple-800 whitespace-nowrap">{companion.name}</span>
                </Link>
              ))}
              <Link
                href="/companions/create"
                className="flex shrink-0 h-[52px] w-[52px] items-center justify-center rounded-2xl border border-dashed border-purple-200 bg-white/60 hover:bg-white hover:border-purple-300 transition-all text-violet-400 text-xl"
              >
                ＋
              </Link>
            </div>
          )}
        </div>

        {/* Feedback widget */}
        <div className="mt-5">
          <Link href="/feedback" className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/60 px-4 py-3 hover:bg-white/90 hover:border-violet-200 transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">💬</div>
              <div>
                <p className="text-sm font-medium text-purple-800">フィードバックを送る</p>
                <p className="text-xs text-violet-400">アプリへのご意見・ご要望をお聞かせください</p>
              </div>
              <span className="ml-auto text-violet-300 text-lg">→</span>
            </div>
          </Link>
        </div>

        {/* Upgrade banner for free plan users */}
        {profile && profile.plan === "free" && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                {remaining <= 0 ? "今月の無料枠を使い切りました 📚" : "もっとたくさん絵本を作りたいですか？ ✨"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                有料プランで月5〜10冊・高品質生成が使えます
              </p>
            </div>
            <Link href="/pricing" className="shrink-0">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                プランを見る
              </Button>
            </Link>
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-center text-violet-400">読み込み中...</p>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/90 p-6 text-center text-red-700">
            <p className="font-semibold">本棚の読み込みに失敗しました</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : books.length === 0 ? (
          <div className="mt-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HeroBook3D />
            <p className="mt-4 text-violet-500 font-medium">まだ絵本がありません。最初の一冊を作りましょう！</p>
          </div>
        ) : (
          <div className="mt-8">
            <div className="mb-6 flex flex-wrap gap-3 items-end justify-center sm:justify-start">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-violet-400 uppercase tracking-wider ml-1">スタイル</label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="block w-full rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-xs text-purple-900 shadow-sm backdrop-blur-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                >
                  <option value="all">すべてのスタイル</option>
                  {uniqueStyles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-violet-400 uppercase tracking-wider ml-1">作成モード</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="block w-full rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-xs text-purple-900 shadow-sm backdrop-blur-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                >
                  {Object.entries(CREATION_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-violet-400 uppercase tracking-wider ml-1">ステータス</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-xs text-purple-900 shadow-sm backdrop-blur-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedStyle !== "all" || selectedMode !== "all" || selectedStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStyle("all");
                    setSelectedMode("all");
                    setSelectedStatus("all");
                  }}
                  className="h-9 px-2 text-xs text-violet-400 hover:text-violet-600"
                >
                  リセット
                </Button>
              )}
            </div>

            {filteredBooks.length === 0 ? (
              <div className="mt-12 py-12 text-center">
                <p className="text-violet-400">該当する絵本が見つかりませんでした</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSelectedStyle("all");
                    setSelectedMode("all");
                    setSelectedStatus("all");
                  }}
                  className="mt-2 text-purple-600"
                >
                  フィルタをリセット
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-8">
                {seriesGroups.groups.map((group) => (
                  <div key={group.id}>
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <span className="text-base">📚</span>
                      <h2 className="text-sm font-bold text-purple-800">{group.name}</h2>
                      <span className="text-xs text-violet-400">{group.books.length}冊</span>
                    </div>
                    <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {group.books.map((book) => (
                        <StaggerItem key={book.id}>
                          <BookCard
                            book={book}
                            onDelete={book.userId === user?.uid ? () => handleDeleteBook(book.id, book.title || "") : undefined}
                            isDeleting={deletingId === book.id}
                          />
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </div>
                ))}

                {seriesGroups.ungrouped.length > 0 && (
                  <div>
                    {seriesGroups.groups.length > 0 && (
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <h2 className="text-sm font-bold text-purple-800">その他の絵本</h2>
                      </div>
                    )}
                    <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {seriesGroups.ungrouped.map((book) => (
                        <StaggerItem key={book.id}>
                          <BookCard
                            book={book}
                            onDelete={book.userId === user?.uid ? () => handleDeleteBook(book.id, book.title || "") : undefined}
                            isDeleting={deletingId === book.id}
                          />
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{bookToDelete?.title}」を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は取り消せません。本棚から完全に削除されます。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>キャンセル</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              削除する
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
