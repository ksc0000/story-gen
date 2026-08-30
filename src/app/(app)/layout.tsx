"use client";

import { Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DreamyBackground } from "@/components/dreamy-background";
import { AppNav } from "@/components/app-nav";
import { useAuth } from "@/lib/hooks/use-auth";
import { saveReturnTo } from "@/lib/return-to";

/**
 * 未ログイン時にログインへ退避し、戻り先(returnTo)を保存する。
 *
 * `useSearchParams()` は static export では Suspense 境界の中でしか使えず、
 * レイアウト直下で呼ぶと (app) 配下の全ページのプリレンダリングが失敗する。
 * そのため副作用だけを持つ子コンポーネントに切り出し、Suspense で包んでいる。
 */
function AuthRedirectGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      const search = searchParams?.toString();
      const fullPath = search ? `${pathname}?${search}` : pathname;
      if (fullPath && fullPath !== "/" && fullPath !== "/login") {
        saveReturnTo(fullPath);
        router.replace(`/login?returnTo=${encodeURIComponent(fullPath)}`);
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router, pathname, searchParams]);

  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  // AuthRedirectGuard は未ログイン時にこそ動く必要があるため、
  // loading / !user の早期 return より前に、常に描画されるよう外側へ置く。
  const guard = (
    <Suspense fallback={null}>
      <AuthRedirectGuard />
    </Suspense>
  );

  if (loading) {
    return (
      <>
        {guard}
        <div className="app-shell flex min-h-screen items-center justify-center">
          <p className="text-violet-600">読み込み中...</p>
        </div>
      </>
    );
  }
  if (!user) return guard;

  return (
    <>
      {guard}
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
    </>
  );
}
