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
    if (!loading && !user) { router.replace("/login"); }
  }, [user, loading, router]);

  if (loading) {
    return (<div className="flex min-h-screen items-center justify-center bg-amber-50"><p className="text-amber-700">読み込み中...</p></div>);
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/home" className="text-lg font-bold text-amber-900">EhoNAI</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.displayName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>ログアウト</Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
