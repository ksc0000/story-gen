"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useChildren } from "@/lib/hooks/use-children";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { cn } from "@/lib/utils";
import { FREE_MONTHLY_BOOK_LIMIT } from "@/lib/usage";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
  const { profile } = useUserProfile(user?.uid);
  const { children, loading: childrenLoading, activeChild } = useChildren(user?.uid);
  const { isAdmin } = useAdminClaim();
  const remaining = FREE_MONTHLY_BOOK_LIMIT - (profile?.monthlyGenerationCount ?? 0);

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
        <header className="em-header">
          <div className="em-header__badge">✨ あなたの本棚</div>
          {activeChild && <p className="em-header__subtitle">主人公: {activeChild.nickname || activeChild.displayName}</p>}
          <div className="mt-4">
            <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-purple-200 text-purple-700">
              {remaining >= 3 ? (
                `今月あと${remaining}冊作れます ✨`
              ) : remaining > 0 ? (
                <>
                  今月あと{remaining}冊 —{" "}
                  <Link href="/pricing" className="underline ml-1 text-xs opacity-80 hover:opacity-100 transition-opacity">
                    プレミアムならもっと作れます
                  </Link>
                </>
              ) : (
                `今月あと${Math.max(0, remaining)}冊作れます`
              )}
            </Badge>
          </div>
        </header>
        {deleteError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {deleteError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/create/select-child" className="w-full sm:w-auto">
            <Button size="lg" className="em-btn-cta text-lg w-full sm:w-auto">
              新しい絵本を作る
            </Button>
          </Link>
          <Link href="/children">
            <Button size="lg" variant="outline" className="text-base px-6">
              子どもプロフィール
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
          <div className="mt-16 text-center em-fade-up">
            <HeroBook3D />
            <p className="mt-4 text-violet-500 font-medium">まだ絵本がありません。最初の一冊を作りましょう！</p>
          </div>
        ) : (
          <StaggerContainer className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {books.map((book) => (
              <StaggerItem key={book.id}>
                <BookCard
                  book={book}
                  onDelete={book.userId === user?.uid ? () => handleDeleteBook(book.id, book.title || "") : undefined}
                  isDeleting={deletingId === book.id}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
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
