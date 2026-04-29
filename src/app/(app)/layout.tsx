"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/hooks/use-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-violet-600">読み込み中...</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/home" className="app-brand text-lg font-bold">
            EhoNAI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/children" className="hidden text-sm font-semibold text-violet-500 transition hover:text-purple-700 sm:inline">
              子ども
            </Link>
            <ThemeToggle />
            <span className="app-user text-sm">{user.displayName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
