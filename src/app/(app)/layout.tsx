"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fdf2f8] to-[#ede9fe]">
        <p className="text-violet-600">読み込み中...</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf2f8] to-[#ede9fe]">
      <header className="border-b border-[rgba(240,171,252,0.3)] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/home" className="text-lg font-bold text-purple-900">
            EhoNAI
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-violet-600">{user.displayName}</span>
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
