"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DreamyBackground } from "@/components/dreamy-background";
import { AppNav } from "@/components/app-nav";
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
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4">
          <Link href="/home" className="app-brand flex shrink-0 items-center gap-2 text-lg font-bold">
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
          <AppNav userName={user.displayName} onSignOut={signOut} />
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
