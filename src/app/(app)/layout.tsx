"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DreamyBackground } from "@/components/dreamy-background";
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
      <DreamyBackground />
      <header className="app-header">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/home" className="app-brand flex items-center gap-2 text-lg font-bold">
            <Image
              src="/logo/ehoria-logo-256.png"
              alt=""
              width={32}
              height={32}
              className="rounded-md"
              priority
            />
            <span>Ehoria</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/children" className="hidden text-sm font-semibold text-violet-500 transition hover:text-purple-700 sm:inline">
              子ども
            </Link>
            <Link href="/companions" className="hidden text-sm font-semibold text-violet-500 transition hover:text-purple-700 sm:inline">
              相棒
            </Link>
            <Link href="/pricing" className="hidden text-sm font-semibold text-amber-600 transition hover:text-amber-700 sm:inline">
              プラン
            </Link>
            <ThemeToggle />
            <span className="app-user text-sm">{user.displayName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>
      {/* relative z-[1]: ensures main content stacks above DreamyBackground
          (em-bg is position:fixed z-index:0, which paints over non-positioned
          block elements on iOS Safari. A z-index≥1 here fixes the invisible
          content bug on iPhone.) */}
      <main className="relative z-[1]">{children}</main>
    </div>
  );
}
