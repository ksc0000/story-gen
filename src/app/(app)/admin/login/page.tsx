"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bootstrapAdminCallable } from "@/lib/functions";
import { useAdminClaim } from "@/lib/hooks/use-admin-claim";
import { useAuth } from "@/lib/hooks/use-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { checkingAdmin, isAdmin, refreshAdminClaim } = useAdminClaim();
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBootstrapAdmin = async () => {
    if (!user) return;

    setActivating(true);
    setMessage(null);
    setError(null);

    try {
      const result = await bootstrapAdminCallable();
      const refreshed = await refreshAdminClaim();

      if (!refreshed) {
        setError("管理者権限の反映を確認できませんでした。再ログインしてからもう一度お試しください。");
        return;
      }

      setMessage(
        result.alreadyAdmin
          ? "すでに管理者としてログイン中です。"
          : result.message ?? "管理者権限を有効化しました。"
      );
      router.push("/admin/image-model-tests/");
    } catch (err: unknown) {
      console.error("Failed to bootstrap admin claim:", err);
      const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
      const rawMessage =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Unknown error";

      if (code.includes("permission-denied")) {
        setError("このメールアドレスは管理者として許可されていません");
      } else {
        setError(`管理者権限の有効化に失敗しました: ${rawMessage}`);
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-purple-900">管理者ログイン</h1>
        <p className="text-sm text-violet-600">
          管理者向けの検証ページに入る前に、現在の権限状態を確認できます。
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-5 p-6">
          {loading || checkingAdmin ? (
            <p className="text-sm text-violet-500">権限を確認中...</p>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-sm text-violet-600">管理者機能を使うにはログインが必要です</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login/">
                  <Button>ログインへ</Button>
                </Link>
              </div>
              <p className="text-xs text-violet-500">ログイン後、このページに戻ってください。</p>
            </div>
          ) : isAdmin ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-600">
                <p className="font-medium text-purple-900">管理者としてログイン中です</p>
                <p className="mt-1 break-all">メールアドレス: {user.email ?? "不明"}</p>
                <p className="mt-1">admin claim: 有効</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/image-model-tests/">
                  <Button>画像モデル比較へ</Button>
                </Link>
                <Link href="/home/">
                  <Button variant="outline">Homeへ戻る</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[rgba(240,171,252,0.3)] bg-white p-4 text-sm text-violet-600">
                <p className="font-medium text-purple-900">このアカウントにはまだ管理者権限がありません</p>
                <p className="mt-1 break-all">メールアドレス: {user.email ?? "不明"}</p>
                <p className="mt-1">admin claim: 未設定</p>
              </div>
              <p className="text-sm text-violet-600">
                許可されたメールアドレスの場合、下のボタンで管理者権限を有効化できます。
              </p>
              <Button onClick={handleBootstrapAdmin} disabled={activating}>
                {activating ? "管理者権限を有効化中..." : "管理者権限を有効化"}
              </Button>
              <p className="text-xs leading-relaxed text-violet-500">
                この処理は許可済みメールアドレスにのみ管理者権限を付与します。一般ユーザーは管理者になれません。
              </p>
            </div>
          )}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageTransition>
  );
}
