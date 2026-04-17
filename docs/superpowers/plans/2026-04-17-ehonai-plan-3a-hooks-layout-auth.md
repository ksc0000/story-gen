# EhoNAI Web MVP - Plan 3a: Hooks, Layout & Auth Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Firestore real-time hooks, protected app layout, landing page, and login page.

**Architecture:** Custom React hooks use Firestore `onSnapshot` for real-time data. Protected layout redirects unauthenticated users. Landing page is public (SSG). State between pages via URL search params.

**Tech Stack:** Next.js 15 (App Router), React, Tailwind CSS, shadcn/ui, Firebase Firestore

**Depends on:** Plan 1 (Firebase config, auth context, types, shadcn/ui)

---

## File Structure

```
src/
├── lib/hooks/
│   ├── use-auth.ts              # (exists from Plan 1)
│   ├── use-books.ts             # Bookshelf data hook
│   ├── use-generation-progress.ts  # Real-time generation monitoring
│   ├── use-templates.ts         # Theme template list
│   └── use-user-profile.ts     # User profile + quota
├── app/
│   ├── page.tsx                 # ① Landing (rewrite)
│   ├── (auth)/
│   │   └── login/page.tsx       # ② Login
│   └── (app)/
│       └── layout.tsx           # Protected layout
```

---

### Task 1: Firestore Hooks

**Files:**
- Create: `src/lib/hooks/use-books.ts`
- Create: `src/lib/hooks/use-generation-progress.ts`
- Create: `src/lib/hooks/use-templates.ts`
- Create: `src/lib/hooks/use-user-profile.ts`

- [ ] **Step 1: Create useBooks hook**

Create `src/lib/hooks/use-books.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookDoc } from "@/lib/types";

interface UseBooksResult {
  books: (BookDoc & { id: string })[];
  loading: boolean;
  error: Error | null;
}

export function useBooks(userId: string | undefined): UseBooksResult {
  const [books, setBooks] = useState<(BookDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setBooks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "books"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as BookDoc),
        }));
        setBooks(results);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { books, loading, error };
}
```

- [ ] **Step 2: Create useGenerationProgress hook**

Create `src/lib/hooks/use-generation-progress.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookDoc, PageDoc } from "@/lib/types";

interface UseGenerationProgressResult {
  book: (BookDoc & { id: string }) | null;
  pages: (PageDoc & { id: string })[];
  loading: boolean;
}

export function useGenerationProgress(bookId: string): UseGenerationProgressResult {
  const [book, setBook] = useState<(BookDoc & { id: string }) | null>(null);
  const [pages, setPages] = useState<(PageDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;

    const bookUnsub = onSnapshot(doc(db, "books", bookId), (snap) => {
      if (snap.exists()) {
        setBook({ id: snap.id, ...(snap.data() as BookDoc) });
      }
      setLoading(false);
    });

    const pagesQuery = query(
      collection(db, "books", bookId, "pages"),
      orderBy("pageNumber", "asc")
    );

    const pagesUnsub = onSnapshot(pagesQuery, (snapshot) => {
      setPages(
        snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as PageDoc) }))
      );
    });

    return () => {
      bookUnsub();
      pagesUnsub();
    };
  }, [bookId]);

  return { book, pages, loading };
}
```

- [ ] **Step 3: Create useTemplates hook**

Create `src/lib/hooks/use-templates.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TemplateDoc } from "@/lib/types";

interface UseTemplatesResult {
  templates: (TemplateDoc & { id: string })[];
  loading: boolean;
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<(TemplateDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "templates"),
      where("active", "==", true),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(
        snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as TemplateDoc) }))
      );
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { templates, loading };
}
```

- [ ] **Step 4: Create useUserProfile hook**

