"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { Settings, UserX, ChevronRight, LogOut, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { AdminPlanPanel } from "@/components/settings/admin-plan-panel";
import { functions } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks/use-auth";
import { ENTERPRISE_OPEN } from "@/lib/enterprise";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    setError(null);

    try {
      const deleteAccount = httpsCallable(functions, "deleteUserAccount");
      await deleteAccount();

      // Post-deletion cleanup: Sign out and redirect
      await signOut();
      router.replace("/login");
    } catch (err) {
      console.error("Failed to delete account:", err);
      const message = err instanceof Error ? err.message : "アカウントの削除に失敗しました。";
      setError(message);
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/home" className="inline-flex items-center text-sm text-violet-500 hover:text-violet-700 transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" />
          戻る
        </Link>
      </div>

      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold text-purple-900">
          <Settings className="h-3.5 w-3.5" />
          アプリの設定
        </div>
        <h1 className="mt-4 text-3xl font-bold text-purple-950">設定</h1>
      </header>

      <div className="space-y-6">
        {/* Account Info */}
        <Card className="overflow-hidden border-violet-100 shadow-sm">
          <CardHeader className="bg-violet-50/50">
            <CardTitle className="text-lg text-purple-900">アカウント情報</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-violet-50 p-0">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-violet-400">表示名</p>
                <p className="font-semibold text-purple-900">{user?.displayName || "未設定"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-violet-400">メールアドレス</p>
                <p className="font-semibold text-purple-900">{user?.email || "未設定"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin-only developer panel (plan override + unlimited companions) */}
        <AdminPlanPanel />

        {/* 団体契約（エンタープライズ）。一般公開まで「準備中」バッジを表示（enterprise.ts 参照） */}
        <Card className="border-violet-100 shadow-sm">
          <CardContent className="p-0">
            <Link
              href="/organization"
              className="flex w-full items-center justify-between p-4 transition hover:bg-violet-50/50"
            >
              <div className="flex items-center gap-3 text-purple-900">
                <Building2 className="size-5 text-violet-400" />
                <span className="font-semibold">団体契約</span>
                {!ENTERPRISE_OPEN ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-500">
                    準備中
                  </span>
                ) : null}
              </div>
              <ChevronRight className="size-5 text-violet-300" />
            </Link>
          </CardContent>
        </Card>

        {/* General Actions */}
        <Card className="border-violet-100 shadow-sm">
          <CardContent className="divide-y divide-violet-50 p-0">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center justify-between p-4 transition hover:bg-violet-50/50"
            >
              <div className="flex items-center gap-3 text-purple-900">
                <LogOut className="size-5 text-violet-400" />
                <span className="font-semibold">ログアウト</span>
              </div>
              <ChevronRight className="size-5 text-violet-300" />
            </button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <div className="pt-4">
          <h2 className="mb-3 px-1 text-sm font-bold text-rose-500">危険な操作</h2>
          <Card className="border-rose-100 bg-rose-50/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-rose-900">アカウントの削除</h3>
                  <p className="mt-1 text-sm text-rose-600/80">
                    作成した絵本、お子さんのプロフィール、画像など、すべてのデータが完全に削除されます。
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="shrink-0"
                >
                  <UserX className="mr-2 size-4" />
                  アカウント削除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-purple-900">規約・ポリシー</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <Link
              href="/legal/terms"
              className="flex items-center justify-between border-b border-violet-50 py-3 text-sm text-purple-900 hover:text-purple-600"
            >
              利用規約
              <ChevronRight className="size-4 text-violet-300" />
            </Link>
            <Link
              href="/legal/privacy"
              className="flex items-center justify-between border-b border-violet-50 py-3 text-sm text-purple-900 hover:text-purple-600"
            >
              プライバシーポリシー
              <ChevronRight className="size-4 text-violet-300" />
            </Link>
            <Link
              href="/legal/tokushoho"
              className="flex items-center justify-between py-3 text-sm text-purple-900 hover:text-purple-600"
            >
              特定商取引法に基づく表記
              <ChevronRight className="size-4 text-violet-300" />
            </Link>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        variant="destructive"
        title="アカウントの削除"
        description={
          <div className="space-y-3">
            <p>
              アカウントを削除すると、これまでに作成したすべてのデータ（絵本、お子さんのプロフィール、相棒、アバター画像など）が消去され、復元することはできません。
            </p>
            <p className="font-bold text-rose-600">
              この操作は取り消せません。本当によろしいですか？
            </p>
          </div>
        }
        confirmLabel="アカウントを完全に削除"
        confirmPhrase="アカウントを削除"
        isLoading={isDeleting}
      />
    </PageTransition>
  );
}
