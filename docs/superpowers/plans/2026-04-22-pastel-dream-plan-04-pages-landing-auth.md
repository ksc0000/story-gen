# Plan Part 4: Landing, Login, App Layout (Tasks 13-15)

## Task 13: ランディングページ改修

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx を完全置換**

```tsx
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingParticles } from "@/components/floating-particles";
import { StaggerContainer } from "@/components/stagger-container";
import { StaggerItem } from "@/components/stagger-item";
import { AnimatedCard } from "@/components/animated-card";

const features = [
  {
    title: "AIが物語を紡ぐ",
    description: "お子さまの名前・好きなものを入力するだけ。AIが世界にひとつだけの物語を作ります。",
    icon: "/images/icons/book.webp",
    shadowColor: "rgba(167, 139, 250, 0.1)",
  },
  {
    title: "プロ品質の挿絵",
    description: "水彩画・フラット・クレヨン風から選べる挿絵をAIが自動生成。温かみのあるイラストをお届けします。",
    icon: "/images/icons/palette.webp",
    shadowColor: "rgba(103, 232, 249, 0.1)",
  },
  {
    title: "安心の安全設計",
    description: "多層コンテンツフィルタで、お子さまに安全な内容のみを生成。安心してお楽しみいただけます。",
    icon: "/images/icons/shield.webp",
    shadowColor: "rgba(253, 224, 71, 0.1)",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fdf2f8] via-[#ede9fe] to-[#e0f2fe]">
      <section className="relative flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <FloatingParticles />
        <StaggerContainer className="relative z-10 flex flex-col items-center">
          <StaggerItem>
            <Image
              src="/images/illustrations/hero.webp"
              alt="子どもが絵本を読んでいるイラスト"
              width={300}
              height={225}
              priority
              className="rounded-2xl"
            />
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-purple-900 sm:text-5xl">
              EhoNAI
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 text-lg text-violet-600">えほんAI</p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-gray-600">
              我が子が主人公になれる絵本を、
              <br className="hidden sm:inline" />
              誰でも5分で作れる。
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 text-base text-gray-400">
              AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。
            </p>
          </StaggerItem>
          <StaggerItem>
            <Link href="/login" className="mt-8 inline-block">
              <Button size="lg" className="text-lg px-8 py-6">
                無料で絵本を作る
              </Button>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-3 text-sm text-gray-400">月3冊まで無料・登録かんたん</p>
          </StaggerItem>
        </StaggerContainer>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20">
        <StaggerContainer className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <AnimatedCard>
                <Card>
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <Image
                      src={f.icon}
                      alt={f.title}
                      width={64}
                      height={64}
                      className="rounded-lg"
                    />
                    <h3 className="mt-4 text-lg font-semibold text-purple-900">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">{f.description}</p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功（画像が無くてもビルドは通る。表示時にaltテキストのみ表示）

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign landing page with pastel dream theme and stagger animations"
```

---

## Task 14: ログインページ改修

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: login/page.tsx を完全置換**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { FloatingParticles } from "@/components/floating-particles";
import { PageTransition } from "@/components/page-transition";
import { AnimatedCard } from "@/components/animated-card";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fdf2f8] via-[#ede9fe] to-[#e0f2fe]">
        <p className="text-violet-600">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fdf2f8] via-[#ede9fe] to-[#e0f2fe] px-4">
      <FloatingParticles />
      <PageTransition className="relative z-10 w-full max-w-sm">
        <AnimatedCard>
          <Card>
            <CardHeader className="text-center">
              <Image
                src="/images/illustrations/login-door.webp"
                alt="ログイン"
                width={120}
                height={90}
                className="mx-auto rounded-xl"
              />
              <CardTitle className="mt-4 text-2xl text-purple-900">
                EhoNAI にログイン
              </CardTitle>
              <p className="text-sm text-violet-600">えほんAI</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                onClick={signInWithGoogle}
                variant="outline"
                className="w-full py-6 text-base"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Googleでログイン
              </Button>
              <p className="text-center text-xs text-gray-400">
                ログインすることで利用規約に同意したものとみなされます
              </p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </PageTransition>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(auth)/login/page.tsx"
git commit -m "feat: redesign login page with pastel dream theme and floating particles"
```

---

## Task 15: アプリレイアウト（ヘッダー）改修

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: layout.tsx を完全置換**

```tsx
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
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/layout.tsx"
git commit -m "feat: update app layout header with pastel dream theme and backdrop blur"
```