Create `src/lib/hooks/use-user-profile.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";

interface UseUserProfileResult {
  profile: UserDoc | null;
  loading: boolean;
}

export function useUserProfile(userId: string | undefined): UseUserProfileResult {
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", userId), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserDoc) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { profile, loading };
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/use-books.ts src/lib/hooks/use-generation-progress.ts src/lib/hooks/use-templates.ts src/lib/hooks/use-user-profile.ts
git commit -m "feat: add Firestore real-time hooks for books, pages, templates, and user profile"
```

---

### Task 2: Landing Page (Screen ①)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite landing page**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "AIが物語を紡ぐ",
    description: "お子さまの名前・好きなものを入力するだけ。AIが世界にひとつだけの物語を作ります。",
    icon: "📖",
  },
  {
    title: "プロ品質の挿絵",
    description: "水彩画・フラット・クレヨン風から選べる挿絵をAIが自動生成。温かみのあるイラストをお届けします。",
    icon: "🎨",
  },
  {
    title: "安心の安全設計",
    description: "多層コンテンツフィルタで、お子さまに安全な内容のみを生成。安心してお楽しみいただけます。",
    icon: "🛡️",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-amber-900 sm:text-5xl">
          EhoNAI
        </h1>
        <p className="mt-2 text-lg text-amber-700">えほんAI</p>
        <p className="mt-6 max-w-xl text-xl leading-relaxed text-gray-700">
          我が子が主人公になれる絵本を、
          <br className="hidden sm:inline" />
          誰でも5分で作れる。
        </p>
        <p className="mt-2 text-base text-gray-500">
          AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。
        </p>
        <Link href="/login" className="mt-8">
          <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6">
            無料で絵本を作る
          </Button>
        </Link>
        <p className="mt-3 text-sm text-gray-400">月3冊まで無料・登録かんたん</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="border-amber-200 bg-white/80">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <span className="text-4xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-amber-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add landing page with hero, features, and CTA"
```

---

### Task 3: Login Page (Screen ②)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create login page**

Create directory structure and file `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";

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
      <main className="flex min-h-screen items-center justify-center bg-amber-50">
        <p className="text-amber-700">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-4">
      <Card className="w-full max-w-sm border-amber-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-amber-900">
            EhoNAI にログイン
          </CardTitle>
          <p className="text-sm text-gray-500">えほんAI</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={signInWithGoogle}
            variant="outline"
            className="w-full py-6 text-base"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Googleでログイン
          </Button>
          <p className="text-center text-xs text-gray-400">
            ログインすることで利用規約に同意したものとみなされます
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: add Google login page with auth redirect"
```

---

### Task 4: Protected App Layout

**Files:**
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create protected layout**

Create `src/app/(app)/layout.tsx`:

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
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <p className="text-amber-700">読み込み中...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/home" className="text-lg font-bold text-amber-900">
            EhoNAI
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.displayName}</span>
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

- [ ] **Step 2: Create placeholder home page to prevent build error**

Create `src/app/(app)/home/page.tsx`:

```tsx
export default function HomePage() {
  return <div className="p-8 text-center text-gray-500">本棚（Plan 3bで実装）</div>;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(app)/home/page.tsx
git commit -m "feat: add protected app layout with auth guard and header"
```

---

## Self-Review

1. **Spec coverage:** useBooks (real-time, ordered by createdAt desc) ✓, useGenerationProgress (book + pages listener) ✓, useTemplates (active, ordered by order) ✓, useUserProfile (monthly quota) ✓, Landing page (hero + 3 features + CTA) ✓, Login (Google Sign-In + redirect) ✓, Protected layout (auth guard + header + sign out) ✓.
2. **Placeholder scan:** No TBD/TODO. Home page placeholder is minimal and will be replaced in Plan 3b. ✓
3. **Type consistency:** Hooks use `BookDoc`, `PageDoc`, `TemplateDoc`, `UserDoc` from `@/lib/types`. Return types include `{ id: string }` intersection for Firestore doc IDs. ✓

---

## Next Plan

Proceed to **Plan 3b: Creation Wizard** (theme selection, input form, style selection + book creation).
